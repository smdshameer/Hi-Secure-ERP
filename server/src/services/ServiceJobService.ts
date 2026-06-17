import { prisma } from '../index';
import { BusinessEventService } from './BusinessEventService';
import { DocumentSeriesService } from './DocumentSeriesService';

export class ServiceJobService {
  
  // ── SERVICE JOB CRUD ───────────────────────────────────────────────────
  async createServiceJob(data: {
    customer_id: number;
    job_type: string; // FIELD_SERVICE, WORKSHOP, AMC
    priority?: string;
    problem_description: string;
    estimated_cost?: number;
    warranty_status?: boolean;
    warranty_expiry?: Date;
    notes?: string;
    items?: Array<{
      device_name: string;
      serial_number?: string;
      model_number?: string;
      issue_description: string;
    }>;
  }, userId?: number) {
    const job_number = await DocumentSeriesService.generateNextNumber('ServiceJob');

    return prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.create({
        data: {
          job_number,
          customer_id: data.customer_id,
          job_type: data.job_type,
          status: 'OPEN',
          priority: data.priority || 'NORMAL',
          problem_description: data.problem_description,
          estimated_cost: data.estimated_cost || null,
          warranty_status: data.warranty_status || false,
          warranty_expiry: data.warranty_expiry || null,
          notes: data.notes || null,
          items: data.items ? {
            create: data.items.map(item => ({
              device_name: item.device_name,
              serial_number: item.serial_number || null,
              model_number: item.model_number || null,
              issue_description: item.issue_description
            }))
          } : undefined
        },
        include: { items: true }
      });

      await BusinessEventService.logEvent({
        event_type: 'SERVICE_JOB_CREATED',
        entity_type: 'ServiceJob',
        entity_id: job.job_id,
        user_id: userId,
        description: `Service Job ${job_number} (${data.job_type}) created for customer #${data.customer_id}.`
      }, tx);

      return job;
    });
  }

  async getServiceJobs(query: { status?: string; job_type?: string }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.job_type) where.job_type = query.job_type;

    return prisma.serviceJob.findMany({
      where,
      include: {
        customer: true,
        items: true,
        assignments: { include: { technician: true } },
        visits: { include: { technician: true } },
        resolutions: { include: { technician: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getServiceJobById(id: number) {
    return prisma.serviceJob.findUnique({
      where: { job_id: id },
      include: {
        customer: true,
        items: true,
        assignments: { include: { technician: true } },
        visits: { include: { technician: true } },
        resolutions: { include: { technician: true } },
        partsConsumed: { include: { part: true, location: true } }
      }
    });
  }

  async updateJobStatus(jobId: number, status: string, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.findUnique({ where: { job_id: jobId } });
      if (!job) throw new Error('SERVICE_JOB_NOT_FOUND');

      const updated = await tx.serviceJob.update({
        where: { job_id: jobId },
        data: { status }
      });

      await BusinessEventService.logEvent({
        event_type: 'SERVICE_JOB_STATUS_UPDATED',
        entity_type: 'ServiceJob',
        entity_id: jobId,
        user_id: userId,
        description: `Service Job ${job.job_number} status updated from ${job.status} to ${status}.`
      }, tx);

      return updated;
    });
  }

  // ── TECHNICIAN ASSIGNMENT ──────────────────────────────────────────────
  async assignTechnician(data: {
    job_id: number;
    technician_id: number;
    scheduled_date: Date;
  }, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.findUnique({ where: { job_id: data.job_id } });
      if (!job) throw new Error('SERVICE_JOB_NOT_FOUND');

      // Create assignment
      const assignment = await tx.technicianAssignment.create({
        data: {
          job_id: data.job_id,
          technician_id: data.technician_id,
          scheduled_date: new Date(data.scheduled_date),
          status: 'PENDING'
        },
        include: { technician: true }
      });

      // Update job status to ASSIGNED
      await tx.serviceJob.update({
        where: { job_id: data.job_id },
        data: { status: 'ASSIGNED' }
      });

      await BusinessEventService.logEvent({
        event_type: 'TECHNICIAN_ASSIGNED',
        entity_type: 'ServiceJob',
        entity_id: data.job_id,
        user_id: userId,
        description: `Technician ${assignment.technician.name} assigned to job ${job.job_number} scheduled on ${assignment.scheduled_date.toDateString()}.`
      }, tx);

      return assignment;
    });
  }

  async acceptAssignment(assignmentId: number, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const assignment = await tx.technicianAssignment.findUnique({
        where: { assignment_id: assignmentId },
        include: { job: true }
      });
      if (!assignment) throw new Error('ASSIGNMENT_NOT_FOUND');
      if (assignment.status !== 'PENDING') {
        throw new Error(`INVALID_STATUS: Cannot accept an assignment in status ${assignment.status}`);
      }

      // Accept assignment
      const updatedAssignment = await tx.technicianAssignment.update({
        where: { assignment_id: assignmentId },
        data: { status: 'ACCEPTED' }
      });

      // Update job status to IN_PROGRESS
      await tx.serviceJob.update({
        where: { job_id: assignment.job_id },
        data: { status: 'IN_PROGRESS' }
      });

      await BusinessEventService.logEvent({
        event_type: 'ASSIGNMENT_ACCEPTED',
        entity_type: 'ServiceJob',
        entity_id: assignment.job_id,
        user_id: userId,
        description: `Technician assignment accepted for job ${assignment.job.job_number}. Status updated to IN_PROGRESS.`
      }, tx);

      return updatedAssignment;
    });
  }

  // ── SERVICE VISIT ──────────────────────────────────────────────────────
  async scheduleVisit(data: {
    job_id: number;
    technician_id: number;
    visit_date: Date;
  }, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.findUnique({ where: { job_id: data.job_id } });
      if (!job) throw new Error('SERVICE_JOB_NOT_FOUND');

      const visit = await tx.serviceVisit.create({
        data: {
          job_id: data.job_id,
          technician_id: data.technician_id,
          visit_date: new Date(data.visit_date),
          status: 'PLANNED'
        },
        include: { technician: true }
      });

      await BusinessEventService.logEvent({
        event_type: 'SERVICE_VISIT_SCHEDULED',
        entity_type: 'ServiceJob',
        entity_id: data.job_id,
        user_id: userId,
        description: `Field visit scheduled for job ${job.job_number} with technician ${visit.technician.name} on ${visit.visit_date.toDateString()}.`
      }, tx);

      return visit;
    });
  }

  async executeVisit(visitId: number, findings: string, signatureUrl?: string, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const visit = await tx.serviceVisit.findUnique({
        where: { visit_id: visitId },
        include: { job: true, technician: true }
      });
      if (!visit) throw new Error('SERVICE_VISIT_NOT_FOUND');
      if (visit.status !== 'PLANNED') {
        throw new Error(`INVALID_STATUS: Cannot execute visit in status ${visit.status}`);
      }

      const updated = await tx.serviceVisit.update({
        where: { visit_id: visitId },
        data: {
          status: 'EXECUTED',
          findings,
          signature_url: signatureUrl || null
        }
      });

      await BusinessEventService.logEvent({
        event_type: 'SERVICE_VISIT_EXECUTED',
        entity_type: 'ServiceJob',
        entity_id: visit.job_id,
        user_id: userId,
        description: `Field visit executed for job ${visit.job.job_number} by ${visit.technician.name}. Findings: ${findings.slice(0, 100)}`
      }, tx);

      return updated;
    });
  }

  // ── RESOLUTION & CLOSURE ──────────────────────────────────────────────
  async resolveJob(data: {
    job_id: number;
    resolved_by: number;
    notes: string;
    rating?: number;
    first_visit_resolved?: boolean;
  }, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.findUnique({ where: { job_id: data.job_id } });
      if (!job) throw new Error('SERVICE_JOB_NOT_FOUND');

      const resolution = await tx.serviceResolution.create({
        data: {
          job_id: data.job_id,
          resolved_by: data.resolved_by,
          resolution_notes: data.notes,
          customer_rating: data.rating || null,
          first_visit_resolved: data.first_visit_resolved !== false
        }
      });

      // Update job status to RESOLVED, and automatically to CLOSED
      const updatedJob = await tx.serviceJob.update({
        where: { job_id: data.job_id },
        data: { status: 'CLOSED' }
      });

      await BusinessEventService.logEvent({
        event_type: 'CYCLE_COUNT_COMPLETED', // Use dynamic event type names or custom
        entity_type: 'ServiceJob',
        entity_id: data.job_id,
        user_id: userId,
        description: `Job ${job.job_number} resolved by technician #${data.resolved_by} and closed.`
      }, tx);

      // Custom business events:
      await BusinessEventService.logEvent({
        event_type: 'SERVICE_JOB_RESOLVED',
        entity_type: 'ServiceJob',
        entity_id: data.job_id,
        user_id: userId,
        description: `Job ${job.job_number} marked as RESOLVED.`
      }, tx);

      await BusinessEventService.logEvent({
        event_type: 'SERVICE_JOB_CLOSED',
        entity_type: 'ServiceJob',
        entity_id: data.job_id,
        user_id: userId,
        description: `Job ${job.job_number} closed successfully.`
      }, tx);

      // Complete associated technician assignments
      await tx.technicianAssignment.updateMany({
        where: { job_id: data.job_id, status: 'ACCEPTED' },
        data: { status: 'COMPLETED' }
      });

      return { resolution, job: updatedJob };
    });
  }

  // ── AMC SCHEDULING ENGINE ──────────────────────────────────────────────
  async scheduleAmcVisits() {
    // Finds active AMC type jobs that are not CLOSED or RESOLVED
    const amcJobs = await prisma.serviceJob.findMany({
      where: {
        job_type: 'AMC',
        status: { notIn: ['RESOLVED', 'CLOSED'] }
      },
      include: {
        visits: true,
        assignments: true
      }
    });

    const scheduledVisits = [];
    const now = new Date();

    for (const job of amcJobs) {
      // If no visits scheduled or completed yet, schedule a visit 30 days from now
      if (job.visits.length === 0) {
        const defaultTech = job.assignments[0]?.technician_id || 1; // Default technician
        const visitDate = new Date();
        visitDate.setDate(visitDate.getDate() + 30);

        const visit = await this.scheduleVisit({
          job_id: job.job_id,
          technician_id: defaultTech,
          visit_date: visitDate
        });
        scheduledVisits.push(visit);
      }
    }

    return scheduledVisits;
  }

  // ── WARRANTY CLAIMS ────────────────────────────────────────────────────
  async validateWarranty(partId: number, purchaseDate: Date): Promise<boolean> {
    const part = await prisma.parts.findUnique({ where: { part_id: partId } });
    if (!part) throw new Error('PART_NOT_FOUND');

    const pDate = new Date(purchaseDate);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Part is covered if purchased within the last 12 months
    return pDate >= oneYearAgo;
  }

  async createWarrantyClaim(data: {
    job_id: number;
    part_id: number;
    approved_qty: number;
    reason?: string;
  }, userId?: number) {
    const claim_number = await DocumentSeriesService.generateNextNumber('WarrantyClaim');

    return prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.findUnique({ where: { job_id: data.job_id } });
      if (!job) throw new Error('SERVICE_JOB_NOT_FOUND');

      const claim = await tx.warrantyClaim.create({
        data: {
          job_id: data.job_id,
          part_id: data.part_id,
          claim_number,
          approved_qty: data.approved_qty,
          reason: data.reason || null,
          status: 'PENDING'
        }
      });

      await BusinessEventService.logEvent({
        event_type: 'WARRANTY_CLAIM_CREATED',
        entity_type: 'WarrantyClaim',
        entity_id: claim.claim_id,
        user_id: userId,
        description: `Warranty Claim ${claim_number} submitted for part #${data.part_id} under job ${job.job_number}.`
      }, tx);

      return claim;
    });
  }
}
