const prisma = require('../config/prisma');
const { normalizeCoupon } = require('../utils/ids');
const { calcEligibleValue, calcDiscount, calcCommissionBase, toNumber, toMoney, percentOf } = require('../utils/money');
const { AppError } = require('../middleware/error');

const validateCoupon = async (couponInput, { customerId, customerEmail, items, subtotal, customerIdType } = {}) => {
  const errors = [];
  const warnings = [];

  const couponCode = normalizeCoupon(couponInput);
  if (!couponCode) {
    return { valid: false, errors: ['Coupon code is required'] };
  }

  const coupon = await prisma.affiliateCoupon.findUnique({
    where: { couponCodeNormalized: couponCode },
    include: { affiliate: true },
  });

  // 1. Coupon exists
  if (!coupon) {
    return { valid: false, errors: ['Coupon not found'] };
  }

  // 2. Coupon is active
  if (coupon.status !== 'ACTIVE') {
    errors.push(`Coupon is ${coupon.status.toLowerCase()}`);
  }

  const now = new Date();
  // 3. Coupon has started
  if (coupon.startAt && now < new Date(coupon.startAt)) {
    errors.push('Coupon is not yet valid');
  }
  // 4. Coupon has not expired
  if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
    errors.push('Coupon has expired');
    coupon.status = 'EXPIRED';
  }

  // 5. Affiliate exists & 6. Affiliate is active
  const affiliate = coupon.affiliate;
  if (!affiliate) {
    errors.push('Affiliate not found');
  } else if (affiliate.status !== 'ACTIVE') {
    errors.push(`Affiliate is ${affiliate.status.toLowerCase()} - coupon not valid`);
  }

  // 7. Global usage limit
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    errors.push('Coupon usage limit reached');
    if (coupon.status === 'ACTIVE') coupon.status = 'DEPLETED';
  }

  // 8. Customer usage limit
  if (coupon.perCustomerLimit != null && customerId) {
    const customerUses = await prisma.order.count({
      where: {
        affiliateCouponId: coupon.id,
        status: { notIn: ['CANCELLED'] },
        OR: [{ customerId }, { customerEmail }].filter((x) => Object.values(x)[0]),
      },
    });
    if (customerUses >= coupon.perCustomerLimit) {
      errors.push('Coupon usage limit reached for this customer');
    }
  }

  // 9. Minimum order value
  const orderSubtotal = subtotal != null ? subtotal : calcEligibleValue(items).toNumber();
  if (coupon.minimumOrderValue && toNumber(orderSubtotal) < toNumber(coupon.minimumOrderValue)) {
    errors.push(
      `Minimum order value of ${coupon.minimumOrderValue} required (current ${orderSubtotal})`
    );
  }

  // 10. Product eligibility / 11. Category / 12. Excluded
  const eligibleItemsValue = calcEligibleValue(items, {
    eligibleProducts: coupon.eligibleProducts,
    excludedProducts: coupon.excludedProducts,
    eligibleCategories: coupon.eligibleCategories,
    excludedCategories: coupon.excludedCategories,
  }).toNumber();

  if (items && items.length > 0 && eligibleItemsValue <= 0) {
    errors.push('No eligible items for this coupon');
  }

  // 13. Coupon stacking rules - passed by caller; if stacking disallowed and other applied, flag
  // Handled by caller if otherDiscountsApplied flag passed
  // 14. Customer eligibility (basic - placeholder for blacklist etc.)
  // 15. Order eligibility (placeholder)

  if (errors.length) {
    return { valid: false, errors, coupon: stripCoupon(coupon) };
  }

  // Calculate result (server-side, never trust frontend)
  const effectiveEligible = toMoney(Math.max(0, eligibleItemsValue || orderSubtotal));
  const discount = calcDiscount(
    effectiveEligible,
    coupon.discountType,
    coupon.discountValue,
    coupon.maximumDiscount
  );

  const eligibleForCommission = effectiveEligible.minus(discount);

  return {
    valid: true,
    coupon: stripCoupon(coupon),
    affiliate: {
      id: affiliate.id,
      affiliateCode: affiliate.affiliateCode,
      name: affiliate.name,
    },
    calculations: {
      eligibleValue: toNumber(effectiveEligible),
      discountType: coupon.discountType,
      discountValue: toNumber(coupon.discountValue),
      discountAmount: toNumber(discount),
      orderTotalAfterDiscount: toNumber(toMoney(orderSubtotal).minus(discount)),
      customerDoesNotSee: {
        commissionRate: toNumber(coupon.commissionRate),
        commissionBaseType: coupon.commissionBaseType,
      },
    },
    warnings,
  };
};

const stripCoupon = (c) => ({
  id: c.id,
  couponCode: c.couponCode,
  discountType: c.discountType,
  discountValue: toNumber(c.discountValue),
  minimumOrderValue: c.minimumOrderValue != null ? toNumber(c.minimumOrderValue) : null,
  maximumDiscount: c.maximumDiscount != null ? toNumber(c.maximumDiscount) : null,
  startAt: c.startAt,
  expiresAt: c.expiresAt,
  status: c.status,
});

module.exports = {
  validateCoupon,
  stripCoupon,
};
