const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    console.log('✅ Připojeno');
    
    console.log('\n🔵 Test 1: execute() s prepared statement');
    const [rows1] = await conn.execute('SELECT * FROM erdms_users WHERE id = ?', [1]);
    console.log(`✅ execute() s WHERE: ${rows1.length} řádků`);
    
    console.log('\n🔵 Test 2: execute() s LIMIT');
    const [rows2] = await conn.execute('SELECT * FROM erdms_users LIMIT ?', [1]);
    console.log(`✅ execute() s LIMIT: ${rows2.length} řádků`);
    if (rows2[0]) {
      console.log('Data:', rows2[0]);
    }
    
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('🔴 Chyba:', err.message);
    process.exit(1);
  }
})();
