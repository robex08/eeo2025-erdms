/**
 * useOrdersV3.js
 * 
 * Custom hook pro Orders V3 - komplexní state management
 * Centralizovaná logika pro načítání dat, filtrování, pagination a caching
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  listOrdersV3,
  toggleOrderCheck,
  getOrdersChecks,
  loadOrderComments,
  addOrderComment,
  deleteOrderComment
} from '../../services/apiOrdersV3';
import { getOrderInvoicesV3 } from '../../services/apiOrderV3'; // ✅ Import faktur API
import useOrdersV3State from './useOrdersV3State';
import useOrdersV3Data from './useOrdersV3Data';
import ORDERS_V3_CONFIG from '../../constants/ordersV3Config';

/**
 * Vypočítá celkovou cenu objednávky s DPH podle priority
 * STEJNÁ LOGIKA JAKO V ORDERS25LIST!
 * 1. PRIORITA: Faktury - skutečně utracené peníze
 * 2. PRIORITA: Položky - objednané ale nefakturované 
 * 3. PRIORITA: Max cena ke schválení - schválený limit
 */
function getOrderTotalPriceWithDPH(order) {
  // 1. PRIORITA: Faktury
  if (order.faktury_celkova_castka_s_dph != null && order.faktury_celkova_castka_s_dph !== '') {
    const value = parseFloat(order.faktury_celkova_castka_s_dph);
    if (!isNaN(value) && value > 0) return value;
  }
  
  // 2. PRIORITA: Položky
  if (order.cena_s_dph != null && order.cena_s_dph !== '') {
    const value = parseFloat(order.cena_s_dph);
    if (!isNaN(value) && value > 0) return value;
  }
  
  // 3. PRIORITA: Max cena ke schválení
  if (order.max_cena_s_dph != null && order.max_cena_s_dph !== '') {
    const value = parseFloat(order.max_cena_s_dph);
    if (!isNaN(value) && value > 0) return value;
  }
  
  return 0;
}

/**
 * Hlavní hook pro Orders V3
 * 
 * @param {Object} params
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.userId - User ID
 * @param {Function} params.showProgress - Progress callback
 * @param {Function} params.hideProgress - Hide progress callback
 * @param {Array} params.sorting - Sorting array [{ id: 'column', desc: true/false }]
 * @param {string} params.globalFilter - Global fulltext search filter
 * @returns {Object} State a funkce pro práci s objednávkami
 */
