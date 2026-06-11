const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');
const { getPrintContext } = require('../models/print');
const pool = require('../config/database').pool;
const { body, validationResult } = require('express-validator');

module.exports = function(app) {
  app.get('/delivery-challans', requireAuth, requireFeature('delivery_challans'), async (req, res) => {
    try {
      const filters = { status: req.query.status, purpose: req.query.purpose, start_date: req.query.start_date, end_date: req.query.end_date, search: req.query.search };
      const challans = await models.deliveryChallans.getDeliveryChallans(filters);
      res.render('delivery-challans/list', { challans, filters, currentPage: 'delivery-challans', user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Database error: ' + err.message); }
  });

  app.get('/delivery-challans/new', requireAuth, requireFeature('delivery_challans'), async (req, res) => {
    try {
      const purpose = req.query.purpose || 'sales';
      const [{ rows: customers }, { rows: locations }, { rows: parts }] = await Promise.all([
        pool.query("SELECT customer_id, name, phone, gstin FROM customers WHERE is_active = true ORDER BY name"),
        pool.query("SELECT location_id, location_code, name, gstin FROM locations WHERE is_active = true ORDER BY name"),
        pool.query("SELECT part_id, part_number, name, selling_price, stock_quantity FROM parts WHERE is_active = true ORDER BY name")
      ]);
      res.render('delivery-challans/new', { purpose, customers, locations, parts, currentPage: 'delivery-challans', user: req.session.user || null, errors: [] });
    } catch (err) { console.error(err); res.status(500).send('Database error'); }
  });

  app.post('/delivery-challans', requireAuth, requireFeature('delivery_challans'), authorize('admin', 'sales', 'inventory_manager'), [
    body('from_location_id').isInt({ min: 1 }).withMessage('From location is required'),
    body('to_location_id').isInt({ min: 1 }).withMessage('To location is required'),
    body('purposes').notEmpty().withMessage('Purpose is required'),
    body('challan_date').optional({ nullable: true }).isISO8601().withMessage('Invalid challan date'),
    body('expected_delivery_date').optional({ nullable: true }).isISO8601().withMessage('Invalid expected delivery date')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const purpose = req.query.purpose || 'sales';
        const [{ rows: customers }, { rows: locations }, { rows: parts }] = await Promise.all([
          pool.query("SELECT customer_id, name, phone, gstin FROM customers WHERE is_active = true ORDER BY name"),
          pool.query("SELECT location_id, location_code, name, gstin FROM locations WHERE is_active = true ORDER BY name"),
          pool.query("SELECT part_id, part_number, name, selling_price, stock_quantity FROM parts WHERE is_active = true ORDER BY name")
        ]);
        return res.status(400).render('delivery-challans/new', {
          errors: errors.array(),
          purpose, customers, locations, parts,
          currentPage: 'delivery-challans',
          user: req.session.user || null
        });
      }

      const { customer_id, from_location_id, to_location_id, challan_date, expected_delivery_date, vehicle_number, driver_name, transporter_name, eway_bill_number, purposes, notes } = req.body;
      if (!purposes) return res.status(400).send('Purpose is required');
      const challan = await models.deliveryChallans.createDeliveryChallan({ customer_id, from_location_id, to_location_id, challan_date, expected_delivery_date, vehicle_number, driver_name, transporter_name, eway_bill_number, purposes, notes, items: req.body.items || [] });
      res.redirect(`/delivery-challans/${challan.delivery_challan_id}`);
    } catch (err) { console.error('Error creating delivery challan:', err); res.status(500).send('Error creating delivery challan: ' + err.message); }
  });

  app.get('/delivery-challans/:id', requireAuth, requireFeature('delivery_challans'), async (req, res) => {
    try {
      const data = await models.deliveryChallans.getDeliveryChallanById(req.params.id);
      if (!data.challan) return res.status(404).send('Delivery challan not found');
      res.render('delivery-challans/detail', { ...data, currentPage: 'delivery-challans', user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Database error'); }
  });

  app.get('/delivery-challans/:id/print', requireAuth, requireFeature('delivery_challans'), async (req, res) => {
    try {
      const data = await models.deliveryChallans.getDeliveryChallanById(req.params.id);
      if (!data.challan) return res.status(404).send('Delivery challan not found');
      const company = await models.settings.getSettings().then(s => s.company || { name: 'Hi Secure Solutions', address: '', gstin: '', email: '', phone: '' });
      const printCtx = await getPrintContext(req);
res.render('delivery-challans/print', { challan: data.challan, items: data.items, company, settings, user: req.session.user || null, printTheme: printCtx.theme, printSize: printCtx.size });
    } catch (err) { console.error(err); res.status(500).send('Database error'); }
  });

  app.post('/delivery-challans/:id', requireAuth, requireFeature('delivery_challans'), authorize('admin', 'sales', 'inventory_manager'), [
    body('from_location_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid from location'),
    body('to_location_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid to location'),
    body('purposes').optional().notEmpty().withMessage('Purpose is required')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).send(errors.array()[0].msg);

      const { customer_id, from_location_id, to_location_id, challan_date, expected_delivery_date, vehicle_number, driver_name, transporter_name, eway_bill_number, purposes, notes } = req.body;
      const updates = [];
      const params = [];
      if (customer_id !== undefined && customer_id !== '') { params.push(parseInt(customer_id)); updates.push(`customer_id = $${params.length}`); } else { params.push(null); updates.push(`customer_id = NULL`); }
      if (from_location_id) { params.push(parseInt(from_location_id)); updates.push(`from_location_id = $${params.length}`); }
      if (to_location_id) { params.push(parseInt(to_location_id)); updates.push(`to_location_id = $${params.length}`); }
      if (challan_date) { params.push(challan_date); updates.push(`challan_date = $${params.length}`); }
      if (vehicle_number !== undefined) { params.push(vehicle_number || null); updates.push(`vehicle_number = $${params.length}`); }
      if (driver_name !== undefined) { params.push(driver_name || null); updates.push(`driver_name = $${params.length}`); }
      if (transporter_name !== undefined) { params.push(transporter_name || null); updates.push(`transporter_name = $${params.length}`); }
      if (eway_bill_number !== undefined) { params.push(eway_bill_number || null); updates.push(`eway_bill_number = $${params.length}`); }
      if (purposes) { params.push(purposes); updates.push(`purposes = $${params.length}`); }
      if (notes !== undefined) { params.push(notes || null); updates.push(`notes = $${params.length}`); }
      params.push(req.params.id);
      await pool.query(`UPDATE delivery_challans SET ${updates.join(', ')} WHERE delivery_challan_id = $${params.length}`, params);
      res.redirect(`/delivery-challans/${req.params.id}`);
    } catch (err) { console.error(err); res.status(500).send('Error updating delivery challan: ' + err.message); }
  });

  app.post('/delivery-challans/:id/status', requireAuth, requireFeature('delivery_challans'), authorize('admin', 'sales', 'inventory_manager'), [
    body('status').isIn(['draft', 'dispatched', 'in_transit', 'delivered', 'cancelled']).withMessage('Invalid status')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).send(errors.array()[0].msg);
      await models.deliveryChallans.updateDeliveryChallanStatus(req.params.id, req.body.status, req.session.user.user_id);
      res.redirect(`/delivery-challans/${req.params.id}`);
    } catch (err) { console.error(err); res.status(500).send('Error updating status: ' + err.message); }
  });

  app.post('/delivery-challans/:id/returns', requireAuth, requireFeature('delivery_challans'), authorize('admin', 'sales', 'inventory_manager'), [
    body('item_id').isInt({ min: 1 }).withMessage('Invalid item'),
    body('part_id').isInt({ min: 1 }).withMessage('Invalid part'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('reason').trim().notEmpty().withMessage('Reason is required')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).send(errors.array()[0].msg);
      await models.deliveryChallans.addReturn({ id: req.params.id, item_id: req.body.item_id, part_id: req.body.part_id, quantity: parseInt(req.body.quantity), reason: req.body.reason, condition_notes: req.body.condition_notes });
      res.redirect(`/delivery-challans/${req.params.id}`);
    } catch (err) { console.error(err); res.status(500).send('Error recording return'); }
  });
};
