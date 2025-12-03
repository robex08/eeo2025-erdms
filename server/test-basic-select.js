/**
 * Test základního SELECT s minimálními sloupci
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  console.log('🔵 SQL dotaz:');
  console.log('SELECT id, username, jmeno, prijmeni FROM erdms_users WHERE aktivni = 1 LIMIT 10');
  console.log('='.repeat(60));
  
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: false,
      charset: 'utf8mb4',
      connectTimeout: 10000
    });
    
    console.log('✅ Connected');
    
    const startTime = Date.now();
    const [rows] = await conn.query(
      'SELECT id, username, jmeno, prijmeni FROM erdms_users WHERE aktivni = 1 LIMIT 10'
    );
    const duration = Date.now() - startTime;
    
    console.log(`✅ Query completed in ${duration}ms`);
    console.log(`✅ Rows returned: ${rows.length}`);
    console.log('\nData:');
    console.table(rows);
    
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('🔴 ERROR:', err.message);
    console.error('🔴 Code:', err.code);
    console.error('🔴 Stack:', err.stack);
    process.exit(1);
  }
})();
