const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const prisma = require('./config/prisma');
const { notFound, errorHandler, AppError } = require('./middleware/error');
const commissionEngine = require('./services/commissionEngine');
const settings = require('./services/settings');

const authRoutes = require('./routes/auth');
const affiliateRoutes = require('./routes/affiliate');
const couponRoutes = require('./routes/coupon');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

const app = express();

// Trust headers for rate limiting IPs
app.set('trust proxy', 1);

// Security
app.use(helmet({
  contentSecurityPolicy: config.env === 'production' ? undefined : false,
}));
app.use(compression());

// CORS
app.use(cors({
  origin: config.clientOrigin ? config.clientOrigin.split(',').map(s => s.trim()) : true,
  credentials: true,
  exposedHeaders: ['X-Total-Count', 'Content-Disposition'],
}));

// Body parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  message: { success: false, error: { message: 'Too many requests', code: 'RATE_LIMIT' } },
});
const couponLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.couponMax,
  message: { success: false, error: { message: 'Too many coupon attempts', code: 'RATE_LIMIT' } },
});
app.use('/api/', globalLimiter);
app.use('/api/coupon/', couponLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      env: config.env,
      timestamp: new Date().toISOString(),
      currency: config.currency.default,
    },
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/coupon', couponRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`[SERVER] Affiliate System running on http://localhost:${config.port} (${config.env})`);
  console.log(`[SERVER] Client origin: ${config.clientOrigin}`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`[SERVER] Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Commission auto-approve background job (runs hourly)
let approvalTimer = null;
if (config.env !== 'test') {
  approvalTimer = setInterval(async () => {
    try {
      const days = parseInt(await settings.get('DEFAULT_COMMISSION_APPROVAL_DAYS'), 10) || config.affiliate.defaultCommissionApprovalDays;
      const n = await commissionEngine.autoApproveEligible(days);
      if (n > 0) console.log(`[CRON] Auto-approved ${n} pending commissions`);
    } catch (e) {
      console.warn('[CRON] auto-approve error:', e.message);
    }
  }, 60 * 60 * 1000);
  approvalTimer.unref?.();
}

module.exports = app;
