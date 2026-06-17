import { prisma } from '../index';
import { ProcurementService } from './ProcurementService';
import { NotificationService } from './NotificationService';
import { BusinessEventService } from './BusinessEventService';

export class WorkflowEngine {
  /**
   * Submits a document for approval.
   * If its value is below the threshold, it is automatically approved.
   * Otherwise, it starts the multi-level approval workflow.
   */
  static async submitForApproval(
    entityType: 'PurchaseOrder' | 'PurchaseRequisition',
    recordId: number,
    value: number,
    userId: number
  ): Promise<any> {
    console.log(`[WorkflowEngine] Submitting ${entityType} ID ${recordId} (Value: ₹${value.toFixed(2)})`);

    // Fetch workflow definitions
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { entity_type: entityType },
      include: { steps: { orderBy: { step_number: 'asc' } } }
    });

    // If no workflow defined, auto-approve
    if (!workflow) {
      console.log(`[WorkflowEngine] No approval workflow defined for ${entityType}. Auto-approving.`);
      return this.autoApproveEntity(entityType, recordId, userId);
    }

    // Conditional Approval: If below threshold, auto-approve
    const threshold = Number(workflow.threshold);
    if (value < threshold) {
      console.log(`[WorkflowEngine] Value ₹${value.toFixed(2)} is below threshold ₹${threshold.toFixed(2)}. Auto-approving.`);
      return this.autoApproveEntity(entityType, recordId, userId);
    }

    // Ensure steps exist
    if (workflow.steps.length === 0) {
      console.warn(`[WorkflowEngine] Workflow for ${entityType} has no approval steps. Auto-approving.`);
      return this.autoApproveEntity(entityType, recordId, userId);
    }

    // Multi-level approval: Create step 1 request
    const step1 = workflow.steps[0];
    const pendingHistory = await prisma.approvalHistory.create({
      data: {
        record_id: recordId,
        step_id: step1.step_id,
        user_id: userId, // submitted by
        status: 'PENDING',
        notes: 'Submitted for approval'
      }
    });

    // Dispatch notification to role
    if (NotificationService.triggerPurchaseApprovalRequired) {
      await NotificationService.triggerPurchaseApprovalRequired(recordId, step1.step_number, step1.role_id);
    }

    await BusinessEventService.logEvent({
      event_type: 'APPROVAL_SUBMITTED',
      entity_type: entityType,
      entity_id: recordId,
      user_id: userId,
      description: `Submitted ${entityType} #${recordId} for Step 1 Approval (Role ID: ${step1.role_id})`
    });

    return pendingHistory;
  }

  /**
   * Approves the current step in the workflow
   */
  static async approveStep(
    entityType: 'PurchaseOrder' | 'PurchaseRequisition',
    historyId: number,
    userId: number,
    notes?: string
  ): Promise<any> {
    const history = await prisma.approvalHistory.findUnique({
      where: { history_id: historyId },
      include: { step: { include: { workflow: true } } }
    });

    if (!history || history.status !== 'PENDING') {
      throw new Error('INVALID_APPROVAL_STATE: History record not found or already processed.');
    }

    // 1. Mark current history line as APPROVED
    // Since prisma.approvalHistory has no query update blocks in index.ts, we can update directly
    const updatedHistory = await prisma.approvalHistory.update({
      where: { history_id: historyId },
      data: {
        status: 'APPROVED',
        user_id: userId,
        notes: notes || 'Approved step'
      }
    });

    const currentStep = history.step;
    const workflowId = currentStep.workflow_id;
    const recordId = history.record_id;

    // 2. Find next step in workflow
    const nextStep = await prisma.approvalStep.findFirst({
      where: {
        workflow_id: workflowId,
        step_number: currentStep.step_number + 1
      }
    });

    if (nextStep) {
      // Create pending history for next level
      const nextPending = await prisma.approvalHistory.create({
        data: {
          record_id: recordId,
          step_id: nextStep.step_id,
          user_id: userId,
          status: 'PENDING',
          notes: `Pending Level ${nextStep.step_number} approval`
        }
      });

      // Notify the next role
      if (NotificationService.triggerPurchaseApprovalRequired) {
        await NotificationService.triggerPurchaseApprovalRequired(recordId, nextStep.step_number, nextStep.role_id);
      }

      await BusinessEventService.logEvent({
        event_type: 'APPROVAL_ADVANCED',
        entity_type: entityType,
        entity_id: recordId,
        user_id: userId,
        description: `Approved Step ${currentStep.step_number}. Advanced to Step ${nextStep.step_number} (Role ID: ${nextStep.role_id})`
      });

      return nextPending;
    } else {
      // No next step: Fully approved!
      await this.autoApproveEntity(entityType, recordId, userId);
      return updatedHistory;
    }
  }

  /**
   * Rejects the current step in the workflow
   */
  static async rejectStep(
    entityType: 'PurchaseOrder' | 'PurchaseRequisition',
    historyId: number,
    userId: number,
    notes?: string
  ): Promise<any> {
    const history = await prisma.approvalHistory.findUnique({
      where: { history_id: historyId },
      include: { step: true }
    });

    if (!history || history.status !== 'PENDING') {
      throw new Error('INVALID_APPROVAL_STATE: History record not found or already processed.');
    }

    const updatedHistory = await prisma.approvalHistory.update({
      where: { history_id: historyId },
      data: {
        status: 'REJECTED',
        user_id: userId,
        notes: notes || 'Rejected step'
      }
    });

    const recordId = history.record_id;

    // Reject base entity
    if (entityType === 'PurchaseOrder') {
      await prisma.purchaseOrder.update({
        where: { po_id: recordId },
        data: { status: 'rejected' } // lower-case rejected to match standard PO statuses
      });
    } else if (entityType === 'PurchaseRequisition') {
      await prisma.purchaseRequisition.update({
        where: { pr_id: recordId },
        data: { status: 'REJECTED' }
      });
    }

    await BusinessEventService.logEvent({
      event_type: 'APPROVAL_REJECTED',
      entity_type: entityType,
      entity_id: recordId,
      user_id: userId,
      description: `Workflow rejected at step ${history.step.step_number} by user #${userId}. Notes: ${notes || ''}`
    });

    return updatedHistory;
  }

  /**
   * Scans and auto-escalates approvals that have been pending for > 24 hours
   */
  static async escalatePendingApprovals(): Promise<void> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const pendingApprovals = await prisma.approvalHistory.findMany({
      where: {
        status: 'PENDING',
        created_at: { lt: twentyFourHoursAgo }
      },
      include: { step: { include: { workflow: true } } }
    });

    console.log(`[WorkflowEngine] Scanning escalations. Found ${pendingApprovals.length} pending items.`);

    for (const app of pendingApprovals) {
      // Auto-escalation action: log warning, update notes, and alert management role
      await prisma.approvalHistory.update({
        where: { history_id: app.history_id },
        data: { notes: `ESCALATED: Overdue pending approval since ${app.created_at.toISOString()}` }
      });

      // Dispatch alert to Management Role (Role ID 1)
      await NotificationService.createNotification({
        role_id: 1, // Management Role
        type: 'APPROVAL_ESCALATED',
        message: `ESC-01: Approval request for ${app.step.workflow.entity_type} ID ${app.record_id} has been pending for over 24 hours.`,
        priority: 'high'
      });

      await BusinessEventService.logEvent({
        event_type: 'APPROVAL_ESCALATED',
        entity_type: app.step.workflow.entity_type,
        entity_id: app.record_id,
        description: `Approval step ${app.step.step_number} escalated due to SLA breach timer.`
      });
    }
  }

  /**
   * Performs the actual approval mapping on database entity
   */
  private static async autoApproveEntity(
    entityType: 'PurchaseOrder' | 'PurchaseRequisition',
    recordId: number,
    userId: number
  ): Promise<any> {
    if (entityType === 'PurchaseOrder') {
      return ProcurementService.approvePurchaseOrder(recordId, userId);
    } else if (entityType === 'PurchaseRequisition') {
      return ProcurementService.approveRequisition(recordId, userId);
    }
  }
}
