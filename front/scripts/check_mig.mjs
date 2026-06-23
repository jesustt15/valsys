import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://admin:adminpassword@localhost:5433/sistema_valvulas' });
try {
  const r = await pool.query('SELECT * FROM "__drizzle_migrations"');
  console.log('Applied migrations:', JSON.stringify(r.rows, null, 2));
} catch(e) {
  console.error('ERROR:', e.message);
} finally {
  await pool.end();
}
