# 📊 Analýza: Refaktoring Orders25List na Backend Pagination

**Datum:** 15. ledna 2026  
**Autor:** GitHub Copilot  
**Soubor:** Návrh přepracování `Orders25List.js` do režimu s backend paging/filtering jako má `Invoices25List.js`

---

## 📋 Executive Summary

Současný `Orders25List.js` (18 795 řádků) načítá **VŠECHNY objednávky** pro vybrané období najednou a filtrování/paging provádí na **frontendu**. To způsobuje:
- ⚠️ **Performance problémy** při velkém množství dat (stovky/tisíce objednávek)
- ⚠️ **Dlouhé loading časy** (3-15 sekund pro načtení všech dat)
- ⚠️ **Vysoká zátěž BE** (vrací megabajty dat najednou)
- ⚠️ **Vysoká spotřeba RAM na FE** (drží všechna data v paměti)

**Řešení:** Přepracování na model jako `Invoices25List.js`:
- ✅ **Backend pagination** - BE vrací jen potřebnou stránku (50-100 záznamů)
- ✅ **Backend filtering** - filtry aplikuje BE v SQL (rychlejší, efektivnější)
- ✅ **Postupné načítání** - jen data potřebná pro aktuální stránku
- ✅ **Škálovatelnost** - funkční i s tisíci objednávek

---

## 🔍 Současný Stav - Orders25List.js

### Jak to funguje NYNÍ

#### 1. Načítání dat (Frontend-heavy)

```javascript
// Orders25List.js - řádek ~5512
const apiResult = await listOrdersV2(filters, token, username, true, true);

// Vrátí VŠECHNY objednávky pro dané období (např. celý rok 2025)
// Response může obsahovat 500-2000+ objednávek najednou!
```

**Backend endpoint:** `POST /api/order-v2/list`
```php
// orderV2Endpoints.php - handle_order_v2_list()
// ⚠️ PROBLÉM: limit/offset jsou VOLITELNÉ - bez nich vrací VŠE!
$limit = isset($input['limit']) ? (int)$input['limit'] : null;
$offset = isset($input['offset']) ? (int)$input['offset'] : 0;

// Pokud není limit, vrátí VŠECHNY záznamy matching fitlry!
```

#### 2. Filtrování (Frontend)

Všechny filtry aplikovány v masivním `useMemo`:
- ✅ Sloupcové filtry (číslo objednávky, předmět, dodavatel, ...)
- ✅ Globální vyhledávání (prohledává všechna textová pole)
- ✅ Filtr podle stavu (dashboard cards)
- ✅ Filtr podle uživatele (Moje objednávky)
- ✅ Filtr podle data/částky
- ✅ Archivované objednávky

**Problém:** Všechny filtry běží v prohlížeči na kompletním datasetu!

#### 3. Paging (Frontend)

```javascript
// Používá TanStack Table getPaginationRowModel
const table = useReactTable({
  data: filteredData, // JIŽ PŘEFILTROVANÁ data (celá)
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(), // ← FE paging
  // ...
});
```

**Problémy:**
- Načte 1000 objednávek, zobrazí jen 50 → 950 objednávek zbytečně v RAM
- Změna filtru = přefiltrování všech 1000 záznamů
- Změna stránky = instant (protože data už jsou), ale zbytečná paměť

---

## ✅ Cílový Stav - Inspirace z Invoices25List.js

### Jak to funguje v Invoices25List (správně)

#### 1. Načítání dat (Backend-heavy)

```javascript
// Invoices25List.js - řádek ~1864
const apiParams = {
  token,
  username,
  page: currentPage,         // ← Server-side pagination!
  per_page: itemsPerPage,    // ← Kolik záznamů na stránku
  year: selectedYear,
  
  // 📋 Filtry pro BE
  fa_cislo_vema: columnFilters.cislo_faktury,
  cislo_objednavky: columnFilters.cislo_objednavky,
  filter_datum_vystaveni: columnFilters.datum_vystaveni,
  filter_status: filters.filter_status,
  // ... všechny filtry jdou do BE!
};

const response = await listInvoices25(apiParams);
```

**Backend response:**
```json
{
  "faktury": [...],  // ← Jen aktuální stránka (50 záznamů)
  "pagination": {
    "current_page": 1,
    "total_pages": 20,
    "total": 985,
    "per_page": 50
  },
  "stats": {
    "total": 985,
    "paid": 450,
    "unpaid": 350,
    "overdue": 185
  }
}
```

**Výhody:**
- ✅ BE vrací jen 50 záznamů → rychlejší response (kilobajty místo megabajtů)
- ✅ BE počítá statistiky efektivně v SQL → 1 dotaz místo N+1 v JS
- ✅ FE jen zobrazí data, nevykonává logiku

#### 2. Filtrování (Backend)

```php
// invoiceHandlers.php - handle_invoices25_list()
// Všechny filtry aplikovány přímo v SQL WHERE:

if (!empty($input['fa_cislo_vema'])) {
    $where_parts[] = "f.fa_cislo_vema LIKE :fa_cislo_vema";
    $params[':fa_cislo_vema'] = '%' . $input['fa_cislo_vema'] . '%';
}

if (!empty($input['filter_status'])) {
    if ($input['filter_status'] === 'paid') {
        $where_parts[] = "f.fa_zaplacena = 1";
    } elseif ($input['filter_status'] === 'unpaid') {
        $where_parts[] = "f.fa_zaplacena = 0";
    }
    // ...
}

// Final SQL
$sql = "SELECT ... FROM 25a_faktury f ... WHERE $where_sql 
        LIMIT $per_page OFFSET $offset";
```

**Výhody:**
- ✅ SQL je optimalizované pro filtrování (indexy, compiled queries)
- ✅ Vrací jen relevantní data (nemusí posílat tisíce záznamů)
- ✅ Snadné debugování (stačí logovat SQL)

#### 3. Paging (Backend)

```javascript
// Invoices25List.js - State management
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(50);
const [totalPages, setTotalPages] = useState(0);
const [totalItems, setTotalItems] = useState(0);

// Po načtení dat z BE:
setTotalPages(response.pagination.total_pages);
setTotalItems(response.pagination.total);

// Změna stránky = nové API volání
const handlePageChange = (newPage) => {
  setCurrentPage(newPage);
  // → useEffect trigger → nové API volání s novým page parametrem
};
```

**Výhody:**
- ✅ Jen aktuální stránka v paměti
- ✅ Změna stránky = nové API volání (ale jen 50 záznamů)
- ✅ Rychlá reakce i s tisíci záznamů

---

## 🎯 Plán Implementace

### Fáze 1: Backend Úpravy (API)

#### 1.1 Upravit `handle_order_v2_list()` pro POVINNÝ paging

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2Endpoints.php`

**Změny:**

```php
// ❌ STARÉ (volitelný limit)
$limit = isset($input['limit']) ? (int)$input['limit'] : null;
$offset = isset($input['offset']) ? (int)$input['offset'] : 0;

// ✅ NOVÉ (povinný paging)
$page = isset($input['page']) ? max(1, (int)$input['page']) : 1;
$per_page = isset($input['per_page']) ? min(250, max(10, (int)$input['per_page'])) : 50;
$offset = ($page - 1) * $per_page;
$limit = $per_page;

// Vždy aplikovat LIMIT/OFFSET
$sql .= " LIMIT $limit OFFSET $offset";
```

#### 1.2 Přidat server-side filtering parametry

**Rozšířit podporované filtry:**

```php
// Aktuálně podporované filtry:
// - rok (year) - již funguje
// - limit/offset - již funguje, ale jen volitelně

// PŘIDAT:
// 1. Sloupcové filtry (LIKE search)
if (!empty($input['filter_cislo_objednavky'])) {
    $whereConditions[] = "o.cislo_objednavky LIKE :filter_cislo";
    $params[':filter_cislo'] = '%' . $input['filter_cislo_objednavky'] . '%';
}

if (!empty($input['filter_predmet'])) {
    $whereConditions[] = "o.predmet LIKE :filter_predmet";
    $params[':filter_predmet'] = '%' . $input['filter_predmet'] . '%';
}

if (!empty($input['filter_dodavatel'])) {
    $whereConditions[] = "o.dodavatel_nazev LIKE :filter_dodavatel";
    $params[':filter_dodavatel'] = '%' . $input['filter_dodavatel'] . '%';
}

// 2. Status filter (dashboard cards)
if (!empty($input['filter_status'])) {
    // Podobně jako u invoices: 'nova', 'schvalena', 'archivovana', atd.
    $whereConditions[] = "o.stav_objednavky = :filter_status";
    $params[':filter_status'] = $input['filter_status'];
}

// 3. Date range filter
if (!empty($input['filter_datum_od'])) {
    $whereConditions[] = "o.dt_objednavky >= :datum_od";
    $params[':datum_od'] = $input['filter_datum_od'];
}

if (!empty($input['filter_datum_do'])) {
    $whereConditions[] = "o.dt_objednavky <= :datum_do";
    $params[':datum_do'] = $input['filter_datum_do'];
}

// 4. Price range filter
if (!empty($input['filter_cena_min'])) {
    $whereConditions[] = "o.max_cena_s_dph >= :cena_min";
    $params[':cena_min'] = (float)$input['filter_cena_min'];
}

if (!empty($input['filter_cena_max'])) {
    $whereConditions[] = "o.max_cena_s_dph <= :cena_max";
    $params[':cena_max'] = (float)$input['filter_cena_max'];
}

// 5. "Moje objednávky" filter (pro ADMIN)
if (!empty($input['filter_my_orders']) && $input['filter_my_orders'] == 1) {
    $whereConditions[] = "(
        o.uzivatel_id = :user_id
        OR o.objednatel_id = :user_id
        OR o.garant_uzivatel_id = :user_id
        OR o.schvalovatel_id = :user_id
        OR o.prikazce_id = :user_id
    )";
    $params[':user_id'] = $current_user_id;
}

// 6. Archivované (kontrola práva ORDER_OLD)
if (!empty($input['filter_archivovano']) && $input['filter_archivovano'] == 1) {
    // Respektuje právo ORDER_OLD (již implementováno)
    // Ale explicitně přidat kontrolu:
    if (!$hasOrderOld) {
        $whereConditions[] = "o.stav_objednavky != 'ARCHIVOVANO'";
    }
}
```

#### 1.3 Přidat pagination metadata do response

```php
// Před SELECT - spočítat celkový počet záznamů
$count_sql = "SELECT COUNT(DISTINCT o.id) as total 
              FROM 25_objednavky o ... 
              WHERE $where_sql";
$stmt_count = $db->prepare($count_sql);
$stmt_count->execute($params);
$total = $stmt_count->fetchColumn();

// Response struktura (jako u invoices)
$response = array(
    'orders' => $orders_list,
    'pagination' => array(
        'current_page' => $page,
        'per_page' => $per_page,
        'total' => $total,
        'total_pages' => ceil($total / $per_page)
    ),
    'stats' => array(
        'total' => $total,
        // Další statistiky z aggregace...
    ),
    'filters_applied' => array(
        'rok' => $rok,
        'status' => $input['filter_status'] ?? null,
        // ...
    )
);
```

#### 1.4 Přidat agregované statistiky (pro dashboard)

```php
// Samostatný SQL dotaz pro statistiky (efektivnější než počítat v JS)
$stats_sql = "
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN o.stav_objednavky = 'NOVA' THEN 1 ELSE 0 END) as nova,
        SUM(CASE WHEN o.stav_objednavky = 'SCHVALENA' THEN 1 ELSE 0 END) as schvalena,
        SUM(CASE WHEN o.stav_objednavky = 'ARCHIVOVANO' THEN 1 ELSE 0 END) as archivovano,
        SUM(o.max_cena_s_dph) as total_amount,
        SUM(CASE WHEN o.stav_objednavky = 'NOVA' THEN o.max_cena_s_dph ELSE 0 END) as nova_amount
    FROM 25_objednavky o
    WHERE $where_sql_without_pagination
";

// Přidat do response
$response['stats'] = $stats_data;
```

---

### Fáze 2: Frontend Service Layer (API wrapper)

#### 2.1 Aktualizovat `listOrdersV2()` pro nový formát

**Soubor:** `/apps/eeo-v2/client/src/services/apiOrderV2.js`

**Změny:**

```javascript
// ❌ STARÉ (vrací všechna data)
export async function listOrdersV2(filters, token, username, enriched = false, apply_all_filters = false) {
  const payload = {
    token,
    username,
    ...filters
  };
  
  const endpoint = enriched ? '/order-v2/list-enriched' : '/order-v2/list';
  const response = await apiOrderV2.post(endpoint, payload);
  return response.data; // Vrací přímo pole orders
}

