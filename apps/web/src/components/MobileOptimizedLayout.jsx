import React from'react';
import{cn}from'@/lib/utils';

export default function MobileOptimizedLayout({children,device}){
 const{isMobile,isTablet,isDesktop,isAndroid,isIOS,isTouchDevice,isStandalone,orientation}=device;

 return <div
  className={cn(
   'flex min-h-screen w-full flex-col',
   'transition-[background-color,opacity] duration-300 ease-out motion-reduce:transition-none',
   'responsive-container',
   isMobile&&'mobile-optimized-container',
   isTablet&&'tablet-optimized-container',
   isDesktop&&'desktop-optimized-container',
   isAndroid&&'android-device',
   isIOS&&'ios-device',
   isTouchDevice&&'touch-device',
   isStandalone&&'standalone-app',
   orientation==='portrait'&&'portrait-mode',
   orientation==='landscape'&&'landscape-mode'
  )}
  style={{WebkitOverflowScrolling:'touch'}}
 >
  {children}
 </div>;
}
