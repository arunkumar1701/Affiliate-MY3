const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/error');
const { authenticate } = require('../middleware/auth');
const { generateOrderNumber, normalizeCoupon } = require('../utils/ids');
const couponEngine = require('../services/couponEngine');
const commissionEngine = require('../services/commissionEngine');
const audit = require('../services/audit');
const notification = require('../services/notification');
const { toNumber, toMoney, calcCommissionBase } = require('../utils/money');
const config = require('../config');
const settings = require('../services/settings');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(errors);
  next();
};

// Create order (customer checkout)
router.post(
  '/',
  [
    body('items').isArray({ min: 1 }),
    body('items.*.productId').optional(),
    body('items.*.name').optional(),
    body('items.*.unitPrice').isNumeric(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('customerEmail').optional(),
    body('customerId').optional(),
    body('couponCode').optional(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { items, customerEmail, customerId, couponCode, shippingAmount = 0, taxAmount = 0, currency } = req.body;
      return await prisma.$transaction(async (tx) => {
        const subtotal = items.reduce(
          (s, it) => toMoney(s).plus(toMoney(it.unitPrice).times(it.quantity || 1)),
          0
        ).toNumber();

        let attribution = {
          affiliateId: null, affiliateCouponId: null, affiliateCouponCode: null,
          customerDiscountRate: null, customerDiscountAmount: 0,
          commissionRate: null, commissionBaseType: null, commissionBaseAmount: null,
          commissionAmount: null,
        };
        let coupon = null;
        let couponApplyResult = null;

        if (couponCode) {
          const v = await couponEngine.validateCoupon(couponCode, {
            customerId, customerEmail, items, subtotal,
          });
          if (!v.valid) {
            throw new AppError(v.errors.join(', '), 400, 'COUPON_INVALID');
          }
          couponApplyResult = v;
          coupon = await tx.affiliateCoupon.findUnique({
            where: { couponCodeNormalized: normalizeCoupon(couponCode) },
            include: { affiliate: true },
          });

          const affiliate = coupon.affiliate;
          const discountAmt = toMoney(v.calculations.discountAmount);
          const rate = coupon.commissionRate;
          const baseType = coupon.commissionBaseType;
          const baseAmt = calcCommissionBase(
            v.calculations.eligibleValue, discountAmt, taxAmount, shippingAmount, baseType
          );
          const commissionAmt = baseAmt.times(toMoney(rate)).dividedBy(100);

          attribution = {
            affiliateId: affiliate.id,
            affiliateCouponId: coupon.id,
            affiliateCouponCode: coupon.couponCode,
            customerDiscountRate: toNumber(coupon.discountType === 'PERCENTAGE' ? coupon.discountValue : 0),
            customerDiscountAmount: toNumber(discountAmt),
            commissionRate: toNumber(rate),
            commissionBaseType: baseType,
            commissionBaseAmount: baseAmt.toNumber(),
            commissionAmount: commissionAmt.toNumber(),
          };

          // Fraud: self-referral check
          const selfCheck = await settings.get('SELF_REFERRAL_CHECK');
          if (selfCheck === true || selfCheck === 'true') {
            const self = commissionEngine.isSelfReferral(affiliate, {
              customerEmail, customerPhone: req.body.customerPhone,
            });
            if (self) {
              attribution.suspectedSelfReferral = true;
              // Still apply the discount, but order is flagged
              await tx.fraudFlag.create({
                data: {
                  affiliateId: affiliate.id,
                  type: 'SELF_REFERRAL',
                  severity: 'HIGH',
                  description: `Customer email/phone matches affiliate ${affiliate.affiliateCode}`,
                },
              });
            }
          }
        }

        const netAfterDiscount = Math.max(0, subtotal - toNumber(attribution.customerDiscountAmount ?? 0));
        const total = toMoney(netAfterDiscount).plus(taxAmount).plus(shippingAmount).toNumber();

        const orderNumber = await generateOrderNumber(tx);

        const order = await tx.order.create({
          data: {
            orderNumber,
            customerId: customerId || null,
            customerEmail: customerEmail || null,
            items,
            subtotal: toNumber(subtotal),
            taxAmount: toNumber(taxAmount),
            shippingAmount: toNumber(shippingAmount),
            totalAmount: toNumber(total),
            currency: currency || config.currency.default,
            ...attribution,
            status: 'CREATED',
            suspectedSelfReferral: !!attribution.suspectedSelfReferral,
          },
        });

        res.json({
          success: true,
          data: {
            order: {
              id: order.id,
              orderNumber: order.orderNumber,
              subtotal: order.subtotal,
              taxAmount: order.taxAmount,
              shippingAmount: order.shippingAmount,
              totalAmount: order.totalAmount,
              currency: order.currency,
              status: order.status,
              customerDiscountAmount: toNumber(order.customerDiscountAmount ?? 0),
              suspectedSelfReferral: order.suspectedSelfReferral,
            },
            couponApplied: couponApplyResult ? {
              couponCode: couponApplyResult.coupon.couponCode,
              discountType: couponApplyResult.calculations.discountType,
              discountValue: couponApplyResult.calculations.discountValue,
              discountAmount: couponApplyResult.calculations.discountAmount,
              orderTotalAfterDiscount: couponApplyResult.calculations.orderTotalAfterDiscount,
            } : null,
          },
        });
      });
    } catch (e) { next(e); }
  }
);

// Payment success webhook (idempotent)
router.post('/:id/payment-success', authenticate, async (req, res, next) => {
  try {
    const { paymentId, paymentProvider, idempotencyKey } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { affiliate: true } });
    if (!order) return next(new AppError('Order not found', 404));
    if (order.status === 'PAID' || order.status === 'DELIVERED') {
      // Idempotent: return existing commission
      const commission = await prisma.commissionRecord.findFirst({ where: { orderId: order.id } });
      return res.json({ success: true, data: { order, commission } });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paymentId: paymentId || idempotencyKey || `pay_${Date.now()}`,
        paymentProvider: paymentProvider || 'demo',
        paymentSuccessAt: new Date(),
      },
    });

    let commission = null;
    if (order.affiliateId && !order.suspectedSelfReferral) {
      commission = await commissionEngine.createCommissionFromOrder(updatedOrder, { req });
    } else if (order.suspectedSelfReferral) {
      // Hold commission for review
      commission = await commissionEngine.createCommissionFromOrder(updatedOrder, { req });
      if (commission) {
        commission = await commissionEngine.holdCommission(commission.id, { reason: 'Self-referral flagged for review', req });
      }
    }

    if (commission) {
      // Increment coupon usage count
      if (order.affiliateCouponId) {
        await prisma.affiliateCoupon.update({
          where: { id: order.affiliateCouponId },
          data: { usageCount: { increment: 1 } },
        });
      }
      // Referral record
      if (order.affiliateId) {
        const existingRef = order.customerId
          ? await prisma.affiliateReferral.findFirst({
              where: { affiliateId: order.affiliateId, customerId: order.customerId },
            })
          : null;
        if (existingRef) {
          await prisma.affiliateReferral.update({
            where: { id: existingRef.id },
            data: { lastAttributedAt: new Date(), orderCount: { increment: 1 } },
          });
        } else {
          await prisma.affiliateReferral.create({
            data: {
              affiliateId: order.affiliateId,
              customerId: order.customerId || null,
              couponId: order.affiliateCouponId || null,
            },
          });
        }
        if (order.affiliate?.userId) {
          await notification.create({
            userId: order.affiliate.userId,
            affiliateId: order.affiliate.id,
            type: notification.types.REFERRAL_ORDER,
            title: 'Referral Order Placed!',
            message: `A customer has placed order ${order.orderNumber} using your coupon. Commission pending review.`,
            data: { orderId: order.id, orderNumber: order.orderNumber },
          });
        }
      }
    }

    res.json({ success: true, data: { order: updatedOrder, commission } });
  } catch (e) { next(e); }
});

