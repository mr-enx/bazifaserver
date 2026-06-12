export function isIosPwa() {
  const userAgent = window.navigator.userAgent.toLowerCase();

  const isIosDevice =
    /iphone|ipad|ipod/.test(userAgent) ||
    (userAgent.includes('macintosh') && navigator.maxTouchPoints > 1);

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isIosDevice && isStandalone;
}
