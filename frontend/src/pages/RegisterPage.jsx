import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Alert } from '../components/ui';
import { CheckCircle, ArrowRight, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { PageTransition, FloatingLayer, ParticleField, PerspectivePanel, Progress3D, CheckDraw, Reveal3D, useReducedMotion, DepthCard } from '../components/anim';

const steps = ['Personal Info', 'Business Info', 'Payout Info', 'Submit'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', country: '', address: '', addressCity: '', addressState: '', addressZip: '',
    businessName: '', businessType: '', website: '', socialProfiles: '', audienceType: '', description: '', expectedReferralVolume: '',
    payoutAccountHolder: '', payoutBankName: '', payoutAccountNumber: '', payoutIban: '', payoutBicSwift: '', payoutMethod: 'BANK_TRANSFER',
  });
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const next = () => setStep(s => Math.min(steps.length - 1, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const social = form.socialProfiles ? Object.fromEntries(
        form.socialProfiles.split(/[,;\n]/).map(s => s.trim()).filter(Boolean).map((s, i) => [`social_${i}`, s])
      ) : null;
      const payload = { ...form, socialProfiles: social };
      if (!payload.description) delete payload.description;
      await api.post('/affiliate/register', payload);
      setSubmitted(true);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const reduced = useReducedMotion();

  return (
    <PageTransition>
      <div className="brand-stage min-h-screen py-10 bg-gradient-to-br from-slate-50 via-brand-50/50 to-brand-100/50 px-4 relative overflow-hidden">
        <FloatingLayer color="rgba(37,99,235,0.08)" width="55%" height="55%" delay={0} translate="-50%,-40%" />
        <FloatingLayer color="rgba(16,185,129,0.06)" width="40%" height="40%" delay={1.2} translate="-30%,-60%" />
        <FloatingLayer color="rgba(100,116,139,0.05)" width="50%" height="50%" delay={2.4} translate="-70%,-50%" />
        <ParticleField count={24} size={2} color="rgba(37,99,235,0.22)" />
        <div className="bg-grid opacity-30 inset-0 absolute" aria-hidden />

        <div className="relative z-10 max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.04, y: -8 }}
                transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
                className="min-h-[80vh] flex items-center justify-center"
              >
                <DepthCard hover tilt interactive className="card max-w-lg w-full">
                  <div className="card-body text-center py-10">
                    <motion.div
                      initial={reduced ? {} : { opacity: 0, scale: 0.6, rotateX: -10 }}
                      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                      transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
                      className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5 relative"
                    >
                      <CheckCircle className="w-9 h-9 text-emerald-600" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckDraw size={64} strokeWidth={4} tone="emerald" />
                      </div>
                    </motion.div>
                    <Reveal3D stagger={90} delay={200}>
                      <h2 className="text-2xl font-bold text-slate-900">Application Received!</h2>
                      <p className="mt-2 text-slate-600">
                        Thanks for applying, <b>{form.name}</b>. We've received your application and our team will review it shortly.
                      </p>
                    </Reveal3D>
                    <div className="mt-6 p-4 rounded-lg bg-brand-50 border border-brand-100 text-left text-sm">
                      <p className="font-semibold text-brand-800">What happens next?</p>
                      <Reveal3D stagger={90} delay={100}>
                        <ol className="mt-2 space-y-1 text-brand-700 list-decimal list-inside">
                          <li>Admin reviews your application</li>
                          <li>If approved, your unique coupon code is activated</li>
                          <li>You can start sharing & earning commissions</li>
                        </ol>
                      </Reveal3D>
                    </div>
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scaleY: 0.97 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                      onClick={() => navigate('/login')}
                      className="btn-primary mt-8 w-full"
                    >
                      Continue to login <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </DepthCard>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.97, y: -10 }}
                transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <Reveal3D stagger={80} delay={100}>
                  <div className="text-center mb-8">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xl font-bold shadow-lg mb-4">
                      <UserPlus className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Become an Affiliate Partner</h1>
                    <p className="mt-1 text-slate-500">Apply in under 2 minutes. Start earning commissions on every referral.</p>
                  </div>
                </Reveal3D>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    {steps.map((label, i) => (
                      <div key={label} className="flex items-center flex-1">
                        <Progress3D value={i < step ? 100 : i === step ? 55 : 0} tone={i <= step ? (i < step ? 'emerald' : 'brand') : 'default'} height={8} showLabel={false} className="!mx-2" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    {steps.map((label, i) => (
                      <div key={label} className="flex items-center flex-1">
                        <motion.div
                          whileHover={i <= step ? { scale: 1.08, y: -1 } : {}}
                          whileTap={i <= step ? { scale: 0.95 } : {}}
                          animate={{
                            boxShadow: i === step
                              ? '0 10px 26px -10px rgba(37,99,235,0.55)'
                              : i < step
                              ? '0 8px 20px -10px rgba(16,185,129,0.5)'
                              : '0 4px 14px -10px rgba(15,23,42,0.3)',
                          }}
                          className={clsx(
                            'w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                            i <= step ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500',
                            i < step && '!bg-gradient-to-br from-emerald-400 to-emerald-600'
                          )}
                        >
                          {i < step ? '✓' : i + 1}
                        </motion.div>
                        {i < steps.length - 1 && (
                          <div className={clsx('flex-1 h-0.5 mx-2 rounded-full overflow-hidden', 'bg-slate-200')}>
                            <motion.div
                              className={clsx('h-full', i < step ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-brand-400 to-brand-600')}
                              initial={{ width: '0%' }}
                              animate={{ width: i < step ? '100%' : i === step ? (reduced ? '50%' : '55%') : '0%' }}
                              transition={{ duration: reduced ? 0.05 : 0.7, ease: [0.2, 0.8, 0.2, 1] }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs font-medium text-slate-500 px-1">
                    {steps.map(s => <span key={s}>{s}</span>)}
                  </div>
                </div>

                <div className="card">
                  <div className="card-body">
                    {error && <Alert type="danger" className="mb-5">{error}</Alert>}
                    <form onSubmit={step === steps.length - 1 ? onSubmit : (e) => { e.preventDefault(); next(); }}>
                      <AnimatePresence mode="wait">
                        <PerspectivePanel key={0} step={step} index={0}>
                          {step === 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Field label="Full Name" required><input className="input" value={form.name} onChange={e => update('name', e.target.value)} required /></Field>
                              <Field label="Email" required><input className="input" type="email" value={form.email} onChange={e => update('email', e.target.value)} required /></Field>
                              <Field label="Phone"><input className="input" value={form.phone} onChange={e => update('phone', e.target.value)} /></Field>
                              <Field label="Country"><input className="input" value={form.country} onChange={e => update('country', e.target.value)} placeholder="e.g. Spain" /></Field>
                              <Field label="Address (Line 1)" className="md:col-span-2"><input className="input" value={form.address} onChange={e => update('address', e.target.value)} /></Field>
                              <Field label="City"><input className="input" value={form.addressCity} onChange={e => update('addressCity', e.target.value)} /></Field>
                              <Field label="State / Region"><input className="input" value={form.addressState} onChange={e => update('addressState', e.target.value)} /></Field>
                              <Field label="ZIP / Postal Code"><input className="input" value={form.addressZip} onChange={e => update('addressZip', e.target.value)} /></Field>
                              <Field label="Create Password (optional for Supabase login)" className="md:col-span-2">
                                <input type="password" className="input" value={form.password} onChange={e => update('password', e.target.value)} />
                              </Field>
                            </div>
                          )}
                        </PerspectivePanel>

                        <PerspectivePanel key={1} step={step} index={1}>
                          {step === 1 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Field label="Business Name"><input className="input" value={form.businessName} onChange={e => update('businessName', e.target.value)} /></Field>
                              <Field label="Business Type">
                                <select className="input" value={form.businessType} onChange={e => update('businessType', e.target.value)}>
                                  <option value="">Select...</option>
                                  <option>Content Creator</option><option>Coupon / Deals Site</option><option>Influencer</option>
                                  <option>Blogger</option><option>Media Company</option><option>Agency</option><option>Other</option>
                                </select>
                              </Field>
                              <Field label="Website URL" className="md:col-span-2"><input className="input" value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://" /></Field>
                              <Field label="Social Media Profiles" className="md:col-span-2">
                                <textarea className="input min-h-[80px]" value={form.socialProfiles} onChange={e => update('socialProfiles', e.target.value)} placeholder="One per line or comma separated: Instagram, YouTube, TikTok..." />
                              </Field>
                              <Field label="Audience Type">
                                <select className="input" value={form.audienceType} onChange={e => update('audienceType', e.target.value)}>
                                  <option value="">Select...</option>
                                  <option>General Consumers</option><option>Tech Enthusiasts</option><option>Parents / Family</option>
                                  <option>Business Professionals</option><option>Students</option><option>Niche Hobby</option>
                                </select>
                              </Field>
                              <Field label="Expected Monthly Referrals">
                                <select className="input" value={form.expectedReferralVolume} onChange={e => update('expectedReferralVolume', e.target.value)}>
                                  <option value="">Select...</option>
                                  <option>0-50</option><option>50-100</option><option>100-500</option>
                                  <option>500-2000</option><option>2000+</option>
                                </select>
                              </Field>
                              <Field label="How will you promote us?" className="md:col-span-2">
                                <textarea className="input min-h-[100px]" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Tell us about your promotional strategy..." />
                              </Field>
                            </div>
                          )}
                        </PerspectivePanel>

                        <PerspectivePanel key={2} step={step} index={2}>
                          {step === 2 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Field label="Preferred Payout Method" className="md:col-span-2">
                                <select className="input" value={form.payoutMethod} onChange={e => update('payoutMethod', e.target.value)}>
                                  <option value="BANK_TRANSFER">Bank Transfer (SEPA / Wire)</option>
                                  <option value="PAYPAL">PayPal</option>
                                  <option value="WISE">Wise (TransferWise)</option>
                                  <option value="STRIPE">Stripe Connect</option>
                                  <option value="OTHER">Other</option>
                                </select>
                              </Field>
                              <Field label="Account Holder Name" required><input className="input" value={form.payoutAccountHolder} onChange={e => update('payoutAccountHolder', e.target.value)} required /></Field>
                              <Field label="Bank Name"><input className="input" value={form.payoutBankName} onChange={e => update('payoutBankName', e.target.value)} /></Field>
                              <Field label="Account Number"><input className="input" value={form.payoutAccountNumber} onChange={e => update('payoutAccountNumber', e.target.value)} /></Field>
                              <Field label="IBAN"><input className="input" value={form.payoutIban} onChange={e => update('payoutIban', e.target.value)} placeholder="DE89 3704 0044 0532 0130 00" /></Field>
                              <Field label="BIC / SWIFT Code"><input className="input" value={form.payoutBicSwift} onChange={e => update('payoutBicSwift', e.target.value)} placeholder="DEUTDEFFXXX" /></Field>
                              <div className="md:col-span-2">
                                <p className="text-xs text-slate-500">
                                  🔒 Your payout information is securely stored on our servers and is never exposed to customers or other affiliates.
                                </p>
                              </div>
                            </div>
                          )}
                        </PerspectivePanel>

                        <PerspectivePanel key={3} step={step} index={3}>
                          {step === 3 && (
                            <div>
                              <h3 className="font-semibold text-slate-900 mb-4">Review your application</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <Review label="Name" value={form.name} />
                                <Review label="Email" value={form.email} />
                                <Review label="Phone" value={form.phone} />
                                <Review label="Country" value={form.country} />
                                <Review label="Business" value={form.businessName || form.businessType} />
                                <Review label="Website" value={form.website} />
                                <Review label="Audience" value={form.audienceType} />
                                <Review label="Expected Volume" value={form.expectedReferralVolume} />
                                <Review label="Payout Method" value={form.payoutMethod} />
                                <Review label="Payout To" value={form.payoutAccountHolder} />
                              </div>
                              <Alert type="info" className="mt-5">
                                By submitting, you agree to our Affiliate Program Terms. Commission rates and coupon details will be set upon approval.
                              </Alert>
                            </div>
                          )}
                        </PerspectivePanel>
                      </AnimatePresence>
                      <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-200">
                        <div>
                          <Link to="/login" className="btn-ghost">← Back to login</Link>
                        </div>
                        <div className="flex gap-2">
                          {step > 0 && (
                            <motion.button
                              whileHover={{ y: -2 }}
                              whileTap={{ scaleY: 0.97 }}
                              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                              type="button"
                              className="btn-secondary"
                              onClick={prev}
                            >
                              Previous
                            </motion.button>
                          )}
                          {step < steps.length - 1 ? (
                            <motion.button
                              whileHover={{ y: -2 }}
                              whileTap={{ scaleY: 0.97 }}
                              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                              type="submit"
                              className="btn-primary"
                            >
                              Next: {steps[step + 1]} →
                            </motion.button>
                          ) : (
                            <motion.button
                              whileHover={{ y: -2 }}
                              whileTap={{ scaleY: 0.97 }}
                              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                              type="submit"
                              className="btn-primary"
                              disabled={loading}
                            >
                              {loading ? 'Submitting...' : 'Submit Application ✓'}
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}

const Field = ({ label, required, children, className = '' }) => (
  <div className={className}>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
  </div>
);

const Review = ({ label, value }) => (
  <div className="p-3 rounded-lg bg-slate-50">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-1 text-slate-800 font-medium truncate">{value || '—'}</p>
  </div>
);
