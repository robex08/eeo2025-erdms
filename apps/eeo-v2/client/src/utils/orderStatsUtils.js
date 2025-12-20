/**
 * 🎯 SPOLEČNÉ UTILITY PRO VÝPOČET STATISTIK OBJEDNÁVEK
 * 
 * Sdíleno mezi Desktop (Orders25List.js) a Mobile (mobileDataService.js)
 * aby měly obě verze IDENTICKÉ výsledky.
 */

/**
 * Mapování uživatelsky přívětivých názvů stavů na systémové kódy
 */
function mapUserStatusToSystemCode(userStatus) {
  // Kontrola na začátek textu pro různé varianty
  if (userStatus && typeof userStatus === 'string') {
    if (userStatus.startsWith('Zamítnut')) return 'ZAMITNUTA';
    if (userStatus.startsWith('Schválen')) return 'SCHVALENA';
    if (userStatus.startsWith('Dokončen')) return 'DOKONCENA';
    if (userStatus.startsWith('Zrušen')) return 'ZRUSENA';
    if (userStatus.startsWith('Archivován')) return 'ARCHIVOVANO';
  }
  
  const mapping = {
    'Ke schválení': 'KE_SCHVALENI',
    'Nová': 'NOVA',
    'Rozpracovaná': 'ROZPRACOVANA',
    'Odeslaná dodavateli': 'ODESLANA',
    'Potvrzená dodavatelem': 'POTVRZENA',
    'Má být zveřejněna': 'K_UVEREJNENI_DO_REGISTRU',
    'Uveřejněná': 'UVEREJNENA',
    'Čeká na potvrzení': 'CEKA_POTVRZENI',
    'Čeká se': 'CEKA_SE',
    'Věcná správnost': 'VECNA_SPRAVNOST',
    'Smazaná': 'SMAZANA',
    'Koncept': 'NOVA'
  };
  return mapping[userStatus] || userStatus;
}

/**
 * Vrací systémový stav objednávky (PŘESNĚ PODLE ORDERS25LIST)
 */
export function getOrderSystemStatus(order) {
  // Speciální případ pro koncepty
  if (order.isDraft || order.je_koncept) {
    return 'NOVA';
  }

  // Získej základní systémový stav
  let systemStatus;

  // ✅ PRIORITA 1: Pokud máme uživatelsky přívětivý stav, zmapuj na systémový kód
  if (order.stav_objednavky) {
    systemStatus = mapUserStatusToSystemCode(order.stav_objednavky);
  }
  // PRIORITA 2: Fallback na poslední stav z stav_workflow_kod
  else if (order.stav_workflow_kod) {
    try {
      const workflowStates = Array.isArray(order.stav_workflow_kod)
        ? order.stav_workflow_kod
        : JSON.parse(order.stav_workflow_kod);
      systemStatus = Array.isArray(workflowStates) 
        ? workflowStates[workflowStates.length - 1] 
        : order.stav_workflow_kod;
    } catch {
      systemStatus = order.stav_workflow_kod;
    }
  }
  else {
    systemStatus = 'DRAFT';
  }

  // 🔍 SPECIÁLNÍ LOGIKA PRO UVEŘEJNĚNÍ V REGISTRU SMLUV
  // Kontroluj data o publikaci - má přednost před obecným stavem
  if (order.registr_smluv || order.stav_workflow_kod) {
    const registr = order.registr_smluv || {};
    
    // 1. UVEREJNENA: Pokud má dt_zverejneni A registr_iddt -> byla zveřejněna
    if (registr.dt_zverejneni && registr.registr_iddt) {
      return 'UVEREJNENA';
    }
    
    // Získej workflow status pro kontrolu UVEREJNIT
    let workflowStatus = null;
    if (order.stav_workflow_kod) {
      try {
        let workflowStates = [];
        if (Array.isArray(order.stav_workflow_kod)) {
          workflowStates = order.stav_workflow_kod;
        } else if (typeof order.stav_workflow_kod === 'string') {
          workflowStates = JSON.parse(order.stav_workflow_kod);
          if (!Array.isArray(workflowStates)) {
            workflowStates = [];
          }
        }
        if (workflowStates.length > 0) {
          const lastState = workflowStates[workflowStates.length - 1];
          workflowStatus = typeof lastState === 'object' ? lastState.kod_stavu : lastState;
        }
      } catch (e) {
        // Pokud parsing selže, ignoruj
      }
    }
    
    // 2. K_UVEREJNENI_DO_REGISTRU: Pokud má být zveřejněna (3 podmínky):
    // a) workflow status je UVEREJNIT
    // b) registr.zverejnit === 'ANO'
    // c) registr.ma_byt_zverejnena === true/1
    const maZverejnit = workflowStatus === 'UVEREJNIT' || 
                        registr.zverejnit === 'ANO' || 
                        registr.ma_byt_zverejnena === true ||
                        registr.ma_byt_zverejnena === 1 ||
                        registr.ma_byt_zverejnena === '1';
    
    if (maZverejnit && !registr.registr_iddt) {
      return 'K_UVEREJNENI_DO_REGISTRU';
    }
  }

  return systemStatus;
}

