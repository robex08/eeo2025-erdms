const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    console.log('🔵 Připojuji...');
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    console.log('✅ Připojeno');
    console.log('🔵 SELECT * FROM erdms_users (bez LIMIT)...');
    
    const start = Date.now();
    const [rows] = await conn.query('SELECT * FROM erdms_users');
    const duration = Date.now() - start;
    
    console.log(`✅ Dokončeno za ${duration}ms`);
    console.log(`✅ Počet řádků: ${rows.length}`);
    
    if (rows.length > 0) {
      console.log('\n📋 První 5 uživatelů:');
      rows.slice(0, 5).forEach(u => {
        console.log(`  ${u.id}: ${u.username} - ${u.jmeno} ${u.prijmeni} (${u.email})`);
      });
    }
    
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('🔴 Chyba:', err.message);
    process.exit(1);
  }
})();
