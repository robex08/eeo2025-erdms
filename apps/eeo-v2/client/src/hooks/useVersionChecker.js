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
 * @param {number} options.checkInterval - Interval kontroly (ms), výchozí 10 min
 * @param {number} options.gracePeriod - Grace period po načtení (ms), výchozí 10s
 * @param {boolean} options.enabled - Zapnout/vypnout checker, výchozí true
 */
const useVersionChecker = (options = {}) => {
  const checkerRef = useRef(null);
  const optionsRef = useRef(options);
  const { enabled = true } = options;
  
  // Uchovej nejnovější options v ref (bez triggeru re-render)
  optionsRef.current = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Vytvoř instanci checkeru (POUZE jednou, při mount nebo když se změní enabled)
    checkerRef.current = new VersionChecker({
      onUpdate: optionsRef.current.onUpdate,
      checkInterval: optionsRef.current.checkInterval,
      gracePeriod: optionsRef.current.gracePeriod,
      endpoint: optionsRef.current.endpoint
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
  }, [enabled]); // ✅ OPRAVENO: Pouze 'enabled' v dependencies

  // Vrať API pro manuální kontrolu nebo reload
  return {
    checkNow: (options) => checkerRef.current?.checkForUpdate(options),
    reload: () => checkerRef.current?.reloadApp(),
    reset: () => checkerRef.current?.reset()
  };
};

export default useVersionChecker;