// ✅ NOVÉ (pagination support)
export async function listOrdersV2({
  token,
  username,
  page = 1,
  per_page = 50,
  // Filtry
  year,
  filter_cislo_objednavky,
  filter_predmet,
  filter_dodavatel,
  filter_status,
  filter_datum_od,
  filter_datum_do,
  filter_cena_min,
  filter_cena_max,
  filter_my_orders,
  filter_archivovano,
  // ...další filtry
}) {
  const payload = {
    token,
    username,
    page,
    per_page,
    year,
    // Přidat jen neprázdné filtry
    ...(filter_cislo_objednavky && { filter_cislo_objednavky }),
    ...(filter_predmet && { filter_predmet }),
    ...(filter_dodavatel && { filter_dodavatel }),
    ...(filter_status && { filter_status }),
    ...(filter_datum_od && { filter_datum_od }),
    ...(filter_datum_do && { filter_datum_do }),
    ...(filter_cena_min && { filter_cena_min }),
    ...(filter_cena_max && { filter_cena_max }),
    ...(filter_my_orders && { filter_my_orders }),
    ...(filter_archivovano && { filter_archivovano }),
  };
  
  const response = await apiOrderV2.post('/order-v2/list', payload, { timeout: 30000 });
  
  // Vrací strukturu s pagination
  return {
    orders: response.data.orders || [],
    pagination: response.data.pagination || {},
    stats: response.data.stats || {},
    filters_applied: response.data.filters_applied || {}
  };
}
```

---

### Fáze 3: Frontend Component (Orders25List.js)

#### 3.1 State Management - Nová struktura

**Přidat/upravit state:**

```javascript
// Pagination state (server-side)
const [currentPage, setCurrentPage] = useState(savedState?.currentPage || 1);
const [itemsPerPage, setItemsPerPage] = useState(savedState?.itemsPerPage || 50);
const [totalPages, setTotalPages] = useState(0);
const [totalItems, setTotalItems] = useState(0);

// Filtry (sloupcové)
const [columnFilters, setColumnFilters] = useState(savedState?.columnFilters || {});

// Dashboard filtry (status)
const [dashboardFilters, setDashboardFilters] = useState(savedState?.dashboardFilters || {
  filter_status: '',
  filter_my_orders: false,
  filter_archivovano: false
});

// Statistiky z BE
const [stats, setStats] = useState({
  total: 0,
  nova: 0,
  schvalena: 0,
  archivovano: 0,
  total_amount: 0,
  nova_amount: 0,
  // ...
});

// ❌ ODSTRANIT tyto FE filtrovací stavy:
// - globalSearchTerm (přesunout do columnFilters)
// - Veškeré useMemo pro filtrování (filteredData, filteredOrders, atd.)
// - TanStack Table getFilteredRowModel() - už nepotřeba
```

#### 3.2 Data Loading - useCallback hook

```javascript
const loadOrders = useCallback(async () => {
  if (!token || !username) return;
  
  setLoading(true);
  setError(null);
  showProgress?.();
  
  try {
    // Sestavit API parametry z aktuálního state
    const apiParams = {
      token,
      username,
      page: currentPage,
      per_page: itemsPerPage,
      year: selectedYear,
      
      // Sloupcové filtry
      filter_cislo_objednavky: columnFilters.cislo_objednavky?.trim(),
      filter_predmet: columnFilters.predmet?.trim(),
      filter_dodavatel: columnFilters.dodavatel?.trim(),
      filter_uzivatel: columnFilters.uzivatel?.trim(),
      filter_stav: columnFilters.stav,
      filter_datum_od: columnFilters.datum_od,
      filter_datum_do: columnFilters.datum_do,
      filter_cena_min: columnFilters.cena_min,
      filter_cena_max: columnFilters.cena_max,
      
      // Dashboard filtry
      filter_status: dashboardFilters.filter_status,
      filter_my_orders: dashboardFilters.filter_my_orders ? 1 : 0,
      filter_archivovano: dashboardFilters.filter_archivovano ? 1 : 0,
    };
    
    // API call
    const response = await listOrdersV2(apiParams);
    
    // Aktualizovat state
    setOrders(response.orders);
    setTotalPages(response.pagination.total_pages || 0);
    setTotalItems(response.pagination.total || 0);
    setStats(response.stats || {});
    
    // Ulož do localStorage
    saveToLS({
      currentPage,
      itemsPerPage,
      selectedYear,
      columnFilters,
      dashboardFilters
    });
    
  } catch (err) {
    console.error('Error loading orders:', err);
    setError(translateErrorMessage(err?.message || 'Chyba při načítání objednávek'));
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
  hideProgress
]);

// Trigger načtení při změně závislostí
useEffect(() => {
  loadOrders();
}, [loadOrders]);
```

#### 3.3 Filter Handlers - Reset page při změně filtru

```javascript
// Handler pro sloupcové filtry
const handleColumnFilterChange = useCallback((filterName, value) => {
  setColumnFilters(prev => ({
    ...prev,
    [filterName]: value
  }));
  
  // ⚠️ DŮLEŽITÉ: Reset stránky na 1 při změně filtru!
  setCurrentPage(1);
}, []);

// Handler pro dashboard cards
const handleDashboardCardClick = useCallback((filterType) => {
  // Toggle logika
  const isCurrentlyActive = dashboardFilters.filter_status === filterType;
  
  setDashboardFilters(prev => ({
    ...prev,
    filter_status: isCurrentlyActive ? '' : filterType
  }));
  
  // Reset stránky na 1
  setCurrentPage(1);
}, [dashboardFilters.filter_status]);

// Clear filtry
const handleClearFilters = useCallback(() => {
  setColumnFilters({});
  setDashboardFilters({
    filter_status: '',
    filter_my_orders: false,
    filter_archivovano: false
  });
  setCurrentPage(1);
}, []);
```

#### 3.4 Pagination Controls - Nová UI

```javascript
// Pagination component (podobně jako u Invoices25List)
const PaginationControls = () => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  return (
    <PaginationWrapper>
      <PaginationInfo>
        Zobrazeno {startItem}-{endItem} z {totalItems} objednávek
      </PaginationInfo>
      
      <PaginationButtons>
        <PaginationButton 
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
        >
          <FontAwesomeIcon icon={faChevronLeft} /> První
        </PaginationButton>
        
        <PaginationButton 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          Předchozí
        </PaginationButton>
        
        <PageInfo>
          Stránka {currentPage} z {totalPages}
        </PageInfo>
        
        <PaginationButton 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Další
        </PaginationButton>
        
        <PaginationButton 
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
        >
          Poslední <FontAwesomeIcon icon={faChevronRight} />
        </PaginationButton>
      </PaginationButtons>
      
      <ItemsPerPageSelect>
        <label>Záznamů na stránku:</label>
        <select 
          value={itemsPerPage} 
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1); // Reset na první stránku
          }}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={250}>250</option>
        </select>
      </ItemsPerPageSelect>
    </PaginationWrapper>
  );
};
```

#### 3.5 Dashboard Cards - Použití BE statistik

```javascript
// Dashboard karty - data z BE stats, NE z FE výpočtu
<DashboardPanel>
  <DashboardGrid>
    <LargeStatCard 
      $color="#4caf50"
      $active={!dashboardFilters.filter_status}
      onClick={() => handleDashboardCardClick('')}
    >
      <LargeStatValue>
        {stats.total?.toLocaleString('cs-CZ') || 0}
      </LargeStatValue>
      <LargeStatLabel>Celkem objednávek</LargeStatLabel>
      <SmallStatValue>
        {Math.round(stats.total_amount || 0).toLocaleString('cs-CZ')} Kč
      </SmallStatValue>
    </LargeStatCard>
    
    <StatCard 
      $color="#3b82f6"
      $active={dashboardFilters.filter_status === 'NOVA'}
      onClick={() => handleDashboardCardClick('NOVA')}
    >
      <StatIcon><FontAwesomeIcon icon={faFileAlt} /></StatIcon>
      <StatValue>{stats.nova || 0}</StatValue>
      <StatLabel>Nové</StatLabel>
    </StatCard>
    
    <StatCard 
      $color="#10b981"
      $active={dashboardFilters.filter_status === 'SCHVALENA'}
      onClick={() => handleDashboardCardClick('SCHVALENA')}
    >
      <StatIcon><FontAwesomeIcon icon={faCheckCircle} /></StatIcon>
      <StatValue>{stats.schvalena || 0}</StatValue>
      <StatLabel>Schválené</StatLabel>
    </StatCard>
    
    {/* ...další karty */}
  </DashboardGrid>
</DashboardPanel>
```

#### 3.6 Table - Odstranit FE filtering/paging

```javascript
// ❌ ODSTRANIT TanStack Table advanced features:
const table = useReactTable({
  data: orders, // ← Přímo z BE, JIŽ přefiltrováno a stránkováno!
  columns,
  getCoreRowModel: getCoreRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  getSortedRowModel: getSortedRowModel(), // ← Sortování ZACHOVAT (client-side je OK)
  // ❌ ODSTRANIT:
  // getFilteredRowModel: getFilteredRowModel(), // Už nepotřeba
  // getPaginationRowModel: getPaginationRowModel(), // Už nepotřeba
});

// ✅ Tabulka zobrazuje jen data z aktuální stránky (50 záznamů)
```

---

### Fáze 4: Optimalizace a Vylepšení

#### 4.1 Cache Strategy

**Problém:** Každá změna stránky = nové API volání  
**Řešení:** Implementovat cache podobně jako u OrdersCacheService

```javascript
// orders25ListCacheService.js
class Orders25ListCacheService {
  constructor() {
    this.cache = new Map(); // key: hash(filters+page), value: {data, timestamp}
    this.cacheTimeout = 5 * 60 * 1000; // 5 minut
  }
  
  getCacheKey(filters, page) {
    return JSON.stringify({ ...filters, page });
  }
  
