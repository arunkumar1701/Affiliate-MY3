const prisma = require('../config/prisma');

const types = {
  REGISTRATION: 'REGISTRATION',
  APPROVAL: 'APPROVAL',
  REJECTION: 'REJECTION',
  COUPON_ACTIVATION: 'COUPON_ACTIVATION',
  REFERRAL_ORDER: 'REFERRAL_ORDER',
  COMMISSION_GENERATED: 'COMMISSION_GENERATED',
  COMMISSION_APPROVED: 'COMMISSION_APPROVED',
  COMMISSION_PAID: 'COMMISSION_PAID',
  SUSPENSION: 'SUSPENSION',
};

const create = async ({ userId, affiliateId, type, title, message, data }) => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        affiliateId: affiliateId || null,
        type,
        title,
        message,
        data: data || null,
      },
    });
  } catch (e) {
    console.warn('Notification failure:', e.message);
  }
};

module.exports = { types, create };
