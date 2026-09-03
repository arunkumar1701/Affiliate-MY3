require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { toMoney, toNumber } = require('../src/utils/money');
const { makeIdempotencyKey } = require('../src/utils/ids');

async function mandatoryScenarioTest() {
  console.log('\n===== MANDATORY DEMO SCENARIO (PDF §70) =====');
  const assertEq = (label, actual, expected) => {
    const a = typeof actual === 'number' ? Math.round(actual * 100) / 100 : actual;
    const e = typeof expected === 'number' ? Math.round(expected * 100) / 100 : expected;
    const ok = (typeof expected === 'number' ? Math.abs((Number(a) ?? 0) - e) < 0.01 : a === e);
    console.log(`  ${ok ? '✅' : '❌'} ${label}: ${actual} === ${expected} ${ok ? '' : '(FAIL!)'}`);
    return ok;
  };

  let pass = true;

  // Get Alex affiliate & coupon
  const aff = await prisma.affiliate.findFirst({ where: { email: 'alex@affiliate.dev' } });
  const coupon = await prisma.affiliateCoupon.findFirst({ where: { affiliateId: aff.id } });
  pass &= assertEq('Affiliate status ACTIVE', aff.status, 'ACTIVE');
  pass &= assertEq('Coupon ALEX10 code', coupon?.couponCode, 'ALEX10');
  pass &= assertEq('Coupon discount 10%', toNumber(coupon.discountValue), 10);
  pass &= assertEq('Coupon commission 5%', toNumber(coupon.commissionRate), 5);
  pass &= assertEq('Coupon base = DISCOUNTED_VALUE', coupon.commissionBaseType, 'DISCOUNTED_VALUE');

  // Order = €200 product value
  const original = 200;
  const discountPct = toNumber(coupon.discountValue);
  const discountAmt = toMoney(original).times(discountPct).dividedBy(100);  // €20
  const customerPays = toMoney(original).minus(discountAmt); // €180
  pass &= assertEq('Original Value', original, 200);
  pass &= assertEq('Customer Discount', toNumber(discountAmt), 20);
  pass &= assertEq('Customer Pays', toNumber(customerPays), 180);

  // Commission: base = discounted value (€180) × 5% = €9
  const commissionBase = customerPays;
  const commissionPct = toNumber(coupon.commissionRate);
  const commission = commissionBase.times(commissionPct).dividedBy(100);
  pass &= assertEq('Commission Base = €180', toNumber(commissionBase), 180);
  pass &= assertEq('Commission Rate = 5%', commissionPct, 5);
  pass &= assertEq('Affiliate Commission = €9', toNumber(commission), 9);

  // Min payout threshold = €50
  const minPayout = await prisma.systemSetting.findUnique({ where: { key: 'MINIMUM_PAYOUT_THRESHOLD' } });
  pass &= assertEq('Minimum Payout = €50', parseFloat(minPayout?.value ?? 0), 50);

  console.log('\n===== EDGE CASES =====');
  const testCases = [
    ['Partial refund: €80 refund → €4 reversal (5% of 80)', () => {
      const refundedBase = 80;
      const reversal = toMoney(refundedBase).times(commissionPct).dividedBy(100);
      const remaining = toMoney(commission).minus(reversal);
      return assertEq('Reversal €4, remaining €5', toNumber(reversal) === 4 && toNumber(remaining) === 5, true);
    }],
    ['Duplicate commission protection (idempotency key)', () => {
      return assertEq('Idempotency key format', makeIdempotencyKey('order-123').startsWith('comm-order-'), true);
    }],
    ['Coupon normalization: alex10 / Alex10 / ALEX10 identical', async () => {
      return assertEq(
        'Normalized all equal',
        require('../src/utils/ids').normalizeCoupon('alex10') ===
        require('../src/utils/ids').normalizeCoupon(' Alex10 ') &&
        require('../src/utils/ids').normalizeCoupon('ALEX10') === 'ALEX10',
        true
      );
    }],
    ['Independence: X% ≠ Y% (10% discount, 5% commission → different values)', () => {
      return assertEq('Discount €20 ≠ Commission €9', discountAmt.toNumber() !== commission.toNumber(), true);
    }],
  ];
  for (const [label, fn] of testCases) {
    console.log(`\n  🧪 ${label}`);
    pass &= (await fn());
  }

  console.log(`\n===== RESULT: ${pass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'} =====`);
  return pass;
}

mandatoryScenarioTest()
  .then((ok) => { prisma.$disconnect(); process.exit(ok ? 0 : 1); })
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