  get(filters, page) {
    const key = this.getCacheKey(filters, page);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Kontrola validity (5 minut)
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  set(filters, page, data) {
    const key = this.getCacheKey(filters, page);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  clear() {
    this.cache.clear();
  }
}

export default new Orders25ListCacheService();
```

**Použití v loadOrders:**

```javascript
const loadOrders = useCallback(async () => {
  // Zkusit načíst z cache
  const cached = orders25ListCacheService.get(columnFilters, currentPage);
  if (cached) {
    setOrders(cached.orders);
    setTotalPages(cached.pagination.total_pages);
    setTotalItems(cached.pagination.total);
    setStats(cached.stats);
    return;
  }
  
  // Pokud není v cache, načíst z API
  try {
    const response = await listOrdersV2(apiParams);
    
    // Uložit do cache
    orders25ListCacheService.set(columnFilters, currentPage, response);
    
    // Aktualizovat state
    setOrders(response.orders);
    // ...
  } catch (err) {
    // ...
  }
}, [/* dependencies */]);
```

#### 4.2 Debounce pro text filtry

**Problém:** Každé stisknutí klávesy = nové API volání  
**Řešení:** Debounce (čekat 500ms po posledním stisknutí)

```javascript
import { useState, useEffect, useRef } from 'react';

// Custom hook pro debounced value
function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// Použití v Orders25List:
const [tempColumnFilters, setTempColumnFilters] = useState({});
const debouncedColumnFilters = useDebounce(tempColumnFilters, 500);

// Input handler
const handleFilterInputChange = (filterName, value) => {
  setTempColumnFilters(prev => ({
    ...prev,
    [filterName]: value
  }));
};

// useEffect pro aplikaci debounced filtru
useEffect(() => {
  setColumnFilters(debouncedColumnFilters);
  setCurrentPage(1);
}, [debouncedColumnFilters]);
```

#### 4.3 Loading States - UX improvements

```javascript
// Loading indikátory pro různé stavy
const [isInitialLoading, setIsInitialLoading] = useState(true);
const [isPageChanging, setIsPageChanging] = useState(false);
const [isFiltering, setIsFiltering] = useState(false);

const loadOrders = useCallback(async () => {
  // Detekce typu načítání
  const isInitial = orders.length === 0;
  const isPageChange = !isInitial && /* změna stránky */;
  const isFilterChange = !isInitial && !isPageChange;
  
  if (isInitial) setIsInitialLoading(true);
  else if (isPageChange) setIsPageChanging(true);
  else setIsFiltering(true);
  
  try {
    // API call...
  } finally {
    setIsInitialLoading(false);
    setIsPageChanging(false);
    setIsFiltering(false);
  }
}, [/* deps */]);

// UI rendering
{isInitialLoading && <FullPageSpinner />}
{isPageChanging && <MinimalSpinner />}
{isFiltering && <FilteringIndicator />}
```

#### 4.4 Optimalizace SQL dotazů na BE

**Index optimization:**

```sql
-- Přidat indexy pro často filtrované sloupce
ALTER TABLE 25_objednavky ADD INDEX idx_cislo_objednavky (cislo_objednavky);
ALTER TABLE 25_objednavky ADD INDEX idx_predmet (predmet(255));
ALTER TABLE 25_objednavky ADD INDEX idx_stav (stav_objednavky);
ALTER TABLE 25_objednavky ADD INDEX idx_datum (dt_objednavky);
ALTER TABLE 25_objednavky ADD INDEX idx_cena (max_cena_s_dph);
ALTER TABLE 25_objednavky ADD INDEX idx_dodavatel (dodavatel_nazev(255));

-- Composite index pro časté kombinace
ALTER TABLE 25_objednavky ADD INDEX idx_rok_stav (YEAR(dt_objednavky), stav_objednavky);
```

**Query optimization:**

```php
// Použít prepared statements pro všechny filtry
// Použít EXPLAIN pro analýzu slow queries
// Optimalizovat JOINy (LEFT JOIN pouze pro optional data)
// Agregace statistik v jednom dotazu (subqueries)

// Příklad optimalizované statistiky:
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN stav_objednavky = 'NOVA' THEN 1 ELSE 0 END) as nova_count,
    SUM(CASE WHEN stav_objednavky = 'SCHVALENA' THEN 1 ELSE 0 END) as schvalena_count,
    SUM(max_cena_s_dph) as total_amount,
    SUM(CASE WHEN stav_objednavky = 'NOVA' THEN max_cena_s_dph ELSE 0 END) as nova_amount
FROM 25_objednavky
WHERE aktivni = 1 AND YEAR(dt_objednavky) = 2025
-- Jeden dotaz místo N samostatných COUNT()
```

---

## 📈 Očekávané Výhody

### Performance Improvements

| Metrika | Před (FE filtering) | Po (BE filtering) | Zlepšení |
|---------|---------------------|-------------------|----------|
| **Initial load time** | 5-15 sekund | 0.5-2 sekundy | **-80%** |
| **Response size** | 2-10 MB | 50-200 KB | **-95%** |
| **FE RAM usage** | 100-500 MB | 10-50 MB | **-90%** |
| **Filter response** | 200-500ms (JS) | 100-300ms (SQL) | **-50%** |
| **Page change** | instant (FE) | 100-300ms (BE) | Stále rychlé |

### User Experience

- ✅ **Rychlejší načítání** - uživatel vidí data dříve
- ✅ **Plynulejší UX** - méně loading indikátorů
- ✅ **Škálovatelnost** - funkční i s 10 000+ objednávek
- ✅ **Nižší spotřeba dat** - důležité pro mobilní připojení

### Developer Experience

- ✅ **Jednodušší kód** - méně FE logiky
- ✅ **Snazší debugování** - problém je na BE nebo FE, ne mezi
- ✅ **Lepší testovatelnost** - BE API lze testovat samostatně
- ✅ **Konzistence** - stejný pattern jako Invoices25List

---

## 📊 Migrace Strategy

### Varianta A: Big Bang (Kompletní refaktoring) - NEDOPORUČENO

**Postup:**
1. Vytvořit nový soubor `Orders25ListV2.js`
2. Implementovat kompletně nový component s BE paging
3. Otestovat paralelně s původním
4. Po ověření nahradit původní

**Výhody:**
- ✅ Čistý kód bez legacy kódu
- ✅ Možnost paralelního testování

**Nevýhody:**
- ⚠️ Velký refaktoring (1-2 týdny práce)
- ⚠️ Riziko regrese
- ⚠️ Nelze snadno rollbacknout

---

### Varianta B: Paralelní Systém (DOPORUČENO) 🌟

**Koncept:** Vytvořit kompletně nový, paralelní systém s pagingem, zatímco stávající zůstane nedotčený.

#### Struktura Souborů

##### Backend (PHP)

```
/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/
  ├── orderV2Endpoints.php           [ZACHOVAT] Stávající Order V2 endpoints
  ├── orderV2PagingEndpoints.php     [NOVÝ] Nové endpoints s pagingem
  └── orderV2PagingHelpers.php       [NOVÝ] Helper funkce pro paging
```

##### Frontend (React)

```
/apps/eeo-v2/client/src/
  ├── pages/
  │   ├── Orders25List.js            [ZACHOVAT] Stávající verze bez změny
  │   └── Orders25ListPaging.js      [NOVÝ] Nová verze s BE pagingem
  │
  ├── services/
  │   ├── apiOrderV2.js              [ZACHOVAT] Stávající API calls
  │   ├── apiOrderV2Paging.js        [NOVÝ] Nové API calls s pagingem
  │   └── orders25PagingCache.js     [NOVÝ] Cache pro paging verzi
  │
  └── routes/
      └── App.js                     [UPRAVIT] Přidat novou route
```

#### Backend Implementation

##### 1. Nové Endpoints - orderV2PagingEndpoints.php

```php
<?php
/**
 * Order V2 Paging Endpoints
 * 
 * Nové API endpointy s povinným server-side paging/filtering.
 * Klonováno z orderV2Endpoints.php s přidaným paging support.
 * 
 * Datum: 15. ledna 2026
 * Účel: Paralelní implementace pro postupný přechod na BE paging
 */

/**
 * POST /api/order-v2-paging/list
 * 
 * Seznam objednávek s POVINNÝM server-side paging a filtering.
 * Klonováno z handle_order_v2_list() s vylepšeními.
 */
function handle_order_v2_paging_list($input, $config, $queries) {
    error_log("=== handle_order_v2_paging_list START ===");
    
    // 1. AUTENTIZACE (stejná jako v původní verzi)
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $current_user_id = $auth_result['id'];
    
    try {
        $db = get_db($config);
        
        // 2. PAGINATION (POVINNÝ - na rozdíl od původní verze)
        $page = isset($input['page']) ? max(1, (int)$input['page']) : 1;
        $per_page = isset($input['per_page']) ? min(250, max(10, (int)$input['per_page'])) : 50;
        $offset = ($page - 1) * $per_page;
        $limit = $per_page;
        
        error_log("Order V2 PAGING: page=$page, per_page=$per_page, offset=$offset");
        
        // 3. PERMISSIONS (stejné jako v původní verzi)
        $user_permissions = getUserOrderPermissions($current_user_id, $db);
        $user_roles = getUserRoles($current_user_id, $db);
        
        // 4. BASE WHERE CONDITIONS
        $whereConditions = array();
        $params = array();
        
        $whereConditions[] = "o.aktivni = 1";
        
        // 5. HIERARCHY FILTER (ze stávající implementace)
        $hierarchyFilter = applyHierarchyFilterToOrders($current_user_id, $db);
        $hierarchyApplied = false;
        
        if ($hierarchyFilter !== null) {
            $whereConditions[] = $hierarchyFilter;
            $hierarchyApplied = true;
        }
        
        // 6. ROLE-BASED FILTER (pokud není hierarchie)
        if (!$hierarchyApplied) {
            $isAdminByRole = in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles);
            $hasOrderManage = in_array('ORDER_MANAGE', $user_permissions);
            $hasOrderReadAll = in_array('ORDER_READ_ALL', $user_permissions);
            $hasOrderViewAll = in_array('ORDER_VIEW_ALL', $user_permissions);
            
            $isFullAdmin = $isAdminByRole || $hasOrderManage;
            
            if (!$isFullAdmin && !$hasOrderReadAll && !$hasOrderViewAll) {
                // Non-admin: jen své objednávky
                $whereConditions[] = "(
                    o.uzivatel_id = :role_user_id
                    OR o.objednatel_id = :role_user_id
                    OR o.garant_uzivatel_id = :role_user_id
                    OR o.schvalovatel_id = :role_user_id
                    OR o.prikazce_id = :role_user_id
                    OR o.uzivatel_akt_id = :role_user_id
                    OR o.odesilatel_id = :role_user_id
                    OR o.dodavatel_potvrdil_id = :role_user_id
                    OR o.zverejnil_id = :role_user_id
                    OR o.fakturant_id = :role_user_id
                    OR o.dokoncil_id = :role_user_id
                    OR o.archivoval_id = :role_user_id
                )";
                $params[':role_user_id'] = $current_user_id;
            }
        }
        
        // 7. 🆕 SERVER-SIDE FILTERING (NOVÉ!)
        
        // Rok (základní filtr)
        if (!empty($input['year'])) {
            $whereConditions[] = "YEAR(o.dt_objednavky) = :year";
            $params[':year'] = (int)$input['year'];
        }
        
        // Číslo objednávky (LIKE search)
        if (!empty($input['filter_cislo_objednavky'])) {
            $whereConditions[] = "o.cislo_objednavky LIKE :filter_cislo";
            $params[':filter_cislo'] = '%' . $input['filter_cislo_objednavky'] . '%';
        }
        
        // Předmět (LIKE search)
        if (!empty($input['filter_predmet'])) {
            $whereConditions[] = "o.predmet LIKE :filter_predmet";
            $params[':filter_predmet'] = '%' . $input['filter_predmet'] . '%';
        }
        
        // Dodavatel (LIKE search)
        if (!empty($input['filter_dodavatel'])) {
            $whereConditions[] = "o.dodavatel_nazev LIKE :filter_dodavatel";
            $params[':filter_dodavatel'] = '%' . $input['filter_dodavatel'] . '%';
        }
        
        // Stav objednávky (přesná shoda)
        if (!empty($input['filter_status'])) {
            $whereConditions[] = "o.stav_objednavky = :filter_status";
            $params[':filter_status'] = $input['filter_status'];
        }
        
