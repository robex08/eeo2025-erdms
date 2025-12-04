/**
 * Rate Limiting Middleware
 * Ochrana proti zneužití API
 */

// Jednoduchý in-memory rate limiter
const requestCounts = new Map();

/**
 * Rate limiter pro čtení dat (více requests)
 */
const readLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const key = `${ip}:${req.path}`;
  const now = Date.now();
  const windowMs = 60000; // 1 minuta
  const maxRequests = 100; // 100 requestů za minutu

  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const data = requestCounts.get(key);
  
  if (now > data.resetTime) {
    data.count = 1;
    data.resetTime = now + windowMs;
    return next();
  }

  if (data.count >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later'
    });
  }

  data.count++;
  next();
};

/**
 * Rate limiter pro zápis dat (méně requests)
 */
const writeLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const key = `${ip}:${req.path}`;
  const now = Date.now();
  const windowMs = 60000; // 1 minuta
  const maxRequests = 20; // 20 requestů za minutu

  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const data = requestCounts.get(key);
  
  if (now > data.resetTime) {
    data.count = 1;
    data.resetTime = now + windowMs;
    return next();
  }

  if (data.count >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later'
    });
  }

  data.count++;
  next();
};

module.exports = {
  readLimiter,
  writeLimiter
};
