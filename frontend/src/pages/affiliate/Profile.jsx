import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '../../components/ui';
import { Save, ShieldCheck } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { PageTransition, Reveal3D } from '../../components/anim';
import { motion } from 'framer-motion';

export default function AffiliateProfile() {
  const location = useLocation();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await api.get('/affiliate/profile');
      setProfile(data.data);
    })();
  }, []);

  if (!profile) return <div className="p-10 text-slate-500 text-center">Loading profile...</div>;

  const update = (k, v) => setProfile(p => ({ ...p, [k]: v }));

  const onSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setLoading(true);
    try {
      await api.put('/affiliate/profile', profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition key={location.pathname}>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-slate-500 mt-1">Update your contact, business and payout information.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-sm font-medium">
            <ShieldCheck className="w-4 h-4" /> {profile.affiliateCode} · {profile.status}
          </div>
        </div>

        {saved && <Alert type="success">✓ Profile updated successfully</Alert>}
        {error && <Alert type="danger">{error}</Alert>}

        <form onSubmit={onSave} className="space-y-6">
          <Reveal3D stagger={60}>
            <Section title="Personal Information">
              <Grid>
                <Field label="Full Name"><input className="input" value={profile.name || ''} onChange={e => update('name', e.target.value)} /></Field>
                <Field label="Email (login)"><input className="input bg-slate-50" value={profile.email || ''} disabled /></Field>
                <Field label="Phone"><input className="input" value={profile.phone || ''} onChange={e => update('phone', e.target.value)} /></Field>
                <Field label="Country"><input className="input" value={profile.country || ''} onChange={e => update('country', e.target.value)} /></Field>
                <Field className="md:col-span-2" label="Street Address"><input className="input" value={profile.address || ''} onChange={e => update('address', e.target.value)} /></Field>
                <Field label="City"><input className="input" value={profile.addressCity || ''} onChange={e => update('addressCity', e.target.value)} /></Field>
                <Field label="State / Region"><input className="input" value={profile.addressState || ''} onChange={e => update('addressState', e.target.value)} /></Field>
                <Field label="ZIP / Postal Code"><input className="input" value={profile.addressZip || ''} onChange={e => update('addressZip', e.target.value)} /></Field>
              </Grid>
            </Section>

            <Section title="Business Information">
              <Grid>
                <Field label="Business Name"><input className="input" value={profile.businessName || ''} onChange={e => update('businessName', e.target.value)} /></Field>
                <Field label="Business Type">
                  <select className="input" value={profile.businessType || ''} onChange={e => update('businessType', e.target.value)}>
                    <option value="">Select...</option>
                    <option>Content Creator</option><option>Influencer</option>
                    <option>Coupon / Deals Site</option><option>Media Company</option>
                    <option>Blogger</option><option>Agency</option><option>Other</option>
                  </select>
                </Field>
                <Field label="Website" className="md:col-span-2"><input className="input" value={profile.website || ''} onChange={e => update('website', e.target.value)} /></Field>
                <Field label="Audience Type" className="md:col-span-2"><input className="input" value={profile.audienceType || ''} onChange={e => update('audienceType', e.target.value)} /></Field>
                <Field label="Expected Monthly Referrals" className="md:col-span-2"><input className="input" value={profile.expectedReferralVolume || ''} onChange={e => update('expectedReferralVolume', e.target.value)} /></Field>
              </Grid>
            </Section>

            <Section title="Payout Information" subtitle="🔒 Securely stored — never shared with customers or other affiliates.">
              <Grid>
                <Field label="Payout Method" className="md:col-span-2">
                  <select className="input" value={profile.payoutMethod || ''} onChange={e => update('payoutMethod', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="PAYPAL">PayPal</option>
                    <option value="WISE">Wise</option>
                    <option value="STRIPE">Stripe Connect</option>
                    <option value="OTHER">Other</option>
                  </select>
                </Field>
                <Field label="Account Holder Name"><input className="input" value={profile.payoutAccountHolder || ''} onChange={e => update('payoutAccountHolder', e.target.value)} /></Field>
                <Field label="Bank Name"><input className="input" value={profile.payoutBankName || ''} onChange={e => update('payoutBankName', e.target.value)} /></Field>
                <Field label="Account Number"><input className="input" value={profile.payoutAccountNumber || ''} onChange={e => update('payoutAccountNumber', e.target.value)} /></Field>
                <Field label="IBAN"><input className="input" value={profile.payoutIban || ''} onChange={e => update('payoutIban', e.target.value)} /></Field>
                <Field label="BIC / SWIFT"><input className="input" value={profile.payoutBicSwift || ''} onChange={e => update('payoutBicSwift', e.target.value)} /></Field>
              </Grid>
            </Section>
          </Reveal3D>

          <div className="flex justify-end pt-4">
            <motion.button
              className="btn-primary"
              disabled={loading}
              animate={saved ? { scale: [1, 1.06, 1] } : {}}
              transition={{ scale: { duration: saved ? 0.45 : 0 } }}
            >
              <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Changes'}
            </motion.button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}

const Section = ({ title, subtitle, children }) => (
  <div className="card">
    <div className="card-header flex-col items-start !gap-1">
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
    <div className="card-body">{children}</div>
  </div>
);
const Grid = ({ children }) => <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
const Field = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="label">{label}</label>
    {children}
  </div>
);
