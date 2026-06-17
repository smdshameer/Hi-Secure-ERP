import { Router, Response } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { prisma } from '../index';
import { BusinessEventService } from '../services/BusinessEventService';
import { PricingGovernanceService } from '../services/PricingGovernanceService';
import { SupplierGovernanceService } from '../services/SupplierGovernanceService';
import { CatalogVersionService } from '../services/CatalogVersionService';
import {
  generateCanonicalChecksum,
  verifyCanonicalChecksum
} from '../utils/canonicalChecksum';

export const catalogReviewRouter = Router();

// Helper endpoint: Get session and all preview items
catalogReviewRouter.get('/session/:id', requirePermission('purchase:create'), async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = Number(req.params.id);
    const session = await prisma.catalogImportSession.findUnique({
      where: { session_id: sessionId },
      include: {
        preview_items: true,
        rollback: true
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Catalog import session not found.' });
    }

    // Enhance preview items with price comparisons
    const enhancedItems = await Promise.all(
      session.preview_items.map(async (item) => {
        let currentCostPrice = null;
        let currentSellingPrice = null;
        let diffPercent = null;

        if (item.matched_part_id) {
          const part = await prisma.parts.findUnique({
            where: { part_id: item.matched_part_id }
          });
          if (part) {
            currentCostPrice = part.cost_price ? Number(part.cost_price) : null;
            currentSellingPrice = part.selling_price ? Number(part.selling_price) : null;

            if (currentCostPrice && currentCostPrice > 0 && item.cost_price) {
              diffPercent = ((Number(item.cost_price) - currentCostPrice) / currentCostPrice) * 100;
            }
          }
        }

        return {
          id: item.id,
          temporary_item_id: item.temporary_item_id,
          brand: item.brand,
          model: item.model,
          part_number: item.part_number,
          name: item.name,
          description: item.description,
          cost_price: item.cost_price ? Number(item.cost_price) : 0,
          selling_price: item.selling_price ? Number(item.selling_price) : 0,
          tax_rate: item.tax_rate ? Number(item.tax_rate) : 0,
          category: item.category,
          confidence: item.confidence,
          status: item.status,
          decision: item.decision,
          matched_part_id: item.matched_part_id,
          is_duplicate: item.is_duplicate,
          duplicate_confidence: item.duplicate_confidence ? Number(item.duplicate_confidence) : null,
          warnings: item.warnings,
          raw_source_text: item.raw_source_text,
          version: item.version,
          currentCostPrice,
          catalogCostPrice: item.cost_price ? Number(item.cost_price) : null,
          differencePercent: diffPercent,
          currentSellingPrice,
          suggestedSellingPrice: item.selling_price ? Number(item.selling_price) : null
        };
      })
    );

    return res.json({
      sessionId: session.session_id,
      version: session.version,
      status: session.status,
      validation_status: session.validation_status,
      file_name: session.file_name,
      created_at: session.created_at,
      items: enhancedItems
    });
  } catch (err: any) {
    console.error('[Catalog Review] Get session details error:', err);
    return res.status(500).json({ error: 'Failed to retrieve session details.' });
  }
});

