import { prisma } from '../index';
import { PartsConsumptionService } from './PartsConsumptionService';
import { ServiceJobService } from './ServiceJobService';

const partsConsumptionService = new PartsConsumptionService();
const jobService = new ServiceJobService();

export interface SyncMutation {
  mutation_id: string;
  entity_type: string;
  operation: string;
  payload: any;
}

export class OfflineSyncService {
  static async processSyncQueue(
    userId: number,
    deviceId: string,
    mutations: SyncMutation[]
  ): Promise<{ processed: string[]; failed: { mutation_id: string; error: string }[] }> {
    const processed: string[] = [];
    const failed: { mutation_id: string; error: string }[] = [];

    for (const mutation of mutations) {
      try {
        // Record in OfflineSyncQueue database
        const queueItem = await prisma.offlineSyncQueue.create({
          data: {
            user_id: userId,
            device_id: deviceId,
            entity_type: mutation.entity_type,
            operation: mutation.operation,
            payload: mutation.payload,
            status: 'PENDING'
          }
        });

        // Resolve Conflict & Replay
        if (mutation.entity_type === 'ServiceVisit') {
          // For ServiceVisit: signature/photos use Client Wins, text notes use Last Write Wins
          const payload = mutation.payload;
          const visitId = Number(payload.visit_id);

          const existingVisit = await prisma.serviceVisit.findUnique({
            where: { visit_id: visitId }
          });

          if (!existingVisit) {
            throw new Error('SERVICE_VISIT_NOT_FOUND');
          }

          // If the mutation claims status is EXECUTED, and visit is currently PLANNED, run executeVisit
          if (payload.status === 'EXECUTED' && existingVisit.status === 'PLANNED') {
            await jobService.executeVisit(visitId, payload.findings || '', payload.signature_url || '', userId);
          } else {
            // Otherwise, perform manual update (client wins / last write wins)
            await prisma.serviceVisit.update({
              where: { visit_id: visitId },
              data: {
                status: payload.status || existingVisit.status,
                findings: payload.findings || existingVisit.findings, // Last Write Wins
                signature_url: payload.signature_url || existingVisit.signature_url, // Client Wins
                visit_date: payload.visit_date ? new Date(payload.visit_date) : existingVisit.visit_date
              }
            });
          }

          // Handle Photo Attachments (Client Wins)
          if (payload.photos && Array.isArray(payload.photos)) {
            for (const photo of payload.photos) {
              await prisma.visitAttachment.create({
                data: {
                  visit_id: visitId,
                  file_url: photo.file_url,
                  file_name: photo.file_name,
                  latitude: photo.latitude || null,
                  longitude: photo.longitude || null
                }
              });
            }
          }
        } 
        else if (mutation.entity_type === 'ServicePartsConsumption') {
          // Server Wins for inventory: if stock validation fails, we fail this mutation
          const payload = mutation.payload;
          
          // Call PartsConsumptionService inside try-catch to implement Server Wins
          await partsConsumptionService.consumeParts({
            job_id: Number(payload.job_id),
            part_id: Number(payload.part_id),
            location_id: Number(payload.location_id),
            quantity: Number(payload.quantity)
          }, userId);
        }
        else if (mutation.entity_type === 'TechnicianAssignment') {
          // Server Wins for assignments:
          // Check if assignment on server matches client. If job is already reassigned on server, we reject client's update
          const payload = mutation.payload;
          const assignmentId = Number(payload.assignment_id);

          const existing = await prisma.technicianAssignment.findUnique({
            where: { assignment_id: assignmentId }
          });

          if (!existing || existing.technician_id !== payload.technician_id) {
            throw new Error('CONCURRENCY_ERROR: Job assignment on server wins. Cannot modify assignment.');
          }

          await prisma.technicianAssignment.update({
            where: { assignment_id: assignmentId },
            data: {
              status: payload.status,
              scheduled_date: payload.scheduled_date ? new Date(payload.scheduled_date) : existing.scheduled_date
            }
          });
        }
        else {
          throw new Error(`UNSUPPORTED_ENTITY_TYPE: ${mutation.entity_type}`);
        }

        // Mark sync log as PROCESSED
        await prisma.offlineSyncQueue.update({
          where: { sync_id: queueItem.sync_id },
          data: { status: 'PROCESSED' }
        });

        processed.push(mutation.mutation_id);

      } catch (err: any) {
        console.error(`Sync Mutation ${mutation.mutation_id} failed:`, err.message);
        
        // Log mutation as FAILED with error message
        await prisma.offlineSyncQueue.updateMany({
          where: { user_id: userId, device_id: deviceId, entity_type: mutation.entity_type, status: 'PENDING' },
          data: { status: 'FAILED', error_message: err.message }
        });

        failed.push({
          mutation_id: mutation.mutation_id,
          error: err.message
        });
      }
    }

    // Update session last_sync_at
    const existingSession = await prisma.mobileDeviceSession.findFirst({
      where: { user_id: userId, device_id: deviceId }
    });
    if (existingSession) {
      await prisma.mobileDeviceSession.update({
        where: { session_id: existingSession.session_id },
        data: { last_sync_at: new Date() }
      });
    } else {
      await prisma.mobileDeviceSession.create({
        data: {
          user_id: userId,
          device_id: deviceId,
          last_sync_at: new Date()
        }
      });
    }

    return { processed, failed };
  }
}
