import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function NeonCard({ children, colorScheme = 'pessoal', className = '' }) {
  const colorMap = {
    pessoal: 'pessoal',
    entretenimento: 'entretenimento',
    lm_impressoes: 'lanhouse',
    igreja: 'igreja',
    barbearia: 'barbearia'
  };
  
  const neonColor = colorMap[colorScheme] || 'pessoal';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "bg-card/90 backdrop-blur-md rounded-xl p-6 transition-all duration-300",
        "border-[2px]",
        `border-[hsl(var(--neon-${neonColor}))]/70`,
        `shadow-[0_0_15px_hsl(var(--neon-${neonColor})/0.2)]`,
        `hover:shadow-[0_8px_24px_hsl(0,0%,0%,0.4),0_0_20px_hsl(var(--neon-${neonColor})/1)]`,
        "hover:bg-card hover:brightness-110",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
