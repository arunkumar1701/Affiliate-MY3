import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { formatMoney, formatDate, formatDateTime, statusBadge, Badge, Modal, Alert } from '../../components/ui';
import { ArrowLeft, UserCheck, Ban, RefreshCw, Edit2, Plus, Wallet, ShoppingCart, Ticket, FileSpreadsheet } from 'lucide-react';
import { PageTransition, Reveal3D, DepthCard } from '../../components/anim';

export default function AdminAffiliateDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [couponModal, setCouponModal] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionReason, setActionReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/admin/affiliates/${id}`);
      setData(res.data);
      setEditForm(res.data.affiliate);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action) => {
    try {
      const body = (action === 'reject' || action === 'suspend') && actionReason ? { reason: actionReason } : {};
      await api.post(`/admin/affiliates/${id}/${action}`, body);
      setNotice({ type: 'success', message: `Affiliate ${action} successful.` });
      setActionModal(null);
      setActionReason('');
      load();
    } catch (e) {
      setNotice({ type: 'danger', message: e?.response?.data?.error?.message || 'Action failed.' });
    }
  };

  const saveEdit = async () => {
    try {
      await api.put(`/admin/affiliates/${id}`, editForm);
      setNotice({ type: 'success', message: 'Affiliate profile updated.' });
      setEditOpen(false);
      load();
    } catch (e) {
      setNotice({ type: 'danger', message: e?.response?.data?.error?.message || 'Update failed.' });
    }
  };

  if (loading || !data) return <div className="p-10 text-center text-slate-500">Loading affiliate...</div>;

  const { affiliate, ordersSummary, commissionsSummary, payoutsSummary, recent } = data;

  return (
    <PageTransition key={location.pathname}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/affiliates" className="btn-ghost !p-2"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{affiliate.name}</h1>
              {statusBadge(affiliate.status)}
              <Badge variant="brand">{affiliate.affiliateCode}</Badge>
            </div>
            <p className="text-slate-500 mt-1">{affiliate.email}</p>
          </div>
          <button className="btn-secondary" onClick={() => setEditOpen(true)}><Edit2 className="w-4 h-4" /> Edit</button>
          {affiliate.status === 'PENDING' && (
            <>
              <button className="btn-success" onClick={() => doAction('approve')}><UserCheck className="w-4 h-4" /> Approve</button>
              <button className="btn-danger" onClick={() => setActionModal('reject')}>Reject</button>
            </>
          )}
          {affiliate.status === 'ACTIVE' && (
            <button className="btn-warning" onClick={() => setActionModal('suspend')}><Ban className="w-4 h-4" /> Suspend</button>
          )}
          {affiliate.status === 'SUSPENDED' && (
            <button className="btn-success" onClick={() => doAction('reactivate')}><RefreshCw className="w-4 h-4" /> Reactivate</button>
          )}
        </div>

        {notice && <Alert type={notice.type}>{notice.message}</Alert>}

        <Reveal3D stagger={80}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DepthCard hover className="card lg:col-span-1">
              <div className="card-header"><h2 className="font-semibold">Profile Info</h2></div>
              <div className="card-body space-y-3 text-sm">
                <Row label="Affiliate ID" value={affiliate.affiliateCode} mono />
                <Row label="Status" value={statusBadge(affiliate.status)} />
                <Row label="Email" value={affiliate.email} />
                <Row label="Phone" value={affiliate.phone || '—'} />
                <Row label="Country" value={affiliate.country || '—'} />
                <Row label="Address" value={[affiliate.address, affiliate.addressCity, affiliate.addressState, affiliate.addressZip].filter(Boolean).join(', ') || '—'} />
                <div className="border-t border-slate-200 my-3" />
                <Row label="Business Name" value={affiliate.businessName || '—'} />
                <Row label="Business Type" value={affiliate.businessType || '—'} />
                <Row label="Website" value={affiliate.website || '—'} />
                <Row label="Audience" value={affiliate.audienceType || '—'} />
                <Row label="Expected Volume" value={affiliate.expectedReferralVolume || '—'} />
                <div className="border-t border-slate-200 my-3" />
                <Row label="Commission Rate" value={affiliate.commissionRate != null ? `${affiliate.commissionRate}%` : 'Default'} />
                <Row label="Commission Base" value={<Badge variant="info">{affiliate.commissionBaseType}</Badge>} />
                <Row label="Default Payout Method" value={affiliate.payoutMethod || '—'} />
                <Row label="Payout Account" value={affiliate.payoutBankName ? `${affiliate.payoutBankName} (${affiliate.payoutAccountNumber})` : '—'} />
                <Row label="Registered" value={formatDate(affiliate.createdAt)} />
                <Row label="Approved" value={affiliate.approvedAt ? formatDate(affiliate.approvedAt) : '—'} />
              </div>
            </DepthCard>

            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <KpiMini title="Total Orders" icon={ShoppingCart} value={ordersSummary.total} sub={formatMoney(ordersSummary.sales) + ' sales'} tone="info" />
                <KpiMini title="Total Commission" icon={Wallet} value={formatMoney(commissionsSummary.totalAmount)} sub={commissionsSummary.total + ' entries'} tone="brand" />
                <KpiMini title="Payouts Paid" icon={FileSpreadsheet} value={payoutsSummary.total} sub={formatMoney(payoutsSummary.totalPaid) + ' paid'} tone="success" />
              </div>

              <DepthCard hover className="card">
                <div className="card-header"><h2 className="font-semibold">Commission Breakdown</h2></div>
                <div className="card-body grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED', 'REVERSED', 'ON_HOLD'].map(s => (
                    <div key={s} className="p-3 rounded-lg bg-slate-50 text-center">
                      {statusBadge(s)}
                      <p className="mt-2 text-xl font-bold text-slate-900">{formatMoney(commissionsSummary.byStatus?.[s] ?? 0)}</p>
                    </div>
                  ))}
                </div>
              </DepthCard>

              <DepthCard hover className="card">
                <div className="card-header flex items-center justify-between">
                  <h2 className="font-semibold">Coupons</h2>
                  <button className="btn-secondary !py-1 text-xs" onClick={() => setCouponModal(true)}><Plus className="w-3.5 h-3.5" /> New Coupon</button>
                </div>
                <div className="card-body !p-0">
                  <table className="table">
                    <thead><tr><th>Code</th><th>Discount</th><th>Commission</th><th>Usage</th><th>Status</th></tr></thead>
                    <tbody>
                      {affiliate.coupons?.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-500">No coupons yet</td></tr>}
                      {affiliate.coupons?.map(c => (
                        <tr key={c.id}>
                          <td className="font-mono font-semibold">{c.couponCode}</td>
                          <td>{c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `€${c.discountValue}`}</td>
                          <td>{c.commissionRate?.toString()}%</td>
                          <td>{c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                          <td>{statusBadge(c.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DepthCard>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DepthCard hover className="card">
                  <div className="card-header"><h2 className="font-semibold">Recent Orders</h2></div>
                  <div className="card-body !p-0 max-h-80 overflow-y-auto">
                    <table className="table">
                      <thead><tr><th>Order</th><th>Date</th><th>Value</th><th>Status</th></tr></thead>
                      <tbody>
                        {recent.orders?.length === 0 && <tr><td colSpan="4" className="text-center py-6 text-slate-500">No orders</td></tr>}
                        {recent.orders?.map(o => (
                          <tr key={o.id}>
                            <td className="font-mono text-xs">{o.orderNumber}</td>
                            <td className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                            <td>{formatMoney(o.subtotal)}</td>
                            <td>{statusBadge(o.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DepthCard>

                <DepthCard hover className="card">
                  <div className="card-header"><h2 className="font-semibold">Recent Payouts</h2></div>
                  <div className="card-body !p-0 max-h-80 overflow-y-auto">
                    <table className="table">
                      <thead><tr><th>Reference</th><th>Date</th><th>Net</th><th>Status</th></tr></thead>
                      <tbody>
                        {recent.payouts?.length === 0 && <tr><td colSpan="4" className="text-center py-6 text-slate-500">No payouts</td></tr>}
                        {recent.payouts?.map(p => (
                          <tr key={p.id}>
                            <td className="font-mono text-xs">{p.payoutReference}</td>
                            <td className="text-xs whitespace-nowrap">{formatDate(p.createdAt)}</td>
                            <td className="font-semibold">{formatMoney(p.netAmount)}</td>
                            <td>{statusBadge(p.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DepthCard>
              </div>
            </div>
          </div>
        </Reveal3D>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Affiliate" size="lg"
        footer={<>
          <button className="btn-secondary" onClick={() => setEditOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={saveEdit}>Save Changes</button>
        </>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {['name', 'email', 'phone', 'country', 'address', 'addressCity', 'addressState', 'addressZip',
            'businessName', 'businessType', 'website', 'audienceType', 'description', 'expectedReferralVolume',
            'commissionRate', 'commissionBaseType', 'payoutAccountHolder', 'payoutBankName', 'payoutAccountNumber',
            'payoutIban', 'payoutBicSwift', 'payoutMethod'].map(k => (
            <div key={k} className={['description', 'payoutBillingInfo'].includes(k) ? 'sm:col-span-2' : ''}>
              <label className="label capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</label>
              <input className="input" value={editForm?.[k] ?? ''} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={!!actionModal} onClose={() => { setActionModal(null); setActionReason(''); }}
        title={`${actionModal === 'reject' ? 'Reject' : 'Suspend'} Affiliate`}
        footer={<>
          <button className="btn-secondary" onClick={() => { setActionModal(null); setActionReason(''); }}>Cancel</button>
          <button className={actionModal === 'reject' ? 'btn-danger' : 'btn-warning'} onClick={() => doAction(actionModal)}>Confirm</button>
        </>}>
        <p className="mb-4 text-slate-600">Are you sure?</p>
        <label className="label">Reason (optional)</label>
        <textarea className="input min-h-[80px]" value={actionReason} onChange={e => setActionReason(e.target.value)} />
      </Modal>

      <CouponModal open={!!couponModal} onClose={() => setCouponModal(null)} affiliateId={id} onCreated={() => { setCouponModal(null); load(); setNotice({ type: 'success', message: 'Coupon created.' }); }} />
      </div>
    </PageTransition>
  );
}

const Row = ({ label, value, mono }) => (
  <div className="flex items-start justify-between gap-2">
    <span className="text-slate-500 shrink-0">{label}</span>
    <span className={`text-slate-800 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

