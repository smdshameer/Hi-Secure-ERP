const { pool } = require('../config/database');

async function getLocations() {
  const result = await pool.query('SELECT l.* FROM locations l ORDER BY l.name');
  return result.rows;
}

async function getLocationById(locationId) {
  const result = await pool.query('SELECT * FROM locations WHERE location_id = $1', [locationId]);
  return result.rows[0] || null;
}

async function getLocationStats(locationId) {
  const result = await pool.query(`SELECT COUNT(*) as total_deliveries, COUNT(CASE WHEN status = 'dispatched' THEN 1 END) as dispatched, COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered FROM delivery_challans WHERE from_location_id = $1 OR to_location_id = $1`, [locationId]);
  return result.rows[0];
}

async function createLocation(data) {
  const { location_code, name, address, phone, email, gstin, is_main, is_active } = data;
  const result = await pool.query(`INSERT INTO locations (location_code, name, address, phone, email, gstin, is_main, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING location_id, location_code`, [location_code, name, address || null, phone || null, email || null, gstin || null, is_main || false, is_active !== false]);
  return result.rows[0];
}

async function updateLocation(locationId, data) {
  const { location_code, name, address, phone, email, gstin, is_main, is_active } = data;
  await pool.query(`UPDATE locations SET location_code = $1, name = $2, address = $3, phone = $4, email = $5, gstin = $6, is_main = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP WHERE location_id = $9`, [location_code, name, address || null, phone || null, email || null, gstin || null, is_main || false, is_active, locationId]);
}

async function deactivateLocation(locationId) {
  await pool.query('UPDATE locations SET is_active = false WHERE location_id = $1', [locationId]);
}

module.exports = {
  getLocations,
  getLocationById,
  getLocationStats,
  createLocation,
  updateLocation,
  deactivateLocation
};
