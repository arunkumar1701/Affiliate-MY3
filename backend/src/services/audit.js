const prisma = require('../config/prisma');

const log = async ({ userId, actorRole, action, entityType, entityId, oldValue, newValue, req }) => {
  try {
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress;
    const userAgent = req?.headers?.['user-agent'];
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        actorRole: actorRole || null,
        action,
        entityType,
        entityId: String(entityId),
        oldValue: oldValue !== undefined ? oldValue : undefined,
        newValue: newValue !== undefined ? newValue : undefined,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch (e) {
    console.warn('Audit log failure:', e.message);
  }
};

const actions = {
  AFFILIATE_CREATED: 'AFFILIATE_CREATED',
  AFFILIATE_UPDATED: 'AFFILIATE_UPDATED',
  AFFILIATE_APPROVED: 'AFFILIATE_APPROVED',
  AFFILIATE_REJECTED: 'AFFILIATE_REJECTED',
  AFFILIATE_SUSPENDED: 'AFFILIATE_SUSPENDED',
  AFFILIATE_REACTIVATED: 'AFFILIATE_REACTIVATED',
  AFFILIATE_DEACTIVATED: 'AFFILIATE_DEACTIVATED',
  COUPON_CREATED: 'COUPON_CREATED',
  COUPON_APPROVED: 'COUPON_APPROVED',
  COUPON_MODIFIED: 'COUPON_MODIFIED',
  COUPON_DISABLED: 'COUPON_DISABLED',
  COMMISSION_CREATED: 'COMMISSION_CREATED',
  COMMISSION_APPROVED: 'COMMISSION_APPROVED',
  COMMISSION_REJECTED: 'COMMISSION_REJECTED',
  COMMISSION_CANCELLED: 'COMMISSION_CANCELLED',
  COMMISSION_REVERSED: 'COMMISSION_REVERSED',
  COMMISSION_HOLD: 'COMMISSION_HOLD',
  PAYOUT_CREATED: 'PAYOUT_CREATED',
  PAYOUT_MODIFIED: 'PAYOUT_MODIFIED',
  PAYOUT_PAID: 'PAYOUT_PAID',
};

module.exports = { log, actions };
