import React, { Children, cloneElement, forwardRef, isValidElement, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { useCountUp, useReducedMotion, useTilt } from './hooks';

export { useReducedMotion, useTilt, useCountUp } from './hooks';

export const PageTransition = ({ children, className, delay = 0, key }) => {
  const reduced = useReducedMotion();
  const dur = reduced ? 0.12 : 0.55;
  const dist = reduced ? 0 : 14;
  return (
    <motion.div
      key={key}
      initial={{ opacity: 0, y: dist, scale: reduced ? 1 : 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -dist * 0.5 }}
      transition={{ duration: dur, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
};

export const DepthCard = forwardRef(function DepthCard({
  children, className, hover = true, tilt = false, interactive = true, onClick, style,
}, outerRef) {
  const innerRef = useRef(null);
  const combinedRef = outerRef || innerRef;
  const reduced = useReducedMotion();
  useTilt(combinedRef, { max: tilt ? 4 : 0, disabled: !interactive });
  return (
    <motion.div
      ref={combinedRef}
      onClick={onClick}
      className={clsx('card', hover && 'card-hover', 'preserve-3d perspective-800', className)}
      initial={reduced ? undefined : { opacity: 0, y: 18, rotateX: -4, translateZ: -28 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0, rotateX: 0, translateZ: 0 }}
      viewport={{ once: true, amount: 0.16, margin: '0px 0px -8% 0px' }}
      whileHover={hover ? { y: -4 } : undefined}
      transition={{ type: 'spring', stiffness: 280, damping: 26, opacity: { duration: 0.45 } }}
      style={style}
    >
      {children}
    </motion.div>
  );
});

export const TiltCard = forwardRef(function TiltCard({ children, className, hover = true, onClick }, ref) {
  return (
    <DepthCard ref={ref} className={className} hover={hover} tilt onClick={onClick}>
      {children}
    </DepthCard>
  );
});

export const Reveal3D = ({ children, stagger = 60, delay = 0, from = 14, className, as = 'div', container = true }) => {
  const reduced = useReducedMotion();
  const actualStagger = reduced ? 0 : stagger;
  const actualFrom = reduced ? 0 : from;
  const duration = reduced ? 0.1 : 0.55;
  const Comp = motion[as] || motion.div;
  if (!container) {
    return Children.map(Children.toArray(children), (child, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: actualFrom, scale: reduced ? 1 : 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.18, margin: '0px 0px -8% 0px' }}
        transition={{ duration, delay: delay / 1000 + (i * actualStagger) / 1000, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {child}
      </motion.div>
    ));
  }
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.16, margin: '0px 0px -8% 0px' }}
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: actualStagger / 1000, delayChildren: delay / 1000 },
        },
      }}
    >
      {Children.map(Children.toArray(children), (child, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, y: actualFrom, scale: reduced ? 1 : 0.985, rotateX: reduced ? 0 : -7, translateZ: reduced ? 0 : -36 },
            show: { opacity: 1, y: 0, scale: 1, rotateX: 0, translateZ: 0, transition: { duration, ease: [0.2, 0.8, 0.2, 1] } },
          }}
        >
          {child}
        </motion.div>
      ))}
    </Comp>
  );
};

export const FloatingLayer = ({ color = 'rgba(59,130,246,0.06)', className, style, delay = 0, width = '60%', height = '60%', translate = '-50%,-50%' }) => {
  return (
    <div
      aria-hidden
      className={clsx('bg-plane absolute rounded-3xl pointer-events-none animate-float-y', className)}
      style={{
        background: `radial-gradient(closest-side, ${color}, transparent 70%)`,
        left: '50%', top: '50%',
        width, height,
        transform: `translate(${translate})`,
        animationDelay: `${delay}s`,
        ...style,
      }}
    />
  );
};

export const AmbientVideo = ({ className }) => (
  <video
    className={clsx('ambient-video', className)}
    autoPlay
    muted
    loop
    playsInline
    preload="metadata"
    aria-hidden="true"
    onError={(event) => { event.currentTarget.style.display = 'none'; }}
  >
    <source src="/affiliate-network-background.mp4" type="video/mp4" />
  </video>
);

export const ReactiveBackground = ({ className }) => {
  return <div className={clsx('reactive-background', className)} aria-hidden="true"><AmbientVideo /></div>;
};

export const AnimatedCounter = ({ value, duration = 900, startDelay = 0, prefix = '', suffix = '', decimals = value % 1 === 0 ? 0 : 2, className }) => {
  const v = useCountUp(Number(value ?? 0), duration, startDelay);
  const reduced = useReducedMotion();
  const display = reduced ? Number(value ?? 0) : v;
  const formatted = useMemo(() => {
    if (Number.isFinite(decimals) && decimals >= 0) {
      return Number(display).toFixed(decimals);
    }
    return Math.round(display).toString();
  }, [display, decimals]);
  return <span className={className}>{prefix}{formatted}{suffix}</span>;
};

