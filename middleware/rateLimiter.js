// Simple in-memory rate limiter
// Note: For production with multiple servers, use Redis-based rate limiting

const requestCounts = new Map();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.resetTime > 600000) {
      // 10 minutes
      requestCounts.delete(key);
    }
  }
}, 600000);

export const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = "Too many requests, please try again later",
  } = options;

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!requestCounts.has(key)) {
      requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    const data = requestCounts.get(key);

    if (now > data.resetTime) {
      // Reset the count
      data.count = 1;
      data.resetTime = now + windowMs;
      return next();
    }

    if (data.count >= max) {
      return res.status(429).json({
        success: false,
        message,
      });
    }

    data.count += 1;
    next();
  };
};

export const strictRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes
  message: "Too many attempts, please try again later",
});

export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: "Too many login attempts, please try again later",
});

export const uploadRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: "Too many upload requests, please try again later",
});
