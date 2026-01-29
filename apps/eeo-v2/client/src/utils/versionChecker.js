/**
 * Version Checker Utility
 * 
 * Automaticky detekuje novou verzi aplikace pomocí build hash.
 * Při detekci nové verze zobrazí notifikaci a umožní reload.
 * 
 * Features:
 * - Build hash based detection (spolehlivější než manuální verze)
 * - Grace period po načtení stránky (60s)
 * - Kontrola při focus okna
 * - Periodická kontrola (každých 5 minut)
 * - Komunikace mezi taby přes localStorage
 * - Silent fail při chybě síťe
 */

class VersionChecker {
  constructor(options = {}) {
    this.currentHash = this.getBuildHash();
    this.checkInterval = options.checkInterval || 5 * 60 * 1000; // 5 minut
    this.gracePeriod = options.gracePeriod || 60 * 1000; // 60 sekund
    this.ignoreUntil = Date.now() + this.gracePeriod;
    this.notificationShown = false;
    this.isChecking = false;
    this.onUpdateCallback = options.onUpdate || null;
    this.versionEndpoint = options.endpoint || '/dev/eeo-v2/version.json';
    
    // Detekce production/dev prostředí
    if (window.location.pathname.startsWith('/eeo-v2') && !window.location.pathname.includes('/dev/')) {
      this.versionEndpoint = '/eeo-v2/version.json';
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[VersionChecker] Initialized:', {
        currentHash: this.currentHash,
        endpoint: this.versionEndpoint,
        checkInterval: this.checkInterval,
        gracePeriod: this.gracePeriod
      });
    }
  }

  /**
   * Získá aktuální build hash z meta tagu nebo localStorage
   */
  getBuildHash() {
    const metaHash = document.querySelector('meta[name="build-hash"]')?.content;
    const storageHash = localStorage.getItem('app_build_hash');
    
    // Preferuj meta tag (freshest info)
    const hash = metaHash || storageHash;
    
    // Ulož do localStorage pro příští načtení
    if (hash && hash !== storageHash) {
      localStorage.setItem('app_build_hash', hash);
    }
    
    return hash;
  }

  /**
   * Kontrola nové verze na serveru
   */
  async checkForUpdate() {
    // Grace period - nekontroluj hned po načtení
    if (Date.now() < this.ignoreUntil) {
      return;
    }

    // Zabránit souběžným kontrolám
    if (this.isChecking) {
      return;
    }

    // Pokud už byla notifikace zobrazena, nekontroluй znovu
    if (this.notificationShown) {
      return;
    }

    this.isChecking = true;

    try {
      const response = await fetch(`${this.versionEndpoint}?_=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        // Silent fail - server může být dočasně nedostupný
        if (process.env.NODE_ENV === 'development') {
          console.warn('[VersionChecker] Server returned:', response.status);
        }
        return;
      }

      const data = await response.json();

      // Debug info
      if (process.env.NODE_ENV === 'development') {
        console.log('[VersionChecker] Check result:', {
          current: this.currentHash,
          server: data.buildHash,
          changed: data.buildHash !== this.currentHash
        });
      }

      // Detekce změny
      if (this.currentHash && data.buildHash && data.buildHash !== this.currentHash) {
        this.handleUpdateDetected(data);
      }

    } catch (error) {
      // Silent fail - neloguj v produkci, aby nezahlcoval konzoli
      if (process.env.NODE_ENV === 'development') {
        console.warn('[VersionChecker] Check failed:', error.message);
      }
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Zpracování detekované aktualizace
   */
  handleUpdateDetected(versionData) {
    this.notificationShown = true;

    // Broadcast to other tabs
    try {
      localStorage.setItem('app_update_available', JSON.stringify({
        timestamp: Date.now(),
        buildHash: versionData.buildHash,
        buildTime: versionData.buildTime
      }));
    } catch (e) {
      // Ignore localStorage errors
    }

    // Callback pro custom notification systém
    if (this.onUpdateCallback && typeof this.onUpdateCallback === 'function') {
      this.onUpdateCallback(versionData);
    } else {
      // Fallback - použij confirm dialog
      this.showDefaultNotification(versionData);
    }
  }

  /**
   * Výchozí notifikace (fallback)
   */
  showDefaultNotification(versionData) {
    const buildTime = versionData.buildTime 
      ? new Date(versionData.buildTime).toLocaleString('cs-CZ')
      : 'nedávno';

    const message = `Je dostupná nová verze aplikace (${buildTime}).\n\n` +
                    `Doporučujeme obnovit stránku pro zajištění správné funkčnosti.\n\n` +
                    `Obnovit nyní?`;

    if (window.confirm(message)) {
      this.reloadApp();
    }
  }

  /**
   * Hard reload aplikace
   */
  reloadApp() {
    // Hard reload s vyčištěním cache
    window.location.reload(true);
  }

  /**
   * Spuštění automatické kontroly
   */
  start() {
    // Kontrola při focus okna
    window.addEventListener('focus', () => {
      this.checkForUpdate();
    });

    // Periodická kontrola
    this.intervalId = setInterval(() => {
      this.checkForUpdate();
    }, this.checkInterval);

    // Poslech zpráv z jiných tabů
    window.addEventListener('storage', (e) => {
      if (e.key === 'app_update_available' && !this.notificationShown) {
        try {
          const updateInfo = JSON.parse(e.newValue);
          if (updateInfo && updateInfo.buildHash !== this.currentHash) {
            // Jiný tab detekoval update
            this.checkForUpdate();
          }
        } catch (err) {
          // Ignore parse errors
        }
      }
    });

    // První kontrola za grace period
    setTimeout(() => {
      this.checkForUpdate();
    }, this.gracePeriod);

    if (process.env.NODE_ENV === 'development') {
      console.log('[VersionChecker] Started monitoring');
    }
  }

  /**
   * Zastavení monitoringu
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[VersionChecker] Stopped monitoring');
    }
  }

  /**
   * Reset notifikace (pro testování)
   */
  reset() {
    this.notificationShown = false;
    this.ignoreUntil = Date.now();
  }
}

export default VersionChecker;
