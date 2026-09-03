const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/error');
const { authenticate, requireRole } = require('../middleware/auth');
const { generateAffiliateCode, slugToCode, normalizeCoupon } = require('../utils/ids');
const audit = require('../services/audit');
const notification = require('../services/notification');
const commissionEngine = require('../services/commissionEngine');
const { toNumber, toMoney, subMoney } = require('../utils/money');
const settings = require('../services/settings');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(errors);
  next();
};

// POST /affiliate/register - Public application
router.post(
  '/register',
  [
    body('name').isLength({ min: 2 }),
    body('email').isEmail(),
    body('password').optional().isLength({ min: 6 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        name, email, phone, country, address, addressCity, addressState, addressZip,
        businessName, businessType, website, socialProfiles, audienceType, description,
        expectedReferralVolume, payoutAccountHolder, payoutBankName, payoutAccountNumber,
        payoutIban, payoutBicSwift, payoutMethod, payoutBillingInfo,
        password, supabaseToken,
      } = req.body;

      return await prisma.$transaction(async (tx) => {
        let user;
        const emailLc = email.toLowerCase();
        user = await tx.user.findUnique({ where: { email: emailLc } });

        if (!user) {
          let supabaseUid = null;
          if (supabaseToken && supabaseAvailable) {
            try {
              const { data } = await supabaseAdmin.auth.getUser(supabaseToken);
              if (data?.user) supabaseUid = data.user.id;
            } catch {}
          }
          user = await tx.user.create({
            data: {
              email: emailLc,
              name,
              role: 'CUSTOMER',
              passwordHash: password ? await hashPassword(password) : null,
              supabaseUid,
              phone,
            },
          });
        }

        if (await tx.affiliate.findUnique({ where: { userId: user.id } })) {
          throw new AppError('Affiliate already exists for this user', 400, 'AFFILIATE_EXISTS');
        }

        // Check duplicate email as affiliate
        const existingAff = await tx.affiliate.findUnique({ where: { email: emailLc } });
        if (existingAff) throw new AppError('Affiliate with this email already applied', 409);

        const affiliateCode = await generateAffiliateCode(tx);

        const affiliate = await tx.affiliate.create({
          data: {
            affiliateCode,
            userId: user.id,
            name,
            email: emailLc,
            phone: phone || null,
            country: country || null,
            address: address || null,
            addressCity: addressCity || null,
            addressState: addressState || null,
            addressZip: addressZip || null,
            businessName: businessName || null,
            businessType: businessType || null,
            website: website || null,
            socialProfiles: socialProfiles || null,
            audienceType: audienceType || null,
            description: description || null,
            expectedReferralVolume: expectedReferralVolume || null,
            payoutAccountHolder: payoutAccountHolder || null,
            payoutBankName: payoutBankName || null,
            payoutAccountNumber: payoutAccountNumber || null,
            payoutIban: payoutIban || null,
            payoutBicSwift: payoutBicSwift || null,
            payoutMethod: payoutMethod || null,
            payoutBillingInfo: payoutBillingInfo || null,
            status: 'PENDING',
            commissionBaseType: 'DISCOUNTED_VALUE',
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            actorRole: user.role,
            action: audit.actions.AFFILIATE_CREATED,
            entityType: 'Affiliate',
            entityId: affiliate.id,
            newValue: { affiliateCode, status: 'PENDING', email: emailLc },
          },
        });

        await notification.create({
          userId: user.id,
          affiliateId: affiliate.id,
          type: notification.types.REGISTRATION,
          title: 'Application Received',
          message: `Thanks for applying ${name}! Your affiliate application has been received and is pending review.`,
          data: { affiliateCode },
        });

        res.json({
          success: true,
          data: {
            affiliateCode: affiliate.affiliateCode,
            status: affiliate.status,
            message: 'Application submitted successfully and is pending admin review.',
          },
        });
      });
    } catch (e) { next(e); }
  }
);

// All affiliate routes below require auth + AFFILIATE role or ADMIN with ownership
router.use(authenticate);

router.get('/profile', async (req, res, next) => {
  try {
    const affiliate = await prisma.affiliate.findFirst({
      where: { userId: req.user.id },
    });
    if (!affiliate) return next(new AppError('No affiliate profile', 404));
    res.json({ success: true, data: stripProfile(affiliate) });
  } catch (e) { next(e); }
});

