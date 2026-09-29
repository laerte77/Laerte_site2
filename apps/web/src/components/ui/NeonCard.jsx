import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function NeonCard({
  children,
  colorScheme = 'pessoal',
  className = ''
}) {
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
      whileHover={{
        scale: 1.01,
        y: -2
      }}
      transition={{
        duration: 0.25,
        ease: 'easeOut'
      }}
      className={cn(
        'bg-card/90 backdrop-blur-md rounded-xl p-6',
        'transition-[background-color,box-shadow,filter,transform] duration-300',
        'border-2',
        `shadow-[0_0_15px_hsl(var(--neon-${neonColor})/0.2)]`,
        `hover:shadow-[0_6px_18px_hsl(0,0%,0%,0.35),0_0_18px_hsl(var(--neon-${neonColor})/0.65)]`,
        'hover:bg-card hover:brightness-105',
        className
      )}
      style={{
        borderColor: `hsl(var(--neon-${neonColor}))`
      }}
    >
      {children}
    </motion.div>
  );
}
