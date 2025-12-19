/**
 * QUICK START - Integrace Background Tasks do App.js
 * 
 * Tento soubor obsahuje připravený kód pro rychlé začlenění
 * background tasks systému do vaší hlavní App komponenty.
 */

// ============================================
// 1. IMPORTS - Přidej na začátek App.js
// ============================================

import { useBackgroundTasks } from './hooks/useBackgroundTasks';
import { createStandardTasks } from './services/backgroundTasks';


// ============================================
// 2. HOOK VOLÁNÍ - V těle App komponenty
// ============================================

function App() {
  // ... tvoje existující stavy a hooki

  // Background tasks hook
  const bgTasks = useBackgroundTasks({ 
    trackState: true,      // Pro debugging - vidíš stav úloh
    autoCleanup: true      // Auto cleanup při unmount
  });

  // ... zbytek kódu


// ============================================
// 3. REGISTRACE TASKŮ - V useEffect
// ============================================

  useEffect(() => {
    // Registrace background úloh
    console.log('[App] Registering background tasks...');

    const tasks = createStandardTasks({
      // Callback pro nové notifikace
      onNewNotifications: (data) => {
        console.log('[App] New notifications:', data);
        // TODO: Aktualizuj stav notifikací
        // setNotifications(prev => [...prev, ...data.items]);
        
        // TODO: Zobraz toast
        // toast.info(`Máte ${data.unread} nových notifikací`);
      },

      // Callback pro nové zprávy
      onNewMessages: (data) => {
        console.log('[App] New messages:', data);
        // TODO: Aktualizuj stav zpráv
        // setMessages(prev => [...prev, ...data.conversations]);
        
        // TODO: Zobraz toast
        // toast.info(`Máte ${data.unread} nových zpráv`);
      },

      // Callback pro obnovení objednávek
      onOrdersRefreshed: (data) => {
        console.log('[App] Orders refreshed:', data);
        // TODO: Aktualizuj seznam objednávek
        // if (data && data.orders) {
        //   setOrders(data.orders);
        // }
      }
    });

    // Registrace všech tasků
    tasks.forEach(taskConfig => {
      bgTasks.register(taskConfig);
    });

    console.log('[App] Background tasks registered successfully');

    // Cleanup se provede automaticky při unmount
  }, [bgTasks]); // nebo [] pokud chceš registrovat jen jednou


// ============================================
// 4. HANDLER PRO POST-ORDER-CREATION
// ============================================

  // Volej tuto funkci po úspěšném vytvoření objednávky
  const handleOrderCreatedEvent = () => {
    console.log('[App] Order created - triggering refresh');
    
    // Okamžitý refresh objednávek a kontrola notifikací
    bgTasks.runNow('postOrderCreation');
    
    // NEBO spusť jednotlivé tasky zvlášť:
    // bgTasks.runNow('autoRefreshOrders');
    // bgTasks.runNow('checkNotifications');
  };


// ============================================
// 5. DEBUGGING UI (VOLITELNÉ)
// ============================================

  // Přidej někam do UI pro debugging:
  const renderBackgroundTasksDebug = () => {
    if (process.env.NODE_ENV !== 'development') return null;

    return (
      <div style={{ 
        position: 'fixed', 
        bottom: '10px', 
        right: '10px', 
        background: 'rgba(0,0,0,0.8)', 
        color: 'white', 
        padding: '10px', 
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 9999,
        maxWidth: '300px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
          Background Tasks ({bgTasks.tasks.length})
        </div>
        {bgTasks.tasks.map(task => (
          <div key={task.id} style={{ marginBottom: '3px' }}>
            {task.name}: {task.isRunning ? '⏳' : task.enabled ? '✓' : '✗'}
            {task.lastRun && ` (${new Date(task.lastRun).toLocaleTimeString()})`}
          </div>
        ))}
      </div>
    );
  };


// ============================================
// 6. RENDER - Přidej debug UI
// ============================================

  return (
    <div>
      {/* ... tvoje existující komponenty */}
      
      {/* Debug UI pro vývoj */}
      {renderBackgroundTasksDebug()}
    </div>
  );
}


// ============================================
// 7. ALTERNATIVNÍ ZPŮSOB - Vlastní task
// ============================================

// Pokud chceš vytvořit vlastní task místo standardních:

useEffect(() => {
  const customTaskId = bgTasks.register({
    name: 'myCustomTask',
    interval: 120000, // 2 minuty
    immediate: false,
    enabled: true,
    
    // Podmínka - spouštět jen když je uživatel přihlášen
    condition: () => {
      const token = sessionStorage.getItem('authToken');
      return !!token;
    },
    
    // Callback funkce
    callback: async () => {
      console.log('[CustomTask] Running custom task...');
      
      try {
        // Tvoje logika
        const result = await someApi.checkSomething();
        console.log('[CustomTask] Result:', result);
        
        // Aktualizace stavu
        // setSomeState(result);
        
      } catch (error) {
        console.error('[CustomTask] Error:', error);
        throw error;
      }
    },
    
    // Error handler
    onError: (error) => {
      console.error('[CustomTask] Error handler:', error);
      // toast.error('Custom task failed');
    }
  });

  console.log('[App] Custom task registered:', customTaskId);

  // Cleanup: úloha se automaticky odregistruje při unmount
}, [bgTasks]);


// ============================================
// 8. MANUÁLNÍ TRIGGER Z JINÝCH KOMPONENT
// ============================================

// V jiné komponentě můžeš spustit task takto:

import backgroundTaskService from './services/backgroundTaskService';

const MyOtherComponent = () => {
  const handleRefresh = () => {
    // Okamžité spuštění úlohy
    backgroundTaskService.runTaskNow('checkNotifications');
  };

  return <button onClick={handleRefresh}>Refresh Now</button>;
};


// ============================================
// 9. FULL EXAMPLE - Kompletní App.js
// ============================================

/*
import React, { useState, useEffect } from 'react';
import { useBackgroundTasks } from './hooks/useBackgroundTasks';
import { createStandardTasks } from './services/backgroundTasks';

function App() {
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const bgTasks = useBackgroundTasks({ trackState: true });

  // Registrace background tasks
  useEffect(() => {
    const tasks = createStandardTasks({
      onNewNotifications: (data) => {
        setNotifications(prev => [...prev, ...data.items]);
      },
      onOrdersRefreshed: (data) => {
        if (data?.orders) setOrders(data.orders);
      }
    });

    tasks.forEach(task => bgTasks.register(task));
  }, [bgTasks]);

  // Handler po vytvoření objednávky
  const handleOrderCreated = () => {
    bgTasks.runNow('postOrderCreation');
  };

  return (
    <div>
      <h1>My App</h1>
      
      // Tvoje komponenty
      <OrderForm onCreate={handleOrderCreated} />
      <OrderList orders={orders} />
      <NotificationBadge count={notifications.length} />
      
      // Debug UI (jen pro development)
      {process.env.NODE_ENV === 'development' && (
        <div style={{position: 'fixed', bottom: 10, right: 10}}>
          Tasks: {bgTasks.tasks.length} active
        </div>
      )}
    </div>
  );
}

export default App;
*/


// ============================================
// 10. CHECKLIST - Co udělat dál
// ============================================

/*
  □ Přidat imports do App.js
  □ Přidat useBackgroundTasks hook
  □ Zaregistrovat standardní tasky
  □ Implementovat callbacky (onNewNotifications, atd.)
  □ Přidat handleOrderCreatedEvent handler
  □ Napojit handleOrderCreatedEvent na vytvoření objednávky
  □ Implementovat skutečná API volání v src/services/backgroundTasks.js
  □ Otestovat v console (F12) - měly by běžet logy
  □ Přidat debug UI (volitelné)
  □ Nasadit a sledovat chování
*/

export default null; // Tento soubor je jen dokumentační
