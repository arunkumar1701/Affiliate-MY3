require('dotenv').config();
const path = require('path');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  currency: {
    default: process.env.DEFAULT_CURRENCY || 'EUR',
  },

  affiliate: {
    minimumPayoutThreshold: parseFloat(process.env.MINIMUM_PAYOUT_THRESHOLD || '50'),
    defaultCommissionApprovalDays: parseInt(
      process.env.DEFAULT_COMMISSION_APPROVAL_DAYS || '14',
      10
    ),
    allowCouponStacking: process.env.ALLOW_COUPON_STACKING === 'true',
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 500,
    couponMax: 60,
  },
};

module.exports = config;
