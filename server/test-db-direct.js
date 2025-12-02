/**
 * Přímý test DB připojení - bypass connection pool
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDirect() {
  console.log('🔵 Creating direct connection...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: false
  });
  
  console.log('✅ Connected!');
  
  console.log('🔵 Testing simple query: SELECT 1');
  const [test1] = await connection.query('SELECT 1 as test');
  console.log('✅ Result:', test1);
  
  console.log('🔵 Testing user query (without LONGTEXT): SELECT id, username, email...');
  const startTime = Date.now();
  const [users] = await connection.query(
    `SELECT id, username, entra_id, email, jmeno, prijmeni, role, aktivni
     FROM erdms_users 
     WHERE username = ? AND aktivni = 1`,
    ['u03924']
  );
  const duration = Date.now() - startTime;
  console.log('✅ Query completed in', duration, 'ms');
  console.log('✅ Found rows:', users.length);
  if (users.length > 0) {
    console.log('✅ User:', users[0].username, 'ID:', users[0].id);
  }
  
  await connection.end();
  console.log('✅ Connection closed');
}

testDirect()
  .then(() => {
    console.log('✅ ALL TESTS PASSED');
    process.exit(0);
  })
  .catch(err => {
    console.error('🔴 ERROR:', err);
    process.exit(1);
  });
