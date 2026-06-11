const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'hisecure_erp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
});

async function runMigration() {
    try {
        console.log('Running quotations migration...');

        const migrationPath = path.join(__dirname, 'migrations', 'add-quotations-module.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        const client = await pool.connect();

        try {
            // Execute the entire script as one query (PostgreSQL supports multiple statements)
            await client.query(sql);
            console.log('\n✅ Migration completed successfully!');
        } finally {
            client.release();
        }

        process.exit(0);
    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        // Show more details
        console.error('Error details:', err);
        process.exit(1);
    }
}

runMigration();