// Cancel order
router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return next(new AppError('Order not found', 404));
    if (order.status === 'CANCELLED') return res.json({ success: true, data: { order } });
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    const affected = await commissionEngine.cancelCommissionByOrder(order.id, { req });
    res.json({ success: true, data: { order: updated, commissionsCancelled: affected } });
  } catch (e) { next(e); }
});

// Full refund
router.post('/:id/refund', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return next(new AppError('Order not found', 404));
    const amount = toNumber(req.body.amount ?? order.totalAmount);
    const isFull = toNumber(amount) >= toNumber(order.totalAmount) - toNumber(order.refundedAmount) - 0.001;
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: isFull ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        refundedAt: isFull ? new Date() : order.refundedAt,
        refundedAmount: toNumber(toMoney(order.refundedAmount).plus(amount)),
      },
    });
    let reversals;
    if (isFull) {
      reversals = await commissionEngine.reverseCommissionFull(order.id, { req });
    } else {
      // Calculate refunded eligible proportional to refunded order total
      const refundRatio = toMoney(amount).dividedBy(Math.max(0.0001, toNumber(order.totalAmount)));
      const refundedEligible = toMoney(order.commissionBaseAmount ?? toNumber(order.subtotal) - toNumber(order.customerDiscountAmount ?? 0)).times(refundRatio);
      reversals = await commissionEngine.reverseCommissionPartial(order.id, refundedEligible.toNumber(), { req });
    }
    res.json({ success: true, data: { order: updated, reversals } });
  } catch (e) { next(e); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        coupon: true,
        affiliate: { select: { affiliateCode: true, name: true } },
      },
    });
    if (!order) return next(new AppError('Order not found', 404));
    // Ownership check
    const isAdmin = req.user.role === 'ADMIN';
    const isOwnAffiliate = req.user.affiliate?.id === order.affiliateId;
    const isOwnCustomer = req.user.email?.toLowerCase() === order.customerEmail?.toLowerCase() || req.user.id === order.customerId;
    if (!isAdmin && !isOwnAffiliate && !isOwnCustomer) {
      return next(new AppError('Access denied', 403));
    }
    // Strip commission from customer view
    const showCommission = isAdmin || isOwnAffiliate;
    const out = {
      id: order.id, orderNumber: order.orderNumber, createdAt: order.createdAt,
      subtotal: order.subtotal, taxAmount: order.taxAmount, shippingAmount: order.shippingAmount,
      totalAmount: order.totalAmount, refundedAmount: order.refundedAmount,
      currency: order.currency, status: order.status, items: order.items,
      customerDiscountAmount: order.customerDiscountAmount,
      coupon: order.coupon ? { code: order.coupon.couponCode } : null,
      affiliate: order.affiliate && (isAdmin || isOwnAffiliate) ? order.affiliate : undefined,
      commissionAmount: showCommission ? order.commissionAmount : undefined,
      commissionRate: showCommission ? order.commissionRate : undefined,
      paymentSuccessAt: order.paymentSuccessAt,
    };
    res.json({ success: true, data: out });
  } catch (e) { next(e); }
});

module.exports = router;
