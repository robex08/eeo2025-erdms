/**
 * Rate Limiting Middleware
 * Ochrana proti DoS útokům a nadměrnému zatížení API
 */

const rateLimit = require('express-rate-limit');

/**
 * Obecný rate limiter pro API endpointy
 * Max 100 requestů za 15 minut na IP adresu
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 100, // Max 100 requestů
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  
  // Skip rate limiting pro lokální vývoj
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && 
           (req.ip === '127.0.0.1' || req.ip === '::1');
  }
});

/**
 * Přísný rate limiter pro citlivé operace (login, etc.)
 * Max 10 requestů za 15 minut
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 10, // Max 10 pokusů
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && 
           (req.ip === '127.0.0.1' || req.ip === '::1');
  }
});

/**
 * Volnější rate limiter pro read-only operace
 * Max 300 requestů za 15 minut
 */
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 300, // Max 300 requestů
  message: {
    error: 'Too many requests, please slow down.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && 
           (req.ip === '127.0.0.1' || req.ip === '::1');
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  readLimiter
};