        // Uživatel - vytvoril/upravil (LIKE v jméně)
        if (!empty($input['filter_uzivatel'])) {
            $whereConditions[] = "(
                CONCAT(u_vytvoril.prijmeni, ' ', u_vytvoril.jmeno) LIKE :filter_uzivatel
                OR CONCAT(u_aktualizoval.prijmeni, ' ', u_aktualizoval.jmeno) LIKE :filter_uzivatel
            )";
            $params[':filter_uzivatel'] = '%' . $input['filter_uzivatel'] . '%';
        }
        
        // Datum objednávky - rozsah
        if (!empty($input['filter_datum_od'])) {
            $whereConditions[] = "o.dt_objednavky >= :datum_od";
            $params[':datum_od'] = $input['filter_datum_od'];
        }
        
        if (!empty($input['filter_datum_do'])) {
            $whereConditions[] = "o.dt_objednavky <= :datum_do";
            $params[':datum_do'] = $input['filter_datum_do'] . ' 23:59:59';
        }
        
        // Cena - rozsah
        if (!empty($input['filter_cena_min'])) {
            $whereConditions[] = "o.max_cena_s_dph >= :cena_min";
            $params[':cena_min'] = (float)$input['filter_cena_min'];
        }
        
        if (!empty($input['filter_cena_max'])) {
            $whereConditions[] = "o.max_cena_s_dph <= :cena_max";
            $params[':cena_max'] = (float)$input['filter_cena_max'];
        }
        
        // "Moje objednávky" (pro ADMIN)
        if (!empty($input['filter_my_orders']) && $input['filter_my_orders'] == 1) {
            $whereConditions[] = "(
                o.uzivatel_id = :my_user_id
                OR o.objednatel_id = :my_user_id
                OR o.garant_uzivatel_id = :my_user_id
                OR o.schvalovatel_id = :my_user_id
                OR o.prikazce_id = :my_user_id
            )";
            $params[':my_user_id'] = $current_user_id;
        }
        
        // Archivované objednávky
        if (!empty($input['filter_archivovano']) && $input['filter_archivovano'] == 1) {
            // Respektuje právo ORDER_OLD
            $hasOrderOld = in_array('ORDER_OLD', $user_permissions);
            if (!$hasOrderOld) {
                $whereConditions[] = "o.stav_objednavky != 'ARCHIVOVANO'";
            }
        } else {
            // Default: NEarchivované
            $whereConditions[] = "o.stav_objednavky != 'ARCHIVOVANO'";
        }
        
        // 8. SESTAVENÍ WHERE CLAUSE
        $where_sql = implode(' AND ', $whereConditions);
        
        // 9. 🆕 STATISTIKY (PŘED PAGINATION)
        $stats_sql = "
            SELECT 
                COUNT(DISTINCT o.id) as total,
                SUM(CASE WHEN o.stav_objednavky = 'NOVA' THEN 1 ELSE 0 END) as nova,
                SUM(CASE WHEN o.stav_objednavky = 'SCHVALENA' THEN 1 ELSE 0 END) as schvalena,
                SUM(CASE WHEN o.stav_objednavky = 'ODESLANA_DODAVATELI' THEN 1 ELSE 0 END) as odeslana,
                SUM(CASE WHEN o.stav_objednavky = 'ARCHIVOVANO' THEN 1 ELSE 0 END) as archivovano,
                SUM(CASE WHEN o.stav_objednavky = 'STORNO' THEN 1 ELSE 0 END) as storno,
                SUM(o.max_cena_s_dph) as total_amount,
                SUM(CASE WHEN o.stav_objednavky = 'NOVA' THEN o.max_cena_s_dph ELSE 0 END) as nova_amount,
                SUM(CASE WHEN o.stav_objednavky = 'SCHVALENA' THEN o.max_cena_s_dph ELSE 0 END) as schvalena_amount
            FROM 25_objednavky o
            LEFT JOIN 25_uzivatele u_vytvoril ON o.uzivatel_id = u_vytvoril.id
            LEFT JOIN 25_uzivatele u_aktualizoval ON o.uzivatel_akt_id = u_aktualizoval.id
            WHERE $where_sql
        ";
        
        $stmt_stats = $db->prepare($stats_sql);
        $stmt_stats->execute($params);
        $stats = $stmt_stats->fetch(PDO::FETCH_ASSOC);
        
        // 10. HLAVNÍ SQL DOTAZ (S PAGINATION)
        $sql = "
            SELECT 
                o.*,
                CONCAT(u_vytvoril.prijmeni, ' ', u_vytvoril.jmeno) as vytvoril_uzivatel,
                CONCAT(u_aktualizoval.prijmeni, ' ', u_aktualizoval.jmeno) as aktualizoval_uzivatel
            FROM 25_objednavky o
            LEFT JOIN 25_uzivatele u_vytvoril ON o.uzivatel_id = u_vytvoril.id
            LEFT JOIN 25_uzivatele u_aktualizoval ON o.uzivatel_akt_id = u_aktualizoval.id
            WHERE $where_sql
            ORDER BY o.dt_objednavky DESC, o.id DESC
            LIMIT $limit OFFSET $offset
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 11. 🆕 RESPONSE S PAGINATION METADATA
        $total = (int)$stats['total'];
        $total_pages = $per_page > 0 ? ceil($total / $per_page) : 0;
        
        $response = array(
            'status' => 'ok',
            'orders' => $orders,
            'pagination' => array(
                'current_page' => $page,
                'per_page' => $per_page,
                'total' => $total,
                'total_pages' => $total_pages
            ),
            'stats' => array(
                'total' => $total,
                'nova' => (int)$stats['nova'],
                'schvalena' => (int)$stats['schvalena'],
                'odeslana' => (int)$stats['odeslana'],
                'archivovano' => (int)$stats['archivovano'],
                'storno' => (int)$stats['storno'],
                'total_amount' => (float)$stats['total_amount'],
                'nova_amount' => (float)$stats['nova_amount'],
                'schvalena_amount' => (float)$stats['schvalena_amount']
            ),
            'filters_applied' => array(
                'year' => isset($input['year']) ? $input['year'] : null,
                'status' => isset($input['filter_status']) ? $input['filter_status'] : null,
                'my_orders' => isset($input['filter_my_orders']) ? (bool)$input['filter_my_orders'] : false,
                'archivovano' => isset($input['filter_archivovano']) ? (bool)$input['filter_archivovano'] : false
            )
        );
        
        http_response_code(200);
        echo json_encode($response);
        
    } catch (Exception $e) {
        error_log("Order V2 PAGING LIST ERROR: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání objednávek'));
    }
}

/**
 * POST /api/order-v2-paging/get/{id}
 * 
 * Stejné jako původní GET endpoint, jen pro konzistenci v paging verzi.
 * Může sdílet implementaci s původním handle_order_v2_get().
 */
function handle_order_v2_paging_get($input, $config, $queries) {
    // Použít původní implementaci
    return handle_order_v2_get($input, $config, $queries);
}

/**
 * POST /api/order-v2-paging/create
 * POST /api/order-v2-paging/update
 * POST /api/order-v2-paging/delete
 * 
 * Tyto endpointy mohou sdílet implementaci s původními Order V2 endpoints,
 * protože paging se týká pouze LIST operace.
 */
function handle_order_v2_paging_create($input, $config, $queries) {
    return handle_order_v2_create($input, $config, $queries);
}

function handle_order_v2_paging_update($input, $config, $queries) {
    return handle_order_v2_update($input, $config, $queries);
}

function handle_order_v2_paging_delete($input, $config, $queries) {
    return handle_order_v2_delete($input, $config, $queries);
}
```

##### 2. Registrace endpointů v api.php

```php
// /apps/eeo-v2/api-legacy/api.eeo/api.php

// Přidat include
require_once __DIR__ . '/v2025.03_25/lib/orderV2PagingEndpoints.php';

// Přidat routes (v sekci s Order V2 endpointy)
if ($path === 'order-v2-paging/list' && $method === 'POST') {
    handle_order_v2_paging_list($input, $config, $queries);
    exit;
}

if (preg_match('#^order-v2-paging/get/(\d+)$#', $path, $matches) && $method === 'POST') {
    $input['id'] = $matches[1];
    handle_order_v2_paging_get($input, $config, $queries);
    exit;
}

if ($path === 'order-v2-paging/create' && $method === 'POST') {
    handle_order_v2_paging_create($input, $config, $queries);
    exit;
}

if (preg_match('#^order-v2-paging/update/(\d+)$#', $path, $matches) && $method === 'POST') {
    $input['id'] = $matches[1];
    handle_order_v2_paging_update($input, $config, $queries);
    exit;
}

if (preg_match('#^order-v2-paging/delete/(\d+)$#', $path, $matches) && $method === 'POST') {
    $input['id'] = $matches[1];
    handle_order_v2_paging_delete($input, $config, $queries);
    exit;
}
```

#### Frontend Implementation

##### 1. Nový Service - apiOrderV2Paging.js

```javascript
/**
 * API Service pro Order V2 Paging
 * 
 * Nové API endpointy s povinným server-side paging/filtering.
 * Klonováno z apiOrderV2.js s úpravami pro paging support.
 * 
 * Datum: 15. ledna 2026
 */

import axios from 'axios';

// Vytvoř novou axios instanci pro paging API
const apiOrderV2Paging = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost/api.eeo',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Seznam objednávek s POVINNÝM server-side paging
 * 
 * @param {Object} params - Parametry
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} [params.page=1] - Číslo stránky
 * @param {number} [params.per_page=50] - Počet záznamů na stránku
 * @param {number} [params.year] - Rok
 * @param {string} [params.filter_cislo_objednavky] - Filtr čísla objednávky
 * @param {string} [params.filter_predmet] - Filtr předmětu
 * @param {string} [params.filter_dodavatel] - Filtr dodavatele
 * @param {string} [params.filter_status] - Filtr stavu
 * @param {string} [params.filter_uzivatel] - Filtr uživatele
 * @param {string} [params.filter_datum_od] - Datum od
 * @param {string} [params.filter_datum_do] - Datum do
 * @param {number} [params.filter_cena_min] - Min. cena
 * @param {number} [params.filter_cena_max] - Max. cena
 * @param {boolean} [params.filter_my_orders] - Jen moje objednávky
 * @param {boolean} [params.filter_archivovano] - Archivované objednávky
 * 
 * @returns {Promise<{orders: Array, pagination: Object, stats: Object}>}
 */
export async function listOrdersV2Paging({
  token,
  username,
  page = 1,
  per_page = 50,
  year,
  filter_cislo_objednavky,
  filter_predmet,
  filter_dodavatel,
  filter_status,
  filter_uzivatel,
  filter_datum_od,
  filter_datum_do,
  filter_cena_min,
  filter_cena_max,
  filter_my_orders,
  filter_archivovano,
}) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno');
  }
  
  const payload = {
    token,
    username,
    page,
    per_page,
    ...(year && { year }),
    ...(filter_cislo_objednavky && { filter_cislo_objednavky }),
    ...(filter_predmet && { filter_predmet }),
    ...(filter_dodavatel && { filter_dodavatel }),
    ...(filter_status && { filter_status }),
    ...(filter_uzivatel && { filter_uzivatel }),
    ...(filter_datum_od && { filter_datum_od }),
    ...(filter_datum_do && { filter_datum_do }),
    ...(filter_cena_min !== undefined && filter_cena_min !== '' && { filter_cena_min }),
    ...(filter_cena_max !== undefined && filter_cena_max !== '' && { filter_cena_max }),
    ...(filter_my_orders && { filter_my_orders: 1 }),
    ...(filter_archivovano && { filter_archivovano: 1 }),
  };
  
  try {
    const response = await apiOrderV2Paging.post('/order-v2-paging/list', payload);
    
    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi při načítání objednávek');
    }
    
    return {
      orders: response.data.orders || [],
      pagination: response.data.pagination || {},
      stats: response.data.stats || {},
      filters_applied: response.data.filters_applied || {}
    };
  } catch (error) {
    console.error('Error loading orders (paging):', error);
    throw error;
  }
}

/**
 * Ostatní operace (GET, CREATE, UPDATE, DELETE)
 * Můžeme použít původní implementace z apiOrderV2.js
 * nebo je importovat a re-exportovat
 */
export {
  getOrderV2,
  createOrderV2,
  updateOrderV2,
  deleteOrderV2,
  downloadOrderAttachment,
  downloadInvoiceAttachment,
  // ... další funkce z apiOrderV2.js
} from './apiOrderV2';
```

##### 2. Cache Service - orders25PagingCache.js

```javascript
/**
 * Cache service pro Orders25ListPaging
 * 
 * Cachuje výsledky API volání pro rychlejší page switching.
 */

class Orders25PagingCache {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minut
    this.maxCacheSize = 20; // Max 20 stránek v cache
  }
  
  /**
   * Vytvoří cache klíč z filtrů a stránky
   */
  getCacheKey(filters, page) {
    const key = {
      ...filters,
      page
    };
    return JSON.stringify(key);
  }
  
  /**
   * Získá data z cache
   */
  get(filters, page) {
    const key = this.getCacheKey(filters, page);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Kontrola validity (5 minut)
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    console.log('📦 Cache HIT:', key);
    return cached.data;
  }
  
  /**
   * Uloží data do cache
   */
  set(filters, page, data) {
    // Kontrola velikosti cache
    if (this.cache.size >= this.maxCacheSize) {
      // Smaž nejstarší záznam
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const key = this.getCacheKey(filters, page);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    console.log('💾 Cache SET:', key);
  }
  
  /**
   * Vyčistí celou cache
   */
  clear() {
    console.log('🗑️ Cache CLEAR - cleared', this.cache.size, 'entries');
    this.cache.clear();
  }
  
  /**
   * Vyčistí cache pro konkrétní filtry (všechny stránky)
   */
  clearFilters(filters) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      const parsedKey = JSON.parse(key);
      const { page, ...keyFilters } = parsedKey;
      
      if (JSON.stringify(keyFilters) === JSON.stringify(filters)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log('🗑️ Cache CLEAR filters - cleared', keysToDelete.length, 'entries');
  }
}

export default new Orders25PagingCache();
```

##### 3. Nová Stránka - Orders25ListPaging.js

```javascript
/**
 * Orders25ListPaging.js
 * 
 * Nová verze seznamu objednávek s POVINNÝM server-side paging/filtering.
 * Klonováno z Orders25List.js s úpravami pro BE paging.
 * 
 * Datum: 15. ledna 2026
 * 
 * HLAVNÍ ROZDÍLY od Orders25List.js:
 * - ✅ Server-side pagination (BE vrací jen aktuální stránku)
 * - ✅ Server-side filtering (filtry aplikovány v SQL)
 * - ✅ Statistiky z BE (agregace v SQL)
 * - ✅ Cache pro rychlejší page switching
 * - ✅ Debounce pro text filtry
 * - ❌ Žádné FE filtrování (všechno na BE)
 * - ❌ Žádný FE paging (všechno na BE)
 */

import React, { useEffect, useState, useMemo, useContext, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ProgressContext } from '../context/ProgressContext';
import { ToastContext } from '../context/ToastContext';
import { listOrdersV2Paging, getOrderV2, deleteOrderV2 } from '../services/apiOrderV2Paging';
import orders25PagingCache from '../services/orders25PagingCache';
import { useDebounce } from '../hooks/useDebounce';
// ... další importy (stejné jako Orders25List.js)

