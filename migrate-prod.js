/**
 * Database Migration Script for Production ERP
 * Applies critical schema updates to fix known issues
 */

require('dotenv').config();
const { Pool } = require('pg');

// Same config as server.js
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'hisecure_erp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin123',
});

async function runMigrations() {
    console.log('🚀 Starting database migrations...\n');

    try {
        // Test connection
        await pool.query('SELECT 1');
        console.log('✅ Connected to database');

        // Migration 1: Create settings table if not exists
        console.log('\n📝 Migration 1: Creating settings table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                setting_id SERIAL PRIMARY KEY,
                key VARCHAR(100) UNIQUE NOT NULL,
                value JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create trigger for updated_at
        await pool.query(`
            DO $$ BEGIN
                CREATE TRIGGER update_settings_updated_at
                    BEFORE UPDATE ON settings
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log('✅ Settings table created/verified');

        // Migration 2: Insert default settings if table is empty
        console.log('\n📝 Migration 2: Seeding default settings...');
        const defaultSettings = {
            company: {
                name: 'Hi Secure Solutions',
                gstin: '',
                state: 'Delhi',
                address: '',
                phone: '',
                email: '',
                website: '',
                bank: { name: '', branch: '', account_number: '', ifsc_code: '' },
                logo_path: ''
            },
            print: {
                default_size: 'a4',
                default_theme: 'default'
            },
            tax: {
                gst_enabled: true,
                gst_rates: [0, 5, 12, 18, 28],
                default_gst_rate: 18,
                igst_enabled: true
            },
            invoice: {
                prefix: 'INV',
                next_number: 1,
                due_days: 15,
                terms_conditions: 'Thank you for your business. Payment expected within 15 days.'
            },
            quotation: {
                prefix: 'QUO',
                next_number: 1,
                validity_days: 30,
                terms_conditions: 'This quotation is valid for 30 days from the date of issue.'
            },
            pos: {
                receipt_footer: 'Thank you for your purchase!',
                auto_confirm: false,
                cash_payment_label: 'Cash',
                card_payment_label: 'Card',
                upi_payment_label: 'UPI'
            }
        };

        // Insert each setting key
        for (const [key, value] of Object.entries(defaultSettings)) {
            await pool.query(
                `INSERT INTO settings (key, value)
                 VALUES ($1, $2::jsonb)
                 ON CONFLICT (key) DO NOTHING`,
                [key, value]
            );
        }
        console.log('✅ Default settings seeded');

        // Migration 3: Add place_of_supply column to sales_invoices
        console.log('\n📝 Migration 3: Adding place_of_supply column...');
        try {
            await pool.query(`
                ALTER TABLE sales_invoices
                ADD COLUMN place_of_supply VARCHAR(100)
            `);
            console.log('✅ place_of_supply column added');
        } catch (err) {
            if (err.code === '42701') { // column already exists
                console.log('✅ place_of_supply column already exists');
            } else {
                throw err;
            }
        }

        // Migration 4: Verify critical tables exist
        console.log('\n📝 Migration 4: Verifying critical tables...');
        const tables = [
            'users', 'customers', 'parts', 'brands', 'suppliers', 'locations',
            'repairs', 'repair_parts', 'payments', 'sales_invoices', 'sales_invoice_items',
            'purchase_orders', 'purchase_order_items', 'delivery_challans', 'delivery_challan_items',
            'settings'
        ];

        const result = await pool.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);
        const existingTables = result.rows.map(r => r.table_name);

        for (const table of tables) {
            if (existingTables.includes(table)) {
                console.log(`  ✓ ${table}`);
            } else {
                console.log(`  ✗ ${table} - MISSING!`);
            }
        }

        console.log('\n✅ All migrations completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Restart the production server: npm run prod');
        console.log('   2. Access at: http://localhost:3000');
        console.log('   3. Configure company settings at /settings (especially company.state for GST)');

        await pool.end();

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        console.error(err);
        process.exit(1);
    }
}

runMigrations();
