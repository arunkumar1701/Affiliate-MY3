import { useEffect, useRef, useState } from 'react';

export const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener('change', update);
    else if (mq.addListener) mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else if (mq.removeListener) mq.removeListener(update);
    };
  }, []);
  return reduced;
};

export const useTilt = (ref, opts = {}) => {
  const { max = 4, disabled = false, scale = 1.01 } = opts;
  const reduced = useReducedMotion();
  const touchDisabled = typeof window !== 'undefined' && window.matchMedia
    ? !window.matchMedia('(pointer: fine)').matches
    : false;
  const rafRef = useRef(null);
  const stateRef = useRef({
    targetRX: 0, targetRY: 0, currentRX: 0, currentRY: 0,
    targetScale: 1, currentScale: 1, hovering: false,
  });

  useEffect(() => {
    const el = ref?.current;
    if (!el || disabled || reduced || touchDisabled) return;

    const rect = () => el.getBoundingClientRect();
    const tick = () => {
      const s = stateRef.current;
      s.currentRX += (s.targetRX - s.currentRX) * 0.15;
      s.currentRY += (s.targetRY - s.currentRY) * 0.15;
      s.currentScale += (s.targetScale - s.currentScale) * 0.15;
      el.style.transform = `perspective(800px) rotateX(${s.currentRX.toFixed(2)}deg) rotateY(${s.currentRY.toFixed(2)}deg) scale(${s.currentScale.toFixed(3)})`;
      const drift =
        Math.abs(s.targetRX - s.currentRX) > 0.05 ||
        Math.abs(s.targetRY - s.currentRY) > 0.05 ||
        Math.abs(s.targetScale - s.currentScale) > 0.002 ||
        s.hovering;
      if (drift) rafRef.current = requestAnimationFrame(tick);
      else {
        el.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)`;
        rafRef.current = null;
      }
    };
    const onMove = (e) => {
      const r = rect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      stateRef.current.targetRY = (px - 0.5) * 2 * max;
      stateRef.current.targetRX = -(py - 0.5) * 2 * max;
      stateRef.current.targetScale = scale;
      stateRef.current.hovering = true;
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      stateRef.current.targetRX = 0;
      stateRef.current.targetRY = 0;
      stateRef.current.targetScale = 1;
      stateRef.current.hovering = false;
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      el.style.transform = '';
    };
  }, [ref, max, scale, disabled, reduced, touchDisabled]);
};

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export const useCountUp = (target, duration = 900, startDelay = 0) => {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target ?? 0 : 0);
  const rafRef = useRef(null);
  const startedAtRef = useRef(null);
  const startValRef = useRef(0);
  const targetRef = useRef(target ?? 0);

  useEffect(() => {
    const t = Number(target ?? 0);
    targetRef.current = t;
    if (reduced) {
      setValue(t);
      return;
    }
    startValRef.current = value;
    startedAtRef.current = null;

    const tick = (now) => {
      if (startedAtRef.current === null) startedAtRef.current = now + startDelay;
      const elapsed = now - startedAtRef.current;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, Math.max(0, elapsed / duration));
      const eased = easeOutCubic(p);
      const v = startValRef.current + (targetRef.current - startValRef.current) * eased;
      setValue(v);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setValue(targetRef.current);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, startDelay, reduced]);

  return value;
};