const Orders25ListPaging = () => {
  const navigate = useNavigate();
  const { user, token, username, hasPermission, user_id } = useContext(AuthContext);
  const { showProgress, hideProgress } = useContext(ProgressContext) || {};
  const { showToast } = useContext(ToastContext) || {};
  
  // LocalStorage klíč
  const LS_KEY = `orders25_paging_state_${user_id || 'guest'}`;
  
  // Helper: Load/Save state
  const loadFromLS = () => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  };
  
  const saveToLS = useCallback((state) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  }, [LS_KEY]);
  
  const savedState = loadFromLS();
  
  // ========== STATE MANAGEMENT ==========
  
  // Data
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 🆕 Pagination (server-side)
  const [currentPage, setCurrentPage] = useState(savedState?.currentPage || 1);
  const [itemsPerPage, setItemsPerPage] = useState(savedState?.itemsPerPage || 50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  
  // Rok
  const [selectedYear, setSelectedYear] = useState(savedState?.selectedYear || new Date().getFullYear());
  
  // 🆕 Sloupcové filtry (temporary - před debounce)
  const [tempColumnFilters, setTempColumnFilters] = useState(savedState?.columnFilters || {});
  
  // 🆕 Debounced filtry (tyto se posílají na BE)
  const debouncedColumnFilters = useDebounce(tempColumnFilters, 500);
  
  // Dashboard filtry
  const [dashboardFilters, setDashboardFilters] = useState(savedState?.dashboardFilters || {
    filter_status: '',
    filter_my_orders: false,
    filter_archivovano: false
  });
  
  // 🆕 Statistiky z BE
  const [stats, setStats] = useState({
    total: 0,
    nova: 0,
    schvalena: 0,
    odeslana: 0,
    archivovano: 0,
    storno: 0,
    total_amount: 0,
    nova_amount: 0,
    schvalena_amount: 0
  });
  
  // ========== DATA LOADING ==========
  
  const loadOrders = useCallback(async () => {
    if (!token || !username) return;
    
    setLoading(true);
    setError(null);
    showProgress?.();
    
    try {
      // 1. Zkusit načíst z cache
      const cacheKey = {
        year: selectedYear,
        ...debouncedColumnFilters,
        ...dashboardFilters
      };
      
      const cached = orders25PagingCache.get(cacheKey, currentPage);
      if (cached) {
        console.log('✅ Loading from cache');
        setOrders(cached.orders);
        setTotalPages(cached.pagination.total_pages);
        setTotalItems(cached.pagination.total);
        setStats(cached.stats);
        setLoading(false);
        hideProgress?.();
        return;
      }
      
      // 2. Pokud není v cache, načíst z API
      console.log('📡 Loading from API');
      
      const apiParams = {
        token,
        username,
        page: currentPage,
        per_page: itemsPerPage,
        year: selectedYear,
        
        // Sloupcové filtry (debounced)
        filter_cislo_objednavky: debouncedColumnFilters.cislo_objednavky?.trim(),
        filter_predmet: debouncedColumnFilters.predmet?.trim(),
        filter_dodavatel: debouncedColumnFilters.dodavatel?.trim(),
        filter_uzivatel: debouncedColumnFilters.uzivatel?.trim(),
        filter_stav: debouncedColumnFilters.stav,
        filter_datum_od: debouncedColumnFilters.datum_od,
        filter_datum_do: debouncedColumnFilters.datum_do,
        filter_cena_min: debouncedColumnFilters.cena_min,
        filter_cena_max: debouncedColumnFilters.cena_max,
        
        // Dashboard filtry
        filter_status: dashboardFilters.filter_status,
        filter_my_orders: dashboardFilters.filter_my_orders,
        filter_archivovano: dashboardFilters.filter_archivovano,
      };
      
      const response = await listOrdersV2Paging(apiParams);
      
      // 3. Uložit do cache
      orders25PagingCache.set(cacheKey, currentPage, response);
      
      // 4. Aktualizovat state
      setOrders(response.orders);
      setTotalPages(response.pagination.total_pages || 0);
      setTotalItems(response.pagination.total || 0);
      setStats(response.stats || {});
      
      // 5. Ulož do localStorage
      saveToLS({
        currentPage,
        itemsPerPage,
        selectedYear,
        columnFilters: debouncedColumnFilters,
        dashboardFilters
      });
      
    } catch (err) {
      console.error('Error loading orders:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Chyba při načítání objednávek';
      setError(errorMsg);
      showToast?.(errorMsg, { type: 'error' });
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
    debouncedColumnFilters,
    dashboardFilters,
    showProgress,
    hideProgress,
    showToast,
    saveToLS
  ]);
  
  // Trigger načtení při změně závislostí
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);
  
  // ========== FILTER HANDLERS ==========
  
  // Handler pro sloupcové filtry (temporary, před debounce)
  const handleColumnFilterChange = useCallback((filterName, value) => {
    setTempColumnFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);
  
  // Reset stránky na 1 při změně debounced filtrů
  useEffect(() => {
    setCurrentPage(1);
    
    // Vyčistit cache pro staré filtry
    orders25PagingCache.clearFilters({
      year: selectedYear,
      ...debouncedColumnFilters,
      ...dashboardFilters
    });
  }, [debouncedColumnFilters, selectedYear, dashboardFilters]);
  
  // Handler pro dashboard cards
  const handleDashboardCardClick = useCallback((filterType) => {
    const isCurrentlyActive = dashboardFilters.filter_status === filterType;
    
    setDashboardFilters(prev => ({
      ...prev,
      filter_status: isCurrentlyActive ? '' : filterType
    }));
    
    setCurrentPage(1);
  }, [dashboardFilters.filter_status]);
  
  // Clear filtry
  const handleClearFilters = useCallback(() => {
    setTempColumnFilters({});
    setDashboardFilters({
      filter_status: '',
      filter_my_orders: false,
      filter_archivovano: false
    });
    setCurrentPage(1);
    orders25PagingCache.clear();
  }, []);
  
  // ========== PAGINATION HANDLERS ==========
  
  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  const handleItemsPerPageChange = useCallback((newPerPage) => {
    setItemsPerPage(newPerPage);
    setCurrentPage(1);
    orders25PagingCache.clear();
  }, []);
  
  // ========== RENDER ==========
  
  if (error) {
    return (
      <div className="error-message">
        <FontAwesomeIcon icon={faExclamationTriangle} />
        {error}
      </div>
    );
  }
  
  return (
    <div className="orders-paging-page">
      {/* Záhlaví */}
      <PageHeader>
        <h1>
          <FontAwesomeIcon icon={faFileAlt} />
          Seznam objednávek (PAGING)
        </h1>
        <Badge $color="#10b981">🚀 Nová verze s BE paging</Badge>
      </PageHeader>
      
      {/* Dashboard karty - data z BE stats */}
      <DashboardPanel>
        <DashboardGrid>
          <LargeStatCard
            $color="#4caf50"
            $active={!dashboardFilters.filter_status}
            onClick={() => handleDashboardCardClick('')}
          >
            <LargeStatValue>
              {stats.total?.toLocaleString('cs-CZ') || 0}
            </LargeStatValue>
            <LargeStatLabel>Celkem objednávek</LargeStatLabel>
            <SmallStatValue>
              {Math.round(stats.total_amount || 0).toLocaleString('cs-CZ')} Kč
            </SmallStatValue>
          </LargeStatCard>
          
          <StatCard
            $color="#3b82f6"
            $active={dashboardFilters.filter_status === 'NOVA'}
            onClick={() => handleDashboardCardClick('NOVA')}
          >
            <StatIcon><FontAwesomeIcon icon={faFileAlt} /></StatIcon>
            <StatValue>{stats.nova || 0}</StatValue>
            <StatLabel>Nové</StatLabel>
          </StatCard>
          
          <StatCard
            $color="#10b981"
            $active={dashboardFilters.filter_status === 'SCHVALENA'}
            onClick={() => handleDashboardCardClick('SCHVALENA')}
          >
            <StatIcon><FontAwesomeIcon icon={faCheckCircle} /></StatIcon>
            <StatValue>{stats.schvalena || 0}</StatValue>
            <StatLabel>Schválené</StatLabel>
          </StatCard>
          
          {/* ...další karty */}
        </DashboardGrid>
      </DashboardPanel>
      
      {/* Filtrovací panel (stejný jako u Orders25List) */}
      {/* ... */}
      
      {/* Tabulka objednávek */}
      <Table>
        {/* ... stejná struktura jako Orders25List */}
      </Table>
      
      {/* 🆕 Pagination Controls */}
      <PaginationWrapper>
        <PaginationInfo>
          Zobrazeno {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} z {totalItems} objednávek
        </PaginationInfo>
        
        <PaginationButtons>
          <PaginationButton
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1 || loading}
          >
            <FontAwesomeIcon icon={faChevronLeft} /> První
          </PaginationButton>
          
          <PaginationButton
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
          >
            Předchozí
          </PaginationButton>
          
          <PageInfo>
            Stránka {currentPage} z {totalPages}
          </PageInfo>
          
          <PaginationButton
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
          >
            Další
          </PaginationButton>
          
          <PaginationButton
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages || loading}
          >
            Poslední <FontAwesomeIcon icon={faChevronRight} />
          </PaginationButton>
        </PaginationButtons>
        
        <ItemsPerPageSelect>
          <label>Záznamů na stránku:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            disabled={loading}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </ItemsPerPageSelect>
      </PaginationWrapper>
      
      {/* Loading overlay */}
      {loading && (
        <LoadingOverlay>
          <Spinner />
          <LoadingText>Načítání objednávek...</LoadingText>
        </LoadingOverlay>
      )}
    </div>
  );
};

export default Orders25ListPaging;
```

##### 4. Přidat route v App.js

```javascript
// /apps/eeo-v2/client/src/App.js

import Orders25ListPaging from './pages/Orders25ListPaging';

// V routes sekci:
<Routes>
  {/* Stávající route (zachováno beze změny) */}
  <Route 
    path="/orders25-list" 
    element={
      <ProtectedRoute>
        <Orders25List />
      </ProtectedRoute>
    } 
  />
  
  {/* 🆕 Nová route s paging verzí */}
  <Route 
    path="/orders25-paging" 
    element={
      <ProtectedRoute>
        <Orders25ListPaging />
      </ProtectedRoute>
    } 
  />
  
  {/* ... ostatní routes */}
</Routes>

// 🆕 Přidat do menu/navigace odkaz na novou stránku
// Například v sidebar nebo top menu:
<MenuItem to="/orders25-paging" badge="NEW">
  <FontAwesomeIcon icon={faBolt} />
  Objednávky (Paging)
</MenuItem>
```

##### 5. Custom Hook - useDebounce.js

```javascript
/**
 * useDebounce Hook
 * 
 * Debounce hodnoty - čeká N milisekund po posledním updatu
 * než vrátí novou hodnotu.
 */

import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    // Nastav timer
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    // Cleanup - zruš timer pokud se value změní před uplynutím delay
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
}
```

#### Výhody Paralelního Systému

1. **✅ Zero Risk** - Stávající systém zůstává nedotčený
2. **✅ Postupné Testování** - Nový systém lze testovat nezávisle
3. **✅ Snadný Rollback** - Stačí vypnout route/odkaz na novou stránku
4. **✅ A/B Testing** - Možnost pustit oběma skupinám uživatelů
5. **✅ Učící Křivka** - Uživatelé se mohou postupně naučit
6. **✅ Feature Flag** - Možnost zapnout/vypnout podle potřeby
7. **✅ Paralelní Vývoj** - Lze pokračovat na stávající verzi
8. **✅ Sdílený Kód** - Mnoho komponent lze sdílet (OrderFormReadOnly, atd.)

#### Migrace Plan

##### Fáze 1: Vývoj (2 týdny)
- ✅ Backend endpoints (3-5 dní)
- ✅ Frontend service layer (1 den)
- ✅ Frontend component (5-7 dní)
- ✅ Cache + debounce (1 den)
- ✅ Testování (2 dny)

##### Fáze 2: Beta Testing (1-2 týdny)
- ✅ Pustit vybrané skupině uživatelů
- ✅ Sbírat feedback
- ✅ Opravy bugů
- ✅ Performance tuning

##### Fáze 3: Rollout (1 týden)
- ✅ Pustit všem uživatelům
- ✅ Monitoring
- ✅ Hot fixes pokud potřeba

##### Fáze 4: Deprecation (1-2 měsíce)
- ✅ Informovat uživatele o přechodu
- ✅ Nastavit redirect ze staré na novou stránku
- ✅ Odstranit starou verzi (volitelné)

**Celková doba:** **3-5 týdnů** (včetně testování a rollout)

---

## 🚀 On-Demand Data Loading & Enriched Optimization

### Koncept

**Problém současného stavu:**
- ❌ Všechna enriched data (přílohy, faktury, workflow) načítána najednou
- ❌ Rozbalitelné řádky načítají data, která uživatel nemusí nikdy vidět
- ❌ Vyhledávání filtruje celý dataset (včetně nepotřebných enriched dat)
- ❌ "Shift+Enter" (rozbalit všechny shody) = načíst vše = performance bottleneck

**Řešení:**
- ✅ **Lazy Loading** - data se načítají jen když jsou potřeba (rozbalení řádku)
- ✅ **Progressive Enhancement** - základní data rychle, detaily postupně
- ✅ **Smart Caching** - jednou načtená data se cachují
- ✅ **Background Loading** - při "rozbalit všechny" načítat postupně v pozadí
- ✅ **BE Vyhledávání** - vyhledávání i v enriched datech přímo v SQL

---

### Backend - Rozdělení Endpointů

#### Stávající (problematický)

```php
// Vrací VŠE najednou (objednávka + přílohy + faktury + workflow + users + ...)
POST /order-v2/list-enriched

