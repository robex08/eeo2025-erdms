/**
 * Test SELECT * vs explicitní seznam sloupců
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testSelectStar() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: false
  });
  
  console.log('✅ Connected!');
  
  console.log('\n🔵 Test: Explicitní seznam VŠECH sloupců');
  const startTime = Date.now();
  const [users] = await connection.query(
    `SELECT id, username, entra_id, upn, entra_sync_at, auth_source,
            titul_pred, jmeno, prijmeni, titul_za, email, telefon,
            pozice_id, lokalita_id, organizace_id, usek_id, role, opravneni,
            password_hash, aktivni, dt_vytvoreni, dt_aktualizace, dt_posledni_aktivita
     FROM erdms_users 
     WHERE username = ? AND aktivni = 1`,
    ['u03924']
  );
  const duration = Date.now() - startTime;
  console.log('✅ Query completed:', duration, 'ms');
  console.log('✅ User:', users[0]?.username);
  console.log('✅ Total columns:', Object.keys(users[0] || {}).length);
  
  await connection.end();
  process.exit(0);
}

testSelectStar()
  .catch(err => {
    console.error('🔴 ERROR:', err.message);
    process.exit(1);
  });
