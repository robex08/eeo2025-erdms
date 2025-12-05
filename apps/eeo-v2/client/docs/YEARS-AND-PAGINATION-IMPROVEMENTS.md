# Vylepšení seznamu roků a paginace v Orders.js

## Datum: 19. října 2025

## 1. Přesunutí "Všechny roky" na konec seznamu ✅

### Problém
V seznamu roků byla možnost "Všechny roky" na začátku, což nebylo intuitivní - uživatelé očekávají nejnovější roky nahoře.

### Řešení
Upravena funkce `getYearsList()` v Orders25List.js tak, aby vrátila roky v sestupném pořadí (nejnovější nahoře) a "Všechny roky" až na konci seznamu.

### Změny v Orders25List.js

#### Před:
```javascript
const getYearsList = () => {
  const currentYear = new Date().getFullYear();
  const startYear = 2016;
  const years = ['all']; // "Všechny roky" první
  
  for (let year = startYear; year <= currentYear; year++) {
    years.push(year);
  }
  
  // Vrať roky v sestupném pořadí, ale "Všechny" zůstane první
  const numericYears = years.slice(1).sort((a, b) => b - a);
  return ['all', ...numericYears];
};
```

#### Po:
```javascript
const getYearsList = () => {
  const currentYear = new Date().getFullYear();
  const startYear = 2016;
  const years = []; // Začni bez "Všechny roky"
  
  for (let year = startYear; year <= currentYear; year++) {
    years.push(year);
  }
  
  if (currentYear < startYear) {
    years.push(currentYear);
  }
  
  // Vrať roky v sestupném pořadí (nejnovější nahoře), "Všechny" až na konci
  const numericYears = years.sort((a, b) => b - a);
  return [...numericYears, 'all']; // "Všechny roky" na konci
};
```

### Výsledek
- **2025** (nejnovější nahoře)
- 2024
- 2023
- ...
- 2016
- **Všechny roky** (na konci)

---

## 2. Paginace v Orders.js s localStorage ✅

### Problém
Orders.js měla základní paginaci bez ukládání stavu do localStorage. Uživatelé po refreshi stránky ztratili nastavení velikosti stránky a aktuální pozici.

### Řešení
Implementována stejná paginace jako v Orders25List.js včetně:
- ✅ Ukládání pageSize do localStorage
- ✅ Ukládání aktuální stránky (pageIndex) do localStorage
- ✅ Moderní UI s tlačítky pro navigaci
- ✅ Info o počtu zobrazených záznamů

### Změny v Orders.js

#### 1. State s localStorage
```javascript
// Table pagination - load from localStorage
const [pageSize, setPageSize] = useState(() => {
  const saved = getUserStorage('orders_pageSize', null);
  return saved ? parseInt(saved, 10) : 25;
});

const [currentPageIndex, setCurrentPageIndex] = useState(() => {
  const saved = getUserStorage('orders_pageIndex', null);
  return saved ? parseInt(saved, 10) : 0;
});

// Save pageSize to localStorage when it changes
useEffect(() => {
  setUserStorage('orders_pageSize', pageSize.toString());
}, [pageSize]);

// Save currentPageIndex to localStorage when it changes
useEffect(() => {
  setUserStorage('orders_pageIndex', currentPageIndex.toString());
}, [currentPageIndex]);
```

#### 2. Upravený useReactTable
```javascript
const table = useReactTable({
  data: filteredData,
  columns,
  state: {
    globalFilter,
    sorting,
    expanded,
    pagination: {
      pageIndex: currentPageIndex,
      pageSize: pageSize,
    },
  },
  onGlobalFilterChange: setGlobalFilter,
  onSortingChange: setSorting,
  onExpandedChange: setExpanded,
  onPaginationChange: (updater) => {
    if (typeof updater === 'function') {
      const newPagination = updater({ pageIndex: currentPageIndex, pageSize: pageSize });
      setCurrentPageIndex(newPagination.pageIndex);
      setPageSize(newPagination.pageSize);
    }
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  getRowCanExpand: (row) => row.original.subRows?.length > 0,
  manualPagination: false,
});
```

#### 3. Nové styled komponenty
```javascript
// Pagination
const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
`;

const PaginationInfo = styled.div`
  font-size: 0.875rem;
  color: #64748b;
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const PageButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #3b82f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
`;

const PageSizeSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 0.875rem;
  cursor: pointer;
`;
```

#### 4. Nová pagination UI
```jsx
<PaginationContainer>
  <PaginationInfo>
    Zobrazeno {table.getRowModel().rows.length} z {filteredData.length} objednávek
    {filteredData.length !== orders.length && (
      <span> (filtrováno z {orders.length})</span>
    )}
  </PaginationInfo>
  
  <PaginationControls>
    <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '1rem' }}>
      Zobrazit:
    </span>
    <PageSizeSelect
      value={pageSize}
      onChange={(e) => {
        const newSize = parseInt(e.target.value);
        setPageSize(newSize);
        table.setPageSize(newSize);
        setCurrentPageIndex(0);
        table.setPageIndex(0);
      }}
    >
      <option value={10}>10</option>
      <option value={25}>25</option>
      <option value={50}>50</option>
      <option value={100}>100</option>
      <option value={250}>250</option>
    </PageSizeSelect>
    
    {/* První stránka */}
    <PageButton
      onClick={() => {
        table.setPageIndex(0);
        setCurrentPageIndex(0);
      }}
      disabled={!table.getCanPreviousPage()}
    >
      ««
    </PageButton>
    
    {/* Předchozí stránka */}
    <PageButton
      onClick={() => {
        table.previousPage();
        setCurrentPageIndex(table.getState().pagination.pageIndex - 1);
      }}
      disabled={!table.getCanPreviousPage()}
    >
      ‹
    </PageButton>
    
    {/* Info o aktuální stránce */}
    <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
      Stránka {table.getState().pagination.pageIndex + 1} z {table.getPageCount()}
    </span>
    
    {/* Další stránka */}
    <PageButton
      onClick={() => {
        table.nextPage();
        setCurrentPageIndex(table.getState().pagination.pageIndex + 1);
      }}
      disabled={!table.getCanNextPage()}
    >
      ›
    </PageButton>
    
    {/* Poslední stránka */}
    <PageButton
      onClick={() => {
        const lastPage = table.getPageCount() - 1;
        table.setPageIndex(lastPage);
        setCurrentPageIndex(lastPage);
      }}
      disabled={!table.getCanNextPage()}
    >
      »»
    </PageButton>
  </PaginationControls>
</PaginationContainer>
```

---

## Funkce paginace

### Tlačítka navigace:
- **««** - Skočit na první stránku
- **‹** - Předchozí stránka
- **›** - Další stránka
- **»»** - Skočit na poslední stránku

### Výběr velikosti stránky:
- 10, 25, 50, 100, 250 záznamů
- Při změně se automaticky skočí na první stránku
- Volba se ukládá do localStorage

### Informace:
- "Zobrazeno X z Y objednávek"
- "(filtrováno z Z)" - pokud jsou aktivní filtry
- "Stránka X z Y"

### localStorage klíče:
- `orders_pageSize_{username}` - velikost stránky
- `orders_pageIndex_{username}` - aktuální stránka
- Izolace podle uživatele pomocí `getUserStorage()`/`setUserStorage()`

---

## Výhody

### Pro Orders25List.js:
✅ Intuitivnější pořadí roků (nejnovější nahoře)
✅ "Všechny roky" logicky až na konci

### Pro Orders.js:
✅ Konzistentní UI s Orders25List.js
✅ Perzistence nastavení mezi relacemi
✅ Lepší UX - uživatel neztratí pozici po refreshi
✅ Moderní vzhled pagination panelu
✅ Detailní informace o zobrazených záznamech

---

## Testování

### Před nasazením ověřte:
1. ✅ Seznam roků má nejnovější rok nahoře
2. ✅ "Všechny roky" je až na konci seznamu
3. ✅ Paginace v Orders.js funguje
4. ✅ PageSize se ukládá do localStorage
5. ✅ PageIndex se ukládá do localStorage
6. ✅ Po refreshi stránky se obnoví nastavení
7. ✅ Tlačítka navigace fungují správně
8. ✅ Změna pageSize resetuje na první stránku
9. ✅ Žádné chyby v konzoli

---

**Status:** ✅ HOTOVO
**Soubory změněny:**
- Orders25List.js
- Orders.js

**Datum:** 19. října 2025
