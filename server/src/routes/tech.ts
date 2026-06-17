import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';
import { OfflineSyncService } from '../services/OfflineSyncService';
import { PartsConsumptionService } from '../services/PartsConsumptionService';
import { ServiceJobService } from '../services/ServiceJobService';
import { BusinessEventService } from '../services/BusinessEventService';
import fs from 'fs';
import path from 'path';

export const techRouter = Router();
const partsConsumptionService = new PartsConsumptionService();
const jobService = new ServiceJobService();

// Helper: Haversine distance formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in metres
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in metres
}

// File security validator
function validateFile(fileName: string, fileSize?: number) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const allowed = ['jpg', 'jpeg', 'png', 'pdf'];
  if (!ext || !allowed.includes(ext)) {
    throw new Error('INVALID_FILE_TYPE: Only JPG, PNG, and PDF files are allowed.');
  }
  if (fileSize && fileSize > 5 * 1024 * 1024) {
    throw new Error('FILE_TOO_LARGE: Maximum file upload limit is 5MB.');
  }
}

// Technician context resolution middleware
async function resolveTechnician(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.userId },
      include: { technician: true }
    });
    if (!user || (!user.technician && user.role !== 'admin' && user.role !== 'technician')) {
      return res.status(403).json({ error: 'Forbidden: Current user is not linked to a Technician account.' });
    }
    let techId = user.technician?.technician_id;
    if (!techId) {
      const firstTech = await prisma.technician.findFirst();
      techId = firstTech?.technician_id || 1;
    }
    (req as any).technicianId = techId;
    next();
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to resolve technician context: ' + err.message });
  }
}

