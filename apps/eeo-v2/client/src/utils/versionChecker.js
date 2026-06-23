/**
 * Version Checker Utility
 * 
 * Automaticky detekuje novou verzi aplikace pomocí build hash.
 * Při detekci nové verze zobrazí notifikaci a umožní reload.
 * 
 * Features:
 * - Build hash based detection (spolehlivější než manuální verze)
 * - Grace period po načtení stránky (2 minuty)
 * - Kontrola při focus okna (debounced - max 1× za 10 minut)
 * - Periodická kontrola (každých 10 minut)
 * - Leader election (pouze jeden tab dělá polling)
 * - Komunikace mezi taby přes localStorage
 * - Silent fail při chybě síťe
 * 
 * OPTIMALIZACE 2026-06-23:
 * - Interval zvýšen z 5 na 10 minut (snížení traffic o 50%)
 * - Focus debounce (eliminace spamu při přepínání tabů)
 * - Leader election (jen 1 tab polling místo N tabů)
 * - Expected: snížení requestů z ~30k/den na ~200/den (99% úspora)
 */

class VersionChecker {
  constructor(options = {}) {
    this.currentHash = this.getBuildHash();
    this.checkInterval = options.checkInterval || 30 * 60 * 1000; // 30 minut (bylo 10 min)
    this.gracePeriod = options.gracePeriod || 2 * 60 * 1000; // 2 minuty (bylo 60s)
    this.focusDebounceInterval = 30 * 60 * 1000; // Focus check max 1× za 30 minut
    this.ignoreUntil = Date.now() + this.gracePeriod;
    this.lastFocusCheck = 0; // Timestamp poslední focus kontroly
    this.notificationShown = false;
    this.isChecking = false;
    this.isLeader = false; // Leader election flag
    this.leaderCheckInterval = null;
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

    // Ulož nový hash do localStorage pro příští reload
    localStorage.setItem('app_build_hash', versionData.buildHash);

    // Broadcast to other tabs
    try {
      localStorage.setItem('app_update_available', JSON.stringify({
        timestamp: Date.now(),
        buildHash: versionData.buildHash,
        buildTime: versionData.buildTime,
        version: versionData.version
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

    const displayVersion = versionData.version || process.env.REACT_APP_VERSION || 'N/A';
    const message = `Je dostupná nová verze aplikace ${displayVersion} (${buildTime}).\n\n` +
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
    // Před reloadem smaž localStorage hash, aby se po načtení vzal čerstvý z meta tagu
    localStorage.removeItem('app_build_hash');
    
    // Hard reload s vyčištěním cache
    window.location.reload(true);
  }

  /**
   * Leader election - pouze jeden tab dělá periodický polling
   */
  becomeLeader() {
    this.isLeader = true;
    localStorage.setItem('version_checker_leader', JSON.stringify({
      tabId: this.tabId,
      timestamp: Date.now()
    }));
    
    // Periodická kontrola (pouze leader)
    this.intervalId = setInterval(() => {
      if (this.isLeader) {
        this.checkForUpdate();
      }
    }, this.checkInterval);

    if (process.env.NODE_ENV === 'development') {
      console.log('[VersionChecker] Became leader tab');
    }
  }

  /**
   * Kontrola a údržba leader statusu
   */
  checkLeaderStatus() {
    try {
      const leaderData = JSON.parse(localStorage.getItem('version_checker_leader'));
      const now = Date.now();
      
      // Pokud žádný leader nebo starý (60s), staň se leaderem
      if (!leaderData || (now - leaderData.timestamp) > 60000) {
        if (!this.isLeader) {
          this.becomeLeader();
        }
      } else if (leaderData.tabId === this.tabId) {
        // Jsme leader - update timestamp
        localStorage.setItem('version_checker_leader', JSON.stringify({
          tabId: this.tabId,
          timestamp: now
        }));
      } else {
        // Jiný tab je leader
        this.isLeader = false;
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
      }
    } catch (e) {
      // Fallback - staň se leaderem
      if (!this.isLeader) {
        this.becomeLeader();
      }
    }
  }

  /**
   * Spuštění automatické kontroly
   */
  start() {
    // Unikátní ID pro tento tab
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Kontrola při focus okna (DEBOUNCED - max 1× za 10 minut)
    window.addEventListener('focus', () => {
      const now = Date.now();
      
      // Debounce - ignoruj focus pokud byl check nedávno
      if (now - this.lastFocusCheck < this.focusDebounceInterval) {
        if (process.env.NODE_ENV === 'development') {
          const waitTime = Math.round((this.focusDebounceInterval - (now - this.lastFocusCheck)) / 1000);
          console.log(`[VersionChecker] Focus ignored - next check in ${waitTime}s`);
        }
        return;
      }
      
      this.lastFocusCheck = now;
      this.checkForUpdate();
    });

    // Leader election - pokus o získání leadership
    this.checkLeaderStatus();
    
    // Periodická kontrola leader statusu (každých 30s)
    this.leaderCheckInterval = setInterval(() => {
      this.checkLeaderStatus();
    }, 30000);

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

    if (this.leaderCheckInterval) {
      clearInterval(this.leaderCheckInterval);
      this.leaderCheckInterval = null;
    }

    // Pokud jsme byli leader, uvolni leadership
    if (this.isLeader) {
      try {
        const leaderData = JSON.parse(localStorage.getItem('version_checker_leader'));
        if (leaderData && leaderData.tabId === this.tabId) {
          localStorage.removeItem('version_checker_leader');
        }
      } catch (e) {
        // Ignore
      }
      this.isLeader = false;
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
