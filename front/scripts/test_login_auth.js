const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const jwt = require('jose');

(async () => {
  const pool = new Pool({
    connectionString: 'postgresql://admin:adminpassword@localhost:5433/sistema_valvulas'
  });
  
  try {
    // Step 1: Get the admin user
    const res = await pool.query('SELECT username, password_hash, full_name, role FROM users WHERE username=$1', ['admin']);
    const user = res.rows[0];
    console.log('User found:', user.username, user.fullName, user.role);
    console.log('Password hash from DB:', user.password_hash);
    
    // Step 2: Apply bcrypt fix
    let passwordHash = user.password_hash;
    if (passwordHash.startsWith('$2y$')) {
      passwordHash = passwordHash.replace('$2y$', '$2a$');
    }
    
    // Step 3: Compare passwords
    const passwordValid = await bcrypt.compare('admin123', passwordHash);
    console.log('Password valid:', passwordValid);
    
    if (passwordValid) {
      // Step 4: Create a session (simulate loginAction logic)
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-secret-key');
      const token = await new jwt.SignJWT({ role: user.role, fullName: user.fullName })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(user.username)
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(secret);
      
      console.log('Login successful! Token created:', token.substring(0, 20) + '...');
      console.log('✓ Fix verified: bcrypt $2y$ -> $2a$ conversion works');
    } else {
      console.log('Login failed - password incorrect');
    }
    
    await pool.end();
    process.exit(0);
  } catch(e) {
    console.error('Error during login test:', e.message);
    process.exit(1);
  }
})();