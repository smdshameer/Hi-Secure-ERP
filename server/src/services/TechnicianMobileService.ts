import { prisma } from '../index';
import { BusinessEventService } from './BusinessEventService';
import { ServiceJobService } from './ServiceJobService';
import { PartsConsumptionService } from './PartsConsumptionService';

const jobService = new ServiceJobService();
const partsConsumptionService = new PartsConsumptionService();

export class TechnicianMobileService {
  // ─── CHECK IN / OUT GPS LOGS ─────────────────────────────────────────────
  async logCheckIn(data: {
    visit_id: number;
    technician_id: number;
    latitude: number;
    longitude: number;
  }, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const visit = await tx.serviceVisit.findUnique({ where: { visit_id: data.visit_id } });
      if (!visit) throw new Error('SERVICE_VISIT_NOT_FOUND');

      const log = await tx.technicianActivityLog.create({
        data: {
          visit_id: data.visit_id,
          technician_id: data.technician_id,
          activity_type: 'CHECK_IN',
          latitude: data.latitude,
          longitude: data.longitude
        }
      });

      await BusinessEventService.logEvent({
        event_type: 'TECH_MOBILE_CHECK_IN',
        entity_type: 'ServiceVisit',
        entity_id: data.visit_id,
        user_id: userId,
        description: `Technician #${data.technician_id} checked in for visit #${data.visit_id} at GPS (${data.latitude}, ${data.longitude}).`
      }, tx);

      return log;
    });
  }

  async logCheckOut(data: {
    visit_id: number;
    technician_id: number;
    latitude: number;
    longitude: number;
  }, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const visit = await tx.serviceVisit.findUnique({ where: { visit_id: data.visit_id } });
      if (!visit) throw new Error('SERVICE_VISIT_NOT_FOUND');

      const log = await tx.technicianActivityLog.create({
        data: {
          visit_id: data.visit_id,
          technician_id: data.technician_id,
          activity_type: 'CHECK_OUT',
          latitude: data.latitude,
          longitude: data.longitude
        }
      });

      await BusinessEventService.logEvent({
        event_type: 'TECH_MOBILE_CHECK_OUT',
        entity_type: 'ServiceVisit',
        entity_id: data.visit_id,
        user_id: userId,
        description: `Technician #${data.technician_id} checked out for visit #${data.visit_id} at GPS (${data.latitude}, ${data.longitude}).`
      }, tx);

      return log;
    });
  }

  // ─── PHOTO ATTACHMENTS ───────────────────────────────────────────────────
  async uploadAttachment(data: {
    visit_id: number;
    file_url: string;
    file_name: string;
    latitude?: number;
    longitude?: number;
  }, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const visit = await tx.serviceVisit.findUnique({ where: { visit_id: data.visit_id } });
      if (!visit) throw new Error('SERVICE_VISIT_NOT_FOUND');

      const attachment = await tx.visitAttachment.create({
        data: {
          visit_id: data.visit_id,
          file_url: data.file_url,
          file_name: data.file_name,
          latitude: data.latitude || null,
          longitude: data.longitude || null
        }
      });

      await BusinessEventService.logEvent({
        event_type: 'TECH_MOBILE_PHOTO_UPLOADED',
        entity_type: 'ServiceVisit',
        entity_id: data.visit_id,
        user_id: userId,
        description: `Photo ${data.file_name} uploaded for visit #${data.visit_id}.`
      }, tx);

      return attachment;
    });
  }

  // ─── SIGNATURE CAPTURE & EXECUTION ───────────────────────────────────────
  async captureSignature(data: {
    visit_id: number;
    findings: string;
    signature_url: string;
  }, userId?: number) {
    // Rely on ServiceJobService to transition visit to EXECUTED
    return jobService.executeVisit(data.visit_id, data.findings, data.signature_url, userId);
  }

  // ─── PARTS REQUESTS ──────────────────────────────────────────────────────
  async createPartsRequest(data: {
    job_id: number;
    part_id: number;
    location_id: number;
    quantity: number;
    requested_by: number; // technician_id
  }, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.findUnique({ where: { job_id: data.job_id } });
      if (!job) throw new Error('SERVICE_JOB_NOT_FOUND');

      const request = await tx.partsRequest.create({
        data: {
          job_id: data.job_id,
          part_id: data.part_id,
          location_id: data.location_id,
          quantity: data.quantity,
          requested_by: data.requested_by,
          status: 'PENDING'
        }
      });

      await BusinessEventService.logEvent({
        event_type: 'PARTS_REQUEST_CREATED',
        entity_type: 'PartsRequest',
        entity_id: request.request_id,
        user_id: userId,
        description: `Technician #${data.requested_by} requested ${data.quantity} units of part #${data.part_id} for job #${data.job_id}.`
      }, tx);

      return request;
    });
  }

  // ─── MANAGER APPROVAL WORKFLOW ───────────────────────────────────────────
  async approvePartsRequest(requestId: number, managerUserId: number) {
    // 1. Fetch parts request details
    const request = await prisma.partsRequest.findUnique({ where: { request_id: requestId } });
    if (!request) throw new Error('PARTS_REQUEST_NOT_FOUND');
    if (request.status !== 'PENDING') throw new Error(`INVALID_STATUS: Parts request is already ${request.status}.`);

    // 2. Perform safe inventory consumption using PartsConsumptionService
    // This executes stock_version locking, OCC validation, and negative stock guards inside a transaction
    await partsConsumptionService.consumeParts({
      job_id: request.job_id,
      part_id: request.part_id,
      location_id: request.location_id,
      quantity: request.quantity
    }, managerUserId);

    // 3. If consumption succeeds, update the request status to FULFILLED
    const updated = await prisma.partsRequest.update({
      where: { request_id: requestId },
      data: { status: 'FULFILLED' }
    });

    await BusinessEventService.logEvent({
      event_type: 'PARTS_REQUEST_APPROVED',
      entity_type: 'PartsRequest',
      entity_id: requestId,
      user_id: managerUserId,
      description: `Parts request #${requestId} approved and fulfilled by manager #${managerUserId}.`
    });

    return updated;
  }

  async rejectPartsRequest(requestId: number, managerUserId: number) {
    const request = await prisma.partsRequest.findUnique({ where: { request_id: requestId } });
    if (!request) throw new Error('PARTS_REQUEST_NOT_FOUND');
    if (request.status !== 'PENDING') throw new Error(`INVALID_STATUS: Parts request is already ${request.status}.`);

    const updated = await prisma.partsRequest.update({
      where: { request_id: requestId },
      data: { status: 'REJECTED' }
    });

    await BusinessEventService.logEvent({
      event_type: 'PARTS_REQUEST_REJECTED',
      entity_type: 'PartsRequest',
      entity_id: requestId,
      user_id: managerUserId,
      description: `Parts request #${requestId} rejected by manager #${managerUserId}.`
    });

    return updated;
  }
}