// Problém: Mega JOINy, N+1 dotazy, obrovská response
```

#### Nové (optimalizované)

```php
// 1. Seznam objednávek - JEN základní data pro tabulku
POST /order-v2-paging/list
Response: {
  orders: [
    {
      id: 123,
      cislo_objednavky: "OBJ/2025/001",
      predmet: "...",
      stav: "...",
      max_cena_s_dph: 10000,
      dt_objednavky: "...",
      // JEN základní pole pro zobrazení řádku
      // BEZ: přílohy, faktury, workflow steps, atd.
      pocet_priloh: 5,       // Jen počet pro ikonu
      pocet_faktur: 2,       // Jen počet pro ikonu
      ma_financni_kontrolu: true  // Boolean flag
    }
  ],
  pagination: {...},
  stats: {...}
}

// 2. Detail objednávky - enriched data ON-DEMAND
POST /order-v2-paging/get-enriched/{id}
Response: {
  order: {...}, // kompletní data
  enriched: {
    attachments: [...],      // přílohy objednávky
    invoices: [...],         // faktury
    invoice_attachments: [...], // přílohy faktur
    workflow_history: [...], // historie workflow
    approvers: [...],        // schvalovatelé
    related_users: {...},    // všichni zúčastnění uživatelé
    financni_kontrola: {...} // finanční kontrola
  }
}

// 3. Batch enriched - pro "rozbalit všechny"
POST /order-v2-paging/get-enriched-batch
Request: { order_ids: [123, 456, 789, ...] }  // max 50
Response: {
  enriched_data: {
    123: { attachments: [...], invoices: [...], ... },
    456: { attachments: [...], invoices: [...], ... },
    789: { attachments: [...], invoices: [...], ... }
  }
}
```

---

### Backend Implementation

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2PagingEndpoints.php`

Přidat do existujícího souboru:

```php
/**
 * POST /order-v2-paging/get-enriched/{id}
 * 
 * Načte KOMPLETNÍ enriched data pro JEDNU objednávku.
 * Volá se ON-DEMAND při rozbalení řádku.
 */
function handle_order_v2_paging_get_enriched($input, $config, $queries) {
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;
    
    if (!$order_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí ID objednávky']);
        return;
    }
    
    // Auth
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $auth_result = verify_token_v2($username, $token);
    
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }
    
    try {
        $db = get_db($config);
        
        // 1. Základní data objednávky
        $stmt = $db->prepare("SELECT * FROM 25_objednavky WHERE id = ? AND aktivni = 1");
        $stmt->execute([$order_id]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Objednávka nenalezena']);
            return;
        }
        
        // 2. Přílohy objednávky
        $stmt_prilohy = $db->prepare("
            SELECT * FROM 25_objednavky_prilohy 
            WHERE objednavka_id = ? AND aktivni = 1
            ORDER BY dt_nahrano DESC
        ");
        $stmt_prilohy->execute([$order_id]);
        $attachments = $stmt_prilohy->fetchAll(PDO::FETCH_ASSOC);
        
        // 3. Faktury + jejich přílohy
        $stmt_faktury = $db->prepare("
            SELECT f.*, 
                   CONCAT(u.prijmeni, ' ', u.jmeno) as vytvoril_uzivatel
            FROM 25a_faktury f
            LEFT JOIN 25_uzivatele u ON f.vytvoril_uzivatel_id = u.id
            WHERE f.objednavka_id = ? AND f.aktivni = 1
            ORDER BY f.fa_datum_vystaveni DESC
        ");
        $stmt_faktury->execute([$order_id]);
        $invoices = $stmt_faktury->fetchAll(PDO::FETCH_ASSOC);
        
        $stmt_fa_prilohy = $db->prepare("
            SELECT p.* 
            FROM 25a_faktury_prilohy p
            INNER JOIN 25a_faktury f ON p.faktura_id = f.id
            WHERE f.objednavka_id = ? AND f.aktivni = 1 AND p.aktivni = 1
            ORDER BY p.dt_nahrano DESC
        ");
        $stmt_fa_prilohy->execute([$order_id]);
        $invoice_attachments = $stmt_fa_prilohy->fetchAll(PDO::FETCH_ASSOC);
        
        // 4. Workflow historie (pokud existuje)
        $workflow_history = [];
        if (!empty($order['stav_workflow_log'])) {
            try {
                $workflow_history = json_decode($order['stav_workflow_log'], true) ?? [];
            } catch (Exception $e) {
                // Ignore
            }
        }
        
        // 5. Všichni zúčastnění uživatelé
        $user_ids = array_filter([
            $order['uzivatel_id'],
            $order['objednatel_id'],
            $order['garant_uzivatel_id'],
            $order['schvalovatel_id'],
            $order['prikazce_id'],
            $order['uzivatel_akt_id']
        ]);
        
        $related_users = [];
        if (!empty($user_ids)) {
            $placeholders = implode(',', array_fill(0, count($user_ids), '?'));
            $stmt_users = $db->prepare("
                SELECT id, jmeno, prijmeni, email, telefon
                FROM 25_uzivatele
                WHERE id IN ($placeholders)
            ");
            $stmt_users->execute($user_ids);
            $users = $stmt_users->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($users as $user) {
                $related_users[$user['id']] = $user;
            }
        }
        
        // 6. Response
        $response = [
            'status' => 'ok',
            'order' => $order,
            'enriched' => [
                'attachments' => $attachments,
                'attachments_count' => count($attachments),
                
                'invoices' => $invoices,
                'invoices_count' => count($invoices),
                
                'invoice_attachments' => $invoice_attachments,
                'invoice_attachments_count' => count($invoice_attachments),
                
                'workflow_history' => $workflow_history,
                'workflow_steps_count' => count($workflow_history),
                
                'related_users' => $related_users
            ],
            'meta' => [
                'loaded_at' => date('Y-m-d H:i:s'),
                'cache_ttl' => 300 // 5 minut cache na FE
            ]
        ];
        
        http_response_code(200);
        echo json_encode($response);
        
    } catch (Exception $e) {
        error_log("Error loading enriched data for order $order_id: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba při načítání detailů']);
    }
}

/**
 * POST /order-v2-paging/get-enriched-batch
 * 
 * Načte enriched data pro VÍCE objednávek najednou (max 50).
 * Použití: Shift+Enter (rozbalit všechny výsledky vyhledávání).
 */
function handle_order_v2_paging_get_enriched_batch($input, $config, $queries) {
    $order_ids = isset($input['order_ids']) ? $input['order_ids'] : [];
    
    if (!is_array($order_ids) || empty($order_ids)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí pole order_ids']);
        return;
    }
    
    // Omezení: max 50 objednávek najednou
    if (count($order_ids) > 50) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Maximálně 50 objednávek najednou']);
        return;
    }
    
    // Auth
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $auth_result = verify_token_v2($username, $token);
    
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Načíst enriched data pro všechny objednávky
        // Optimalizovaně - batch SELECT místo N dotazů
        
        $placeholders = implode(',', array_fill(0, count($order_ids), '?'));
        
        // 1. Přílohy - všechny najednou
        $stmt_prilohy = $db->prepare("
            SELECT * FROM 25_objednavky_prilohy 
            WHERE objednavka_id IN ($placeholders) AND aktivni = 1
            ORDER BY objednavka_id, dt_nahrano DESC
        ");
        $stmt_prilohy->execute($order_ids);
        $all_attachments = $stmt_prilohy->fetchAll(PDO::FETCH_ASSOC);
        
        // Seskupit podle objednavka_id
        $attachments_by_order = [];
        foreach ($all_attachments as $att) {
            $oid = $att['objednavka_id'];
            if (!isset($attachments_by_order[$oid])) {
                $attachments_by_order[$oid] = [];
            }
            $attachments_by_order[$oid][] = $att;
        }
        
        // 2. Faktury - všechny najednou
        $stmt_faktury = $db->prepare("
            SELECT f.*, 
                   CONCAT(u.prijmeni, ' ', u.jmeno) as vytvoril_uzivatel
            FROM 25a_faktury f
            LEFT JOIN 25_uzivatele u ON f.vytvoril_uzivatel_id = u.id
            WHERE f.objednavka_id IN ($placeholders) AND f.aktivni = 1
            ORDER BY f.objednavka_id, f.fa_datum_vystaveni DESC
        ");
        $stmt_faktury->execute($order_ids);
        $all_invoices = $stmt_faktury->fetchAll(PDO::FETCH_ASSOC);
        
        // Seskupit podle objednavka_id
        $invoices_by_order = [];
        foreach ($all_invoices as $inv) {
            $oid = $inv['objednavka_id'];
            if (!isset($invoices_by_order[$oid])) {
                $invoices_by_order[$oid] = [];
            }
            $invoices_by_order[$oid][] = $inv;
        }
        
        // 3. Přílohy faktur
        $stmt_fa_prilohy = $db->prepare("
            SELECT p.*, f.objednavka_id
            FROM 25a_faktury_prilohy p
            INNER JOIN 25a_faktury f ON p.faktura_id = f.id
            WHERE f.objednavka_id IN ($placeholders) AND f.aktivni = 1 AND p.aktivni = 1
            ORDER BY f.objednavka_id, p.dt_nahrano DESC
        ");
        $stmt_fa_prilohy->execute($order_ids);
        $all_invoice_attachments = $stmt_fa_prilohy->fetchAll(PDO::FETCH_ASSOC);
        
        // Seskupit podle objednavka_id
        $invoice_attachments_by_order = [];
        foreach ($all_invoice_attachments as $att) {
            $oid = $att['objednavka_id'];
            if (!isset($invoice_attachments_by_order[$oid])) {
                $invoice_attachments_by_order[$oid] = [];
            }
            $invoice_attachments_by_order[$oid][] = $att;
        }
        
        // 4. Sestavit response pro každou objednávku
        $enriched_data = [];
        
        foreach ($order_ids as $order_id) {
            $order_id = (int)$order_id;
            
            $enriched_data[$order_id] = [
                'attachments' => $attachments_by_order[$order_id] ?? [],
                'attachments_count' => count($attachments_by_order[$order_id] ?? []),
                
                'invoices' => $invoices_by_order[$order_id] ?? [],
                'invoices_count' => count($invoices_by_order[$order_id] ?? []),
                
                'invoice_attachments' => $invoice_attachments_by_order[$order_id] ?? [],
                'invoice_attachments_count' => count($invoice_attachments_by_order[$order_id] ?? [])
            ];
        }
        
        $response = [
            'status' => 'ok',
            'enriched_data' => $enriched_data,
            'count' => count($enriched_data),
            'meta' => [
                'loaded_at' => date('Y-m-d H:i:s'),
                'cache_ttl' => 300
            ]
        ];
        
        http_response_code(200);
        echo json_encode($response);
        
    } catch (Exception $e) {
        error_log("Error loading batch enriched data: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba při načítání detailů']);
    }
}
```

#### Registrace endpointů v api.php

```php
// /apps/eeo-v2/api-legacy/api.eeo/api.php

// Přidat routes
if (preg_match('#^order-v2-paging/get-enriched/(\d+)$#', $path, $matches) && $method === 'POST') {
    $input['id'] = $matches[1];
    handle_order_v2_paging_get_enriched($input, $config, $queries);
    exit;
}

if ($path === 'order-v2-paging/get-enriched-batch' && $method === 'POST') {
    handle_order_v2_paging_get_enriched_batch($input, $config, $queries);
    exit;
}
```

#### Optimalizace LIST endpointu

V již vytvořeném `handle_order_v2_paging_list()` upravit SELECT:

