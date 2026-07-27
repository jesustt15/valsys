console.log("Environment check:");
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

(async () => {
  try {
    const res = await pool.query('SELECT 1');
  } catch(e) {
    console.log("pg module:", pg);
    return;
  }
})();