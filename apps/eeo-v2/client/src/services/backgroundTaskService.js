/**
 * Background Task Service
 * Centralizovaná služba pro správu background úloh a intervalů
 *
 * Podporuje:
 * - Registrace úloh s intervalovým spouštěním
 * - Dynamické přidávání/odebírání úloh
 * - Okamžité spuštění úlohy (mimo interval)
 * - Automatické čištění při unmount
 * - Podmíněné spouštění (např. pouze když je uživatel přihlášen)
 *
 * Příklad použití:
 * ```javascript
 * // Registrace úlohy
 * const taskId = backgroundTaskService.registerTask({
 *   name: 'checkNotifications',
 *   interval: 60000, // 60 sekund
 *   callback: async () => { ... },
 *   immediate: true, // Spustit okamžitě při registraci
 *   enabled: true
 * });
 *
 * // Zrušení úlohy
 * backgroundTaskService.unregisterTask(taskId);
 *
 * // Okamžité spuštění
 * backgroundTaskService.runTaskNow('checkNotifications');
 * ```
 */

class BackgroundTaskService {
  constructor() {
    // Mapa registrovaných úloh: { taskId: { config, intervalId, lastRun, isRunning } }
    this.tasks = new Map();

    // Počítadlo pro generování unikátních ID
    this.taskIdCounter = 0;

    // Globální enable/disable flag
    this.enabled = true;

    // Listeners pro změny stavu
    this.listeners = new Set();
  }

  /**
   * Registrace nové background úlohy
   * @param {Object} config - Konfigurace úlohy
   * @param {string} config.name - Název úlohy (unikátní identifikátor)
   * @param {number} config.interval - Interval v milisekundách
   * @param {Function} config.callback - Async funkce, která se má spouštět
   * @param {boolean} [config.immediate=false] - Spustit okamžitě při registraci
   * @param {boolean} [config.enabled=true] - Je úloha aktivní
   * @param {Function} [config.condition] - Funkce vracející boolean - pokud false, úloha se nespustí
   * @param {Function} [config.onError] - Error handler pro callback
   * @returns {string} - ID registrované úlohy
   */
  registerTask(config) {
    const {
      name,
      interval,
      callback,
      immediate = false,
      enabled = true,
      condition = () => true,
      onError = (error) => console.error(`[BackgroundTask] Error in "${name}":`, error)
    } = config;

    // Validace
    if (!name || typeof name !== 'string') {
      throw new Error('Task name is required and must be a string');
    }
    if (!interval || interval < 1000) {
      throw new Error('Interval must be at least 1000ms (1 second)');
    }
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    // Kontrola duplicity názvu
    const existingTask = Array.from(this.tasks.values()).find(t => t.config.name === name);
    if (existingTask) {
      this.unregisterTask(existingTask.taskId);
    }

    // Generování ID
    const taskId = `task_${++this.taskIdCounter}_${name}`;

    // Wrapper pro callback s error handlingem a podmínkou
    const wrappedCallback = async () => {
      const task = this.tasks.get(taskId);
      if (!task || !task.config.enabled || !this.enabled) {
        return;
      }

      // Kontrola podmínky
      if (task.config.condition && !task.config.condition()) {
        return;
      }

      // Prevence paralelního spouštění
      if (task.isRunning) {
        return;
      }

      try {
        task.isRunning = true;
        task.lastRun = new Date();
        this._notifyListeners();

        await callback();

      } catch (error) {
        if (task.config.onError) {
          task.config.onError(error);
        }
      } finally {
        if (task) {
          task.isRunning = false;
          this._notifyListeners();
        }
      }
    };

    // Uložení úlohy
    const task = {
      taskId,
      config: {
        name,
        interval,
        callback,
        enabled,
        condition,
        onError
      },
      intervalId: null,
      lastRun: null,
      isRunning: false
    };

    this.tasks.set(taskId, task);

    // Spuštění intervalu
    if (enabled) {
      task.intervalId = setInterval(wrappedCallback, interval);

      // Okamžité spuštění, pokud je požadováno
      if (immediate) {
        wrappedCallback();
      }
    }

    this._notifyListeners();

    return taskId;
  }

