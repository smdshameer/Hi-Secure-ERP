import { prisma } from '../index';
import { BusinessEventService } from './BusinessEventService';

export type GovernanceStats = {
  total_catalogs: number;
  successful_imports: number;
  failed_imports: number;
  rollback_count: number;
  rejected_items_count: number;
  duplicate_items_count: number;
  high_risk_changes_count: number;
};

export class SupplierGovernanceService {
  static calculateGovernanceScore(stats: GovernanceStats): number {
    const {
      total_catalogs,
      failed_imports,
      rollback_count,
      rejected_items_count,
      duplicate_items_count,
      high_risk_changes_count
    } = stats;

    if (total_catalogs === 0) {
      return 80; // STANDARD default
    }

    let score = 100;

    // 1. Failed Imports deduction (max 30 pts)
    const failedDeduction = (failed_imports / total_catalogs) * 30;
    score -= failedDeduction;

    // 2. Rollback Rate deduction (max 40 pts)
    const rollbackDeduction = (rollback_count / total_catalogs) * 40;
    score -= rollbackDeduction;

    // 3. Rejected Item Rate deduction (max 15 pts)
    const rejectedDeduction = Math.min(15, (rejected_items_count / total_catalogs) * 2);
    score -= rejectedDeduction;

    // 4. Duplicate Rate deduction (max 10 pts)
    const duplicateDeduction = Math.min(10, (duplicate_items_count / total_catalogs) * 1);
    score -= duplicateDeduction;

    // 5. High Risk Price Change Rate deduction (max 15 pts)
    const highRiskDeduction = Math.min(15, (high_risk_changes_count / total_catalogs) * 3);
    score -= highRiskDeduction;

    // Clamp score between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  static getTrustLevelForScore(score: number): string {
    if (score >= 90) return 'TRUSTED';
    if (score >= 70) return 'STANDARD';
    if (score >= 40) return 'RESTRICTED';
    return 'BLOCKED';
  }

  static getTrustLevelPriority(level: string): number {
    switch (level) {
      case 'TRUSTED': return 3;
      case 'STANDARD': return 2;
      case 'RESTRICTED': return 1;
      case 'BLOCKED': return 0;
      default: return 2;
    }
  }

  static async evaluateSupplier(supplierId: number): Promise<void> {
    try {
      const supplier = await prisma.supplier.findUnique({
        where: { supplier_id: supplierId },
        include: { governance: true }
      });

      if (!supplier) {
        console.error(`[Supplier Governance] Supplier #${supplierId} not found.`);
        return;
      }

      // Query sessions and approval history
      const sessions = await prisma.catalogImportSession.findMany({
        where: { supplier_id: supplierId },
        include: {
          approval_history: {
            where: { action: 'IMPORT' }
          }
        }
      });

      const total_catalogs = sessions.filter(s => ['IMPORTED', 'FAILED', 'ROLLBACK_COMPLETED'].includes(s.status)).length;
      const successful_imports = sessions.filter(s => ['IMPORTED', 'ROLLBACK_COMPLETED'].includes(s.status)).length;
      const failed_imports = sessions.filter(s => s.status === 'FAILED').length;
      const rollback_count = sessions.filter(s => s.status === 'ROLLBACK_COMPLETED').length;
      const rejected_items_count = sessions.reduce((sum, s) => sum + (s.rejected_products || 0), 0);
      const duplicate_items_count = sessions.reduce((sum, s) => sum + (s.duplicate_products || 0), 0);
      const high_risk_changes_count = sessions.reduce((sum, s) => {
        const importHist = s.approval_history.find(h => h.action === 'IMPORT');
        return sum + (importHist ? importHist.high_risk_price_changes_count : 0);
      }, 0);

      const stats: GovernanceStats = {
        total_catalogs,
        successful_imports,
        failed_imports,
        rollback_count,
        rejected_items_count,
        duplicate_items_count,
        high_risk_changes_count
      };

      const score = this.calculateGovernanceScore(stats);
      const newTrustLevel = this.getTrustLevelForScore(score);

      const oldTrustLevel = supplier.governance?.trust_level || 'STANDARD';

      // Update or create governance record
      await prisma.supplierGovernance.upsert({
        where: { supplier_id: supplierId },
        create: {
          supplier_id: supplierId,
          trust_level: newTrustLevel,
          governance_score: score,
          total_catalogs,
          successful_imports,
          failed_imports,
          rollback_count,
          rejected_items_count,
          duplicate_items_count,
          high_risk_changes_count
        },
        update: {
          trust_level: newTrustLevel,
          governance_score: score,
          total_catalogs,
          successful_imports,
          failed_imports,
          rollback_count,
          rejected_items_count,
          duplicate_items_count,
          high_risk_changes_count
        }
      });

      // Handle transitions and log events
      if (newTrustLevel !== oldTrustLevel) {
        const oldPriority = this.getTrustLevelPriority(oldTrustLevel);
        const newPriority = this.getTrustLevelPriority(newTrustLevel);

        if (newPriority > oldPriority) {
          await BusinessEventService.logEvent({
            event_type: 'SUPPLIER_TRUST_UPGRADED',
            entity_type: 'Supplier',
            entity_id: supplierId,
            user_id: 1,
            description: `Supplier trust level upgraded from ${oldTrustLevel} to ${newTrustLevel}. Score: ${score}`
          });
        } else {
          await BusinessEventService.logEvent({
            event_type: 'SUPPLIER_TRUST_DOWNGRADED',
            entity_type: 'Supplier',
            entity_id: supplierId,
            user_id: 1,
            description: `Supplier trust level downgraded from ${oldTrustLevel} to ${newTrustLevel}. Score: ${score}`
          });
        }
      }

      // If restricted or blocked, log review required event
      if (newTrustLevel === 'RESTRICTED' || newTrustLevel === 'BLOCKED') {
        await BusinessEventService.logEvent({
          event_type: 'SUPPLIER_REVIEW_REQUIRED',
          entity_type: 'Supplier',
          entity_id: supplierId,
          user_id: 1,
          description: `Supplier governance score in warning zone. Level: ${newTrustLevel}, Score: ${score}`
        });
      }
    } catch (err) {
      console.error(`[Supplier Governance] Error in evaluateSupplier for supplier #${supplierId}:`, err);
    }
  }
}
