const bcrypt = require('bcryptjs');

// Hash values from the database - both users have $2y$ format
const adminHash = '$2y$10$4stqTB/PAW.0COUW62lVJObQ8E/DyYGKNmMeFUjNTdS1qz00vbEuC';
const operadorHash = '$2y$10$QfUpMhi3nNed7wym.YBi8uHLSqelnCPfAOiroXxTQKYn2FpvEnTg2';

console.log('Testing admin user...');
console.log('Admin hash:', adminHash.substring(0, 15) + '...');
const adminConverted = adminHash.replace('$2y$', '$2a$');
const adminMatch = bcrypt.compareSync('admin123', adminConverted);
console.log('Admin password matches:', adminMatch ? '✅ YES' : '❌ NO');

console.log('\nTesting operador user...');
console.log('Operador hash:', operadorHash.substring(0, 15) + '...');
const operadorConverted = operadorHash.replace('$2y$', '$2a$');
const operadorMatch = bcrypt.compareSync('operador123', operadorConverted);
console.log('Operador password matches:', operadorMatch ? '✅ YES' : '❌ NO');

console.log('\n' + '='.repeat(50));
console.log('SUMMARY: Both users should authenticate successfully with bcrypt fix!');
console.log('Fix: Convert $2y$ hash to $2a$ before bcrypt.compare()');