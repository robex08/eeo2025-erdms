import { useState, useEffect } from 'react';

/**
 * Hook pro detekci mobilního zařízení
 * Kombinuje touch capabilities, user agent a velikost okna
 */
export const useDevice = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      
      // Pro detekci stačí mobilní UA NEBO malá obrazovka (pro testování na desktopu)
      setIsMobile(isMobileUA || isSmallScreen);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { isMobile };
};

export default useDevice;
