/**
 * Získá všechna data z erdms_users
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  let conn;
  try {
    console.log('🔵 Připojuji se k databázi...');
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: false,
      charset: 'utf8mb4'
    });
    
    console.log('✅ Připojeno');
    
    console.log('\n🔵 Provádím SELECT * FROM erdms_users...');
    const startTime = Date.now();
    const [rows] = await conn.query('SELECT * FROM erdms_users');
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Dotaz dokončen za ${duration}ms`);
    console.log(`✅ Počet záznamů: ${rows.length}`);
    
    if (rows.length > 0) {
      console.log(`✅ Sloupce (${Object.keys(rows[0]).length}):`, Object.keys(rows[0]).join(', '));
      
      console.log('\n📊 První 3 uživatelé:');
      rows.slice(0, 3).forEach((user, idx) => {
        console.log(`\n--- Uživatel ${idx + 1} ---`);
        console.log(`ID: ${user.id}`);
        console.log(`Username: ${user.username}`);
        console.log(`Email: ${user.email}`);
        console.log(`Jméno: ${user.jmeno} ${user.prijmeni}`);
        console.log(`Aktivní: ${user.aktivni}`);
        console.log(`Auth source: ${user.auth_source}`);
        console.log(`EntraID: ${user.entra_id || 'není nastaveno'}`);
      });
      
      console.log('\n📋 VŠECHNA DATA (JSON):');
      console.log(JSON.stringify(rows, null, 2));
      
      // Statistiky
      const aktivni = rows.filter(u => u.aktivni === 1).length;
      const neaktivni = rows.filter(u => u.aktivni === 0).length;
      const sEntraId = rows.filter(u => u.entra_id).length;
      
      console.log('\n📈 Statistiky:');
      console.log(`   Celkem: ${rows.length}`);
      console.log(`   Aktivní: ${aktivni}`);
      console.log(`   Neaktivní: ${neaktivni}`);
      console.log(`   S EntraID: ${sEntraId}`);
    } else {
      console.log('⚠️  Tabulka je prázdná');
    }
    
  } catch (err) {
    console.error('\n🔴 CHYBA:', err.message);
    console.error('🔴 Kód chyby:', err.code);
    console.error('🔴 SQL:', err.sql);
    process.exit(1);
  } finally {
    if (conn) {
      await conn.end();
      console.log('\n🔵 Odpojeno od databáze');
    }
  }
})();
