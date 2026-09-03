import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import { Alert, Badge, CopyButton, formatMoney } from '../components/ui';
import { CheckCircle, Gift, LogOut, ShoppingBag, Tag, Ticket, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PageTransition, DepthCard, Reveal3D, StatusTransition, Progress3D, CheckDraw, useReducedMotion } from '../components/anim';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function CheckoutPage() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [cart] = useState([
    { id: 'SKU-200', name: 'Premium Wireless Headphones', qty: 1, price: 200.00, category: 'Electronics' },
  ]);
  const [couponInput, setCouponInput] = useState('');
  const [applied, setApplied] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [inputShake, setInputShake] = useState(false);

  useEffect(() => {
    if (error) {
      setInputShake(true);
    }
  }, [error]);

  const customerEmail = user?.email || 'customer@example.dev';
  const customerId = user?.role === 'CUSTOMER' ? user.id : undefined;

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = +(subtotal * 0).toFixed(2);
  const shipping = 0;
  const discount = applied?.calculations?.discountAmount ?? 0;
  const total = +(subtotal + tax + shipping - discount).toFixed(2);

  const applyCoupon = async () => {
    setError('');
    setLoading(true);
    setApplied(null);
    try {
      const { data } = await api.post('/coupon/apply', {
        couponCode: couponInput,
        items: cart.map(i => ({ productId: i.id, name: i.name, unitPrice: i.price, quantity: i.qty, category: i.category })),
        subtotal,
        customerEmail,
        customerId,
      });
      if (!data.success) {
        setError(data.errors?.join(', ') || 'Invalid coupon');
      } else {
        setApplied(data);
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Could not validate coupon');
    } finally {
      setLoading(false);
    }
  };

  const placeOrder = async () => {
    setOrderResult(null);
    setPaymentResult(null);
    try {
      const { data } = await api.post('/orders', {
        items: cart.map(i => ({ productId: i.id, name: i.name, unitPrice: i.price, quantity: i.qty, category: i.category })),
        couponCode: applied?.coupon?.couponCode,
        shippingAmount: 0,
        taxAmount: 0,
        customerEmail,
        customerId,
      });
      setOrderResult(data.data);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Order failed');
    }
  };

  const confirmPayment = async () => {
    try {
      const { data } = await api.post(`/orders/${orderResult.order.id}/payment-success`, {});
      setPaymentResult(data.data);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Payment simulation failed');
    }
  };

  return (
    <PageTransition key={location.pathname}>
      <div className="brand-stage min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/40">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
            <Link to="/login" className="btn-ghost !py-1.5 text-xs">← Sign in / Affiliate Portal</Link>
            <h1 className="text-2xl font-bold flex items-center gap-2 order-first sm:order-none"><ShoppingBag className="w-6 h-6 text-brand-600" /> Checkout</h1>
            <div className="w-auto sm:w-[160px] flex justify-end">
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" />{user.name || user.email}</span>
                  <motion.button whileHover={{ y: -1 }} onClick={() => { logout(); window.location.href = '/login'; }} className="btn-ghost !py-1 text-xs flex items-center gap-1"><LogOut className="w-3 h-3" />Sign out</motion.button>
                </div>
              ) : (
                <div className="hidden sm:block w-[160px]" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <DepthCard hover tilt interactive className="card overflow-hidden">
                <div className="card-header"><h2 className="font-semibold">Your Order</h2></div>
                <div className="card-body">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-4 py-4 border-b last:border-b-0">
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-2xl">🎧</div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">SKU {item.id} · Qty {item.qty}</p>
                      </div>
                      <p className="font-semibold text-slate-900">{formatMoney(item.price)}</p>
                    </div>
                  ))}
                </div>
              </DepthCard>

              <div className={clsx('card mb-5', loading && 'bg-sweep-once')}>
                <div className="card-header">
                  <h2 className="font-semibold flex items-center gap-2"><Ticket className="w-4 h-4" /> Have a referral coupon?</h2>
                </div>
                <div className="card-body">
                  {applied?.success ? (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="font-semibold text-emerald-800">Coupon <span className="font-mono">{applied.coupon.couponCode}</span> applied</p>
                          <StatusTransition status={applied.coupon?.code || 'applied'}>
                            <Badge variant="success">Active</Badge>
                          </StatusTransition>
                          {applied.coupon.couponCode && <CopyButton value={applied.coupon.couponCode} />}
                        </div>
                        <p className="mt-2 text-emerald-700 flex items-center gap-2">
                          <Gift className="w-4 h-4" />
                          Affiliate Discount: {applied.calculations.discountType === 'PERCENTAGE' ? `${applied.calculations.discountValue}%` : ''} —
                          <span className="font-bold text-emerald-800">You saved {formatMoney(applied.calculations.discountAmount)}</span>
                        </p>
                      </div>
                      <button onClick={() => setApplied(null)} className="btn-ghost !py-1 text-xs">Remove</button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <input className={clsx('input text-lg font-mono !tracking-wider flex-1', inputShake && 'input-error-anim')}
                          placeholder="e.g. ALEX10"
                          value={couponInput}
                          onChange={e => { setInputShake(false); setCouponInput(e.target.value.toUpperCase()); }}
                          onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                        />
                      </div>
                      <button onClick={applyCoupon} disabled={loading || !couponInput} className="btn-primary">
                        {loading ? 'Validating...' : 'Apply Coupon'}
                      </button>
                    </div>
                  )}
                  {error && <Alert type="danger" className="mt-4">{error}</Alert>}
                  <p className="mt-4 text-xs text-slate-500">
                    Try our demo coupon <Tag className="w-3 h-3 inline" /> <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">ALEX10</code> (10% discount — affiliate earns 5% commission, NOT visible here).
                  </p>
                </div>
              </div>

              {orderResult && !paymentResult && (
                <motion.div className="card border-2 border-brand-200 bg-brand-50/50" initial={{opacity:0,scale:.94}} animate={{opacity:1,scale:1}} transition={{duration:.45, ease:[.2,.8,.2,1]}} style={{transformStyle:'preserve-3d'}}>
                  <div className="card-header border-brand-100">
                    <h2 className="font-semibold">Order Created</h2>
                    <Badge variant="info">{orderResult.order.status}</Badge>
                  </div>
                  <div className="card-body">
                    <p>Order number: <span className="font-mono font-semibold">{orderResult.order.orderNumber}</span></p>
                    <p className="mt-1 text-sm text-slate-500">Total due: <b>{formatMoney(orderResult.order.totalAmount)}</b></p>
                    <motion.button whileHover={{y:-2}} whileTap={{scaleY:.97}} transition={{ type:'spring', stiffness:320, damping:22 }} className="btn-success w-full mt-4" onClick={confirmPayment}>
                      ✓ Simulate Successful Payment
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {paymentResult && (
                <div className="card border-2 border-emerald-200 bg-emerald-50/50">
                  <div className="card-body text-center py-8">
                    <CheckDraw size={56} strokeWidth={3.5} tone="emerald" />
                    <Reveal3D stagger={100} delay={200}>
                      <h2 className="text-xl font-bold text-emerald-800">Payment successful! Thank you 🎉</h2>
                      <p className="mt-1 text-emerald-700">Your order {paymentResult.order.orderNumber} has been confirmed.</p>
                      <div className="mt-6 text-left p-4 bg-white rounded-lg border border-emerald-100 text-sm">
                        <p className="font-semibold mb-2">Order summary</p>
                        <p>Status: <Badge variant="success">{paymentResult.order.status}</Badge></p>
                        {paymentResult.order.customerDiscountAmount > 0 && (
                          <p className="mt-1">
                            Coupon discount applied: <b className="text-emerald-700">-{formatMoney(paymentResult.order.customerDiscountAmount)}</b>
                          </p>
                        )}
                        {paymentResult.commission && (
                          <p className="mt-1 text-slate-400 text-xs">
                            🛡️ Affiliate commission will be handled internally. This is not visible to the customer (PDF §12, §50).
                          </p>
                        )}
                      </div>
                    </Reveal3D>
                  </div>
                </div>
              )}
            </div>

            <aside>
              <div className="card sticky top-4">
                <div className="card-header"><h2 className="font-semibold">Summary</h2></div>
                <div className="card-body space-y-2 text-sm">
                  <motion.div initial="hidden" animate="show" key={'totals-'+(applied?.coupon?.id||'none')} variants={{ hidden:{scale:.96,opacity:.6}, show:{scale:1,opacity:1,transition:{duration:.4,ease:[.2,.8,.2,1]}} }} style={{ transformStyle:'preserve-3d' }}>
                    <Row label="Subtotal" value={formatMoney(subtotal)} />
                    {discount > 0 && (
                      <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{ duration:.4, delay:.15 }}>
                        <Row label={<span className="text-emerald-600 font-medium">Affiliate Discount</span>} value={<span className="text-emerald-600 font-semibold">-{formatMoney(discount)}</span>} highlight />
                      </motion.div>
                    )}
                    <Row label="Shipping" value={shipping ? formatMoney(shipping) : 'FREE'} />
                    <Row label="Tax (VAT)" value={formatMoney(tax)} />
                    <div className="border-t border-slate-200 my-3"></div>
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-brand-700">{formatMoney(total)}</span>
                    </div>
                  </motion.div>
                  <motion.button whileHover={{y:-2}} whileTap={{scaleY:.97}} transition={{ type:'spring', stiffness:320, damping:22 }} className="btn-primary w-full mt-4" onClick={placeOrder} disabled={!!orderResult}>
                    {orderResult ? 'Order Created' : 'Place Order'}
                  </motion.button>
                  <p className="text-xs text-slate-400 text-center pt-2">
                    Demo checkout — no real payment processed.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

const Row = ({ label, value, highlight }) => (
  <div className={`flex items-center justify-between ${highlight ? 'py-1' : ''}`}>
    <span className="text-slate-600">{label}</span>
    <span className="text-slate-900 font-medium">{value}</span>
  </div>
);
