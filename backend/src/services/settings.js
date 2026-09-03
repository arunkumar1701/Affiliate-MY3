const prisma = require('../config/prisma');
const config = require('../config');

const defaults = {
  MINIMUM_PAYOUT_THRESHOLD: String(config.affiliate.minimumPayoutThreshold),
  DEFAULT_COMMISSION_APPROVAL_DAYS: String(config.affiliate.defaultCommissionApprovalDays),
  ALLOW_COUPON_STACKING: config.affiliate.allowCouponStacking ? 'true' : 'false',
  DEFAULT_CURRENCY: config.currency.default,
  SELF_REFERRAL_CHECK: 'true',
};

let cache = {};

const get = async (key, fallback = undefined) => {
  if (cache[key] !== undefined) return cache[key];
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (row) {
    cache[key] = parse(row.value, row.type);
    return cache[key];
  }
  if (defaults[key] !== undefined) {
    cache[key] = parse(defaults[key]);
    return cache[key];
  }
  return fallback;
};

const set = async (key, value, type = 'string', updatedBy = null) => {
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: str, type, updatedBy },
    create: { key, value: str, type, updatedBy },
  });
  cache[key] = parse(str, type);
};

const parse = (str, type = 'string') => {
  if (type === 'number') return Number(str);
  if (type === 'boolean') return str === 'true';
  if (type === 'json') return JSON.parse(str);
  return str;
};

const getAll = async () => {
  const rows = await prisma.systemSetting.findMany();
  const out = { ...defaults };
  for (const r of rows) out[r.key] = parse(r.value, r.type);
  return out;
};

module.exports = { get, set, getAll, defaults };
