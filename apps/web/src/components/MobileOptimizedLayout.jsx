import React from 'react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { cn } from '@/lib/utils';

export default function MobileOptimizedLayout({ children }) {
  const { isMobile, isTablet, isDesktop } = useDeviceDetection();
  
  return (
    <div 
      className={cn(
        "flex min-h-screen flex-col w-full transition-all duration-300 responsive-container",
        isMobile && "mobile-optimized-container",
        isTablet && "tablet-optimized-container",
        isDesktop && "desktop-optimized-container"
      )}
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {children}
    </div>
  );
}