router.put('/profile', requireRole('AFFILIATE'), async (req, res, next) => {
  try {
    const affiliate = await prisma.affiliate.findFirst({ where: { userId: req.user.id } });
    if (!affiliate) return next(new AppError('No affiliate profile', 404));
    const allowed = ['phone', 'country', 'address', 'addressCity', 'addressState', 'addressZip',
      'businessName', 'businessType', 'website', 'socialProfiles', 'audienceType', 'description',
      'expectedReferralVolume', 'payoutAccountHolder', 'payoutBankName', 'payoutAccountNumber',
      'payoutIban', 'payoutBicSwift', 'payoutMethod', 'payoutBillingInfo'];
    const data = {};
    for (const k of allowed) if (req.body[k] !== undefined) data[k] = req.body[k];
    const old = { phone: affiliate.phone, businessName: affiliate.businessName };
    const updated = await prisma.affiliate.update({ where: { id: affiliate.id }, data });
    await audit.log({
      userId: req.user.id, actorRole: req.user.role,
      action: audit.actions.AFFILIATE_UPDATED, entityType: 'Affiliate', entityId: updated.id,
      oldValue: old, newValue: { phone: updated.phone, businessName: updated.businessName },
      req,
    });
    res.json({ success: true, data: stripProfile(updated) });
  } catch (e) { next(e); }
});

router.get('/dashboard', requireRole('AFFILIATE'), async (req, res, next) => {
  try {
    const a = await prisma.affiliate.findFirst({ where: { userId: req.user.id } });
    if (!a) return next(new AppError('No affiliate profile', 404));
    const commissions = await prisma.commissionRecord.findMany({ where: { affiliateId: a.id } });
    const orders = await prisma.order.findMany({ where: { affiliateId: a.id } });
    const coupon = await prisma.affiliateCoupon.findFirst({ where: { affiliateId: a.id } });

    const sumAmt = (items, field = 'commissionAmount') =>
      toNumber(items.reduce((s, c) => toMoney(s).plus(toMoney(c[field] ?? 0)), 0));

    const byStatus = Object.fromEntries(
      ['PENDING','APPROVED','PAID','REJECTED','CANCELLED','REVERSED','ON_HOLD'].map(s=>[s,0])
    );
    for (const c of commissions) byStatus[c.status] = (byStatus[c.status] || 0) + 1;

    const totalSales = sumAmt(orders.filter(o=>o.status!=='CANCELLED'), 'subtotal');
    const totalDiscounts = sumAmt(orders, 'customerDiscountAmount');

    res.json({
      success: true,
      data: {
        totalReferrals: orders.length,
        totalReferredCustomers: new Set(orders.map(o=>o.customerEmail).filter(Boolean)).size,
        totalOrders: orders.length,
        totalSales,
        totalCustomerDiscounts: totalDiscounts,
        totalCommission: sumAmt(commissions),
        pendingCommission: sumAmt(commissions.filter(c=>c.status==='PENDING'||c.status==='ON_HOLD')),
        approvedCommission: sumAmt(commissions.filter(c=>c.status==='APPROVED')),
        paidCommission: sumAmt(commissions.filter(c=>c.status==='PAID')),
        cancelledCommission: sumAmt(commissions.filter(c=>c.status==='CANCELLED')),
        reversedCommission: sumAmt(commissions.filter(c=>c.status==='REVERSED').map(c=>({...c,commissionAmount:c.reversalAmount}))),
        commissionCountByStatus: byStatus,
        coupon: coupon ? {
          couponCode: coupon.couponCode,
          discountValue: toNumber(coupon.discountValue),
          commissionRate: toNumber(coupon.commissionRate),
          status: coupon.status,
        } : null,
        minimumPayoutThreshold: await settings.get('MINIMUM_PAYOUT_THRESHOLD'),
      },
    });
  } catch (e) { next(e); }
});

router.get('/coupon', requireRole('AFFILIATE'), async (req, res, next) => {
  try {
    const a = await prisma.affiliate.findFirst({ where: { userId: req.user.id } });
    const coupon = await prisma.affiliateCoupon.findFirst({ where: { affiliateId: a.id } });
    if (!coupon) return res.json({ success: true, data: null });
    res.json({
      success: true,
      data: {
        id: coupon.id,
        couponCode: coupon.couponCode,
        customerDiscountType: coupon.discountType,
        customerDiscountValue: toNumber(coupon.discountValue),
        myCommissionRate: toNumber(coupon.commissionRate),
        commissionBaseType: coupon.commissionBaseType,
        minimumOrderValue: coupon.minimumOrderValue ? toNumber(coupon.minimumOrderValue) : null,
        maximumDiscount: coupon.maximumDiscount ? toNumber(coupon.maximumDiscount) : null,
        usageCount: coupon.usageCount,
        usageLimit: coupon.usageLimit,
        expiresAt: coupon.expiresAt,
        startAt: coupon.startAt,
        status: coupon.status,
      },
    });
  } catch (e) { next(e); }
});

