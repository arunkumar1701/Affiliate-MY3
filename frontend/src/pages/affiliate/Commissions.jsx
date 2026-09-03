import { useEffect, useState } from 'react';
import api from '../../services/api';
import { EmptyState, formatDate, formatMoney, statusBadge } from '../../components/ui';
import { useLocation } from 'react-router-dom';
import { PageTransition, TableReveal } from '../../components/anim';
import { motion, AnimatePresence } from 'framer-motion';

export default function AffiliateCommissions() {
  const location = useLocation();
  const [data, setData] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async (p = 1) => {
    const params = new URLSearchParams({ page: p, limit: 25 });
    if (statusFilter) params.set('status', statusFilter);
    const { data: res } = await api.get(`/affiliate/commissions?${params}`);
    setData(res.data);
  };

  useEffect(() => { fetchData(1); setPage(1); }, [statusFilter]);
  useEffect(() => { fetchData(page); }, [page]);

  return (
    <PageTransition key={location.pathname}>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between flex-wrap gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold">Commissions</h1>
            <p className="text-slate-500 mt-1">Full ledger of every commission earned (PDF §37 — Commission Ledger).</p>
          </div>
          <select className="input !w-48" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option>PENDING</option><option>ON_HOLD</option>
            <option>APPROVED</option><option>PAID</option>
            <option>REJECTED</option><option>CANCELLED</option><option>REVERSED</option>
          </select>
        </motion.div>

        <div className="card">
          {!data.items.length ? (
            <EmptyState title="No commissions yet" description="When customers using your coupon complete payment, your commissions appear here (first in PENDING status, then APPROVED after the returns window, then PAID)." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Commission ID</th>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Commission Base</th>
                    <th>Rate</th>
                    <th>Amount</th>
                    <th>Reversal</th>
                    <th>Net</th>
                    <th>Status</th>
                    <th>Approved / Paid</th>
                  </tr>
                </thead>
                <AnimatePresence mode="wait">
                  <TableReveal key={statusFilter || 'all'} rowsStagger={28} delay={80}>
                    {data.items.map(c => (
                      <tr key={c.id}>
                        <td className="font-mono text-xs text-slate-500">{c.id.slice(0, 12)}...</td>
                        <td className="font-mono text-slate-800">{c.orderNumber || '—'}</td>
                        <td className="text-slate-500">{formatDate(c.orderDate || c.createdAt)}</td>
                        <td>{formatMoney(c.commissionBase)}</td>
                        <td>{c.commissionRate}%</td>
                        <td className="font-semibold text-brand-700">{formatMoney(c.commissionAmount)}</td>
                        <td className="text-red-600">{c.reversalAmount > 0 ? `- ${formatMoney(c.reversalAmount)}` : '—'}</td>
                        <td className="font-bold text-slate-900">{formatMoney(c.netAmount)}</td>
                        <td>{statusBadge(c.status, { animated: true })}</td>
                        <td className="text-xs text-slate-500 space-y-0.5">
                          {c.approvedAt && <div>✓ {formatDate(c.approvedAt)}</div>}
                          {c.paidAt && <div>💰 {formatDate(c.paidAt)}</div>}
                          {c.reversedAt && <div>↩️ {formatDate(c.reversedAt)}</div>}
                          {!c.approvedAt && !c.paidAt && !c.reversedAt && <span>—</span>}
                        </td>
                      </tr>
                    ))}
                  </TableReveal>
                </AnimatePresence>
              </table>
            </div>
          )}
        </div>

        {data.total > 25 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Showing {Math.min(page * 25, data.total)} of {data.total}</p>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="btn-secondary" disabled={page * 25 >= data.total} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
