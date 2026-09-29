import React from 'react';
import { cn } from '@/lib/utils';

export default function DividerLine({
  moduleName,
  className,
  vertical = false,
  thickness = 1
}) {
  const colors = {
    pessoal: 'border-[hsl(var(--neon-blue)/0.4)]',
    'lm-impressoes': 'border-[hsl(var(--neon-cyan)/0.4)]',
    igreja: 'border-[hsl(var(--neon-gold)/0.4)]',
    entretenimento: 'border-[hsl(var(--neon-orange)/0.4)]',
    barbearia: 'border-[hsl(var(--neon-gold)/0.4)]'
  };

  const colorClass =
    (moduleName && colors[moduleName]) || 'border-primary/40';

  const borderStyle = vertical
    ? {
        borderLeftWidth: `${thickness}px`,
        borderTopWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0
      }
    : {
        borderTopWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: `${thickness}px`,
        borderLeftWidth: 0
      };

  return (
    <div
      aria-hidden="true"
      className={cn(
        colorClass,
        'border-solid',
        vertical
          ? 'w-0 h-full'
          : 'w-full h-0',
        'transition-colors duration-300',
        'motion-reduce:transition-none',
        className
      )}
      style={borderStyle}
    />
  );
}
