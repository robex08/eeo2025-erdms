/**
 * useOrdersV3.js
 * 
 * Custom hook pro Orders V3 - komplexní state management
 * Centralizovaná logika pro načítání dat, filtrování, pagination a caching
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { listOrdersV3 } from '../../services/apiOrdersV3';
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
 * @returns {Object} State a funkce pro práci s objednávkami
 */
export function useOrdersV3({ 
  token, 
  username, 
  userId,
  showProgress, 
  hideProgress,
  sorting = []
}) {
  const navigate = useNavigate();
  
  // ✅ OPTIMALIZACE: Deduplicated API request management
  const {
    data: orders,
    stats: apiStats,
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
  } = useOrdersV3State(userId);
  
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
  }));
  
  // Current stats (filtrované) - z API response
  const [currentStats, setCurrentStats] = useState(null);
  
  // Update stats když se změní API response
  useEffect(() => {
    if (apiStats) {
      const hasActiveDashboardFilters = !!dashboardFilters.filter_status;
      
      if (!hasActiveDashboardFilters) {
        // Bez dashboard filtrů = unfiltered baseline
        setUnfilteredStats(apiStats);
        setCurrentStats(apiStats);
      } else {
        // S dashboard filtry = pouze current stats
        setCurrentStats(apiStats);
      }
    }
  }, [apiStats, dashboardFilters.filter_status]);
  
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
  const convertFiltersForBackend = useCallback((filters) => {
    const backendFilters = {};
    
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
    
    // Status - pole workflow kódů
    if (filters.stav && Array.isArray(filters.stav) && filters.stav.length > 0) {
      backendFilters.stav = filters.stav;
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
    
    // Boolean filtry
    if (filters.maBytZverejneno) {
      backendFilters.ma_byt_zverejneno = true;
    }
    if (filters.byloZverejneno) {
      backendFilters.bylo_zverejneno = true;
    }
    if (filters.mimoradneObjednavky) {
      backendFilters.mimoradne_udalosti = true;
    }
    
    // Stav registru (checkboxy) - konverze na pole pro backend
    // Frontend používá: maBytZverejneno, byloZverejneno checkboxy
    // Backend očekává: stav_registru pole ['publikovano', 'nepublikovano', 'nezverejnovat']
    const stavRegistru = [];
    if (filters.byloZverejneno) {
      stavRegistru.push('publikovano');
    }
    if (filters.maBytZverejneno && !filters.byloZverejneno) {
      stavRegistru.push('nepublikovano');
    }
    if (!filters.maBytZverejneno && !filters.byloZverejneno) {
      // Pokud nic není zaškrtnuté, mohlo by to znamenat "nezveřejňovat"
      // Ale podle logiky je lepší to vůbec nefiltrovat
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
    
    // Sloučené filtry (pro tabulkové filtry)
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
  const loadOrders = useCallback(async () => {
    if (!token || !username) {
      console.warn('⚠️ useOrdersV3: Missing token or username');
      return;
    }
    
    // Převést filtry na backend formát
    const activeFilters = convertFiltersForBackend(columnFilters);
    
    // Přidat dashboard filtr z REF (aktuální hodnota)
    const currentDashboard = currentDashboardFilters.current;
    if (currentDashboard.filter_status) {
      if (currentDashboard.filter_status === 'moje_objednavky') {
        activeFilters.moje_objednavky = true;
      } else if (currentDashboard.filter_status === 'mimoradne_udalosti') {
        activeFilters.mimoradne_udalosti = true;
      } else if (currentDashboard.filter_status === 's_fakturou') {
        activeFilters.s_fakturou = true;
      } else if (currentDashboard.filter_status === 's_prilohami') {
        activeFilters.s_prilohami = true;
      } else {
        activeFilters.stav_workflow = currentDashboard.filter_status;
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
    setCurrentPage(1);
  }, [updatePreferences]);
  
  /**
   * ✅ OPTIMALIZACE: Column filter s debounce z config
   */
  const handleColumnFilterChange = useCallback((columnId, value, debounceMs = ORDERS_V3_CONFIG.FILTER_DEBOUNCE_DELAY) => {
    // Mapování ID sloupců z tabulky na názvy API parametrů
    const columnToFilterMapping = {
      'cislo_objednavky': 'cislo_objednavky',
      'predmet': 'predmet',
      'dodavatel_nazev': 'dodavatel_nazev',
      'stav_objednavky': 'stav_workflow',
      'dt_objednavky': 'datum_od', // Date column - bude potřeba speciální handling
      'objednatel_garant': 'objednatel_jmeno', // Hledá v objednatel i garant
      'prikazce_schvalovatel': 'prikazce_jmeno', // Hledá v příkazce i schvalovatel
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
      // Pro kombinované sloupce - poslat hodnotu oběma polím
      if (columnId === 'objednatel_garant') {
        updatePreferences({
          columnFilters: {
            ...columnFilters,
            objednatel_jmeno: value,
            garant_jmeno: value,
          }
        });
      } else if (columnId === 'prikazce_schvalovatel') {
        updatePreferences({
          columnFilters: {
            ...columnFilters,
            prikazce_jmeno: value,
            schvalovatel_jmeno: value,
          }
        });
      } else {
        updatePreferences({
          columnFilters: {
            ...columnFilters,
            [filterName]: value,
          }
        });
      }
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
  }, []);
  
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
    
    // DŮLEŽITÉ: Aktualizovat REF PŘED voláním loadOrders()
    currentDashboardFilters.current = newFilters;
    
    try {
      // Načíst data s novými filtry (AWAIT - čekat na dokončení!)
      await loadOrders();
      
      // TEPRV NYNÍ aktualizovat state (po načtení dat)
      setDashboardFilters(newFilters);
      
    } catch (error) {
      console.error('❌ Chyba při načítání dat s novým filtrem:', error);
      // V případě chyby neměnit stav
    }
    
  }, [userId, dashboardFilters, loadOrders]);
  
  /**
   * Vyčistí VŠECHNY filtry a localStorage
   * - Sloupcové filtry (textové, multi-select, date/price ranges, boolean)
   * - Dashboard filtry (status, moje objednávky, archivované)
   * - Reset na první stránku
   */
  const handleClearFilters = useCallback(() => {
    
    // Reset všech typů sloupcových filtrů na default z config
    const emptyFilters = { ...ORDERS_V3_CONFIG.DEFAULT_PREFERENCES.columnFilters };
    
    updatePreferences({
      columnFilters: emptyFilters,
      dashboardFilters: { ...ORDERS_V3_CONFIG.DEFAULT_PREFERENCES.dashboardFilters },
      expandedRows: {},
    });
    
    // Reset expanded rows state
    setSubRowsData({});
    
    // Reset na první stránku
    setCurrentPage(1);
    
  }, [userId]);
  
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
          
          // TODO: Implementovat načítání detailu
          // const detail = await getOrderDetail(orderId, token, username);
          
          // PLACEHOLDER
          const mockDetail = {
            items: [],
            invoices: [],
            attachments: [],
          };
          
          setSubRowsData(prev => ({
            ...prev,
            [orderId]: mockDetail,
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
   */
  useEffect(() => {
    if (token && username) {
      loadOrders();
    }
  }, [
    token,
    username,
    currentPage,
    itemsPerPage,
    selectedPeriod,
    columnFilters,
    // POZOR: dashboardFilters NENÍ v závislosti!
    // Pro změnu dashboard filtrů se volá loadOrders() ručně v handleDashboardFilterChange
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
  // RETURN
  // ============================================================================
  
  return {
    // Data
    orders,
    loading,
    error,
    stats: enhancedStats,
    
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
    
    // Utils
    getOrderTotalPriceWithDPH,
  };
}

export default useOrdersV3;
