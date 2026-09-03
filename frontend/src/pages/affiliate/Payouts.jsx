import { useEffect, useState } from 'react';
import api from '../../services/api';
import { EmptyState, formatDate, formatMoney, statusBadge, Badge, Alert } from '../../components/ui';
import { Wallet, Clock, CheckCircle2, Coins, TrendingUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { PageTransition, TiltCard, TableReveal, Progress3D } from '../../components/anim';

export default function AffiliatePayouts() {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data: res } = await api.get('/affiliate/payouts');
        setData(res.data);
      } catch (e) { setError('Could not load payouts'); }
    })();
  }, []);

  if (error) return <Alert type="danger">{error}</Alert>;
  if (!data) return <div className="p-10 text-slate-500 text-center">Loading...</div>;
  const s = data.summary;

  return (
    <PageTransition key={location.pathname}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payouts</h1>
          <p className="text-slate-500 mt-1">Your commission balance and payout history.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <TiltCard><Stat tone="brand" icon={TrendingUp} label="Total Earned" value={formatMoney(s.totalEarned)} /></TiltCard>
          <TiltCard><Stat tone="warning" icon={Clock} label="Pending Review" value={formatMoney(s.pending)} /></TiltCard>
          <TiltCard><Stat tone="success" icon={CheckCircle2} label="Approved (Available)" value={formatMoney(s.approved)} /></TiltCard>
          <TiltCard><Stat tone="info" icon={Wallet} label="Already Paid" value={formatMoney(s.paid)} /></TiltCard>
          <TiltCard><Stat tone="default" icon={Coins} label="Minimum Threshold" value={formatMoney(s.minimumPayoutThreshold)} /></TiltCard>
        </div>

        <div className="card bg-gradient-to-r from-brand-50 via-white to-emerald-50 border-brand-100">
          <div className="card-body flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900">Available for payout</p>
              <p className="mt-1 text-4xl font-black text-slate-900">{formatMoney(s.availableForPayout)}</p>
              {s.remainingToThreshold > 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium text-xs">
                    <Clock className="w-3 h-3" />
                    {formatMoney(s.remainingToThreshold)} more to reach your payout threshold
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-sm">
                  <Badge variant="success">✓ Threshold reached — eligible for next payout cycle</Badge>
                </p>
              )}
            </div>
            <div className="w-full md:w-80">
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <span className="text-slate-500">Progress</span>
                <span className="text-slate-700">{Math.min(100, Math.round((s.availableForPayout / Math.max(0.01, s.minimumPayoutThreshold)) * 100))}%</span>
              </div>
              <Progress3D
                value={s.availableForPayout}
                max={s.minimumPayoutThreshold}
                tone="brand"
                showLabel={false}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Payout History</h2>
          </div>
          {!data.items.length ? (
            <EmptyState
              title="No payouts yet"
              description="Once commissions are APPROVED and meet the minimum threshold, admin will initiate your payout and it will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Payout Reference</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Commissions</th>
                    <th>Gross</th>
                    <th>Adjustments</th>
                    <th>Net Amount</th>
                    <th>Status</th>
                    <th>Paid At</th>
                  </tr>
                </thead>
                <TableReveal rowsStagger={30}>
                  {data.items.map(p => (
                    <tr key={p.id}>
                      <td className="font-mono text-slate-800 font-medium">{p.payoutReference}</td>
                      <td className="text-slate-500">{formatDate(p.paymentDate || p.createdAt)}</td>
                      <td>{p.paymentMethod ? p.paymentMethod.replace(/_/g, ' ') : '—'}</td>
                      <td className="text-center font-medium">{p.commissionCount}</td>
                      <td>{formatMoney(p.grossAmount)}</td>
                      <td className={p.adjustmentAmount < 0 ? 'text-red-600' : p.adjustmentAmount > 0 ? 'text-emerald-600' : ''}>
                        {p.adjustmentAmount === 0 ? '—' : (p.adjustmentAmount > 0 ? '+' : '') + formatMoney(p.adjustmentAmount)}
                      </td>
                      <td className="font-bold text-slate-900">{formatMoney(p.netAmount)}</td>
                      <td>{statusBadge(p.status, { animated: true })}</td>
                      <td className="text-slate-500 text-sm">{p.paidAt ? formatDate(p.paidAt) : '—'}</td>
                    </tr>
                  ))}
                </TableReveal>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

const Stat = ({ icon: Icon, label, value, tone }) => {
  const tones = {
    default: 'bg-slate-100 text-slate-600',
    brand: 'bg-brand-50 text-brand-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    info: 'bg-blue-50 text-blue-600',
  };
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${tones[tone]}`}><Icon className="w-5 h-5" /></div>
      </div>
    </div>
  );
};