```php
// ✅ SELECT JEN ZÁKLADNÍ SLOUPCE
$sql = "
    SELECT 
        o.id,
        o.cislo_objednavky,
        o.predmet,
        o.stav_objednavky,
        o.max_cena_s_dph,
        o.dt_objednavky,
        
        -- Minimální user data (jen jména)
        CONCAT(u_vytvoril.prijmeni, ' ', u_vytvoril.jmeno) as vytvoril_uzivatel,
        
        -- Dodavatel (základní)
        o.dodavatel_nazev,
        
        -- 🆕 POČTY (pro ikony v řádku - RYCHLÉ subqueries)
        (SELECT COUNT(*) FROM 25_objednavky_prilohy 
         WHERE objednavka_id = o.id AND aktivni = 1) as pocet_priloh,
        (SELECT COUNT(*) FROM 25a_faktury 
         WHERE objednavka_id = o.id AND aktivni = 1) as pocet_faktur,
        
        -- 🆕 INDIKÁTORY (boolean flags)
        CASE WHEN o.financni_kontrola_provedena = 1 THEN 1 ELSE 0 END as ma_financni_kontrolu
        
    FROM 25_objednavky o
    LEFT JOIN 25_uzivatele u_vytvoril ON o.uzivatel_id = u_vytvoril.id
    WHERE $where_sql
    ORDER BY o.dt_objednavky DESC
    LIMIT $limit OFFSET $offset
";

// ❌ NEPOUŽÍVAT LEFT JOIN na:
// - prilohy (vrací N rows)
// - faktury (vrací M rows)
// - workflow steps
// - ostatní related tabulky
```

---

### Frontend Implementation

#### 1. Nový Service - apiOrderV2PagingEnriched.js

**Soubor:** `/apps/eeo-v2/client/src/services/apiOrderV2PagingEnriched.js`

```javascript
/**
 * API Service pro načítání enriched dat ON-DEMAND
 */

import axios from 'axios';

const apiOrderV2Paging = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost/api.eeo',
  timeout: 30000,
});

/**
 * Načte enriched data pro JEDNU objednávku
 */
export async function getOrderEnriched(orderId, token, username) {
  if (!orderId || !token || !username) {
    throw new Error('Chybí povinné parametry');
  }
  
  try {
    const response = await apiOrderV2Paging.post(`/order-v2-paging/get-enriched/${orderId}`, {
      token,
      username
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error loading enriched data for order ${orderId}:`, error);
    throw error;
  }
}

/**
 * Načte enriched data pro VÍCE objednávek najednou (batch)
 */
export async function getOrdersEnrichedBatch(orderIds, token, username) {
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    throw new Error('Chybí pole order_ids');
  }
  
  if (orderIds.length > 50) {
    throw new Error('Maximálně 50 objednávek najednou');
  }
  
  try {
    const response = await apiOrderV2Paging.post('/order-v2-paging/get-enriched-batch', {
      order_ids: orderIds,
      token,
      username
    });
    
    return response.data.enriched_data;
  } catch (error) {
    console.error('Error loading batch enriched data:', error);
    throw error;
  }
}
```

#### 2. Enriched Cache Service

**Soubor:** `/apps/eeo-v2/client/src/services/enrichedDataCache.js`

```javascript
/**
 * Cache pro enriched data jednotlivých objednávek
 */

class EnrichedDataCache {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minut
  }
  
  get(orderId) {
    const cached = this.cache.get(orderId);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(orderId);
      return null;
    }
    
    return cached.data;
  }
  
  set(orderId, data) {
    this.cache.set(orderId, {
      data,
      timestamp: Date.now()
    });
  }
  
  clear() {
    this.cache.clear();
  }
  
  delete(orderId) {
    this.cache.delete(orderId);
  }
}

export default new EnrichedDataCache();
```

#### 3. Orders25ListPaging.js - Integrace

Přidat do komponenty:

```javascript
import { getOrderEnriched, getOrdersEnrichedBatch } from '../services/apiOrderV2PagingEnriched';
import enrichedDataCache from '../services/enrichedDataCache';

const Orders25ListPaging = () => {
  // ... existing state ...
  
  // 🆕 Enriched data state
  const [enrichedData, setEnrichedData] = useState({});
  const [loadingEnriched, setLoadingEnriched] = useState({});
  
  /**
   * Handler pro rozbalení řádku - načte enriched data ON-DEMAND
   */
  const handleRowExpand = useCallback(async (row) => {
    const orderId = row.original.id;
    
    // Kontrola cache
    const cached = enrichedDataCache.get(orderId);
    if (cached) {
      setEnrichedData(prev => ({ ...prev, [orderId]: cached }));
      return;
    }
    
    // Načíst z API
    setLoadingEnriched(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const response = await getOrderEnriched(orderId, token, username);
      enrichedDataCache.set(orderId, response.enriched);
      setEnrichedData(prev => ({ ...prev, [orderId]: response.enriched }));
    } catch (error) {
      showToast?.('Chyba při načítání detailů', { type: 'error' });
    } finally {
      setLoadingEnriched(prev => ({ ...prev, [orderId]: false }));
    }
  }, [token, username, showToast]);
  
  /**
   * Handler pro Shift+Enter - rozbalit všechny
   */
  const handleExpandAllSearchResults = useCallback(async () => {
    const visibleOrderIds = orders.map(order => order.id);
    const notCachedIds = visibleOrderIds.filter(id => !enrichedDataCache.get(id));
    
    if (notCachedIds.length === 0) return;
    
    showToast?.(`Načítám detaily pro ${notCachedIds.length} objednávek...`, { type: 'info' });
    
    try {
      // Rozdělit na batche po 50
      const batches = [];
      for (let i = 0; i < notCachedIds.length; i += 50) {
        batches.push(notCachedIds.slice(i, i + 50));
      }
      
      // Načíst postupně
      for (const batch of batches) {
        const batchData = await getOrdersEnrichedBatch(batch, token, username);
        
        // Uložit do cache
        Object.entries(batchData).forEach(([orderId, data]) => {
          enrichedDataCache.set(Number(orderId), data);
        });
        
        // Aktualizovat state
        setEnrichedData(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(batchData).map(([id, data]) => [Number(id), data])
          )
        }));
      }
      
      showToast?.('Detaily načteny', { type: 'success' });
    } catch (error) {
      showToast?.('Chyba při načítání detailů', { type: 'error' });
    }
  }, [orders, token, username, showToast]);
  
  // ... rest of component
};
```

---

### Vyhledávání v Enriched Datech

#### Backend - Rozšíření handle_order_v2_paging_list()

Přidat support pro vyhledávání v přílohách a fakturách:

```php
// Pokud je zadán global_search parametr
if (!empty($input['global_search'])) {
    $search_term = $input['global_search'];
    
    $whereConditions[] = "(
        o.cislo_objednavky LIKE :search1
        OR o.predmet LIKE :search2
        OR o.dodavatel_nazev LIKE :search3
        OR EXISTS (
            SELECT 1 FROM 25_objednavky_prilohy p
            WHERE p.objednavka_id = o.id
              AND p.aktivni = 1
              AND p.originalni_nazev_souboru LIKE :search_prilohy
        )
        OR EXISTS (
            SELECT 1 FROM 25a_faktury f
            WHERE f.objednavka_id = o.id
              AND f.aktivni = 1
              AND f.fa_cislo_vema LIKE :search_faktury
        )
    )";
    
    $params[':search1'] = '%' . $search_term . '%';
    $params[':search2'] = '%' . $search_term . '%';
    $params[':search3'] = '%' . $search_term . '%';
    $params[':search_prilohy'] = '%' . $search_term . '%';
    $params[':search_faktury'] = '%' . $search_term . '%';
}
```

---

### Performance Improvements

| Metrika | Před (All Enriched) | Po (On-Demand) | Zlepšení |
|---------|---------------------|----------------|----------|
| **Initial load** | 5-15 s | 0.5-2 s | **-90%** |
| **Response size** | 5-20 MB | 50-200 KB | **-98%** |
| **SQL dotazů** | 100+ | 1-5 | **-95%** |
| **Rozbalení řádku** | instant | 100-300 ms | Přijatelné |
| **Rozbalit všechny (50)** | N/A | 2-5 s | Background |

---

## 🚨 Rizika a Mitigace
- ✅ Performance tuning

##### Fáze 3: Rollout (1 týden)
- ✅ Pustit všem uživatelům
- ✅ Monitoring
- ✅ Hot fixes pokud potřeba

##### Fáze 4: Deprecation (1-2 měsíce)
- ✅ Informovat uživatele o přechodu
- ✅ Nastavit redirect ze staré na novou stránku
- ✅ Odstranit starou verzi (volitelné)

**Celková doba:** **3-5 týdnů** (včetně testování a rollout)

---

## 🎯 Doporučení: Varianta B (Paralelní Systém)

### Proč Varianta B?

1. **Zero Risk Approach** ✅
   - Stávající systém zůstává plně funkční
   - Uživatelé mohou používat starou verzi kdykoliv
   - Žádné breaking changes

2. **Postupné Testování** ✅
   - Beta testing na vybrané skupině
   - Real-world feedback před plným rollout
   - Možnost oprav bez dopadu na produkci

3. **Flexibilita** ✅
   - Feature flag - zapnout/vypnout kdykoliv
   - A/B testing možnosti
   - Paralelní vývoj na obou verzích

4. **Sdílený Kód** ✅
   - Komponenty jako OrderFormReadOnly, OrderContextMenu, atd. se používají v obou
   - Lock system, Draft system - nezávislé
   - Přílohy, DOCX generování - sdílené

5. **Rychlejší Time-to-Market** ✅
   - 2 týdny vývoje → můžeme pustit beta
   - Postupný rollout podle potřeby
   - Žádné čekání na kompletní dokončení

### Srovnání Variant

| Kritérium | Varianta A (Big Bang) | **Varianta B (Paralelní)** | Varianta C (Refactor) |
|-----------|----------------------|----------------------------|----------------------|
| **Riziko** | ⚠️ Střední | ✅ Nízké | ⚠️⚠️ Vysoké |
| **Čas vývoje** | 1-2 týdny | 2 týdny | 2-3 týdny |
| **Testování** | ⚠️ Složité | ✅ Snadné | ⚠️⚠️ Velmi složité |
| **Rollback** | ⚠️ Obtížný | ✅ Snadný (jen vypnout) | ⚠️⚠️ Téměř nemožný |
| **Uživatelská zkušenost** | ⚠️ Náhlá změna | ✅ Postupný přechod | ⚠️ Náhlá změna + riziko bugů |
| **Maintenance** | ✅ Jeden codebase | ⚠️ Dva codebasy (dočasně) | ✅ Jeden codebase |
| **Flexibilita** | ⚠️ Nízká | ✅ Vysoká | ⚠️ Nízká |

---

## 📋 Implementation Checklist - Varianta B

### Backend (PHP)

- [ ] **orderV2PagingEndpoints.php**
  - [ ] handle_order_v2_paging_list() - LIST s pagingem
  - [ ] handle_order_v2_paging_get() - wrapper na původní GET
  - [ ] handle_order_v2_paging_create/update/delete - wrappery
  - [ ] Statistiky (agregace v SQL)
  - [ ] Server-side filtering (všechny filtry)
  - [ ] Pagination metadata
  
- [ ] **api.php**
  - [ ] Include nového souboru
  - [ ] Registrace routes /order-v2-paging/*
  - [ ] Testing endpoint pro debug

- [ ] **SQL Optimalizace**
  - [ ] Indexy pro často filtrované sloupce
  - [ ] EXPLAIN analýza dotazů
  - [ ] Performance testing (1000+ objednávek)

### Frontend (React)

- [ ] **apiOrderV2Paging.js**
  - [ ] listOrdersV2Paging() - hlavní API call
  - [ ] Re-export ostatních funkcí z apiOrderV2.js
  - [ ] Error handling
  - [ ] Timeout config (30s)
  
- [ ] **orders25PagingCache.js**
  - [ ] Cache implementation
  - [ ] get/set/clear metody
  - [ ] Cache timeout (5 min)
  - [ ] Max cache size (20 stránek)
  
- [ ] **useDebounce.js**
  - [ ] Custom hook pro debounce
  - [ ] Konfigurovatelný delay (default 500ms)
  
- [ ] **Orders25ListPaging.js**
  - [ ] Klonovat strukturu z Orders25List.js
  - [ ] State management (pagination, filtry)
  - [ ] loadOrders() hook s cache
  - [ ] Filter handlers s debounce
  - [ ] Pagination controls
  - [ ] Dashboard cards s BE stats
  - [ ] Tabulka (reuse components)
  - [ ] Loading states
  
- [ ] **App.js**
  - [ ] Přidat route /orders25-paging
  - [ ] Přidat do menu s "NEW" badge
  - [ ] Feature flag support (volitelné)

### Dokumentace

- [ ] **API Specification**
  - [ ] Request/Response formáty
  - [ ] Filtry a jejich chování
  - [ ] Error kódy
  - [ ] Rate limiting (pokud je)
  
- [ ] **Migration Guide**
  - [ ] Pro uživatele (co se mění)
  - [ ] Pro vývojáře (jak to funguje)
  - [ ] Known issues
  - [ ] FAQ

- [ ] **Testing Plan**
  - [ ] Unit testy (Jest)
  - [ ] Integration testy
  - [ ] E2E testy (Cypress/Playwright)
  - [ ] Performance benchmarks

### Testing

- [ ] **Backend Testing**
  - [ ] PHPUnit testy pro endpoints
  - [ ] Pagination works correctly
  - [ ] Filters work correctly
  - [ ] Stats calculation correct
  - [ ] Permissions respected
  - [ ] Performance < 1s pro 1000+ orders
  
- [ ] **Frontend Testing**
  - [ ] Jest unit testy
  - [ ] Cache works correctly
  - [ ] Debounce works correctly
  - [ ] Pagination controls work
  - [ ] Filters reset page to 1
  - [ ] Loading states correct
  
- [ ] **Manual Testing**
  - [ ] Happy path (základní flow)
  - [ ] Edge cases (prázdný seznam, 1 záznam, atd.)
  - [ ] Performance testing (velké datasety)
  - [ ] Cross-browser testing
  - [ ] Mobile responsive
  
- [ ] **User Acceptance Testing**
  - [ ] Beta testing s vybranými uživateli
  - [ ] Feedback collection
  - [ ] Bug fixes
  - [ ] Performance tuning

### Deployment

- [ ] **Pre-deployment**
  - [ ] Code review
  - [ ] Security audit
  - [ ] Performance profiling
  - [ ] Backup produkce
  
- [ ] **Deployment**
  - [ ] Deploy backend (PHP files)
  - [ ] Deploy frontend (build + upload)
  - [ ] Test na produkci
  - [ ] Enable route/menu link
  
- [ ] **Post-deployment**
  - [ ] Monitoring (errors, performance)
  - [ ] User feedback collection
  - [ ] Hot fixes pokud potřeba
  - [ ] Documentation updates

### Rollout Strategy

**Fáze 1: Internal Testing (1 týden)**
- Pustit pouze interním uživatelům (admin, dev tým)
- Testovat všechny funkce
- Sbírat feedback

**Fáze 2: Beta Testing (1-2 týdny)**
- Pustit vybrané skupině power users
- Monitoring použití
- Opravy bugů a UX tweaks

**Fáze 3: Gradual Rollout (1 týden)**
- Pustit 25% uživatelů
- Monitoring stability
- Pustit 50% uživatelů
- Monitoring performance
- Pustit 100% uživatelů

**Fáze 4: Migration (1-2 měsíce)**
- Informovat uživatele o nové verzi
- Nabídnout školení/tutorial
- Nastavit redirect ze staré na novou (volitelné)
- Zhodnotit úspěšnost

---

### Varianta C: Postupná Migrace Stávajícího Souboru - NEDOPORUČENO

**⚠️ RIZIKO:** Refaktoring 18 795 řádků kódu s desítkami závislostí

**Postup:**

#### Fáze 1: Backend API Ready (3-5 dní)
- ✅ Upravit `handle_order_v2_list()` pro pagination
- ✅ Přidat server-side filtering
- ✅ Implementovat agregované statistiky
- ✅ Testování API (Postman, OrderV2TestPanel)

#### Fáze 2: Frontend Základy (2-3 dny)
- ✅ Upravit `listOrdersV2()` service
- ✅ Přidat pagination state
- ✅ Implementovat `loadOrders()` hook
- ✅ Základní fungování bez pokročilých filtrů

#### Fáze 3: Filtry (2-3 dny)
- ✅ Sloupcové filtry → BE params
- ✅ Dashboard cards → BE filter_status
- ✅ Debounce pro text inputy

#### Fáze 4: UI Vylepšení (1-2 dny)
- ✅ Pagination controls
- ✅ Loading states
- ✅ Dashboard cards s BE stats

#### Fáze 5: Optimalizace (1-2 dny)
- ✅ Cache implementation
- ✅ SQL indexy
- ✅ Performance tuning

**Celková doba:** **10-15 pracovních dní**

**Výhody:**
- ✅ Postupné testování každé fáze
- ✅ Možnost rollbacku po každé fázi
- ✅ Nižší riziko

---

## 🚨 Rizika a Mitigace

### Riziko 1: Kompatibilita s existujícími features

**Problém:** Orders25List má 18 795 řádků s mnoha features:
- Rozbalitelné řádky (expanded rows)
- Inline editace
- Kontextové menu
- Draft system
- Lock system
- Přílohy
- Generování DOCX
- Finanční kontrola
- ...

**Mitigace:**
- ✅ Všechny tyto features fungují na úrovni jednotlivých objednávek (nezávisle na paging)
- ✅ Rozbalení řádku = načte detail z BE (už implementováno)
- ✅ Lock system = nezávislý na list data
- ✅ Draft system = lokální storage (nezávislý)

**Závěr:** Minimum konfliktů s existujícími features.

### Riziko 2: Performance BE při velkém množství filtrů

**Problém:** Komplexní SQL s mnoha filtry může být pomalý

**Mitigace:**
- ✅ Optimalizované indexy
- ✅ EXPLAIN analýza každého dotazu
- ✅ Caching výsledků na BE (Redis/Memcached)
- ✅ Query timeout (30 sekund)

### Riziko 3: User očekávání (změna chování)

**Problém:** Uživatelé zvyklí na:
- Instant změna stránky (protože FE)
- Offline filtrování (data už načtená)

**Mitigace:**
- ✅ Cache pro instant page change (5 min cache)
- ✅ Optimalizované BE API (sub-second response)
- ✅ UX vylepšení (smooth loading states)
- ✅ Komunikace změn s uživateli

### Riziko 4: Regrese funkčnosti

**Problém:** Refaktoring může přinést bugy

**Mitigace:**
- ✅ Postupná migrace (fáze po fázích)
- ✅ Paralelní běh obou verzí
- ✅ A/B testing
- ✅ Monitoring chyb (Sentry)
- ✅ Rollback plán

---

## 🧪 Testing Strategy

### Backend Testing

```php
// PHPUnit testy pro handle_order_v2_list()

