/**
 * React Hook pro Version Checker
 * 
 * Použití v App.js nebo layout komponentě:
 * 
 * import useVersionChecker from './hooks/useVersionChecker';
 * 
 * function App() {
 *   useVersionChecker({
 *     onUpdate: (versionData) => {
 *       // Zobraz custom toast/modal
 *       showUpdateNotification(versionData);
 *     }
 *   });
 *   
 *   return <YourApp />;
 * }
 */

import { useEffect, useRef } from 'react';
import VersionChecker from '../utils/versionChecker';

/**
 * Hook pro automatickou detekci nové verze aplikace
 * 
 * @param {Object} options - Konfigurace
 * @param {Function} options.onUpdate - Callback při detekci nové verze
 * @param {number} options.checkInterval - Interval kontroly (ms), výchozí 5 min
 * @param {number} options.gracePeriod - Grace period po načtení (ms), výchozí 60s
 * @param {boolean} options.enabled - Zapnout/vypnout checker, výchozí true
 */
const useVersionChecker = (options = {}) => {
  const checkerRef = useRef(null);
  const { onUpdate, checkInterval, gracePeriod, enabled = true, endpoint } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Vytvoř instanci checkeru
    checkerRef.current = new VersionChecker({
      onUpdate,
      checkInterval,
      gracePeriod,
      endpoint
    });

    // Spusť monitoring
    checkerRef.current.start();

    // Cleanup při unmount
    return () => {
      if (checkerRef.current) {
        checkerRef.current.stop();
        checkerRef.current = null;
      }
    };
  }, [enabled, onUpdate, checkInterval, gracePeriod, endpoint]);

  // Vrať API pro manuální kontrolu nebo reload
  return {
    checkNow: () => checkerRef.current?.checkForUpdate(),
    reload: () => checkerRef.current?.reloadApp(),
    reset: () => checkerRef.current?.reset()
  };
};

export default useVersionChecker;
