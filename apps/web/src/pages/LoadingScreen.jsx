import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet';

export default function LoadingScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      navigate('/modules');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <>
      <Helmet>
        <title>Carregando - SistemaPro</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        className="min-h-screen bg-gradient-professional flex flex-col items-center justify-center relative overflow-hidden px-4"
      >
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-white/5 rounded-full blur-[90px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-white/5 rounded-full blur-[90px] animate-pulse delay-1000" />

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              role="status"
              aria-live="polite"
              className="
                flex flex-col items-center z-10 text-center
                w-full max-w-xl
                bg-[hsl(var(--card-bg))]/90
                backdrop-blur-md
                p-8 sm:p-12
                rounded-3xl
                border border-[hsl(var(--neon-cyan))]/40
                shadow-[0_0_24px_hsl(var(--neon-cyan)/0.28)]
              "
            >
              <motion.div
                className="
                  p-5 sm:p-6
                  rounded-2xl
                  bg-[hsl(var(--neon-cyan))]/10
                  border border-[hsl(var(--neon-cyan))]/25
                  mb-7 sm:mb-8
                  flex items-center justify-center
                "
                animate={{
                  boxShadow: [
                    '0 0 16px hsl(var(--neon-cyan)/0.35)',
                    '0 0 42px hsl(var(--neon-cyan)/0.7)',
                    '0 0 16px hsl(var(--neon-cyan)/0.35)'
                  ]
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <Zap
                  className="
                    w-20 h-20
                    sm:w-24 sm:h-24
                    text-[hsl(var(--neon-cyan))]
                    animate-pulse-custom
                  "
                  aria-hidden="true"
                />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="
                  text-3xl sm:text-4xl md:text-5xl
                  font-bold
                  mb-4
                  text-white
                  tracking-wide
                "
              >
                Seja Bem-Vindo
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="
                  text-base sm:text-lg md:text-xl
                  text-[hsl(var(--text-secondary))]
                  mb-9 sm:mb-12
                  max-w-md
                  font-medium
                  leading-relaxed
                "
              >
                Sua plataforma de gestão completa. Moderna, intuitiva e poderosa.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.5 }}
                className="
                  flex items-center gap-3
                  bg-white/5
                  py-3 px-5 sm:px-6
                  rounded-full
                  border border-[hsl(var(--neon-cyan))]/25
                  shadow-[0_0_12px_hsl(var(--neon-cyan)/0.2)]
                "
              >
                <Loader2
                  className="
                    w-6 h-6 sm:w-7 sm:h-7
                    text-[hsl(var(--neon-cyan))]
                    animate-spin-smooth
                  "
                  aria-hidden="true"
                />

                <p className="
                  text-sm sm:text-base
                  text-[hsl(var(--text-tertiary))]
                  font-medium
                  tracking-wide
                ">
                  Preparando a decolagem
                  <span
                    className="animate-dots inline-block w-4 text-left"
                    aria-hidden="true"
                  />
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
