import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatMoney, formatDate, statusBadge, Modal, Alert, EmptyState, Badge } from '../../components/ui';
import { Ticket, Search, Filter, Plus, Edit2, RefreshCw, CheckCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition, DepthCard, TableReveal } from '../../components/anim';

export default function AdminCoupons() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState({ status: '', search: '', affiliateId: '' });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const [editOpen, setEditOpen] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const { data } = await api.get(`/admin/coupons?${params.toString()}`);
      setItems(data.data.items);
      setTotal(data.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, filters.status]);

  const pages = Math.ceil(total / limit);

  const saveEdit = async () => {
    try {
      await api.put(`/admin/coupons/${editOpen}`, editForm);
      setNotice({ type: 'success', message: 'Coupon updated.' });
      setEditOpen(null);
      load();
    } catch (e) {
      setNotice({ type: 'danger', message: e?.response?.data?.error?.message || 'Update failed.' });
    }
  };

  const approveCoupon = async (id) => {
    try {
      await api.post(`/admin/coupons/${id}/approve`);
      setNotice({ type: 'success', message: 'Coupon approved and activated.' });
      load();
    } catch (e) {
      setNotice({ type: 'danger', message: e?.response?.data?.error?.message || 'Approval failed.' });
    }
  };

  return (
    <PageTransition key={location.pathname}>
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Coupon Management</h1>
            <p className="text-slate-500 mt-1">Manage all affiliate coupons: discount values, commission rates, usage limits, status.</p>
          </div>
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Add Coupon
          </button>
        </div>
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
        <div className="card-body grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="label flex items-center gap-1"><Search className="w-3.5 h-3.5" /> Search Code</label>
            <input className="input font-mono" placeholder="ALEX10..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </div>
          <div>
            <label className="label flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Status</label>
            <select className="input" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="EXPIRED">Expired</option>
              <option value="DEPLETED">Depleted</option>
            </select>
          </div>
          <div>
            <label className="label">Affiliate ID (optional)</label>
            <input className="input" placeholder="uuid or AFF-000001" value={filters.affiliateId} onChange={e => setFilters(f => ({ ...f, affiliateId: e.target.value }))} />
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
                <th>Coupon</th>
                <th>Affiliate</th>
                <th>Customer Discount</th>
                <th>Affiliate Commission</th>
                <th>Usage</th>
                <th>Created</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <TableReveal rowsStagger={28}>
              {loading && <tr><td colSpan="9" className="text-center py-10 text-slate-500">Loading...</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan="9"><EmptyState title="No coupons" description="Coupons appear here when affiliates are approved." /></td></tr>}
              {items.map(c => (
                <tr key={c.id}>
                  <td>
                    <code className="font-mono text-sm font-bold bg-slate-100 px-2 py-1 rounded">{c.couponCode}</code>
                  </td>
                  <td>
                    <Link to={`/admin/affiliates/${c.affiliateId}`} className="hover:text-brand-700">
                      <p className="font-medium text-slate-900 text-sm">{c.affiliate?.name}</p>
                      <p className="text-xs text-slate-500">{c.affiliate?.affiliateCode}</p>
                    </Link>
                  </td>
                  <td>
                    <Badge variant={c.discountType === 'PERCENTAGE' ? 'brand' : 'purple'}>
                      {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `${formatMoney(c.discountValue)} fixed`}
                    </Badge>
                    {c.maximumDiscount != null && <p className="text-xs text-slate-500 mt-0.5">max {formatMoney(c.maximumDiscount)}</p>}
                  </td>
                  <td>
                    <p className="font-semibold text-sm">{c.commissionRate?.toString()}%</p>
                    <p className="text-xs text-slate-500">{c.commissionBaseType?.replace(/_/g, ' ')}</p>
                  </td>
                  <td>
                    <p className="font-medium">{c.usageCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ''}</p>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      {c.usageLimit != null && (
                        <motion.div
                          className="h-full bg-brand-500 rounded-full"
                          initial={{ width: '0%' }}
                          animate={{ width: `${Math.min(100, (c.usageCount / c.usageLimit) * 100)}%` }}
                          transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
                        />
                      )}
                    </div>
                  </td>
                  <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                  <td className="text-xs text-slate-500 whitespace-nowrap">{c.expiresAt ? formatDate(c.expiresAt) : '—'}</td>
                  <td>{c.status === 'INACTIVE' ? <Badge variant="warning">Pending Approval</Badge> : statusBadge(c.status)}</td>
                  <td>
                    {c.status === 'INACTIVE' && <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scaleY: 0.97 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                      className="btn-success !px-2 !py-1 text-xs mr-2"
                      onClick={() => approveCoupon(c.id)}
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </motion.button>}
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scaleY: 0.97 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                      className="btn-ghost !px-2 !py-1 text-xs"
                      onClick={() => { setEditOpen(c.id); setEditForm({ ...c, discountValue: c.discountValue?.toString(), commissionRate: c.commissionRate?.toString() }); }}
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </motion.button>
                  </td>
                </tr>
              ))}
            </TableReveal>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm">
          <p className="text-slate-500">Page {page} of {pages || 1} · {total} total coupons</p>
          <div className="flex gap-2">
            <motion.button whileHover={{ y: -2 }} whileTap={{ scaleY: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="btn-secondary !py-1" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</motion.button>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scaleY: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="btn-secondary !py-1" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</motion.button>
          </div>
        </div>
      </DepthCard>

      <Modal open={!!editOpen} onClose={() => setEditOpen(null)} title="Edit Coupon" size="lg"
        footer={<>
          <button className="btn-secondary" onClick={() => setEditOpen(null)}>Cancel</button>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scaleY: 0.97 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="btn-primary"
            onClick={saveEdit}
          >
            Save Changes
          </motion.button>
        </>}>
        {editOpen && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2">
              <p className="text-sm text-slate-500 mb-2">Editing coupon: <code className="font-mono bg-slate-100 px-2 py-0.5 rounded">{editForm.couponCode}</code></p>
            </div>
            <div>
              <label className="label">Discount Type</label>
              <select className="input" value={editForm.discountType} onChange={e => setEditForm(f => ({ ...f, discountType: e.target.value }))}>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed</option>
              </select>
            </div>
            <div>
              <label className="label">Discount Value</label>
              <input className="input" type="number" value={editForm.discountValue ?? ''} onChange={e => setEditForm(f => ({ ...f, discountValue: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Commission %</label>
              <input className="input" type="number" value={editForm.commissionRate ?? ''} onChange={e => setEditForm(f => ({ ...f, commissionRate: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Commission Base</label>
              <select className="input" value={editForm.commissionBaseType} onChange={e => setEditForm(f => ({ ...f, commissionBaseType: e.target.value }))}>
                <option value="DISCOUNTED_VALUE">Discounted Value</option>
                <option value="ORIGINAL_VALUE">Original Value</option>
                <option value="EXCLUDING_TAX">Excl. Tax</option>
                <option value="EXCLUDING_TAX_AND_SHIPPING">Excl. Tax &amp; Shipping</option>
              </select>
            </div>
            <div>
              <label className="label">Min Order Value</label>
              <input className="input" type="number" value={editForm.minimumOrderValue ?? ''} onChange={e => setEditForm(f => ({ ...f, minimumOrderValue: Number(e.target.value) || null }))} />
            </div>
            <div>
              <label className="label">Max Discount</label>
              <input className="input" type="number" value={editForm.maximumDiscount ?? ''} onChange={e => setEditForm(f => ({ ...f, maximumDiscount: Number(e.target.value) || null }))} />
            </div>
            <div>
              <label className="label">Usage Limit</label>
              <input className="input" type="number" value={editForm.usageLimit ?? ''} onChange={e => setEditForm(f => ({ ...f, usageLimit: e.target.value ? Number(e.target.value) : null }))} />
            </div>
            <div>
              <label className="label">Per-customer Limit</label>
              <input className="input" type="number" value={editForm.perCustomerLimit ?? ''} onChange={e => setEditForm(f => ({ ...f, perCustomerLimit: e.target.value ? Number(e.target.value) : null }))} />
            </div>
            <div>
              <label className="label">Start Date</label>
              <input className="input" type="date" value={editForm.startAt?.slice?.(0, 10) ?? ''} onChange={e => setEditForm(f => ({ ...f, startAt: e.target.value }))} />
            </div>
            <div>
              <label className="label">Expiry Date</label>
              <input className="input" type="date" value={editForm.expiresAt?.slice?.(0, 10) ?? ''} onChange={e => setEditForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </Modal>

      <CreateCouponModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load(); setNotice({ type: 'success', message: 'Coupon created.' }); }} />
    </div>
    </PageTransition>
  );
}

function CreateCouponModal({ open, onClose, onCreated }) {
  const [affiliates, setAffiliates] = useState([]);
  const [form, setForm] = useState({ affiliateId: '', couponCode: '', discountType: 'PERCENTAGE', discountValue: 10, commissionRate: 5, commissionBaseType: 'DISCOUNTED_VALUE', usageLimit: '', perCustomerLimit: '', startAt: '', expiresAt: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    api.get('/admin/affiliates?page=1&limit=100&status=ACTIVE')
      .then(({ data }) => setAffiliates(data.data.items || []))
      .catch(() => setError('Could not load active affiliates.'));
  }, [open]);

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const submit = async () => {
    try {
      setError('');
      await api.post('/admin/coupons', {
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
      <button className="btn-primary" onClick={submit} disabled={!form.affiliateId || !form.couponCode}>Create Coupon</button>
    </>}>
      {error && <Alert type="danger" className="mb-4">{error}</Alert>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="sm:col-span-2">
          <label className="label">Affiliate</label>
          <select className="input" value={form.affiliateId} onChange={e => update('affiliateId', e.target.value)}>
            <option value="">Select an active affiliate</option>
            {affiliates.map(affiliate => <option key={affiliate.id} value={affiliate.id}>{affiliate.name} ({affiliate.affiliateCode})</option>)}
          </select>
        </div>
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
