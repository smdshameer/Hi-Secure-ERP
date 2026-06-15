import { prisma } from '../../index';

export class RepairReportService {
  static async getTechnicianPerformance() {
    const technicians = await prisma.technician.findMany({
      where: { is_active: true },
      include: {
        repairs: {
          select: {
            repair_id: true,
            repair_status: true,
            received_date: true,
            completion_date: true,
            actual_cost: true
          }
        }
      }
    });

    const rows = technicians.map(tech => {
      const totalRepairs = tech.repairs.length;
      const completedRepairs = tech.repairs.filter(r => r.repair_status === 'completed');
      const totalRevenue = completedRepairs.reduce((sum, r) => sum + Number(r.actual_cost || 0), 0);

      // Calculate average completion time in hours
      let totalHours = 0;
      let completedWithTime = 0;

      completedRepairs.forEach(r => {
        if (r.completion_date) {
          const diffMs = new Date(r.completion_date).getTime() - new Date(r.received_date).getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          if (diffHours >= 0) {
            totalHours += diffHours;
            completedWithTime += 1;
          }
        }
      });

      const avgCompletionHours = completedWithTime > 0 ? (totalHours / completedWithTime) : null;
      const completionRate = totalRepairs > 0 ? (completedRepairs.length / totalRepairs) * 100 : 0;

      return {
        technician_id: tech.technician_id,
        name: tech.name,
        phone: tech.phone || '—',
        specialization: tech.specialization || '—',
        total_repairs_assigned: totalRepairs,
        total_repairs_completed: completedRepairs.length,
        total_revenue_generated: totalRevenue,
        avg_completion_time_hours: avgCompletionHours ? Math.round(avgCompletionHours * 10) / 10 : null,
        completion_rate: Math.round(completionRate * 10) / 10
      };
    });

    // Sort technicians by revenue generated
    rows.sort((a, b) => b.total_revenue_generated - a.total_revenue_generated);

    return rows;
  }
}