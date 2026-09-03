import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from '../components/ui';
import { Eye, EyeOff, Lock, Mail, Rocket, ShieldCheck, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { PageTransition, DepthCard, Reveal3D, FloatingLayer, ParticleField, PerspectivePanel, CheckDraw, Progress3D, StatusTransition, useReducedMotion } from '../components/anim';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@affiliate.dev');
  const [password, setPassword] = useState('admin123');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      if (data.user?.role === 'ADMIN') navigate('/admin');
      else if (data.user?.role === 'CUSTOMER') navigate('/checkout');
      else navigate('/affiliate');
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickAccounts = [
    { label: 'Admin', email: 'admin@affiliate.dev', pw: 'admin123', tone: 'brand' },
    { label: 'Alex (Affiliate)', email: 'alex@affiliate.dev', pw: 'alex1234', tone: 'success' },
    { label: 'John (Pending)', email: 'john@affiliate.dev', pw: 'john1234', tone: 'warning' },
    { label: 'Customer', email: 'customer@example.dev', pw: 'customer123', tone: 'default' },
  ];

  return (
    <PageTransition>
      <div className="brand-stage min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-brand-50/50 to-brand-100/50 p-4">
        <div className="relative overflow-hidden w-full max-w-6xl">
          <FloatingLayer color="rgba(37,99,235,0.08)" width="55%" height="55%" delay={0} translate="-50%,-40%" />
          <FloatingLayer color="rgba(16,185,129,0.06)" width="40%" height="40%" delay={1.2} translate="-30%,-60%" />
          <FloatingLayer color="rgba(100,116,139,0.05)" width="50%" height="50%" delay={2.4} translate="-70%,-50%" />
          <ParticleField count={24} size={2} color="rgba(37,99,235,0.22)" />
          <div className="bg-grid opacity-30 inset-0 absolute" aria-hidden />

          <div className="relative z-10 flex flex-col lg:flex-row items-stretch gap-8 lg:gap-12">
            <div className="flex-1 flex flex-col justify-center py-8 lg:py-16 px-4 lg:px-8">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-brand-500/20">A</div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 leading-tight">Affiliate System</h1>
                    <p className="text-slate-500 mt-1">Grow. Track. Earn commissions.</p>
                  </div>
                </div>
              </motion.div>

              <Reveal3D stagger={100} delay={300} from={16} as="div" className="space-y-4 mt-2">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/60">
                  <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center flex-none">
                    <TrendingUp className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Real-time Analytics</p>
                    <p className="text-sm text-slate-500 mt-0.5">Track clicks, conversions, and commissions as they happen.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/60">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-none">
                    <Rocket className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Instant Payouts</p>
                    <p className="text-sm text-slate-500 mt-0.5">Withdraw earnings via bank transfer, PayPal, Wise & more.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/60">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-none">
                    <ShieldCheck className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Fraud Detection</p>
                    <p className="text-sm text-slate-500 mt-0.5">Built-in safeguards ensure every conversion is legitimate.</p>
                  </div>
                </div>
              </Reveal3D>
            </div>

            <div className="flex-1 w-full max-w-md mx-auto lg:mx-0">
              <motion.div
                initial={{ opacity: 0, y: 30, rotateX: -6 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1], delay: 0.15 }}
                style={{ transformStyle: 'preserve-3d', perspective: 800 }}
                className={clsx('card', 'preserve-3d perspective-800')}
              >
                <div className="card-body">
                  <Reveal3D stagger={80} delay={200}>
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
                    </div>

                    {error && <Alert type="danger" className="mb-4">{error}</Alert>}

                    <form onSubmit={onSubmit} className="space-y-4">
                      <div>
                        <label className="label">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input className="input !pl-10" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" />
                        </div>
                      </div>

                      <div>
                        <label className="label">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input className="input !pl-10 !pr-10" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
                          <motion.button
                            type="button"
                            animate={{ rotate: showPw ? 180 : 0 }}
                            transition={{ duration: 0.22 }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            onClick={() => setShowPw(!showPw)}
                          >
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </motion.button>
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scaleY: 0.97 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                        type="submit"
                        className="btn-primary w-full"
                        disabled={loading}
                      >
                        {loading ? 'Signing in...' : 'Sign in'}
                      </motion.button>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-500">
                      Want to become an affiliate?{' '}
                      <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">Apply here</Link>
                    </p>
                  </Reveal3D>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1], delay: 0.45 }}
                className="mt-6 card"
              >
                <div className="card-body !py-4">
                  <Reveal3D stagger={80} delay={200}>
                    <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Quick logins (demo)</p>
                    <div className="grid grid-cols-2 gap-2">
                      {quickAccounts.map(a => (
                        <motion.button
                          key={a.email}
                          whileHover={{ y: -1, scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                          type="button"
                          className="btn-secondary text-xs text-left p-3 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                          onClick={() => { setEmail(a.email); setPassword(a.pw); }}
                        >
                          <p className="text-sm font-semibold text-slate-800">{a.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{a.email}</p>
                        </motion.button>
                      ))}
                    </div>
                  </Reveal3D>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
