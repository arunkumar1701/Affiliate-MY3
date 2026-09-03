import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Alert, Badge, formatMoney } from '../../components/ui';
import { Settings as SettingsIcon, Save, Coins, Ticket, RotateCcw, AlertCircle, CheckCircle2, Shield, CreditCard, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition, DepthCard, Reveal3D } from '../../components/anim';

const SETTING_DEFS = [
  {
    section: '💸 Financial Defaults',
    icon: Coins,
    items: [
      {
        key: 'DEFAULT_CURRENCY',
        label: 'Default Currency',
        hint: 'ISO 4217 code — EUR, USD, GBP etc. Applies to all displays & new records.',
        type: 'string',
        placeholder: 'EUR',
      },
      {
        key: 'MINIMUM_PAYOUT_THRESHOLD',
        label: 'Minimum Payout Threshold',
        hint: 'Approved commission must exceed this amount before a payout is generated.',
        type: 'number',
        suffix: '€',
        placeholder: '50',
      },
      {
        key: 'DEFAULT_COMMISSION_APPROVAL_DAYS',
        label: 'Auto-Approval Delay (Days)',
        hint: 'Commission remains PENDING for N days after order payment (returns window). After this, admin must still approve explicitly or set up a cron job.',
        type: 'number',
        suffix: 'days',
        placeholder: '14',
      },
    ],
  },
  {
    section: '🎟️ Coupon Engine',
    icon: Ticket,
    items: [
      {
        key: 'ALLOW_COUPON_STACKING',
        label: 'Allow Coupon Stacking',
        hint: 'If enabled, multiple coupons can apply to one order. OFF recommended (PDF §30).',
        type: 'boolean',
      },
      {
        key: 'SELF_REFERRAL_CHECK',
        label: 'Block Self-Referral (Highly Recommended)',
        hint: 'Detect when affiliate email / phone matches the customer and auto-flag as fraud.',
        type: 'boolean',
      },
      {
        key: 'GLOBAL_MAXIMUM_DISCOUNT_PERCENT',
        label: 'Global Maximum Discount % Cap',
        hint: 'Optional hard cap — no coupon can exceed this. Leave blank for unlimited.',
        type: 'number',
        suffix: '%',
        placeholder: 'e.g. 50',
      },
    ],
  },
  {
    section: '🛡️ Commission Calculation',
    icon: ShieldCheck,
    items: [
      {
        key: 'DEFAULT_COMMISSION_BASE_TYPE',
        label: 'Default Commission Base Type',
        hint: 'Applied when a coupon has no explicit base configured. See PDF §13.',
        type: 'select',
        options: [
          ['DISCOUNTED_VALUE', 'Discounted Value (recommended)'],
          ['ORIGINAL_VALUE', 'Original Value (pre-discount)'],
          ['EXCLUDING_TAX', 'Excluding Tax'],
          ['EXCLUDING_TAX_AND_SHIPPING', 'Excluding Tax & Shipping'],
        ],
      },
      {
        key: 'DEFAULT_COMMISSION_RATE',
        label: 'Default Commission Rate',
        hint: 'Used when an affiliate/coupon has no explicit rate set (PDF §6).',
        type: 'number',
        suffix: '%',
        placeholder: '5',
      },
      {
        key: 'TIERED_COMMISSION_ENABLED',
        label: 'Enable Tiered / Performance Commissions',
        hint: 'Allows higher commission rates once affiliates hit volume thresholds (feature flag).',
        type: 'boolean',
      },
    ],
  },
  {
    section: '💳 Payout Processing',
    icon: CreditCard,
    items: [
      {
        key: 'DEFAULT_PAYOUT_METHOD',
        label: 'Default Payout Method',
        hint: 'Default method when affiliate has no preference.',
        type: 'select',
        options: [
          ['BANK_TRANSFER', 'Bank Transfer (SEPA / Wire)'],
          ['PAYPAL', 'PayPal'],
          ['STRIPE', 'Stripe Connect'],
          ['WISE', 'Wise'],
          ['OTHER', 'Other'],
        ],
      },
      {
        key: 'PAYOUT_FEE_FLAT',
        label: 'Payout Processing Fee (Flat)',
        hint: 'Deducted from payout. Set to 0 for no flat fee.',
        type: 'number',
        suffix: '€',
        placeholder: '0',
      },
      {
        key: 'PAYOUT_FEE_PERCENT',
        label: 'Payout Processing Fee (%)',
        hint: 'Deducted on top of flat fee. E.g. PayPal % fee.',
        type: 'number',
        suffix: '%',
        placeholder: '0',
      },
    ],
  },
  {
    section: '🔐 Security & Moderation',
    icon: Shield,
    items: [
      {
        key: 'FRAUD_AUTO_FLAG_ORDER_RATIO',
        label: 'Fraud: Suspect Orders / Refunds Threshold',
        hint: 'Auto-raise flag when refund % exceeds this over 30-day window.',
        type: 'number',
        suffix: '%',
        placeholder: '30',
      },
      {
        key: 'FRAUD_VELOCITY_MAX_ORDERS_PER_HOUR',
        label: 'Fraud: Max Orders / Hour per Affiliate',
        hint: 'Velocity rule — more than N orders in 60 min raises UNUSUAL_VELOCITY flag.',
        type: 'number',
        placeholder: '50',
      },
      {
        key: 'REQUIRE_AFFILIATE_APPROVAL',
        label: 'Manual Affiliate Approval Required',
        hint: 'When OFF, affiliates are auto-approved on registration. OFF = higher fraud risk (PDF §8).',
        type: 'boolean',
      },
    ],
  },
];

