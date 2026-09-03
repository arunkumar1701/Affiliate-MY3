const Decimal = require('decimal.js');

const toMoney = (value) => new Decimal(value ?? 0).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
const addMoney = (a, b) => toMoney(a).plus(toMoney(b));
const subMoney = (a, b) => toMoney(a).minus(toMoney(b));
const mulMoney = (a, b) => toMoney(a).times(toMoney(b));
const divMoney = (a, b) => toMoney(a).div(toMoney(b));
const percentOf = (value, pct) => toMoney(value).times(toMoney(pct)).dividedBy(100);
const gtMoney = (a, b) => toMoney(a).gt(toMoney(b));
const gteMoney = (a, b) => toMoney(a).gte(toMoney(b));
const ltMoney = (a, b) => toMoney(a).lt(toMoney(b));
const lteMoney = (a, b) => toMoney(a).lte(toMoney(b));
const eqMoney = (a, b) => toMoney(a).eq(toMoney(b));
const toNumber = (value) => Number(toMoney(value).toNumber());
const zero = () => toMoney(0);

const calcEligibleValue = (items, { eligibleProducts, excludedProducts, eligibleCategories, excludedCategories } = {}) => {
  let eligible = zero();
  const hasEligibleFilter =
    (eligibleProducts && eligibleProducts.length > 0) ||
    (eligibleCategories && eligibleCategories.length > 0);

  for (const item of items || []) {
    const id = item.productId ?? item.id;
    const cat = item.category;
    let itemEligible = true;

    if (hasEligibleFilter) {
      itemEligible = false;
      if (eligibleProducts && eligibleProducts.includes(id)) itemEligible = true;
      if (eligibleCategories && cat && eligibleCategories.includes(cat)) itemEligible = true;
    }

    if (excludedProducts && excludedProducts.includes(id)) itemEligible = false;
    if (excludedCategories && cat && excludedCategories.includes(cat)) itemEligible = false;

    if (itemEligible) {
      const lineTotal = mulMoney(item.unitPrice ?? item.price ?? 0, item.quantity ?? 1);
      eligible = eligible.plus(lineTotal);
    }
  }
  return eligible;
};

const calcCommissionBase = (eligible, discount, tax, shipping, baseType) => {
  const e = toMoney(eligible);
  const d = toMoney(discount);
  const t = toMoney(tax);
  const s = toMoney(shipping);

  switch (baseType) {
    case 'ORIGINAL_VALUE':
      return e;
    case 'DISCOUNTED_VALUE':
      return Decimal.max(zero(), e.minus(d));
    case 'EXCLUDING_TAX':
      return Decimal.max(zero(), e.minus(d).minus(t));
    case 'EXCLUDING_TAX_AND_SHIPPING':
      return Decimal.max(zero(), e.minus(d).minus(t).minus(s));
    default:
      return Decimal.max(zero(), e.minus(d).minus(s));
  }
};

const calcDiscount = (eligible, discountType, discountValue, maximumDiscount) => {
  const e = toMoney(eligible);
  const v = toMoney(discountValue);
  let discount;
  if (discountType === 'FIXED') {
    discount = Decimal.min(e, v);
  } else {
    discount = percentOf(e, v);
  }
  if (maximumDiscount) {
    discount = Decimal.min(discount, toMoney(maximumDiscount));
  }
  return Decimal.max(zero(), discount);
};

module.exports = {
  Decimal,
  toMoney,
  addMoney,
  subMoney,
  mulMoney,
  divMoney,
  percentOf,
  gtMoney,
  gteMoney,
  ltMoney,
  lteMoney,
  eqMoney,
  toNumber,
  zero,
  calcEligibleValue,
  calcCommissionBase,
  calcDiscount,
};
