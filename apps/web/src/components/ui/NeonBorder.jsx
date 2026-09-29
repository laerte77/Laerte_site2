import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function NeonBorder({
  children,
  neonColor = 'pessoal',
  className = '',
  ...props
}) {
  const neonVariable = `--neon-${neonColor}`;

  const baseBorderColor = `hsl(var(${neonVariable}) / 0.4)`;
  const hoverBorderColor = `hsl(var(${neonVariable}) / 1)`;

  const baseShadow =
    `0 0 15px hsl(var(${neonVariable}) / 0.15)`;

  const hoverShadow =
    `0 8px 24px hsl(var(${neonVariable}) / 0.4), ` +
    `inset 0 0 10px hsl(var(${neonVariable}) / 0.2)`;

  return (
    <motion.div
      whileHover={{
        scale: 1.01,
        y: -2,
        borderColor: hoverBorderColor,
        boxShadow: hoverShadow
      }}
      whileTap={{
        scale: 0.995
      }}
      transition={{
        duration: 0.25,
        ease: 'easeOut'
      }}
      className={cn(
        [
          'relative',
          'rounded-xl',
          'bg-card/80',
          'backdrop-blur-md',
          'border-[2px]',
          'transition-[background-color,opacity]',
          'duration-200',
          'motion-reduce:transition-none'
        ].join(' '),
        className
      )}
      style={{
        borderColor: baseBorderColor,
        boxShadow: baseShadow
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