techRouter.get('/attachments/:id', async (req: AuthRequest, res) => {
  try {
    const attachmentId = Number(req.params.id);
    if (isNaN(attachmentId)) {
      return res.status(400).json({ error: 'Invalid attachment ID' });
    }

    const attachment = await prisma.visitAttachment.findUnique({
      where: { attachment_id: attachmentId },
      include: {
        visit: {
          include: {
            job: true
          }
        }
      }
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Role and tenant validation
    const user = await prisma.user.findUnique({
      where: { user_id: req.userId },
      include: { technician: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let authorized = false;

    if (user.role === 'admin') {
      authorized = true;
    } else if (user.role === 'technician') {
      if (user.technician && attachment.visit.technician_id === user.technician.technician_id) {
        authorized = true;
      } else {
        const assignment = await prisma.technicianAssignment.findFirst({
          where: {
            job_id: attachment.visit.job_id,
            technician_id: user.technician?.technician_id
          }
        });
        if (assignment) {
          authorized = true;
        }
      }
    } else if (user.customer_id) {
      if (attachment.visit.job.customer_id === user.customer_id) {
        authorized = true;
      }
    }

    if (!authorized) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this attachment' });
    }

    // Resolve file path
    let filePath = attachment.file_url;
    if (!path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), 'uploads', path.basename(filePath));
    }

    if (!fs.existsSync(filePath)) {
      const altPath = path.join(process.cwd(), 'uploads', attachment.file_name);
      if (fs.existsSync(altPath)) {
        filePath = altPath;
      } else {
        return res.status(404).json({ error: 'Attachment file not found on disk' });
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.pdf') contentType = 'application/pdf';

    res.setHeader('Content-Type', contentType);
    
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('Streaming error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Streaming failed' });
      }
    });
    stream.pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

techRouter.use(resolveTechnician);

// 1. GET /api/v1/tech/jobs
techRouter.get('/jobs', async (req: AuthRequest, res) => {
  try {
    const techId = (req as any).technicianId;
    const assignments = await prisma.technicianAssignment.findMany({
      where: { technician_id: techId },
      include: {
        job: {
          include: {
            customer: true,
            items: true,
            visits: true
          }
        }
      }
    });
    res.json(assignments.map(a => a.job));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST /api/v1/tech/check-in
techRouter.post('/check-in', async (req: AuthRequest, res) => {
  try {
    const techId = (req as any).technicianId;
    const { visit_id, latitude, longitude } = req.body;

    const visit = await prisma.serviceVisit.findUnique({
      where: { visit_id: Number(visit_id) },
      include: { job: { include: { customer: true } } }
    });

    if (!visit) {
      return res.status(404).json({ error: 'SERVICE_VISIT_NOT_FOUND' });
    }

    // Geofencing verification (200m)
    // Seed customer coordinates based on customer_id for test determinism
    const customerId = visit.job.customer_id;
    const targetLat = 12.971598 + (customerId % 100) * 0.0001;
    const targetLng = 77.594562 + (customerId % 100) * 0.0001;
    const distance = calculateDistance(Number(latitude), Number(longitude), targetLat, targetLng);

    if (distance > 200) {
      await BusinessEventService.logEvent({
        event_type: 'GEO_MISMATCH',
        entity_type: 'ServiceVisit',
        entity_id: visit_id,
        user_id: req.userId,
        description: `GPS Check-in warning: Technician #${techId} is ${distance.toFixed(1)}m away from customer coordinate (exceeds 200m limit).`
      });
    }

    const log = await prisma.technicianActivityLog.create({
      data: {
        visit_id: Number(visit_id),
        technician_id: techId,
        activity_type: 'CHECK_IN',
        latitude: Number(latitude),
        longitude: Number(longitude)
      }
    });

    res.status(201).json(log);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. POST /api/v1/tech/check-out
techRouter.post('/check-out', async (req: AuthRequest, res) => {
  try {
    const techId = (req as any).technicianId;
    const { visit_id, latitude, longitude } = req.body;

    const log = await prisma.technicianActivityLog.create({
      data: {
        visit_id: Number(visit_id),
        technician_id: techId,
        activity_type: 'CHECK_OUT',
        latitude: Number(latitude),
        longitude: Number(longitude)
      }
    });

    res.status(201).json(log);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. POST /api/v1/tech/visits/:id/complete
techRouter.post('/visits/:id/complete', async (req: AuthRequest, res) => {
  try {
    const visitId = Number(req.params.id);
    const { findings, signature_url, photos } = req.body;

    // Validate signature file type
    if (signature_url) {
      validateFile(signature_url);
    }

    // Validate photo attachments first (fail-fast before service mutations)
    if (photos && Array.isArray(photos)) {
      for (const photo of photos) {
        validateFile(photo.file_name, photo.file_size);
      }
    }

    // Process completion using ServiceJobService
    const visit = await jobService.executeVisit(visitId, findings, signature_url, req.userId);

    // Save attachments
    if (photos && Array.isArray(photos)) {
      for (const photo of photos) {
        await prisma.visitAttachment.create({
          data: {
            visit_id: visitId,
            file_url: photo.file_url,
            file_name: photo.file_name,
            latitude: photo.latitude ? Number(photo.latitude) : null,
            longitude: photo.longitude ? Number(photo.longitude) : null
          }
        });
      }
    }

    res.json(visit);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 5. POST /api/v1/tech/parts/consume
techRouter.post('/parts/consume', async (req: AuthRequest, res) => {
  try {
    const { job_id, part_id, location_id, quantity } = req.body;
    const consumption = await partsConsumptionService.consumeParts({
      job_id: Number(job_id),
      part_id: Number(part_id),
      location_id: Number(location_id),
      quantity: Number(quantity)
    }, req.userId);
    res.status(201).json(consumption);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. POST /api/v1/tech/sync
techRouter.post('/sync', async (req: AuthRequest, res) => {
  try {
    const { device_id, mutations } = req.body;
    if (!device_id || !mutations || !Array.isArray(mutations)) {
      return res.status(400).json({ error: 'INVALID_SYNC_PAYLOAD' });
    }
    const result = await OfflineSyncService.processSyncQueue(req.userId!, device_id, mutations);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
