import { useEffect, useRef, useState, useCallback } from 'react';
import backgroundTaskService from '../services/backgroundTaskService';

/**
 * React Hook pro správu background úloh
 *
 * Poskytuje:
 * - Automatickou registraci/odregistraci úloh při mount/unmount
 * - Aktuální stav všech úloh
 * - Metody pro kontrolu a ovládání úloh
 *
 * @param {Object} options - Konfigurace hooku
 * @param {boolean} [options.autoCleanup=true] - Automaticky čistit úlohy při unmount
 * @param {boolean} [options.trackState=false] - Sledovat stav úloh (re-render při změnách)
 * @returns {Object} - API pro práci s background úlohami
 *
 * @example
 * ```javascript
 * function MyComponent() {
 *   const bgTasks = useBackgroundTasks({ trackState: true });
 *
 *   useEffect(() => {
 *     // Registrace úlohy při mountu
 *     const taskId = bgTasks.register({
 *       name: 'checkNotifications',
 *       interval: 60000,
 *       callback: async () => {
 *         const notifications = await api.checkNotifications();
 *         setNotifications(notifications);
 *       },
 *       immediate: true
 *     });
 *
 *     // Úloha se automaticky odregistruje při unmount
 *   }, []);
 *
 *   // Okamžité spuštění
 *   const handleRefresh = () => {
 *     bgTasks.runNow('checkNotifications');
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleRefresh}>Refresh Now</button>
 *       <p>Active tasks: {bgTasks.tasks.length}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export const useBackgroundTasks = (options = {}) => {
  const {
    autoCleanup = true,
    trackState = false
  } = options;

  // Reference na registrované task IDs pro cleanup
  const taskIdsRef = useRef(new Set());

  // Stav úloh (pokud je trackState aktivní)
  const [tasks, setTasks] = useState([]);

  // Listener pro změny stavu
  useEffect(() => {
    if (!trackState) return;

    const unsubscribe = backgroundTaskService.addListener((tasksInfo) => {
      setTasks(tasksInfo);
    });

    // Iniciální načtení
    setTasks(backgroundTaskService.getTasksInfo());

    return unsubscribe;
  }, [trackState]);

  // Cleanup při unmount
  useEffect(() => {
    return () => {
      if (autoCleanup && taskIdsRef.current.size > 0) {
        taskIdsRef.current.forEach(taskId => {
          backgroundTaskService.unregisterTask(taskId);
        });
        taskIdsRef.current.clear();
      }
    };
  }, [autoCleanup]);

  /**
   * Registrace nové úlohy
   * @param {Object} config - Konfigurace úlohy (viz backgroundTaskService.registerTask)
   * @returns {string} - ID úlohy
   */
  const register = useCallback((config) => {
    const taskId = backgroundTaskService.registerTask(config);
    taskIdsRef.current.add(taskId);
    return taskId;
  }, []);

  /**
   * Odregistrace úlohy
   * @param {string} taskId - ID úlohy
   */
  const unregister = useCallback((taskId) => {
    backgroundTaskService.unregisterTask(taskId);
    taskIdsRef.current.delete(taskId);
  }, []);

  /**
   * Odregistrace úlohy podle názvu
   * @param {string} name - Název úlohy
   */
  const unregisterByName = useCallback((name) => {
    const task = tasks.find(t => t.name === name);
    if (task) {
      unregister(task.id);
    }
  }, [tasks, unregister]);

  /**
   * Okamžité spuštění úlohy
   * @param {string} nameOrId - Název nebo ID úlohy
   */
  const runNow = useCallback(async (nameOrId) => {
    await backgroundTaskService.runTaskNow(nameOrId);
  }, []);

  /**
   * Povolení/zakázání úlohy
   * @param {string} nameOrId - Název nebo ID úlohy
   * @param {boolean} enabled - Nový stav
   */
  const setEnabled = useCallback((nameOrId, enabled) => {
    backgroundTaskService.setTaskEnabled(nameOrId, enabled);
  }, []);

  /**
   * Získání informace o konkrétní úloze
   * @param {string} nameOrId - Název nebo ID úlohy
   * @returns {Object|null} - Informace o úloze
   */
  const getTaskInfo = useCallback((nameOrId) => {
    return tasks.find(t => t.id === nameOrId || t.name === nameOrId) || null;
  }, [tasks]);

  /**
   * Kontrola, zda úloha běží
   * @param {string} nameOrId - Název nebo ID úlohy
   * @returns {boolean}
   */
  const isTaskRunning = useCallback((nameOrId) => {
    const task = getTaskInfo(nameOrId);
    return task ? task.isRunning : false;
  }, [getTaskInfo]);

  return {
    // Metody pro správu úloh
    register,
    unregister,
    unregisterByName,
    runNow,
    setEnabled,

    // Informace o úlohách
    tasks,
    getTaskInfo,
    isTaskRunning,

    // Přímý přístup k service (pro pokročilé případy)
    service: backgroundTaskService
  };
};

/**
 * Helper hook pro jednodušší registraci jedné úlohy
 * Úloha se automaticky registruje při mount a odregistruje při unmount
 *
 * @param {Object} config - Konfigurace úlohy
 * @param {Array} deps - Dependency array pro re-registraci úlohy
 * @returns {Object} - Kontrolní API pro úlohu
 *
 * @example
 * ```javascript
 * function NotificationChecker() {
 *   const notificationTask = useBackgroundTask({
 *     name: 'checkNotifications',
 *     interval: 60000,
 *     callback: async () => {
 *       await checkNotifications();
 *     },
 *     immediate: true
 *   });
 *
 *   return (
 *     <button onClick={notificationTask.runNow}>
 *       Check Now (Last: {notificationTask.lastRun})
 *     </button>
 *   );
 * }
 * ```
 */
export const useBackgroundTask = (config, deps = []) => {
  const taskIdRef = useRef(null);
  const [taskState, setTaskState] = useState({
    isRunning: false,
    lastRun: null,
    enabled: true
  });

  // Listener pro změny stavu této konkrétní úlohy
  useEffect(() => {
    const unsubscribe = backgroundTaskService.addListener((tasksInfo) => {
      if (taskIdRef.current) {
        const task = tasksInfo.find(t => t.id === taskIdRef.current);
        if (task) {
          setTaskState({
            isRunning: task.isRunning,
            lastRun: task.lastRun,
            enabled: task.enabled
          });
        }
      }
    });

    return unsubscribe;
  }, []);

  // Registrace/re-registrace úlohy
  useEffect(() => {
    // Registrace
    taskIdRef.current = backgroundTaskService.registerTask(config);

    // Cleanup při unmount nebo re-registraci
    return () => {
      if (taskIdRef.current) {
        backgroundTaskService.unregisterTask(taskIdRef.current);
        taskIdRef.current = null;
      }
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  // API pro kontrolu úlohy
  const runNow = useCallback(async () => {
    if (taskIdRef.current) {
      await backgroundTaskService.runTaskNow(taskIdRef.current);
    }
  }, []);

  const setEnabled = useCallback((enabled) => {
    if (taskIdRef.current) {
      backgroundTaskService.setTaskEnabled(taskIdRef.current, enabled);
    }
  }, []);

  return {
    ...taskState,
    runNow,
    setEnabled,
    taskId: taskIdRef.current
  };
};

export default useBackgroundTasks;
