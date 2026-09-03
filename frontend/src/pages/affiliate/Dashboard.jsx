import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Badge, CopyButton, EmptyState, formatDate, formatMoney, KpiCard, statusBadge } from '../../components/ui';
import { Wallet, Users, ShoppingCart, TrendingUp, Ticket, Clock, CheckCircle2, XCircle, AlertCircle, Gift } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { PageTransition, TiltCard, Reveal3D, Progress3D } from '../../components/anim';
import { motion } from 'framer-motion';

export default function AffiliateDashboard() {
  const location = useLocation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [coupon, setCoupon] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [dash, coup] = await Promise.all([
          api.get('/affiliate/dashboard'),
          api.get('/affiliate/coupon'),
        ]);
        setData(dash.data.data);
        setCoupon(coup.data.data);
      } catch {}
    })();
  }, []);

  if (!data) return <div className="p-10 text-slate-500 text-center">Loading dashboard...</div>;

  if (user?.affiliateStatus !== 'ACTIVE' && user?.affiliateStatus !== undefined) {
    return (
      <PageTransition key={location.pathname}>
        <div className="max-w-xl mx-auto">
          <div className="card">
            <div className="card-body text-center py-10">
              {user.affiliateStatus === 'PENDING' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-bold text-amber-800">Application Under Review</h2>
                  <p className="mt-2 text-amber-700">Thanks for applying! Our team is reviewing your application and will be in touch shortly.</p>
                </>
              )}
              {user.affiliateStatus === 'SUSPENDED' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-red-800">Account Suspended</h2>
                  <p className="mt-2 text-red-700">Your affiliate account has been suspended. Please contact support for details.</p>
                </>
              )}
              {user.affiliateStatus === 'REJECTED' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <XCircle className="w-8 h-8 text-slate-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Application Update</h2>
                  <p className="mt-2 text-slate-600">Please contact support for details about your application status.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition key={location.pathname}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name?.split(' ')[0] || 'Partner'} 👋</h1>
          <p className="text-slate-500 mt-1">Here's how your affiliate program is performing.</p>
        </div>

        {coupon && (
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="preserve-3d bg-sweep overflow-hidden relative card bg-gradient-to-r from-brand-600 via-brand-600 to-brand-700 border-0 text-white rounded-xl shadow-sm border border-slate-200"
          >
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10"></div>
            <div className="absolute right-20 bottom-0 w-32 h-32 rounded-full bg-white/5"></div>
            <div className="card-body relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-brand-100 text-sm uppercase tracking-wide font-semibold">Your Active Coupon</p>
                <div className="mt-3 flex items-baseline gap-4 flex-wrap">
                  <p className="font-mono text-5xl font-black tracking-tight">{coupon.couponCode}</p>
                  <div className="flex gap-3">
                    <Badge variant="default" className="!bg-white/20 !text-white">
                      <Gift className="w-3 h-3" /> Customer Discount {coupon.customerDiscountValue}%
                    </Badge>
                    <Badge variant="default" className="!bg-emerald-400/25 !text-emerald-50">
                      <Wallet className="w-3 h-3" /> Your Commission {coupon.myCommissionRate}%
                    </Badge>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-3 flex-wrap">
                  <CopyButton value={coupon.couponCode} />
                  <Link to="/affiliate/coupon" className="btn-secondary !bg-white/10 !border-white/20 !text-white hover:!bg-white/20">
                    View coupon details →
                  </Link>
                </div>
              </div>
              <div className="md:text-right">
                <p className="text-brand-100 text-xs uppercase tracking-wide font-semibold">Share link</p>
                <p className="mt-1 font-mono text-sm break-all max-w-xs bg-white/10 rounded p-2">
                  {typeof window !== 'undefined' && window.location.origin}/checkout?ref={coupon.couponCode}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {!coupon && (
          <div className="card">
            <div className="card-body">
              <EmptyState
                title="Your coupon is being set up"
                description="Once your account is fully approved, your unique coupon code will appear here."
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TiltCard><KpiCard title="Total Referrals" value={data.totalReferrals} subtitle="customers reached" icon={Users} tone="brand" /></TiltCard>
          <TiltCard><KpiCard title="Total Orders" value={data.totalOrders} subtitle="placed via your coupon" icon={ShoppingCart} tone="info" /></TiltCard>
          <TiltCard><KpiCard title="Total Sales" value={formatMoney(data.totalSales)} subtitle="gross revenue" icon={TrendingUp} tone="success" /></TiltCard>
          <TiltCard><KpiCard title="Total Commission" value={formatMoney(data.totalCommission)} subtitle="lifetime earnings" icon={Wallet} tone="warning" /></TiltCard>
        </div>

        <Reveal3D stagger={70}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <TiltCard><KpiCard title="Pending" value={formatMoney(data.pendingCommission)} icon={Clock} tone="warning" /></TiltCard>
            <TiltCard><KpiCard title="Approved" value={formatMoney(data.approvedCommission)} icon={CheckCircle2} tone="brand" /></TiltCard>
            <TiltCard><KpiCard title="Paid Out" value={formatMoney(data.paidCommission)} icon={Wallet} tone="success" /></TiltCard>
            <TiltCard><KpiCard title="Cancelled" value={formatMoney(data.cancelledCommission)} icon={XCircle} tone="default" /></TiltCard>
            <TiltCard><KpiCard title="Reversed" value={formatMoney(data.reversedCommission)} icon={AlertCircle} tone="danger" /></TiltCard>
          </div>
        </Reveal3D>

        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Commission Status Breakdown</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              <Reveal3D stagger={50} container={false}>
                {Object.entries(data.commissionCountByStatus || {}).map(([s, n]) => (
                  <div key={s} className="p-3 rounded-lg bg-slate-50 text-center">
                    {statusBadge(s)}
                    <p className="mt-2 text-2xl font-bold text-slate-900">{n}</p>
                  </div>
                ))}
              </Reveal3D>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Reveal3D delay={350} container={false}>
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold">Recent Orders</h2>
                <Link to="/affiliate/orders" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View all →</Link>
              </div>
              <div className="card-body !p-0">
                <RecentOrdersPreview />
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold">Payout Summary</h2>
                <Link to="/affiliate/payouts" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View all →</Link>
              </div>
              <div className="card-body">
                <PayoutPreview data={data} />
              </div>
            </div>
          </Reveal3D>
        </div>
      </div>
    </PageTransition>
  );
}

function RecentOrdersPreview() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/affiliate/orders?limit=5');
        setItems(data.data.items);
      } catch {}
    })();
  }, []);
  if (!items.length) return <EmptyState title="No orders yet" description="When customers use your coupon, orders appear here." />;
  return (
    <table className="table">
      <thead><tr><th>Order</th><th>Date</th><th>Value</th><th>Status</th></tr></thead>
      <tbody>
        {items.map(o => (
          <tr key={o.orderId}>
            <td className="font-mono text-slate-800">{o.orderNumber}</td>
            <td className="text-slate-500">{formatDate(o.date)}</td>
            <td className="font-medium">{formatMoney(o.orderValue)}</td>
            <td>{statusBadge(o.status)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PayoutPreview({ data }) {
  const threshold = data?.minimumPayoutThreshold || 50;
  const available = data?.approvedCommission || 0;
  const remaining = Math.max(0, threshold - available);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 rounded-lg bg-emerald-50">
          <p className="text-xs text-emerald-700">Available for payout</p>
          <p className="mt-1 text-xl font-bold text-emerald-800">{formatMoney(available)}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-600">Minimum threshold</p>
          <p className="mt-1 text-xl font-bold text-slate-800">{formatMoney(threshold)}</p>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Progress to next payout</span>
          <span>{remaining > 0 ? `${formatMoney(remaining)} to go` : '🎉 Ready to pay out'}</span>
        </div>
        <Progress3D value={available} max={threshold} tone="brand" showLabel={false} />
      </div>
    </div>
  );
}
