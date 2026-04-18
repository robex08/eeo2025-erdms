/**
 * Utility pro triggerování dashboard refresh po změnách v objednávkách/fakturách
 * Datum: 2026-04-18
 * 
 * Používá localStorage event pro cross-tab komunikaci - funguje i když je dashboard
 * v jiné záložce nebo v externím okně.
 * 
 * Použití:
 * import { triggerDashboardRefresh } from '../utils/dashboardRefresh';
 * 
 * // Po úspěšném schválení/editaci/zrušení objednávky/faktury:
 * triggerDashboardRefresh('order-approved');
 */

/**
 * Triggeruje refresh dashboardu po změně v objednávkách/fakturách
 * @param {string} reason - Důvod refreshe (pro debugging): 'order-approved', 'invoice-approved', 'order-cancelled', etc.
 */
export function triggerDashboardRefresh(reason = 'unknown') {
  try {
    console.log(`🔄 Dashboard Refresh Trigger: ${reason}`);
    
    // Pro storage event potřebujeme změnu hodnoty
    const timestamp = Date.now();
    localStorage.setItem('dashboardRefreshTrigger', JSON.stringify({
      reason,
      timestamp
    }));
    
    // Pro případ, že jsme ve stejném okně jako dashboard (storage event nefunguje pro stejné okno)
    if (window.dashboardAPI && typeof window.dashboardAPI.refreshData === 'function') {
      console.log('🔄 Volám přímý refresh dashboardu (stejné okno)');
      window.dashboardAPI.refreshData();
    }
    
  } catch (error) {
    console.error('❌ Chyba při triggerování dashboard refresh:', error);
  }
}

/**
 * Zkontroluje, zda je dashboard načtený a připravený k refreshi
 * @returns {boolean}
 */
export function isDashboardReady() {
  return !!(window.dashboardAPI && typeof window.dashboardAPI.refreshData === 'function');
}

/**
 * Pomocná funkce pro debug - vylistuje všechny dashboard API funkce
 */
export function debugDashboardAPI() {
  console.log('🔍 Dashboard API:', window.dashboardAPI);
}
