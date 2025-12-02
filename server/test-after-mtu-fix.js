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
    
    const start = Date.now();
    const [rows] = await conn.query('SELECT * FROM erdms_users');
    const duration = Date.now() - start;
    
    console.log(`✅ SELECT * úspěšný za ${duration}ms`);
    console.log(`✅ Načteno ${rows.length} řádků`);
    console.log('\n📋 Data:');
    rows.forEach(u => {
      console.log(`  ${u.id}: ${u.username} - ${u.jmeno} ${u.prijmeni}`);
    });
    
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('🔴 Chyba:', err.message);
    process.exit(1);
  }
})();
