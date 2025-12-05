/**
 * @typedef {Object} TaskConfig
 * @property {string} name - Unikátní název úlohy
 * @property {number} interval - Interval v milisekundách (min. 1000ms)
 * @property {Function} callback - Async funkce, která se má vykonávat
 * @property {boolean} [immediate] - Spustit okamžitě při registraci (default: false)
 * @property {boolean} [enabled] - Je úloha aktivní (default: true)
 * @property {Function} [condition] - Funkce vracející boolean - pokud false, úloha se nespustí
 * @property {Function} [onError] - Error handler pro callback
 */

/**
 * @typedef {Object} TaskInfo
 * @property {string} id - ID úlohy
 * @property {string} name - Název úlohy
 * @property {number} interval - Interval v ms
 * @property {boolean} enabled - Je úloha aktivní
 * @property {boolean} isRunning - Běží úloha právě teď
 * @property {Date|null} lastRun - Čas posledního spuštění
 */

/**
 * @typedef {Object} UseBackgroundTasksOptions
 * @property {boolean} [autoCleanup] - Automaticky čistit úlohy při unmount (default: true)
 * @property {boolean} [trackState] - Sledovat stav úloh a způsobit re-render (default: false)
 */

/**
 * @typedef {Object} BackgroundTasksAPI
 * @property {(config: TaskConfig) => string} register - Registrace nové úlohy
 * @property {(taskId: string) => void} unregister - Odregistrace úlohy
 * @property {(name: string) => void} unregisterByName - Odregistrace úlohy podle názvu
 * @property {(nameOrId: string) => Promise<void>} runNow - Okamžité spuštění úlohy
 * @property {(nameOrId: string, enabled: boolean) => void} setEnabled - Povolení/zakázání úlohy
 * @property {TaskInfo[]} tasks - Seznam všech úloh (pokud trackState: true)
 * @property {(nameOrId: string) => TaskInfo|null} getTaskInfo - Informace o konkrétní úloze
 * @property {(nameOrId: string) => boolean} isTaskRunning - Běží úloha?
 * @property {BackgroundTaskService} service - Přímý přístup k service
 */

/**
 * @typedef {Object} BackgroundTaskAPI
 * @property {boolean} isRunning - Běží úloha právě teď
 * @property {Date|null} lastRun - Čas posledního spuštění
 * @property {boolean} enabled - Je úloha aktivní
 * @property {() => Promise<void>} runNow - Okamžité spuštění
 * @property {(enabled: boolean) => void} setEnabled - Povolení/zakázání
 * @property {string|null} taskId - ID úlohy
 */

/**
 * @typedef {Object} TaskCallbacks
 * @property {(data: any) => void} [onNewNotifications] - Callback pro nové notifikace
 * @property {(data: any) => void} [onNewMessages] - Callback pro nové zprávy
 * @property {(data: any) => void} [onOrdersRefreshed] - Callback pro obnovené objednávky
 */

export {};
