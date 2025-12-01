/**
 * EEO2025 API Server
 * Express server s Microsoft Entra ID autentizací
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { validateConfig } = require('./config/msalConfig');

// Inicializace Express
const app = express();
const PORT = process.env.PORT || 5000;

// Validace konfigurace
try {
  validateConfig();
  console.log('✓ Configuration validated');
} catch (error) {
  console.error('Configuration error:', error.message);
  process.exit(1);
}

// Middleware
app.use(helmet()); // Bezpečnostní headers
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined')); // Logování
app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded

// CORS konfigurace
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Routes
const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');

app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);

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
