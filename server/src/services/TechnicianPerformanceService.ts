import { prisma } from '../index';

export class TechnicianPerformanceService {

  async getTechnicianPerformanceReport() {
    const technicians = await prisma.technician.findMany({
      where: { is_active: true, is_deleted: false }
    });

    const report = [];

    for (const tech of technicians) {
      // 1. Jobs Assigned
      const assignments = await prisma.technicianAssignment.findMany({
        where: { technician_id: tech.technician_id }
      });
      const assignedCount = assignments.length;

      // 2. Jobs Completed (Status = COMPLETED)
      const completedCount = assignments.filter(a => a.status === 'COMPLETED').length;

      // 3. Resolutions
      const resolutions = await prisma.serviceResolution.findMany({
        where: { resolved_by: tech.technician_id },
        include: { job: true }
      });

      // 4. Average Resolution Time (in Hours)
      let totalResolutionHours = 0;
      let ratedJobsCount = 0;
      let totalRating = 0;
      let firstVisitResolvedCount = 0;

      for (const res of resolutions) {
        // Calculate resolution time
        const durationMs = res.resolved_at.getTime() - res.job.created_at.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        totalResolutionHours += durationHours;

        // Ratings
        if (res.customer_rating !== null && res.customer_rating !== undefined) {
          totalRating += res.customer_rating;
          ratedJobsCount++;
        }

        // First Visit Resolution
        if (res.first_visit_resolved) {
          firstVisitResolvedCount++;
        }
      }

      const avgResolutionTime = resolutions.length > 0 ? Number((totalResolutionHours / resolutions.length).toFixed(2)) : 0;
      const firstVisitResolutionRate = resolutions.length > 0 ? Number(((firstVisitResolvedCount / resolutions.length) * 100).toFixed(2)) : 0;
      const avgCustomerRating = ratedJobsCount > 0 ? Number((totalRating / ratedJobsCount).toFixed(2)) : 0;

      // 5. AMC Visits Performance
      const amcVisits = await prisma.serviceVisit.findMany({
        where: {
          technician_id: tech.technician_id,
          job: { job_type: 'AMC' }
        }
      });
      const totalAmcVisits = amcVisits.length;
      const executedAmcVisits = amcVisits.filter(v => v.status === 'EXECUTED').length;
      const amcCompletionRate = totalAmcVisits > 0 ? Number(((executedAmcVisits / totalAmcVisits) * 100).toFixed(2)) : 0;

      report.push({
        technician_id: tech.technician_id,
        name: tech.name,
        specialization: tech.specialization,
        jobs_assigned: assignedCount,
        jobs_completed: completedCount,
        average_resolution_time_hours: avgResolutionTime,
        first_visit_resolution_rate: firstVisitResolutionRate,
        average_customer_rating: avgCustomerRating,
        amc_completion_rate: amcCompletionRate
      });
    }

    return report;
  }
}
