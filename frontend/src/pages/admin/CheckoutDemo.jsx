import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Alert, Badge, formatMoney, statusBadge } from '../../components/ui';
import { CheckCircle, ExternalLink, Gift, Play, Rocket, ShoppingBag, Tag, Ticket, Wallet } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageTransition, DepthCard, Reveal3D } from '../../components/anim';

const SCENARIOS = [
  {
    id: 'mandatory',
    label: 'Mandatory Demo (PDF §70)',
    description: 'Coupon ALEX10 — €200 order → 10% customer discount → 5% affiliate commission on discounted value.',
    coupon: 'ALEX10',
    productName: 'Premium Wireless Headphones',
    price: 200.00,
    expectedDiscount: 20,
    expectedCustomerPay: 180,
    expectedCommission: 9,
    expectedCommissionBase: 180,
    tags: ['Mandatory', 'PDF §70', 'Core Scenario'],
  },
  {
    id: 'fixed-discount',
    label: 'Fixed-Amount Discount',
    description: 'Fixed €25 off a €150 order → Customer pays €125, Affiliate earns 5% on discounted value.',
    coupon: 'SAVE25',
    productName: 'Smart Fitness Watch',
    price: 150.00,
    tags: ['Fixed Discount', 'Edge Case'],
  },
  {
    id: 'high-ticket',
    label: 'High-Ticket Item + Min Order Threshold',
    description: '€2,000 item — tests min order value validation and large commission numbers.',
    coupon: 'PREMIUM5',
    productName: 'Professional Drone Kit',
    price: 2000.00,
    tags: ['High Ticket', 'Min Order'],
  },
  {
    id: 'multi-item',
    label: 'Multi-Item Cart',
    description: '3 items totaling €500 — validates line-item aggregation and percentage discount math.',
    coupon: 'BUNDLE10',
    productName: 'Home Office Bundle (3 items)',
    price: 500.00,
    tags: ['Multi-Item', 'Cart Aggregation'],
  },
];

