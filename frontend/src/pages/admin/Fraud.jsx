import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatDate, formatDateTime, statusBadge, Modal, Alert, EmptyState, Badge } from '../../components/ui';
import { AlertTriangle, Ban, CheckCircle2, ShieldAlert, ShieldCheck, Search, Filter, RefreshCw, Eye, XCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition, DepthCard, TableReveal, Reveal3D, TiltCard } from '../../components/anim';

const SEVERITY_COLORS = {
  LOW: 'bg-sky-100 text-sky-700 border-sky-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  CRITICAL: 'bg-red-600 text-white border-red-700',
};

const TYPE_DESCRIPTIONS = {
  SELF_REFERRAL: { label: 'Self-Referral', desc: 'Customer details match affiliate account — likely referring themselves for commission.', color: 'HIGH' },
  DUPLICATE_ORDER: { label: 'Duplicate Order Pattern', desc: 'Multiple orders from same customer/IP within short window.', color: 'MEDIUM' },
  UNUSUAL_VELOCITY: { label: 'Unusual Velocity', desc: 'Spike in coupon usage outside affiliate\'s historical baseline.', color: 'MEDIUM' },
  INVALID_COUPON_USE: { label: 'Invalid Coupon Use', desc: 'Coupon used by restricted customer group or geo.', color: 'LOW' },
  REFUND_ABUSE: { label: 'Refund / BOGUS Abuse', desc: 'High refund rate on orders attributed to this affiliate.', color: 'HIGH' },
  SHIPPING_MISMATCH: { label: 'Shipping Mismatch', desc: 'Billing/shipping/customer country mismatch (VPN/proxy indicator).', color: 'MEDIUM' },
  SUSPICIOUS_AFFILIATE: { label: 'Suspicious Affiliate', desc: 'Manual flag by admin for investigation.', color: 'CRITICAL' },
};

