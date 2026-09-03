const prisma = require('../config/prisma');
const config = require('../config');
const {
  toMoney,
  addMoney,
  subMoney,
  percentOf,
  toNumber,
  zero,
  calcCommissionBase,
} = require('../utils/money');
const { makeIdempotencyKey } = require('../utils/ids');
const { AppError } = require('../middleware/error');
const audit = require('./audit');
const notification = require('./notification');

const SNAPSHOT_FIELDS = [
  'affiliateId',
  'affiliateCouponId',
  'affiliateCouponCode',
  'customerDiscountRate',
  'customerDiscountAmount',
  'commissionRate',
  'commissionBaseType',
  'commissionBaseAmount',
  'commissionAmount',
];

const isSelfReferral = (affiliate, order) => {
  const ae = (affiliate.email || '').toLowerCase().trim();
  const ce = (order.customerEmail || '').toLowerCase().trim();
  const ap = (affiliate.phone || '').trim();
  return (ae && ce && ae === ce) || (ap && ap === (order.customerPhone || ''));
};

const createCommissionFromOrder = async (order, { req, force = false } = {}) => {
  if (!order || !order.affiliateId || !order.affiliateCouponId) {
    return null;
  }
  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
    return null;
  }

  const idempotencyKey = makeIdempotencyKey(order.id);

  // Idempotency: never double-create
  const existing = await prisma.commissionRecord.findUnique({
    where: { idempotencyKey },
  });
  if (existing && !force) {
    return existing;
  }

  const eligible = toMoney(order.commissionBaseAmount ?? subMoney(order.subtotal, order.customerDiscountAmount ?? 0));
  const cBase = calcCommissionBase(
    order.subtotal,
    order.customerDiscountAmount ?? 0,
    order.taxAmount ?? 0,
    order.shippingAmount ?? 0,
    order.commissionBaseType ?? 'DISCOUNTED_VALUE'
  );
  const rate = toMoney(order.commissionRate ?? 0);
  const amount = percentOf(cBase, rate);

  const commission = await prisma.commissionRecord.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      idempotencyKey,
      affiliateId: order.affiliateId,
      orderId: order.id,
      couponId: order.affiliateCouponId,
      couponCode: order.affiliateCouponCode,
      orderValue: toMoney(order.subtotal).toNumber(),
      eligibleValue: eligible.toNumber(),
      discountAmount: toMoney(order.customerDiscountAmount ?? 0).toNumber(),
      commissionBase: cBase.toNumber(),
      commissionRate: rate.toNumber(),
      commissionAmount: amount.toNumber(),
      currency: order.currency || config.currency.default,
      status: 'PENDING',
      customerRef: order.customerEmail || order.customerId,
    },
  });

  await audit.log({
    action: audit.actions.COMMISSION_CREATED,
    entityType: 'CommissionRecord',
    entityId: commission.id,
    newValue: {
      orderId: order.id,
      affiliateId: order.affiliateId,
      commissionAmount: commission.commissionAmount,
      status: commission.status,
    },
    req,
  });

  const affiliate = await prisma.affiliate.findUnique({
    where: { id: order.affiliateId },
    include: { user: true },
  });
  if (affiliate?.userId) {
    await notification.create({
      userId: affiliate.userId,
      affiliateId: affiliate.id,
      type: notification.types.COMMISSION_GENERATED,
      title: 'New Commission Generated',
      message: `A new commission of ${commission.commissionAmount} ${commission.currency} has been generated from order ${order.orderNumber}.`,
      data: { orderId: order.id, commissionId: commission.id, amount: commission.commissionAmount },
    });
  }

  return commission;
};

const cancelCommissionByOrder = async (orderId, { req, notes } = {}) => {
  const comms = await prisma.commissionRecord.findMany({
    where: { orderId, status: { notIn: ['CANCELLED', 'REVERSED', 'PAID'] } },
  });
  const ids = comms.map((c) => c.id);
  if (!ids.length) return [];
  const updated = await prisma.commissionRecord.updateMany({
    where: { id: { in: ids } },
    data: { status: 'CANCELLED', cancelledAt: new Date(), notes: notes || 'Order cancelled' },
  });
  for (const c of comms) {
    await audit.log({
      action: audit.actions.COMMISSION_CANCELLED,
      entityType: 'CommissionRecord',
      entityId: c.id,
      newValue: { status: 'CANCELLED' },
      req,
    });
  }
  return updated;
};

const reverseCommissionFull = async (orderId, { req, notes } = {}) => {
  const comms = await prisma.commissionRecord.findMany({
    where: { orderId, status: { notIn: ['REVERSED', 'CANCELLED'] } },
  });
  const results = [];
  for (const c of comms) {
    const reversal = percentOf(c.commissionBase, c.commissionRate);
    const updated = await prisma.commissionRecord.update({
      where: { id: c.id },
      data: {
        status: c.status === 'PAID' ? 'REVERSED' : 'REVERSED',
        reversedAt: new Date(),
        reversalAmount: reversal.toNumber(),
        notes: notes || 'Order refunded',
      },
    });
    results.push(updated);
    await audit.log({
      action: audit.actions.COMMISSION_REVERSED,
      entityType: 'CommissionRecord',
      entityId: c.id,
      newValue: { status: 'REVERSED', reversalAmount: reversal.toNumber() },
      req,
    });
  }
  return results;
};