export default function AdminCheckoutDemo() {
  const location = useLocation();
  const [scenarioId, setScenarioId] = useState('mandatory');
  const scenario = SCENARIOS.find(s => s.id === scenarioId);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [couponApplied, setCouponApplied] = useState(null);
  const [orderCreated, setOrderCreated] = useState(null);
  const [paymentDone, setPaymentDone] = useState(null);

  const runDemo = async () => {
    setError(''); setStep(0); setCouponApplied(null); setOrderCreated(null); setPaymentDone(null); setLoading(true);
    try {
      const cart = [{ productId: `SKU-DEMO-${scenarioId}`, name: scenario.productName, unitPrice: scenario.price, quantity: 1 }];
      const subtotal = scenario.price;

      setStep(1);
      const { data: applyRes } = await api.post('/coupon/apply', {
        couponCode: scenario.coupon,
        items: cart,
        subtotal,
        customerEmail: `demo+${scenarioId}@example.dev`,
      });
      if (!applyRes.success) {
        throw new Error(applyRes.errors?.join(', ') || 'Coupon invalid');
      }
      setCouponApplied(applyRes);

      setStep(2);
      const { data: orderRes } = await api.post('/orders', {
        items: cart,
        couponCode: scenario.coupon,
        shippingAmount: 0,
        taxAmount: 0,
        customerEmail: `demo+${scenarioId}@example.dev`,
      });
      setOrderCreated(orderRes.data);

      setStep(3);
      const { data: payRes } = await api.post(`/orders/${orderRes.data.order.id}/payment-success`, {
        paymentId: `pay_demo_${Date.now()}`,
        paymentProvider: 'demo',
        idempotencyKey: `demo-${scenarioId}-${Date.now()}`,
      });
      setPaymentDone(payRes.data);
      setStep(4);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message || 'Demo failed. Try creating the affiliate & coupon first.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition key={location.pathname}>
    <div className="max-w-5xl mx-auto space-y-6">
      <Reveal3D stagger={80}>
      <div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white">
            <Rocket className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mandatory Scenario Demo</h1>
            <p className="text-slate-500 mt-0.5">End-to-end checkout flows with automatic coupon → order → payment → commission pipeline.</p>
          </div>
        </div>
      </div>

      <Alert type="info" className="!bg-blue-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-blue-800">🚀 Before running: Seed required data first</p>
            <p className="text-blue-700 text-sm mt-0.5">
              Run backend seed or manually create the affiliate + coupon for this scenario. Then launch the public checkout page for a real test.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/checkout" target="_blank" className="btn-secondary"><ExternalLink className="w-4 h-4" /> Open Public Checkout</Link>
          </div>
        </div>
      </Alert>
      </Reveal3D>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-700">Choose Scenario</h2>
          <Reveal3D stagger={70} delay={100}>
          {SCENARIOS.map(s => (
            <motion.button
              key={s.id}
              whileHover={{ y: -2 }}
              whileTap={{ scaleY: 0.97 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              onClick={() => setScenarioId(s.id)}
              className={`w-full text-left card !p-4 transition-all ${scenarioId === s.id ? 'ring-2 ring-brand-500 border-brand-300' : 'hover:border-slate-300'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{s.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.tags.map(t => <Badge key={t} variant="info" className="text-[10px] !py-0">{t}</Badge>)}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-sm font-bold text-brand-700">{s.coupon}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatMoney(s.price)}</p>
                </div>
              </div>
            </motion.button>
          ))}
          </Reveal3D>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <DepthCard hover className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Demo Cart — {scenario.label}</h2>
              <Badge variant="brand">{scenario.coupon}</Badge>
            </div>
            <div className="card-body space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-2xl">📦</div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{scenario.productName}</p>
                  <p className="text-xs text-slate-500">Quantity: 1</p>
                </div>
                <p className="font-bold text-lg">{formatMoney(scenario.price)}</p>
              </div>
              <div className="text-sm space-y-2 px-1">
                <Row label="Subtotal" value={formatMoney(scenario.price)} />
                <Row label="Shipping" value="FREE" />
                <Row label="Tax" value={formatMoney(0)} />
                {couponApplied?.calculations && (
                  <Row
                    label={<span className="text-emerald-600 font-medium flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> Coupon {scenario.coupon} Applied</span>}
                    value={<span className="text-emerald-600 font-bold">-{formatMoney(couponApplied.calculations.discountAmount)}</span>}
                  />
                )}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-brand-700">{formatMoney(orderCreated ? orderCreated.order.totalAmount : scenario.price)}</span>
                </div>
              </div>
            </div>
          </DepthCard>

          <DepthCard hover className="card">
            <div className="card-header"><h2 className="font-semibold">Pipeline Steps</h2></div>
            <div className="card-body space-y-3">
              {[
                { id: 1, title: 'Validate & Apply Coupon', desc: `/coupon/apply — validates code, eligibility, date, limits, usage count`, icon: Ticket },
                { id: 2, title: 'Create Order (CREATED)', desc: `/orders — applies discount, creates attribution row (affiliateId, commissionBase, commissionAmount)`, icon: ShoppingBag },
                { id: 3, title: 'Simulate Payment (PAID)', desc: `/orders/:id/payment-success — idempotent, increments coupon usage, generates CommissionRecord (PENDING), creates referral record`, icon: CheckCircle },
                { id: 4, title: 'Commission Created ✅', desc: 'Verify commission ledger at Admin → Commissions. Status = PENDING (PDF §37).', icon: Wallet },
              ].map(s => (
                <Step key={s.id} current={step} num={s.id} {...s} />
              ))}
            </div>
          </DepthCard>

          {error && <Alert type="danger">{error}</Alert>}

          <div className="flex gap-3">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scaleY: 0.97 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="btn-primary text-base !py-3 !px-6"
              onClick={runDemo}
              disabled={loading}
            >
              {loading ? <><Play className="w-4 h-4 animate-spin" /> Running...</> : <><Play className="w-4 h-4" /> Run End-to-End Demo</>}
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scaleY: 0.97 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="btn-secondary"
              onClick={() => { setStep(0); setCouponApplied(null); setOrderCreated(null); setPaymentDone(null); setError(''); }}
            >
              Reset
            </motion.button>
          </div>

          {paymentDone && (
            <DepthCard hover className="card border-2 border-emerald-200 bg-emerald-50/50">
              <div className="card-header border-emerald-200"><h2 className="font-semibold text-emerald-800 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Demo Complete — Results</h2></div>
              <div className="card-body space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Result label="Order #" value={paymentDone.order.orderNumber} mono />
                  <Result label="Customer Pays" value={formatMoney(paymentDone.order.totalAmount)} />
                  <Result label="Discount" value={formatMoney(paymentDone.order.customerDiscountAmount ?? 0)} tone="emerald" />
                  <Result label="Commission Status" value={paymentDone.commission ? statusBadge(paymentDone.commission.status) : statusBadge('ON_HOLD')} />
                </div>
                {paymentDone.commission && (
                  <div className="p-4 rounded-xl bg-white border border-emerald-200 text-sm space-y-1">
                    <p className="font-semibold text-emerald-800 mb-2">Commission Calculation Breakdown</p>
                    <ResultRow label="Commission Base (after discount)" value={formatMoney(paymentDone.commission.commissionBase)} />
                    <ResultRow label={`× Commission Rate`} value={`${paymentDone.commission.commissionRate}%`} />
                    <ResultRow label="= Commission Amount (GROSS)" value={formatMoney(paymentDone.commission.commissionAmount)} highlight />
                    <ResultRow label="Net (after reversals)" value={formatMoney(Number(paymentDone.commission.commissionAmount) - Number(paymentDone.commission.reversalAmount ?? 0))} bold />
                  </div>
                )}
                {scenario.expectedCommission && (
                  <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 text-sm">
                    <p className="font-semibold text-brand-800 mb-1">Expected (PDF §70)</p>
                    <p className="text-brand-700">
                      Customer pays <b>{formatMoney(scenario.expectedCustomerPay)}</b> (discount {formatMoney(scenario.expectedDiscount)}) · Affiliate earns <b>{formatMoney(scenario.expectedCommission)}</b> (base {formatMoney(scenario.expectedCommissionBase)} × 5%).
                    </p>
                  </div>
                )}
              </div>
            </DepthCard>
          )}
        </div>
      </div>
    </div>
    </PageTransition>
  );
}

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between"><span className="text-slate-500">{label}</span><span className="text-slate-900 font-medium">{value}</span></div>
);

const ResultRow = ({ label, value, highlight, bold }) => (
  <div className={`flex items-center justify-between ${highlight ? 'pt-2 mt-1 border-t border-slate-200' : ''}`}>
    <span className="text-slate-600">{label}</span>
    <span className={`${bold || highlight ? 'font-bold text-brand-700' : 'text-slate-900 font-medium'}`}>{value}</span>
  </div>
);

const Result = ({ label, value, mono, tone }) => (
  <div>
    <p className="text-xs text-slate-500 font-medium">{label}</p>
    <p className={`mt-1 font-bold text-slate-900 ${mono ? 'font-mono' : ''} ${tone === 'emerald' ? 'text-emerald-700' : ''}`}>{value}</p>
  </div>
);

function Step({ num, title, desc, current, icon: Icon }) {
  const done = current >= num;
  const active = current === num;
  return (
    <div className={`flex gap-3 p-3 rounded-xl transition-all ${done ? 'bg-emerald-50 border border-emerald-200' : active ? 'bg-brand-50 border-2 border-brand-300' : 'bg-slate-50 border border-slate-200'}`}>
      <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-600 text-white animate-pulse' : 'bg-slate-300 text-slate-600'}`}>
        {done ? <CheckCircle className="w-5 h-5" /> : num}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold flex items-center gap-1.5 ${done ? 'text-emerald-800' : active ? 'text-brand-800' : 'text-slate-700'}`}>
          <Icon className="w-4 h-4" />{title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
