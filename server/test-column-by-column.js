/**
 * Test načítání dat po sloupcích
 */
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
    
    // Získej seznam sloupců
    const [cols] = await conn.query('SHOW COLUMNS FROM erdms_users');
    const columnNames = cols.map(c => c.Field);
    console.log(`📋 Sloupců celkem: ${columnNames.length}`);
    
    // Zkus postupně přidávat sloupce a zjisti, který dělá problém
    for (let i = 1; i <= columnNames.length; i++) {
      const selectCols = columnNames.slice(0, i).join(', ');
      const colName = columnNames[i-1];
      
      try {
        process.stdout.write(`\r🔵 Test ${i}/${columnNames.length}: ${colName.padEnd(20)}... `);
        
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), 2000)
        );
        
        const query = conn.query(`SELECT ${selectCols} FROM erdms_users LIMIT 1`);
        
        await Promise.race([query, timeout]);
        process.stdout.write('✅\n');
        
      } catch (err) {
        process.stdout.write(`🔴 ${err.message}\n`);
        console.log(`\n⚠️  Problémový sloupec: ${colName}`);
        console.log(`   Typ: ${cols[i-1].Type}`);
        break;
      }
    }
    
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('\n🔴 Chyba:', err.message);
    process.exit(1);
  }
})();
