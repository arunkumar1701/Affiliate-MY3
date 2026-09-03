import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  LayoutDashboard, Users, Ticket, Receipt, Wallet, FileBarChart, LogOut,
  Settings, ShoppingCart, AlertTriangle, UserPlus, FileSpreadsheet, Moon, Sun,
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition, useReducedMotion } from './anim';

const affiliateNav = [
  { to: '/affiliate', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/affiliate/coupon', icon: Ticket, label: 'My Coupon' },
  { to: '/affiliate/orders', icon: Receipt, label: 'Orders' },
  { to: '/affiliate/commissions', icon: Wallet, label: 'Commissions' },
  { to: '/affiliate/payouts', icon: FileSpreadsheet, label: 'Payouts' },
  { to: '/affiliate/profile', icon: UserPlus, label: 'Profile' },
];

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/affiliates', icon: Users, label: 'Affiliates' },
  { to: '/admin/coupons', icon: Ticket, label: 'Coupons' },
  { to: '/admin/commissions', icon: Wallet, label: 'Commissions' },
  { to: '/admin/payouts', icon: FileSpreadsheet, label: 'Payouts' },
  { to: '/admin/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/admin/checkout', icon: ShoppingCart, label: 'Checkout Demo' },
  { to: '/admin/fraud', icon: AlertTriangle, label: 'Fraud' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const nav = isAdmin() ? adminNav : affiliateNav;
  const reduced = useReducedMotion();

  return (
    <aside className="sidebar-shell hidden md:flex fixed inset-y-0 left-0 z-50 w-64 h-screen flex-col border-r border-slate-200 bg-white overflow-y-auto">
      <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-200">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold">A</div>
        <div>
          <p className="text-sm font-bold text-slate-900">Affiliate System</p>
          <p className="text-xs text-slate-500">{isAdmin() ? 'Admin Console' : 'Partner Portal'}</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => clsx('nav-link', isActive && 'nav-link-active')}
          >
            {({ isActive }) => (
              <>
                <motion.span
                  animate={isActive ? { x: reduced ? 0 : 1 } : { x: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="contents"
                >
                  <item.icon className="w-5 h-5" />
                </motion.span>
                <motion.span
                  animate={isActive ? { x: reduced ? 0 : 2 } : { x: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                >
                  {item.label}
                </motion.span>
                <AnimatePresence>
                  {isActive && !reduced && (
                    <motion.span
                      layoutId="nav-active-indicator"
                      className="absolute left-2 inset-y-1 w-1 rounded-full bg-brand-600"
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      exit={{ opacity: 0, scaleY: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      aria-hidden
                    />
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-200">
        <motion.div
          className="theme-account-panel flex items-center gap-3 p-3 rounded-lg mb-2"
          whileHover={reduced ? {} : { y: -1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        >
          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm">
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.name || user?.email}</p>
            <p className="text-xs text-slate-500 truncate">{user?.role}</p>
          </div>
        </motion.div>
        <button onClick={() => { logout(); navigate('/login'); }} className="nav-link w-full text-red-600 hover:bg-red-50 hover:text-red-700">
          <LogOut className="w-5 h-5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
};

export const Topbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      className="sticky top-0 z-40 h-16 bg-white/80 backdrop-blur border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between"
      animate={reduced ? {} : { boxShadow: scrolled ? '0 4px 24px -12px rgba(15,23,42,0.18)' : '0 0 0 0 transparent' }}
      transition={{ duration: 0.3 }}
    >
      <div className="md:hidden flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm">A</div>
        <p className="font-bold">{isAdmin() ? 'Admin' : 'Partner'}</p>
      </div>
      <div className="flex-1 md:hidden"></div>
      <div className="flex items-center gap-3">
        <Link to="/checkout" className="btn-ghost !py-1.5 text-xs hidden sm:inline-flex">Customer Checkout Demo</Link>
        <button onClick={() => { logout(); navigate('/login'); }} className="btn-secondary !py-1.5 text-xs">Sign out</button>
      </div>
    </motion.header>
  );
};

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle btn-secondary fixed right-3 top-3 sm:right-4 sm:top-4 z-50 !p-2 shadow-sm"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};

export const AppLayout = ({ children }) => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const mobileNav = isAdmin() ? adminNav : affiliateNav;
  return (
    <div className="app-atmosphere flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <Topbar />
        <nav className="mobile-nav md:hidden" aria-label="Mobile navigation">
          {mobileNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => clsx('mobile-nav-link', isActive && 'mobile-nav-link-active')}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <PageTransition key={location.pathname}>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
};