// 1. Approve Session
catalogReviewRouter.post('/session/:id/approve', requirePermission('purchase:create'), async (req: AuthRequest, res: Response) => {
  const sessionId = Number(req.params.id);
  const { version, reviewPendingCount } = req.body;

  try {
    if (version === undefined || reviewPendingCount === undefined) {
      return res.status(400).json({ error: 'version and reviewPendingCount are required.' });
    }

    const session = await prisma.catalogImportSession.findUnique({
      where: { session_id: sessionId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Catalog import session not found.' });
    }

    // Version Check
    if (session.version !== Number(version)) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_STALE_REQUEST_REJECTED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Stale session approval rejected. Expected version: ${session.version}, got: ${version}`
      });
      return res.status(409).json({ error: 'Session version conflict', code: 'SESSION_CONFLICT' });
    }

    // Pending Count Consistency Check
    const dbPendingCount = await prisma.catalogPreviewItem.count({
      where: { session_id: sessionId, status: 'REVIEW_PENDING' }
    });

    if (dbPendingCount !== Number(reviewPendingCount)) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_SESSION_STATE_CHANGED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Session approval rejected. Expected pending count: ${dbPendingCount}, got: ${reviewPendingCount}`
      });
      return res.status(400).json({ error: 'Session state changed', code: 'SESSION_STATE_CHANGED' });
    }

    if (session.status !== 'REVIEW_PENDING') {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_SESSION_CONFLICT',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Session approval conflict. Status: ${session.status}`
      });
      return res.status(409).json({ error: 'Session is not in REVIEW_PENDING status.', code: 'SESSION_CONFLICT' });
    }

    // Execute in transaction with OCC check on session version
    await prisma.$transaction(async (tx) => {
      // Lock and update session with version check
      await tx.catalogImportSession.update({
        where: {
          session_id: sessionId,
          version: Number(version)
        },
        data: {
          status: 'APPROVED',
          version: { increment: 1 }
        }
      });

      // Approve all items currently in REVIEW_PENDING status and increment their version
      await tx.catalogPreviewItem.updateMany({
        where: { session_id: sessionId, status: 'REVIEW_PENDING' },
        data: { status: 'APPROVED', version: { increment: 1 } }
      });

      // Record in ImportApprovalHistory
      await tx.importApprovalHistory.create({
        data: {
          session_id: sessionId,
          action: 'APPROVE_SESSION',
          performed_by: req.userId || 1,
          comments: `Approved session version ${version}`
        }
      });
    });

    // Log BusinessEvent
    await BusinessEventService.logEvent({
      event_type: 'CATALOG_IMPORT_APPROVED',
      entity_type: 'CatalogImportSession',
      entity_id: sessionId,
      user_id: req.userId || null,
      description: `Session approved`
    });

    await BusinessEventService.logEvent({
      event_type: 'CATALOG_SESSION_VERSION_INCREMENTED',
      entity_type: 'CatalogImportSession',
      entity_id: sessionId,
      user_id: req.userId || null,
      description: `Session version incremented`
    });

    return res.json({ success: true, status: 'APPROVED' });
  } catch (err: any) {
    if (err.code === 'P2025') {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_STALE_REQUEST_REJECTED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Stale session approval rejected.`
      });
      return res.status(409).json({ error: 'Session version conflict', code: 'SESSION_CONFLICT' });
    }
    console.error('[Catalog Review] Approve session error:', err);
    return res.status(500).json({ error: 'Failed to approve session.' });
  }
});

// 2. Reject Session
catalogReviewRouter.post('/session/:id/reject', requirePermission('purchase:create'), async (req: AuthRequest, res: Response) => {
  const sessionId = Number(req.params.id);
  const { version, reviewPendingCount } = req.body;

  try {
    if (version === undefined || reviewPendingCount === undefined) {
      return res.status(400).json({ error: 'version and reviewPendingCount are required.' });
    }

    const session = await prisma.catalogImportSession.findUnique({
      where: { session_id: sessionId },
      include: { preview_items: true }
    });

    if (!session) {
      return res.status(404).json({ error: 'Catalog import session not found.' });
    }

    // Version Check
    if (session.version !== Number(version)) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_STALE_REQUEST_REJECTED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Stale session rejection rejected. Expected version: ${session.version}, got: ${version}`
      });
      return res.status(409).json({ error: 'Session version conflict', code: 'SESSION_CONFLICT' });
    }

    // Pending Count Consistency Check
    const dbPendingCount = await prisma.catalogPreviewItem.count({
      where: { session_id: sessionId, status: 'REVIEW_PENDING' }
    });

    if (dbPendingCount !== Number(reviewPendingCount)) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_SESSION_STATE_CHANGED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Session rejection rejected. Expected pending count: ${dbPendingCount}, got: ${reviewPendingCount}`
      });
      return res.status(400).json({ error: 'Session state changed', code: 'SESSION_STATE_CHANGED' });
    }

    const validStates = ['REVIEW_PENDING', 'APPROVED', 'PARTIALLY_APPROVED'];
    if (!validStates.includes(session.status)) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_SESSION_CONFLICT',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Session rejection conflict. Status: ${session.status}`
      });
      return res.status(409).json({ error: `Cannot reject session in status: ${session.status}`, code: 'SESSION_CONFLICT' });
    }

    const itemsToReject = session.preview_items.filter(item => item.status === 'REVIEW_PENDING' || item.status === 'APPROVED');

    await prisma.$transaction(async (tx) => {
      // Update session with version check
      await tx.catalogImportSession.update({
        where: {
          session_id: sessionId,
          version: Number(version)
        },
        data: {
          status: 'REJECTED',
          version: { increment: 1 }
        }
      });

      // Reject all relevant items and increment versions
      await tx.catalogPreviewItem.updateMany({
        where: {
          session_id: sessionId,
          status: { in: ['REVIEW_PENDING', 'APPROVED'] }
        },
        data: { status: 'REJECTED', version: { increment: 1 } }
      });
    });

    // Log BusinessEvent for each item rejected
    for (const item of itemsToReject) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ITEM_REJECTED',
        entity_type: 'CatalogPreviewItem',
        entity_id: item.id,
        user_id: req.userId || null,
        description: `Item rejected during session rejection`
      });
    }

    await BusinessEventService.logEvent({
      event_type: 'CATALOG_SESSION_VERSION_INCREMENTED',
      entity_type: 'CatalogImportSession',
      entity_id: sessionId,
      user_id: req.userId || null,
      description: `Session version incremented`
    });

    return res.json({ success: true, status: 'REJECTED' });
  } catch (err: any) {
    if (err.code === 'P2025') {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_STALE_REQUEST_REJECTED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Stale session rejection rejected.`
      });
      return res.status(409).json({ error: 'Session version conflict', code: 'SESSION_CONFLICT' });
    }
    console.error('[Catalog Review] Reject session error:', err);
    return res.status(500).json({ error: 'Failed to reject session.' });
  }
});

// 3. Approve Item
catalogReviewRouter.post('/item/:id/approve', requirePermission('purchase:create'), async (req: AuthRequest, res: Response) => {
  const itemId = Number(req.params.id);
  const { version, decision } = req.body;

  try {
    if (version === undefined) {
      return res.status(400).json({ error: 'version is required.' });
    }

    const item = await prisma.catalogPreviewItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      return res.status(404).json({ error: 'Catalog preview item not found.' });
    }

    if (item.status !== 'REVIEW_PENDING') {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ITEM_CONFLICT',
        entity_type: 'CatalogPreviewItem',
        entity_id: itemId,
        user_id: req.userId || null,
        description: `Item approval conflict. Status: ${item.status}`
      });
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_STALE_REQUEST_REJECTED',
        entity_type: 'CatalogPreviewItem',
        entity_id: itemId,
        user_id: req.userId || null,
        description: `Stale item approval request rejected.`
      });
      return res.status(409).json({ error: `Item is not in REVIEW_PENDING status (current: ${item.status}).`, code: 'ITEM_CONFLICT' });
    }

    if (item.is_duplicate) {
      if (!decision) {
        return res.status(400).json({ error: 'Duplicate decision is required (KEEP_NEW or USE_EXISTING).', code: 'DECISION_REQUIRED' });
      }
      if (decision !== 'KEEP_NEW' && decision !== 'USE_EXISTING') {
        return res.status(400).json({ error: 'Invalid duplicate decision. Must be KEEP_NEW or USE_EXISTING.' });
      }
    }

    // Update with version filter for optimistic concurrency control
    const updatedItem = await prisma.catalogPreviewItem.update({
      where: {
        id: itemId,
        version: Number(version)
      },
      data: {
        status: 'APPROVED',
        decision: decision || null,
        version: { increment: 1 }
      }
    });

    // Log BusinessEvent
    await BusinessEventService.logEvent({
      event_type: 'CATALOG_ITEM_APPROVED',
      entity_type: 'CatalogPreviewItem',
      entity_id: itemId,
      user_id: req.userId || null,
      description: `Item approved`
    });

    return res.json({ success: true, item: updatedItem });
  } catch (err: any) {
    if (err.code === 'P2025') {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ITEM_CONFLICT',
        entity_type: 'CatalogPreviewItem',
        entity_id: itemId,
        user_id: req.userId || null,
        description: `Item approval version conflict.`
      });
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_STALE_REQUEST_REJECTED',
        entity_type: 'CatalogPreviewItem',
        entity_id: itemId,
        user_id: req.userId || null,
        description: `Stale item approval request rejected.`
      });
      return res.status(409).json({ error: 'Item version conflict', code: 'ITEM_CONFLICT' });
    }
    console.error('[Catalog Review] Approve item error:', err);
    return res.status(500).json({ error: 'Failed to approve item.' });
  }
});

// 4. Reject Item
catalogReviewRouter.post('/item/:id/reject', requirePermission('purchase:create'), async (req: AuthRequest, res: Response) => {
  const itemId = Number(req.params.id);
  const { version } = req.body;

  try {
    if (version === undefined) {
      return res.status(400).json({ error: 'version is required.' });
    }

    const item = await prisma.catalogPreviewItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      return res.status(404).json({ error: 'Catalog preview item not found.' });
    }

    if (item.status !== 'REVIEW_PENDING') {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ITEM_CONFLICT',
        entity_type: 'CatalogPreviewItem',
        entity_id: itemId,
        user_id: req.userId || null,
        description: `Item rejection conflict. Status: ${item.status}`
      });
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_STALE_REQUEST_REJECTED',
        entity_type: 'CatalogPreviewItem',
        entity_id: itemId,
        user_id: req.userId || null,
        description: `Stale item rejection request rejected.`
      });
      return res.status(409).json({ error: `Item is not in REVIEW_PENDING status (current: ${item.status}).`, code: 'ITEM_CONFLICT' });
    }

    // Update with version lock check
    const updatedItem = await prisma.catalogPreviewItem.update({
      where: {
        id: itemId,
        version: Number(version)
      },
      data: {
        status: 'REJECTED',
        version: { increment: 1 }
      }
    });

    // Log BusinessEvent
    await BusinessEventService.logEvent({
      event_type: 'CATALOG_ITEM_REJECTED',
      entity_type: 'CatalogPreviewItem',
      entity_id: itemId,
      user_id: req.userId || null,
      description: `Item rejected`
    });

    return res.json({ success: true, item: updatedItem });
  } catch (err: any) {
    if (err.code === 'P2025') {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ITEM_CONFLICT',
        entity_type: 'CatalogPreviewItem',
        entity_id: itemId,
        user_id: req.userId || null,
        description: `Item rejection version conflict.`
      });
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_STALE_REQUEST_REJECTED',
        entity_type: 'CatalogPreviewItem',
        entity_id: itemId,
        user_id: req.userId || null,
        description: `Stale item rejection request rejected.`
      });
      return res.status(409).json({ error: 'Item version conflict', code: 'ITEM_CONFLICT' });
    }
    console.error('[Catalog Review] Reject item error:', err);
    return res.status(500).json({ error: 'Failed to reject item.' });
  }
});

// 5. Merge Item
catalogReviewRouter.post('/item/:id/merge', requirePermission('purchase:create'), async (req: AuthRequest, res: Response) => {
  const itemId = Number(req.params.id);
  const { version, matchedPartId, reason } = req.body;

  try {
    if (version === undefined || matchedPartId === undefined) {
      return res.status(400).json({ error: 'version and matchedPartId are required.' });
    }

    const item = await prisma.catalogPreviewItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      return res.status(404).json({ error: 'Catalog preview item not found.' });
    }

    if (item.status !== 'REVIEW_PENDING') {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ITEM_CONFLICT',
        entity_type: 'CatalogPreviewItem',
        entity_id: itemId,
        user_id: req.userId || null,
        description: `Item merge conflict. Status: ${item.status}`
      });
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_STALE_REQUEST_REJECTED',
        entity_type: 'CatalogPreviewItem',
        entity_id: itemId,
        user_id: req.userId || null,
        description: `Stale item merge request rejected.`
      });
      return res.status(409).json({ error: `Item is not in REVIEW_PENDING status (current: ${item.status}).`, code: 'ITEM_CONFLICT' });
    }

    // Verify existing part
    const existingPart = await prisma.parts.findUnique({
      where: { part_id: Number(matchedPartId) }
    });

    if (!existingPart) {
      return res.status(400).json({ error: `Existing part with ID ${matchedPartId} not found.` });
    }

    // Update with version lock check
    const updatedItem = await prisma.catalogPreviewItem.update({
      where: {
        id: itemId,
        version: Number(version)
      },
      data: {
        status: 'MERGED',
        decision: 'MERGE',
        matched_part_id: Number(matchedPartId),
        version: { increment: 1 }
      }
    });

    // Evaluate price change on merge
    await PricingGovernanceService.evaluatePriceChange(
      item.session_id,
      itemId,
      Number(matchedPartId),
      existingPart.cost_price ? Number(existingPart.cost_price) : 0,
      Number(item.cost_price),
      existingPart.selling_price ? Number(existingPart.selling_price) : 0,
      Number(item.selling_price)
    );

    // Log BusinessEvent
    await BusinessEventService.logEvent({
      event_type: 'CATALOG_ITEM_MERGED',
      entity_type: 'CatalogPreviewItem',
      entity_id: itemId,
      user_id: req.userId || null,
      description: JSON.stringify({
        timestamp: new Date().toISOString(),
        old_values: {
          part_id: existingPart.part_id,
          name: existingPart.name,
          cost_price: existingPart.cost_price ? Number(existingPart.cost_price) : null,
          selling_price: Number(existingPart.selling_price)
        },
        new_values: {
          name: item.name,
          cost_price: Number(item.cost_price),
          selling_price: Number(item.selling_price)
        },
        reason: reason || 'Merged with existing part'
      })
    });

    return res.json({ success: true, item: updatedItem });
  } catch (err: any) {
    if (err.code === 'P2025') {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ITEM_CONFLICT',
        entity_type: 'CatalogPreviewItem',
        entity_id: itemId,
        user_id: req.userId || null,
        description: `Item merge version conflict.`
      });
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_STALE_REQUEST_REJECTED',
        entity_type: 'CatalogPreviewItem',
        entity_id: itemId,
        user_id: req.userId || null,
        description: `Stale item merge request rejected.`
      });
      return res.status(409).json({ error: 'Item version conflict', code: 'ITEM_CONFLICT' });
    }
    console.error('[Catalog Review] Merge item error:', err);
    return res.status(500).json({ error: 'Failed to merge item.' });
  }
});

// Price Review Endpoint
catalogReviewRouter.post('/session/:id/price-review', requirePermission('purchase:create'), async (req: AuthRequest, res: Response) => {
  const sessionId = Number(req.params.id);
  try {
    const session = await prisma.catalogImportSession.findUnique({
      where: { session_id: sessionId },
      include: { preview_items: true }
    });
    if (!session) {
      return res.status(404).json({ error: 'Catalog import session not found.' });
    }

    const { normalMax, moderateMax } = await PricingGovernanceService.getThresholds();

    // Populate / update price changes for any items with a matched part
    for (const item of session.preview_items) {
      if (item.matched_part_id) {
        const part = await prisma.parts.findUnique({ where: { part_id: item.matched_part_id } });
        if (part) {
          const oldCost = part.cost_price ? Number(part.cost_price) : 0;
          const newCost = Number(item.cost_price);
          const oldSelling = part.selling_price ? Number(part.selling_price) : 0;
          const newSelling = Number(item.selling_price);

          if (oldCost !== newCost || oldSelling !== newSelling) {
            await PricingGovernanceService.evaluatePriceChange(
              sessionId,
              item.id,
              part.part_id,
              oldCost,
              newCost,
              oldSelling,
              newSelling
            );
          }
        }
      }
    }

    const priceChanges = await prisma.supplierPriceChange.findMany({
      where: { session_id: sessionId }
    });

    const result = priceChanges.map(pc => {
      const risk = PricingGovernanceService.categorizeRisk(Number(pc.change_percentage), normalMax, moderateMax);
      return {
        id: pc.id,
        preview_item_id: pc.preview_item_id,
        part_id: pc.part_id,
        old_cost_price: Number(pc.old_cost_price),
        new_cost_price: Number(pc.new_cost_price),
        old_selling_price: Number(pc.old_selling_price),
        new_selling_price: Number(pc.new_selling_price),
        change_percentage: Number(pc.change_percentage),
        risk_classification: risk,
        approval_status: pc.approval_status
      };
    });

    await BusinessEventService.logEvent({
      event_type: 'PRICE_CHANGE_REVIEWED',
      entity_type: 'CatalogImportSession',
      entity_id: sessionId,
      user_id: req.userId || null,
      description: `Price changes reviewed for session ${sessionId}`
    });

    return res.json({
      currentNormalThreshold: normalMax,
      currentModerateThreshold: moderateMax,
      priceChanges: result
    });
  } catch (err: any) {
    console.error('[Catalog Review] Price review error:', err);
    return res.status(500).json({ error: 'Failed to process price review.' });
  }
});

// Approve Price Changes Endpoint
catalogReviewRouter.post('/session/:id/approve-price-changes', requirePermission('purchase:create'), async (req: AuthRequest, res: Response) => {
  const sessionId = Number(req.params.id);
  const userId = req.userId || 1;
  const { version, mode } = req.body;

  if (version === undefined) {
    return res.status(400).json({ error: 'version is required.' });
  }

  const approvalMode = mode || 'HIGH_RISK_ONLY';

  try {
    const session = await prisma.catalogImportSession.findUnique({
      where: { session_id: sessionId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Catalog import session not found.' });
    }

    if (session.version !== Number(version)) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_STALE_REQUEST_REJECTED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: userId,
        description: `Stale price changes approval request. Expected: ${session.version}, got: ${version}`
      });
      return res.status(409).json({ error: 'Session version conflict', code: 'SESSION_CONFLICT' });
    }

    const { normalMax, moderateMax } = await PricingGovernanceService.getThresholds();
    const priceChanges = await prisma.supplierPriceChange.findMany({
      where: { session_id: sessionId, approval_status: 'PENDING' }
    });

    // Filter changes to approve
    const toApprove = priceChanges.filter(pc => {
      if (approvalMode === 'ALL') return true;
      const risk = PricingGovernanceService.categorizeRisk(Number(pc.change_percentage), normalMax, moderateMax);
      return risk === 'HIGH_RISK';
    });

    if (toApprove.length === 0) {
      return res.json({ success: true, approvedCount: 0, highRiskCount: 0, approvalBatchId: null });
    }

    const approvalBatchId = PricingGovernanceService.generateApprovalBatchId();
    let approvedCount = 0;
    let highRiskCount = 0;
    let maxRevision = 0;

    await prisma.$transaction(async (tx) => {
      for (const pc of toApprove) {
        const risk = PricingGovernanceService.categorizeRisk(Number(pc.change_percentage), normalMax, moderateMax);
        approvedCount++;
        if (risk === 'HIGH_RISK') {
          highRiskCount++;
        }

        const nextRevision = pc.approval_revision === 0 ? 1 : pc.approval_revision;
        if (nextRevision > maxRevision) {
          maxRevision = nextRevision;
        }

        const tempPc = {
          ...pc,
          approval_status: 'APPROVED',
          approval_revision: nextRevision
        };
        const fingerprint = PricingGovernanceService.computeApprovalFingerprint(tempPc);

        await tx.supplierPriceChange.update({
          where: { id: pc.id },
          data: {
            approval_status: 'APPROVED',
            approved_by: userId,
            approved_at: new Date(),
            approval_normal_threshold: normalMax,
            approval_moderate_threshold: moderateMax,
            approval_revision: nextRevision,
            approval_batch_id: approvalBatchId,
            approval_fingerprint: fingerprint
          }
        });

        await tx.businessEvent.create({
          data: {
            event_type: 'PRICE_CHANGE_APPROVED',
            entity_type: 'SupplierPriceChange',
            entity_id: pc.id,
            user_id: userId,
            description: `Price change approved. Revision: ${nextRevision}, Batch: ${approvalBatchId}`
          }
        });
      }

      const commentsJson = {
        approvalBatchId,
        approvedCount,
        highRiskCount,
        sessionVersion: Number(version),
        approvalMode,
        normalThreshold: normalMax,
        moderateThreshold: moderateMax,
        approvalRevision: maxRevision,
        timestamp: new Date().toISOString()
      };

      await tx.importApprovalHistory.create({
        data: {
          session_id: sessionId,
          action: 'APPROVE_PRICE_CHANGES',
          performed_by: userId,
          comments: JSON.stringify(commentsJson),
          approved_price_changes_count: approvedCount,
          high_risk_price_changes_count: highRiskCount,
          approval_timestamp: new Date()
        }
      });

      await tx.catalogImportSession.update({
        where: { session_id: sessionId },
        data: { version: { increment: 1 } }
      });
    });

    await BusinessEventService.logEvent({
      event_type: 'CATALOG_SESSION_VERSION_INCREMENTED',
      entity_type: 'CatalogImportSession',
      entity_id: sessionId,
      user_id: userId,
      description: `Session version incremented during price changes approval`
    });

    return res.json({
      success: true,
      approvedCount,
      highRiskCount,
      approvalBatchId
    });
  } catch (err: any) {
    console.error('[Catalog Review] Approve price changes error:', err);
    return res.status(500).json({ error: 'Failed to approve price changes.' });
  }
});

// 6. Validate Import (Dry Run)
catalogReviewRouter.post('/session/:id/validate-import', requirePermission('purchase:create'), async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = Number(req.params.id);
    const { version } = req.body;

    const session = await prisma.catalogImportSession.findUnique({
      where: { session_id: sessionId },
      include: { preview_items: true }
    });

    if (!session) {
      return res.status(404).json({ error: 'Catalog import session not found.' });
    }

    // Stale version guard
    if (version !== undefined && session.version !== Number(version)) {
      return res.status(409).json({ error: 'Session version conflict', code: 'SESSION_CONFLICT' });
    }

    // Guard: check if any items are REVIEW_PENDING
    const pendingItems = session.preview_items.filter(item => item.status === 'REVIEW_PENDING');
    if (pendingItems.length > 0) {
      return res.status(400).json({
        error: `Session review incomplete: ${pendingItems.length} items remain REVIEW_PENDING.`,
        code: 'SESSION_REVIEW_INCOMPLETE'
      });
    }

    let newProducts = 0;
    let updatedProducts = 0;
    let mergedProducts = 0;
    let rejectedProducts = 0;
    const warnings: string[] = [];

    for (const item of session.preview_items) {
      if (item.status === 'APPROVED') {
        if (!item.is_duplicate || item.decision === 'KEEP_NEW') {
          newProducts++;
        }
      } else if (item.status === 'MERGED') {
        updatedProducts++;
        mergedProducts++;
      } else if (item.status === 'REJECTED') {
        rejectedProducts++;
      }
    }

    return res.json({
      canImport: true,
      newProducts,
      updatedProducts,
      mergedProducts,
      rejectedProducts,
      warnings
    });
  } catch (err: any) {
    console.error('[Catalog Review] Validate import error:', err);
    return res.status(500).json({ error: 'Failed to validate import.' });
  }
});

// 7. Import Session
catalogReviewRouter.post('/session/:id/import', requirePermission('purchase:create'), async (req: AuthRequest, res: Response) => {
  const sessionId = Number(req.params.id);
  const userId = req.userId || 1;
  const { version, approvedCount, rejectedCount, mergedCount, pendingCount } = req.body;

  if (version === undefined) {
    return res.status(400).json({ error: 'version is required.' });
  }

  try {
    const session = await prisma.catalogImportSession.findUnique({
      where: { session_id: sessionId },
      include: { preview_items: true }
    });

    if (!session) {
      return res.status(404).json({ error: 'Catalog import session not found.' });
    }

    // Duplicate Catalog Version Detection
    if (session.file_hash) {
      try {
        await CatalogVersionService.detectDuplicateCatalog(session.file_hash, userId);
      } catch (err: any) {
        if (err.code === 'DUPLICATE_CATALOG_VERSION') {
          return res.status(400).json({
            error: 'DUPLICATE_CATALOG_VERSION',
            code: 'DUPLICATE_CATALOG_VERSION'
          });
        }
        throw err;
      }
    }

    // Supplier Governance Trust & Approval Control check
    const gov = await prisma.supplierGovernance.findUnique({
      where: { supplier_id: session.supplier_id }
    });
    const trustLevel = gov?.trust_level || 'STANDARD';

    if (trustLevel === 'BLOCKED') {
      await BusinessEventService.logEvent({
        event_type: 'SUPPLIER_BLOCKED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: userId,
        description: `Import blocked due to BLOCKED supplier status for supplier #${session.supplier_id}`
      });
      return res.status(403).json({
        error: 'SUPPLIER_BLOCKED',
        code: 'SUPPLIER_BLOCKED'
      });
    }

    if (trustLevel === 'RESTRICTED') {
      // Require Dual Approval
      const histories = await prisma.importApprovalHistory.findMany({
        where: { session_id: sessionId }
      });
      let managerApprovalFound = false;
      for (const h of histories) {
        if (h.performed_by !== userId) {
          const userRoles = await prisma.userRole.findMany({
            where: { user_id: h.performed_by },
            include: { role: true }
          });
          const hasManagerRole = userRoles.some(ur => ['manager', 'admin'].includes(ur.role.name.toLowerCase()));
          if (hasManagerRole) {
            managerApprovalFound = true;
            break;
          }
        }
      }

      if (!managerApprovalFound) {
        await BusinessEventService.logEvent({
          event_type: 'SUPPLIER_DUAL_APPROVAL_REQUIRED',
          entity_type: 'CatalogImportSession',
          entity_id: sessionId,
          user_id: userId,
          description: `Import blocked. Restricted supplier #${session.supplier_id} requires dual manager approval.`
        });
        return res.status(400).json({
          error: 'DUAL_APPROVAL_REQUIRED',
          code: 'DUAL_APPROVAL_REQUIRED'
        });
      }
    }

    // Bulk Operation Consistency Check
    if (approvedCount !== undefined && rejectedCount !== undefined && mergedCount !== undefined && pendingCount !== undefined) {
      const dbApproved = session.preview_items.filter(i => i.status === 'APPROVED').length;
      const dbRejected = session.preview_items.filter(i => i.status === 'REJECTED').length;
      const dbMerged = session.preview_items.filter(i => i.status === 'MERGED').length;
      const dbPending = session.preview_items.filter(i => i.status === 'REVIEW_PENDING').length;

      if (
        dbApproved !== Number(approvedCount) ||
        dbRejected !== Number(rejectedCount) ||
        dbMerged !== Number(mergedCount) ||
        dbPending !== Number(pendingCount)
      ) {
        await BusinessEventService.logEvent({
          event_type: 'CATALOG_SESSION_STATE_CHANGED',
          entity_type: 'CatalogImportSession',
          entity_id: sessionId,
          user_id: userId,
          description: `Import rejected. Item state counts changed.`
        });
        await BusinessEventService.logEvent({
          event_type: 'CATALOG_IMPORT_VALIDATION_FAILED',
          entity_type: 'CatalogImportSession',
          entity_id: sessionId,
          user_id: userId,
          description: `Import consistency validation failed.`
        });
        return res.status(400).json({ error: 'Session state changed', code: 'SESSION_STATE_CHANGED' });
      }
    }

    // Guard: Check pending items
    const pendingItems = session.preview_items.filter(item => item.status === 'REVIEW_PENDING');
    if (pendingItems.length > 0) {
      return res.status(400).json({
        error: `Session review incomplete: ${pendingItems.length} items remain REVIEW_PENDING.`,
        code: 'SESSION_REVIEW_INCOMPLETE'
      });
    }

    // Pricing Revalidation Guards
    const { normalMax, moderateMax } = await PricingGovernanceService.getThresholds();
    const priceChanges = await prisma.supplierPriceChange.findMany({
      where: { session_id: sessionId }
    });

    // 1. Check for unapproved HIGH_RISK changes using current thresholds
    const unapprovedHighRisk = priceChanges.filter(pc => {
      if (pc.approval_status !== 'APPROVED') {
        const risk = PricingGovernanceService.categorizeRisk(Number(pc.change_percentage), normalMax, moderateMax);
        return risk === 'HIGH_RISK';
      }
      return false;
    });

    if (unapprovedHighRisk.length > 0) {
      return res.status(400).json({
        error: 'High-risk price changes require approval before import',
        code: 'PRICE_APPROVAL_REQUIRED'
      });
    }

    // 2. Fingerprint Revalidation
    for (const pc of priceChanges) {
      if (pc.approval_status === 'APPROVED') {
        const expectedFingerprint = PricingGovernanceService.computeApprovalFingerprint(pc);
        if (pc.approval_fingerprint !== expectedFingerprint) {
          // Invalidation sequence
          await prisma.supplierPriceChange.update({
            where: { id: pc.id },
            data: {
              approval_status: 'PENDING',
              approved_by: null,
              approved_at: null,
              approval_fingerprint: null,
              approval_revision: pc.approval_revision + 1
            }
          });
          await BusinessEventService.logEvent({
            event_type: 'PRICE_APPROVAL_INVALIDATED',
            entity_type: 'SupplierPriceChange',
            entity_id: pc.id,
            user_id: userId,
            description: `Approved price change was modified after approval. Invalidated fingerprint.`
          });
          return res.status(400).json({
            error: 'Approved price change was modified after approval',
            code: 'PRICE_APPROVAL_INVALIDATED'
          });
        }
      }
    }

    // 3. Threshold Drift Revalidation
    for (const pc of priceChanges) {
      if (pc.approval_status === 'APPROVED') {
        const oldNormal = pc.approval_normal_threshold ? Number(pc.approval_normal_threshold) : 15;
        const oldModerate = pc.approval_moderate_threshold ? Number(pc.approval_moderate_threshold) : 30;

        if (oldNormal !== normalMax || oldModerate !== moderateMax) {
          const oldRisk = PricingGovernanceService.categorizeRisk(Number(pc.change_percentage), oldNormal, oldModerate);
          const newRisk = PricingGovernanceService.categorizeRisk(Number(pc.change_percentage), normalMax, moderateMax);

          const oldSev = PricingGovernanceService.getRiskSeverity(oldRisk);
          const newSev = PricingGovernanceService.getRiskSeverity(newRisk);

          if (newSev > oldSev) {
            // Invalidation sequence
            await prisma.supplierPriceChange.update({
              where: { id: pc.id },
              data: {
                approval_status: 'PENDING',
                approved_by: null,
                approved_at: null,
                approval_fingerprint: null,
                approval_revision: pc.approval_revision + 1
              }
            });
            await BusinessEventService.logEvent({
              event_type: 'PRICE_APPROVAL_REVALIDATION_REQUIRED',
              entity_type: 'SupplierPriceChange',
              entity_id: pc.id,
              user_id: userId,
              description: `Thresholds changed after approval. Revalidation required.`
            });
            return res.status(400).json({
              error: 'Price governance thresholds changed after approval',
              code: 'PRICE_APPROVAL_REVALIDATION_REQUIRED'
            });
          }
        }
      }
    }

    // 4. Approval Coverage & Batch Integrity Validation
    const latestHistory = await prisma.importApprovalHistory.findFirst({
      where: { session_id: sessionId, action: 'APPROVE_PRICE_CHANGES' },
      orderBy: { created_at: 'desc' }
    });

    let historyBatchId: string | null = null;
    let historyApprovedCount = 0;
    let historyHighRiskCount = 0;
    if (latestHistory && latestHistory.comments) {
      try {
        const parsed = JSON.parse(latestHistory.comments);
        historyBatchId = parsed.approvalBatchId || null;
        historyApprovedCount = parsed.approvedCount || 0;
        historyHighRiskCount = parsed.highRiskCount || 0;
      } catch (e) {
        // ignore
      }
    }

    const currentHighRiskCount = priceChanges.filter(pc => {
      const risk = PricingGovernanceService.categorizeRisk(Number(pc.change_percentage), normalMax, moderateMax);
      return risk === 'HIGH_RISK';
    }).length;

    const allHighRiskMatching = priceChanges.every(pc => {
      const risk = PricingGovernanceService.categorizeRisk(Number(pc.change_percentage), normalMax, moderateMax);
      if (risk === 'HIGH_RISK') {
        return pc.approval_status === 'APPROVED' && pc.approval_batch_id === historyBatchId;
      }
      return true;
    });

    if (currentHighRiskCount > 0 && (!historyBatchId || currentHighRiskCount !== historyHighRiskCount || !allHighRiskMatching)) {
      await BusinessEventService.logEvent({
        event_type: 'PRICE_APPROVAL_COVERAGE_INCOMPLETE',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: userId,
        description: `Price approval scope mismatch with session state.`
      });
      return res.status(400).json({
        error: 'Price approval scope no longer matches current session state',
        code: 'PRICE_APPROVAL_COVERAGE_INCOMPLETE'
      });
    }

    // Idempotency check
    if (session.status === 'IMPORTED') {
      return res.status(400).json({
        error: 'Import already processed.',
        code: 'IMPORT_ALREADY_PROCESSED'
      });
    }

    // Lock session by setting status to IMPORTING (with atomic OCC check)
    await prisma.catalogImportSession.update({
      where: {
        session_id: sessionId,
        version: Number(version),
        status: 'APPROVED'
      },
      data: {
        status: 'IMPORTING',
        version: { increment: 1 }
      }
    });

    await BusinessEventService.logEvent({
      event_type: 'CATALOG_SESSION_VERSION_INCREMENTED',
      entity_type: 'CatalogImportSession',
      entity_id: sessionId,
      user_id: userId,
      description: `Session version incremented (Locking session)`
    });

    // Execute import in transaction
    const importResult = await prisma.$transaction(async (tx) => {
      // Re-verify session state inside transaction (Locking check)
      const currentSession = await tx.catalogImportSession.findUnique({
        where: { session_id: sessionId },
        include: { preview_items: true }
      });

      if (!currentSession) {
        throw new Error('Catalog import session not found inside transaction.');
      }

      // Check if session status has changed concurrently
      if (currentSession.status !== 'IMPORTING') {
        await BusinessEventService.logEvent({
          event_type: 'CATALOG_IMPORT_LOCK_REJECTED',
          entity_type: 'CatalogImportSession',
          entity_id: sessionId,
          user_id: userId,
          description: `Import lock acquisition failed.`
        });
        throw new Error('IMPORT_ALREADY_IN_PROGRESS');
      }

      await BusinessEventService.logEvent({
        event_type: 'CATALOG_IMPORT_LOCK_ACQUIRED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: userId,
        description: `Import lock acquired successfully.`
      });

      const created_parts: string[] = [];
      const updated_parts: number[] = [];
      const old_values: Record<number, any> = {};
      const new_values: Record<number, any> = {};

      for (const item of currentSession.preview_items) {
        if (item.status === 'APPROVED') {
          if (!item.is_duplicate || item.decision === 'KEEP_NEW') {
            const newPart = await tx.parts.create({
              data: {
                part_number: item.part_number || `PN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                name: item.name,
                description: item.description || '',
                cost_price: item.cost_price,
                selling_price: item.selling_price,
                tax_rate: item.tax_rate,
                is_active: true
              }
            });
            created_parts.push(newPart.part_number);
          }
        } else if (item.status === 'MERGED') {
          if (!item.matched_part_id) {
            throw new Error(`Item ${item.id} is marked MERGED but lacks a matched_part_id.`);
          }

          const existingPart = await tx.parts.findUnique({
            where: { part_id: item.matched_part_id }
          });

          if (!existingPart) {
            throw new Error(`Part ${item.matched_part_id} to merge with was not found.`);
          }

          // Record old values for rollback
          old_values[existingPart.part_id] = {
            name: existingPart.name,
            description: existingPart.description,
            cost_price: existingPart.cost_price ? Number(existingPart.cost_price) : null,
            selling_price: Number(existingPart.selling_price),
            tax_rate: Number(existingPart.tax_rate)
          };

          // Update part
          const updatedPart = await tx.parts.update({
            where: { part_id: existingPart.part_id },
            data: {
              name: item.name,
              description: item.description || undefined,
              cost_price: item.cost_price,
              selling_price: item.selling_price,
              tax_rate: item.tax_rate
            }
          });

          updated_parts.push(existingPart.part_id);
          new_values[existingPart.part_id] = {
            name: updatedPart.name,
            description: updatedPart.description,
            cost_price: updatedPart.cost_price ? Number(updatedPart.cost_price) : null,
            selling_price: Number(updatedPart.selling_price),
            tax_rate: Number(updatedPart.tax_rate)
          };
        }
      }

      // Rollback payload boundary
      const import_timestamp = new Date();
      const rollbackPayload = {
        session_id: sessionId,
        created_parts,
        updated_parts,
        old_values,
        new_values,
        import_timestamp,
        imported_by: userId
      };

      // Compute canonical checksum
      const checksum = generateCanonicalChecksum(rollbackPayload);

      // Create snapshot
      await tx.catalogImportRollback.create({
        data: {
          session_id: sessionId,
          created_parts,
          updated_parts,
          old_values,
          new_values,
          imported_by: userId,
          import_timestamp,
          checksum,
          checksum_version: 1
        }
      });

      // Record Import in ImportApprovalHistory
      const txPriceChanges = await tx.supplierPriceChange.findMany({
        where: { session_id: sessionId }
      });
      const approvedPriceChanges = txPriceChanges.filter(pc => pc.approval_status === 'APPROVED');
      const approvedHighRiskCount = approvedPriceChanges.filter(pc => {
        const risk = PricingGovernanceService.categorizeRisk(Number(pc.change_percentage), normalMax, moderateMax);
        return risk === 'HIGH_RISK';
      }).length;

      await tx.importApprovalHistory.create({
        data: {
          session_id: sessionId,
          action: 'IMPORT',
          performed_by: userId,
          comments: JSON.stringify({
            approvedCount: approvedPriceChanges.length,
            highRiskCount: approvedHighRiskCount,
            sessionVersion: Number(version),
            approvalMode: 'IMPORT',
            timestamp: new Date().toISOString()
          }),
          approved_price_changes_count: approvedPriceChanges.length,
          high_risk_price_changes_count: approvedHighRiskCount,
          approval_timestamp: new Date()
        }
      });

      // Update session status to IMPORTED and increment version
      await tx.catalogImportSession.update({
        where: { session_id: sessionId },
        data: { status: 'IMPORTED', version: { increment: 1 } }
      });

      // Log BusinessEvent
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_IMPORT_COMPLETED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: userId,
        description: `Import completed for session #${sessionId}. Created: ${created_parts.length}, Updated: ${updated_parts.length}`
      });

      await BusinessEventService.logEvent({
        event_type: 'CATALOG_SESSION_VERSION_INCREMENTED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: userId,
        description: `Session version incremented (Import success)`
      });

      return {
        importedCount: created_parts.length + updated_parts.length
      };
    });

    // Post-Commit Actions (Rule 1 & Rule 2)
    if (session.file_hash) {
      try {
        await CatalogVersionService.registerCatalogVersion(
          session.supplier_id,
          sessionId,
          session.file_hash,
          new Date(),
          userId
        );
      } catch (verErr) {
        console.error('[Import] Failed to register catalog version:', verErr);
      }
    }

    try {
      await SupplierGovernanceService.evaluateSupplier(session.supplier_id);
    } catch (govErr) {
      console.error('[Import] Failed to evaluate supplier governance:', govErr);
    }

    return res.json({ success: true, status: 'IMPORTED', importedCount: importResult.importedCount });

  } catch (err: any) {
    if (err.code === 'P2025') {
      const currentSession = await prisma.catalogImportSession.findUnique({ where: { session_id: sessionId } });
      if (currentSession && (currentSession.status === 'IMPORTING' || currentSession.status === 'IMPORTED')) {
        return res.status(400).json({
          error: 'Import already processed or currently importing.',
          code: 'IMPORT_ALREADY_PROCESSED'
        });
      }
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_STALE_REQUEST_REJECTED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: userId,
        description: `Stale import request rejected.`
      });
      return res.status(409).json({ error: 'Session version conflict', code: 'SESSION_CONFLICT' });
    }

    console.error('[Catalog Review] Transactional import failure:', err);

    // Rollback session status to APPROVED on failure
    try {
      await prisma.catalogImportSession.update({
        where: { session_id: sessionId },
        data: { status: 'APPROVED' }
      });
    } catch (resetErr) {
      console.error('Failed to reset session status to APPROVED after failed import:', resetErr);
    }

    if (err.message === 'IMPORT_ALREADY_IN_PROGRESS') {
      return res.status(409).json({
        error: 'Import already in progress by another request.',
        code: 'IMPORT_ALREADY_IN_PROGRESS'
      });
    }

    return res.status(500).json({
      error: 'Import failed: ' + err.message,
      code: 'IMPORT_FAILED'
    });
  }
});