class OrderV2ListTest extends TestCase {
    public function testPaginationWorks() {
        // Test že pagination vrací správný počet záznamů
    }
    
    public function testFilteringByStatus() {
        // Test že filter_status funguje
    }
    
    public function testColumnFilters() {
        // Test sloupcových filtrů (LIKE search)
    }
    
    public function testStatsCalculation() {
        // Test že statistiky jsou správně
    }
    
    public function testPermissions() {
        // Test že role-based filtering funguje
    }
}
```

### Frontend Testing

```javascript
// Jest/React Testing Library

describe('Orders25List', () => {
  test('loads first page on mount', async () => {
    // Mocknutý API call
    // Ověřit že se volá s page=1
  });
  
  test('changes page when pagination button clicked', async () => {
    // Klik na "Další"
    // Ověřit že se volá API s page=2
  });
  
  test('resets to page 1 when filter changes', async () => {
    // Změnit filtr
    // Ověřit že se volá API s page=1
  });
  
  test('applies debounce to text filters', async () => {
    // Napsat text do filtru
    // Ověřit že se API volá až po 500ms
  });
});
```

### Manual Testing Checklist

- [ ] **Pagination:**
  - [ ] První stránka se načte správně
  - [ ] Změna stránky funguje (Další/Předchozí)
  - [ ] První/Poslední stránka
  - [ ] Změna items per page (10/25/50/100/250)
  
- [ ] **Filtering:**
  - [ ] Sloupcové filtry (číslo, předmět, dodavatel, ...)
  - [ ] Dashboard cards (status filter)
  - [ ] "Moje objednávky" checkbox (pro ADMIN)
  - [ ] Date range filter
  - [ ] Price range filter
  - [ ] Clear filters button
  
- [ ] **Performance:**
  - [ ] Initial load < 2 sekundy
  - [ ] Page change < 500ms
  - [ ] Filter change < 500ms
  - [ ] Žádné memory leaky
  
- [ ] **Kompatibilita:**
  - [ ] Rozbalení řádku funguje
  - [ ] Inline editace funguje
  - [ ] Kontextové menu funguje
  - [ ] Lock system funguje
  - [ ] Draft system funguje

---

## 📝 Dokumentace Pro Realizaci

### Soubory K Vytvoření/Úpravě

#### Backend (PHP)

```
/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/
  ├── orderV2Endpoints.php         [UPRAVIT] handle_order_v2_list()
  └── orderV2Helpers.php           [VYTVOŘIT] Helper funkce pro statistiky
```

#### Frontend (JavaScript/React)

```
/apps/eeo-v2/client/src/
  ├── services/
  │   ├── apiOrderV2.js            [UPRAVIT] listOrdersV2()
  │   └── orders25ListCacheService.js [VYTVOŘIT] Cache service
  │
  ├── pages/
  │   └── Orders25List.js          [UPRAVIT] Hlavní component
  │
  ├── hooks/
  │   └── useDebounce.js           [VYTVOŘIT] Debounce hook
  │
  └── utils/
      └── orderFilters.js          [ODSTRANIT] FE filtering funkce (už nepotřeba)
```

#### Dokumentace

```
/docs/
  ├── ORDERS25LIST_BACKEND_PAGINATION_ANALYSIS.md    [TENTO SOUBOR]
  ├── ORDERS25LIST_MIGRATION_GUIDE.md                [VYTVOŘIT] Step-by-step guide
  └── ORDERS25LIST_API_SPECIFICATION.md              [VYTVOŘIT] API dokumentace
```

---

## 🎯 Závěr a Doporučení

### Doporučení: ANO, provést refaktoring

**Důvody:**

1. **Performance je kritický** - Současný stav je neudržitelný při růstu dat
2. **Konzistence** - Invoices25List už funguje správně, Orders25List by měl být stejný
3. **Škálovatelnost** - Systém musí fungovat i s tisíci objednávek
4. **Maintainability** - Jednodušší kód, snazší debugování

### Postup:

1. **Fáze 1: Backend API** (priorita)
   - Implementovat pagination a filtering
   - Důkladně otestovat
   
2. **Fáze 2: Frontend základy**
   - Upravit service layer
   - Implementovat základní pagination
   
3. **Fáze 3: Filtry a optimalizace**
   - Přenést všechny filtry na BE
   - Implementovat cache a debounce
   
4. **Fáze 4: Polish a release**
   - UX vylepšení
   - Performance tuning
   - Dokumentace

### Časový odhad:
- **Backend:** 3-5 dní
- **Frontend:** 5-7 dní
- **Testing & Polish:** 2-3 dny
- **Celkem:** **10-15 pracovních dní** (Varianta C)
- **Celkem (Varianta B - DOPORUČENO):** **10-12 pracovních dní** + 3-5 týdnů rollout

### Návratnost investice:
- **Ušetřený čas uživatelů:** 80% rychlejší loading = 4s ušetřeno při každém načtení
- **Ušetřené náklady BE:** 95% menší response = nižší bandwidth costs
- **Ušetřená frustrace:** Nespokojení uživatelé s pomalým systémem

---

## 📞 Kontakt a Další Kroky

**Realizace:** Tento dokument slouží jako podrobná analýza a plán. Samotná implementace bude provedena později.

**DOPORUČENÍ: Varianta B - Paralelní Systém** 🌟
- Nové soubory: `orderV2PagingEndpoints.php`, `apiOrderV2Paging.js`, `Orders25ListPaging.js`
- Nová route: `/orders25-paging`
- Zachování stávajícího systému bez změny
- Postupné testování a rollout
- Minimální riziko, maximální flexibilita

**Další dokumenty k vytvoření:**
1. `ORDERS25LIST_PAGING_MIGRATION_GUIDE.md` - Step-by-step implementační guide
2. `ORDERS25LIST_PAGING_API_SPEC.md` - Detailní API dokumentace
3. `ORDERS25LIST_PAGING_TESTING_PLAN.md` - Testovací scénáře
4. `ORDERS25LIST_PAGING_USER_GUIDE.md` - Návod pro uživatele

**Příklady souborů k vytvoření:**
```
Backend:
  /lib/orderV2PagingEndpoints.php
  /lib/orderV2PagingHelpers.php

Frontend:
  /src/pages/Orders25ListPaging.js
  /src/services/apiOrderV2Paging.js
  /src/services/orders25PagingCache.js
  /src/hooks/useDebounce.js

Dokumentace:
  /docs/ORDERS25LIST_PAGING_MIGRATION_GUIDE.md
  /docs/ORDERS25LIST_PAGING_API_SPEC.md
  /docs/ORDERS25LIST_PAGING_TESTING_PLAN.md
```

---

**Vytvořeno:** 15. ledna 2026  
**Autor:** GitHub Copilot  
**Verze:** 2.0 (doplněno o Variantu B - Paralelní Systém)
