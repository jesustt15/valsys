const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    connectionString: 'postgresql://admin:adminpassword@localhost:5433/sistema_valvulas'
  });
  
  try {
    const res = await pool.query('SELECT username, password_hash FROM users WHERE username=$1', ['admin']);
    const hash = res.rows[0].password_hash;
    console.log('Hash from DB:', hash);
    console.log('Hash starts with:', hash.substring(0, 10));
    console.log('Check if starts with $2y$:', hash.startsWith('$2y$'));
    
    const passwordHash = hash.startsWith('$2y$') ? hash.replace('$2y$', '$2a$') : hash;
    console.log('Password hash used for compare:', passwordHash.substring(0, 15) + '...');
    console.log('Compare with admin123:', bcrypt.compareSync('admin123', passwordHash));
    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();