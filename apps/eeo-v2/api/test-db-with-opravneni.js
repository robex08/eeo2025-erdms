/**
 * Test DB query s opravneni sloupcem (TEXT místo LONGTEXT)
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testWithOpravneni() {
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
  
  console.log('🔵 Test 1: Query BEZ opravneni sloupce');
  const startTime1 = Date.now();
  const [users1] = await connection.query(
    `SELECT id, username, entra_id, email, jmeno, prijmeni, role, aktivni
     FROM erdms_users 
     WHERE username = ? AND aktivni = 1`,
    ['u03924']
  );
  const duration1 = Date.now() - startTime1;
  console.log('✅ Query bez opravneni: ', duration1, 'ms');
  console.log('✅ Result:', users1[0]?.username);
  
  console.log('\n🔵 Test 2: Query S opravneni sloupcem (TEXT)');
  const startTime2 = Date.now();
  const [users2] = await connection.query(
    `SELECT id, username, entra_id, email, jmeno, prijmeni, role, aktivni, opravneni
     FROM erdms_users 
     WHERE username = ? AND aktivni = 1`,
    ['u03924']
  );
  const duration2 = Date.now() - startTime2;
  console.log('✅ Query s opravneni: ', duration2, 'ms');
  console.log('✅ Result:', users2[0]?.username);
  console.log('✅ Opravneni value:', users2[0]?.opravneni);
  
  console.log('\n🔵 Test 3: Query s SELECT * (včetně opravneni)');
  const startTime3 = Date.now();
  const [users3] = await connection.query(
    `SELECT * FROM erdms_users WHERE username = ? AND aktivni = 1`,
    ['u03924']
  );
  const duration3 = Date.now() - startTime3;
  console.log('✅ Query SELECT *: ', duration3, 'ms');
  console.log('✅ Result:', users3[0]?.username);
  console.log('✅ Has opravneni field:', 'opravneni' in users3[0]);
  
  await connection.end();
  console.log('\n✅ All tests completed successfully!');
}

testWithOpravneni()
  .then(() => {
    console.log('\n🎉 TEXT type works perfectly!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n🔴 ERROR:', err.message);
    process.exit(1);
  });
