import React from 'react';
import NeonCard from './NeonCard';
import DividerLine from './DividerLine';
import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';

export default function KPICard({ icon: Icon, label, value, trend, colorScheme = 'pessoal', iconColor, isCurrency = false }) {
  const defaultIconColor = {
    pessoal: 'pessoal',
    entretenimento: 'entretenimento',
    lm_impressoes: 'lanhouse',
    igreja: 'igreja',
    barbearia: 'barbearia'
  }[colorScheme] || 'pessoal';

  const finalIconColor = iconColor || defaultIconColor;

  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g,"")) : value;

  return (
    <NeonCard colorScheme={colorScheme} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <motion.div 
          whileHover={{ rotate: 5, scale: 1.1 }}
          transition={{ duration: 0.3 }}
          className="p-3 rounded-lg bg-background/80 shadow-[0_0_15px_hsl(var(--primary)/0.5)] transition-all duration-300 hover:shadow-[0_0_25px_hsl(var(--primary)/1)]" 
          style={{ 
            color: `hsl(var(--neon-${finalIconColor}))`, 
            '--primary': `var(--neon-${finalIconColor})` 
          }}
        >
          <Icon size={28} />
        </motion.div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
          <h3 className="text-2xl font-bold mt-1 text-foreground">
            {typeof numericValue === 'number' && !isNaN(numericValue) ? (
              <AnimatedCounter 
                value={numericValue} 
                format={(v) => isCurrency ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : Math.round(v).toString()} 
              />
            ) : value}
          </h3>
        </div>
      </div>
      {trend && (
        <>
          <DividerLine moduleName={colorScheme} className="mt-2 opacity-50" thickness={1} />
          <div className="text-xs font-medium text-muted-foreground mt-2">
            {trend}
          </div>
        </>
      )}
    </NeonCard>
  );
}