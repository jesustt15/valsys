import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({ connectionString: 'postgresql://admin:adminpassword@localhost:5433/sistema_valvulas' });

try {
  const res = await pool.query("SELECT password_hash FROM users WHERE username = 'admin'");
  const hash = res.rows[0].password_hash;
  console.log('Raw hash from DB:', hash);
  console.log('Starts with $2y$:', hash.startsWith('$2y$'));
  console.log('Starts with $2b$:', hash.startsWith('$2b$'));
  console.log('Compare admin123:', bcrypt.compareSync('admin123', hash));

  // Also test with $2a$ replacement
  const converted = hash.replace('$2y$', '$2a$');
  console.log('Compare $2a$ converted:', bcrypt.compareSync('admin123', converted));
} finally {
  await pool.end();
}
