import { useEffect, useState } from 'react';
import api from '../../services/api';
import { KpiCard, formatMoney, statusBadge, EmptyState, Badge } from '../../components/ui';
import { Users, ShoppingCart, Wallet, Ticket, TrendingUp, DollarSign, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageTransition, DepthCard, TiltCard } from '../../components/anim';

export default function AdminDashboard() {
  const location = useLocation();
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: res } = await api.get('/admin/dashboard');
        setData(res.data);
      } catch {}
    })();
  }, []);

  if (!data) return <div className="p-10 text-slate-500 text-center">Loading dashboard...</div>;

  return (
    <PageTransition key={location.pathname}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your affiliate program performance.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TiltCard><KpiCard title="Total Affiliates" value={data.totalAffiliates} subtitle={`${data.activeAffiliates} active`} icon={Users} tone="brand" /></TiltCard>
          <TiltCard><KpiCard title="Pending Applications" value={data.pendingAffiliates} subtitle={`${data.suspendedAffiliates} suspended`} icon={AlertTriangle} tone="warning" /></TiltCard>
          <TiltCard><KpiCard title="Referral Orders" value={data.totalReferralOrders} subtitle="attributed orders" icon={ShoppingCart} tone="info" /></TiltCard>
          <TiltCard><KpiCard title="Referred Revenue" value={formatMoney(data.totalReferredRevenue)} subtitle="gross sales from coupons" icon={TrendingUp} tone="success" /></TiltCard>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <TiltCard><KpiCard title="Total Customer Discounts" value={formatMoney(data.totalCustomerDiscounts)} subtitle="cost of promotions" icon={Ticket} tone="info" /></TiltCard>
          <TiltCard><KpiCard title="Total Commission Issued" value={formatMoney(data.totalCommission)} subtitle="across all statuses" icon={Wallet} tone="brand" /></TiltCard>
          <TiltCard><KpiCard title="Paid Commission" value={formatMoney(data.paidCommission)} subtitle="cash out to affiliates" icon={DollarSign} tone="success" /></TiltCard>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <TiltCard><KpiCard title="Pending Review" value={formatMoney(data.pendingCommission)} icon={Clock} tone="warning" /></TiltCard>
          <TiltCard><KpiCard title="Approved & Ready" value={formatMoney(data.approvedCommission)} icon={CheckCircle2} tone="brand" /></TiltCard>
          <TiltCard><KpiCard title="Paid" value={formatMoney(data.paidCommission)} icon={DollarSign} tone="success" /></TiltCard>
          <TiltCard><KpiCard title="Cancelled" value={formatMoney(data.cancelledCommission)} icon={AlertTriangle} tone="default" /></TiltCard>
          <TiltCard><KpiCard title="Reversed (Refund)" value={formatMoney(data.reversedCommission)} icon={AlertTriangle} tone="danger" /></TiltCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2">
            <div className="card-header">
              <h2 className="font-semibold">Quick Actions</h2>
            </div>
            <div className="card-body grid grid-cols-2 sm:grid-cols-3 gap-3">
              <QuickAction to="/admin/affiliates" icon={Users} label="Review Applications" sub={`${data.pendingAffiliates} pending`} tone="warning" />
              <QuickAction to="/admin/affiliates" icon={CheckCircle2} label="All Affiliates" sub={`${data.totalAffiliates} total`} tone="brand" />
              <QuickAction to="/admin/commissions" icon={Clock} label="Review Commissions" sub="approve / reject" tone="info" />
              <QuickAction to="/admin/payouts" icon={Wallet} label="Process Payouts" sub="approved commissions" tone="success" />
              <QuickAction to="/admin/reports" icon={TrendingUp} label="Reports & Export" sub="CSV / XLSX / JSON" tone="default" />
              <QuickAction to="/admin/fraud" icon={AlertTriangle} label="Fraud Investigation" sub="suspicious activity" tone="danger" />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="font-semibold">Affiliate Status</h2></div>
            <div className="card-body space-y-3">
              <StatusRow label={<Badge variant="success">Active</Badge>} count={data.activeAffiliates} total={data.totalAffiliates} color="bg-emerald-500" />
              <StatusRow label={<Badge variant="warning">Pending</Badge>} count={data.pendingAffiliates} total={data.totalAffiliates} color="bg-amber-500" />
              <StatusRow label={<Badge variant="danger">Suspended</Badge>} count={data.suspendedAffiliates} total={data.totalAffiliates} color="bg-red-500" />
            </div>
          </div>
        </div>

        <DepthCard hover tilt className="card border-2 border-dashed border-brand-200 bg-brand-50/30">
          <div className="card-body flex flex-col sm:flex-row items-center sm:justify-between gap-4">
            <div>
              <p className="font-semibold text-brand-800 text-lg">Mandatory Demo Scenario (PDF §70)</p>
              <p className="text-sm text-brand-700 mt-1">
                Coupon <code className="font-mono bg-white px-2 py-0.5 rounded border border-brand-200">ALEX10</code> — €200 order → Customer pays €180 (10% discount), Affiliate earns €9 (5% on discounted value).
              </p>
            </div>
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            >
              <Link to="/admin/checkout" className="btn-primary whitespace-nowrap">Run Demo Checkout →</Link>
            </motion.div>
          </div>
        </DepthCard>
      </div>
    </PageTransition>
  );
}

const QuickAction = ({ to, icon: Icon, label, sub, tone }) => (
  <motion.div
    whileHover={{ y: -3, scale: 1.01 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 320, damping: 24 }}
  >
    <Link to={to} className="group p-4 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/40 transition-all block h-full">
      <div className={`w-10 h-10 rounded-lg mb-2 flex items-center justify-center ${tone === 'warning' ? 'bg-amber-50 text-amber-600' : tone === 'danger' ? 'bg-red-50 text-red-600' : tone === 'success' ? 'bg-emerald-50 text-emerald-600' : tone === 'info' ? 'bg-blue-50 text-blue-600' : 'bg-brand-50 text-brand-600'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-semibold text-slate-900 text-sm">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </Link>
  </motion.div>
);

const StatusRow = ({ label, count, total, color }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        {label}
        <span className="text-sm font-semibold text-slate-700">{count}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};
