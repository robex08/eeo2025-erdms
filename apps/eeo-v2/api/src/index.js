/**
 * EEO2025 API Server
 * Express server s Microsoft Entra ID autentizací
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
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Bezpečnostní headers
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined')); // Logování
app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded
app.use(cookieParser()); // Parse cookies

// CORS konfigurace - podpora více portů pro dev prostředí
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174', 
  'http://localhost:5175',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Povolit requesty bez Origin hlavičky (např. Postman, curl)
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

// In-memory log storage pro debugging
const requestLogs = [];
const MAX_LOGS = 100;

// Middleware pro logování všech requestů
app.use((req, res, next) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')?.substring(0, 50),
    origin: req.get('origin'),
  };
  
  requestLogs.push(logEntry);
  if (requestLogs.length > MAX_LOGS) {
    requestLogs.shift(); // Odstraň nejstarší
  }
  
  console.log(`[${logEntry.timestamp}] ${logEntry.method} ${logEntry.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Debug endpoint - poslední requesty (jen pro development)
app.get('/api/debug/logs', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Debug endpoint only in development' });
  }
  
  const limit = parseInt(req.query.limit) || 20;
  res.json({
    logs: requestLogs.slice(-limit),
    total: requestLogs.length,
  });
});

// Static files pro debug (jen development)
if (process.env.NODE_ENV === 'development') {
  app.use('/debug', express.static('public'));
}

// Routes
const authRoutes = require('./routes/auth');
const entraRoutes = require('./routes/entra');

app.use('/auth', authRoutes);
app.use('/api/entra', entraRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║  EEO2025 API Server                       ║
║  Environment: ${process.env.NODE_ENV?.padEnd(27) || 'development'.padEnd(27)} ║
║  Port: ${PORT.toString().padEnd(33)} ║
║  URL: http://localhost:${PORT.toString().padEnd(21)} ║
╚═══════════════════════════════════════════╝
  `);
});

module.exports = app;
