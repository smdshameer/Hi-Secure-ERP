const { pool } = require('./config/database');
(async () => {
  await pool.query(`CREATE OR REPLACE FUNCTION sync_tech_avail_status()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.is_available THEN
        UPDATE technicians SET availability_status = 'available', updated_at = now()
        WHERE technician_id = NEW.technician_id;
      ELSE
        UPDATE technicians SET availability_status = 'on_leave', updated_at = now()
        WHERE technician_id = NEW.technician_id;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql`);
  await pool.end();
  console.log('Fixed trigger function');
})();