const reverseCommissionPartial = async (orderId, refundedEligible, { req, notes } = {}) => {
  const comms = await prisma.commissionRecord.findMany({
    where: { orderId, status: { notIn: ['REVERSED', 'CANCELLED'] } },
  });
  const results = [];
  for (const c of comms) {
    const existingReversal = toNumber(c.reversalAmount);
    const newReversal = percentOf(refundedEligible, c.commissionRate);
    const totalReversal = toNumber(toMoney(existingReversal).plus(newReversal));
    // Cannot reverse more than original commission
    const cappedReversal = Math.min(totalReversal, toNumber(c.commissionAmount));

    const updated = await prisma.commissionRecord.update({
      where: { id: c.id },
      data: {
        reversedAt: new Date(),
        reversalAmount: cappedReversal,
        notes: notes || 'Partial refund applied',
        status: cappedReversal >= toNumber(c.commissionAmount) ? 'REVERSED' : c.status,
      },
    });
    results.push(updated);
    await audit.log({
      action: audit.actions.COMMISSION_REVERSED,
      entityType: 'CommissionRecord',
      entityId: c.id,
      newValue: { reversalAmount: cappedReversal },
      req,
    });
  }
  return results;
};

const approveCommission = async (id, { req, notes } = {}) => {
  const c = await prisma.commissionRecord.findUnique({ where: { id } });
  if (!c) throw new AppError('Commission not found', 404);
  if (c.status !== 'PENDING' && c.status !== 'ON_HOLD') {
    throw new AppError(`Cannot approve commission with status ${c.status}`, 400);
  }
  const updated = await prisma.commissionRecord.update({
    where: { id },
    data: { status: 'APPROVED', approvedAt: new Date(), notes },
  });
  await audit.log({
    action: audit.actions.COMMISSION_APPROVED,
    entityType: 'CommissionRecord',
    entityId: id,
    newValue: { status: 'APPROVED' },
    req,
  });
  const aff = await prisma.affiliate.findUnique({ where: { id: c.affiliateId }, include: { user: true } });
  if (aff?.userId) {
    await notification.create({
      userId: aff.userId,
      affiliateId: aff.id,
      type: notification.types.COMMISSION_APPROVED,
      title: 'Commission Approved',
      message: `Your commission of ${c.commissionAmount} ${c.currency} has been approved and is now available for payout.`,
      data: { commissionId: id, amount: c.commissionAmount },
    });
  }
  return updated;
};

const rejectCommission = async (id, { req, notes } = {}) => {
  const c = await prisma.commissionRecord.findUnique({ where: { id } });
  if (!c) throw new AppError('Commission not found', 404);
  if (['PAID', 'CANCELLED', 'REVERSED'].includes(c.status)) {
    throw new AppError(`Cannot reject commission with status ${c.status}`, 400);
  }
  const updated = await prisma.commissionRecord.update({
    where: { id },
    data: { status: 'REJECTED', rejectedAt: new Date(), notes },
  });
  await audit.log({
    action: audit.actions.COMMISSION_REJECTED,
    entityType: 'CommissionRecord',
    entityId: id,
    newValue: { status: 'REJECTED', notes },
    req,
  });
  return updated;
};

const holdCommission = async (id, { reason, req } = {}) => {
  const c = await prisma.commissionRecord.findUnique({ where: { id } });
  if (!c) throw new AppError('Commission not found', 404);
  if (['PAID', 'CANCELLED', 'REVERSED'].includes(c.status)) {
    throw new AppError(`Cannot hold commission with status ${c.status}`, 400);
  }
  const updated = await prisma.commissionRecord.update({
    where: { id },
    data: { status: 'ON_HOLD', heldAt: new Date(), holdReason: reason },
  });
  await audit.log({
    action: audit.actions.COMMISSION_HOLD,
    entityType: 'CommissionRecord',
    entityId: id,
    newValue: { status: 'ON_HOLD', reason },
    req,
  });
  return updated;
};

const reverseCommissionById = async (id, { req, amount, notes } = {}) => {
  const c = await prisma.commissionRecord.findUnique({ where: { id } });
  if (!c) throw new AppError('Commission not found', 404);
  const existingReversal = toNumber(c.reversalAmount);
  const reversal = amount != null ? toNumber(amount) : toNumber(c.commissionAmount) - existingReversal;
  const total = Math.min(toNumber(c.commissionAmount), existingReversal + reversal);
  const updated = await prisma.commissionRecord.update({
    where: { id },
    data: {
      status: 'REVERSED',
      reversedAt: new Date(),
      reversalAmount: total,
      notes: notes || 'Manual reversal',
    },
  });
  await audit.log({
    action: audit.actions.COMMISSION_REVERSED,
    entityType: 'CommissionRecord',
    entityId: id,
    newValue: { reversalAmount: total },
    req,
  });
  return updated;
};

const autoApproveEligible = async (approvalDays = null) => {
  const days = approvalDays != null ? approvalDays : config.affiliate.defaultCommissionApprovalDays;
  const cutoff = new Date(Date.now() - days * 86400 * 1000);
  const toApprove = await prisma.commissionRecord.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lte: cutoff },
      order: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
    },
    select: { id: true },
  });
  const ids = toApprove.map((c) => c.id);
  if (!ids.length) return 0;
  const res = await prisma.commissionRecord.updateMany({
    where: { id: { in: ids } },
    data: { status: 'APPROVED', approvedAt: new Date() },
  });
  return res.count;
};

module.exports = {
  createCommissionFromOrder,
  cancelCommissionByOrder,
  reverseCommissionFull,
  reverseCommissionPartial,
  reverseCommissionById,
  approveCommission,
  rejectCommission,
  holdCommission,
  autoApproveEligible,
  isSelfReferral,
  SNAPSHOT_FIELDS,
};