export const StatusTransition = ({ children, status, className, duration = 0.42 }) => {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={String(status ?? 'none')}
        className={clsx('inline-flex', className)}
        initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.7, rotateX: -10 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, rotateX: 0 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7, rotateX: 8 }}
        transition={{ duration, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ transformOrigin: 'center center', transformStyle: 'preserve-3d' }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
};

const ModalCardInner = ({ open, onClose, title, children, footer, size = 'md' }) => {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.05 : 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="absolute inset-0 bg-slate-900/50"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.05 : 0.22 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={clsx('card w-full relative z-10 preserve-3d perspective-1000', sizes[size])}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.88, rotateX: -8, y: 12 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, rotateX: 0, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotateX: 4, y: -4 }}
            transition={{ duration: reduced ? 0.05 : 0.38, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="card-header">
                <h3 className="text-lg font-semibold">{title}</h3>
                <button onClick={onClose} className="btn-ghost px-2 py-1 !text-lg">×</button>
              </div>
            )}
            <div className="card-body">{children}</div>
            {footer && <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const Modal3D = ({ open, onClose, title, children, footer, size = 'md' }) => {
  if (!open && typeof window === 'undefined') return null;
  return <ModalCardInner open={open} onClose={onClose} title={title} footer={footer} size={size}>{children}</ModalCardInner>;
};

export const TableReveal = ({ children, rowsStagger = 28, className, delay = 0 }) => {
  const reduced = useReducedMotion();
  const actualStagger = reduced ? 0 : rowsStagger;
  const from = reduced ? 0 : 4;
  const dur = reduced ? 0.08 : 0.35;
  return (
    <motion.tbody
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: actualStagger / 1000, delayChildren: delay / 1000 } },
      }}
    >
      {Children.map(Children.toArray(children), (child, i) => {
        if (!isValidElement(child)) return child;
        const key = child.key ?? i;
        const variants = {
          hidden: { opacity: 0, y: from },
          show: { opacity: 1, y: 0, transition: { duration: dur, ease: [0.2, 0.8, 0.2, 1] } },
        };
        return (
          <motion.tr
            key={key}
            variants={variants}
            style={child.props.style}
            className={child.props.className}
          >
            {child.props.children}
          </motion.tr>
        );
      })}
    </motion.tbody>
  );
};

export const Progress3D = ({ value, min = 0, max = 100, tone = 'brand', height = 12, showLabel = true, labelFormatter, className }) => {
  const v = Math.max(Number(min), Math.min(Number(max), Number(value ?? 0)));
  const pct = max > min ? (v - min) / (max - min) : 0;
  const toneMap = {
    brand: ['#60a5fa', '#2563eb', '#1d4ed8'],
    success: ['#34d399', '#059669', '#047857'],
    warning: ['#fbbf24', '#d97706', '#b45309'],
    danger: ['#f87171', '#dc2626', '#b91c1c'],
    emerald: ['#34d399', '#059669', '#047857'],
  };
  const [s1, s2, s3] = toneMap[tone] || toneMap.brand;
  const reduced = useReducedMotion();
  return (
    <div className={clsx('w-full', className)}>
      <div
        className="progress-3d-track w-full"
        style={{ height }}
        role="progressbar"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={v}
      >
        <motion.div
          className="progress-3d-fill"
          initial={{ transform: 'scaleX(0)' }}
          animate={{ transform: `scaleX(${pct})` }}
          transition={{ duration: reduced ? 0.05 : 0.9, ease: [0.2, 0.8, 0.2, 1] }}
          style={{
            background: `linear-gradient(180deg, rgba(255,255,255,.35) 0%, rgba(255,255,255,0) 35%, rgba(15,23,42,.08) 100%), linear-gradient(90deg, ${s1}, ${s2} 60%, ${s3})`,
          }}
        />
      </div>
      {showLabel && (
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>{labelFormatter ? labelFormatter(v) : `${Math.round(pct * 100)}%`}</span>
          <span>{v} / {max}</span>
        </div>
      )}
    </div>
  );
};

export const ParticleField = ({ count = 24, size = 2, color = 'rgba(59,130,246,0.25)', className }) => {
  const reduced = useReducedMotion();
  if (reduced) return null;
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: size * (0.6 + Math.random() * 1.1),
        delay: (Math.random() * 6).toFixed(2),
        opacity: 0.15 + Math.random() * 0.5,
      });
    }
    return arr;
  }, [count, size]);
  return (
    <div aria-hidden className={clsx('particle absolute inset-0 pointer-events-none overflow-hidden', className)}>
      {particles.map((p, i) => (
        <span
          key={i}
          className="particle absolute rounded-full animate-float-y"
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: color,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            filter: 'blur(.2px)',
          }}
        />
      ))}
    </div>
  );
};

