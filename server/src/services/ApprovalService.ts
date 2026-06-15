import { prisma } from '../index';
import { ApprovalRepository } from '../repositories/ApprovalRepository';

export class ApprovalService {
  private approvalRepo = new ApprovalRepository();

  /**
   * Evaluates if a transaction needs approval.
   * Returns true if fully approved (no workflow or under threshold),
   * or false if workflow is initiated (pending approval).
   */
  async evaluateWorkflow(entityType: string, recordId: number, value: number): Promise<boolean> {
    const workflow = await this.approvalRepo.findWorkflow(entityType);

    if (!workflow || workflow.steps.length === 0) {
      return true; // No workflow configured, default to approved
    }

    const val = Number(value);
    if (val < Number(workflow.threshold)) {
      return true; // Under threshold, bypass approvals
    }

    // Workflow triggered, check if history already exists for recordId
    const firstStep = workflow.steps[0];
    const existing = await this.approvalRepo.findHistory({
      record_id: recordId,
      step_id: firstStep.step_id
    });

    if (!existing) {
      // Create empty initial history or setup to track lifecycle
      // This PO is now officially in pending approval status
      console.log(`Document ID ${recordId} triggers approval workflow "${workflow.entity_type}".`);
    }

    return false; // Requires approval
  }

  /**
   * Retrieves pending approval items for a user based on their roles.
   */
  async getPendingApprovals(userId: number) {
    // 1. Get user roles
    const userRoles = await prisma.userRole.findMany({
      where: { user_id: userId }
    });
    const userRoleIds = userRoles.map(ur => ur.role_id);

    if (userRoleIds.length === 0) return [];

    // 2. Find all active approval steps matching these roles
    const steps = await this.approvalRepo.findSteps({ role_id: { in: userRoleIds } });

    const pending = [];

    for (const step of steps) {
      // Query purchase orders or other documents in pending_approval status
      if (step.workflow.entity_type === 'PurchaseOrder') {
        const poList = await prisma.purchaseOrder.findMany({
          where: { status: 'pending_approval' },
          include: { supplier: true }
        });

        for (const po of poList) {
          // Check if this step is the current pending step.
          // That is, all steps before this step_number must be approved,
          // and this step must NOT be approved yet.
          const isCurrentStep = await this.isCurrentPendingStep(po.po_id, step.step_id, step.workflow_id, step.step_number);
          if (isCurrentStep) {
            pending.push({
              entity_type: 'PurchaseOrder',
              record_id: po.po_id,
              document_number: po.po_number || `PO-${po.po_id}`,
              amount: po.total_amount,
              date: po.order_date,
              description: `Purchase Order from ${po.supplier.name} awaiting approval`,
              step_id: step.step_id,
              step_number: step.step_number
            });
          }
        }
      }
    }

    return pending;
  }

  /**
   * Submits an approval or rejection.
   * Returns true if document is fully approved, false if pending next steps,
   * and throws an error if rejection or error occurs.
   */
  async submitApproval(
    userId: number,
    recordId: number,
    stepId: number,
    status: 'approved' | 'rejected',
    notes?: string
  ): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      // 1. Verify step exists
      const step = await tx.approvalStep.findUnique({
        where: { step_id: stepId },
        include: { workflow: true }
      });
      if (!step) throw new Error('Approval step not found');

      // 2. Verify user has the required role
      const userHasRole = await tx.userRole.findFirst({
        where: { user_id: userId, role_id: step.role_id }
      });
      if (!userHasRole) {
        throw new Error('Forbidden: User does not have the required role to approve this step');
      }

      // 3. Verify previous steps are approved
      const isCurrent = await this.isCurrentPendingStep(recordId, stepId, step.workflow_id, step.step_number, tx);
      if (!isCurrent) {
        throw new Error('Step out of order or already processed');
      }

      // 4. Create history log
      await tx.approvalHistory.create({
        data: {
          record_id: recordId,
          step_id: stepId,
          user_id: userId,
          status,
          notes: notes || null
        }
      });

      // 5. If rejected, update document status immediately and exit
      if (status === 'rejected') {
        if (step.workflow.entity_type === 'PurchaseOrder') {
          await tx.purchaseOrder.update({
            where: { po_id: recordId },
            data: { status: 'rejected' }
          });
        }
        return false;
      }

      // 6. If approved, check if there are subsequent steps
      const nextStep = await tx.approvalStep.findFirst({
        where: {
          workflow_id: step.workflow_id,
          step_number: { gt: step.step_number }
        },
        orderBy: { step_number: 'asc' }
      });

      if (!nextStep) {
        // No more steps: fully approved!
        if (step.workflow.entity_type === 'PurchaseOrder') {
          await tx.purchaseOrder.update({
            where: { po_id: recordId },
            data: { status: 'approved' }
          });
        }
        return true;
      }

      // Next step exists, keep document in pending approval state
      return false;
    });
  }

  /**
   * Fetch approval history for a record.
   */
  async getWorkflowHistory(recordId: number) {
    return this.approvalRepo.findManyHistory({ record_id: recordId });
  }

  // Helper: Checks if step is active and ready for approval
  private async isCurrentPendingStep(
    recordId: number,
    stepId: number,
    workflowId: number,
    stepNumber: number,
    tx?: any
  ): Promise<boolean> {
    const db = tx || prisma;

    // Check if this step has already been processed
    const alreadyProcessed = await db.approvalHistory.findFirst({
      where: { record_id: recordId, step_id: stepId }
    });
    if (alreadyProcessed) return false;

    // If step_number > 1, all prior steps must have 'approved' histories
    if (stepNumber > 1) {
      const priorSteps = await db.approvalStep.findMany({
        where: {
          workflow_id: workflowId,
          step_number: { lt: stepNumber }
        }
      });

      for (const prior of priorSteps) {
        const approved = await db.approvalHistory.findFirst({
          where: {
            record_id: recordId,
            step_id: prior.step_id,
            status: 'approved'
          }
        });
        if (!approved) return false; // Prior step not approved
      }
    }

    return true;
  }
}