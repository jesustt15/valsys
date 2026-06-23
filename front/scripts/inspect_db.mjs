import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://admin:adminpassword@localhost:5433/sistema_valvulas' });

async function run() {
  try {
    // 1. List all tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in database:', tables.rows.map(r => r.table_name));

    // 2. Describe vehicle_documents columns if it exists
    if (tables.rows.some(r => r.table_name === 'vehicle_documents')) {
      const cols = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'vehicle_documents'
      `);
      console.log('vehicle_documents columns:', cols.rows);
    } else {
      console.log('vehicle_documents table does NOT exist!');
    }
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await pool.end();
  }
}

run();
