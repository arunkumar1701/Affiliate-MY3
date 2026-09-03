import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatMoney, formatDate, statusBadge, EmptyState, Alert } from '../../components/ui';
import { BarChart3, TrendingUp, Users, Wallet, FileDown, RefreshCw, Calendar, Filter, ArrowUpDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition, TiltCard, TableReveal, useReducedMotion } from '../../components/anim';

export default function AdminReports() {
  const location = useLocation();
  const reduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState('sales');
  const [period, setPeriod] = useState('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [affiliateId, setAffiliateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [salesData, setSalesData] = useState(null);
  const [commissionData, setCommissionData] = useState(null);
  const [couponData, setCouponData] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadSales = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ period });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (affiliateId) params.set('affiliateId', affiliateId);
      const { data } = await api.get(`/admin/reports/sales?${params.toString()}`);
      setSalesData(data.data);
    } catch (e) { setError(e?.response?.data?.error?.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  const loadCommissions = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ period });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (affiliateId) params.set('affiliateId', affiliateId);
      const { data } = await api.get(`/admin/reports/commissions?${params.toString()}`);
      setCommissionData(data.data);
    } catch (e) { setError(e?.response?.data?.error?.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  const loadCoupons = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/admin/reports/coupons');
      setCouponData(data.data);
    } catch (e) { setError(e?.response?.data?.error?.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'sales') loadSales();
    else if (activeTab === 'commissions') loadCommissions();
    else if (activeTab === 'coupons') loadCoupons();
  }, [activeTab, period, from, to, affiliateId]);

  const exportData = (type, format = 'csv') => {
    window.open(`/api/admin/export/${type}?format=${format}`, '_blank');
    setNotice({ type: 'success', message: `Export started (${format.toUpperCase()}).` });
    setTimeout(() => setNotice(null), 3000);
  };

  const totals = salesData?.rows?.reduce?.((acc, r) => ({
    orders: acc.orders + r.orders,
    grossSales: acc.grossSales + r.grossSales,
    discounts: acc.discounts + r.discounts,
    commissions: acc.commissions + r.commissions,
    refunds: acc.refunds + r.refunds,
    netRevenue: acc.netRevenue + r.netRevenue,
  }), { orders: 0, grossSales: 0, discounts: 0, commissions: 0, refunds: 0, netRevenue: 0 });

  return (
    <PageTransition key={location.pathname}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><BarChart3 className="w-6 h-6 text-brand-600" /> Reports & Analytics</h1>
            <p className="text-slate-500 mt-1">Sales, commission and coupon performance reports with export options.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <ExportMenu onExport={exportData} />
          </div>
        </div>

        {notice && <Alert type={notice.type}>{notice.message}</Alert>}
        {error && <Alert type="danger">{error}</Alert>}

        <div className="flex flex-wrap gap-1 border-b border-slate-200">
          {[
            { id: 'sales', label: 'Sales Performance', icon: TrendingUp },
            { id: 'commissions', label: 'Commission Ledger', icon: Wallet },
            { id: 'coupons', label: 'Coupon Analytics', icon: BarChart3 },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px flex items-center gap-1.5 ${activeTab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={reduced ? {} : { opacity: 0, y: 10, scaleY: reduced ? 1 : 0.98 }}
            animate={reduced ? {} : { opacity: 1, y: 0, scaleY: 1 }}
            exit={reduced ? {} : { opacity: 0, y: -8, scaleY: reduced ? 1 : 0.99 }}
            transition={{ duration: reduced ? 0.05 : 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            className="space-y-6"
          >
            {activeTab !== 'coupons' && (
              <div className="card">
                <div className="card-body grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="label flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Period</label>
                    <select className="input" value={period} onChange={e => setPeriod(e.target.value)}>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="month">This Month</option>
                      <option value="prevMonth">Previous Month</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">From (optional)</label>
                    <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">To (optional)</label>
                    <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Affiliate ID</label>
                    <input className="input" placeholder="uuid or code..." value={affiliateId} onChange={e => setAffiliateId(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <button className="btn-secondary w-full" onClick={() => {
                      if (activeTab === 'sales') loadSales();
                      else if (activeTab === 'commissions') loadCommissions();
                    }} disabled={loading}>
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sales' && (
              <>
                {salesData && totals && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <TiltCard><Kpi title="Affiliates Active" value={salesData.rows.length} tone="brand" icon={Users} /></TiltCard>
                    <TiltCard><Kpi title="Total Orders" value={totals.orders} tone="info" icon={ArrowUpDown} /></TiltCard>
                    <TiltCard><Kpi title="Gross Sales" value={formatMoney(totals.grossSales)} tone="brand" icon={TrendingUp} /></TiltCard>
                    <TiltCard><Kpi title="Customer Discounts" value={formatMoney(totals.discounts)} tone="warning" /></TiltCard>
                    <TiltCard><Kpi title="Commission Cost" value={formatMoney(totals.commissions)} tone="info" icon={Wallet} /></TiltCard>
                    <TiltCard><Kpi title="Net Revenue" value={formatMoney(totals.netRevenue)} tone="success" icon={TrendingUp} /></TiltCard>
                  </div>
                )}
                <div className="card overflow-hidden">
                  <div className="card-header flex items-center justify-between">
                    <h2 className="font-semibold">Sales by Affiliate</h2>
                    <p className="text-xs text-slate-500">{salesData?.from && `From ${formatDate(salesData.from)} to ${formatDate(salesData.to)}`}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead><tr><th>Affiliate</th><th>Coupon</th><th className="text-right">Orders</th><th className="text-right">Gross</th><th className="text-right">Discounts</th><th className="text-right">Commission</th><th className="text-right">Net Revenue</th></tr></thead>
                      <TableReveal rowsStagger={24}>
                        {loading && <tr><td colSpan="7" className="text-center py-8 text-slate-500">Loading...</td></tr>}
                        {!loading && !salesData?.rows?.length && <tr><td colSpan="7"><EmptyState title="No sales data" description="Referral sales will appear here when customers pay via coupons." /></td></tr>}
                        {salesData?.rows?.map(r => (
                          <tr key={r.affiliate?.affiliateCode || r.coupon?.code}>
                            <td className="font-medium">{r.affiliate?.name}<span className="text-slate-400 text-xs ml-1">({r.affiliate?.affiliateCode})</span></td>
                            <td>{r.coupon?.code ? <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-sm">{r.coupon.code}</code> : '—'}</td>
                            <td className="text-right font-semibold">{r.orders}</td>
                            <td className="text-right">{formatMoney(r.grossSales)}</td>
                            <td className="text-right text-emerald-600">-{formatMoney(r.discounts)}</td>
                            <td className="text-right text-brand-700">{formatMoney(r.commissions)}</td>
                            <td className="text-right font-bold">{formatMoney(r.netRevenue)}</td>
                          </tr>
                        ))}
                      </TableReveal>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'commissions' && (
              <div className="card overflow-hidden">
                <div className="card-header flex items-center justify-between">
                  <h2 className="font-semibold">Commission Report</h2>
                  <p className="text-xs text-slate-500">{commissionData?.from && `From ${formatDate(commissionData.from)} to ${formatDate(commissionData.to)}`}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr><th>Date</th><th>Affiliate</th><th>Order</th><th>Coupon</th><th className="text-right">Base</th><th className="text-right">Rate</th><th className="text-right">Amount</th><th className="text-right">Net</th><th>Status</th></tr></thead>
                    <TableReveal rowsStagger={24}>
                      {loading && <tr><td colSpan="9" className="text-center py-8 text-slate-500">Loading...</td></tr>}
                      {!loading && !commissionData?.rows?.length && <tr><td colSpan="9"><EmptyState title="No commissions in period" description="Commissions are created when referral orders are marked PAID." /></td></tr>}
                      {commissionData?.rows?.map(c => (
                        <tr key={c.id}>
                          <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(c.date)}</td>
                          <td className="font-medium">{c.affiliate?.name}<span className="text-slate-400 text-xs ml-1">({c.affiliate?.affiliateCode})</span></td>
                          <td className="font-mono text-xs">{c.orderNumber || '—'}</td>
                          <td>{c.coupon?.couponCode ? <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{c.coupon.couponCode}</code> : '—'}</td>
                          <td className="text-right">{formatMoney(c.commissionBase)}</td>
                          <td className="text-right">{c.commissionRate}%</td>
                          <td className="text-right">{formatMoney(c.commissionAmount)}</td>
                          <td className="text-right font-bold text-brand-700">{formatMoney(c.net)}</td>
                          <td>{statusBadge(c.status, { animated: true })}</td>
                        </tr>
                      ))}
                    </TableReveal>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'coupons' && (
              <div className="card overflow-hidden">
                <div className="card-header"><h2 className="font-semibold">Coupon Performance Rankings</h2></div>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr><th>Coupon</th><th>Affiliate</th><th className="text-right">Usage</th><th className="text-right">Orders</th><th className="text-right">Revenue</th><th className="text-right">Discounts</th><th className="text-right">Commission Gen.</th><th>Status</th></tr></thead>
                    <TableReveal rowsStagger={24}>
                      {loading && <tr><td colSpan="8" className="text-center py-8 text-slate-500">Loading...</td></tr>}
                      {!loading && !couponData?.rows?.length && <tr><td colSpan="8"><EmptyState title="No coupons yet" description="Approve affiliates to activate their coupons." /></td></tr>}
                      {couponData?.rows?.sort((a, b) => b.revenue - a.revenue).map(c => (
                        <tr key={c.coupon.code}>
                          <td><code className="font-mono bg-slate-100 px-2 py-1 rounded font-bold">{c.coupon.code}</code></td>
                          <td className="font-medium">{c.affiliate?.name}<span className="text-slate-400 text-xs ml-1">({c.affiliate?.affiliateCode})</span></td>
                          <td className="text-right">{c.usage}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                          <td className="text-right font-semibold">{c.orders}</td>
                          <td className="text-right">{formatMoney(c.revenue)}</td>
                          <td className="text-right text-emerald-600">-{formatMoney(c.discounts)}</td>
                          <td className="text-right text-brand-700 font-bold">{formatMoney(c.commissionGenerated)}</td>
                          <td>{statusBadge(c.coupon.status, { animated: true })}</td>
                        </tr>
                      ))}
                    </TableReveal>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

function Kpi({ title, value, tone, icon: Icon }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    info: 'bg-blue-50 text-blue-600',
    default: 'bg-slate-50 text-slate-600',
  };
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
        </div>
        {Icon && <div className={`p-2 rounded-xl ${tones[tone] ?? tones.default}`}><Icon className="w-5 h-5" /></div>}
      </div>
    </div>
  );
}

function ExportMenu({ onExport }) {
  const types = [
    { id: 'affiliates', label: 'Affiliates' },
    { id: 'coupons', label: 'Coupons' },
    { id: 'orders', label: 'Referral Orders' },
    { id: 'commissions', label: 'Commission Ledger' },
    { id: 'payouts', label: 'Payout Ledger' },
  ];
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="btn-primary" onClick={() => setOpen(o => !o)}><FileDown className="w-4 h-4" /> Export Data</button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-64 card !p-1 shadow-xl">
            {types.map(t => (
              <div key={t.id} className="px-2 py-1.5">
                <p className="text-xs font-semibold text-slate-700 px-2 py-1">{t.label}</p>
                <div className="flex gap-1 px-2">
                  <button className="text-xs btn-ghost !py-1 flex-1" onClick={() => { onExport(t.id, 'csv'); setOpen(false); }}>CSV</button>
                  <button className="text-xs btn-ghost !py-1 flex-1" onClick={() => { onExport(t.id, 'xlsx'); setOpen(false); }}>XLSX</button>
                  <button className="text-xs btn-ghost !py-1 flex-1" onClick={() => { onExport(t.id, 'json'); setOpen(false); }}>JSON</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