  /**
   * Zrušení registrace úlohy
   * @param {string} taskId - ID úlohy k zrušení
   */
  unregisterTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    if (task.intervalId) {
      clearInterval(task.intervalId);
    }

    this.tasks.delete(taskId);
    this._notifyListeners();
  }

  /**
   * Zrušení úlohy podle názvu
   * @param {string} name - Název úlohy
   */
  unregisterTaskByName(name) {
    const task = Array.from(this.tasks.values()).find(t => t.config.name === name);
    if (task) {
      this.unregisterTask(task.taskId);
    }
  }

  /**
   * Okamžité spuštění úlohy (mimo interval)
   * @param {string} nameOrId - Název nebo ID úlohy
   */
  async runTaskNow(nameOrId) {
    const task = this.tasks.get(nameOrId) ||
                 Array.from(this.tasks.values()).find(t => t.config.name === nameOrId);

    if (!task) {
      return;
    }

    if (task.isRunning) {
      return;
    }

    // Debug logs removed for performance

    // Spuštění callback
    try {
      task.isRunning = true;
      task.lastRun = new Date();
      this._notifyListeners();

      await task.config.callback();
      // Debug logs removed for performance

    } catch (error) {
      if (task.config.onError) {
        task.config.onError(error);
      }
    } finally {
      task.isRunning = false;
      this._notifyListeners();
    }
  }

  /**
   * Povolení/zakázání konkrétní úlohy
   * @param {string} nameOrId - Název nebo ID úlohy
   * @param {boolean} enabled - Nový stav
   */
  setTaskEnabled(nameOrId, enabled) {
    const task = this.tasks.get(nameOrId) ||
                 Array.from(this.tasks.values()).find(t => t.config.name === nameOrId);

    if (!task) {
      return;
    }

    task.config.enabled = enabled;

    if (enabled && !task.intervalId) {
      // Znovu spustit interval
      const wrappedCallback = async () => {
        if (!task.config.enabled || !this.enabled) return;
        if (task.config.condition && !task.config.condition()) return;
        if (task.isRunning) return;

        try {
          task.isRunning = true;
          task.lastRun = new Date();
          this._notifyListeners();
          await task.config.callback();
        } catch (error) {
          if (task.config.onError) {
            task.config.onError(error);
          }
        } finally {
          task.isRunning = false;
          this._notifyListeners();
        }
      };

      task.intervalId = setInterval(wrappedCallback, task.config.interval);

    } else if (!enabled && task.intervalId) {
      // Zastavit interval
      clearInterval(task.intervalId);
      task.intervalId = null;
    }

    this._notifyListeners();
  }

  /**
   * Globální povolení/zakázání všech úloh
   * @param {boolean} enabled - Nový stav
   */
  setGlobalEnabled(enabled) {
    this.enabled = enabled;
    this._notifyListeners();
  }

  /**
   * Získání informací o všech úlohách
   * @returns {Array} - Seznam úloh s jejich stavem
   */
  getTasksInfo() {
    return Array.from(this.tasks.values()).map(task => ({
      id: task.taskId,
      name: task.config.name,
      interval: task.config.interval,
      enabled: task.config.enabled,
      isRunning: task.isRunning,
      lastRun: task.lastRun
    }));
  }

  /**
   * Zrušení všech úloh (cleanup)
   */
  unregisterAll() {
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.intervalId) {
        clearInterval(task.intervalId);
      }
    }

    this.tasks.clear();
    this._notifyListeners();
  }

  /**
   * Přidání listeneru pro změny stavu
   * @param {Function} listener - Callback funkce
   * @returns {Function} - Funkce pro odstranění listeneru
   */
  addListener(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notifikace listenerů o změně stavu
   * @private
   */
  _notifyListeners() {
    const info = this.getTasksInfo();
    this.listeners.forEach(listener => {
      try {
        listener(info);
      } catch (error) {
      }
    });
  }
}

// Singleton instance
const backgroundTaskService = new BackgroundTaskService();

// Expozice do window pro debugging v development režimu
if (process.env.NODE_ENV === 'development') {
  window.__BACKGROUND_TASK_SERVICE__ = backgroundTaskService;
}

export default backgroundTaskService;
