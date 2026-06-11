const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');

module.exports = function(app) {
  app.get('/reports', requireAuth, requireFeature('reports'), async (req, res) => {
    try {
      const [monthlyRevenue, topTechs, topParts, stats, salesRevenue, topCustomers, lowStock] = await Promise.all([
        models.reports.getMonthlyRevenue(),
        models.reports.getTopTechnicians(),
        models.reports.getTopParts(),
        models.reports.getStats(),
        models.reports.getSalesRevenue(),
        models.reports.getTopCustomers(),
        models.reports.getLowStockParts()
      ]);
      res.render('reports', { monthlyRevenue, topTechs, topParts, stats, salesRevenue, topCustomers, lowStock, user: req.session.user || null });
    } catch (err) {
      console.error(err);
      res.status(500).send('Database error');
    }
  });

  app.get('/reports/export', requireAuth, requireFeature('reports'), async (req, res) => {
    try {
      const XLSX = require('xlsx');
      const wb = XLSX.utils.book_new();

      const currencyFmt = '#,##0.00';

      const monthlyRevenue = await models.reports.getMonthlyRevenue();
      if (monthlyRevenue.length) {
        const data = monthlyRevenue.map(r => ({ Month: r.month, 'Repairs Completed': r.repairs_completed, Revenue: r.revenue }));
        const ws = XLSX.utils.json_to_sheet(data);
        if (ws['!ref']) {
          const range = XLSX.utils.decode_range(ws['!ref']);
          for (let row = range.s.r + 1; row <= range.e.r; row++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: XLSX.utils.decode_range(ws['!ref']).e.c });
            const cell = ws[cellRef];
            if (cell && cell.v !== undefined && typeof cell.v === 'number') {
              cell.z = currencyFmt;
            }
          }
        }
        XLSX.utils.book_append_sheet(wb, ws, 'Monthly Revenue');
      }

      const salesRevenue = await models.reports.getSalesRevenue();
      if (salesRevenue.length) {
        const data = salesRevenue.map(r => ({ Month: r.month, Invoices: r.invoices, Revenue: r.revenue }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Sales Revenue');
      }

      const topTechs = await models.reports.getTopTechnicians();
      if (topTechs.length) {
        const data = topTechs.map(r => ({ Name: r.name, Specialization: r.specialization, 'Total Repairs': r.total_repairs, Revenue: r.revenue }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Top Technicians');
      }

      const topCustomers = await models.reports.getTopCustomers();
      if (topCustomers.length) {
        const data = topCustomers.map(r => ({ Name: r.name, Phone: r.phone, Type: r.customer_type, 'Total Invoices': r.total_invoices, 'Total Spend': r.total_spend }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Top Customers');
      }

      const topParts = await models.reports.getTopParts();
      if (topParts.length) {
        const data = topParts.map(r => ({ 'Part Number': r.part_number, Name: r.name, 'Times Used': r.times_used, 'Total Qty': r.total_quantity }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Top Parts');
      }

      const lowStock = await models.reports.getLowStockParts();
      if (lowStock.length) {
        const data = lowStock.map(r => ({ 'Part Number': r.part_number, Name: r.name, 'Stock Qty': r.stock_quantity, 'Reorder Level': r.reorder_level }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Low Stock');
      }

      const stats = await models.reports.getStats();
      if (stats) {
        const data = [{ 'Active Repairs': stats.active_repairs, 'New Repairs': stats.new_repairs, 'Total Customers': stats.total_customers, 'Low Stock Items': stats.low_stock, 'Revenue (30 days)': stats.revenue_30d }];
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Summary');
      }

      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Hi_Secure_Solutions_Report.xlsx"');
      res.send(buf);
    } catch (err) {
      console.error('Export failed:', err);
      res.status(500).send('Export failed');
    }
  });
};
