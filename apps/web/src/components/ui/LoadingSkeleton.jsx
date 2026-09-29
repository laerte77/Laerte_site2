import React from 'react';
import { cn } from '@/lib/utils';

export default function LoadingSkeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted/50',
        className
      )}
      aria-hidden="true"
      {...props}
    >
      <div
        className="
          absolute
          inset-0
          -translate-x-full
          bg-gradient-to-r
          from-transparent
          via-white/10
          to-transparent
          animate-shimmer
          motion-reduce:animate-none
        "
      />
    </div>
  );
}
