const express = require('express');
const { body, param, validationResult } = require('express-validator');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const XLSX = require('xlsx');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/error');
const { authenticate, requireRole, requireOwnershipOrAdmin } = require('../middleware/auth');
const { generateAffiliateCode, normalizeCoupon, slugToCode, generatePayoutReference } = require('../utils/ids');
const audit = require('../services/audit');
const notification = require('../services/notification');
const commissionEngine = require('../services/commissionEngine');
const settings = require('../services/settings');
const { toNumber, toMoney, subMoney } = require('../utils/money');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(errors);
  next();
};

router.use(authenticate, requireRole('ADMIN'));

// =============== DASHBOARD KPIs ===============
router.get('/dashboard', async (req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [
      totalAffiliates, activeAffiliates, pendingAffiliates, suspendedAffiliates,
      totalOrders, orders, commissions,
    ] = await Promise.all([
      prisma.affiliate.count(),
      prisma.affiliate.count({ where: { status: 'ACTIVE' } }),
      prisma.affiliate.count({ where: { status: 'PENDING' } }),
      prisma.affiliate.count({ where: { status: 'SUSPENDED' } }),
      prisma.order.count({ where: { affiliateId: { not: null } } }),
      prisma.order.findMany({ where: { affiliateId: { not: null } } }),
      prisma.commissionRecord.findMany(),
    ]);

    const sumOrders = (arr) => toNumber(arr.reduce((s, o) => toMoney(s).plus(toMoney(o.subtotal ?? 0)), 0));
    const sumComm = (arr) => toNumber(arr.reduce((s, c) => toMoney(s).plus(toMoney(c.commissionAmount ?? 0).minus(c.reversalAmount ?? 0)), 0));
    const sumDiscounts = (arr) => toNumber(arr.reduce((s, o) => toMoney(s).plus(toMoney(o.customerDiscountAmount ?? 0)), 0));

    const refOrders = orders.filter(o => o.status !== 'CANCELLED');

    res.json({
      success: true,
      data: {
        totalAffiliates, activeAffiliates, pendingAffiliates, suspendedAffiliates,
        totalReferralOrders: refOrders.length,
        totalReferredRevenue: sumOrders(refOrders),
        totalCustomerDiscounts: sumDiscounts(orders),
        totalCommission: sumComm(commissions),
        pendingCommission: sumComm(commissions.filter(c => c.status === 'PENDING' || c.status === 'ON_HOLD')),
        approvedCommission: sumComm(commissions.filter(c => c.status === 'APPROVED')),
        paidCommission: sumComm(commissions.filter(c => c.status === 'PAID')),
        cancelledCommission: sumComm(commissions.filter(c => c.status === 'CANCELLED').map(c=>({...c,reversalAmount:0}))),
        reversedCommission: sumComm(commissions.filter(c => c.status === 'REVERSED').map(c=>({...c,commissionAmount:c.reversalAmount,reversalAmount:0}))),
      },
    });
  } catch (e) { next(e); }
});

// =============== AFFILIATES ===============
router.get('/affiliates', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, country, search, coupon, minSales, minCommission } = req.query;
    const where = {};
    if (status) where.status = status;
    if (country) where.country = { contains: country, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { affiliateCode: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ];
    }

    let affiliates = await prisma.affiliate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: +limit, skip: (+page - 1) * +limit,
      include: { coupons: true, user: { select: { id: true, email: true, name: true } } },
    });

    const affiliateIds = affiliates.map(a => a.id);
    const orders = await prisma.order.groupBy({
      by: ['affiliateId'],
      where: { affiliateId: { in: affiliateIds }, status: { not: 'CANCELLED' } },
      _sum: { subtotal: true, customerDiscountAmount: true },
      _count: { id: true },
    });
    const commissions = await prisma.commissionRecord.groupBy({
      by: ['affiliateId', 'status'],
      where: { affiliateId: { in: affiliateIds } },
      _sum: { commissionAmount: true, reversalAmount: true },
    });

    const orderMap = Object.fromEntries(orders.map(o => [o.affiliateId, o]));
    const commMap = {};
    for (const c of commissions) {
      if (!commMap[c.affiliateId]) commMap[c.affiliateId] = {};
      commMap[c.affiliateId][c.status] = toNumber((c._sum.commissionAmount ?? 0) - (c._sum.reversalAmount ?? 0));
    }
    const totalCommMap = {};
    for (const c of commissions) {
      totalCommMap[c.affiliateId] = (totalCommMap[c.affiliateId] ?? 0) + toNumber((c._sum.commissionAmount ?? 0) - (c._sum.reversalAmount ?? 0));
    }

    let items = affiliates.map(a => {
      const o = orderMap[a.id] || { _sum: { subtotal: 0, customerDiscountAmount: 0 }, _count: { id: 0 } };
      return {
        id: a.id, affiliateCode: a.affiliateCode, name: a.name, email: a.email,
        businessName: a.businessName, country: a.country, status: a.status,
        createdAt: a.createdAt, approvedAt: a.approvedAt,
        commissionRate: a.commissionRate ? toNumber(a.commissionRate) : null,
        coupon: a.coupons[0] ? { code: a.coupons[0].couponCode, status: a.coupons[0].status } : null,
        totalReferrals: o._count.id,
        totalOrders: o._count.id,
        totalSales: toNumber(o._sum.subtotal ?? 0),
        totalDiscounts: toNumber(o._sum.customerDiscountAmount ?? 0),
        totalCommission: totalCommMap[a.id] ?? 0,
        pendingCommission: commMap[a.id]?.PENDING ?? 0 + (commMap[a.id]?.ON_HOLD ?? 0),
        approvedCommission: commMap[a.id]?.APPROVED ?? 0,
        paidCommission: commMap[a.id]?.PAID ?? 0,
        cancelledCommission: commMap[a.id]?.CANCELLED ?? 0,
        reversedCommission: commMap[a.id]?.REVERSED ?? 0,
      };
    });

    if (coupon) items = items.filter(a => a.coupon?.code?.toUpperCase().includes(coupon.toUpperCase()));
    if (minSales) items = items.filter(a => a.totalSales >= Number(minSales));
    if (minCommission) items = items.filter(a => a.totalCommission >= Number(minCommission));

    const total = await prisma.affiliate.count({ where });
    res.json({ success: true, data: { items, page: +page, limit: +limit, total } });
  } catch (e) { next(e); }
});

