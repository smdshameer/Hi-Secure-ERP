import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../index';
import { AttachmentService } from '../services/AttachmentService';
import { AuthRequest } from '../middleware/auth';

export const attachmentsRouter = Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, text, Word, and Excel files are allowed.'));
    }
  }
});

// POST /api/attachments/upload
attachmentsRouter.post('/upload', upload.single('file'), async (req: AuthRequest, res) => {
  const file = req.file;
  try {
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { entity_type, entity_id } = req.body;
    if (!entity_type || !entity_id) {
      // Clean up uploaded file if validation fails
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'entity_type and entity_id are required' });
    }

    const userId = req.userId;
    if (!userId) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
    }

    // RBAC validation based on entity_type
    const userRoles = await prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    });
    const userPermissions = new Set(userRoles.flatMap(ur => ur.role.permissions.map(rp => rp.permission.name)));

    let allowed = false;
    const typeLower = entity_type.toLowerCase();
    if (userPermissions.has('users:manage')) {
      allowed = true; // Admin can do anything
    } else if ((typeLower === 'invoice' || typeLower === 'sales') && (userPermissions.has('invoice:edit') || userPermissions.has('invoice:create'))) {
      allowed = true;
    } else if (typeLower === 'repair' && (userPermissions.has('repairs:update_status') || userPermissions.has('repairs:create'))) {
      allowed = true;
    } else if (typeLower === 'purchase' && (userPermissions.has('purchase:create') || userPermissions.has('purchase:receive'))) {
      allowed = true;
    } else if (!['invoice', 'sales', 'repair', 'purchase'].includes(typeLower)) {
      // For any other types, default to true if authenticated
      allowed = true;
    }

    if (!allowed) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions for this entity type' });
    }

    const attachment = await AttachmentService.createAttachment({
      entity_type,
      entity_id: Number(entity_id),
      file_name: file.originalname,
      file_path: file.filename, // relative to uploads/
      mime_type: file.mimetype,
      uploaded_by: userId
    });

    res.status(201).json(attachment);
  } catch (err: any) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/attachments/:entityType/:entityId
attachmentsRouter.get('/:entityType/:entityId', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
    }

    const entityType = req.params.entityType as string;
    const entityId = req.params.entityId as string;

    const userRoles = await prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    });
    const userPermissions = new Set(userRoles.flatMap(ur => ur.role.permissions.map(rp => rp.permission.name)));

    let allowed = false;
    const typeLower = entityType.toLowerCase();
    if (userPermissions.has('users:manage')) {
      allowed = true;
    } else if ((typeLower === 'invoice' || typeLower === 'sales') && userPermissions.has('invoice:view')) {
      allowed = true;
    } else if (typeLower === 'repair' && userPermissions.has('repairs:create')) {
      allowed = true;
    } else if (typeLower === 'purchase' && (userPermissions.has('purchase:create') || userPermissions.has('purchase:receive'))) {
      allowed = true;
    } else if (!['invoice', 'sales', 'repair', 'purchase'].includes(typeLower)) {
      allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions to view attachments' });
    }

    const list = await AttachmentService.getAttachmentsByEntity(entityType, Number(entityId));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attachments/:id/download
attachmentsRouter.get('/:id/download', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
    }

    const id = Number(req.params.id);
    const attachment = await AttachmentService.getAttachmentById(id);

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Path Traversal check
    if (attachment.file_path.includes('..') || !path.resolve(uploadDir, attachment.file_path).startsWith(uploadDir)) {
      return res.status(400).json({ error: 'Invalid file path: path traversal detected' });
    }

    const userRoles = await prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    });
    const userPermissions = new Set(userRoles.flatMap(ur => ur.role.permissions.map(rp => rp.permission.name)));

    let allowed = false;
    const typeLower = attachment.entity_type.toLowerCase();
    if (userPermissions.has('users:manage')) {
      allowed = true;
    } else if ((typeLower === 'invoice' || typeLower === 'sales') && userPermissions.has('invoice:view')) {
      allowed = true;
    } else if (typeLower === 'repair' && userPermissions.has('repairs:create')) {
      allowed = true;
    } else if (typeLower === 'purchase' && (userPermissions.has('purchase:create') || userPermissions.has('purchase:receive'))) {
      allowed = true;
    } else if (!['invoice', 'sales', 'repair', 'purchase'].includes(typeLower)) {
      allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions to download attachment' });
    }

    const fullPath = path.join(uploadDir, attachment.file_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Physical file not found on disk' });
    }

    res.download(fullPath, attachment.file_name);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/attachments/:id
attachmentsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
    }

    const id = Number(req.params.id);
    const attachment = await AttachmentService.getAttachmentById(id);

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Path Traversal check
    if (attachment.file_path.includes('..') || !path.resolve(uploadDir, attachment.file_path).startsWith(uploadDir)) {
      return res.status(400).json({ error: 'Invalid file path: path traversal detected' });
    }

    const userRoles = await prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    });
    const userPermissions = new Set(userRoles.flatMap(ur => ur.role.permissions.map(rp => rp.permission.name)));

    let allowed = false;
    const typeLower = attachment.entity_type.toLowerCase();
    if (userPermissions.has('users:manage')) {
      allowed = true;
    } else if ((typeLower === 'invoice' || typeLower === 'sales') && userPermissions.has('invoice:delete')) {
      allowed = true;
    } else if (typeLower === 'repair' && userPermissions.has('repairs:update_status')) {
      allowed = true;
    } else if (typeLower === 'purchase' && userPermissions.has('purchase:receive')) {
      allowed = true;
    } else if (!['invoice', 'sales', 'repair', 'purchase'].includes(typeLower)) {
      allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions to delete attachment' });
    }

    // Delete physical file
    const fullPath = path.join(uploadDir, attachment.file_path);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Delete DB record
    await AttachmentService.deleteAttachment(id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});