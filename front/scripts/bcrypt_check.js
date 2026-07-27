// Simple bcrypt test to verify password working
const bcrypt = require('bcryptjs');
const password = 'admin123';
const hash = '$2y$10$4stqTB/PAW.0COUW62lVJObQ8E/DyYGKNmMeFUjNTdS1qz00vbEuC';

console.log('Testing password:', password);
console.log('Hash starts with $2y$:', hash.startsWith('$2y$'));

if (hash.startsWith('$2y$')) {
  // Convert $2y$ to $2a$ for bcryptjs compatibility
  const convertedHash = hash.replace('$2y$', '$2a$');
  console.log('Converted hash (first 10 chars):', convertedHash.substring(0, 10));
  const isMatch = bcrypt.compareSync(password, convertedHash);
  console.log('Match after conversion:', isMatch);
} else {
  const isMatch = bcrypt.compareSync(password, hash);
  console.log('Match directly:', isMatch);
}