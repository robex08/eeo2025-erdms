const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '10.3.172.11',
      port: 3306,
      user: 'erdms_user',
      password: 'AhchohTahnoh7eim',
      database: 'erdms',
    });
    
    console.log('OK: Connected');
    
    const [rows] = await conn.query('SELECT * FROM erdms_users LIMIT 1');
    console.log('OK: Got', rows.length, 'rows');
    
    await conn.end();
    console.log('OK: Done');
    process.exit(0);
  } catch (err) {
    console.error('ERR:', err.message);
    process.exit(1);
  }
})();
