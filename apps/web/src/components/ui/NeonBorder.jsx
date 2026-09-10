import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getNeonColor } from '@/lib/neonStyleUtils';

export default function NeonBorder({ children, neonColor = 'pessoal', className = '', ...props }) {
  const hexColor = `hsl(var(--neon-${neonColor}))`;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        "relative rounded-xl bg-card/80 backdrop-blur-md transition-all duration-300",
        "border-[2px]",
        className
      )}
      style={{
        borderColor: `hsl(var(--neon-${neonColor}) / 0.4)`,
        boxShadow: `0 0 15px hsl(var(--neon-${neonColor}) / 0.15)`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `hsl(var(--neon-${neonColor}))`;
        e.currentTarget.style.boxShadow = `0 8px 24px hsl(var(--neon-${neonColor}) / 0.4), inset 0 0 10px hsl(var(--neon-${neonColor}) / 0.2)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `hsl(var(--neon-${neonColor}) / 0.4)`;
        e.currentTarget.style.boxShadow = `0 0 15px hsl(var(--neon-${neonColor}) / 0.15)`;
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}