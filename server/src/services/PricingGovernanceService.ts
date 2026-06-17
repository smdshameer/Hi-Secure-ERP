import { prisma } from '../index';
import crypto from 'crypto';
import { generatePayloadHash } from '../utils/canonicalChecksum';

export class PricingGovernanceService {
  static async getThresholds() {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: 'catalog_import_settings' }
      });
      const value = (setting?.value as any) || {};
      const normalMax = value.PRICE_RISK_NORMAL_MAX_PERCENT !== undefined
        ? Number(value.PRICE_RISK_NORMAL_MAX_PERCENT)
        : 15;
      const moderateMax = value.PRICE_RISK_MODERATE_MAX_PERCENT !== undefined
        ? Number(value.PRICE_RISK_MODERATE_MAX_PERCENT)
        : 30;
      return { normalMax, moderateMax };
    } catch (err) {
      return { normalMax: 15, moderateMax: 30 };
    }
  }

  static calculateVariance(oldVal: number | null | undefined, newVal: number | null | undefined): number {
    if (!oldVal || Number(oldVal) === 0) return 0;
    if (!newVal) return 0;
    const oldNum = Number(oldVal);
    const newNum = Number(newVal);
    return ((newNum - oldNum) / oldNum) * 100;
  }

  static categorizeRisk(variancePercent: number, normalMax: number, moderateMax: number): 'NORMAL' | 'MODERATE' | 'HIGH_RISK' {
    const absVal = Math.abs(variancePercent);
    if (absVal <= normalMax) return 'NORMAL';
    if (absVal <= moderateMax) return 'MODERATE';
    return 'HIGH_RISK';
  }

  static getRiskSeverity(risk: string): number {
    if (risk === 'NORMAL') return 0;
    if (risk === 'MODERATE') return 1;
    if (risk === 'HIGH_RISK') return 2;
    return 0;
  }

  static generateApprovalBatchId(): string {
    return crypto.randomUUID();
  }

  static async computeApprovalCoverageSummary(sessionId: number) {
    const priceChanges = await prisma.supplierPriceChange.findMany({
      where: { session_id: sessionId }
    });

    const { normalMax, moderateMax } = await this.getThresholds();
    let totalHighRisk = 0;
    let approvedHighRisk = 0;
    let latestApprovalBatchId: string | null = null;
    let latestApprovedAt: Date | null = null;

    for (const pc of priceChanges) {
      const variance = Number(pc.change_percentage);
      const risk = this.categorizeRisk(variance, normalMax, moderateMax);
      if (risk === 'HIGH_RISK') {
        totalHighRisk++;
        if (pc.approval_status === 'APPROVED') {
          approvedHighRisk++;
          if (pc.approved_at && (!latestApprovedAt || pc.approved_at > latestApprovedAt)) {
            latestApprovedAt = pc.approved_at;
            latestApprovalBatchId = pc.approval_batch_id;
          }
        }
      }
    }

    return {
      totalHighRisk,
      approvedHighRisk,
      latestApprovalBatchId
    };
  }

  static computeApprovalFingerprint(priceChange: any): string {
    const payload = {
      part_id: Number(priceChange.part_id),
      old_cost_price: Number(priceChange.old_cost_price),
      new_cost_price: Number(priceChange.new_cost_price),
      old_selling_price: Number(priceChange.old_selling_price),
      new_selling_price: Number(priceChange.new_selling_price),
      change_percentage: Number(priceChange.change_percentage),
      approval_status: priceChange.approval_status,
      approval_revision: Number(priceChange.approval_revision)
    };
    return generatePayloadHash(payload);
  }

  static async evaluatePriceChange(
    sessionId: number,
    itemId: number,
    partId: number,
    oldCost: number,
    newCost: number,
    oldSelling: number,
    newSelling: number
  ) {
    const costVariance = this.calculateVariance(oldCost, newCost);
    const sellingVariance = this.calculateVariance(oldSelling, newSelling);
    
    const maxVariance = Math.max(Math.abs(costVariance), Math.abs(sellingVariance));
    const signedVariance = Math.abs(costVariance) >= Math.abs(sellingVariance) ? costVariance : sellingVariance;

    const { normalMax, moderateMax } = await this.getThresholds();
    const risk = this.categorizeRisk(signedVariance, normalMax, moderateMax);

    const existing = await prisma.supplierPriceChange.findFirst({
      where: { session_id: sessionId, preview_item_id: itemId }
    });

    let priceChange;
    if (existing) {
      priceChange = await prisma.supplierPriceChange.update({
        where: { id: existing.id },
        data: {
          part_id: partId,
          old_cost_price: oldCost,
          new_cost_price: newCost,
          old_selling_price: oldSelling,
          new_selling_price: newSelling,
          change_percentage: signedVariance,
          approval_status: 'PENDING',
          approved_by: null,
          approved_at: null,
          approval_fingerprint: null
        }
      });
    } else {
      priceChange = await prisma.supplierPriceChange.create({
        data: {
          session_id: sessionId,
          preview_item_id: itemId,
          part_id: partId,
          old_cost_price: oldCost,
          new_cost_price: newCost,
          old_selling_price: oldSelling,
          new_selling_price: newSelling,
          change_percentage: signedVariance,
          approval_status: 'PENDING',
          approval_revision: 0
        }
      });
    }

    if (risk === 'HIGH_RISK') {
      await prisma.businessEvent.create({
        data: {
          event_type: 'HIGH_RISK_PRICE_CHANGE_DETECTED',
          entity_type: 'SupplierPriceChange',
          entity_id: priceChange.id,
          description: `High risk price change detected for item ID ${itemId} (Change: ${signedVariance.toFixed(2)}%)`
        }
      });
    }

    return priceChange;
  }
}