export function useOrdersV3({ 
  token, 
  username, 
  userId,
  showProgress, 
  hideProgress,
  sorting = [],
  globalFilter = '',
  initialDashboardFilter = ''
}) {
  const navigate = useNavigate();
  
  // ✅ OPTIMALIZACE: Deduplicated API request management
  const {
    data: orders,
    stats: apiStats,
    unfilteredStats: apiUnfilteredStats,
    pagination: apiPagination,
    loading,
    error,
    fetchData,
    cancelCurrentRequest,
    clearCache
  } = useOrdersV3Data(listOrdersV3, showProgress, hideProgress);
  
  // ✅ OPTIMALIZACE: Consolidated state management místo duplikovaných useState
  const {
    preferences,
    updatePreferences,
    itemsPerPage,
    selectedPeriod,
    columnFilters,
    dashboardFilters,
    setDashboardFilters,
    columnVisibility,
    setColumnVisibility,
    columnOrder,
    setColumnOrder,
    expandedRows,
    setExpandedRows,
  } = useOrdersV3State(userId, initialDashboardFilter);
  
  // ============================================================================
  // STATE - Pagination (sync s API response)
  // ============================================================================
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(apiPagination?.total_pages || 0);
  const [totalItems, setTotalItems] = useState(apiPagination?.total || 0);
  
  // Update pagination když se změní API response
  useEffect(() => {
    if (apiPagination) {
      setTotalPages(apiPagination.total_pages || 0);
      setTotalItems(apiPagination.total || 0);
    }
  }, [apiPagination]);
  
  // ============================================================================
  // STATE - Statistiky (optimalizované s API integration)
  // ============================================================================
  
  // Base stats (unfiltered) - stabilní reference
  const [unfilteredStats, setUnfilteredStats] = useState(() => ({
    total: 0,
    totalAmount: 0,
    nova: 0,
    ke_schvaleni: 0,
    schvalena: 0,
    zamitnuta: 0,
    rozpracovana: 0,
    odeslana: 0,
    potvrzena: 0,
    k_uverejneni_do_registru: 0,
    uverejnena: 0,
    ceka_potvrzeni: 0,
    ceka_se: 0,
    fakturace: 0,
    vecna_spravnost: 0,
    dokoncena: 0,
    dokoncenaAmount: 0,
    zrusena: 0,
    smazana: 0,
    archivovano: 0,
    withInvoices: 0,
    withAttachments: 0,
    mimoradneUdalosti: 0,
    mojeObjednavky: 0,
    withComments: 0,
    withMyComments: 0,
  }));
  
  // Current stats (filtrované) - z API response
  const [currentStats, setCurrentStats] = useState(null);
  
  // Update stats když se změní API response
  useEffect(() => {
    // 🎯 Vždy použij unfilteredStats z API (celková suma za období)
    if (apiUnfilteredStats) {
      setUnfilteredStats(apiUnfilteredStats);
    }
    
    // 🔍 Použij filtrované stats (pokud existují)
    if (apiStats) {
      setCurrentStats(apiStats);
    }
  }, [apiStats, apiUnfilteredStats]);
  
  // ✅ Column configuration přesunuto do useOrdersV3State
  
  // ✅ Expanded rows přesunuto do useOrdersV3State
  const [subRowsData, setSubRowsData] = useState({}); // Cache pro načtené detaily
  
  // ✅ OPTIMALIZACE: localStorage effects nahrazeny debounced save v useOrdersV3State
  
  // ============================================================================
  // REF - Debounce timers a aktuální hodnoty
  // ============================================================================
  
  const filterDebounceTimers = useRef({});
  const currentDashboardFilters = useRef(dashboardFilters);
  
  // Update ref při změně
  useEffect(() => {
    currentDashboardFilters.current = dashboardFilters;
  }, [dashboardFilters]);
  
  // ============================================================================
  // FUNKCE - Načítání dat
  // ============================================================================
  
  /**
   * Převede filtry z frontendu na formát pro backend API
   * Mapuje názvy a převádí pole ID na správné parametry
   */
  const convertFiltersForBackend = useCallback((filters, globalFilterValue) => {
    // console.log('🔄 Converting filters for backend:', {
    //   filters,
    //   filterKeys: Object.keys(filters),
    //   filterValues: Object.values(filters),
    //   globalFilterValue,
    //   stavValue: filters.stav,
    //   stavType: typeof filters.stav
    // });
    
    const backendFilters = {};
    
    // ✨ GLOBAL FILTER - fulltext search ve všech polích
    if (globalFilterValue && globalFilterValue.trim()) {
      backendFilters.fulltext_search = globalFilterValue.trim();
    }
    
    // Pole ID uživatelů - backend očekává pole ID
    if (filters.objednatel && Array.isArray(filters.objednatel) && filters.objednatel.length > 0) {
      backendFilters.objednatel = filters.objednatel;
    }
    if (filters.garant && Array.isArray(filters.garant) && filters.garant.length > 0) {
      backendFilters.garant = filters.garant;
    }
    if (filters.prikazce && Array.isArray(filters.prikazce) && filters.prikazce.length > 0) {
      backendFilters.prikazce = filters.prikazce;
    }
    if (filters.schvalovatel && Array.isArray(filters.schvalovatel) && filters.schvalovatel.length > 0) {
      backendFilters.schvalovatel = filters.schvalovatel;
    }
    
    // Status - pole workflow kódů (select posílá KÓD přímo z číselníku)
    if (filters.stav) {
      // ✅ Select filter posílá KÓD přímo (např. "FAKTURACE", "POTVRZENA")
      let stavArray = [];
      if (typeof filters.stav === 'string' && filters.stav.trim()) {
        // ✅ Ignoruj prázdné stringy
        stavArray = [filters.stav.trim()];
      } else if (Array.isArray(filters.stav) && filters.stav.length > 0) {
        // ✅ Filtruj prázdné stringy z pole
        stavArray = filters.stav.map(s => String(s).trim()).filter(s => s.length > 0);
      }
      
      if (stavArray.length > 0) {
        backendFilters.stav = stavArray;
      }
    }
    
    // LP kódy - filtrování podle Limitovaných příslibů
    if (filters.lp_kody && Array.isArray(filters.lp_kody) && filters.lp_kody.length > 0) {
      backendFilters.lp_kody = filters.lp_kody.map(id => String(id));
    }
    
    // Datumové rozsahy
    if (filters.dateFrom) {
      backendFilters.datum_od = filters.dateFrom;
    }
    if (filters.dateTo) {
      backendFilters.datum_do = filters.dateTo;
    }
    
    // Částkové rozsahy
    if (filters.amountFrom) {
      backendFilters.cena_max_od = filters.amountFrom;
    }
    if (filters.amountTo) {
      backendFilters.cena_max_do = filters.amountTo;
    }
    
    // Boolean filtry - mimořádné události
    if (filters.mimoradneObjednavky) {
      backendFilters.mimoradne_udalosti = true;
    }
    
    // ========================================================================
    // STAV REGISTRU (checkboxy: maBytZverejneno, byloZverejneno)
    // ========================================================================
    // Frontend používá: maBytZverejneno, byloZverejneno checkboxy
    // Backend očekává: stav_registru pole ['publikovano', 'nepublikovano']
    // 
    // Logika:
    // - byloZverejneno checked → 'publikovano' (dt_zverejneni IS NOT NULL)
    // - maBytZverejneno checked → 'nepublikovano' (zverejnit IS NOT NULL AND dt_zverejneni IS NULL)
    // - Obě checked → obě hodnoty v poli
    // - Nic checked → nefiltrovat
    const stavRegistru = [];
    if (filters.byloZverejneno) {
      stavRegistru.push('publikovano');
    }
    if (filters.maBytZverejneno) {
      stavRegistru.push('nepublikovano');
    }
    if (stavRegistru.length > 0) {
      backendFilters.stav_registru = stavRegistru;
    }
    
    // Textové filtry ze sloupcových filtrů
    if (filters.cislo_objednavky) {
      backendFilters.cislo_objednavky = filters.cislo_objednavky;
    }
    if (filters.predmet) {
      backendFilters.predmet = filters.predmet;
    }
    if (filters.dodavatel_nazev) {
      backendFilters.dodavatel_nazev = filters.dodavatel_nazev;
    }
    if (filters.financovani) {
      backendFilters.financovani = filters.financovani;
    }
    
    // Datum z column filtru 
    if (filters.datum_od) {
      backendFilters.datum_od = filters.datum_od;
    }
    
    // Přesné datum z tabulkového sloupce
    if (filters.datum_presne) {
      backendFilters.datum_presne = filters.datum_presne;
    }
    
    // Sloučené filtry (pro tabulkové filtry)
    // ⚠️ Kombinované sloupce - nové názvy (backend očekává tyto)
    if (filters.objednatel_garant) {
      backendFilters.objednatel_garant = filters.objednatel_garant;
    }
    if (filters.prikazce_schvalovatel) {
      backendFilters.prikazce_schvalovatel = filters.prikazce_schvalovatel;
    }
    
    // ⚠️ BACKWARD COMPATIBILITY: Staré názvy (pokud ještě existují v localStorage)
    if (filters.objednatel_jmeno) {
      backendFilters.objednatel_jmeno = filters.objednatel_jmeno;
    }
    if (filters.garant_jmeno) {
      backendFilters.garant_jmeno = filters.garant_jmeno;
    }
    if (filters.prikazce_jmeno) {
      backendFilters.prikazce_jmeno = filters.prikazce_jmeno;
    }
    if (filters.schvalovatel_jmeno) {
      backendFilters.schvalovatel_jmeno = filters.schvalovatel_jmeno;
    }
    
    if (filters.stav_workflow) {
      backendFilters.stav_workflow = filters.stav_workflow;
    }
    if (filters.cena_max) {
      backendFilters.cena_max = filters.cena_max;
    }
    if (filters.cena_polozky) {
      backendFilters.cena_polozky = filters.cena_polozky;
    }
    if (filters.cena_faktury) {
      backendFilters.cena_faktury = filters.cena_faktury;
    }
    
    return backendFilters;
  }, []);
  
  /**
   * ✅ OPTIMALIZACE: Načte objednávky přes deduplicated API handler
   */
  // ✅ Defaultně použij aktuální `globalFilter` z hook parametrů.
  // Důvod: spousta míst volá `loadOrders()` bez parametru (refresh, checkbox, atd.)
  // a tím se dříve neaplikoval fulltext filtr.
  const loadOrders = useCallback(async (globalFilterValue = globalFilter, options = {}) => {
    if (!token || !username) {
      console.warn('⚠️ useOrdersV3: Missing token or username');
      return;
    }
    const forceRefresh = Boolean(options?.forceRefresh);
    const silent = Boolean(options?.silent);
    
    // console.log('🔄 useOrdersV3: loadOrders called', {
    //   currentPage,
    //   itemsPerPage,
    //   selectedPeriod,
    //   hasColumnFilters: Object.keys(columnFilters || {}).length > 0,
    //   dashboardFilters: currentDashboardFilters.current
    // });
    
    // Převést filtry na backend formát - ✨ včetně globalFilter
    const activeFilters = convertFiltersForBackend(columnFilters, globalFilterValue);
    
    // ========================================================================
    // DASHBOARD FILTR - Mapování Dashboard toggle hodnot na backend formát
    // ========================================================================
    const currentDashboard = currentDashboardFilters.current;
    if (currentDashboard.filter_status) {
      const statusKey = currentDashboard.filter_status;
      
      // Special filtry (nemění stav)
      if (statusKey === 'moje_objednavky') {
        activeFilters.moje_objednavky = true;
      } else if (statusKey === 'mimoradne_udalosti') {
        activeFilters.mimoradne_udalosti = true;
      } else if (statusKey === 's_fakturou') {
        activeFilters.s_fakturou = true;
      } else if (statusKey === 's_prilohami') {
        activeFilters.s_prilohami = true;
      } else if (statusKey === 'bez_obj_priloh') {
        activeFilters.bez_obj_priloh = true;
      } else if (statusKey === 's_komentari') {
        activeFilters.s_komentari = true;
      } else if (statusKey === 's_mymi_komentari') {
        activeFilters.s_mymi_komentari = true;
      } else if (statusKey === 'fakturace_prodleni') {
        // 🎯 DASHBOARD FILTR: Objednávky ve fakturaci > 7 dní (POTVRZENA/FAKTURACE/VECNA_SPRAVNOST)
        activeFilters.fakturace_prodleni = true;
      } else {
        // ✅ STAVOVÉ FILTRY - Mapování Dashboard klíčů na workflow kódy
        // Dashboard posílá lowercase: 'nova', 'ke_schvaleni', 'schvalena', ...
        // Backend očekává uppercase pole: ['NOVA'], ['KE_SCHVALENI'], ...
        const dashboardStatusMap = {
          'nova': 'NOVA',
          'ke_schvaleni': 'ODESLANA_KE_SCHVALENI',
          'schvalena': 'SCHVALENA',
          'zamitnuta': 'ZAMITNUTA',
          'rozpracovana': 'ROZPRACOVANA',
          'odeslana': 'ODESLANA',
          'potvrzena': 'POTVRZENA',
          'k_uverejneni': 'K_UVEREJNENI_DO_REGISTRU',
          'uverejnena': 'UVEREJNENA',
          'fakturace': 'FAKTURACE',
          'vecna_spravnost': 'VECNA_SPRAVNOST',
          'zkontrolovana': 'ZKONTROLOVANA',
          'dokoncena': 'DOKONCENA',
          'zrusena': 'ZRUSENA',
          'smazana': 'SMAZANA',
          // Skupinové filtry (vybere více stavů najednou)
          'rozpracovane_stavy': ['ROZPRACOVANA', 'ODESLANA', 'POTVRZENA', 'FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA'],
        };
        
        const mappedStatus = dashboardStatusMap[statusKey];
        if (mappedStatus) {
          // ✅ Backend očekává filters.stav jako POLE (i když je jen 1 hodnota)
          activeFilters.stav = Array.isArray(mappedStatus) ? mappedStatus : [mappedStatus];
        } else {
          // Fallback pro neznámé hodnoty
          activeFilters.stav = [statusKey.toUpperCase()];
        }
      }
    }
    
    // ✅ Volání optimalizované API funkce s cache a deduplication
    return fetchData({
      token,
      username,
      page: currentPage,
      per_page: itemsPerPage,
      period: selectedPeriod,
      filters: activeFilters,
      sorting: sorting,
      forceRefresh,
      silent,
    });
  }, [
    token,
    username,
    currentPage,
    itemsPerPage,
    selectedPeriod,
    columnFilters,
    sorting,
    convertFiltersForBackend,
    globalFilter,
    fetchData,
  ]);
  
  // ============================================================================
  // FUNKCE - Filtrování
  // ============================================================================
  
  /**
   * Změní všechny filtry najednou (pro panelové filtry)
   */
  const handlePanelFiltersChange = useCallback((newFilters) => {
    updatePreferences({ columnFilters: newFilters });
    
    // ✅ Clear cache když se změní filtry
    clearCache();
    
    setCurrentPage(1);
  }, [updatePreferences, clearCache]);
  
  /**
   * ✅ OPTIMALIZACE: Column filter s debounce z config
   */
  const handleColumnFilterChange = useCallback((columnId, value, debounceMs = ORDERS_V3_CONFIG.FILTER_DEBOUNCE_DELAY) => {
    // Mapování ID sloupců z tabulky na názvy API parametrů
    const columnToFilterMapping = {
      'cislo_objednavky': 'cislo_objednavky',
      'predmet': 'predmet',
      'dodavatel_nazev': 'dodavatel_nazev',
      'stav_objednavky': 'stav', // Mapuje na filters.stav pre backend
      'dt_objednavky': 'datum_presne', // Přesné filtrování podle datumu ze sloupce
      'objednatel_garant': 'objednatel_garant', // ✅ Backend čeká tento název
      'prikazce_schvalovatel': 'prikazce_schvalovatel', // ✅ Backend čeká tento název
      'financovani': 'financovani',
      'max_cena_s_dph': 'cena_max',
      'cena_s_dph': 'cena_polozky',
      'faktury_celkova_castka_s_dph': 'cena_faktury',
    };
    
    const filterName = columnToFilterMapping[columnId] || columnId;
    
    // DEBUG: Log číselné filtry
    if (['max_cena_s_dph', 'cena_s_dph', 'faktury_celkova_castka_s_dph'].includes(columnId)) {
      console.log('🔢 OrdersV3 Number Filter:', {
        columnId,
        filterName,
        value,
        type: typeof value
      });
    }
    
    // Funkce pro aplikaci filtru
    const applyFilter = () => {
      // ✅ Clear cache při změně filtrů
      clearCache();
      
      // ✅ Standardní aplikace filtru bez rozdvojení
      updatePreferences(prev => ({
        ...prev,
        columnFilters: {
          ...(prev.columnFilters || {}),
          [filterName]: value,
        }
      }));
      
      setCurrentPage(1); // Reset na první stránku
    };
    
    // Pro text inputy použít debounce
    if (typeof value === 'string' && debounceMs > 0) {
      // Clear previous timer
      if (filterDebounceTimers.current[columnId]) {
        clearTimeout(filterDebounceTimers.current[columnId]);
      }
      
      // Set new timer
      filterDebounceTimers.current[columnId] = setTimeout(applyFilter, debounceMs);
    } else {
      // Pro select, checkbox, atd. aplikovat hned
      applyFilter();
    }
  }, [clearCache, updatePreferences]);
  
  /**
   * Změní dashboard filtr (status cards)
   * @param {string|null} filterType - Typ filtru: 'nova', 'schvalena', 'moje_objednavky', atd., nebo null pro reset
   */
  const handleDashboardFilterChange = useCallback(async (filterType) => {
    // Uložit nový stav do dočasné proměnné
    let newFilters;
    
    // Pokud je filterType null, resetuj filtry
    if (filterType === null) {
      newFilters = {
        filter_status: '',
        filter_my_orders: false,
        filter_archivovano: false,
      };
    } else {
      const isCurrentlyActive = dashboardFilters.filter_status === filterType;
      const newStatus = isCurrentlyActive ? '' : filterType;
      
      newFilters = {
        ...dashboardFilters,
        filter_status: newStatus,
      };
    }
    
    // Uložit do localStorage
    if (userId) {
      localStorage.setItem(`ordersV3_dashboardFilters_${userId}`, JSON.stringify(newFilters));
    }
    
    setCurrentPage(1);
    
    // DŮLEŽITÉ: Aktualizovat REF PŘED nastavením state
    currentDashboardFilters.current = newFilters;
    
    // ✅ POUZE nastavit state - useEffect si zařídí načtení dat
    setDashboardFilters(newFilters);
    
  }, [userId, dashboardFilters]); // ✅ Removed globalFilter - useEffect handle vše
  
  /**
   * Vyčistí POUZE sloupcové a dashboard filtry (NEVYMAZÁVÁ globalFilter!)
   * GlobalFilter se řeší samostatně v Orders25ListV3.js
   * - Sloupcové filtry (textové, multi-select, date/price ranges, boolean)
   * - Dashboard filtry (status, moje objednávky, archivované)
   * - Reset na první stránku
   */
  const handleClearFilters = useCallback(() => {
    
    // Reset všech typů sloupcových filtrů na default z config
    const emptyFilters = { ...ORDERS_V3_CONFIG.DEFAULT_PREFERENCES.columnFilters };
    const emptyDashboardFilters = { ...ORDERS_V3_CONFIG.DEFAULT_PREFERENCES.dashboardFilters };
    
    updatePreferences({
      columnFilters: emptyFilters,
      dashboardFilters: emptyDashboardFilters,
      expandedRows: {},
    });
    
    // 💾 OKAMŽITĚ smazat dashboard filter z localStorage (bez debounce)
    // aby se po reloadu neuložil starý filtr
    if (userId) {
      try {
        localStorage.setItem(`ordersV3_dashboardFilters_${userId}`, JSON.stringify(emptyDashboardFilters));
      } catch (err) {
        console.warn('Failed to clear dashboard filters from localStorage:', err);
      }
    }
    
    // ✅ Clear cache při resetů filtrů
    clearCache();
    
    // Reset expanded rows state
    setSubRowsData({});
    
    // Reset na první stránku
    setCurrentPage(1);
    
  }, [userId, updatePreferences, clearCache]);
  
  // ============================================================================
  // FUNKCE - Pagination
  // ============================================================================
  
  /**
   * Změní aktuální stránku
   */
  const handlePageChange = useCallback((newPage) => {
    const page = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(page);
  }, [totalPages]);
  
  /**
   * Změní počet položek na stránku
   */
  const handleItemsPerPageChange = useCallback((newItemsPerPage) => {
    updatePreferences({ itemsPerPage: newItemsPerPage });
    setCurrentPage(1); // Reset na první stránku
  }, [updatePreferences]);
  
  // ============================================================================
  // FUNKCE - Column Configuration
  // ============================================================================
  
  /**
   * Změní viditelnost sloupce
   */
  const handleColumnVisibilityChange = useCallback((columnId, visible) => {
    const newVisibility = {
      ...columnVisibility,
      [columnId]: visible,
    };
    updatePreferences({ columnVisibility: newVisibility });
  }, [columnVisibility, updatePreferences]);
  
  /**
   * Změní pořadí sloupců
   */
  const handleColumnOrderChange = useCallback((fromColumnOrNewOrder, toColumn) => {
    let newOrder;
    
    if (Array.isArray(fromColumnOrNewOrder)) {
      // Přijato celé nové pole
      newOrder = fromColumnOrNewOrder;
    } else if (typeof fromColumnOrNewOrder === 'string' && toColumn) {
      // Přijato (fromColumn, toColumn)
      const fromIndex = columnOrder.indexOf(fromColumnOrNewOrder);
      const toIndex = columnOrder.indexOf(toColumn);
      
      if (fromIndex === -1 || toIndex === -1) {
        console.warn('⚠️ Orders V3: Invalid column indices!');
        return;
      }
      
      newOrder = [...columnOrder];
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, fromColumnOrNewOrder);
    } else {
      return;
    }
    
    updatePreferences({ columnOrder: newOrder });
  }, [columnOrder, updatePreferences]);
  
  /**
   * Resetuje konfiguraci sloupců na výchozí
   */
  const handleResetColumnConfig = useCallback(() => {
    updatePreferences({ 
      columnVisibility: { ...ORDERS_V3_CONFIG.DEFAULT_COLUMN_VISIBILITY },
      columnOrder: [...ORDERS_V3_CONFIG.DEFAULT_COLUMN_ORDER] 
    });
  }, [updatePreferences]);
  
  // ============================================================================
  // FUNKCE - Expanded Rows (Lazy Loading)
  // ============================================================================
  
  /**
   * Toggle rozbalení řádku (s lazy loading detailu)
   */
  const handleToggleRow = useCallback(async (orderId) => {
    const isExpanded = expandedRows[orderId];
    
    if (isExpanded) {
      // Sbalujeme - odstraníme z objektu
      const newExpandedRows = { ...expandedRows };
      delete newExpandedRows[orderId];
      updatePreferences({ expandedRows: newExpandedRows });
    } else {
      // Rozbalujeme - přidáme do objektu
      updatePreferences({ 
        expandedRows: {
          ...expandedRows,
          [orderId]: true,
        }
      });
      
      // Pokud rozbalujeme a ještě nemáme data, načíst je
      if (!subRowsData[orderId]) {
        try {
          // console.log('📋 Loading subrow data for order:', orderId);
          
          // ✅ KONTROLA: Musíme mít token, username a orderId
          if (!token || !username || !orderId) {
            console.warn('⚠️ Cannot load subrow data - missing auth or orderId', { token: !!token, username: !!username, orderId });
            return;
          }
          
          // ✅ SKUTEČNÉ NAČTENÍ FAKTUR místo mockDetail
          const invoices = await getOrderInvoicesV3({ 
            token, 
            username, 
            orderId 
          });
          
          const detail = {
            items: [], // TODO: implementovat načítání položek
            faktury: invoices || [], // ✅ OPRAVA: faktury ne invoices!
            attachments: [], // TODO: implementovat načítání příloh
          };
          
          setSubRowsData(prev => ({
            ...prev,
            [orderId]: detail,
          }));
        } catch (err) {
          console.error('❌ Error loading subrow data:', err);
        }
      }
    }
  }, [expandedRows, subRowsData, token, username]);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  /**
   * Načíst data při prvním načtení a změně základních parametrů
   * POZOR: NE při změně dashboardFilters! To by mazalo unfiltered stats
   * IncludeS globalFilter pro fulltext search!
   */
  useEffect(() => {
    if (token && username) {
      loadOrders(globalFilter); // ✅ Používej globalFilter i v základním načtení
    }
    
    // ✅ CLEANUP: Cancel předchozího requestu při změně filtrů
    return () => {
      cancelCurrentRequest();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    token,
    username,
    currentPage,
    itemsPerPage,
    selectedPeriod,
    columnFilters,
    dashboardFilters, // ✅ Added back - but loadOrders not in deps
    globalFilter, // ✅ Added back - needed for search
    sorting, // ✅ Added - needed for column sorting
    // POZOR: loadOrders NENÍ v dependencies - způsoboval by infinite loop!
  ]);
  
  /**
   * Cleanup debounce timers
   */
  useEffect(() => {
    return () => {
      Object.values(filterDebounceTimers.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);
  
  // ============================================================================
  // COMPUTED STATS - Rozšířené statistiky z aktuálně načtených dat
  // ============================================================================
  
  const enhancedStats = useMemo(() => {
    // ZÁKLAD jsou VŽDY unfilteredStats (celkové hodnoty)
    const baseStats = { ...unfilteredStats };
    
    // Pro filtrované hodnoty použij currentStats z BE (ne počítání z orders na stránce!)
    let filteredTotalAmount = baseStats.totalAmount; // default = celková částka
    let filteredCount = baseStats.total; // default = celkový počet
    
    // Pokud jsou currentStats (= filtrovaná data z BE), použij je
    if (currentStats && currentStats.totalAmount !== undefined) {
      filteredTotalAmount = currentStats.totalAmount;
      filteredCount = currentStats.total || 0;
      
      // Také aktualizuj dokoncenaAmount z currentStats
      if (currentStats.dokoncenaAmount !== undefined) {
        baseStats.dokoncenaAmount = currentStats.dokoncenaAmount;
      }
    }
    
    // Rozšířené stats
    return {
      ...baseStats,
      filteredTotalAmount,
      filteredCount
    };
  }, [unfilteredStats, currentStats]);

  // ============================================================================
  // KONTROLA OBJEDNÁVEK - Toggle checkbox
  // ============================================================================
  
  /**
   * Toggle stav kontroly objednávky
   * @param {number} orderId - ID objednávky
   * @param {boolean} checked - True = zkontrolováno, False = zrušit
   */
  const handleToggleOrderCheck = useCallback(async (orderId, checked) => {
    if (!token || !username) {
      console.error('Missing token or username');
      return;
    }
    
    try {
      const response = await toggleOrderCheck({
        token,
        username,
        order_id: orderId,
        checked
      });
      
      if (response.status === 'success') {
        // Vyčistit cache a explicitně reload data
        clearCache();
        // Explicitní reload pro okamžitou aktualizaci UI
        await loadOrders();
        return response.data;
      } else {
        throw new Error(response.message || 'Chyba při kontrole objednávky');
      }
    } catch (error) {
      console.error('Error toggling order check:', error);
      throw error;
    }
  }, [token, username, clearCache, loadOrders]);

  // ============================================================================
  // KOMENTÁŘE - Load, Add, Delete
  // ============================================================================
  
  /**
   * Načte komentáře k objednávce
   * @param {number} orderId - ID objednávky
   * @param {number} limit - Max počet komentářů
   * @param {number} offset - Offset pro stránkování
   * @returns {Promise<Object>} {comments: Array, total: number, comments_count: number}
   */
  const handleLoadComments = useCallback(async (orderId, limit = 100, offset = 0) => {
    if (!token || !username) {
      console.error('Missing token or username');
      return { comments: [], total: 0, comments_count: 0 };
    }
    
    try {
      const response = await loadOrderComments({
        token,
        username,
        order_id: orderId,
        limit,
        offset
      });
      
      if (response.status === 'success') {
        return {
          comments: response.data || [],
          total: response.total || 0,
          comments_count: response.comments_count || 0
        };
      } else {
        throw new Error(response.message || 'Chyba při načítání komentářů');
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      return { comments: [], total: 0, comments_count: 0 };
    }
  }, [token, username]);
  
  /**
   * Přidá nový komentář k objednávce
   * @param {number} orderId - ID objednávky
   * @param {string} text - Text komentáře
   * @returns {Promise<Object>} {comment: Object, comments_count: number}
   */
  const handleAddComment = useCallback(async (orderId, text, parentCommentId = null) => {
    if (!token || !username) {
      console.error('Missing token or username');
      return null;
    }
    
    if (!text || text.trim() === '') {
      throw new Error('Komentář nemůže být prázdný');
    }
    
    try {
      const requestData = {
        token,
        username,
        order_id: orderId,
        obsah: text
      };
      
      // Přidat parent_comment_id pouze pokud je definován
      if (parentCommentId !== null && parentCommentId !== undefined) {
        requestData.parent_comment_id = parentCommentId;
      }
      
      const response = await addOrderComment(requestData);
      
      if (response.status === 'success') {
        return {
          comment: response.data,
          comments_count: response.comments_count || 0
        };
      } else {
        throw new Error(response.message || 'Chyba při přidávání komentáře');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }, [token, username]);
  
  /**
   * Smazání vlastního komentáře
   * @param {number} commentId - ID komentáře
   * @returns {Promise<Object>} {comment_id: number, order_id: number, comments_count: number}
   */
  const handleDeleteComment = useCallback(async (commentId) => {
    if (!token || !username) {
      console.error('Missing token or username');
      return null;
    }
    
    try {
      const response = await deleteOrderComment({
        token,
        username,
        comment_id: commentId
      });
      
      if (response.status === 'success') {
        return {
          ...response.data,
          comments_count: response.comments_count || 0
        };
      } else {
        throw new Error(response.message || 'Chyba při mazání komentáře');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }, [token, username]);

  // ============================================================================
  // RETURN
  // ============================================================================
  
  return {
    // Data
    orders,
    loading,
    error,
    stats: enhancedStats,
    filteredStats: currentStats, // Pro malé dlaždice když je aktivní filtr
    
    // Pagination
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
    
    // Filtry
    selectedPeriod,
    setSelectedPeriod: (period) => updatePreferences({ selectedPeriod: period }),
    columnFilters,
    dashboardFilters,
    handlePanelFiltersChange,
    handleColumnFilterChange,
    handleDashboardFilterChange,
    handleClearFilters,
    
    // Column Configuration
    columnVisibility,
    columnOrder,
    handleColumnVisibilityChange,
    handleColumnOrderChange,
    handleResetColumnConfig,
    
    // Expanded Rows
    expandedRows,
    subRowsData,
    handleToggleRow,
    
    // Actions
    loadOrders,
    navigate,
    clearCache, // ✅ Pro vyčištění cache po update operacích
    
    // Kontrola a Komentáře
    handleToggleOrderCheck,
    handleLoadComments,
    handleAddComment,
    handleDeleteComment,
    
    // Utils
    getOrderTotalPriceWithDPH,
  };
}

export default useOrdersV3;
