/**
 * useOrdersV3.js
 * 
 * Custom hook pro Orders V3 - komplexní state management
 * Centralizovaná logika pro načítání dat, filtrování, pagination a caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { listOrdersV3 } from '../../services/apiOrdersV3';

/**
 * Hlavní hook pro Orders V3
 * 
 * @param {Object} params
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.userId - User ID
 * @param {Function} params.showProgress - Progress callback
 * @param {Function} params.hideProgress - Hide progress callback
 * @returns {Object} State a funkce pro práci s objednávkami
 */
export function useOrdersV3({ 
  token, 
  username, 
  userId,
  showProgress, 
  hideProgress 
}) {
  const navigate = useNavigate();
  
  // ============================================================================
  // STATE - Data
  // ============================================================================
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ============================================================================
  // STATE - Pagination (Server-side) - s localStorage
  // ============================================================================
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (userId) {
      try {
        const saved = localStorage.getItem(`ordersV3_itemsPerPage_${userId}`);
        return saved ? parseInt(saved, 10) : 50;
      } catch {
        return 50;
      }
    }
    return 50;
  });
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  
  // ============================================================================
  // STATE - Filtry - s localStorage
  // ============================================================================
  
  const [selectedYear, setSelectedYear] = useState(() => {
    if (userId) {
      try {
        const saved = localStorage.getItem(`ordersV3_selectedYear_${userId}`);
        return saved ? parseInt(saved, 10) : new Date().getFullYear();
      } catch {
        return new Date().getFullYear();
      }
    }
    return new Date().getFullYear();
  });
  
  // Sloupcové filtry (pro backend) - načíst z localStorage
  const [columnFilters, setColumnFilters] = useState(() => {
    if (userId) {
      try {
        const saved = localStorage.getItem(`ordersV3_columnFilters_${userId}`);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {
        // Ignorovat chybu
      }
    }
    return {
      // User filters (multi-select arrays of IDs)
      objednatel: [],
      garant: [],
      prikazce: [],
      schvalovatel: [],
      
      // Status filter (multi-select array of status codes)
      stav: [],
      
      // Date range
      dateFrom: '',
      dateTo: '',
      
      // Price range
      amountFrom: '',
      amountTo: '',
      
      // Registry status (boolean)
      maBytZverejneno: false,
      byloZverejneno: false,
      
      // Extraordinary events (boolean)
      mimoradneObjednavky: false,
    };
  });
  
  // Dashboard filtry
  const [dashboardFilters, setDashboardFilters] = useState({
    filter_status: '', // 'NOVA', 'SCHVALENA', atd.
    filter_my_orders: false,
    filter_archivovano: false,
  });
  
  // ============================================================================
  // STATE - Statistiky (z BE)
  // ============================================================================
  
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    filteredTotalAmount: 0,
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
    zrusena: 0,
    smazana: 0,
    archivovano: 0,
    withInvoices: 0,
    withAttachments: 0,
    mimoradneUdalosti: 0,
    mojeObjednavky: 0,
  });
  
  // ============================================================================
  // STATE - Table Configuration (pro drag&drop, hide/show columns)
  // ============================================================================
  
  const [columnVisibility, setColumnVisibility] = useState({
    expander: true,
    approve: true,
    dt_objednavky: true,
    cislo_objednavky: true,
    financovani: true,
    objednatel_garant: true,
    prikazce_schvalovatel: true,
    dodavatel_nazev: true,
    stav_objednavky: true,
    stav_registru: true,
    max_cena_s_dph: true,
    cena_s_dph: true,
    faktury_celkova_castka_s_dph: true,
    actions: true,
  });
  
  const [columnOrder, setColumnOrder] = useState(() => {
    // Načíst z localStorage (per user)
    if (userId) {
      try {
        const saved = localStorage.getItem(`ordersV3_columnOrder_${userId}`);
        if (saved) {
          let parsed = JSON.parse(saved);
          // console.log('📋 Orders V3: Loaded column order from localStorage:', parsed);
          
          // MIGRACE: Opravit staré názvy sloupců
          const oldToNewMapping = {
            'zpusob_financovani': 'financovani',
            'predmet': 'cislo_objednavky', // predmet je teď součástí cislo_objednavky
          };
          
          let migrated = false;
          parsed = parsed.map(col => {
            if (oldToNewMapping[col]) {
              console.log(`🔄 Orders V3: Migrating column name: ${col} → ${oldToNewMapping[col]}`);
              migrated = true;
              return oldToNewMapping[col];
            }
            return col;
          });
          
          // Odebrat duplicity po migraci
          parsed = [...new Set(parsed)];
          
          // Pokud byla provedena migrace, uložit zpět
          if (migrated) {
            // console.log('💾 Orders V3: Saving migrated column order:', parsed);
            localStorage.setItem(`ordersV3_columnOrder_${userId}`, JSON.stringify(parsed));
          }
          
          return parsed;
        }
      } catch (err) {
        console.warn('Failed to load column order:', err);
      }
    }
    // Výchozí pořadí - DŮLEŽITÉ: financovani MUSÍ být hned za cislo_objednavky!
    const defaultOrder = [
      'expander',
      'approve',
      'dt_objednavky',
      'cislo_objednavky',
      'financovani',  // ← MUSÍ být na 5. místě!
      'objednatel_garant',
      'prikazce_schvalovatel',
      'dodavatel_nazev',
      'stav_objednavky',
      'stav_registru',
      'max_cena_s_dph',
      'cena_s_dph',
      'faktury_celkova_castka_s_dph',
      'actions',
    ];
    // console.log('📋 Orders V3: Using default column order:', defaultOrder);
    return defaultOrder;
  });
  
  // ============================================================================
  // STATE - Expanded rows (pro lazy loading subrows)
  // ============================================================================
  
  const [expandedRows, setExpandedRows] = useState({});
  const [subRowsData, setSubRowsData] = useState({}); // Cache pro načtené detaily
  
  // ============================================================================
  // EFFECTS - Uložení do localStorage při změně
  // ============================================================================
  
  // Uložit itemsPerPage do localStorage
  useEffect(() => {
    if (userId && itemsPerPage) {
      localStorage.setItem(`ordersV3_itemsPerPage_${userId}`, itemsPerPage.toString());
    }
  }, [userId, itemsPerPage]);
  
  // Uložit selectedYear do localStorage
  useEffect(() => {
    if (userId && selectedYear) {
      localStorage.setItem(`ordersV3_selectedYear_${userId}`, selectedYear.toString());
    }
  }, [userId, selectedYear]);
  
  // Uložit columnFilters do localStorage
  useEffect(() => {
    if (userId && columnFilters) {
      localStorage.setItem(`ordersV3_columnFilters_${userId}`, JSON.stringify(columnFilters));
    }
  }, [userId, columnFilters]);
  
  // ============================================================================
  // REF - Debounce timers
  // ============================================================================
  
  const filterDebounceTimers = useRef({});
  
  // ============================================================================
  // FUNKCE - Načítání dat
  // ============================================================================
  
  /**
   * Načte objednávky z API
   */
  const loadOrders = useCallback(async () => {
    if (!token || !username) {
      console.warn('⚠️ useOrdersV3: Missing token or username');
      return;
    }
    
    setLoading(true);
    setError(null);
    showProgress?.();
    
    try {
      // console.log('📋 useOrdersV3: Loading orders...', {
      //   page: currentPage,
      //   per_page: itemsPerPage,
      //   year: selectedYear,
      // });
      
      // Připravit filtry pro backend (pouze neprázdné)
      const activeFilters = {};
      Object.entries(columnFilters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          activeFilters[key] = value;
        }
      });
      
      // Přidat dashboard filtr pro workflow stav
      if (dashboardFilters.filter_status) {
        // Speciální filtry
        if (dashboardFilters.filter_status === 'moje_objednavky') {
          activeFilters.moje_objednavky = true;
        } else if (dashboardFilters.filter_status === 'mimoradne_udalosti') {
          activeFilters.mimoradne_udalosti = true;
        } else if (dashboardFilters.filter_status === 's_fakturou') {
          activeFilters.s_fakturou = true;
        } else if (dashboardFilters.filter_status === 's_prilohami') {
          activeFilters.s_prilohami = true;
        } else {
          // Jinak je to workflow stav
          activeFilters.stav_workflow = dashboardFilters.filter_status;
        }
      }
      
      // 🔍 DEBUG: Zobrazit aktivní filtry
      // console.log('🔍 DEBUG: Active filters being sent to API:', activeFilters);
      
      // Volání V3 API
      const response = await listOrdersV3({
        token,
        username,
        page: currentPage,
        per_page: itemsPerPage,
        year: selectedYear,
        filters: activeFilters,
        sorting: [], // TODO: Přidat podporu multi-column sorting
      });
      
      // 🔍 DEBUG: Zobrazit celý response
      // console.log('🔍 DEBUG: Full API Response:', JSON.stringify(response, null, 2));
      // console.log('🔍 DEBUG: Orders array:', response.data?.orders);
      // console.log('🔍 DEBUG: Orders count:', response.data?.orders?.length);
      
      // Response format: { status, data: { orders, pagination, stats }, message }
      if (response.status === 'success' && response.data) {
        setOrders(response.data.orders || []);
        
        // Pagination
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.total_pages || 0);
          setTotalItems(response.data.pagination.total || 0);
        }
        
        // Stats (pouze pro page=1)
        if (response.data.stats) {
          // console.log('📊 RAW BACKEND STATS:', JSON.stringify(response.data.stats, null, 2));
          setStats(response.data.stats);
        }
        
        // console.log('✅ Orders set to state:', response.data.orders?.length || 0, 'items');
      } else {
        throw new Error(response.message || 'Neplatná odpověď serveru');
      }
      
    } catch (err) {
      console.error('❌ useOrdersV3: Error loading orders:', err);
      setError(err?.message || 'Chyba při načítání objednávek');
      // Nemazat data při chybě - ponechat předchozí zobrazení
    } finally {
      setLoading(false);
      hideProgress?.();
    }
  }, [
    token,
    username,
    currentPage,
    itemsPerPage,
    selectedYear,
    columnFilters,
    dashboardFilters,
    showProgress,
    hideProgress,
  ]);
  
  // ============================================================================
  // FUNKCE - Filtrování
  // ============================================================================
  
  /**
   * Změní sloupcový filtr (s debounce pro text inputy)
   * Mapuje ID sloupců z tabulky na názvy API parametrů
   */
  const handleColumnFilterChange = useCallback((columnId, value, debounceMs = 500) => {
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
        setColumnFilters(prev => ({
          ...prev,
          objednatel_jmeno: value,
          garant_jmeno: value,
        }));
      } else if (columnId === 'prikazce_schvalovatel') {
        setColumnFilters(prev => ({
          ...prev,
          prikazce_jmeno: value,
          schvalovatel_jmeno: value,
        }));
      } else {
        setColumnFilters(prev => ({
          ...prev,
          [filterName]: value,
        }));
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
   * @param {string} filterType - Typ filtru: 'nova', 'schvalena', 'moje_objednavky', atd.
   */
  const handleDashboardFilterChange = useCallback((filterType) => {
    const isCurrentlyActive = dashboardFilters.filter_status === filterType;
    
    setDashboardFilters(prev => ({
      ...prev,
      filter_status: isCurrentlyActive ? '' : filterType,
    }));
    
    setCurrentPage(1); // Reset na první stránku
  }, [dashboardFilters.filter_status]);
  
  /**
   * Vyčistí všechny filtry a localStorage
   */
  const handleClearFilters = useCallback(() => {
    const emptyFilters = {
      cislo_objednavky: '',
      predmet: '',
      dodavatel_nazev: '',
      objednatel_jmeno: '',
      garant_jmeno: '',
      prikazce_jmeno: '',
      schvalovatel_jmeno: '',
      financovani: '',
      stav_workflow: '',
      datum_od: '',
      datum_do: '',
      cena_max: '',
      cena_polozky: '',
      cena_faktury: '',
    };
    
    setColumnFilters(emptyFilters);
    
    // Clear filters from localStorage
    if (userId) {
      localStorage.removeItem(`ordersV3_columnFilters_${userId}`);
    }
    
    setDashboardFilters({
      filter_status: '',
      filter_my_orders: false,
      filter_archivovano: false,
    });
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
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset na první stránku
  }, []);
  
  // ============================================================================
  // FUNKCE - Column Configuration
  // ============================================================================
  
  /**
   * Změní viditelnost sloupce
   */
  const handleColumnVisibilityChange = useCallback((columnId, visible) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: visible,
    }));
  }, []);
  
  /**
   * Změní pořadí sloupců
   * @param {string|Array} fromColumnOrNewOrder - Buď ID sloupce který se přesouvá, nebo celé nové pole
   * @param {string} [toColumn] - ID sloupce kam se přesouvá (pokud je první param string)
   */
  const handleColumnOrderChange = useCallback((fromColumnOrNewOrder, toColumn) => {
    // console.log('🔄 Orders V3: Column reorder requested:', { fromColumnOrNewOrder, toColumn });
    
    if (Array.isArray(fromColumnOrNewOrder)) {
      // Přijato celé nové pole
      // console.log('📋 Orders V3: Setting new column order:', fromColumnOrNewOrder);
      setColumnOrder(fromColumnOrNewOrder);
      // Uložit do localStorage (per user)
      if (userId) {
        try {
          localStorage.setItem(`ordersV3_columnOrder_${userId}`, JSON.stringify(fromColumnOrNewOrder));
          // console.log('💾 Orders V3: Column order saved to localStorage');
        } catch (err) {
          console.warn('Failed to save column order:', err);
        }
      }
    } else if (typeof fromColumnOrNewOrder === 'string' && toColumn) {
      // Přijato (fromColumn, toColumn)
      setColumnOrder(prevOrder => {
        const fromIndex = prevOrder.indexOf(fromColumnOrNewOrder);
        const toIndex = prevOrder.indexOf(toColumn);
        
        // console.log('📋 Orders V3: Moving column:', {
        //   from: fromColumnOrNewOrder,
        //   fromIndex,
        //   to: toColumn,
        //   toIndex,
        //   currentOrder: prevOrder
        // });
        
        if (fromIndex === -1 || toIndex === -1) {
          console.warn('⚠️ Orders V3: Invalid column indices!');
          return prevOrder;
        }
        
        const newOrder = [...prevOrder];
        newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, fromColumnOrNewOrder);
        
        // console.log('✅ Orders V3: New column order:', newOrder);
        
        // Uložit do localStorage (per user)
        if (userId) {
          try {
            localStorage.setItem(`ordersV3_columnOrder_${userId}`, JSON.stringify(newOrder));
            // console.log('💾 Orders V3: Column order saved to localStorage');
          } catch (err) {
            console.warn('Failed to save column order:', err);
          }
        }
        
        return newOrder;
      });
    }
  }, [userId]);
  
  /**
   * Resetuje konfiguraci sloupců na výchozí
   */
  const handleResetColumnConfig = useCallback(() => {
    setColumnVisibility({
      expander: true,
      approve: true,
      dt_objednavky: true,
      cislo_objednavky: true,
      financovani: true,
      objednatel_garant: true,
      prikazce_schvalovatel: true,
      dodavatel_nazev: true,
      stav_objednavky: true,
      stav_registru: true,
      max_cena_s_dph: true,
      cena_s_dph: true,
      faktury_celkova_castka_s_dph: true,
      actions: true,
    });
    setColumnOrder([
      'expander',
      'approve',
      'dt_objednavky',
      'cislo_objednavky',
      'financovani',
      'objednatel_garant',
      'prikazce_schvalovatel',
      'dodavatel_nazev',
      'stav_objednavky',
      'stav_registru',
      'max_cena_s_dph',
      'cena_s_dph',
      'faktury_celkova_castka_s_dph',
      'actions',
    ]);
  }, []);
  
  // ============================================================================
  // FUNKCE - Expanded Rows (Lazy Loading)
  // ============================================================================
  
  /**
   * Toggle rozbalení řádku (s lazy loading detailu)
   */
  const handleToggleRow = useCallback(async (orderId) => {
    const isExpanded = expandedRows[orderId];
    
    setExpandedRows(prev => ({
      ...prev,
      [orderId]: !isExpanded,
    }));
    
    // Pokud rozbalujeme a ještě nemáme data, načíst je
    if (!isExpanded && !subRowsData[orderId]) {
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
  }, [expandedRows, subRowsData, token, username]);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  /**
   * Načíst data při změně závislostí
   */
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);
  
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
  // RETURN
  // ============================================================================
  
  return {
    // Data
    orders,
    loading,
    error,
    stats,
    
    // Pagination
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
    
    // Filtry
    selectedYear,
    setSelectedYear,
    columnFilters,
    dashboardFilters,
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
  };
}

export default useOrdersV3;
