import pg from 'pg';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from artifacts/api-server directory
config({ path: path.join(__dirname, '../../artifacts/api-server/.env') });

const { Pool } = pg;

async function testConnection() {
  console.log('[TEST] Starting database connection test...');
  console.log('[TEST] DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  console.log('[TEST] Full connection string:', process.env.DATABASE_URL);

  if (!process.env.DATABASE_URL) {
    console.error('[TEST] ERROR: DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('[TEST] Connecting to database...');
    const client = await pool.connect();
    console.log('[TEST] ✅ Connected successfully!');

    const result = await client.query('SELECT version()');
    console.log('[TEST] PostgreSQL version:', result.rows[0].version.substring(0, 100) + '...');

    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('[TEST] Existing tables:', tablesResult.rows.map(r => r.table_name));

    await client.release();
    await pool.end();
    console.log('[TEST] ✅ Connection test passed!');
  } catch (error) {
    console.error('[TEST] ❌ ERROR: Database connection failed');
    console.error('[TEST] Error name:', error.name);
    console.error('[TEST] Error message:', error.message);
    console.error('[TEST] Error code:', error.code);
    console.error('[TEST] Full error:', error);
    console.error('[TEST] Stack trace:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

testConnection();
