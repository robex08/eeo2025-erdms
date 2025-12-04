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
    
    console.log('🔵 Test 1: Počet záznamů');
    const [count] = await conn.query('SELECT COUNT(*) as total FROM erdms_users');
    console.log(`✅ Celkem záznamů: ${count[0].total}`);
    
    console.log('\n🔵 Test 2: Velikost tabulky');
    const [size] = await conn.query(`
      SELECT 
        table_name,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
        table_rows
      FROM information_schema.TABLES 
      WHERE table_schema = ? AND table_name = 'erdms_users'
    `, [process.env.DB_NAME]);
    console.log('✅ Velikost:', size[0]);
    
    console.log('\n🔵 Test 3: SELECT id pouze (rychlý)');
    const start1 = Date.now();
    const [ids] = await conn.query('SELECT id FROM erdms_users');
    console.log(`✅ ${ids.length} IDs načteno za ${Date.now() - start1}ms`);
    
    console.log('\n🔵 Test 4: SELECT * s malým LIMIT');
    const start2 = Date.now();
    const [rows10] = await conn.query('SELECT * FROM erdms_users LIMIT 10');
    console.log(`✅ 10 řádků (SELECT *) za ${Date.now() - start2}ms`);
    
    console.log('\n🔵 Test 5: SELECT * s větším LIMIT');
    const start3 = Date.now();
    const [rows100] = await conn.query('SELECT * FROM erdms_users LIMIT 100');
    console.log(`✅ 100 řádků (SELECT *) za ${Date.now() - start3}ms`);
    
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('🔴 Chyba:', err.message);
    process.exit(1);
  }
})();
