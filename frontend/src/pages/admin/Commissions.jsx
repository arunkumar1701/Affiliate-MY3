import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatMoney, formatDateTime, statusBadge, Modal, Alert, EmptyState } from '../../components/ui';
import { Wallet, Search, Filter, RefreshCw, CheckCircle2, XCircle, Undo2, Clock, FileDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition, DepthCard, TableReveal, Reveal3D } from '../../components/anim';

export default function AdminCommissions() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [filters, setFilters] = useState({ status: '', affiliateId: '', orderId: '', from: '', to: '' });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionData, setActionData] = useState({ notes: '', amount: '', reason: '' });

  const openAction = (action) => {
    setActionModal(action);
    setActionData({ notes: '', amount: '', reason: '' });
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const { data } = await api.get(`/admin/commissions?${params.toString()}`);
      setItems(data.data.items);
      setTotal(data.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, filters.status]);

  const pages = Math.ceil(total / limit);

  const doAction = async () => {
    if (!actionModal) return;
    try {
      const { notes, amount, reason } = actionData;
      const { action, id, netAmount } = actionModal;
      const body = action === 'reverse' ? { amount: amount ? Number(amount) : Number(netAmount), notes }
        : action === 'hold' ? { reason: reason || 'Under review' }
        : { notes };
      await api.post(`/admin/commissions/${id}/${action}`, body);
      setNotice({ type: 'success', message: `Commission ${action} successful.` });
      setActionModal(null);
      setActionData({ notes: '', amount: '', reason: '' });
      load();
    } catch (e) {
      setNotice({ type: 'danger', message: e?.response?.data?.error?.message || 'Action failed.' });
    }
  };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams({ format: 'csv' });
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      window.open(`/api/admin/export/commissions?${params.toString()}`, '_blank');
    } catch {}
  };

  const actionDefs = {
    approve: { label: 'Approve', icon: CheckCircle2, tone: 'success', title: 'Approve Commission', body: 'This commission will be marked as APPROVED and available for payout.', needs: ['notes'] },
    reject: { label: 'Reject', icon: XCircle, tone: 'danger', title: 'Reject Commission', body: 'This commission will be permanently REJECTED.', needs: ['notes'] },
    reverse: { label: 'Reverse', icon: Undo2, tone: 'warning', title: 'Reverse Commission', body: 'Commission will be reversed (full or partial). Affiliates will be charged back.', needs: ['amount', 'notes'] },
    hold: { label: 'Hold', icon: Clock, tone: 'warning', title: 'Place on Hold', body: 'Place this commission ON_HOLD pending review.', needs: ['reason'] },
  };

  return (
    <PageTransition key={location.pathname}>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commission Ledger</h1>
          <p className="text-slate-500 mt-1">Approve, reject, hold, and reverse commissions. Review payout eligibility.</p>
        </div>
        <motion.div
          whileHover={{ y: -2 }}
          whileTap={{ scaleY: 0.97 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        >
          <button className="btn-secondary" onClick={exportCsv}><FileDown className="w-4 h-4" /> Export CSV</button>
        </motion.div>
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

      <motion.div
        className="card"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.05 }}
      >
        <div className="card-body grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="label flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Status</label>
            <select className="input" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REVERSED">Reversed</option>
            </select>
          </div>
          <div>
            <label className="label">Affiliate ID</label>
            <input className="input" placeholder="uuid or filter" value={filters.affiliateId} onChange={e => setFilters(f => ({ ...f, affiliateId: e.target.value }))} />
          </div>
          <div>
            <label className="label">Order ID</label>
            <input className="input" placeholder="Order #" value={filters.orderId} onChange={e => setFilters(f => ({ ...f, orderId: e.target.value }))} />
          </div>
          <div>
            <label className="label">From Date</label>
            <input className="input" type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          </div>
          <div>
            <label className="label">To Date</label>
            <input className="input" type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
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
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Apply
            </motion.button>
          </div>
        </div>
      </motion.div>

      <DepthCard hover className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Commission</th>
                <th>Affiliate</th>
                <th>Order</th>
                <th>Coupon</th>
                <th>Calculation</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <TableReveal rowsStagger={28}>
              {loading && <tr><td colSpan="8" className="text-center py-10 text-slate-500">Loading...</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan="8"><EmptyState title="No commissions match" description="Commissions are created when orders are paid successfully." /></td></tr>}
              {items.map(c => (
                <tr key={c.id}>
                  <td>
                    <p className="font-mono text-xs text-slate-500">{c.id.slice(0, 8)}...</p>
                    <p className="text-lg font-bold text-emerald-700">{formatMoney(c.netAmount)}</p>
                  </td>
                  <td>
                    <Link to={`/admin/affiliates/${c.affiliateId}`} className="hover:text-brand-700">
                      <p className="font-medium text-sm">{c.affiliate?.name}</p>
                      <p className="text-xs text-slate-500">{c.affiliate?.affiliateCode}</p>
                    </Link>
                  </td>
                  <td>
                    <p className="font-mono text-xs">{c.order?.orderNumber}</p>
                    <p className="text-xs text-slate-500">{formatMoney(c.orderValue)} order</p>
                  </td>
                  <td>{c.coupon?.couponCode ? <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{c.coupon.couponCode}</code> : '—'}</td>
                  <td className="text-xs space-y-0.5">
                    <p className="text-slate-500">Eligible: <span className="text-slate-800 font-medium">{formatMoney(c.eligibleValue)}</span></p>
                    <p className="text-slate-500">Base: <span className="text-slate-800 font-medium">{formatMoney(c.commissionBase)}</span></p>
                    <p className="text-slate-500">Rate × <span className="text-brand-700 font-semibold">{c.commissionRate}%</span> = <span className="font-bold">{formatMoney(c.commissionAmount)}</span></p>
                    {c.reversalAmount > 0 && <p className="text-red-600">Reverse: -{formatMoney(c.reversalAmount)}</p>}
                  </td>
                  <td>
                    {statusBadge(c.status)}
                    {c.holdReason && <p className="text-[10px] text-amber-700 mt-0.5 max-w-[160px] truncate">⚠ {c.holdReason}</p>}
                  </td>
                  <td className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(c.createdAt)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {['PENDING', 'ON_HOLD'].includes(c.status) && (
                        <motion.button whileHover={{ y: -2 }} whileTap={{ scaleY: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="btn-success !px-2 !py-1 text-xs" onClick={() => openAction({ action: 'approve', id: c.id })}><CheckCircle2 className="w-3 h-3" /> Approve</motion.button>
                      )}
                      {!['PAID', 'CANCELLED', 'REVERSED'].includes(c.status) && c.status !== 'REJECTED' && (
                        <motion.button whileHover={{ y: -2 }} whileTap={{ scaleY: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="btn-danger !px-2 !py-1 text-xs" onClick={() => openAction({ action: 'reject', id: c.id })}><XCircle className="w-3 h-3" /> Reject</motion.button>
                      )}
                      {!['CANCELLED', 'REJECTED'].includes(c.status) && (
                        <motion.button whileHover={{ y: -2 }} whileTap={{ scaleY: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="btn-warning !px-2 !py-1 text-xs" onClick={() => openAction({ action: 'reverse', id: c.id, netAmount: c.netAmount })}><Undo2 className="w-3 h-3" /> Reverse</motion.button>
                      )}
                      {!['PAID', 'CANCELLED', 'REVERSED'].includes(c.status) && c.status !== 'ON_HOLD' && c.status !== 'REJECTED' && (
                        <motion.button whileHover={{ y: -2 }} whileTap={{ scaleY: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="btn-secondary !px-2 !py-1 text-xs" onClick={() => openAction({ action: 'hold', id: c.id })}><Clock className="w-3 h-3" /> Hold</motion.button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </TableReveal>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm">
          <p className="text-slate-500">Page {page} of {pages || 1} · {total} total</p>
          <div className="flex gap-2">
            <motion.button whileHover={{ y: -2 }} whileTap={{ scaleY: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="btn-secondary !py-1" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</motion.button>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scaleY: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="btn-secondary !py-1" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</motion.button>
          </div>
        </div>
      </DepthCard>

      <Modal open={!!actionModal} onClose={() => { setActionModal(null); setActionData({ notes: '', amount: '', reason: '' }); }}
        title={actionModal ? actionDefs[actionModal.action].title : ''}
        footer={<>
          <button className="btn-secondary" onClick={() => { setActionModal(null); setActionData({ notes: '', amount: '', reason: '' }); }}>Cancel</button>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scaleY: 0.97 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className={`btn-${actionDefs[actionModal?.action]?.tone || 'primary'}`}
            onClick={doAction}
          >
            Confirm
          </motion.button>
        </>}>
        {actionModal && (
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">{actionDefs[actionModal.action].body}</p>
            {actionDefs[actionModal.action].needs.includes('notes') && (
              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input min-h-[80px]" value={actionData.notes} onChange={e => setActionData(d => ({ ...d, notes: e.target.value }))} placeholder="Reason for this action..." />
              </div>
            )}
            {actionDefs[actionModal.action].needs.includes('reason') && (
              <div>
                <label className="label">Reason</label>
                <input className="input" value={actionData.reason} onChange={e => setActionData(d => ({ ...d, reason: e.target.value }))} placeholder="Why is this on hold?" required />
              </div>
            )}
            {actionDefs[actionModal.action].needs.includes('amount') && (
              <div>
                <label className="label">Reversal Amount (leave blank for full: {formatMoney(actionModal.netAmount)})</label>
                <input className="input" type="number" value={actionData.amount} onChange={e => setActionData(d => ({ ...d, amount: e.target.value }))} placeholder="Partial amount or leave blank for full" />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
    </PageTransition>
  );
}