router.post('/affiliates', [
  body('name').isLength({ min: 2 }),
  body('email').isEmail(),
], validate, async (req, res, next) => {
  try {
    const {
      name, email, phone, country, address, businessName, businessType, website,
      socialProfiles, audienceType, description, expectedReferralVolume,
      couponCode, discountValue = 10, commissionRate = 5, commissionBaseType = 'DISCOUNTED_VALUE',
      discountType = 'PERCENTAGE', startAt, expiresAt,
      minimumOrderValue, maximumDiscount, usageLimit, perCustomerLimit,
      eligibleProducts, excludedProducts, eligibleCategories, excludedCategories,
      allowStacking = false,
      status = 'APPROVED', userId,
    } = req.body;

    const emailLc = email.toLowerCase();
    return await prisma.$transaction(async (tx) => {
      let user;
      if (userId) user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        user = await tx.user.upsert({
          where: { email: emailLc },
          update: { name, phone },
          create: { email: emailLc, name, role: 'AFFILIATE', phone },
        });
      }
      if (await tx.affiliate.findUnique({ where: { userId: user.id } })) {
        throw new AppError('Affiliate exists for user', 400);
      }
      if (await tx.affiliate.findUnique({ where: { email: emailLc } })) {
        throw new AppError('Affiliate with email exists', 409);
      }

      const affiliateCode = await generateAffiliateCode(tx);
      const affiliate = await tx.affiliate.create({
        data: {
          affiliateCode, userId: user.id, name, email: emailLc, phone: phone || null,
          country: country || null, address: address || null,
          businessName: businessName || null, businessType: businessType || null,
          website: website || null, socialProfiles: socialProfiles || null,
          audienceType: audienceType || null, description: description || null,
          expectedReferralVolume: expectedReferralVolume || null,
          status: status === 'APPROVED' ? 'ACTIVE' : status,
          approvedAt: (status === 'APPROVED' || status === 'ACTIVE') ? new Date() : null,
          commissionRate: commissionRate ? Number(commissionRate) : null,
          commissionBaseType,
        },
      });

      const cCode = couponCode || slugToCode(name);
      const finalCode = await ensureUniqueCoupon(tx, cCode);
      const coupon = await tx.affiliateCoupon.create({
        data: {
          affiliateId: affiliate.id,
          couponCode: finalCode,
          couponCodeNormalized: normalizeCoupon(finalCode),
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
          status: affiliate.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, actorRole: req.user.role,
          action: audit.actions.AFFILIATE_CREATED, entityType: 'Affiliate', entityId: affiliate.id,
          newValue: { affiliateCode, email, couponCode: finalCode, status: affiliate.status },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user.id, actorRole: req.user.role,
          action: audit.actions.COUPON_CREATED, entityType: 'Coupon', entityId: coupon.id,
          newValue: { code: finalCode, discountValue, commissionRate },
        },
      });

      if (affiliate.status === 'ACTIVE') {
        await notification.create({
          userId: user.id, affiliateId: affiliate.id,
          type: notification.types.APPROVAL,
          title: 'Affiliate Account Approved',
          message: `Your affiliate account (${affiliateCode}) has been approved! Your coupon ${finalCode} is now active.`,
          data: { affiliateCode, couponCode: finalCode },
        });
        await notification.create({
          userId: user.id, affiliateId: affiliate.id,
          type: notification.types.COUPON_ACTIVATION,
          title: 'Coupon Activated',
          message: `Your unique coupon ${finalCode} has been activated with ${discountValue}% customer discount and ${commissionRate}% commission for you.`,
        });
      }

      res.json({ success: true, data: { affiliate, coupon } });
    });
  } catch (e) { next(e); }
});