/**
 * Vypočítá celkovou cenu objednávky s DPH (PŘESNĚ PODLE ORDERS25LIST)
 * Priority: 1) faktury, 2) položky, 3) max_cena_s_dph
 */
export function getOrderTotalPriceWithDPH(order) {
  // 1. PRIORITA: Faktury (pokud existují) - skutečně utracené peníze
  if (order.faktury_celkova_castka_s_dph != null && order.faktury_celkova_castka_s_dph !== '') {
    const value = parseFloat(order.faktury_celkova_castka_s_dph);
    if (!isNaN(value) && value > 0) return value;
  }
  
  // 2. PRIORITA: Položky - objednané ale ještě nefakturované
  if (order.polozky_celkova_cena_s_dph != null && order.polozky_celkova_cena_s_dph !== '') {
    const value = parseFloat(order.polozky_celkova_cena_s_dph);
    if (!isNaN(value) && value > 0) return value;
  }
  
  // Spočítej z položek jako fallback
  if (order.polozky && Array.isArray(order.polozky) && order.polozky.length > 0) {
    const total = order.polozky.reduce((sum, item) => {
      const cena = parseFloat(item.cena_s_dph || 0);
      return sum + (isNaN(cena) ? 0 : cena);
    }, 0);
    if (total > 0) return total;
  }

  // 3. PRIORITA: Max cena ke schválení - schválený limit
  if (order.max_cena_s_dph != null && order.max_cena_s_dph !== '') {
    const value = parseFloat(order.max_cena_s_dph);
    if (!isNaN(value) && value > 0) return value;
  }

  return 0;
}

/**
 * Vyfiltruje objednávky podle základních pravidel (společné pro desktop i mobil)
 * @param {Array} orders - Seznam objednávek z API
 * @param {Object} options - Možnosti filtrování
 * @returns {Array} Vyfiltrované objednávky
 */
