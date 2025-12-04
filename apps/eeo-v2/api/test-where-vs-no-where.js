const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const config = {
    host: process.env.DB_HOST,
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
  
  console.log('Test 1: S WHERE podmínkou');
  try {
    const conn1 = await mysql.createConnection(config);
    const [rows1] = await conn1.query('SELECT * FROM erdms_users WHERE username = ?', ['admin']);
    console.log('✅ S WHERE: ', rows1.length, 'řádků');
    await conn1.end();
  } catch (err) {
    console.log('🔴 Chyba:', err.message);
  }
  
  console.log('\nTest 2: Bez WHERE (všechny záznamy)');
  try {
    const conn2 = await mysql.createConnection(config);
    const [rows2] = await conn2.query('SELECT * FROM erdms_users');
    console.log('✅ Bez WHERE: ', rows2.length, 'řádků');
    await conn2.end();
  } catch (err) {
    console.log('🔴 Chyba:', err.message);
  }
  
  process.exit(0);
})();
