const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateAffiliateCode, slugToCode, normalizeCoupon } = require('../src/utils/ids');
const config = require('../src/config');

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Starting database seed...');

  // 1. Create ADMIN user
  const adminEmail = 'admin@affiliate.dev';
  const adminPass = 'admin123';
  const adminHash = await bcrypt.hash(adminPass, 10);
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'System Administrator',
        role: 'ADMIN',
        passwordHash: adminHash,
      },
    });
    console.log(`[SEED] Admin created: ${adminEmail} / ${adminPass}`);
  } else {
    console.log(`[SEED] Admin exists: ${adminEmail}`);
  }

  // 2. Create demo CUSTOMER (who will use the coupon)
  const customerEmail = 'customer@example.dev';
  let customer = await prisma.user.findUnique({ where: { email: customerEmail } });
  if (!customer) {
    customer = await prisma.user.create({
      data: {
        email: customerEmail,
        name: 'Demo Customer',
        role: 'CUSTOMER',
        passwordHash: await bcrypt.hash('customer123', 10),
      },
    });
    console.log('[SEED] Demo customer created: customer@example.dev / customer123');
  }

  // 3. Create ALEX - the mandatory demo affiliate (PDF section 70)
  const alexEmail = 'alex@affiliate.dev';
  let alex = await prisma.user.findUnique({ where: { email: alexEmail } });
  if (!alex) {
    alex = await prisma.user.create({
      data: {
        email: alexEmail,
        name: 'Alex Johnson',
        role: 'AFFILIATE',
        phone: '+34 600 000 001',
        passwordHash: await bcrypt.hash('alex1234', 10),
      },
    });
  }

  let alexAffiliate = await prisma.affiliate.findUnique({ where: { userId: alex.id } });
  if (!alexAffiliate) {
    const code = await generateAffiliateCode(prisma);
    alexAffiliate = await prisma.affiliate.create({
      data: {
        affiliateCode: code,
        userId: alex.id,
        name: 'Alex Johnson',
        email: alexEmail,
        phone: alex.phone,
        country: 'Spain',
        address: 'Gran Vía 1',
        addressCity: 'Madrid',
        addressState: 'Madrid',
        addressZip: '28013',
        businessName: 'Alex Digital Media',
        businessType: 'Content Creator',
        website: 'https://alex-digital.example',
        socialProfiles: { instagram: '@alex_digital', youtube: '@alexreviews' },
        audienceType: 'Tech / eCommerce Enthusiasts',
        description: 'Tech content creator with 50K+ followers. Posts product reviews, buying guides.',
        expectedReferralVolume: '100-500 orders/month',
        status: 'ACTIVE',
        approvedAt: new Date(),
        commissionRate: 5.0,
        commissionBaseType: 'DISCOUNTED_VALUE',
        payoutAccountHolder: 'Alex Johnson',
        payoutBankName: 'Santander',
        payoutAccountNumber: '1234567890',
        payoutIban: 'ES12 3456 7890 1234 5678 9012',
        payoutBicSwift: 'BSCHESMM',
        payoutMethod: 'BANK_TRANSFER',
      },
    });
    console.log(`[SEED] Affiliate Alex created: ${code} (${alexEmail} / alex1234)`);
  }

  // Create ALEX10 coupon with exact PDF config (section 70): 10% discount, 5% commission, base=DISCOUNTED_VALUE, min payout €50
  const alexCouponExists = await prisma.affiliateCoupon.findFirst({
    where: { affiliateId: alexAffiliate.id, couponCodeNormalized: 'ALEX10' },
  });
  if (!alexCouponExists) {
    await prisma.affiliateCoupon.create({
      data: {
        affiliateId: alexAffiliate.id,
        couponCode: 'ALEX10',
        couponCodeNormalized: 'ALEX10',
        discountType: 'PERCENTAGE',
        discountValue: 10.0,
        commissionRate: 5.0,
        commissionBaseType: 'DISCOUNTED_VALUE',
        minimumOrderValue: null,
        maximumDiscount: null,
        usageLimit: null,
        perCustomerLimit: null,
        startAt: null,
        expiresAt: null,
        status: 'ACTIVE',
      },
    });
    console.log('[SEED] Coupon ALEX10 created: 10% customer discount, 5% affiliate commission');
  }

  // 4. Create another demo affiliate: JOHN
  const johnEmail = 'john@affiliate.dev';
  let john = await prisma.user.findUnique({ where: { email: johnEmail } });
  if (!john) {
    john = await prisma.user.create({
      data: {
        email: johnEmail,
        name: 'John Smith',
        role: 'AFFILIATE',
        phone: '+44 20 0000 0002',
        passwordHash: await bcrypt.hash('john1234', 10),
      },
    });
  }
  let johnAffiliate = await prisma.affiliate.findUnique({ where: { userId: john.id } });
  if (!johnAffiliate) {
    const code = await generateAffiliateCode(prisma);
    johnAffiliate = await prisma.affiliate.create({
      data: {
        affiliateCode: code,
        userId: john.id,
        name: 'John Smith',
        email: johnEmail,
        phone: john.phone,
        country: 'United Kingdom',
        address: '10 Downing St',
        addressCity: 'London',
        addressState: 'England',
        addressZip: 'SW1A 2AA',
        businessName: 'John Deals',
        businessType: 'Coupon Site',
        website: 'https://johndeals.example',
        audienceType: 'Deal hunters',
        description: 'UK coupon and deals aggregator',
        expectedReferralVolume: '500-2000 orders/month',
        status: 'PENDING',
        commissionRate: 7.0,
        commissionBaseType: 'DISCOUNTED_VALUE',
      },
    });
    await prisma.affiliateCoupon.create({
      data: {
        affiliateId: johnAffiliate.id,
        couponCode: 'JOHN10',
        couponCodeNormalized: 'JOHN10',
        discountType: 'PERCENTAGE',
        discountValue: 10.0,
        commissionRate: 7.0,
        commissionBaseType: 'DISCOUNTED_VALUE',
        status: johnAffiliate.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      },
    });
    console.log(`[SEED] Pending Affiliate John: ${code} (JOHN10) - for admin approval demo`);
  }

  // 5. Create repeatable demo orders, commissions, and payout records for dashboards/reports.
  const demoCustomers = [
    { email: 'maria.demo@example.dev', name: 'Maria Garcia' },
    { email: 'sam.demo@example.dev', name: 'Sam Wilson' },
    { email: 'lena.demo@example.dev', name: 'Lena Novak' },
  ];
  const customers = [];
  for (const customerData of demoCustomers) {
    const demoCustomer = await prisma.user.upsert({
      where: { email: customerData.email },
      update: { name: customerData.name, role: 'CUSTOMER' },
      create: {
        email: customerData.email,
        name: customerData.name,
        role: 'CUSTOMER',
        passwordHash: await bcrypt.hash('customer123', 10),
      },
    });
    customers.push(demoCustomer);
  }

  const alexCoupon = await prisma.affiliateCoupon.findUnique({
    where: { couponCodeNormalized: 'ALEX10' },
  });
  if (alexCoupon) {
    const demoOrders = [
      { orderNumber: 'DEMO-1001', customer: customers[0], subtotal: 200, discount: 20, total: 180, commission: 9, status: 'PAID', daysAgo: 12, commissionStatus: 'APPROVED' },
      { orderNumber: 'DEMO-1002', customer: customers[1], subtotal: 150, discount: 15, total: 135, commission: 6.75, status: 'PAID', daysAgo: 5, commissionStatus: 'PENDING' },
      { orderNumber: 'DEMO-1003', customer: customers[2], subtotal: 320, discount: 32, total: 288, commission: 14.4, status: 'PAID', daysAgo: 2, commissionStatus: 'PAID' },
    ];

    for (const demo of demoOrders) {
      const createdAt = new Date(Date.now() - demo.daysAgo * 24 * 60 * 60 * 1000);
      const order = await prisma.order.upsert({
        where: { orderNumber: demo.orderNumber },
        update: {
          customerId: demo.customer.id,
          customerEmail: demo.customer.email,
          affiliateId: alexAffiliate.id,
          affiliateCouponId: alexCoupon.id,
          affiliateCouponCode: alexCoupon.couponCode,
          customerDiscountRate: 10,
          customerDiscountAmount: demo.discount,
          commissionRate: 5,
          commissionBaseType: 'DISCOUNTED_VALUE',
          commissionBaseAmount: demo.total,
          commissionAmount: demo.commission,
          status: demo.status,
        },
        create: {
          orderNumber: demo.orderNumber,
          customerId: demo.customer.id,
          customerEmail: demo.customer.email,
          subtotal: demo.subtotal,
          taxAmount: 0,
          shippingAmount: 0,
          totalAmount: demo.total,
          currency: 'EUR',
          items: [{ productId: 'SKU-200', name: 'Premium Wireless Headphones', unitPrice: demo.subtotal, quantity: 1, category: 'Electronics' }],
          affiliateId: alexAffiliate.id,
          affiliateCouponId: alexCoupon.id,
          affiliateCouponCode: alexCoupon.couponCode,
          customerDiscountRate: 10,
          customerDiscountAmount: demo.discount,
          commissionRate: 5,
          commissionBaseType: 'DISCOUNTED_VALUE',
          commissionBaseAmount: demo.total,
          commissionAmount: demo.commission,
          status: demo.status,
          paymentId: `demo-payment-${demo.orderNumber}`,
          paymentProvider: 'DEMO',
          paymentSuccessAt: createdAt,
          createdAt,
        },
      });

      const commission = await prisma.commissionRecord.upsert({
        where: { idempotencyKey: `demo-commission-${demo.orderNumber}` },
        update: {
          affiliateId: alexAffiliate.id,
          orderId: order.id,
          couponId: alexCoupon.id,
          couponCode: alexCoupon.couponCode,
          orderValue: demo.subtotal,
          eligibleValue: demo.subtotal,
          discountAmount: demo.discount,
          commissionBase: demo.total,
          commissionRate: 5,
          commissionAmount: demo.commission,
          status: demo.commissionStatus,
          approvedAt: demo.commissionStatus === 'APPROVED' ? createdAt : null,
          paidAt: demo.commissionStatus === 'PAID' ? createdAt : null,
        },
        create: {
          idempotencyKey: `demo-commission-${demo.orderNumber}`,
          affiliateId: alexAffiliate.id,
          orderId: order.id,
          couponId: alexCoupon.id,
          couponCode: alexCoupon.couponCode,
          orderValue: demo.subtotal,
          eligibleValue: demo.subtotal,
          discountAmount: demo.discount,
          commissionBase: demo.total,
          commissionRate: 5,
          commissionAmount: demo.commission,
          currency: 'EUR',
          status: demo.commissionStatus,
          customerRef: demo.customer.email,
          createdAt,
          approvedAt: demo.commissionStatus === 'APPROVED' ? createdAt : null,
          paidAt: demo.commissionStatus === 'PAID' ? createdAt : null,
        },
      });

      if (demo.commissionStatus === 'PAID') {
        const payout = await prisma.payout.upsert({
          where: { payoutReference: 'DEMO-PAYOUT-1001' },
          update: { affiliateId: alexAffiliate.id, grossAmount: demo.commission, netAmount: demo.commission, status: 'PAID', paidAt: createdAt, paymentDate: createdAt },
          create: {
            payoutReference: 'DEMO-PAYOUT-1001',
            affiliateId: alexAffiliate.id,
            grossAmount: demo.commission,
            adjustmentAmount: 0,
            netAmount: demo.commission,
            currency: 'EUR',
            status: 'PAID',
            paymentMethod: 'BANK_TRANSFER',
            paymentDate: createdAt,
            paymentReference: 'DEMO-TRANSFER-1001',
            paidAt: createdAt,
            notes: 'Seeded demonstration payout',
            createdAt,
          },
        });
        await prisma.payoutItem.upsert({
          where: { payoutId_commissionId: { payoutId: payout.id, commissionId: commission.id } },
          update: { amount: demo.commission },
          create: { payoutId: payout.id, commissionId: commission.id, amount: demo.commission },
        });
      }
    }
    await prisma.affiliateCoupon.update({ where: { id: alexCoupon.id }, data: { usageCount: demoOrders.length } });
    console.log('[SEED] Demo orders, commission ledger, and payout records upserted');
  }

  // 6. System settings
  const defaults = {
    MINIMUM_PAYOUT_THRESHOLD: { value: '50', type: 'number' },
    DEFAULT_COMMISSION_APPROVAL_DAYS: { value: '14', type: 'number' },
    ALLOW_COUPON_STACKING: { value: 'false', type: 'boolean' },
    DEFAULT_CURRENCY: { value: 'EUR', type: 'string' },
    SELF_REFERRAL_CHECK: { value: 'true', type: 'boolean' },
  };
  for (const [k, v] of Object.entries(defaults)) {
    await prisma.systemSetting.upsert({
      where: { key: k },
      update: {},
      create: { key: k, value: v.value, type: v.type },
    });
  }
  console.log('[SEED] System settings written (min payout = 50 EUR)');

  console.log('\n================================');
  console.log('[SEED] Complete! Logins:');
  console.log(`  Admin:    ${adminEmail} / admin123`);
  console.log(`  Alex:     ${alexEmail} / alex1234  (ACTIVE, coupon ALEX10, 10% discount, 5% commission)`);
  console.log(`  John:     ${johnEmail} / john1234  (PENDING approval - for workflow demo)`);
  console.log(`  Customer: ${customerEmail} / customer123`);
  console.log(`  Mandatory demo scenario (PDF §70):`);
  console.log(`    Coupon ALEX10 → 10% customer discount, 5% affiliate commission on discounted value`);
  console.log(`    €200 order → Customer pays €180, Alex earns €9 commission`);
  console.log('================================');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('[SEED] Failed:', e);
    process.exit(1);
  });
