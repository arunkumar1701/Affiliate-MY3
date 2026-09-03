import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatMoney, formatDate, formatDateTime, statusBadge, Modal, Alert, EmptyState, Badge } from '../../components/ui';
import { FileSpreadsheet, Search, Filter, Plus, CheckCircle2, DollarSign, FileDown, RefreshCw } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition, TableReveal, useReducedMotion } from '../../components/anim';

export default function AdminPayouts() {
  const location = useLocation();
  const reduced = useReducedMotion();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState({ status: '', affiliateId: '' });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createAffiliateId, setCreateAffiliateId] = useState('');
  const [createAdjustment, setCreateAdjustment] = useState('');
  const [createPaymentMethod, setCreatePaymentMethod] = useState('BANK_TRANSFER');
  const [createPaymentDate, setCreatePaymentDate] = useState('');
  const [createPaymentRef, setCreatePaymentRef] = useState('');
  const [createNotes, setCreateNotes] = useState('');

  const [paidModal, setPaidModal] = useState(null);
  const [paidForm, setPaidForm] = useState({ paymentDate: '', paymentReference: '', paymentProof: '' });

  const [editOpen, setEditOpen] = useState(null);
  const [editForm, setEditForm] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const { data } = await api.get(`/admin/payouts?${params.toString()}`);
      setItems(data.data.items);
      setTotal(data.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, filters.status]);

  const pages = Math.ceil(total / limit);

  const createPayout = async () => {
    try {
      const body = {
        affiliateId: createAffiliateId,
        adjustmentAmount: createAdjustment ? Number(createAdjustment) : 0,
        paymentMethod: createPaymentMethod,
        paymentDate: createPaymentDate || undefined,
        paymentReference: createPaymentRef || undefined,
        notes: createNotes || undefined,
      };
      await api.post('/admin/payouts', body);
      setNotice({ type: 'success', message: 'Payout created.' });
      setCreateOpen(false);
      resetCreate();
      load();
    } catch (e) {
      setNotice({ type: 'danger', message: e?.response?.data?.error?.message || 'Create failed.' });
    }
  };

  const resetCreate = () => {
    setCreateAffiliateId(''); setCreateAdjustment(''); setCreatePaymentMethod('BANK_TRANSFER');
    setCreatePaymentDate(''); setCreatePaymentRef(''); setCreateNotes('');
  };

  const markPaid = async () => {
    try {
      await api.post(`/admin/payouts/${paidModal}/mark-paid`, paidForm);
      setNotice({ type: 'success', message: 'Payout marked as PAID. Commissions updated.' });
      setPaidModal(null);
      setPaidForm({ paymentDate: '', paymentReference: '', paymentProof: '' });
      load();
    } catch (e) {
      setNotice({ type: 'danger', message: e?.response?.data?.error?.message || 'Failed.' });
    }
  };

  const saveEdit = async () => {
    try {
      await api.put(`/admin/payouts/${editOpen}`, editForm);
      setNotice({ type: 'success', message: 'Payout updated.' });
      setEditOpen(null);
      load();
    } catch (e) {
      setNotice({ type: 'danger', message: e?.response?.data?.error?.message || 'Failed.' });
    }
  };

  const exportCsv = () => window.open(`/api/admin/export/payouts?format=csv`, '_blank');

  return (
    <PageTransition key={location.pathname}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Payout Management</h1>
            <p className="text-slate-500 mt-1">Generate payouts for approved commissions, mark paid, track records.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={exportCsv}><FileDown className="w-4 h-4" /> Export</button>
            <button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> New Payout</button>
          </div>
        </div>

        {notice && <Alert type={notice.type}>{notice.message}</Alert>}

        <div className="card">
          <div className="card-body grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="label flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Status</label>
              <select className="input" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="PAID">Paid</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="label">Affiliate ID</label>
              <input className="input" placeholder="uuid..." value={filters.affiliateId} onChange={e => setFilters(f => ({ ...f, affiliateId: e.target.value }))} />
            </div>
            <div className="flex items-end sm:col-span-2 gap-2">
              <button className="btn-secondary" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Apply</button>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={filters.status || 'all'}
            initial={reduced ? {} : { opacity: 0, x: 8 }}
            animate={reduced ? {} : { opacity: 1, x: 0 }}
            exit={reduced ? {} : { opacity: 0, x: -8 }}
            transition={{ duration: reduced ? 0.05 : 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Affiliate</th>
                      <th>Gross</th>
                      <th>Adjustment</th>
                      <th>Net Amount</th>
                      <th>Items</th>
                      <th>Method</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <TableReveal rowsStagger={28}>
                    {loading && <tr><td colSpan="10" className="text-center py-10 text-slate-500">Loading...</td></tr>}
                    {!loading && items.length === 0 && <tr><td colSpan="10"><EmptyState title="No payouts" description="Create payouts when affiliates reach the minimum threshold." /></td></tr>}
                    {items.map(p => (
                      <tr key={p.id}>
                        <td>
                          <p className="font-mono font-semibold text-sm">{p.payoutReference}</p>
                          <p className="text-xs text-slate-500">{p.id.slice(0, 8)}...</p>
                        </td>
                        <td>
                          <Link to={`/admin/affiliates/${p.affiliateId}`} className="hover:text-brand-700">
                            <p className="font-medium text-sm">{p.affiliate?.name}</p>
                            <p className="text-xs text-slate-500">{p.affiliate?.affiliateCode}</p>
                          </Link>
                        </td>
                        <td>{formatMoney(p.grossAmount)}</td>
                        <td className={p.adjustmentAmount !== 0 ? (p.adjustmentAmount > 0 ? 'text-emerald-700' : 'text-red-600') : 'text-slate-500'}>
                          {p.adjustmentAmount > 0 ? '+' : ''}{formatMoney(p.adjustmentAmount)}
                        </td>
                        <td className="font-bold text-lg">{formatMoney(p.netAmount)}</td>
                        <td><Badge variant="info">{p.commissionCount}</Badge></td>
                        <td className="text-sm">{p.paymentMethod?.replace(/_/g, ' ') || '—'}</td>
                        <td className="text-xs whitespace-nowrap text-slate-500">{formatDateTime(p.createdAt)}</td>
                        <td>{statusBadge(p.status, { animated: true })}</td>
                        <td>
                          <div className="flex gap-1">
                            <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => { setEditOpen(p.id); setEditForm({ ...p, adjustmentAmount: p.adjustmentAmount?.toString() ?? '0' }); }}>Edit</button>
                            {['PENDING', 'PROCESSING'].includes(p.status) && (
                              <button className="btn-success !px-2 !py-1 text-xs" onClick={() => { setPaidModal(p.id); setPaidForm({ paymentDate: new Date().toISOString().slice(0, 10), paymentReference: p.paymentReference, paymentProof: '' }); }}>
                                <CheckCircle2 className="w-3 h-3" /> Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </TableReveal>
                </table>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm">
              <p className="text-slate-500">Page {page} of {pages || 1} · {total} total</p>
              <div className="flex gap-2">
                <button className="btn-secondary !py-1" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <button className="btn-secondary !py-1" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Payout" size="lg"
        footer={<>
          <button className="btn-secondary" onClick={() => { setCreateOpen(false); resetCreate(); }}>Cancel</button>
          <button className="btn-primary" onClick={createPayout}>Generate Payout</button>
        </>}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2">
            <label className="label">Affiliate ID *</label>
            <input className="input" placeholder="uuid of affiliate" value={createAffiliateId} onChange={e => setCreateAffiliateId(e.target.value)} required />
            <p className="text-xs text-slate-500 mt-1">All APPROVED commissions for this affiliate will be included.</p>
          </div>
          <div>
            <label className="label">Adjustment (±)</label>
            <input className="input" type="number" step="0.01" placeholder="-5.00 or +10.00" value={createAdjustment} onChange={e => setCreateAdjustment(e.target.value)} />
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="input" value={createPaymentMethod} onChange={e => setCreatePaymentMethod(e.target.value)}>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="PAYPAL">PayPal</option>
              <option value="STRIPE">Stripe</option>
              <option value="WISE">Wise</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Expected Payment Date</label>
            <input className="input" type="date" value={createPaymentDate} onChange={e => setCreatePaymentDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Payment Reference</label>
            <input className="input" value={createPaymentRef} onChange={e => setCreatePaymentRef(e.target.value)} placeholder="TXN ID..." />
          </div>
          <div className="col-span-2">
            <label className="label">Notes</label>
            <textarea className="input min-h-[60px]" value={createNotes} onChange={e => setCreateNotes(e.target.value)} />
          </div>
        </div>
      </Modal>

      <Modal open={!!paidModal} onClose={() => setPaidModal(null)} title="Mark Payout as PAID"
        footer={<>
          <button className="btn-secondary" onClick={() => setPaidModal(null)}>Cancel</button>
          <button className="btn-success" onClick={markPaid}><DollarSign className="w-4 h-4" /> Confirm Paid</button>
        </>}>
        <Alert type="warning" className="mb-4">This will mark ALL underlying commissions as PAID and notify the affiliate. Cannot be undone.</Alert>
        <div className="space-y-3 text-sm">
          <div>
            <label className="label">Payment Date</label>
            <input className="input" type="date" value={paidForm.paymentDate} onChange={e => setPaidForm(f => ({ ...f, paymentDate: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Payment Reference (transaction ID)</label>
            <input className="input" value={paidForm.paymentReference} onChange={e => setPaidForm(f => ({ ...f, paymentReference: e.target.value }))} placeholder="Stripe/PayPal TXN..." />
          </div>
          <div>
            <label className="label">Proof / Receipt URL (optional)</label>
            <input className="input" value={paidForm.paymentProof} onChange={e => setPaidForm(f => ({ ...f, paymentProof: e.target.value }))} placeholder="https://..." />
          </div>
        </div>
      </Modal>

      <Modal open={!!editOpen} onClose={() => setEditOpen(null)} title="Edit Payout" footer={<>
        <button className="btn-secondary" onClick={() => setEditOpen(null)}>Cancel</button>
        <button className="btn-primary" onClick={saveEdit}>Save</button>
      </>}>
        {editOpen && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="label">Adjustment</label>
              <input className="input" type="number" step="0.01" value={editForm.adjustmentAmount ?? ''} onChange={e => setEditForm(f => ({ ...f, adjustmentAmount: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="PAID">Paid</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select className="input" value={editForm.paymentMethod ?? ''} onChange={e => setEditForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                <option value="">—</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="PAYPAL">PayPal</option>
                <option value="STRIPE">Stripe</option>
                <option value="WISE">Wise</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Payment Date</label>
              <input className="input" type="date" value={editForm.paymentDate?.slice?.(0, 10) ?? ''} onChange={e => setEditForm(f => ({ ...f, paymentDate: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Payment Reference</label>
              <input className="input" value={editForm.paymentReference ?? ''} onChange={e => setEditForm(f => ({ ...f, paymentReference: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea className="input min-h-[60px]" value={editForm.notes ?? ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
