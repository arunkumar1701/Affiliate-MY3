import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageTransition, DepthCard, Reveal3D, useReducedMotion } from '../components/anim';

export default function NotFoundPage() {
  const reduced = useReducedMotion();
  return (
    <PageTransition>
      <div className="brand-stage min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <DepthCard hover tilt interactive className="max-w-md w-full">
          <div className="card-body text-center py-12">
            <motion.p
              initial={reduced ? {} : { opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.05 }}
              className="text-7xl font-black text-slate-200 select-none"
            >
              404
            </motion.p>
            <Reveal3D stagger={90} delay={200}>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Page not found</h1>
              <p className="mt-1 text-slate-500 max-w-md mx-auto">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </Reveal3D>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1], delay: 0.5 }}
            >
              <Link to="/">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scaleY: 0.97 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  className="btn-primary mt-6"
                >
                  ← Go to dashboard
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </DepthCard>
      </div>
    </PageTransition>
  );
}
