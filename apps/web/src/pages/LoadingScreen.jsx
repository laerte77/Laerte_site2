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
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="min-h-screen bg-gradient-professional flex flex-col items-center justify-center relative overflow-hidden"
      >
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-[100px] animate-pulse delay-1000" />

        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center z-10 text-center px-4 bg-[hsl(var(--card-bg))]/90 backdrop-blur-md p-12 rounded-3xl shadow-[0_0_30px_hsl(var(--neon-cyan)/0.4)] border border-[hsl(var(--neon-cyan))]/50"
          >
            <motion.div
              className="p-6 rounded-2xl bg-[hsl(var(--neon-cyan))]/10 border border-[hsl(var(--neon-cyan))]/30 mb-8 flex items-center justify-center shadow-[0_0_20px_hsl(var(--neon-cyan)/0.6)]"
              animate={{ 
                boxShadow: ["0 0 20px hsl(var(--neon-cyan)/0.5)", "0 0 80px hsl(var(--neon-cyan)/1)", "0 0 20px hsl(var(--neon-cyan)/0.5)"] 
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Zap className="w-[120px] h-[120px] text-[hsl(var(--neon-cyan))] animate-pulse-custom" />
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-4xl md:text-5xl font-bold mb-4 text-white tracking-wide"
            >
              Seja Bem-Vindo
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg md:text-xl text-[hsl(var(--text-secondary))] mb-12 max-w-md font-medium"
            >
              Sua plataforma de gestão completa. Moderna, intuitiva e poderosa.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex items-center gap-3 bg-white/5 py-3 px-6 rounded-full border border-[hsl(var(--neon-cyan))]/30 shadow-[0_0_15px_hsl(var(--neon-cyan)/0.3)]"
            >
              <Loader2 className="w-8 h-8 text-[hsl(var(--neon-cyan))] animate-spin-smooth" />
              <p className="text-[hsl(var(--text-tertiary))] font-medium tracking-wide">
                Preparando a decolagem<span className="animate-dots inline-block w-4 text-left"></span>
              </p>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </>
  );
}