const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
  waitForConnections: true,
  connectTimeout: 10000,
  ssl: false,
  // Klíčové nastavení pro mysql2 protocol
  rowsAsArray: false,
  typeCast: true, // Automatický typecast
  supportBigNumbers: true,
  bigNumberStrings: false,
  dateStrings: false,
  multipleStatements: false,
  // Network tunning
  flags: [
    'LONG_PASSWORD',
    'FOUND_ROWS', 
    'LONG_FLAG',
    'CONNECT_WITH_DB',
    'LOCAL_FILES',
    'PROTOCOL_41',
    'TRANSACTIONS',
    'SECURE_CONNECTION',
    'MULTI_RESULTS'
  ]
});

// Test připojení
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connection successful');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

// Monitoring connection poolu každých 30 sekund
setInterval(() => {
  const poolStats = pool.pool;
  if (poolStats) {
    console.log('📊 Connection Pool Stats:', {
      all: poolStats._allConnections?.length || 0,
      free: poolStats._freeConnections?.length || 0,
      queue: poolStats._connectionQueue?.length || 0
    });
  }
}, 30000);

module.exports = pool;
