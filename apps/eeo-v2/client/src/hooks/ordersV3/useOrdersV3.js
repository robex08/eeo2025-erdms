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
    approve: false,
    dt_objednavky: true,
    cislo_objednavky: true,
    zpusob_financovani: true,
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
  
  const [columnOrder, setColumnOrder] = useState([
    'expander',
    'approve',
    'dt_objednavky',
    'cislo_objednavky',
    'zpusob_financovani',
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
      
      // PLACEHOLDER - mockovaná testovací data pro vizualizaci
      const mockOrders = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        cislo_objednavky: `OBJ-2026-${String(i + 1).padStart(4, '0')}`,
        predmet: `Testovací objednávka ${i + 1} - dodávka materiálu`,
        poznamka: i % 2 === 0 ? `Poznámka k objednávce ${i + 1}` : null,
        dt_objednavky: new Date(2026, 0, Math.floor(Math.random() * 23) + 1).toISOString(),
        dt_vytvoreni: new Date(2026, 0, Math.floor(Math.random() * 23) + 1).toISOString(),
        dt_aktualizace: new Date(2026, 0, 23).toISOString(),
        stav_objednavky: ['NOVA', 'SCHVALENA', 'ROZPRACOVANA', 'DOKONCENA'][i % 4],
        stav_workflow: {
          kod_stavu: ['NOVA', 'SCHVALENA', 'ROZPRACOVANA', 'DOKONCENA'][i % 4],
          nazev_stavu: ['Nová', 'Schválená', 'Rozpracovaná', 'Dokončená'][i % 4],
        },
        max_cena_s_dph: 50000 + (i * 10000),
        polozky_celkova_cena_s_dph: 45000 + (i * 9000),
        faktury_celkova_castka_s_dph: i % 3 === 0 ? 45000 + (i * 9000) : 0,
        dodavatel_nazev: `Dodavatel ${String.fromCharCode(65 + (i % 10))} s.r.o.`,
        dodavatel_ico: `1234567${i % 10}`,
        polozky: [
          {
            nazev: `Položka ${i + 1}.1 - Materiál typu A`,
            popis: 'Popis položky',
            mnozstvi: 10 + i,
            jednotka: 'ks',
            cena_s_dph: 4500 + (i * 900),
          },
          {
            nazev: `Položka ${i + 1}.2 - Materiál typu B`,
            popis: 'Další popis',
            mnozstvi: 5 + i,
            jednotka: 'ks',
            cena_s_dph: 3000 + (i * 600),
          },
          {
            nazev: `Položka ${i + 1}.3 - Služba`,
            popis: 'Servisní práce',
            mnozstvi: 2,
            jednotka: 'hod',
            cena_s_dph: 1500,
          },
        ],
        prilohy: i % 2 === 0 ? [
          { nazev: 'priloha1.pdf', velikost: 1024 * 150 },
          { nazev: 'priloha2.docx', velikost: 1024 * 80 },
        ] : [],
        objednatel_uzivatel: {
          cele_jmeno: `Jan Novák ${i + 1}`,
        },
        garant_uzivatel: {
          cele_jmeno: `Petr Svoboda ${i + 1}`,
        },
        prikazce_uzivatel: {
          cele_jmeno: `Marie Dvořáková ${i + 1}`,
        },
        schvalovatel_uzivatel: {
          cele_jmeno: `Pavel Černý ${i + 1}`,
        },
        financovani: {
          typ: 'LP',
          typ_nazev: 'Limitovaný příslib',
          lp_kody: ['LP-2026-001', 'LP-2026-002'],
        },
        registr_smluv: i % 4 === 0 ? {
          dt_zverejneni: new Date(2026, 0, 15).toISOString(),
          registr_iddt: `RS-${i + 1}`,
        } : null,
        mimoradna_udalost: i === 0 ? true : false,
      }));
      
      const mockResponse = {
        orders: mockOrders,
        pagination: {
          current_page: currentPage,
          total_pages: 3,
          total: 127,
          per_page: itemsPerPage,
        },
        stats: {
          total: 127,
          totalAmount: 8456789,
          filteredTotalAmount: 8456789,
          nova: 23,
          ke_schvaleni: 15,
          schvalena: 31,
          zamitnuta: 3,
          rozpracovana: 28,
          odeslana: 12,
          potvrzena: 8,
          k_uverejneni_do_registru: 5,
          uverejnena: 18,
          ceka_potvrzeni: 0,
          ceka_se: 0,
          fakturace: 0,
          vecna_spravnost: 0,
          dokoncena: 24,
          zrusena: 7,
          smazana: 2,
          archivovano: 11,
          withInvoices: 45,
          withAttachments: 67,
          mimoradneUdalosti: 1,
          mojeObjednavky: 34,
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
