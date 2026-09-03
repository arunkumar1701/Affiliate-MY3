const crypto = require('crypto');

const normalizeCoupon = (code) => (code || '').toString().trim().toUpperCase().replace(/\s+/g, '');

const generateAffiliateCode = async (prisma) => {
  let seq = 1;
  const last = await prisma.affiliate.findFirst({
    where: { affiliateCode: { startsWith: 'AFF-' } },
    orderBy: { affiliateCode: 'desc' },
  });
  if (last) {
    const n = parseInt(last.affiliateCode.split('-')[1], 10);
    if (!isNaN(n)) seq = n + 1;
  }
  while (true) {
    const code = 'AFF-' + String(seq).padStart(6, '0');
    const exists = await prisma.affiliate.findUnique({ where: { affiliateCode: code } });
    if (!exists) return code;
    seq++;
  }
};

const generateOrderNumber = async (prisma) => {
  const prefix = 'ORD';
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let tries = 0;
  while (tries < 100) {
    const rand = crypto.randomInt(1000, 9999);
    const num = `${prefix}-${datePart}-${rand}`;
    const exists = await prisma.order.findUnique({ where: { orderNumber: num } });
    if (!exists) return num;
    tries++;
  }
  throw new Error('Could not generate order number');
};

const generatePayoutReference = async (prisma) => {
  const prefix = 'PAY';
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let tries = 0;
  while (tries < 100) {
    const rand = crypto.randomInt(1000, 9999);
    const num = `${prefix}-${datePart}-${rand}`;
    const exists = await prisma.payout.findUnique({ where: { payoutReference: num } });
    if (!exists) return num;
    tries++;
  }
  throw new Error('Could not generate payout reference');
};

const makeIdempotencyKey = (orderId) => `comm-order-${orderId}`;

const slugToCode = (name) => {
  if (!name) return '';
  const base = name
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  return (base || 'AFF') + crypto.randomInt(10, 99);
};

module.exports = {
  normalizeCoupon,
  generateAffiliateCode,
  generateOrderNumber,
  generatePayoutReference,
  makeIdempotencyKey,
  slugToCode,
};
