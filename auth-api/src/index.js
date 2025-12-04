/**
 * ERDMS Auth API Server
 * Sdílená autentizační služba pro všechny ERDMS aplikace
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Inicializace databázového připojení
require('./db/connection');

// Inicializace Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS konfigurace
const allowedOrigins = [
  'http://localhost:5173',  // Dashboard dev
  'http://localhost:5174',  // EEO client dev
  'https://erdms.zachranka.cz',
  'https://erdms-dev.zachranka.cz',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Routes
const authRoutes = require('./routes/auth');
const entraRoutes = require('./routes/entra');

app.use('/auth', authRoutes);
app.use('/api/entra', entraRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'erdms-auth-api',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  ERDMS Auth API Server                    ║');
  console.log(`║  Environment: ${process.env.NODE_ENV || 'development'}`.padEnd(44) + '║');
  console.log(`║  Port: ${PORT}`.padEnd(44) + '║');
  console.log(`║  URL: http://localhost:${PORT}`.padEnd(44) + '║');
  console.log('╚═══════════════════════════════════════════╝');
});
