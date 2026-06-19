const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from artifacts/api-server directory
dotenv.config({ path: path.join(__dirname, '../../artifacts/api-server/.env') });

const { Pool } = pg;

async function testConnection() {
  console.log('[Test] Starting database connection test...');
  console.log('[Test] DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

  if (!process.env.DATABASE_URL) {
    console.error('[Test] ERROR: DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('[Test] Connecting to database...');
    const client = await pool.connect();
    console.log('[Test] Connected successfully!');

    const result = await client.query('SELECT version()');
    console.log('[Test] PostgreSQL version:', result.rows[0].version);

    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('[Test] Existing tables:', tablesResult.rows.map(r => r.table_name));

    await client.release();
    await pool.end();
    console.log('[Test] Connection test passed!');
  } catch (error) {
    console.error('[Test] ERROR: Database connection failed');
    console.error('[Test] Error details:', error.message);
    console.error('[Test] Full error:', error);
    await pool.end();
    process.exit(1);
  }
}

testConnection();
