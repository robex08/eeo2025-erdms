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
    
    console.log('✅ Připojeno k databázi');
    console.log('🔵 Spouštím: SELECT * FROM erdms_users\n');
    
    const start = Date.now();
    const [rows] = await conn.query('SELECT * FROM erdms_users');
    const duration = Date.now() - start;
    
    console.log(`✅ Dotaz dokončen za ${duration}ms`);
    console.log(`✅ Počet řádků: ${rows.length}`);
    console.log(`✅ Počet sloupců: ${Object.keys(rows[0] || {}).length}\n`);
    
    console.log('=' .repeat(120));
    console.log('VŠECHNA DATA:');
    console.log('='.repeat(120));
    
    rows.forEach((row, idx) => {
      console.log(`\n--- Záznam ${idx + 1} ---`);
      Object.entries(row).forEach(([key, value]) => {
        console.log(`  ${key.padEnd(20)}: ${value}`);
      });
    });
    
    console.log('\n' + '='.repeat(120));
    console.log('✅ ÚSPĚŠNĚ DOKONČENO');
    console.log('='.repeat(120));
    
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('🔴 CHYBA:', err.message);
    console.error('🔴 Stack:', err.stack);
    process.exit(1);
  }
})();