router.get('/affiliates/:id', async (req, res, next) => {
  try {
    const a = await prisma.affiliate.findUnique({
      where: { id: req.params.id },
      include: { coupons: true, user: { select: { id: true, email: true, createdAt: true } } },
    });
    if (!a) return next(new AppError('Affiliate not found', 404));
    const [orders, commissions, payouts] = await Promise.all([
      prisma.order.findMany({ where: { affiliateId: a.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.commissionRecord.findMany({ where: { affiliateId: a.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.payout.findMany({ where: { affiliateId: a.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    const sumByStatus = (arr, field = 'commissionAmount') => {
      const by = {};
      for (const c of arr) by[c.status] = (by[c.status] ?? 0) + toNumber((toMoney(c[field] ?? 0).minus(c.reversalAmount ?? 0)));
      return by;
    };
    res.json({
      success: true,
      data: {
        affiliate: {
          ...a,
          commissionRate: a.commissionRate ? toNumber(a.commissionRate) : null,
          payoutAccountNumber: a.payoutAccountNumber ? '****' + a.payoutAccountNumber.slice(-4) : null,
          payoutIban: a.payoutIban ? '****' + a.payoutIban.slice(-4) : null,
          payoutBicSwift: a.payoutBicSwift ? '****' + a.payoutBicSwift.slice(-4) : null,
        },
        ordersSummary: {
          total: orders.length,
          sales: toNumber(orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => toMoney(s).plus(o.subtotal), 0)),
          discounts: toNumber(orders.reduce((s, o) => toMoney(s).plus(o.customerDiscountAmount ?? 0), 0)),
        },
        commissionsSummary: {
          total: commissions.length,
          totalAmount: toNumber(commissions.reduce((s, c) => toMoney(s).plus(c.commissionAmount).minus(c.reversalAmount ?? 0), 0)),
          byStatus: sumByStatus(commissions),
        },
        payoutsSummary: {
          total: payouts.length,
          totalPaid: toNumber(payouts.filter(p => p.status === 'PAID').reduce((s, p) => toMoney(s).plus(p.netAmount), 0)),
        },
        recent: { orders, commissions, payouts },
      },
    });
  } catch (e) { next(e); }
});

router.put('/affiliates/:id', async (req, res, next) => {
  try {
    const a = await prisma.affiliate.findUnique({ where: { id: req.params.id } });
    if (!a) return next(new AppError('Affiliate not found', 404));
    const allowed = ['name', 'phone', 'country', 'address', 'addressCity', 'addressState', 'addressZip',
      'businessName', 'businessType', 'website', 'socialProfiles', 'audienceType', 'description',
      'expectedReferralVolume', 'commissionRate', 'commissionBaseType',
      'payoutAccountHolder', 'payoutBankName', 'payoutAccountNumber',
      'payoutIban', 'payoutBicSwift', 'payoutMethod', 'payoutBillingInfo'];
    const data = {};
    for (const k of allowed) if (req.body[k] !== undefined) data[k] = req.body[k];
    if (req.body.email) data.email = req.body.email.toLowerCase();
    const updated = await prisma.affiliate.update({ where: { id: a.id }, data });
    await audit.log({
      userId: req.user.id, actorRole: req.user.role,
      action: audit.actions.AFFILIATE_UPDATED, entityType: 'Affiliate', entityId: a.id,
      oldValue: { name: a.name, email: a.email }, newValue: { name: updated.name, email: updated.email },
      req,
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

router.post('/affiliates/:id/approve', async (req, res, next) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const a = await tx.affiliate.findUnique({ where: { id: req.params.id } });
      if (!a) throw new AppError('Affiliate not found', 404);
      const updated = await tx.affiliate.update({
        where: { id: a.id },
        data: { status: 'ACTIVE', approvedAt: new Date(), rejectedAt: null, suspendedAt: null },
      });
      if (a.couponId) {
        await tx.affiliateCoupon.updateMany({
          where: { affiliateId: a.id, status: 'INACTIVE' },
          data: { status: 'ACTIVE' },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: req.user.id, actorRole: req.user.role,
          action: audit.actions.AFFILIATE_APPROVED, entityType: 'Affiliate', entityId: a.id,
          newValue: { status: 'ACTIVE' },
        },
      });
      if (updated.userId) {
        const coupon = await tx.affiliateCoupon.findFirst({ where: { affiliateId: a.id } });
        await notification.create({
          userId: updated.userId, affiliateId: a.id, type: notification.types.APPROVAL,
          title: 'Affiliate Account Approved',
          message: `Your affiliate account has been approved!${coupon ? ' Your coupon ' + coupon.couponCode + ' is now active.' : ''}`,
        });
      }
      res.json({ success: true, data: updated });
    });
  } catch (e) { next(e); }
});

router.post('/affiliates/:id/reject', async (req, res, next) => {
  try {
    const reason = req.body.reason;
    const a = await prisma.affiliate.findUnique({ where: { id: req.params.id } });
    if (!a) return next(new AppError('Affiliate not found', 404));
    const updated = await prisma.affiliate.update({
      where: { id: a.id },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: reason },
    });
    await audit.log({
      userId: req.user.id, actorRole: req.user.role,
      action: audit.actions.AFFILIATE_REJECTED, entityType: 'Affiliate', entityId: a.id,
      newValue: { status: 'REJECTED', reason }, req,
    });
    if (updated.userId) {
      await notification.create({
        userId: updated.userId, affiliateId: a.id, type: notification.types.REJECTION,
        title: 'Affiliate Application Update',
        message: `Your affiliate application has been reviewed.${reason ? ' Note: ' + reason : ''}`,
      });
    }
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

router.post('/affiliates/:id/suspend', async (req, res, next) => {
  try {
    const reason = req.body.reason;
    const a = await prisma.affiliate.findUnique({ where: { id: req.params.id } });
    if (!a) return next(new AppError('Affiliate not found', 404));
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.affiliate.update({
        where: { id: a.id },
        data: { status: 'SUSPENDED', suspendedAt: new Date(), suspensionReason: reason },
      });
      await tx.affiliateCoupon.updateMany({
        where: { affiliateId: a.id, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user.id, actorRole: req.user.role,
          action: audit.actions.AFFILIATE_SUSPENDED, entityType: 'Affiliate', entityId: a.id,
          newValue: { status: 'SUSPENDED', reason },
        },
      });
      if (updated.userId) {
        await notification.create({
          userId: updated.userId, affiliateId: a.id, type: notification.types.SUSPENSION,
          title: 'Account Suspended',
          message: 'Your affiliate account has been suspended. Please contact support for details.',
        });
      }
      res.json({ success: true, data: updated });
    });
  } catch (e) { next(e); }
});

router.post('/affiliates/:id/reactivate', async (req, res, next) => {
  try {
    const a = await prisma.affiliate.findUnique({ where: { id: req.params.id } });
    if (!a) return next(new AppError('Affiliate not found', 404));
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.affiliate.update({
        where: { id: a.id }, data: { status: 'ACTIVE', suspendedAt: null },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user.id, actorRole: req.user.role,
          action: audit.actions.AFFILIATE_REACTIVATED, entityType: 'Affiliate', entityId: a.id,
          newValue: { status: 'ACTIVE' },
        },
      });
      res.json({ success: true, data: updated });
    });
  } catch (e) { next(e); }
});

router.post('/affiliates/:id/deactivate', async (req, res, next) => {
  try {
    const a = await prisma.affiliate.findUnique({ where: { id: req.params.id } });
    if (!a) return next(new AppError('Affiliate not found', 404));
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.affiliate.update({
        where: { id: a.id },
        data: { status: 'DEACTIVATED', deactivatedAt: new Date() },
      });
      await tx.affiliateCoupon.updateMany({
        where: { affiliateId: a.id, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user.id, actorRole: req.user.role,
          action: audit.actions.AFFILIATE_DEACTIVATED, entityType: 'Affiliate', entityId: a.id,
          newValue: { status: 'DEACTIVATED' },
        },
      });
      res.json({ success: true, data: updated });
    });
  } catch (e) { next(e); }
});

// =============== COUPONS ===============
router.get('/coupons', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, affiliateId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (affiliateId) where.affiliateId = affiliateId;
    if (search) where.couponCodeNormalized = { contains: normalizeCoupon(search) };
    const [items, total] = await Promise.all([
      prisma.affiliateCoupon.findMany({
        where, orderBy: { createdAt: 'desc' },
        take: +limit, skip: (+page - 1) * +limit,
        include: { affiliate: { select: { affiliateCode: true, name: true, email: true, status: true } } },
      }),
      prisma.affiliateCoupon.count({ where }),
    ]);
    res.json({
      success: true,
      data: {
        items: items.map(c => ({
          ...c,
          discountValue: toNumber(c.discountValue),
          commissionRate: toNumber(c.commissionRate),
          minimumOrderValue: c.minimumOrderValue ? toNumber(c.minimumOrderValue) : null,
          maximumDiscount: c.maximumDiscount ? toNumber(c.maximumDiscount) : null,
        })),
        page: +page, limit: +limit, total,
      },
    });
  } catch (e) { next(e); }
});

router.post('/coupons', [
  body('affiliateId').isString().notEmpty(),
  body('couponCode').isString().notEmpty(),
  body('discountValue').isNumeric(),
  body('commissionRate').isNumeric(),
], validate, async (req, res, next) => {
  try {
    const {
      affiliateId, couponCode, discountType = 'PERCENTAGE', discountValue,
      commissionRate, commissionBaseType = 'DISCOUNTED_VALUE',
      minimumOrderValue, maximumDiscount, usageLimit, perCustomerLimit,
      eligibleProducts, excludedProducts, eligibleCategories, excludedCategories,
      allowStacking = false, startAt, expiresAt,
    } = req.body;
    const codeNormalized = normalizeCoupon(couponCode);
    const exists = await prisma.affiliateCoupon.findUnique({ where: { couponCodeNormalized: codeNormalized } });
    if (exists) throw new AppError('Coupon code already exists', 409, 'COUPON_DUPLICATE');
    const aff = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
    if (!aff) throw new AppError('Affiliate not found', 404);

    const coupon = await prisma.affiliateCoupon.create({
      data: {
        affiliateId,
        couponCode,
        couponCodeNormalized: codeNormalized,
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
        status: aff.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
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

router.put('/coupons/:id', async (req, res, next) => {
  try {
    const c = await prisma.affiliateCoupon.findUnique({ where: { id: req.params.id } });
    if (!c) return next(new AppError('Coupon not found', 404));
    const allowed = ['discountType', 'discountValue', 'commissionRate', 'commissionBaseType',
      'minimumOrderValue', 'maximumDiscount', 'usageLimit', 'perCustomerLimit',
      'eligibleProducts', 'excludedProducts', 'eligibleCategories', 'excludedCategories',
      'allowStacking', 'startAt', 'expiresAt', 'status'];
    const data = {};
    for (const k of allowed) if (req.body[k] !== undefined) data[k] = req.body[k];
    if (data.discountValue !== undefined) data.discountValue = Number(data.discountValue);
    if (data.commissionRate !== undefined) data.commissionRate = Number(data.commissionRate);
    if (data.startAt) data.startAt = new Date(data.startAt);
    if (data.expiresAt) data.expiresAt = new Date(data.expiresAt);
    if (req.body.couponCode) {
      const norm = normalizeCoupon(req.body.couponCode);
      const existing = await prisma.affiliateCoupon.findUnique({ where: { couponCodeNormalized: norm } });
      if (existing && existing.id !== c.id) throw new AppError('Coupon code already used', 409);
      data.couponCode = req.body.couponCode;
      data.couponCodeNormalized = norm;
    }
    const updated = await prisma.affiliateCoupon.update({ where: { id: c.id }, data });
    const action = updated.status === 'INACTIVE' && c.status !== 'INACTIVE'
      ? audit.actions.COUPON_DISABLED
      : audit.actions.COUPON_MODIFIED;
    await audit.log({
      userId: req.user.id, actorRole: req.user.role, action, entityType: 'Coupon', entityId: c.id,
      oldValue: c, newValue: updated, req,
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

router.post('/coupons/:id/approve', async (req, res, next) => {
  try {
    const coupon = await prisma.affiliateCoupon.findUnique({ where: { id: req.params.id } });
    if (!coupon) return next(new AppError('Coupon not found', 404));
    if (coupon.status !== 'INACTIVE') return next(new AppError('Only inactive coupons can be approved', 400));

    const approved = await prisma.affiliateCoupon.update({
      where: { id: coupon.id },
      data: { status: 'ACTIVE' },
    });
    await audit.log({
      userId: req.user.id, actorRole: req.user.role,
      action: audit.actions.COUPON_APPROVED, entityType: 'Coupon', entityId: coupon.id,
      oldValue: { status: coupon.status }, newValue: { status: approved.status }, req,
    });
    res.json({ success: true, data: approved });
  } catch (e) { next(e); }
});

// =============== COMMISSIONS ===============
router.get('/commissions', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, affiliateId, orderId, from, to } = req.query;
    const where = {};
    if (status) where.status = status;
    if (affiliateId) where.affiliateId = affiliateId;
    if (orderId) where.orderId = orderId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const [items, total] = await Promise.all([
      prisma.commissionRecord.findMany({
        where, orderBy: { createdAt: 'desc' },
        take: +limit, skip: (+page - 1) * +limit,
        include: {
          affiliate: { select: { affiliateCode: true, name: true, email: true } },
          order: { select: { orderNumber: true, customerEmail: true, status: true } },
          coupon: { select: { couponCode: true } },
        },
      }),
      prisma.commissionRecord.count({ where }),
    ]);
    res.json({
      success: true,
      data: {
        items: items.map(c => ({
          ...c,
          orderValue: toNumber(c.orderValue),
          eligibleValue: toNumber(c.eligibleValue),
          discountAmount: toNumber(c.discountAmount),
          commissionBase: toNumber(c.commissionBase),
          commissionRate: toNumber(c.commissionRate),
          commissionAmount: toNumber(c.commissionAmount),
          reversalAmount: toNumber(c.reversalAmount),
          netAmount: toNumber(subMoney(c.commissionAmount, c.reversalAmount ?? 0)),
        })),
        page: +page, limit: +limit, total,
      },
    });
  } catch (e) { next(e); }
});

router.put('/commissions/:id', async (req, res, next) => {
  try {
    const c = await prisma.commissionRecord.findUnique({ where: { id: req.params.id } });
    if (!c) return next(new AppError('Commission not found', 404));
    const allowed = ['notes', 'holdReason'];
    const data = {};
    for (const k of allowed) if (req.body[k] !== undefined) data[k] = req.body[k];
    if (req.body.commissionAmount !== undefined) {
      data.commissionAmount = toNumber(req.body.commissionAmount);
    }
    const updated = await prisma.commissionRecord.update({ where: { id: c.id }, data });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

router.post('/commissions/:id/approve', async (req, res, next) => {
  try {
    const c = await commissionEngine.approveCommission(req.params.id, { req, notes: req.body.notes });
    res.json({ success: true, data: c });
  } catch (e) { next(e); }
});

router.post('/commissions/:id/reject', async (req, res, next) => {
  try {
    const c = await commissionEngine.rejectCommission(req.params.id, { req, notes: req.body.notes });
    res.json({ success: true, data: c });
  } catch (e) { next(e); }
});

router.post('/commissions/:id/reverse', async (req, res, next) => {
  try {
    const c = await commissionEngine.reverseCommissionById(req.params.id, {
      req, amount: req.body.amount, notes: req.body.notes,
    });
    res.json({ success: true, data: c });
  } catch (e) { next(e); }
});

router.post('/commissions/:id/hold', async (req, res, next) => {
  try {
    const c = await commissionEngine.holdCommission(req.params.id, { reason: req.body.reason, req });
    res.json({ success: true, data: c });
  } catch (e) { next(e); }
});

// =============== PAYOUTS ===============
router.get('/payouts', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, affiliateId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (affiliateId) where.affiliateId = affiliateId;
    const [items, total] = await Promise.all([
      prisma.payout.findMany({
        where, orderBy: { createdAt: 'desc' },
        take: +limit, skip: (+page - 1) * +limit,
        include: {
          affiliate: { select: { affiliateCode: true, name: true, email: true } },
          items: { select: { id: true, commissionId: true, amount: true } },
        },
      }),
      prisma.payout.count({ where }),
    ]);
    res.json({
      success: true,
      data: {
        items: items.map(p => ({
          ...p,
          grossAmount: toNumber(p.grossAmount),
          adjustmentAmount: toNumber(p.adjustmentAmount),
          netAmount: toNumber(p.netAmount),
          items: p.items.map(i => ({ ...i, amount: toNumber(i.amount) })),
          commissionCount: p.items.length,
        })),
        page: +page, limit: +limit, total,
      },
    });
  } catch (e) { next(e); }
});

router.post('/payouts', [
  body('affiliateId').isString().notEmpty(),
], validate, async (req, res, next) => {
  try {
    const { affiliateId, commissionIds, adjustmentAmount = 0, paymentMethod, paymentDate, paymentReference, notes, amount } = req.body;
    const aff = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
    if (!aff) return next(new AppError('Affiliate not found', 404));

    return await prisma.$transaction(async (tx) => {
      let where = { affiliateId, status: 'APPROVED' };
      if (commissionIds && commissionIds.length) {
        where = { id: { in: commissionIds }, affiliateId, status: 'APPROVED' };
      }
      const commissions = await tx.commissionRecord.findMany({ where });
      if (!commissions.length) throw new AppError('No approved commissions to payout', 400);

      let grossAmount = toNumber(commissions.reduce((s, c) => toMoney(s).plus(c.commissionAmount).minus(c.reversalAmount ?? 0), 0));
      if (amount !== undefined) grossAmount = Math.min(grossAmount, toNumber(amount));
      const adj = toNumber(adjustmentAmount);
      const net = Math.max(0, toNumber(toMoney(grossAmount).plus(adj)));

      const payoutReference = await generatePayoutReference(tx);
      const payout = await tx.payout.create({
        data: {
          payoutReference,
          affiliateId,
          grossAmount,
          adjustmentAmount: adj,
          netAmount: net,
          currency: 'EUR',
          paymentMethod: paymentMethod || null,
          paymentDate: paymentDate ? new Date(paymentDate) : null,
          paymentReference: paymentReference || null,
          notes: notes || null,
          status: 'PENDING',
          items: {
            create: commissions.map(c => ({
              commissionId: c.id,
              amount: toNumber(subMoney(c.commissionAmount, c.reversalAmount ?? 0)),
            })),
          },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, actorRole: req.user.role,
          action: audit.actions.PAYOUT_CREATED, entityType: 'Payout', entityId: payout.id,
          newValue: { payoutReference, grossAmount, net: net, commissionCount: commissions.length },
        },
      });
      res.json({ success: true, data: payout });
    });
  } catch (e) { next(e); }
});

router.put('/payouts/:id', async (req, res, next) => {
  try {
    const p = await prisma.payout.findUnique({ where: { id: req.params.id } });
    if (!p) return next(new AppError('Payout not found', 404));
    const allowed = ['adjustmentAmount', 'paymentMethod', 'paymentDate', 'paymentReference', 'notes', 'status'];
    const data = {};
    for (const k of allowed) if (req.body[k] !== undefined) data[k] = req.body[k];
    if (data.paymentDate) data.paymentDate = new Date(data.paymentDate);
    if (data.adjustmentAmount !== undefined) {
      data.adjustmentAmount = toNumber(data.adjustmentAmount);
      data.netAmount = Math.max(0, toNumber(toMoney(p.grossAmount).plus(data.adjustmentAmount)));
    }
    const updated = await prisma.payout.update({ where: { id: p.id }, data });
    await audit.log({
      userId: req.user.id, actorRole: req.user.role,
      action: audit.actions.PAYOUT_MODIFIED, entityType: 'Payout', entityId: p.id,
      newValue: updated, req,
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

router.post('/payouts/:id/mark-paid', async (req, res, next) => {
  try {
    const { paymentDate, paymentReference, paymentProof } = req.body;
    return await prisma.$transaction(async (tx) => {
      const p = await tx.payout.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });
      if (!p) throw new AppError('Payout not found', 404);
      const updated = await tx.payout.update({
        where: { id: p.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentReference: paymentReference || p.paymentReference,
          paymentProof: paymentProof || p.paymentProof,
        },
      });
      const commissionIds = p.items.map(i => i.commissionId);
      await tx.commissionRecord.updateMany({
        where: { id: { in: commissionIds } },
        data: { status: 'PAID', paidAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user.id, actorRole: req.user.role,
          action: audit.actions.PAYOUT_PAID, entityType: 'Payout', entityId: p.id,
          newValue: { status: 'PAID', net: p.netAmount },
        },
      });
      const aff = await tx.affiliate.findUnique({ where: { id: p.affiliateId } });
      if (aff?.userId) {
        await notification.create({
          userId: aff.userId, affiliateId: aff.id,
          type: notification.types.COMMISSION_PAID,
          title: 'Commission Paid',
          message: `Your payout of ${p.netAmount} EUR (${p.payoutReference}) has been completed!`,
          data: { payoutId: p.id, amount: p.netAmount },
        });
      }
      res.json({ success: true, data: updated });
    });
  } catch (e) { next(e); }
});

// =============== REPORTS ===============
router.get('/reports/sales', async (req, res, next) => {
  try {
    const { from, to, period = '30d', affiliateId } = req.query;
    const { rangeFrom, rangeTo } = parseRange(period, from, to);
    const where = { createdAt: { gte: rangeFrom, lte: rangeTo }, affiliateId: { not: null } };
    if (affiliateId) where.affiliateId = affiliateId;
    const orders = await prisma.order.findMany({
      where, include: { affiliate: { select: { affiliateCode: true, name: true } }, coupon: { select: { couponCode: true } } },
    });
    const affiliates = {};
    for (const o of orders) {
      const k = o.affiliateId;
      if (!affiliates[k]) affiliates[k] = {
        affiliate: o.affiliate, coupon: o.coupon, orders: 0, grossSales: 0, discounts: 0, commissions: 0, refunds: 0,
      };
      const row = affiliates[k];
      const cancelled = o.status === 'CANCELLED';
      row.orders += cancelled ? 0 : 1;
      row.grossSales += toNumber(cancelled ? 0 : o.subtotal);
      row.discounts += toNumber(cancelled ? 0 : o.customerDiscountAmount ?? 0);
      row.commissions += toNumber(cancelled ? 0 : o.commissionAmount ?? 0);
      row.refunds += toNumber(o.refundedAmount ?? 0);
    }
    const rows = Object.values(affiliates).map(r => ({
      affiliate: r.affiliate,
      coupon: r.coupon,
      orders: r.orders,
      grossSales: toNumber(r.grossSales),
      discounts: toNumber(r.discounts),
      netSales: toNumber(r.grossSales - r.discounts),
      commissions: toNumber(r.commissions),
      refunds: toNumber(r.refunds),
      netRevenue: toNumber(r.grossSales - r.discounts - r.commissions - r.refunds),
    }));
    res.json({ success: true, data: { from: rangeFrom, to: rangeTo, rows } });
  } catch (e) { next(e); }
});

router.get('/reports/commissions', async (req, res, next) => {
  try {
    const { from, to, period = '30d', status, affiliateId } = req.query;
    const { rangeFrom, rangeTo } = parseRange(period, from, to);
    const where = { createdAt: { gte: rangeFrom, lte: rangeTo } };
    if (status) where.status = status;
    if (affiliateId) where.affiliateId = affiliateId;
    const items = await prisma.commissionRecord.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: {
        affiliate: { select: { affiliateCode: true, name: true } },
        order: { select: { orderNumber: true } },
        coupon: { select: { couponCode: true } },
      },
    });
    res.json({
      success: true,
      data: {
        from: rangeFrom, to: rangeTo,
        rows: items.map(c => ({
          id: c.id,
          affiliate: c.affiliate,
          orderNumber: c.order?.orderNumber,
          orderId: c.orderId,
          coupon: c.coupon,
          commissionBase: toNumber(c.commissionBase),
          commissionRate: toNumber(c.commissionRate),
          commissionAmount: toNumber(c.commissionAmount),
          reversalAmount: toNumber(c.reversalAmount),
          net: toNumber(subMoney(c.commissionAmount, c.reversalAmount ?? 0)),
          status: c.status,
          date: c.createdAt,
        })),
      },
    });
  } catch (e) { next(e); }
});

router.get('/reports/coupons', async (req, res, next) => {
  try {
    const coupons = await prisma.affiliateCoupon.findMany({
      include: {
        _count: { orders: true },
        affiliate: { select: { affiliateCode: true, name: true } },
      },
    });
    const rows = await Promise.all(coupons.map(async c => {
      const orders = await prisma.order.findMany({
        where: { affiliateCouponId: c.id, status: { not: 'CANCELLED' } },
        select: { subtotal: true, customerDiscountAmount: true, commissionAmount: true },
      });
      return {
        coupon: { code: c.couponCode, status: c.status, created: c.createdAt },
        affiliate: c.affiliate,
        usage: c.usageCount,
        usageLimit: c.usageLimit,
        orders: orders.length,
        revenue: toNumber(orders.reduce((s, o) => toMoney(s).plus(o.subtotal), 0)),
        discounts: toNumber(orders.reduce((s, o) => toMoney(s).plus(o.customerDiscountAmount ?? 0), 0)),
        commissionGenerated: toNumber(orders.reduce((s, o) => toMoney(s).plus(o.commissionAmount ?? 0), 0)),
      };
    }));
    res.json({ success: true, data: { rows } });
  } catch (e) { next(e); }
});

// =============== EXPORT ===============
const EXPORT_MIME = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  json: 'application/json',
};

router.get('/export/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    const { format = 'csv' } = req.query;
    let data = [];
    let filename = '';
    switch (type) {
      case 'affiliates': {
        const items = await prisma.affiliate.findMany({ include: { coupons: true } });
        filename = 'affiliates';
        data = items.map(a => ({
          id: a.id, code: a.affiliateCode, name: a.name, email: a.email,
          country: a.country, status: a.status,
          commissionRate: a.commissionRate?.toString(),
          coupon: a.coupons[0]?.couponCode ?? '',
          createdAt: a.createdAt,
        }));
        break;
      }
      case 'coupons': {
        const items = await prisma.affiliateCoupon.findMany({ include: { affiliate: true } });
        filename = 'coupons';
        data = items.map(c => ({
          id: c.id, code: c.couponCode, affiliate: c.affiliate?.affiliateCode,
          discount: `${c.discountType} ${c.discountValue}`,
          commission: `${c.commissionRate}%`, status: c.status, usage: c.usageCount,
          limit: c.usageLimit ?? '',
        }));
        break;
      }
      case 'orders': {
        const items = await prisma.order.findMany({ where: { affiliateId: { not: null } } });
        filename = 'referral-orders';
        data = items.map(o => ({
          id: o.id, number: o.orderNumber, customer: o.customerEmail,
          subtotal: o.subtotal.toString(), discount: (o.customerDiscountAmount ?? 0).toString(),
          commission: (o.commissionAmount ?? 0).toString(), status: o.status,
          coupon: o.affiliateCouponCode, createdAt: o.createdAt,
        }));
        break;
      }
      case 'commissions': {
        const items = await prisma.commissionRecord.findMany({ include: { affiliate: true, order: true } });
        filename = 'commission-ledger';
        data = items.map(c => ({
          id: c.id, affiliate: c.affiliate?.affiliateCode, order: c.order?.orderNumber,
          coupon: c.couponCode, base: c.commissionBase.toString(),
          rate: `${c.commissionRate}%`, amount: c.commissionAmount.toString(),
          reversal: (c.reversalAmount ?? 0).toString(), status: c.status, createdAt: c.createdAt,
        }));
        break;
      }
      case 'payouts': {
        const items = await prisma.payout.findMany({ include: { affiliate: true } });
        filename = 'payout-ledger';
        data = items.map(p => ({
          id: p.id, reference: p.payoutReference, affiliate: p.affiliate?.affiliateCode,
          gross: p.grossAmount.toString(), adj: p.adjustmentAmount.toString(),
          net: p.netAmount.toString(), method: p.paymentMethod, status: p.status,
          paidAt: p.paidAt ?? '',
        }));
        break;
      }
      default:
        return next(new AppError('Unknown export type', 400));
    }

    const ts = new Date().toISOString().slice(0, 10);
    if (format === 'json') {
      res.setHeader('Content-Type', EXPORT_MIME.json);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}-${ts}.json"`);
      return res.send(JSON.stringify(data, null, 2));
    }
    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, filename);
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', EXPORT_MIME.xlsx);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}-${ts}.xlsx"`);
      return res.send(Buffer.from(buf));
    }
    // CSV default
    if (!data.length) {
      res.setHeader('Content-Type', EXPORT_MIME.csv);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}-${ts}.csv"`);
      return res.send('');
    }
    res.setHeader('Content-Type', EXPORT_MIME.csv);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}-${ts}.csv"`);
    const keys = Object.keys(data[0]);
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const lines = [keys.join(',')].concat(data.map(r => keys.map(k => esc(r[k])).join(',')));
    res.send(lines.join('\n'));
  } catch (e) { next(e); }
});

// =============== SETTINGS ===============
router.get('/settings', async (req, res, next) => {
  try {
    const all = await settings.getAll();
    res.json({ success: true, data: all });
  } catch (e) { next(e); }
});

router.put('/settings', async (req, res, next) => {
  try {
    const entries = Object.entries(req.body);
    for (const [k, v] of entries) {
      await settings.set(k, v.value ?? v, v.type ?? (typeof v === 'boolean' ? 'boolean' : 'string'), req.user.id);
    }
    res.json({ success: true, data: await settings.getAll() });
  } catch (e) { next(e); }
});

// =============== AUDIT LOGS ===============
router.get('/audit-logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, entityType, entityId, action } = req.query;
    const where = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, orderBy: { createdAt: 'desc' }, take: +limit, skip: (+page - 1) * +limit,
        include: { user: { select: { name: true, email: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ success: true, data: { items, page: +page, limit: +limit, total } });
  } catch (e) { next(e); }
});

// =============== FRAUD ===============
router.get('/fraud-flags', async (req, res, next) => {
  try {
    const { resolved } = req.query;
    const where = {};
    if (resolved !== undefined) where.resolved = resolved === 'true';
    const items = await prisma.fraudFlag.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { affiliate: { select: { affiliateCode: true, name: true, email: true } } },
    });
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
});

router.post('/fraud-flags/:id/resolve', async (req, res, next) => {
  try {
    const { resolution } = req.body;
    const f = await prisma.fraudFlag.update({
      where: { id: req.params.id },
      data: { resolved: true, resolvedAt: new Date(), resolvedBy: req.user.id, resolution },
    });
    res.json({ success: true, data: f });
  } catch (e) { next(e); }
});

// =============== UTILS ===============
async function ensureUniqueCoupon(tx, code) {
  const norm = normalizeCoupon(code);
  const exists = await tx.affiliateCoupon.findUnique({ where: { couponCodeNormalized: norm } });
  if (!exists) return code;
  for (let i = 1; i < 1000; i++) {
    const cand = code + i;
    const e = await tx.affiliateCoupon.findUnique({ where: { couponCodeNormalized: normalizeCoupon(cand) } });
    if (!e) return cand;
  }
  throw new Error('Could not generate unique coupon');
}

function parseRange(period, from, to) {
  const now = new Date();
  let rangeFrom = new Date(now.getTime() - 30 * 86400000);
  let rangeTo = now;
  if (from) rangeFrom = new Date(from);
  if (to) rangeTo = new Date(to);
  if (period === 'today') {
    rangeFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    rangeTo = now;
  } else if (period === 'yesterday') {
    rangeFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    rangeTo = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === '7d') {
    rangeFrom = new Date(now.getTime() - 7 * 86400000);
  } else if (period === 'month') {
    rangeFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'prevMonth') {
    rangeFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    rangeTo = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { rangeFrom, rangeTo };
}

module.exports = router;
