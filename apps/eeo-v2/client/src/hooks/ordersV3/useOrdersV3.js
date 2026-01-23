/**
 * useOrdersV3.js
 * 
 * Custom hook pro Orders V3 - komplexní state management
 * Centralizovaná logika pro načítání dat, filtrování, pagination a caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

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
  // STATE - Pagination (Server-side)
  // ============================================================================
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  
  // ============================================================================
  // STATE - Filtry
  // ============================================================================
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Sloupcové filtry (pro backend)
  const [columnFilters, setColumnFilters] = useState({
    cislo_objednavky: '',
    predmet: '',
    dodavatel: '',
    uzivatel: '',
    stav: '',
    datum_od: '',
    datum_do: '',
    cena_min: '',
    cena_max: '',
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
    nova: 0,
    schvalena: 0,
    odeslana: 0,
    archivovano: 0,
    storno: 0,
    total_amount: 0,
    nova_amount: 0,
    schvalena_amount: 0,
  });
  
  // ============================================================================
  // STATE - Table Configuration (pro drag&drop, hide/show columns)
  // ============================================================================
  
  const [columnVisibility, setColumnVisibility] = useState({
    cislo_objednavky: true,
    predmet: true,
    dodavatel_nazev: true,
    dt_objednavky: true,
    max_cena_s_dph: true,
    stav_objednavky: true,
    vytvoril_uzivatel: true,
    akce: true,
    // ... další sloupce
  });
  
  const [columnOrder, setColumnOrder] = useState([
    'cislo_objednavky',
    'predmet',
    'dodavatel_nazev',
    'dt_objednavky',
    'max_cena_s_dph',
    'stav_objednavky',
    'vytvoril_uzivatel',
    'akce',
  ]);
  
  // ============================================================================
  // STATE - Expanded rows (pro lazy loading subrows)
  // ============================================================================
  
  const [expandedRows, setExpandedRows] = useState({});
  const [subRowsData, setSubRowsData] = useState({}); // Cache pro načtené detaily
  
  // ============================================================================
  // REF - Debounce timers
  // ============================================================================
  
  const filterDebounceTimers = useRef({});
  
  // ============================================================================
  // FUNKCE - Načítání dat
  // ============================================================================
  
  /**
   * Načte objednávky z API (placeholder - bude implementováno s BE API)
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
      console.log('📋 useOrdersV3: Loading orders...', {
        page: currentPage,
        per_page: itemsPerPage,
        year: selectedYear,
        columnFilters,
        dashboardFilters,
      });
      
      // TODO: Implementovat skutečné API volání
      // const response = await listOrdersV3({
      //   token,
      //   username,
      //   page: currentPage,
      //   per_page: itemsPerPage,
      //   year: selectedYear,
      //   ...columnFilters,
      //   ...dashboardFilters,
      // });
      
      // PLACEHOLDER - zatím prázdná data
      const mockResponse = {
        orders: [],
        pagination: {
          current_page: currentPage,
          total_pages: 0,
          total: 0,
          per_page: itemsPerPage,
        },
        stats: {
          total: 0,
          nova: 0,
          schvalena: 0,
          odeslana: 0,
          archivovano: 0,
          storno: 0,
          total_amount: 0,
          nova_amount: 0,
          schvalena_amount: 0,
        },
      };
      
      // Aktualizovat state
      setOrders(mockResponse.orders);
      setTotalPages(mockResponse.pagination.total_pages || 0);
      setTotalItems(mockResponse.pagination.total || 0);
      setStats(mockResponse.stats || {});
      
      console.log('✅ useOrdersV3: Orders loaded', {
        count: mockResponse.orders.length,
        total: mockResponse.pagination.total,
      });
      
    } catch (err) {
      console.error('❌ useOrdersV3: Error loading orders:', err);
      setError(err?.message || 'Chyba při načítání objednávek');
      setOrders([]);
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
   */
  const handleColumnFilterChange = useCallback((filterName, value, debounceMs = 500) => {
    // Pro text inputy použít debounce
    if (typeof value === 'string' && debounceMs > 0) {
      // Clear previous timer
      if (filterDebounceTimers.current[filterName]) {
        clearTimeout(filterDebounceTimers.current[filterName]);
      }
      
      // Set new timer
      filterDebounceTimers.current[filterName] = setTimeout(() => {
        setColumnFilters(prev => ({
          ...prev,
          [filterName]: value,
        }));
        setCurrentPage(1); // Reset na první stránku
      }, debounceMs);
    } else {
      // Pro select, checkbox, atd. aplikovat hned
      setColumnFilters(prev => ({
        ...prev,
        [filterName]: value,
      }));
      setCurrentPage(1); // Reset na první stránku
    }
  }, []);
  
  /**
   * Změní dashboard filtr (status cards)
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
   * Vyčistí všechny filtry
   */
  const handleClearFilters = useCallback(() => {
    setColumnFilters({
      cislo_objednavky: '',
      predmet: '',
      dodavatel: '',
      uzivatel: '',
      stav: '',
      datum_od: '',
      datum_do: '',
      cena_min: '',
      cena_max: '',
    });
    setDashboardFilters({
      filter_status: '',
      filter_my_orders: false,
      filter_archivovano: false,
    });
    setCurrentPage(1);
  }, []);
  
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
   */
  const handleColumnOrderChange = useCallback((newOrder) => {
    setColumnOrder(newOrder);
  }, []);
  
  /**
   * Resetuje konfiguraci sloupců na výchozí
   */
  const handleResetColumnConfig = useCallback(() => {
    setColumnVisibility({
      cislo_objednavky: true,
      predmet: true,
      dodavatel_nazev: true,
      dt_objednavky: true,
      max_cena_s_dph: true,
      stav_objednavky: true,
      vytvoril_uzivatel: true,
      akce: true,
    });
    setColumnOrder([
      'cislo_objednavky',
      'predmet',
      'dodavatel_nazev',
      'dt_objednavky',
      'max_cena_s_dph',
      'stav_objednavky',
      'vytvoril_uzivatel',
      'akce',
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
        console.log('📋 Loading subrow data for order:', orderId);
        
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
