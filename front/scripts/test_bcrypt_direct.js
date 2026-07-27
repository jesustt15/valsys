const bcrypt = require('bcryptjs');

// From the database, the hash starts with $2y$
const dbHash = '$2y$10$4stqTB/PAW.0COUW62lVJObQ8E/DyYGKNmMeFUjNTdS1qz00vbEuC';

console.log('Original hash from DB:', dbHash);
console.log('Original hash prefix:', dbHash.substring(0, 7));
console.log('Password to test: admin123');

// Convert $2y$ to $2a$ for bcryptjs compatibility
const convertedHash = dbHash.replace('$2y$', '$2a$');

console.log('\nConverted hash:', convertedHash);
console.log('Converted hash prefix:', convertedHash.substring(0, 7));

// Try comparison
try {
  const isMatch = bcrypt.compareSync('admin123', convertedHash);
  console.log('\n✅ SUCCESS: bcrypt comparison works!');
  console.log('   Password matches:', isMatch);
} catch(e) {
  console.log('\n❌ FAILED:', e.message);

  // Try to generate a new hash for comparison
  const freshHash = bcrypt.hashSync('admin123', 10);
  console.log('Fresh hash for reference:', freshHash);
  console.log('Fresh hash prefix:', freshHash.substring(0, 7));
}

// Also test with $2b$ format
const bcrypt2bHash = dbHash.replace('$2y$', '$2b$');
console.log('\nAlternative conversion to $2b$:', bcrypt2bHash.substring(0, 15) + '...');