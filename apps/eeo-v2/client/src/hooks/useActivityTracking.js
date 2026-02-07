import { useEffect, useRef, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { api2 } from '../services/api2auth';

/**
 * Hook pro sledování uživatelské aktivity
 * 
 * Automaticky sleduje:
 * - Změny route (useLocation)
 * - IP adresu (backend)
 * - User agent (backend)
 * - Modul/sekci aplikace
 * 
 * Features:
 * - Throttling: Max 1 track za 30 sekund
 * - Debounce: Čeká 1 sekundu než uživatel opravdu zůstane na stránce
 * - Automatické: Zapíná se při mount, vypíná při unmount
 * 
 * @example
 * // V Layout.js
 * useActivityTracking();
 * 
 * @example
 * // Manuální tracking
 * const { trackActivity } = useActivityTracking();
 * trackActivity('Modal Detail', '/orders25-list?modal=detail');
 */
export const useActivityTracking = () => {
  const location = useLocation();
  const { user, token, isLoggedIn } = useContext(AuthContext);
  const lastTrackRef = useRef(0);
  const trackingEnabledRef = useRef(true);
  const ipAddressesRef = useRef({ public: null, local: null });

  // Detect IP addresses once on mount
  useEffect(() => {
    const detectIpAddresses = async () => {
      try {
        // 1. Get public IP from cloudflare
        const publicResponse = await fetch('https://www.cloudflare.com/cdn-cgi/trace');
        const publicData = await publicResponse.text();
        const ipMatch = publicData.match(/ip=([^\s]+)/);
        if (ipMatch && ipMatch[1]) {
          ipAddressesRef.current.public = ipMatch[1];
        }
      } catch (error) {
        // Public IP detection failed - backend will use REMOTE_ADDR
      }

      try {
        // 2. Get local IP using WebRTC (works in most browsers)
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        
        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) {
            return;
          }
          
          const candidate = ice.candidate.candidate;
          const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
          const match = ipRegex.exec(candidate);
          if (match && match[1]) {
            const localIp = match[1];
            
            // Skip if already set or if it's a public IP (we want local only)
            if (!ipAddressesRef.current.local && 
                (localIp.startsWith('192.168.') || 
                 localIp.startsWith('10.') || 
                 localIp.startsWith('172.'))) {
              ipAddressesRef.current.local = localIp;
              pc.close();
            }
          }
        };

        // Cleanup after 2 seconds
        setTimeout(() => pc.close(), 2000);
      } catch (error) {
        // WebRTC not available or blocked
      }
    };
    
    detectIpAddresses();
  }, []);

  /**
   * Mapování route na název modulu
   * 
   * @param {string} pathname URL pathname
   * @returns {string} Název modulu
   */
  const getModuleName = (pathname) => {
    const moduleMap = {
      '/': 'Dashboard',
      '/dashboard': 'Dashboard',
      '/orders25-list': 'Objednávky',
      '/order-form-25': 'Formulář objednávky',
      '/invoices25-list': 'Faktury',
      '/invoice-evidence': 'Evidence faktury',
      '/cash-book': 'Pokladna',
      '/dictionaries': 'Číselníky',
      '/suppliers': 'Dodavatelé',
      '/contracts': 'Smlouvy',
      '/address-book': 'Adresář',
      '/notifications': 'Notifikace',
      '/reports': 'Reporty',
      '/statistics': 'Statistiky',
      '/profile': 'Profil',
      '/users': 'Správa uživatelů',
      '/debug': 'Debug panel',
      '/orders': 'Objednávky před 2026',
      '/change-password': 'Změna hesla',
      '/settings': 'Nastavení'
    };

    // Check for exact match first
    if (moduleMap[pathname]) {
      return moduleMap[pathname];
    }

    // Check for partial matches (e.g., /dictionaries/contracts)
    for (const [key, value] of Object.entries(moduleMap)) {
      if (pathname.startsWith(key) && key !== '/') {
        return value;
      }
    }

    return 'Aplikace';
  };

  /**
   * Trackuje aktivitu na backend
   * 
   * @param {string} module Název modulu
   * @param {string} path URL path včetně query params
   */
  const trackActivity = async (module, path) => {
    if (!isLoggedIn || !user || !token) {
      return;
    }

    if (!trackingEnabledRef.current) {
      return;
    }

    // Throttling - max 1x za 30 sekund
    const now = Date.now();
    if (now - lastTrackRef.current < 30000) {
      return;
    }

    lastTrackRef.current = now;

    try {
      // Získat session ID z sessionStorage pokud existuje
      const sessionId = sessionStorage.getItem('erdms_session') || null;

      const response = await api2.post('user/activity/track', {
        token,
        username: user.username,
        module,
        path,
        session_id: sessionId,
        public_ip: ipAddressesRef.current.public,
        local_ip: ipAddressesRef.current.local
      });

      // Success - no logging needed
    } catch (error) {
      // Tichá chyba - nenarušovat UX
    }
  };

  // Automatický tracking při změně route
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const module = getModuleName(location.pathname);
    const path = location.pathname + location.search;

    // Debounce - počkat 1s než uživatel opravdu zůstane na stránce
    // (zamezí trackování při rychlé navigaci přes stránky)
    const timer = setTimeout(() => {
      trackActivity(module, path);
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, isLoggedIn]);

  return {
    /**
     * Manuální tracking aktivity
     * @param {string} module Název modulu
     * @param {string} path URL path
     */
    trackActivity: (module, path) => trackActivity(module, path),
    
    /**
     * Zapne tracking (default: zapnuto)
     */
    enableTracking: () => {
      trackingEnabledRef.current = true;
    },
    
    /**
     * Vypne tracking (např. pro testování)
     */
    disableTracking: () => {
      trackingEnabledRef.current = false;
    }
  };
};

export default useActivityTracking;
