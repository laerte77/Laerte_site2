import React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-primary/10',
        'motion-reduce:animate-none',
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
