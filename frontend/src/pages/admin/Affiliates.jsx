import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatMoney, formatDate, statusBadge, Badge, Modal, EmptyState, Alert } from '../../components/ui';
import { Users, Search, Filter, Plus, UserCheck, XCircle, Ban, UserX, RefreshCw } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageTransition, TableReveal } from '../../components/anim';

export default function AdminAffiliates() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState({ status: '', search: '', country: '', coupon: '', minSales: '', minCommission: '' });
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [notice, setNotice] = useState(null);
  const [createForm, setCreateForm] = useState({
    name: '', email: '', phone: '', country: '', businessName: '', website: '',
    couponCode: '', discountValue: 10, commissionRate: 5, status: 'APPROVED',
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const { data } = await api.get(`/admin/affiliates?${params.toString()}`);
      setItems(data.data.items);
      setTotal(data.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, filters.status]);

  const pages = Math.ceil(total / limit);

  const doAction = async (affId, action) => {
    try {
      const body = (action === 'reject' || action === 'suspend') && actionReason ? { reason: actionReason } : {};
      await api.post(`/admin/affiliates/${affId}/${action}`, body);
      setNotice({ type: 'success', message: `Affiliate ${action} successful.` });
      setActionModal(null);
      setActionReason('');
      load();
    } catch (e) {
      setNotice({ type: 'danger', message: e?.response?.data?.error?.message || 'Action failed.' });
    }
  };

  const createAffiliate = async () => {
    try {
      await api.post('/admin/affiliates', createForm);
      setNotice({ type: 'success', message: 'Affiliate created successfully.' });
      setCreateOpen(false);
      setCreateForm({ name: '', email: '', phone: '', country: '', businessName: '', website: '', couponCode: '', discountValue: 10, commissionRate: 5, status: 'APPROVED' });
      load();
    } catch (e) {
      setNotice({ type: 'danger', message: e?.response?.data?.error?.message || 'Create failed.' });
    }
  };

  return (
    <PageTransition key={location.pathname}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Affiliate Management</h1>
            <p className="text-slate-500 mt-1">Review applications, manage partners, and configure their coupons.</p>
          </div>
          <motion.div
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          >
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> Create Affiliate
            </button>
          </motion.div>
        </div>

        {notice && <Alert type={notice.type}>{notice.message}</Alert>}

        <motion.div
          className="card"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <label className="label flex items-center gap-1"><Search className="w-3.5 h-3.5" /> Search</label>
              <input className="input" placeholder="Name / Email / Affiliate Code..." value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
            <div>
              <label className="label flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Status</label>
              <select className="input" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REJECTED">Rejected</option>
                <option value="DEACTIVATED">Deactivated</option>
              </select>
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input" placeholder="Spain..." value={filters.country} onChange={e => setFilters(f => ({ ...f, country: e.target.value }))} />
            </div>
            <div>
              <label className="label">Coupon</label>
              <input className="input" placeholder="ALEX10..." value={filters.coupon} onChange={e => setFilters(f => ({ ...f, coupon: e.target.value }))} />
            </div>
            <div className="flex items-end gap-2">
              <button className="btn-secondary flex-1" onClick={load} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Apply
              </button>
            </div>
          </div>
        </motion.div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Affiliate</th>
                  <th>Coupon</th>
                  <th>Status</th>
                  <th>Country</th>
                  <th>Orders</th>
                  <th>Sales</th>
                  <th>Commission</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <TableReveal rowsStagger={28}>
                {loading && <tr key="loading"><td colSpan="9" className="text-center py-10 text-slate-500">Loading...</td></tr>}
                {!loading && items.length === 0 && <tr key="empty"><td colSpan="9"><EmptyState title="No affiliates match filters" description="Try adjusting your search or filters." /></td></tr>}
                {items.map(a => (
                  <tr key={a.id}>
                    <td>
                      <Link to={`/admin/affiliates/${a.id}`} className="flex items-center gap-3 hover:text-brand-700">
                        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                          {(a.name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{a.name}</p>
                          <p className="text-xs text-slate-500">{a.email} · {a.affiliateCode}</p>
                        </div>
                      </Link>
                    </td>
                    <td>
                      {a.coupon ? (
                        <div>
                          <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-sm">{a.coupon.code}</code>
                          {statusBadge(a.coupon.status, { animated: true })}
                        </div>
                      ) : <span className="text-slate-400 text-sm">—</span>}
                    </td>
                    <td>{statusBadge(a.status, { animated: true })}</td>
                    <td className="text-slate-600">{a.country || '—'}</td>
                    <td className="font-medium">{a.totalOrders}</td>
                    <td className="font-medium">{formatMoney(a.totalSales)}</td>
                    <td>
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">{formatMoney(a.totalCommission)}</p>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          <span className="text-xs text-amber-600">P: {formatMoney(a.pendingCommission)}</span>
                          <span className="text-xs text-blue-600">A: {formatMoney(a.approvedCommission)}</span>
                          <span className="text-xs text-emerald-600">D: {formatMoney(a.paidCommission)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-slate-500 text-xs whitespace-nowrap">{formatDate(a.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link to={`/admin/affiliates/${a.id}`} className="btn-ghost !px-2 !py-1 text-xs">View</Link>
                        {a.status === 'PENDING' && (
                          <>
                            <button className="btn-success !px-2 !py-1 text-xs" onClick={() => doAction(a.id, 'approve')}><UserCheck className="w-3.5 h-3.5" /> Approve</button>
                            <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => { setSelected(a); setActionModal('reject'); }}><XCircle className="w-3.5 h-3.5" /> Reject</button>
                          </>
                        )}
                        {a.status === 'ACTIVE' && (
                          <button className="btn-warning !px-2 !py-1 text-xs" onClick={() => { setSelected(a); setActionModal('suspend'); }}><Ban className="w-3.5 h-3.5" /> Suspend</button>
                        )}
                        {a.status === 'SUSPENDED' && (
                          <button className="btn-success !px-2 !py-1 text-xs" onClick={() => doAction(a.id, 'reactivate')}><RefreshCw className="w-3.5 h-3.5" /> Reactivate</button>
                        )}
                        {(a.status === 'ACTIVE' || a.status === 'SUSPENDED') && (
                          <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => { setSelected(a); setActionModal('deactivate'); }}><UserX className="w-3.5 h-3.5" /> Deactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </TableReveal>
            </table>
          </div>
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm">
          <p className="text-slate-500">Page {page} of {pages || 1} · {total} total affiliates</p>
          <div className="flex gap-2">
            <button className="btn-secondary !py-1" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="btn-secondary !py-1" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Affiliate" size="lg"
        footer={<>
          <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={createAffiliate}>Create Affiliate & Coupon</button>
        </>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" required><input className="input" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required /></Field>
          <Field label="Email" required><input className="input" type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} required /></Field>
          <Field label="Phone"><input className="input" value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="Country"><input className="input" value={createForm.country} onChange={e => setCreateForm(f => ({ ...f, country: e.target.value }))} /></Field>
          <Field label="Business Name"><input className="input" value={createForm.businessName} onChange={e => setCreateForm(f => ({ ...f, businessName: e.target.value }))} /></Field>
          <Field label="Website"><input className="input" value={createForm.website} onChange={e => setCreateForm(f => ({ ...f, website: e.target.value }))} /></Field>
          <div className="sm:col-span-2 border-t border-slate-200 pt-4">
            <p className="font-semibold mb-3">Coupon & Commission</p>
          </div>
          <Field label="Coupon Code (leave blank to auto-generate)"><input className="input font-mono" placeholder="ALEX10" value={createForm.couponCode} onChange={e => setCreateForm(f => ({ ...f, couponCode: e.target.value.toUpperCase() }))} /></Field>
          <Field label="Initial Status">
            <select className="input" value={createForm.status} onChange={e => setCreateForm(f => ({ ...f, status: e.target.value }))}>
              <option value="APPROVED">Approve Immediately (Active)</option>
              <option value="PENDING">Create as Pending</option>
            </select>
          </Field>
          <Field label="Customer Discount %"><input className="input" type="number" value={createForm.discountValue} onChange={e => setCreateForm(f => ({ ...f, discountValue: Number(e.target.value) }))} /></Field>
          <Field label="Affiliate Commission %"><input className="input" type="number" value={createForm.commissionRate} onChange={e => setCreateForm(f => ({ ...f, commissionRate: Number(e.target.value) }))} /></Field>
        </div>
      </Modal>

      <Modal open={!!actionModal} onClose={() => { setActionModal(null); setActionReason(''); }}
        title={`${actionModal === 'reject' ? 'Reject' : actionModal === 'suspend' ? 'Suspend' : 'Deactivate'} Affiliate`}
        footer={<>
          <button className="btn-secondary" onClick={() => { setActionModal(null); setActionReason(''); }}>Cancel</button>
          <button className={`${actionModal === 'reject' || actionModal === 'deactivate' ? 'btn-danger' : 'btn-warning'}`} onClick={() => selected && doAction(selected.id, actionModal)}>
            Confirm
          </button>
        </>}>
        {selected && (
          <div>
            <p className="text-slate-600 mb-4">
              Are you sure you want to <b className="text-red-600">{actionModal}</b> affiliate <b>{selected.name}</b> ({selected.affiliateCode})?
            </p>
            <label className="label">Reason (optional)</label>
            <textarea className="input min-h-[80px]" value={actionReason} onChange={e => setActionReason(e.target.value)} placeholder="Optional note to affiliate..." />
          </div>
        )}
      </Modal>
      </div>
    </PageTransition>
  );
}

const Field = ({ label, required, children }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
  </div>
);
