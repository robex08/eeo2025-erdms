/**
 * Test SELECT * (všechny sloupce) z erdms_users
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  console.log('🔵 SQL dotaz:');
  console.log('SELECT * FROM erdms_users WHERE aktivni = 1 LIMIT 10');
  console.log('='.repeat(60));
  
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: false,
      charset: 'utf8mb4',
      connectTimeout: 10000
    });
    
    console.log('✅ Connected');
    
    const startTime = Date.now();
    const [rows] = await conn.query(
      'SELECT * FROM erdms_users WHERE aktivni = 1 LIMIT 10'
    );
    const duration = Date.now() - startTime;
    
    console.log(`✅ Query completed in ${duration}ms`);
    console.log(`✅ Rows returned: ${rows.length}`);
    console.log(`✅ Columns: ${rows.length > 0 ? Object.keys(rows[0]).length : 0}`);
    
    if (rows.length > 0) {
      console.log('\nSloupce:', Object.keys(rows[0]).join(', '));
      console.log('\nPrvní 3 záznamy:');
      rows.slice(0, 3).forEach((row, idx) => {
        console.log(`\n--- Záznam ${idx + 1} ---`);
        console.log(JSON.stringify(row, null, 2));
      });
    }
    
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('🔴 ERROR:', err.message);
    console.error('🔴 Code:', err.code);
    console.error('🔴 Stack:', err.stack);
    process.exit(1);
  }
})();
