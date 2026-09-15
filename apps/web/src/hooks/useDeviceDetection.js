import { useState, useEffect } from 'react';

export const useDeviceDetection = () => {
 const [device, setDevice] = useState({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isAndroid: false,
  isIOS: false,
  isTouchDevice: false,
  isStandalone: false,
  orientation: 'landscape',
  deviceType: 'DESKTOP',
  screenSize: { width: 0, height: 0 }
});

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const ua = navigator.userAgent || '';
const platform = navigator.platform || '';
const maxTouchPoints = navigator.maxTouchPoints || 0;

const isAndroid = /android/i.test(ua);

// iPadOS moderno pode aparecer como Macintosh
const isiPadOS = /macintosh/i.test(ua) && maxTouchPoints > 1;

const isIOS =
  /iphone|ipad|ipod/i.test(ua) ||
  isiPadOS ||
  /iPhone|iPad|iPod/i.test(platform);

const isTouchDevice =
  'ontouchstart' in window || maxTouchPoints > 0;

const isMobileUA =
  /mobile/i.test(ua) ||
  /iphone|ipod/i.test(ua);

const isTabletUA =
  /ipad|tablet/i.test(ua) ||
  isiPadOS ||
  (isAndroid && !isMobileUA);

      let deviceType = 'DESKTOP';
      let isMobile = false;
      let isTablet = false;
      let isDesktop = false;

      // TABLET
if (
  isTabletUA ||
  (isTouchDevice && width >= 768 && width < 1200)
) {
  isTablet = true;
  deviceType = 'TABLET';

// CELULAR
} else if (
  width < 768 ||
  (isMobileUA && width < 1024)
) {
  isMobile = true;
  deviceType = 'MOBILE';

// DESKTOP
} else {
  isDesktop = true;
}
const isStandalone =
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;
      
      setDevice({
  isMobile,
  isTablet,
  isDesktop,
  isAndroid,
  isIOS,
  isTouchDevice,
  isStandalone,
  orientation: width >= height ? 'landscape' : 'portrait',
  deviceType,
  screenSize: { width, height }
});
    };

    // Initial check
    handleResize();

        window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return device;
};