// 8. Validate Rollback
catalogReviewRouter.post('/session/:id/validate-rollback', requirePermission('purchase:create'), async (req: AuthRequest, res: Response) => {
  const sessionId = Number(req.params.id);
  const { version } = req.body;

  try {
    if (version === undefined) {
      return res.status(400).json({ error: 'version is required.' });
    }

    const session = await prisma.catalogImportSession.findUnique({
      where: { session_id: sessionId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Catalog import session not found.' });
    }

    // Stale version validation
    if (session.version !== Number(version)) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_STALE_REQUEST_REJECTED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Validate rollback rejected due to stale version.`
      });
      return res.status(409).json({ error: 'Session version conflict', code: 'SESSION_CONFLICT' });
    }

    const rollbackRecord = await prisma.catalogImportRollback.findUnique({
      where: { session_id: sessionId }
    });

    // Rollback Consistency validation guards
    if (!rollbackRecord) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ROLLBACK_VALIDATION_FAILED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Rollback validation failed. Snapshot does not exist.`
      });
      return res.status(400).json({ error: 'Rollback validation failed', code: 'ROLLBACK_VALIDATION_FAILED' });
    }

    if (rollbackRecord.checksum_version !== 1) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ROLLBACK_VALIDATION_FAILED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Rollback validation failed. Unsupported checksum version.`
      });
      return res.status(400).json({ error: 'Rollback validation failed', code: 'ROLLBACK_VALIDATION_FAILED' });
    }

    if (session.status !== 'IMPORTED') {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ROLLBACK_VALIDATION_FAILED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Rollback validation failed. Session status is not IMPORTED.`
      });
      return res.status(400).json({ error: 'Rollback validation failed', code: 'ROLLBACK_VALIDATION_FAILED' });
    }

    if (rollbackRecord.session_id !== sessionId || !rollbackRecord.import_timestamp) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ROLLBACK_VALIDATION_FAILED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Rollback validation failed. Session linkage/timestamp invalid.`
      });
      return res.status(400).json({ error: 'Rollback validation failed', code: 'ROLLBACK_VALIDATION_FAILED' });
    }

    // Verify canonical checksum
    const isValid = verifyCanonicalChecksum(
      rollbackRecord,
      rollbackRecord.checksum,
      rollbackRecord.checksum_version
    );

    if (!isValid) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ROLLBACK_VALIDATION_FAILED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Rollback validation failed. Checksum mismatch.`
      });
      return res.status(400).json({ error: 'Rollback validation failed', code: 'ROLLBACK_VALIDATION_FAILED' });
    }

    // Verify SupplierPriceChange records exist and APPROVED ones have fingerprint
    const priceChanges = await prisma.supplierPriceChange.findMany({
      where: { session_id: sessionId }
    });
    const approvedPC = priceChanges.filter(pc => pc.approval_status === 'APPROVED');
    const allApprovedHaveFingerprint = approvedPC.every(pc => pc.approval_fingerprint !== null && pc.approval_fingerprint !== '');
    if (approvedPC.length > 0 && !allApprovedHaveFingerprint) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ROLLBACK_VALIDATION_FAILED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Rollback validation failed. Approved price changes lack fingerprints.`
      });
      return res.status(400).json({ error: 'Rollback validation failed.', code: 'ROLLBACK_VALIDATION_FAILED' });
    }

    // Successful validation log
    await BusinessEventService.logEvent({
      event_type: 'CATALOG_ROLLBACK_VALIDATED',
      entity_type: 'CatalogImportSession',
      entity_id: sessionId,
      user_id: req.userId || null,
      description: `Rollback validation succeeded.`
    });

    const createdParts = rollbackRecord.created_parts as string[];
    const updatedParts = rollbackRecord.updated_parts as number[];

    return res.json({
      canRollback: true,
      createdParts: createdParts.length,
      updatedParts: updatedParts.length,
      warnings: []
    });

  } catch (err: any) {
    console.error('[Catalog Review] Validate rollback error:', err);
    if (err.message === 'UNSUPPORTED_CHECKSUM_VERSION') {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ROLLBACK_VALIDATION_FAILED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Rollback validation failed. Unsupported checksum version thrown.`
      });
      return res.status(400).json({ error: 'Rollback validation failed: unsupported checksum version', code: 'ROLLBACK_VALIDATION_FAILED' });
    }
    return res.status(500).json({ error: 'Rollback validation failed: ' + err.message });
  }
});

