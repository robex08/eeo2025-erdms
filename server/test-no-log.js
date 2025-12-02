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
    
    console.log('Connected');
    
    const [rows] = await conn.query('SELECT * FROM erdms_users LIMIT 1');
    console.log('Rows:', rows.length);
    console.log('Cols:', Object.keys(rows[0] || {}).length);
    // NELOGUJ DATA!
    
    await conn.end();
    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