export function filterOrders(orders, options = {}) {
  const {
    showArchived = false,     // Zobrazit archivované?
    userId = null,            // ID uživatele pro filtrování podle příkazce
    isAdmin = false           // Je uživatel admin? (admin vidí všechny)
  } = options;

  console.log('[filterOrders] Input:', orders.length, 'orders, options:', options);
  
  // 🔍 KOMPLETNÍ SEZNAM ID PŘED FILTROVÁNÍM
  const allIds = orders.map(o => o.id).sort((a, b) => a - b);
  
  // 💾 ULOŽ DO WINDOW PRO DEBUGGING
  if (typeof window !== 'undefined') {
    if (!window.DEBUG_ORDER_IDS) window.DEBUG_ORDER_IDS = {};
    const source = userId === null && isAdmin ? 'DESKTOP' : 'MOBILE';
    window.DEBUG_ORDER_IDS[source] = allIds;
    console.log(`[filterOrders] 💾 Saved ${allIds.length} IDs to window.DEBUG_ORDER_IDS.${source}`);
  }
  
  console.log('[filterOrders] 📋 ALL IDs before filtering:', allIds);
  console.log('[filterOrders] 📋 First 5 order IDs:', orders.slice(0, 5).map(o => o.id));

  // 1. Základní filtrování: ID > 1 (systémová obj) a !isLocalConcept
  let filtered = orders.filter(o => o.id && o.id > 1 && !o.isLocalConcept);
  console.log('[filterOrders] After id>1 and !isLocalConcept:', filtered.length);
  console.log('[filterOrders] Removed by id<=1:', orders.filter(o => !o.id || o.id <= 1).map(o => o.id));
  console.log('[filterOrders] Removed by isLocalConcept:', orders.filter(o => o.isLocalConcept).map(o => o.id));

  // 2. Archivované objednávky
  if (!showArchived) {
    const beforeArchive = filtered.length;
    const archivedOrders = [];
    filtered = filtered.filter(o => {
      const status = getOrderSystemStatus(o);
      const isArchived = status === 'ARCHIVOVANO';
      if (isArchived) archivedOrders.push({ id: o.id, status });
      return !isArchived;
    });
    console.log('[filterOrders] After archive filter:', filtered.length, '(removed:', beforeArchive - filtered.length, ')');
    if (archivedOrders.length > 0) {
      console.log('[filterOrders] Archived order IDs:', archivedOrders.map(o => o.id));
    }
  }

  // 3. Filtrování podle příkazce (pouze pro non-admin)
  if (!isAdmin && userId) {
    const beforeUser = filtered.length;
    const nonMatchingOrders = [];
    filtered = filtered.filter(o => {
      const matches = o.prikazce_id === userId;
      if (!matches) nonMatchingOrders.push({ id: o.id, prikazce_id: o.prikazce_id });
      return matches;
    });
    console.log('[filterOrders] After user filter (prikazce_id):', filtered.length, '(removed:', beforeUser - filtered.length, ')');
    if (nonMatchingOrders.length > 0 && nonMatchingOrders.length < 10) {
      console.log('[filterOrders] Non-matching prikazce_id (first 10):', nonMatchingOrders.slice(0, 10));
    }
  }

  // 🔍 KOMPLETNÍ SEZNAM ID PO FILTROVÁNÍ
  const finalIds = filtered.map(o => o.id).sort((a, b) => a - b);
  console.log('[filterOrders] 📋 FINAL IDs after filtering:', finalIds);
  console.log('[filterOrders] Final order IDs (first 10):', filtered.slice(0, 10).map(o => o.id));
  console.log('[filterOrders] Final count:', filtered.length);

  return filtered;
}

/**
 * Vypočítá statistiky ze seznamu objednávek (společné pro desktop i mobil)
 * @param {Array} orders - Seznam VYFILTROVANÝCH objednávek
 * @returns {Object} Statistiky ve formátu { total, byStatus, totalAmount, ... }
 */
export function calculateOrderStats(orders) {
  console.log('[calculateOrderStats] Calculating stats for', orders.length, 'orders');

  const total = orders.length;
  
  // Počty podle stavů
  const byStatus = orders.reduce((acc, order) => {
    const systemStatus = getOrderSystemStatus(order);
    acc[systemStatus] = (acc[systemStatus] || 0) + 1;
    return acc;
  }, {});

  // Celková částka
  const totalAmount = orders.reduce((sum, order) => {
    const amount = getOrderTotalPriceWithDPH(order);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  // Částka dokončených objednávek
  const completedAmount = orders.reduce((sum, order) => {
    const status = getOrderSystemStatus(order);
    const isCompleted = ['DOKONCENA', 'VYRIZENA', 'COMPLETED'].includes(status);
    if (isCompleted) {
      const amount = getOrderTotalPriceWithDPH(order);
      return sum + (isNaN(amount) ? 0 : amount);
    }
    return sum;
  }, 0);

  const pendingAmount = totalAmount - completedAmount;

  console.log('[calculateOrderStats] Results:', {
    total,
    totalAmount,
    completedAmount,
    pendingAmount,
    byStatus
  });

  return {
    total,
    byStatus,
    totalAmount,
    completedAmount,
    pendingAmount
  };
}