export const PerspectivePanel = ({ step, index, children, className, delay = 0 }) => {
  const active = step === index;
  const reduced = useReducedMotion();
  const dur = reduced ? 0.08 : 0.55;
  return (
    <motion.div
      role={active ? 'tabpanel' : undefined}
      hidden={!active && reduced ? true : false}
      className={clsx(className)}
      initial={{ opacity: 0, rotateY: reduced ? 0 : -6, translateZ: reduced ? 0 : -30, y: reduced ? 0 : 10 }}
      animate={active
        ? { opacity: 1, rotateY: 0, translateZ: 0, y: 0 }
        : { opacity: 0, rotateY: reduced ? 0 : 6, translateZ: reduced ? 0 : -30, y: reduced ? 0 : -8 }}
      transition={{ duration: dur, delay: delay / 1000, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
    >
      {children}
    </motion.div>
  );
};

export const CheckDraw = ({ size = 64, strokeWidth = 4, tone = 'emerald', className }) => {
  const toneMap = { emerald: '#10b981', brand: '#2563eb', success: '#10b981', blue: '#2563eb', slate: '#64748b' };
  const stroke = toneMap[tone] || toneMap.emerald;
  const reduced = useReducedMotion();
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={clsx(className)}
      style={{ filter: `drop-shadow(0 6px 16px rgba(16,185,129,0.3))` }}
    >
      <circle cx="32" cy="32" r="28" fill="rgba(16,185,129,0.1)" stroke={stroke} strokeWidth={strokeWidth * 0.5} strokeOpacity="0.45" />
      <path
        className={clsx(!reduced && 'checkdraw-path')}
        d="M18 33 L28 42 L46 22"
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={reduced ? { strokeDashoffset: 0 } : undefined}
      />
    </svg>
  );
};

export const DataFlow = ({ steps = [], activeStep = -1, onStepClick, className }) => {
  const reduced = useReducedMotion();
  return (
    <div className={clsx('w-full py-2 preserve-3d', className)} style={{ perspective: 1000 }}>
      <div className="relative flex items-stretch gap-2 md:gap-0">
        {steps.map((s, i) => {
          const done = activeStep > i;
          const current = activeStep === i;
          return (
            <React.Fragment key={i}>
              <div className="relative flex-1 flex flex-col items-center text-center px-2 md:px-4">
                <motion.div
                  onClick={onStepClick ? () => onStepClick(i) : undefined}
                  whileHover={onStepClick ? { scale: 1.04, y: -2 } : undefined}
                  whileTap={onStepClick ? { scale: 0.98 } : undefined}
                  initial={{ opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : 0.9 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    boxShadow: current
                      ? '0 14px 40px -14px rgba(37,99,235,0.55)'
                      : done
                      ? '0 10px 26px -14px rgba(16,185,129,0.5)'
                      : '0 6px 20px -14px rgba(15,23,42,0.3)',
                  }}
                  transition={{ duration: reduced ? 0.05 : 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                  className={clsx(
                    'relative w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg select-none',
                    done ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' :
                    current ? 'bg-gradient-to-br from-brand-400 to-brand-700' :
                    'bg-gradient-to-br from-slate-200 to-slate-400'
                  )}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <span className="backface-hidden">
                    {done ? '✓' : current ? `${i + 1}` : `${i + 1}`}
                  </span>
                  {current && !reduced && (
                    <span className="absolute inset-0 rounded-2xl pointer-events-none" style={{
                      background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,.45) 50%, transparent 75%)',
                      transform: 'translateX(-100%)',
                      animation: 'sweep 2.4s ease-in-out infinite',
                      mixBlendMode: 'soft-light',
                    }} />
                  )}
                </motion.div>
                <div className="mt-3 whitespace-pre-line text-xs font-medium text-slate-700 leading-snug">{typeof s === 'string' ? s : s.label}</div>
                {typeof s === 'object' && s.amount && (
                  <div className="mt-1 text-sm font-bold text-slate-900">{s.amount}</div>
                )}
              </div>
              {i < steps.length - 1 && (
                <div className="relative self-center flex-none w-6 md:w-14 h-1 mx-1 md:mx-2 rounded-full overflow-hidden bg-slate-200">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      background: activeStep > i
                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                        : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: activeStep >= i ? (activeStep > i ? '100%' : reduced ? '50%' : '55%') : '0%' }}
                    transition={{ duration: reduced ? 0.05 : 0.7, ease: [0.2, 0.8, 0.2, 1] }}
                  />
                  {current && i < steps.length - 1 && !reduced && (
                    <motion.div
                      className="absolute top-1/2 w-2.5 h-2.5 rounded-full -translate-y-1/2 shadow-lg"
                      style={{ background: '#2563eb', boxShadow: '0 0 10px rgba(37,99,235,.7)' }}
                      initial={{ left: '-10%' }}
                      animate={{ left: '110%' }}
                      transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
                    />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default {
  PageTransition,
  DepthCard,
  TiltCard,
  Reveal3D,
  FloatingLayer,
  AnimatedCounter,
  StatusTransition,
  Modal3D,
  TableReveal,
  Progress3D,
  ParticleField,
  PerspectivePanel,
  CheckDraw,
  DataFlow,
};
