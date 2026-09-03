import { useState } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { AnimatedCounter, Modal3D, StatusTransition, useReducedMotion } from './anim';

export const Badge = ({ children, variant = 'default', className, animated = false, statusKey }) => {
  const styles = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    brand: 'bg-brand-100 text-brand-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  const content = <span className={clsx('badge', styles[variant], className)}>{children}</span>;
  if (animated && statusKey != null) {
    return <StatusTransition status={statusKey}>{content}</StatusTransition>;
  }
  return content;
};

export const statusBadge = (status, opts = {}) => {
  const map = {
    ACTIVE: ['Active', 'success'],
    APPROVED: ['Approved', 'success'],
    PAID: ['Paid', 'success'],
    DELIVERED: ['Delivered', 'success'],
    PENDING: ['Pending', 'warning'],
    PROCESSING: ['Processing', 'warning'],
    ON_HOLD: ['On Hold', 'warning'],
    INACTIVE: ['Inactive', 'default'],
    SUSPENDED: ['Suspended', 'danger'],
    REJECTED: ['Rejected', 'danger'],
    CANCELLED: ['Cancelled', 'danger'],
    REVERSED: ['Reversed', 'danger'],
    REFUNDED: ['Refunded', 'danger'],
    DEACTIVATED: ['Deactivated', 'default'],
    DEPLETED: ['Depleted', 'default'],
    EXPIRED: ['Expired', 'default'],
    CREATED: ['Created', 'info'],
    PAID_ORDER: ['Paid', 'success'],
    PARTIALLY_REFUNDED: ['Partially Refunded', 'warning'],
  };
  const key = status in map ? status : 'default';
  const [label, variant] = map[key] || [status, 'default'];
  if (opts.animated) {
    return <Badge animated statusKey={status} variant={variant} className={opts.className}>{label}</Badge>;
  }
  return <Badge variant={variant} className={opts.className}>{label}</Badge>;
};

export const KpiCard = ({ title, value, subtitle, icon: Icon, trend, tone = 'default', counterDecimals }) => {
  const reduced = useReducedMotion();
  const tones = {
    default: 'bg-slate-50 text-slate-600',
    brand: 'bg-brand-50 text-brand-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600',
  };
  const isNumeric = value !== null && value !== undefined && !isNaN(Number(String(value).replace(/[^0-9.\-]/g, '')));
  const numericValue = isNumeric ? Number(String(value).replace(/[^0-9.\-]/g, '')) : null;
  const prefix = typeof value === 'string' ? (value.match(/^[^\d\-]*/)?.[0] ?? '') : '';
  const suffix = typeof value === 'string' ? (value.match(/[^\d.,\-]+$/)?.[0] ?? '') : '';
  return (
    <motion.div
      className="kpi-card"
      whileHover={reduced ? {} : { y: -4, scale: 1.008 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {numericValue != null ? (
              <AnimatedCounter value={numericValue} prefix={prefix} suffix={suffix} decimals={counterDecimals ?? (numericValue % 1 === 0 ? 0 : 2)} />
            ) : value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {Icon && (
          <motion.div
            className={clsx('p-3 rounded-xl', tones[tone])}
            whileHover={reduced ? {} : { rotate: -4, y: -2 }}
            transition={{ type: 'spring', stiffness: 360, damping: 22 }}
          >
            <Icon className="w-6 h-6" />
          </motion.div>
        )}
      </div>
      {trend && (
        <motion.div
          className="mt-3 text-xs text-slate-500"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <span className={clsx(trend.positive ? 'text-emerald-600' : 'text-red-600', 'font-medium')}>
            {trend.positive ? '▲' : '▼'} {trend.label}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

export const Modal = ({ open, onClose, title, children, footer, size = 'md' }) => {
  return (
    <Modal3D open={open} onClose={onClose} title={title} footer={footer} size={size}>
      {children}
    </Modal3D>
  );
};

export const EmptyState = ({ title, description, action }) => (
  <motion.div
    className="text-center py-12"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
  >
    <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
    </div>
    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    {description && <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </motion.div>
);

export const Alert = ({ type = 'info', children, className }) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
  };
  return (
    <motion.div
      className={clsx('rounded-lg border px-4 py-3 text-sm', styles[type], className)}
      role="alert"
      initial={{ opacity: 0, y: -8, x: 0 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
};

export const formatMoney = (amount, currency = 'EUR') => {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
};

export const formatDate = (d, opts = {}) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', ...opts });
};

export const formatDateTime = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleString();
};

export const CopyButton = ({ value, label = 'Copy' }) => {
  const [copied, setCopied] = useState(false);
  const reduced = useReducedMotion();
  return (
    <motion.button
      className={clsx('btn-secondary !py-1.5 text-xs', copied && '!bg-emerald-50 !text-emerald-700 !border-emerald-200')}
      whileHover={reduced ? {} : { y: -1 }}
      whileTap={reduced ? {} : { scale: 0.97 }}
      animate={copied ? (reduced ? {} : { scale: [1, 1.07, 1] }) : {}}
      transition={{ scale: { duration: copied ? 0.35 : 0 } }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
    >
      {copied ? '✓ Copied' : label}
    </motion.button>
  );
};

