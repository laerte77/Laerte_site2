import React from 'react';
import { cn } from '@/lib/utils';

export default function LoadingSkeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse bg-muted/50 rounded-md relative overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
    </div>
  );
}