/**
 * Test SELECT * s různými connection options
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConfig(label, options) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔵 ${label}`);
  console.log(`${'='.repeat(60)}`);
  console.log('Options:', JSON.stringify(options, null, 2));
  
  try {
    const conn = await mysql.createConnection(options);
    console.log('✅ Connected');
    
    const startTime = Date.now();
    const [rows] = await conn.query('SELECT * FROM erdms_users WHERE username = ? AND aktivni = 1', ['u03924']);
    const duration = Date.now() - startTime;
    
    console.log(`✅ SELECT * completed in ${duration}ms`);
    console.log(`✅ Columns: ${Object.keys(rows[0] || {}).length}`);
    console.log(`✅ User: ${rows[0]?.username}`);
    
    await conn.end();
    return true;
  } catch (err) {
    console.error(`🔴 ERROR: ${err.message}`);
    return false;
  }
}

(async () => {
  const baseConfig = {
    host: process.env.DB_HOST,
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  };
  
  // Test 1: Minimální config
  await testConfig('Test 1: Minimální config', {
    ...baseConfig
  });
  
  // Test 2: S SSL=false
  await testConfig('Test 2: SSL disabled', {
    ...baseConfig,
    ssl: false
  });
  
  // Test 3: S charset
  await testConfig('Test 3: Explicit charset utf8mb4', {
    ...baseConfig,
    ssl: false,
    charset: 'utf8mb4'
  });
  
  // Test 4: S dateStrings=true (vrátí datetime jako string)
  await testConfig('Test 4: dateStrings=true', {
    ...baseConfig,
    ssl: false,
    charset: 'utf8mb4',
    dateStrings: true
  });
  
  // Test 5: S typeCast=false (no automatic conversion)
  await testConfig('Test 5: typeCast=false', {
    ...baseConfig,
    ssl: false,
    charset: 'utf8mb4',
    typeCast: false
  });
  
  // Test 6: S rowsAsArray=true
  await testConfig('Test 6: rowsAsArray=true', {
    ...baseConfig,
    ssl: false,
    charset: 'utf8mb4',
    rowsAsArray: true
  });
  
  // Test 7: Plná konfigurace jako v poolu
  await testConfig('Test 7: Full pool config', {
    ...baseConfig,
    ssl: false,
    charset: 'utf8mb4',
    supportBigNumbers: true,
    bigNumberStrings: false,
    dateStrings: false,
    typeCast: true,
    connectTimeout: 10000
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TESTS COMPLETED');
  console.log('='.repeat(60));
  process.exit(0);
})().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
