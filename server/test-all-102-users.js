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
    
    console.log(`✅ SELECT * dokončen za ${duration}ms`);
    console.log(`✅ Načteno ${rows.length} uživatelů`);
    console.log(`✅ Aktivních: ${rows.filter(u => u.aktivni).length}`);
    console.log(`✅ Neaktivních: ${rows.filter(u => !u.aktivni).length}`);
    
    console.log('\n📋 Prvních 10 aktivních uživatelů:');
    rows.filter(u => u.aktivni).slice(0, 10).forEach(u => {
      console.log(`  ${u.username.padEnd(20)} - ${u.jmeno} ${u.prijmeni}`);
    });
    
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('🔴 Chyba:', err.message);
    process.exit(1);
  }
})();