router.post('/coupon', [
  body('couponCode').isString().isLength({ min: 2, max: 40 }),
  body('discountValue').isNumeric(),
  body('commissionRate').isNumeric(),
], validate, async (req, res, next) => {
  try {
    const affiliate = await prisma.affiliate.findFirst({ where: { userId: req.user.id } });
    if (!affiliate) return next(new AppError('No affiliate profile', 404));
    if (affiliate.status !== 'ACTIVE') return next(new AppError('Only active affiliates can create coupons', 403));

    const {
      couponCode, discountType = 'PERCENTAGE', discountValue, commissionRate,
      commissionBaseType = 'DISCOUNTED_VALUE', minimumOrderValue, maximumDiscount,
      usageLimit, perCustomerLimit, eligibleProducts, excludedProducts,
      eligibleCategories, excludedCategories, allowStacking = false, startAt, expiresAt,
    } = req.body;
    const couponCodeNormalized = normalizeCoupon(couponCode);
    const existing = await prisma.affiliateCoupon.findUnique({ where: { couponCodeNormalized } });
    if (existing) return next(new AppError('Coupon code already exists', 409, 'COUPON_DUPLICATE'));

    const coupon = await prisma.affiliateCoupon.create({
      data: {
        affiliateId: affiliate.id,
        couponCode: couponCode.toUpperCase(),
        couponCodeNormalized,
        discountType,
        discountValue: Number(discountValue),
        commissionRate: Number(commissionRate),
        commissionBaseType,
        minimumOrderValue: minimumOrderValue ? Number(minimumOrderValue) : null,
        maximumDiscount: maximumDiscount ? Number(maximumDiscount) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perCustomerLimit: perCustomerLimit ? Number(perCustomerLimit) : null,
        eligibleProducts: eligibleProducts || null,
        excludedProducts: excludedProducts || null,
        eligibleCategories: eligibleCategories || null,
        excludedCategories: excludedCategories || null,
        allowStacking: !!allowStacking,
        startAt: startAt ? new Date(startAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: 'INACTIVE',
      },
    });
    await audit.log({
      userId: req.user.id, actorRole: req.user.role,
      action: audit.actions.COUPON_CREATED, entityType: 'Coupon', entityId: coupon.id,
      newValue: req.body, req,
    });
    res.json({ success: true, data: coupon });
  } catch (e) { next(e); }
});

router.get('/orders', requireRole('AFFILIATE'), async (req, res, next) => {
  try {
    const a = await prisma.affiliate.findFirst({ where: { userId: req.user.id } });
    const { page = 1, limit = 20, status } = req.query;
    const where = { affiliateId: a.id };
    if (status) where.status = status;
    const [orders, count] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: +limit,
        skip: (+page - 1) * +limit,
        select: {
          id: true, orderNumber: true, createdAt: true,
          subtotal: true, customerDiscountAmount: true, commissionAmount: true,
          status: true, currency: true,
        },
      }),
      prisma.order.count({ where }),
    ]);
    res.json({
      success: true,
      data: {
        items: orders.map(o => ({
          orderId: o.id,
          orderNumber: o.orderNumber,
          date: o.createdAt,
          orderValue: toNumber(o.subtotal),
          discount: toNumber(o.customerDiscountAmount ?? 0),
          commission: toNumber(o.commissionAmount ?? 0),
          status: o.status,
          currency: o.currency,
        })),
        page: +page,
        limit: +limit,
        total: count,
      },
    });
  } catch (e) { next(e); }
});

router.get('/commissions', requireRole('AFFILIATE'), async (req, res, next) => {
  try {
    const a = await prisma.affiliate.findFirst({ where: { userId: req.user.id } });
    const { page = 1, limit = 20, status } = req.query;
    const where = { affiliateId: a.id };
    if (status) where.status = status;
    const [items, count] = await Promise.all([
      prisma.commissionRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: +limit, skip: (+page - 1) * +limit,
        include: { order: { select: { orderNumber: true, createdAt: true } } },
      }),
      prisma.commissionRecord.count({ where }),
    ]);
    res.json({
      success: true,
      data: {
        items: items.map(c => ({
          id: c.id,
          orderId: c.orderId,
          orderNumber: c.order?.orderNumber,
          orderDate: c.order?.createdAt,
          commissionBase: toNumber(c.commissionBase),
          commissionRate: toNumber(c.commissionRate),
          commissionAmount: toNumber(c.commissionAmount),
          reversalAmount: toNumber(c.reversalAmount),
          netAmount: toNumber(subMoney(c.commissionAmount, c.reversalAmount ?? 0)),
          status: c.status,
          approvedAt: c.approvedAt,
          paidAt: c.paidAt,
          reversedAt: c.reversedAt,
          createdAt: c.createdAt,
          currency: c.currency,
        })),
        page: +page, limit: +limit, total: count,
      },
    });
  } catch (e) { next(e); }
});

