/**
 * Test s timeoutem a debugováním
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  console.log('🔵 Test 1: S krátkým timeoutem');
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 5000,
      timeout: 5000, // Query timeout
    });
    
    console.log('✅ Připojeno');
    
    // Timeout wrapper
    const queryWithTimeout = (conn, sql, params, timeoutMs) => {
      return Promise.race([
        conn.query(sql, params),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout po ' + timeoutMs + 'ms')), timeoutMs)
        )
      ]);
    };
    
    console.log('🔵 Zkouším SELECT * s timeoutem 3s...');
    const [rows] = await queryWithTimeout(conn, 'SELECT * FROM erdms_users LIMIT 1', [], 3000);
    console.log('✅ Vráceno řádků:', rows.length);
    
    await conn.end();
    
  } catch (err) {
    console.error('🔴 Chyba:', err.message);
  }
  
  console.log('\n🔵 Test 2: SELECT konkrétních sloupců (ne *)');
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    const [rows] = await conn.query(
      'SELECT id, username, email, jmeno, prijmeni, aktivni FROM erdms_users LIMIT 1'
    );
    console.log('✅ Vráceno řádků:', rows.length);
    if (rows[0]) {
      console.log('✅ Data:', rows[0]);
    }
    
    await conn.end();
    
  } catch (err) {
    console.error('🔴 Chyba:', err.message);
  }
  
  console.log('\n🔵 Test 3: SHOW COLUMNS');
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    const [cols] = await conn.query('SHOW COLUMNS FROM erdms_users');
    console.log('✅ Sloupce:', cols.map(c => c.Field).join(', '));
    
    await conn.end();
    
  } catch (err) {
    console.error('🔴 Chyba:', err.message);
  }
  
  console.log('\n🔵 Test 4: DESCRIBE TABLE');
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    const [desc] = await conn.query('DESCRIBE erdms_users');
    console.log('✅ Struktura tabulky:');
    desc.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    await conn.end();
    
  } catch (err) {
    console.error('🔴 Chyba:', err.message);
  }
  
  process.exit(0);
})();
