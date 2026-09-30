import{useEffect,useState}from'react';

const getDeviceData=()=>{
 const width=window.innerWidth;
 const height=window.innerHeight;
 const ua=navigator.userAgent||'';
 const platform=navigator.platform||'';
 const maxTouchPoints=navigator.maxTouchPoints||0;

 const isAndroid=/android/i.test(ua);
 const isIPadOS=/macintosh/i.test(ua)&&maxTouchPoints>1;
 const isIOS=/iphone|ipad|ipod/i.test(ua)||isIPadOS||/iPhone|iPad|iPod/i.test(platform);
 const isTouchDevice='ontouchstart'in window||maxTouchPoints>0;
 const isMobileUA=/mobile/i.test(ua)||/iphone|ipod/i.test(ua);
 const isTabletUA=/ipad|tablet/i.test(ua)||isIPadOS||(isAndroid&&!isMobileUA);
 const isStandalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;

 let isMobile=false;
 let isTablet=false;
 let isDesktop=false;
 let deviceType='DESKTOP';

 if(isTabletUA||(isTouchDevice&&width>=768&&width<1200)){
  isTablet=true;
  deviceType='TABLET';
 }else if(width<768||(isMobileUA&&width<1024)){
  isMobile=true;
  deviceType='MOBILE';
 }else{
  isDesktop=true;
 }

 return{
  isMobile,
  isTablet,
  isDesktop,
  isAndroid,
  isIOS,
  isTouchDevice,
  isStandalone,
  orientation:width>=height?'landscape':'portrait',
  deviceType,
  screenSize:{width,height}
 };
};

export const useDeviceDetection=()=>{
 const[device,setDevice]=useState(()=>({
  isMobile:false,
  isTablet:false,
  isDesktop:true,
  isAndroid:false,
  isIOS:false,
  isTouchDevice:false,
  isStandalone:false,
  orientation:'landscape',
  deviceType:'DESKTOP',
  screenSize:{width:0,height:0}
 }));

 useEffect(()=>{
  let frame=null;

  const update=()=>{
   if(frame)cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    setDevice(getDeviceData());
   });
  };

  update();
  window.addEventListener('resize',update);
  window.addEventListener('orientationchange',update);
  window.visualViewport?.addEventListener('resize',update);

  return()=>{
   if(frame)cancelAnimationFrame(frame);
   window.removeEventListener('resize',update);
   window.removeEventListener('orientationchange',update);
   window.visualViewport?.removeEventListener('resize',update);
  };
 },[]);

 return device;
};