// 9. Rollback Session
catalogReviewRouter.post('/session/:id/rollback', requirePermission('purchase:create'), async (req: AuthRequest, res: Response) => {
  const sessionId = Number(req.params.id);
  const { version } = req.body;

  try {
    if (version === undefined) {
      return res.status(400).json({ error: 'version is required.' });
    }

    const session = await prisma.catalogImportSession.findUnique({
      where: { session_id: sessionId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Catalog import session not found.' });
    }

    // Rollback locks
    if (session.status === 'ROLLBACK_COMPLETED') {
      return res.status(400).json({
        error: 'Rollback already executed for this session.',
        code: 'ROLLBACK_ALREADY_EXECUTED'
      });
    }

    if (session.status !== 'IMPORTED') {
      return res.status(400).json({
        error: `Rollback only allowed for sessions in IMPORTED status. Current status: ${session.status}`,
        code: 'INVALID_SESSION_STATUS'
      });
    }

    const rollbackRecord = await prisma.catalogImportRollback.findUnique({
      where: { session_id: sessionId }
    });

    // Rollback Consistency validation guards
    if (!rollbackRecord) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ROLLBACK_VALIDATION_FAILED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Rollback failed. Snapshot does not exist.`
      });
      return res.status(400).json({ error: 'Rollback validation failed', code: 'ROLLBACK_VALIDATION_FAILED' });
    }

    if (rollbackRecord.checksum_version !== 1) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ROLLBACK_VALIDATION_FAILED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Rollback failed. Unsupported checksum version.`
      });
      return res.status(400).json({ error: 'Rollback validation failed', code: 'ROLLBACK_VALIDATION_FAILED' });
    }

    if (rollbackRecord.session_id !== sessionId || !rollbackRecord.import_timestamp) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ROLLBACK_VALIDATION_FAILED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Rollback failed. Invalid session linkage.`
      });
      return res.status(400).json({ error: 'Rollback validation failed', code: 'ROLLBACK_VALIDATION_FAILED' });
    }

    // Verify canonical checksum
    const isValid = verifyCanonicalChecksum(
      rollbackRecord,
      rollbackRecord.checksum,
      rollbackRecord.checksum_version
    );

    if (!isValid) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ROLLBACK_VALIDATION_FAILED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Rollback failed. Checksum mismatch.`
      });
      return res.status(400).json({ error: 'Rollback validation failed', code: 'ROLLBACK_VALIDATION_FAILED' });
    }

    // Verify SupplierPriceChange records exist and APPROVED ones have fingerprint
    const priceChanges = await prisma.supplierPriceChange.findMany({
      where: { session_id: sessionId }
    });
    const approvedPC = priceChanges.filter(pc => pc.approval_status === 'APPROVED');
    const allApprovedHaveFingerprint = approvedPC.every(pc => pc.approval_fingerprint !== null && pc.approval_fingerprint !== '');
    if (approvedPC.length > 0 && !allApprovedHaveFingerprint) {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ROLLBACK_VALIDATION_FAILED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Rollback failed. Approved price changes lack fingerprints.`
      });
      return res.status(400).json({ error: 'Rollback validation failed.', code: 'ROLLBACK_VALIDATION_FAILED' });
    }

    // Execute rollback in transaction with atomic OCC lock check on session version
    await prisma.$transaction(async (tx) => {
      // Update session status and version atomically
      await tx.catalogImportSession.update({
        where: {
          session_id: sessionId,
          version: Number(version)
        },
        data: {
          status: 'ROLLBACK_COMPLETED',
          version: { increment: 1 }
        }
      });

      // 1. Delete created parts
      const createdParts = rollbackRecord.created_parts as string[];
      if (createdParts && createdParts.length > 0) {
        await tx.parts.deleteMany({
          where: { part_number: { in: createdParts } }
        });
      }

      // 2. Restore updated parts to old values
      const oldValuesMap = rollbackRecord.old_values as Record<string, any>;
      for (const [partIdStr, oldVal] of Object.entries(oldValuesMap)) {
        const partId = Number(partIdStr);
        await tx.parts.update({
          where: { part_id: partId },
          data: {
            name: oldVal.name,
            description: oldVal.description,
            cost_price: oldVal.cost_price,
            selling_price: oldVal.selling_price,
            tax_rate: oldVal.tax_rate
          }
        });
      }
    });

    // Log BusinessEvent
    await BusinessEventService.logEvent({
      event_type: 'CATALOG_IMPORT_ROLLBACKED',
      entity_type: 'CatalogImportSession',
      entity_id: sessionId,
      user_id: req.userId || null,
      description: `Import rollback completed for session #${sessionId}`
    });

    await BusinessEventService.logEvent({
      event_type: 'CATALOG_SESSION_VERSION_INCREMENTED',
      entity_type: 'CatalogImportSession',
      entity_id: sessionId,
      user_id: req.userId || null,
      description: `Session version incremented`
    });

    try {
      await SupplierGovernanceService.evaluateSupplier(session.supplier_id);
    } catch (govErr) {
      console.error('[Rollback] Failed to evaluate supplier governance:', govErr);
    }

    return res.json({ success: true, status: 'ROLLBACK_COMPLETED' });

  } catch (err: any) {
    if (err.code === 'P2025') {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_STALE_REQUEST_REJECTED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Stale rollback request rejected.`
      });
      return res.status(409).json({ error: 'Session version conflict', code: 'SESSION_CONFLICT' });
    }

    console.error('[Catalog Review] Rollback error:', err);
    if (err.message === 'UNSUPPORTED_CHECKSUM_VERSION') {
      await BusinessEventService.logEvent({
        event_type: 'CATALOG_ROLLBACK_VALIDATION_FAILED',
        entity_type: 'CatalogImportSession',
        entity_id: sessionId,
        user_id: req.userId || null,
        description: `Rollback failed. Unsupported checksum version thrown.`
      });
      return res.status(400).json({ error: 'Rollback execution failed: unsupported checksum version', code: 'ROLLBACK_VALIDATION_FAILED' });
    }
    return res.status(500).json({ error: 'Rollback execution failed: ' + err.message });
  }
});
