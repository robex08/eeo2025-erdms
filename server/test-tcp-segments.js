/**
 * Test s explicitním nastavením TCP parametrů a debug výstupem
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  console.log('🔵 Test s různými network timeouty a debugging');
  
  const configs = [
    {
      name: 'Config 1: Základní + krátký timeout',
      options: {
        host: process.env.DB_HOST,
        port: 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 5000,
        // Důležité pro network issues:
        insecureAuth: true,
        ssl: false,
      }
    },
    {
      name: 'Config 2: S TCP keepalive',
      options: {
        host: process.env.DB_HOST,
        port: 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 5000,
        ssl: false,
        // TCP keepalive pro detekci síťových problémů:
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      }
    },
    {
      name: 'Config 3: S Stream options',
      options: {
        host: process.env.DB_HOST,
        port: 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 5000,
        ssl: false,
        // Socket options:
        socketPath: undefined,
        localAddress: undefined,
        // Buffering:
        flags: undefined,
      }
    },
  ];
  
  for (const config of configs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(config.name);
    console.log('='.repeat(60));
    
    try {
      const conn = await mysql.createConnection(config.options);
      console.log('✅ Připojeno');
      
      // Test 1: Malý dotaz (1 řádek)
      console.log('  Test A: SELECT * LIMIT 1');
      const start1 = Date.now();
      const [rows1] = await conn.query('SELECT * FROM erdms_users LIMIT 1');
      console.log(`  ✅ LIMIT 1: ${Date.now() - start1}ms, ${rows1.length} řádků`);
      
      // Test 2: Všechny řádky (problematický)
      console.log('  Test B: SELECT * (všechny)');
      const start2 = Date.now();
      
      // Timeout wrapper
      const queryPromise = conn.query('SELECT * FROM erdms_users');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 3000)
      );
      
      try {
        const [rows2] = await Promise.race([queryPromise, timeoutPromise]);
        console.log(`  ✅ Všechny: ${Date.now() - start2}ms, ${rows2.length} řádků`);
      } catch (timeoutErr) {
        console.log(`  🔴 TIMEOUT po ${Date.now() - start2}ms`);
      }
      
      await conn.end();
      
    } catch (err) {
      console.log('🔴 Chyba:', err.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('DOPORUČENÍ:');
  console.log('Pokud všechny timeoutují, problém je v síti/MTU.');
  console.log('Řešení: Snížit MTU nebo použít LIMIT/pagination.');
  console.log('='.repeat(60));
  
  process.exit(0);
})();
