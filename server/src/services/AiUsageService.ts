import { prisma } from '../index';

export class AiUsageService {
  /**
   * Enforces role-based rate limits for AI usage
   */
  static async checkLimits(userId: number): Promise<{ allowed: boolean; reason?: string }> {
    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    const role = user.role.toLowerCase();
    if (role === 'admin') {
      return { allowed: true };
    }

    // Define limits
    let dailyLimit = 100;
    let monthlyLimit = 3000;

    if (role === 'manager') {
      dailyLimit = 300;
      monthlyLimit = 10000;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Count daily requests
    const dailyCount = await prisma.aiUsageLog.aggregate({
      _sum: { request_count: true },
      where: {
        user_id: userId,
        created_at: { gte: startOfDay }
      }
    });

    const currentDaily = dailyCount._sum.request_count || 0;
    if (currentDaily >= dailyLimit) {
      return {
        allowed: false,
        reason: `Daily request limit of ${dailyLimit} reached. (Current: ${currentDaily})`
      };
    }

    // Count monthly requests
    const monthlyCount = await prisma.aiUsageLog.aggregate({
      _sum: { request_count: true },
      where: {
        user_id: userId,
        created_at: { gte: startOfMonth }
      }
    });

    const currentMonthly = monthlyCount._sum.request_count || 0;
    if (currentMonthly >= monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly request limit of ${monthlyLimit} reached. (Current: ${currentMonthly})`
      };
    }

    return { allowed: true };
  }

  /**
   * Logs AI token usage and calculates estimated cost dynamically from Settings.
   */
  static async logUsage(userId: number, tokensUsed: number): Promise<void> {
    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!user) return;

    // Get role ID based on user
    const userRoleRecord = await prisma.userRole.findFirst({
      where: { user_id: userId }
    });
    const roleId = userRoleRecord ? userRoleRecord.role_id : 1;

    // Load AI pricing configurations dynamically
    const aiSetting = await prisma.setting.findUnique({ where: { key: 'ai' } });
    const config = (aiSetting?.value as any) || {};

    // Retrieve pricing coefficient dynamically (never hardcoded)
    const pricePerToken = Number(config.price_per_token || 0.000002);
    const estimatedCost = tokensUsed * pricePerToken;

    await prisma.aiUsageLog.create({
      data: {
        user_id: userId,
        role_id: roleId,
        request_count: 1,
        tokens_used: tokensUsed,
        estimated_cost: estimatedCost,
        created_at: new Date()
      }
    });

    console.log(`[AiUsageService] Logged AI usage for user ${userId}: ${tokensUsed} tokens, estimated cost: $${estimatedCost.toFixed(6)}`);
  }
}