router.get('/payouts', requireRole('AFFILIATE'), async (req, res, next) => {
  try {
    const a = await prisma.affiliate.findFirst({ where: { userId: req.user.id } });
    const { page = 1, limit = 20 } = req.query;
    const where = { affiliateId: a.id };
    const [items, count] = await Promise.all([
      prisma.payout.findMany({
        where, orderBy: { createdAt: 'desc' },
        take: +limit, skip: (+page - 1) * +limit,
        include: { items: { include: { commission: { select: { commissionAmount: true, id: true } } } } },
      }),
      prisma.payout.count({ where }),
    ]);
    const commissions = await prisma.commissionRecord.findMany({ where: { affiliateId: a.id } });
    const sumStatus = (st) =>
      toNumber(commissions.filter(c => c.status === st).reduce((s, c) => toMoney(s).plus(toMoney(c.commissionAmount).minus(c.reversalAmount ?? 0)), 0));
    const totalEarned = toNumber(commissions.reduce((s, c) => toMoney(s).plus(toMoney(c.commissionAmount).minus(c.reversalAmount ?? 0)), 0));
    const available = sumStatus('APPROVED');
    const threshold = parseFloat(await settings.get('MINIMUM_PAYOUT_THRESHOLD'));
    res.json({
      success: true,
      data: {
        summary: {
          totalEarned,
          pending: sumStatus('PENDING') + sumStatus('ON_HOLD'),
          approved: available,
          paid: sumStatus('PAID'),
          availableForPayout: available,
          minimumPayoutThreshold: threshold,
          remainingToThreshold: Math.max(0, threshold - available),
        },
        items: items.map(p => ({
          id: p.id,
          payoutReference: p.payoutReference,
          grossAmount: toNumber(p.grossAmount),
          adjustmentAmount: toNumber(p.adjustmentAmount),
          netAmount: toNumber(p.netAmount),
          currency: p.currency,
          paymentMethod: p.paymentMethod,
          paymentDate: p.paymentDate,
          paymentReference: p.paymentReference,
          status: p.status,
          notes: p.notes,
          createdAt: p.createdAt,
          paidAt: p.paidAt,
          commissionCount: p.items.length,
        })),
        page: +page, limit: +limit, total: count,
      },
    });
  } catch (e) { next(e); }
});

router.get('/notifications', requireRole('AFFILIATE'), async (req, res, next) => {
  try {
    const items = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
});

router.post('/notifications/:id/read', requireRole('AFFILIATE'), async (req, res, next) => {
  try {
    const n = await prisma.notification.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { readAt: new Date() },
    });
    res.json({ success: true, data: n });
  } catch (e) { next(e); }
});

function stripProfile(a) {
  const safe = {
    id: a.id, affiliateCode: a.affiliateCode, userId: a.userId,
    name: a.name, email: a.email, phone: a.phone, country: a.country, address: a.address,
    addressCity: a.addressCity, addressState: a.addressState, addressZip: a.addressZip,
    businessName: a.businessName, businessType: a.businessType, website: a.website,
    socialProfiles: a.socialProfiles, audienceType: a.audienceType, description: a.description,
    expectedReferralVolume: a.expectedReferralVolume,
    status: a.status, createdAt: a.createdAt, approvedAt: a.approvedAt,
    commissionRate: a.commissionRate ? toNumber(a.commissionRate) : null,
    commissionBaseType: a.commissionBaseType,
    payoutMethod: a.payoutMethod,
  };
  // Payment info returned but numbers masked
  if (a.payoutAccountHolder) safe.payoutAccountHolder = a.payoutAccountHolder;
  if (a.payoutBankName) safe.payoutBankName = a.payoutBankName;
  if (a.payoutIban) safe.payoutIban = '****' + a.payoutIban.slice(-4);
  if (a.payoutBicSwift) safe.payoutBicSwift = '****' + a.payoutBicSwift.slice(-4);
  if (a.payoutAccountNumber) safe.payoutAccountNumber = '****' + a.payoutAccountNumber.slice(-4);
  return safe;
}

const { hashPassword } = require('../middleware/auth');
const { supabaseAvailable } = require('../config/supabase');

module.exports = router;
