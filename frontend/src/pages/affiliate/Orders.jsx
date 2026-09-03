import { useEffect, useState } from 'react';
import api from '../../services/api';
import { EmptyState, formatDate, formatMoney, statusBadge } from '../../components/ui';
import { Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { PageTransition, TableReveal } from '../../components/anim';
import { motion } from 'framer-motion';

export default function AffiliateOrders() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async (p = page) => {
    const params = new URLSearchParams({ page: p, limit: 20 });
    if (statusFilter) params.set('status', statusFilter);
    const { data } = await api.get(`/affiliate/orders?${params}`);
    setItems(data.data.items);
    setTotal(data.data.total);
  };

  useEffect(() => { fetchData(1); setPage(1); }, [statusFilter]);
  useEffect(() => { fetchData(page); }, [page]);

  const filtered = items.filter(o =>
    !search ||
    o.orderNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageTransition key={location.pathname}>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between flex-wrap gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold">Orders</h1>
            <p className="text-slate-500 mt-1">Orders placed using your coupon code.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input className="input !pl-9 !w-64" placeholder="Search order number..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input !w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="CREATED">Created</option>
              <option value="PAID">Paid</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </motion.div>

        <div className="card">
          {!filtered.length ? (
            <EmptyState title="No orders yet" description="Once customers use your coupon, their orders will show here with your commission earned." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th><th>Date</th><th>Order Value</th><th>Customer Discount</th><th>Your Commission</th><th>Status</th>
                </tr>
              </thead>
              <TableReveal rowsStagger={30}>
                {filtered.map(o => (
                  <tr key={o.orderId}>
                    <td className="font-mono font-medium text-slate-800">{o.orderNumber}</td>
                    <td className="text-slate-500">{formatDate(o.date)}</td>
                    <td className="font-medium">{formatMoney(o.orderValue, o.currency)}</td>
                    <td className="text-emerald-600">-{formatMoney(o.discount, o.currency)}</td>
                    <td className="font-bold text-brand-700">{formatMoney(o.commission, o.currency)}</td>
                    <td>{statusBadge(o.status, { animated: true })}</td>
                  </tr>
                ))}
              </TableReveal>
            </table>
          )}
        </div>

        {total > 20 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Showing {Math.min(page * 20, total)} of {total}</p>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="btn-secondary" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
