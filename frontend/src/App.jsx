import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppLayout, ThemeToggle } from './components/Layout';
import { Alert } from './components/ui';
import { ReactiveBackground } from './components/anim';
import { useEffect, useState } from 'react';

import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

import AffiliateDashboard from './pages/affiliate/Dashboard.jsx';
import AffiliateCoupon from './pages/affiliate/Coupon.jsx';
import AffiliateOrders from './pages/affiliate/Orders.jsx';
import AffiliateCommissions from './pages/affiliate/Commissions.jsx';
import AffiliatePayouts from './pages/affiliate/Payouts.jsx';
import AffiliateProfile from './pages/affiliate/Profile.jsx';

import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminAffiliates from './pages/admin/Affiliates.jsx';
import AdminAffiliateDetail from './pages/admin/AffiliateDetail.jsx';
import AdminCoupons from './pages/admin/Coupons.jsx';
import AdminCommissions from './pages/admin/Commissions.jsx';
import AdminPayouts from './pages/admin/Payouts.jsx';
import AdminReports from './pages/admin/Reports.jsx';
import AdminCheckout from './pages/admin/CheckoutDemo.jsx';
import AdminFraud from './pages/admin/Fraud.jsx';
import AdminSettings from './pages/admin/Settings.jsx';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-10 text-center text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-10 max-w-lg mx-auto">
        <Alert type="danger">You do not have permission to access this area.</Alert>
      </div>
    );
  }
  return children;
};

const RedirectAfterAuth = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'CUSTOMER') return <Navigate to="/checkout" replace />;
  return <Navigate to="/affiliate" replace />;
};

export default function App() {
  const location = useLocation();
  const [banner, setBanner] = useState(null);
  const isEntryPage = location.pathname === '/login' || location.pathname === '/register';
  useEffect(() => {
    // Clear banner
  }, []);

  return (
    <div className="app-root">
      <ReactiveBackground className={isEntryPage ? '' : 'after-login-video'} />
      <ThemeToggle />
      {banner && <Alert type={banner.type}>{banner.message}</Alert>}
      <Routes>
        <Route path="/" element={<RedirectAfterAuth />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />

        <Route path="/affiliate" element={
          <ProtectedRoute allowedRoles={['AFFILIATE', 'ADMIN']}>
            <AppLayout><AffiliateDashboard /></AppLayout>
          </ProtectedRoute>
        } index />
        <Route path="/affiliate/coupon" element={
          <ProtectedRoute allowedRoles={['AFFILIATE', 'ADMIN']}>
            <AppLayout><AffiliateCoupon /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/affiliate/orders" element={
          <ProtectedRoute allowedRoles={['AFFILIATE', 'ADMIN']}>
            <AppLayout><AffiliateOrders /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/affiliate/commissions" element={
          <ProtectedRoute allowedRoles={['AFFILIATE', 'ADMIN']}>
            <AppLayout><AffiliateCommissions /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/affiliate/payouts" element={
          <ProtectedRoute allowedRoles={['AFFILIATE', 'ADMIN']}>
            <AppLayout><AffiliatePayouts /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/affiliate/profile" element={
          <ProtectedRoute allowedRoles={['AFFILIATE', 'ADMIN']}>
            <AppLayout><AffiliateProfile /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AppLayout><AdminDashboard /></AppLayout>
          </ProtectedRoute>
        } index />
        <Route path="/admin/affiliates" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AppLayout><AdminAffiliates /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/affiliates/:id" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AppLayout><AdminAffiliateDetail /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/coupons" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AppLayout><AdminCoupons /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/commissions" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AppLayout><AdminCommissions /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/payouts" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AppLayout><AdminPayouts /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AppLayout><AdminReports /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/checkout" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AppLayout><AdminCheckout /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/fraud" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AppLayout><AdminFraud /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AppLayout><AdminSettings /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