const KpiMini = ({ title, value, sub, icon: Icon, tone }) => {
  const tones = {
    info: 'bg-blue-50 text-blue-600', brand: 'bg-brand-50 text-brand-600',
    success: 'bg-emerald-50 text-emerald-600', warning: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">{title}</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${tones[tone] ?? tones.info}`}><Icon className="w-5 h-5" /></div>
      </div>
    </div>
  );
};

function CouponModal({ open, onClose, affiliateId, onCreated }) {
  const [form, setForm] = useState({ couponCode: '', discountType: 'PERCENTAGE', discountValue: 10, commissionRate: 5, commissionBaseType: 'DISCOUNTED_VALUE', usageLimit: '', perCustomerLimit: '', expiresAt: '' });
  const [err, setErr] = useState('');
  const submit = async () => {
    try {
      setErr('');
      await api.post('/admin/coupons', { affiliateId, ...form, usageLimit: form.usageLimit ? Number(form.usageLimit) : null, perCustomerLimit: form.perCustomerLimit ? Number(form.perCustomerLimit) : null });
      onCreated();
    } catch (e) {
      setErr(e?.response?.data?.error?.message || 'Failed');
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Create New Coupon" footer={<>
      <button className="btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={submit}>Create Coupon</button>
    </>}>
      {err && <Alert type="danger" className="mb-4">{err}</Alert>}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="col-span-2">
          <label className="label">Coupon Code</label>
          <input className="input font-mono" value={form.couponCode} onChange={e => setForm(f => ({ ...f, couponCode: e.target.value.toUpperCase() }))} placeholder="e.g. ALEXSAVE20" />
        </div>
        <div>
          <label className="label">Discount Type</label>
          <select className="input" value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed Amount</option>
          </select>
        </div>
        <div>
          <label className="label">Discount Value</label>
          <input className="input" type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="label">Commission Rate %</label>
          <input className="input" type="number" value={form.commissionRate} onChange={e => setForm(f => ({ ...f, commissionRate: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="label">Commission Base</label>
          <select className="input" value={form.commissionBaseType} onChange={e => setForm(f => ({ ...f, commissionBaseType: e.target.value }))}>
            <option value="DISCOUNTED_VALUE">Discounted Value</option>
            <option value="ORIGINAL_VALUE">Original Value</option>
            <option value="EXCLUDING_TAX">Excl. Tax</option>
            <option value="EXCLUDING_TAX_AND_SHIPPING">Excl. Tax &amp; Shipping</option>
          </select>
        </div>
        <div>
          <label className="label">Usage Limit (optional)</label>
          <input className="input" type="number" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} />
        </div>
        <div>
          <label className="label">Per-customer Limit (optional)</label>
          <input className="input" type="number" value={form.perCustomerLimit} onChange={e => setForm(f => ({ ...f, perCustomerLimit: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="label">Expires At (optional)</label>
          <input className="input" type="date" value={form.expiresAt?.slice?.(0, 10) ?? ''} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
        </div>
      </div>
    </Modal>
  );
}