export default function AdminSettings() {
  const location = useLocation();
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/settings');
      setValues(data.data || {});
    } catch (e) { setError(e?.response?.data?.error?.message || 'Failed to load settings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateVal = (key, val) => setValues(v => ({ ...v, [key]: val }));

  const saveAll = async () => {
    setSaving(true); setError(''); setNotice(null);
    try {
      const body = {};
      SETTING_DEFS.forEach(section => {
        section.items.forEach(item => {
          if (values[item.key] !== undefined) {
            let v = values[item.key];
            if (item.type === 'number') v = v === '' || v == null ? null : Number(v);
            else if (item.type === 'boolean') v = v === true || v === 'true';
            body[item.key] = { value: v, type: item.type };
          }
        });
      });
      await api.put('/admin/settings', body);
      setNotice({ type: 'success', message: '✓ All settings saved successfully.' });
      setTimeout(() => setNotice(null), 3000);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const reset = async (key, defaultVal) => {
    try {
      let type = 'string';
      SETTING_DEFS.forEach(sec => sec.items.forEach(i => { if (i.key === key) type = i.type; }));
      await api.put('/admin/settings', { [key]: { value: defaultVal, type } });
      setValues(v => ({ ...v, [key]: defaultVal }));
      setNotice({ type: 'info', message: `Reset ${key} to default.` });
      setTimeout(() => setNotice(null), 2500);
    } catch (e) { setError(e?.response?.data?.error?.message || 'Reset failed'); }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading system settings...</div>;

  return (
    <PageTransition key={location.pathname}>
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
            <p className="text-slate-500 mt-0.5">Global affiliate program configuration — changes apply to all future transactions immediately.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scaleY: 0.97 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="btn-secondary"
            onClick={load}
            disabled={saving || loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Reload
          </motion.button>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scaleY: 0.97 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="btn-primary"
            onClick={saveAll}
            disabled={saving}
          >
            {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save All Changes</>}
          </motion.button>
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
        {error && (
          <motion.div
            key={error}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <Alert type="danger">{error}</Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.05 }}
      >
      <Alert type="warning" className="!bg-amber-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">⚠️ Changes affect all affiliates &amp; future orders</p>
            <p className="text-amber-700 text-sm mt-0.5">
              Historical records (previous commissions, payouts, paid orders) are not retroactively changed. Changes take effect on new transactions going forward.
            </p>
          </div>
        </div>
      </Alert>
      </motion.div>

      <Reveal3D stagger={90}>
      {SETTING_DEFS.map(section => (
        <DepthCard hover key={section.section} className="card">
          <div className="card-header flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600"><section.icon className="w-4 h-4" /></div>
            <h2 className="font-semibold text-slate-900">{section.section}</h2>
          </div>
          <div className="card-body space-y-6">
            {section.items.map(item => (
              <SettingRow key={item.key} item={item} value={values[item.key]} onChange={v => updateVal(item.key, v)} onReset={() => reset(item.key, '')} />
            ))}
          </div>
        </DepthCard>
      ))}
      </Reveal3D>

      <DepthCard hover tilt className="card border-2 border-dashed border-emerald-200 bg-emerald-50/40">
        <div className="card-body flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0"><Sparkles className="w-5 h-5" /></div>
            <div>
              <p className="font-bold text-emerald-800">✓ Settings are persisted to the database</p>
              <p className="text-sm text-emerald-700 mt-0.5">All values use SystemSetting table (key/value). Fallback defaults come from config and environment variables.</p>
            </div>
          </div>
          <Badge variant="success" className="whitespace-nowrap"><CheckCircle2 className="w-3 h-3" /> {Object.keys(values).length} keys loaded</Badge>
        </div>
      </DepthCard>

      <div className="flex justify-end pt-2">
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scaleY: 0.97 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="btn-primary"
          onClick={saveAll}
          disabled={saving}
        >
          {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save All Changes</>}
        </motion.button>
      </div>
    </div>
    </PageTransition>
  );
}

function SettingRow({ item, value, onChange, onReset }) {
  const [changed, setChanged] = useState(false);
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_2fr_auto] gap-4 items-start md:items-center pb-6 border-b border-slate-100 last:border-0 last:pb-0">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-800">{item.label}</p>
          <Badge variant="default" className="text-[10px] !py-0">{item.type}</Badge>
        </div>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{item.hint}</p>
      </div>
      <div className="relative">
        {item.type === 'boolean' ? (
          <ToggleSwitch checked={value === true || value === 'true'} onChange={v => { onChange(v); setChanged(true); }} />
        ) : item.type === 'select' ? (
          <select className="input" value={value ?? ''} onChange={e => { onChange(e.target.value); setChanged(true); }}>
            <option value="">— Select default —</option>
            {item.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        ) : (
          <div className="relative">
            <input
              className={`input ${item.suffix ? '!pr-12' : ''}`}
              type={item.type === 'number' ? 'number' : 'text'}
              placeholder={item.placeholder || ''}
              value={value ?? ''}
              onChange={e => { onChange(e.target.value); setChanged(true); }}
            />
            {item.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{item.suffix}</span>}
          </div>
        )}
      </div>
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scaleY: 0.97 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="btn-ghost !py-1.5 text-xs text-slate-500 hover:text-red-600"
        onClick={onReset}
        title="Reset to default"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Reset
      </motion.button>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      whileHover={!reduced ? { y: -1 } : undefined}
      whileTap={!reduced ? { scaleY: 0.96 } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${checked ? 'bg-brand-600' : 'bg-slate-300 hover:bg-slate-400'}`}
    >
      <motion.span
        layout={!reduced}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
      <span className={`ml-16 text-sm font-semibold ${checked ? 'text-brand-700' : 'text-slate-500'}`}>{checked ? 'ON' : 'OFF'}</span>
    </motion.button>
  );
}
