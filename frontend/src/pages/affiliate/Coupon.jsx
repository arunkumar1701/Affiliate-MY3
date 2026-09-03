import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Alert, Badge, CopyButton, EmptyState, formatDate, formatMoney, Modal } from '../../components/ui';
import { Ticket, Gift, Wallet, Calendar, Shield, BarChart3, Share2, Link2, MessageSquare, Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { PageTransition, DepthCard, StatusTransition, AnimatedCounter } from '../../components/anim';

export default function AffiliateCoupon() {
  const location = useLocation();
  const [coupon, setCoupon] = useState(null);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/affiliate/coupon');
        setCoupon(data.data);
      } catch (e) { setError('Could not load coupon'); }
    })();
  }, []);

  if (error) return <Alert type="danger">{error}</Alert>;
  if (!coupon) return (
    <PageTransition key={location.pathname}>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">My Affiliate Coupon</h1>
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Add Coupon
          </button>
        </div>
        <EmptyState title="No coupon yet" description="Create your first coupon to start sharing it with customers." />
        <CreateAffiliateCouponModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); window.location.reload(); }} />
      </div>
    </PageTransition>
  );

  const shareText = `Use my code ${coupon.couponCode} for ${coupon.customerDiscountValue}% off!`;
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/checkout?ref=${coupon.couponCode}` : '';

  return (
    <PageTransition key={location.pathname}>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">My Affiliate Coupon</h1>
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Add Coupon
          </button>
        </div>

        <DepthCard tilt hover interactive>
          <div className="relative overflow-hidden rounded-2xl">
            <div className="bg-sweep absolute inset-0 bg-gradient-to-br from-brand-600 via-indigo-600 to-purple-700"></div>
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10"></div>
            <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/10"></div>
            <div className="relative p-8 md:p-10 text-white">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 text-white/80 text-sm font-semibold uppercase tracking-wider">
                    <Ticket className="w-4 h-4" /> Your Coupon
                  </div>
                  <p className="mt-3 font-mono font-black text-6xl md:text-7xl tracking-[0.05em] drop-shadow-sm">
                    {coupon.couponCode}
                  </p>
                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    <Badge variant="default" className="!bg-white/20 !text-white !px-3 !py-1">
                      <Gift className="w-3.5 h-3.5" /> {coupon.customerDiscountValue}% OFF for customers
                    </Badge>
                    <Badge variant="default" className="!bg-emerald-400/30 !text-white !px-3 !py-1">
                      <Wallet className="w-3.5 h-3.5" /> You earn {coupon.myCommissionRate}% commission
                    </Badge>
                    <StatusTransition status={coupon?.status}>
                      {coupon.status === 'ACTIVE' ? (
                        <Badge variant="success" className="!px-3 !py-1">● Active</Badge>
                      ) : (
                        <Badge variant="warning" className="!px-3 !py-1">● {coupon.status}</Badge>
                      )}
                    </StatusTransition>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-[180px] border border-white/10">
                  <p className="text-white/70 text-xs uppercase tracking-wide">Commission Rule</p>
                  <p className="mt-1 text-sm font-medium">{coupon.commissionBaseType.replace(/_/g, ' ')}</p>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-white/70 text-xs uppercase tracking-wide">Usage</p>
                    <p className="mt-1 font-semibold"><AnimatedCounter value={coupon.usageCount} decimals={0} />{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ' ∞'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-3">
                <CopyButton value={coupon.couponCode} label="📋 Copy Code" />
                <CopyButton value={shareUrl} label="🔗 Copy Share Link" />
                {navigator.share && (
                  <button className="btn-secondary !bg-white/10 !border-white/20 !text-white hover:!bg-white/20" onClick={async () => {
                    try {
                      await navigator.share({ title: 'My Affiliate Coupon', text: shareText, url: shareUrl });
                    } catch {}
                  }}>
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                )}
              </div>
            </div>
          </div>
        </DepthCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DepthCard hover>
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Coupon Configuration</h2>
              </div>
              <div className="card-body space-y-3 text-sm">
                <InfoRow label="Customer Discount" value={coupon.customerDiscountType === 'FIXED' ? formatMoney(coupon.customerDiscountValue) : `${coupon.customerDiscountValue}%`} />
                <InfoRow label="Your Commission Rate" value={`${coupon.myCommissionRate}%`} strong />
                <InfoRow label="Commission Base" value={coupon.commissionBaseType.replace(/_/g, ' ')} />
                {coupon.minimumOrderValue != null && <InfoRow label="Minimum Order" value={formatMoney(coupon.minimumOrderValue)} />}
                {coupon.maximumDiscount != null && <InfoRow label="Max Discount" value={formatMoney(coupon.maximumDiscount)} />}
                {coupon.perCustomerLimit != null && <InfoRow label="Per Customer Limit" value={`${coupon.perCustomerLimit} uses`} />}
              </div>
            </div>
          </DepthCard>

          <DepthCard hover>
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold flex items-center gap-2"><Calendar className="w-4 h-4" /> Validity</h2>
              </div>
              <div className="card-body space-y-3 text-sm">
                <InfoRow label="Activated" value={formatDate(coupon.startAt || 'Immediately')} />
                <InfoRow label="Expires" value={coupon.expiresAt ? formatDate(coupon.expiresAt) : 'Never'} />
                <InfoRow label="Current Status" value={coupon.status} />
                <div className="pt-4 mt-2 border-t border-slate-100 space-y-2">
                  <p className="flex items-start gap-2 text-xs text-slate-500">
                    <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Discount (X%) and Commission (Y%) are calculated independently (PDF §13, §72).
                  </p>
                  <p className="flex items-start gap-2 text-xs text-slate-500">
                    <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Need a different code or higher commission? Contact your account manager.
                  </p>
                  <p className="flex items-start gap-2 text-xs text-slate-500">
                    <Link2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Share link appends <code className="font-mono bg-slate-100 px-1 rounded">?ref={coupon.couponCode}</code> automatically at checkout.
                  </p>
                </div>
              </div>
            </div>
          </DepthCard>
        </div>
        <CreateAffiliateCouponModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); window.location.reload(); }} />
      </div>
    </PageTransition>
  );
}

function CreateAffiliateCouponModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ couponCode: '', discountType: 'PERCENTAGE', discountValue: 10, commissionRate: 5, commissionBaseType: 'DISCOUNTED_VALUE', usageLimit: '', perCustomerLimit: '', startAt: '', expiresAt: '' });
  const [error, setError] = useState('');
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const submit = async () => {
    try {
      setError('');
      await api.post('/affiliate/coupon', {
        ...form,
        discountValue: Number(form.discountValue),
        commissionRate: Number(form.commissionRate),
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        perCustomerLimit: form.perCustomerLimit ? Number(form.perCustomerLimit) : null,
        startAt: form.startAt || null,
        expiresAt: form.expiresAt || null,
      });
      onCreated();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not create coupon.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Coupon" size="lg" footer={<>
      <button className="btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={submit} disabled={!form.couponCode}>Create Coupon</button>
    </>}>
      {error && <Alert type="danger" className="mb-4">{error}</Alert>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="sm:col-span-2">
          <label className="label">Coupon Code</label>
          <input className="input font-mono" value={form.couponCode} onChange={e => update('couponCode', e.target.value.toUpperCase())} placeholder="e.g. ALEX10" />
        </div>
        <div>
          <label className="label">Discount Type</label>
          <select className="input" value={form.discountType} onChange={e => update('discountType', e.target.value)}>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed Amount</option>
          </select>
        </div>
        <div>
          <label className="label">Customer Discount</label>
          <input className="input" type="number" min="0" value={form.discountValue} onChange={e => update('discountValue', e.target.value)} />
        </div>
        <div>
          <label className="label">Affiliate Commission %</label>
          <input className="input" type="number" min="0" value={form.commissionRate} onChange={e => update('commissionRate', e.target.value)} />
        </div>
        <div>
          <label className="label">Commission Base</label>
          <select className="input" value={form.commissionBaseType} onChange={e => update('commissionBaseType', e.target.value)}>
            <option value="DISCOUNTED_VALUE">Discounted Value</option>
            <option value="ORIGINAL_VALUE">Original Value</option>
            <option value="EXCLUDING_TAX">Excl. Tax</option>
            <option value="EXCLUDING_TAX_AND_SHIPPING">Excl. Tax &amp; Shipping</option>
          </select>
        </div>
        <div>
          <label className="label">Usage Limit (optional)</label>
          <input className="input" type="number" min="1" value={form.usageLimit} onChange={e => update('usageLimit', e.target.value)} />
        </div>
        <div>
          <label className="label">Per-customer Limit (optional)</label>
          <input className="input" type="number" min="1" value={form.perCustomerLimit} onChange={e => update('perCustomerLimit', e.target.value)} />
        </div>
        <div>
          <label className="label">Start Date (optional)</label>
          <input className="input" type="date" value={form.startAt} onChange={e => update('startAt', e.target.value)} />
        </div>
        <div>
          <label className="label">Expiry Date (optional)</label>
          <input className="input" type="date" value={form.expiresAt} onChange={e => update('expiresAt', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

const InfoRow = ({ label, value, strong }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-slate-500">{label}</span>
    <span className={`text-slate-900 ${strong ? 'font-bold' : 'font-medium'}`}>{value}</span>
  </div>
);
