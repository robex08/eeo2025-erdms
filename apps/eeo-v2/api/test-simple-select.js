const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    console.log('🔵 Connecting to DB...');
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: false,
      charset: 'utf8mb4'
    });
    
    console.log('✅ Connected');
    
    console.log('\n🔵 Test 1: SELECT * FROM erdms_users LIMIT 1');
    const [rows1] = await conn.query('SELECT * FROM erdms_users LIMIT 1');
    console.log('✅ Rows:', rows1.length);
    console.log('✅ Columns:', Object.keys(rows1[0] || {}).join(', '));
    
    console.log('\n🔵 Test 2: SELECT * FROM erdms_users WHERE username = ?');
    const [rows2] = await conn.query('SELECT * FROM erdms_users WHERE username = ?', ['u03924']);
    console.log('✅ Rows:', rows2.length);
    if (rows2[0]) {
      console.log('✅ User:', rows2[0].username, 'Email:', rows2[0].email);
    }
    
    console.log('\n🔵 Test 3: SELECT COUNT(*) FROM erdms_users');
    const [rows3] = await conn.query('SELECT COUNT(*) as total FROM erdms_users');
    console.log('✅ Total users:', rows3[0].total);
    
    await conn.end();
    console.log('\n✅ ALL TESTS PASSED');
    process.exit(0);
  } catch (err) {
    console.error('🔴 ERROR:', err.message);
    console.error('🔴 Code:', err.code);
    console.error('🔴 Stack:', err.stack);
    process.exit(1);
  }
})();
