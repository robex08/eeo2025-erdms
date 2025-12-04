/**
 * Test SELECT * s mariadb native connector
 */
const mariadb = require('mariadb');
require('dotenv').config();

(async () => {
  console.log('🔵 Testing with MariaDB native connector');
  
  const conn = await mariadb.createConnection({
    host: process.env.DB_HOST,
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  console.log('✅ Connected');
  
  console.log('🔵 Executing SELECT *...');
  const startTime = Date.now();
  const rows = await conn.query('SELECT * FROM erdms_users WHERE username = ? AND aktivni = 1', ['u03924']);
  const duration = Date.now() - startTime;
  
  console.log(`✅ SELECT * completed in ${duration}ms`);
  console.log(`✅ Columns: ${Object.keys(rows[0] || {}).length}`);
  console.log(`✅ User: ${rows[0]?.username}`);
  console.log(`✅ Has opravneni: ${'opravneni' in rows[0]}`);
  console.log(`✅ Opravneni value: ${rows[0]?.opravneni}`);
  
  await conn.end();
  console.log('\n🎉 MariaDB connector works perfectly with SELECT *!');
  process.exit(0);
})().catch(err => {
  console.error('🔴 ERROR:', err.message);
  process.exit(1);
});