export default function AdminFraud() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ severity: '', resolved: '', type: '', search: '' });
  const [notice, setNotice] = useState(null);
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveData, setResolveData] = useState({ resolution: '', action: 'CLEAR' });
  const [viewItem, setViewItem] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.resolved !== '') params.set('resolved', filters.resolved);
      const { data } = await api.get(`/admin/fraud-flags?${params.toString()}`);
      setItems(data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters.resolved]);

  const filtered = items.filter(f => {
    if (filters.severity && f.severity !== filters.severity) return false;
    if (filters.type && f.type !== filters.type) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      return f.description?.toLowerCase().includes(s) || f.affiliate?.name?.toLowerCase().includes(s) || f.affiliate?.affiliateCode?.toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    total: items.length,
    open: items.filter(f => !f.resolved).length,
    high: items.filter(f => !f.resolved && (f.severity === 'HIGH' || f.severity === 'CRITICAL')).length,
    resolved: items.filter(f => f.resolved).length,
  };

  const doResolve = async () => {
    try {
      const body = { resolution: resolveData.resolution || `Resolved: ${resolveData.action}` };
      await api.post(`/admin/fraud-flags/${resolveModal.id}/resolve`, body);
      setNotice({ type: 'success', message: `Flag marked as resolved (${resolveData.action}).` });
      setResolveModal(null);
      setResolveData({ resolution: '', action: 'CLEAR' });
      load();
    } catch (e) {
      setNotice({ type: 'danger', message: e?.response?.data?.error?.message || 'Action failed.' });
    }
  };

  return (
    <PageTransition key={location.pathname}>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-red-600" /> Fraud Investigation</h1>
        <p className="text-slate-500 mt-1">Auto-generated suspicious activity flags and manual affiliate risk review.</p>
      </div>

      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.message}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <Alert type={notice.type}>{notice.message}</Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <Reveal3D stagger={80}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <TiltCard><StatCard label="Total Flags" value={stats.total} icon={AlertTriangle} tone="warning" /></TiltCard>
        <TiltCard><StatCard label="Open Cases" value={stats.open} icon={XCircle} tone="danger" /></TiltCard>
        <TiltCard><StatCard label="High / Critical" value={stats.high} icon={ShieldAlert} tone="critical" /></TiltCard>
        <TiltCard><StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} tone="success" /></TiltCard>
      </div>
      </Reveal3D>

      <motion.div
        className="card"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.08 }}
      >
        <div className="card-body grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="label flex items-center gap-1"><Search className="w-3.5 h-3.5" /> Search</label>
            <input className="input" placeholder="Affiliate / description..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </div>
          <div>
            <label className="label flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Severity</label>
            <select className="input" value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}>
              <option value="">All Severities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
              <option value="">All Types</option>
              {Object.entries(TYPE_DESCRIPTIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Resolution</label>
            <select className="input" value={filters.resolved} onChange={e => setFilters(f => ({ ...f, resolved: e.target.value }))}>
              <option value="">All</option>
              <option value="false">Open Only</option>
              <option value="true">Resolved Only</option>
            </select>
          </div>
          <div className="flex items-end">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scaleY: 0.97 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="btn-secondary w-full"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </motion.button>
          </div>
        </div>
      </motion.div>

      <DepthCard hover className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Severity</th><th>Type</th><th>Affiliate</th><th>Details</th><th>Raised</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <TableReveal rowsStagger={28}>
              {loading && <tr><td colSpan="7" className="text-center py-10 text-slate-500">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="7"><EmptyState title="No fraud flags" description="Great job! No suspicious activity detected. Flags appear here when self-referrals or unusual patterns are detected automatically." /></td></tr>}
              {filtered.map(f => {
                const typeInfo = TYPE_DESCRIPTIONS[f.type] || { label: f.type, desc: f.type, color: 'MEDIUM' };
                return (
                  <tr key={f.id} className={f.resolved ? 'opacity-60' : ''}>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${SEVERITY_COLORS[f.severity] || SEVERITY_COLORS.MEDIUM}`}>
                        <ShieldAlert className="w-3 h-3" />{f.severity}
                      </span>
                    </td>
                    <td>
                      <p className="font-medium text-slate-900 text-sm">{typeInfo.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{f.type}</p>
                    </td>
                    <td>
                      {f.affiliate ? (
                        <Link to={`/admin/affiliates/${f.affiliateId}`} className="hover:text-brand-700">
                          <p className="font-medium text-sm">{f.affiliate.name}</p>
                          <p className="text-xs text-slate-500">{f.affiliate.affiliateCode}</p>
                        </Link>
                      ) : <span className="text-slate-400 text-sm">—</span>}
                    </td>
                    <td className="text-sm max-w-sm">
                      <p className="text-slate-700 line-clamp-2">{f.description || typeInfo.desc}</p>
                    </td>
                    <td className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(f.createdAt)}</td>
                    <td>
                      {f.resolved ? (
                        <div>
                          {statusBadge('APPROVED')}
                          <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(f.resolvedAt)}</p>
                        </div>
                      ) : (
                        <Badge variant="warning">● Open</Badge>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <motion.button whileHover={{ y: -2 }} whileTap={{ scaleY: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setViewItem({ ...f, typeInfo })}>
                          <Eye className="w-3 h-3" /> Review
                        </motion.button>
                        {!f.resolved && (
                          <motion.button whileHover={{ y: -2 }} whileTap={{ scaleY: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="btn-success !px-2 !py-1 text-xs" onClick={() => { setResolveModal(f); setResolveData({ resolution: 'Cleared — no fraud found after investigation.', action: 'CLEAR' }); }}>
                            <CheckCircle2 className="w-3 h-3" /> Resolve
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </TableReveal>
          </table>
        </div>
      </DepthCard>

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Fraud Flag Details" size="lg">
        {viewItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold border ${SEVERITY_COLORS[viewItem.severity] || SEVERITY_COLORS.MEDIUM}`}>
                <ShieldAlert className="w-4 h-4" /> SEVERITY: {viewItem.severity}
              </div>
              {viewItem.resolved ? <Badge variant="success">Resolved · {formatDate(viewItem.resolvedAt)}</Badge> : <Badge variant="warning">● Open Case</Badge>}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</p>
              <p className="mt-1 font-bold text-lg text-slate-900">{viewItem.typeInfo?.label || viewItem.type}</p>
              <p className="text-sm text-slate-600 mt-1">{viewItem.typeInfo?.desc}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-slate-800">{viewItem.description || 'No additional description recorded.'}</p>
            </div>
            {viewItem.affiliate && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-brand-50 border border-brand-100">
                  <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Related Affiliate</p>
                  <Link to={`/admin/affiliates/${viewItem.affiliateId}`} className="block mt-1 font-bold text-brand-800 hover:underline">{viewItem.affiliate.name}</Link>
                  <p className="text-xs text-brand-600">{viewItem.affiliate.affiliateCode} · {viewItem.affiliate.email}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Timestamps</p>
                  <p className="mt-1 text-sm text-slate-700">Raised: <b>{formatDateTime(viewItem.createdAt)}</b></p>
                  {viewItem.resolvedAt && <p className="text-sm text-slate-700 mt-0.5">Resolved: <b>{formatDateTime(viewItem.resolvedAt)}</b></p>}
                </div>
              </div>
            )}
            {viewItem.resolution && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">📝 Resolution Notes</p>
                <p className="text-emerald-900 text-sm">{viewItem.resolution}</p>
              </div>
            )}
            {!viewItem.resolved && (
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <Link to={`/admin/affiliates/${viewItem.affiliateId}`} className="btn-secondary" onClick={() => setViewItem(null)}>Go to Affiliate →</Link>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scaleY: 0.97 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                  className="btn-success"
                  onClick={() => { setResolveModal(viewItem); setViewItem(null); setResolveData({ resolution: 'Cleared after investigation.', action: 'CLEAR' }); }}
                >
                  <ShieldCheck className="w-4 h-4" /> Resolve this Flag
                </motion.button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!resolveModal} onClose={() => setResolveModal(null)} title="Resolve Fraud Flag" size="md"
        footer={<>
          <button className="btn-secondary" onClick={() => setResolveModal(null)}>Cancel</button>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scaleY: 0.97 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="btn-success"
            onClick={doResolve}
          >
            <CheckCircle2 className="w-4 h-4" /> Mark as Resolved
          </motion.button>
        </>}>
        {resolveModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Resolving flag on <b>{resolveModal.affiliate?.name || 'Unknown affiliate'}</b>
              {resolveModal.type && <> · Type: <Badge variant="warning">{TYPE_DESCRIPTIONS[resolveModal.type]?.label || resolveModal.type}</Badge></>}
            </p>
            <div>
              <label className="label">Outcome</label>
              <select className="input" value={resolveData.action} onChange={e => setResolveData(d => ({ ...d, action: e.target.value }))}>
                <option value="CLEAR">✅ FALSE POSITIVE — No fraud found</option>
                <option value="WARN">⚠️ WARN — Affiliate notified & monitored</option>
                <option value="SUSPEND">🚫 SUSPEND — Repeated abuse</option>
                <option value="REJECT_COMMS">💰 Reject underlying commissions</option>
              </select>
            </div>
            <div>
              <label className="label">Resolution Notes *</label>
              <textarea className="input min-h-[100px]" required value={resolveData.resolution} onChange={e => setResolveData(d => ({ ...d, resolution: e.target.value }))} placeholder="Investigation findings, actions taken, links to evidence..." />
            </div>
            <Alert type="warning" className="!text-xs">
              <b>Note:</b> This only resolves the flag row. Use the Affiliate detail page to actually suspend accounts or reject commissions.
            </Alert>
          </div>
        )}
      </Modal>
    </div>
    </PageTransition>
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
  const tones = {
    warning: 'bg-amber-50 text-amber-600 border-amber-200',
    danger: 'bg-red-50 text-red-600 border-red-200',
    critical: 'bg-red-100 text-red-700 border-red-300',
    success: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    info: 'bg-blue-50 text-blue-600 border-blue-200',
  };
  return (
    <div className="kpi-card border border-slate-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl border ${tones[tone] ?? tones.info}`}><Icon className="w-5 h-5" /></div>
      </div>
    </div>
  );
}
