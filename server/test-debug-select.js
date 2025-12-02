const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    console.log('🔵 Připojuji s debug...');
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      debug: false, // Vypnuto - jinak moc výstupu
    });
    
    console.log('✅ Připojeno');
    console.log('🔵 Spouštím: SELECT * FROM erdms_users LIMIT 1');
    
    const start = Date.now();
    const [rows] = await conn.query('SELECT * FROM erdms_users LIMIT 1');
    const duration = Date.now() - start;
    
    console.log(`✅ Dokončeno za ${duration}ms`);
    console.log(`✅ Počet řádků: ${rows.length}`);
    
    if (rows[0]) {
      console.log('\n📋 První řádek:');
      console.log(JSON.stringify(rows[0], null, 2));
    }
    
    await conn.end();
    console.log('\n✅ Úspěšně dokončeno!');
    process.exit(0);
  } catch (err) {
    console.error('🔴 Chyba:', err.message);
    process.exit(1);
  }
})();
