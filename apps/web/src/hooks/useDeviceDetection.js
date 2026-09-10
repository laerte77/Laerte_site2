import { useState, useEffect } from 'react';

export const useDeviceDetection = () => {
  const [device, setDevice] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    deviceType: 'DESKTOP',
    screenSize: { width: 0, height: 0 }
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const ua = navigator.userAgent;

      const isAndroid = /android/i.test(ua);
      const isIOS = /ipad|iphone|ipod/i.test(ua);
      const isMobileUA = isAndroid || isIOS || /mobile/i.test(ua);
      const isTabletUA = /ipad|tablet/i.test(ua) || (isAndroid && !/mobile/i.test(ua));

      let deviceType = 'DESKTOP';
      let isMobile = false;
      let isTablet = false;
      let isDesktop = false;

      if (width < 768 || (isMobileUA && !isTabletUA && width < 1024)) {
        isMobile = true;
        deviceType = 'MOBILE';
      } else if ((width >= 768 && width < 1024) || isTabletUA) {
        isTablet = true;
        deviceType = 'TABLET';
      } else {
        isDesktop = true;
      }

      setDevice({
        isMobile,
        isTablet,
        isDesktop,
        deviceType,
        screenSize: { width, height }
      });
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return device;
};