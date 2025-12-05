# 📋 Design Guidelines - Tabulky v číselníkách

## 🎯 Účel dokumentu
Tento dokument definuje **přesný vzhled a chování tabulek** v podsekcích číselníků (Dictionaries). Slouží jako referenční příručka pro implementaci nových tabulek nebo úpravu stávajících.

---

## 🎨 1. STRUKTURA TABULKY

### 1.1 Hlavička tabulky (Table Header)

#### První řádek - Názvy sloupců
```javascript
<TableHeaderCell>
  <HeaderContent 
    onClick={() => column.getToggleSortingHandler()} 
    style={{ cursor: 'pointer' }}
  >
    <span>{column.columnDef.header}</span>
    {column.getIsSorted() && (
      <FontAwesomeIcon 
        icon={column.getIsSorted() === 'asc' ? faChevronUp : faChevronDown}
        style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}
      />
    )}
  </HeaderContent>
</TableHeaderCell>
```

**Pravidla:**
- Šipka řazení (`▲`/`▼`) je **INLINE** s textem, NE pod ním
- `marginLeft: 0.5rem` mezi textem a šipkou
- Šipka velikost: `font-size: 0.75rem`
- Celá buňka je klikací pro řazení
- Cursor: `pointer` při hover

#### Druhý řádek - Filtry sloupců
Každý sloupec má v druhém řádku hlavičky svůj filtr (viz sekce 2).

### 1.2 Styling buněk

```javascript
const TableCell = styled.td`
  padding: 0.75rem 1rem;  // ← KRITICKÉ: zvýšený padding pro čitelnost
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
  color: #374151;
  vertical-align: middle;
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem 1rem;  // ← Stejný jako buňky
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 600;
  font-size: 0.875rem;
  color: #111827;
  text-align: left;
  position: sticky;
  top: 0;
  z-index: 10;
`;
```

### 1.3 ID sloupec - ODSTRANIT a použít superscript

❌ **NESPRÁVNĚ:**
```javascript
{
  accessorKey: 'id',
  header: 'ID',
  cell: ({ row }) => row.original.id
}
```

✅ **SPRÁVNĚ:**
```javascript
{
  accessorKey: 'nazev',
  header: 'Název',
  cell: ({ row }) => (
    <div>
      {row.original.nazev}
      <sup style={{
        fontSize: '0.65em',
        opacity: 0.6,
        marginLeft: '0.25rem',
        color: '#6b7280'
      }}>
        {row.original.id}
      </sup>
    </div>
  )
}
```

**Důležité:**
- ID jako **horní index** (superscript) za názvem
- Font-size: `0.65em` (relativní k rodičovskému fontu)
- Opacity: `0.6` (je to méně důležitá informace)
- MarginLeft: `0.25rem` (mezera před číslem)

---

## 🔍 2. FILTROVÁNÍ - TYPY A IMPLEMENTACE

### 2.1 Fulltextové vyhledávání (Global Filter)

**Umístění:** ActionBar nad tabulkou

```javascript
<SearchBox>
  <FontAwesomeIcon icon={faSearch} />
  <SearchInput
    type="text"
    placeholder="Vyhledat..."
    value={globalFilter}
    onChange={(e) => setGlobalFilter(e.target.value)}
  />
</SearchBox>
```

**Styled komponenty:**
```javascript
const SearchBox = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
  
  > svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    pointer-events: none;
    width: 16px;
    height: 16px;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.625rem 0.75rem 0.625rem 2.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;
```

**Logika filtrování:**
```javascript
const filteredData = useMemo(() => {
  return data.filter((item) => {
    if (globalFilter) {
      const searchLower = globalFilter.toLowerCase();
      const matchGlobal = 
        (item.nazev || '').toLowerCase().includes(searchLower) ||
        (item.popis || '').toLowerCase().includes(searchLower) ||
        (item.typ_dokumentu || '').toLowerCase().includes(searchLower) ||
        (item.verze || '').toString().toLowerCase().includes(searchLower);
      
      if (!matchGlobal) return false;
    }
    return true;
  });
}, [data, globalFilter]);
```

---

### 2.2 Sloupcové filtry - TEXTOVÉ

**Druhý řádek hlavičky tabulky:**

```javascript
<TableHeaderCell key={header.id}>
  {header.id === 'nazev' ? (
    <ColumnFilterWrapper>
      <FontAwesomeIcon icon={faSearch} />
      <ColumnFilterInput
        type="text"
        placeholder="Filtrovat..."
        value={columnFilters[header.id] || ''}
        onChange={(e) => {
          const value = e.target.value;
          setColumnFilters(prev => {
            if (!value) {
              const { [header.id]: removed, ...rest } = prev;
              return rest;
            }
            return { ...prev, [header.id]: value };
          });
        }}
      />
      {columnFilters[header.id] && (
        <ColumnClearButton
          onClick={() => {
            setColumnFilters(prev => {
              const { [header.id]: removed, ...rest } = prev;
              return rest;
            });
          }}
        >
          <FontAwesomeIcon icon={faTimes} />
        </ColumnClearButton>
      )}
    </ColumnFilterWrapper>
  ) : null}
</TableHeaderCell>
```

**Styled komponenty pro textové filtry:**
```javascript
const ColumnFilterWrapper = styled.div`
  position: relative;
  width: 100%;
  
  > svg:first-of-type {
    position: absolute;
    left: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 12px !important;
    height: 12px !important;
  }
`;

const ColumnFilterInput = styled.input`
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 2rem;  // ← 2rem z obou stran pro ikony!
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  background: #f9fafb;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
    font-size: 0.75rem;
  }
`;

const ColumnClearButton = styled.button`
  position: absolute;
  right: 0.75rem;  // ← KRITICKÉ! 0.75rem pro správný odstup
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1;
  width: 20px;
  height: 20px;

  &:hover {
    color: #ef4444;
  }
  
  svg {
    width: 12px !important;
    height: 12px !important;
  }
`;
```

**Logika filtrování:**
```javascript
if (columnFilters.nazev && 
    !(item.nazev || '').toLowerCase().includes(columnFilters.nazev.toLowerCase())) {
  return false;
}
```

---

### 2.3 Sloupcové filtry - ČÍSELNÉ (s operátory)

**Podporované operátory:** `>`, `<`, `>=`, `<=`, `=`

**Příklady použití:**
- `> 400` → zobrazí hodnoty větší než 400
- `<= 2` → zobrazí hodnoty menší nebo rovny 2
- `= 1.5` → zobrazí přesně 1.5
- `bez operátoru` → klasické textové hledání (obsahuje)

**Helper funkce:**
```javascript
const compareNumericValue = (itemValue, filterValue) => {
  if (!filterValue || filterValue.trim() === '') return true;
  
  const trimmed = filterValue.trim();
  const operatorMatch = trimmed.match(/^(>=|<=|>|<|=)\s*(.+)$/);
  
  if (!operatorMatch) {
    // Bez operátoru - textové hledání
    return String(itemValue || '').toLowerCase().includes(trimmed.toLowerCase());
  }
  
  const operator = operatorMatch[1];
  const valueStr = operatorMatch[2].trim();
  const compareValue = parseFloat(valueStr);
  
  if (isNaN(compareValue)) return true; // Neplatné číslo - ignorovat
  
  const numericItemValue = parseFloat(itemValue);
  if (isNaN(numericItemValue)) return false; // Položka nemá číslo
  
  switch (operator) {
    case '>': return numericItemValue > compareValue;
    case '<': return numericItemValue < compareValue;
    case '>=': return numericItemValue >= compareValue;
    case '<=': return numericItemValue <= compareValue;
    case '=': return numericItemValue === compareValue;
    default: return true;
  }
};
```

**Použití v filtrování:**
```javascript
// Číselné sloupce
if (columnFilters.verze && !compareNumericValue(item.verze, columnFilters.verze)) {
  return false;
}
if (columnFilters.velikost_souboru && 
    !compareNumericValue(item.velikost_souboru, columnFilters.velikost_souboru)) {
  return false;
}
```

**UI je stejné jako textové filtry**, jen placeholder může být jiný:
```javascript
<ColumnFilterInput
  type="text"
  placeholder=">= 1"  // ← Nápověda o operátorech
  value={columnFilters.verze || ''}
  onChange={...}
/>
```

---

### 2.4 Sloupcové filtry - IKONY (boolean/status sloupce)

**Použití:** Pro sloupce jako "Aktivní/Neaktivní", "OK/Error" atd.

**Tři stavy ikony:**
1. **ALL** - zobrazí vše (půlená ikona - vlevo zelená, vpravo červená)
2. **ACTIVE/OK** - jen zelené (plná zelená ikona)
3. **INACTIVE/ERROR** - jen červené (plná červená ikona)

#### 2.4.1 Stav "ALL" - Split icon pomocí clipPath

```javascript
const IconFilterButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 0.7;
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

// V JSX:
{aktivniFilter === 'all' && (
  <svg viewBox="0 0 512 512" style={{ width: '20px', height: '20px' }}>
    <defs>
      <clipPath id="clip-left">
        <rect x="0" y="0" width="256" height="512"/>
      </clipPath>
      <clipPath id="clip-right">
        <rect x="256" y="0" width="256" height="512"/>
      </clipPath>
    </defs>
    {/* Levá polovina - zelená */}
    <path 
      d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z" 
      fill="#22c55e" 
      clipPath="url(#clip-left)"
    />
    {/* Pravá polovina - červená */}
    <path 
      d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z" 
      fill="#ef4444" 
      clipPath="url(#clip-right)"
    />
  </svg>
)}
```

#### 2.4.2 Stav "ACTIVE/OK" - Plná zelená ikona

```javascript
{aktivniFilter === 'aktivni' && (
  <FontAwesomeIcon 
    icon={faCheckCircle} 
    style={{ 
      color: '#22c55e',  // ← Tailwind green-500
      fontSize: '20px' 
    }}
  />
)}
```

#### 2.4.3 Stav "INACTIVE/ERROR" - Plná červená ikona

```javascript
{aktivniFilter === 'neaktivni' && (
  <FontAwesomeIcon 
    icon={faTimesCircle} 
    style={{ 
      color: '#ef4444',  // ← Tailwind red-500
      fontSize: '20px' 
    }}
  />
)}
```

#### 2.4.4 Kompletní příklad - Sloupec "Stav"

```javascript
// State
const [aktivniFilter, setAktivniFilter] = useState('all'); // 'all' | 'aktivni' | 'neaktivni'

// Handler
const handleAktivniFilterClick = () => {
  setAktivniFilter(prev => {
    if (prev === 'all') return 'aktivni';
    if (prev === 'aktivni') return 'neaktivni';
    return 'all';
  });
};

// JSX v druhém řádku hlavičky
{header.id === 'aktivni' ? (
  <div style={{ display: 'flex', justifyContent: 'center' }}>
    <IconFilterButton 
      onClick={handleAktivniFilterClick}
      title={
        aktivniFilter === 'all' ? 'Zobrazit vše' :
        aktivniFilter === 'aktivni' ? 'Jen aktivní' :
        'Jen neaktivní'
      }
    >
      {aktivniFilter === 'all' && (
        <svg viewBox="0 0 512 512" style={{ width: '20px', height: '20px' }}>
          <defs>
            <clipPath id="clip-left-aktivni">
              <rect x="0" y="0" width="256" height="512"/>
            </clipPath>
            <clipPath id="clip-right-aktivni">
              <rect x="256" y="0" width="256" height="512"/>
            </clipPath>
          </defs>
          <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z" 
                fill="#22c55e" clipPath="url(#clip-left-aktivni)"/>
          <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z" 
                fill="#ef4444" clipPath="url(#clip-right-aktivni)"/>
        </svg>
      )}
      {aktivniFilter === 'aktivni' && (
        <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#22c55e', fontSize: '20px' }}/>
      )}
      {aktivniFilter === 'neaktivni' && (
        <FontAwesomeIcon icon={faTimesCircle} style={{ color: '#ef4444', fontSize: '20px' }}/>
      )}
    </IconFilterButton>
  </div>
) : null}
```

#### 2.4.5 Logika filtrování

```javascript
const filteredData = useMemo(() => {
  return data.filter((item) => {
    // Filtr aktivní/neaktivní
    if (aktivniFilter === 'aktivni' && !item.aktivni) return false;
    if (aktivniFilter === 'neaktivni' && item.aktivni) return false;
    // 'all' - zobrazí vše
    
    return true;
  });
}, [data, aktivniFilter]);
```

**Důležité:**
- Použij **truthy/falsy** (`!item.aktivni` a `item.aktivni`), NE striktní porovnání
- Backend může vracet `1/0`, `true/false`, nebo `"1"/"0"`
- clipPath ID musí být **unikátní** pro každý sloupec (např. `clip-left-aktivni`, `clip-left-disk`)

---

### 2.5 Tlačítko "Smazat všechny filtry"

**Umístění:** Sloupec "Akce", druhý řádek hlavičky

```javascript
const FilterActionButton = styled.button`
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;

  &:hover {
    background: #f3f4f6;
    border-color: #3b82f6;
    color: #3b82f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// V JSX
{header.id === 'actions' ? (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '32px' }}>
    <FilterActionButton
      onClick={() => {
        setColumnFilters({});
        setAktivniFilter('all');
        setDiskFilter('all');
      }}
      title="Vymazat všechny filtry sloupců"
      disabled={
        Object.keys(columnFilters).length === 0 && 
        aktivniFilter === 'all' && 
        diskFilter === 'all'
      }
    >
      <FontAwesomeIcon icon={faEraser} />
    </FilterActionButton>
  </div>
) : null}
```

---

## 💾 3. LOCALSTORAGE - PERZISTENCE FILTRŮ

### 3.1 Inicializace - Helper funkce

**Přidat do komponenty:**
```javascript
import { AuthContext } from '../../../context/AuthContext';

const YourTab = () => {
  const { token, user, userDetail } = useContext(AuthContext);
  
  // Helper functions for user-specific localStorage
  const user_id = userDetail?.user_id;
  
  const getUserKey = (baseKey) => {
    const sid = user_id || 'anon';
    return `${baseKey}_${sid}`;
  };

  const getUserStorage = (baseKey, defaultValue = null) => {
    try {
      const item = localStorage.getItem(getUserKey(baseKey));
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  const setUserStorage = (baseKey, value) => {
    try {
      localStorage.setItem(getUserKey(baseKey), JSON.stringify(value));
    } catch (error) {
      // Ignorovat chyby zápisu
    }
  };
  
  // ... zbytek komponenty
};
```

### 3.2 Inicializace stavů s localStorage

```javascript
// Fulltextové vyhledávání
const [globalFilter, setGlobalFilter] = useState(() => {
  return getUserStorage('tabulka_globalFilter', '');
});

// Sloupcové filtry
const [columnFilters, setColumnFilters] = useState(() => {
  return getUserStorage('tabulka_columnFilters', {});
});

// Icon filtry
const [aktivniFilter, setAktivniFilter] = useState(() => {
  return getUserStorage('tabulka_aktivniFilter', 'all');
});

const [diskFilter, setDiskFilter] = useState(() => {
  return getUserStorage('tabulka_diskFilter', 'all');
});

// Řazení (pokud je)
const [sorting, setSorting] = useState(() => {
  return getUserStorage('tabulka_sorting', []);
});

// Velikost stránky
const [pageSize, setPageSize] = useState(() => {
  return getUserStorage('tabulka_pageSize', 25);
});
```

### 3.3 Ukládání změn do localStorage

```javascript
// Save filters to localStorage when they change
useEffect(() => {
  setUserStorage('tabulka_globalFilter', globalFilter);
}, [globalFilter, user_id]);

useEffect(() => {
  setUserStorage('tabulka_columnFilters', columnFilters);
}, [columnFilters, user_id]);

useEffect(() => {
  setUserStorage('tabulka_aktivniFilter', aktivniFilter);
}, [aktivniFilter, user_id]);

useEffect(() => {
  setUserStorage('tabulka_diskFilter', diskFilter);
}, [diskFilter, user_id]);

useEffect(() => {
  setUserStorage('tabulka_sorting', sorting);
}, [sorting, user_id]);

useEffect(() => {
  setUserStorage('tabulka_pageSize', pageSize);
}, [pageSize, user_id]);
```

### 3.4 Naming konvence pro localStorage klíče

**Formát:** `{tabulka}_{typ}_${user_id}`

**Příklady:**
- `docxSablony_globalFilter_123`
- `docxSablony_columnFilters_123`
- `docxSablony_aktivniFilter_123`
- `lokality_globalFilter_123`
- `lokality_sorting_123`
- `role_searchText_123`

**Důležité:**
- Každý tab má svůj prefix (`docxSablony`, `lokality`, `role`, atd.)
- Každý uživatel má svá data (podle `user_id`)
- Anonymní uživatelé: `{tabulka}_{typ}_anon`

---

## 🎭 4. IKONY V BUŇKÁCH

### 4.1 Preview ikona - DISABLED místo hidden

❌ **NESPRÁVNĚ:**
```javascript
{canPreview && (
  <IconButton onClick={() => handlePreview(row.original)}>
    <FontAwesomeIcon icon={faEye} />
  </IconButton>
)}
```

✅ **SPRÁVNĚ:**
```javascript
<IconButton 
  onClick={() => canPreview && handlePreview(row.original)}
  disabled={!canPreview}
  title={canPreview ? 'Náhled' : 'Náhled není dostupný'}
  style={{ 
    opacity: canPreview ? 1 : 0.3,
    cursor: canPreview ? 'pointer' : 'not-allowed'
  }}
>
  <FontAwesomeIcon icon={faEye} />
</IconButton>
```

**Důvod:** 
- Uživatel vidí, že funkce existuje, ale není dostupná
- Vizuálně konzistentnější (všechny řádky mají stejné ikony)
- Lepší UX - uživatel ví proč nemůže kliknout (tooltip)

### 4.2 Centrování ikon v buňce

```javascript
const ActionCell = styled.td`
  padding: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;  // ← horizontální centrování
  align-items: center;      // ← vertikální centrování
  gap: 0.5rem;
`;
```

---

## 📚 5. KOMPLETNÍ PŘÍKLAD - DocxSablonyTab

### 5.1 Imports

```javascript
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, faEdit, faTrash, faDownload, faEye, faEraser,
  faCheckCircle, faTimesCircle, faHdd, faChevronUp, faChevronDown, faTimes
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../../context/AuthContext';
import { ToastContext } from '../../../context/ToastContext';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
```

### 5.2 Styled Components

```javascript
// ... (všechny styled komponenty z předchozích sekcí)
```

### 5.3 Komponenta

```javascript
const DocxSablonyTab = () => {
  const { token, user, userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  
  // ============= LOCALSTORAGE HELPERS =============
  const user_id = userDetail?.user_id;
  
  const getUserKey = (baseKey) => {
    const sid = user_id || 'anon';
    return `${baseKey}_${sid}`;
  };

  const getUserStorage = (baseKey, defaultValue = null) => {
    try {
      const item = localStorage.getItem(getUserKey(baseKey));
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  const setUserStorage = (baseKey, value) => {
    try {
      localStorage.setItem(getUserKey(baseKey), JSON.stringify(value));
    } catch (error) {
      // Ignorovat chyby
    }
  };
  
  // ============= STATE =============
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [globalFilter, setGlobalFilter] = useState(() => {
    return getUserStorage('docxSablony_globalFilter', '');
  });
  
  const [columnFilters, setColumnFilters] = useState(() => {
    return getUserStorage('docxSablony_columnFilters', {});
  });
  
  const [aktivniFilter, setAktivniFilter] = useState(() => {
    return getUserStorage('docxSablony_aktivniFilter', 'all');
  });
  
  const [diskFilter, setDiskFilter] = useState(() => {
    return getUserStorage('docxSablony_diskFilter', 'all');
  });
  
  const [pageSize, setPageSize] = useState(() => {
    return getUserStorage('docxSablony_pageSize', 25);
  });
  
  // ============= HELPER FUNCTIONS =============
  const compareNumericValue = (itemValue, filterValue) => {
    if (!filterValue || filterValue.trim() === '') return true;
    
    const trimmed = filterValue.trim();
    const operatorMatch = trimmed.match(/^(>=|<=|>|<|=)\s*(.+)$/);
    
    if (!operatorMatch) {
      return String(itemValue || '').toLowerCase().includes(trimmed.toLowerCase());
    }
    
    const operator = operatorMatch[1];
    const valueStr = operatorMatch[2].trim();
    const compareValue = parseFloat(valueStr);
    
    if (isNaN(compareValue)) return true;
    
    const numericItemValue = parseFloat(itemValue);
    if (isNaN(numericItemValue)) return false;
    
    switch (operator) {
      case '>': return numericItemValue > compareValue;
      case '<': return numericItemValue < compareValue;
      case '>=': return numericItemValue >= compareValue;
      case '<=': return numericItemValue <= compareValue;
      case '=': return numericItemValue === compareValue;
      default: return true;
    }
  };
  
  // ============= FILTERED DATA =============
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Icon filtry
      if (aktivniFilter === 'aktivni' && !item.aktivni) return false;
      if (aktivniFilter === 'neaktivni' && item.aktivni) return false;
      
      if (diskFilter !== 'all') {
        const status = diskStatus[item.id];
        if (diskFilter === 'ok' && status?.status !== 'ok') return false;
        if (diskFilter === 'error' && status?.status !== 'error') return false;
      }

      // Global filter
      if (globalFilter) {
        const searchLower = globalFilter.toLowerCase();
        const matchGlobal = 
          (item.nazev || '').toLowerCase().includes(searchLower) ||
          (item.popis || '').toLowerCase().includes(searchLower) ||
          (item.typ_dokumentu || '').toLowerCase().includes(searchLower) ||
          (item.verze || '').toString().toLowerCase().includes(searchLower);
        
        if (!matchGlobal) return false;
      }

      // Column filters - textové
      if (columnFilters.nazev && 
          !(item.nazev || '').toLowerCase().includes(columnFilters.nazev.toLowerCase())) {
        return false;
      }
      
      if (columnFilters.typ_dokumentu && 
          !(item.typ_dokumentu || '').toLowerCase().includes(columnFilters.typ_dokumentu.toLowerCase())) {
        return false;
      }
      
      // Column filters - číselné s operátory
      if (columnFilters.verze && !compareNumericValue(item.verze, columnFilters.verze)) {
        return false;
      }
      
      if (columnFilters.velikost_souboru && 
          !compareNumericValue(item.velikost_souboru, columnFilters.velikost_souboru)) {
        return false;
      }

      return true;
    });
  }, [data, globalFilter, columnFilters, aktivniFilter, diskFilter]);
  
  // ============= SAVE TO LOCALSTORAGE =============
  useEffect(() => {
    setUserStorage('docxSablony_globalFilter', globalFilter);
  }, [globalFilter, user_id]);

  useEffect(() => {
    setUserStorage('docxSablony_columnFilters', columnFilters);
  }, [columnFilters, user_id]);

  useEffect(() => {
    setUserStorage('docxSablony_aktivniFilter', aktivniFilter);
  }, [aktivniFilter, user_id]);

  useEffect(() => {
    setUserStorage('docxSablony_diskFilter', diskFilter);
  }, [diskFilter, user_id]);

  useEffect(() => {
    setUserStorage('docxSablony_pageSize', pageSize);
  }, [pageSize, user_id]);
  
  // ============= COLUMNS DEFINITION =============
  const columns = useMemo(() => [
    {
      accessorKey: 'nazev',
      header: 'Název šablony',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FontAwesomeIcon icon={faFileWord} style={{ color: '#2563eb' }} />
          <span>
            {row.original.nazev}
            <sup style={{
              fontSize: '0.65em',
              opacity: 0.6,
              marginLeft: '0.25rem',
              color: '#6b7280'
            }}>
              {row.original.id}
            </sup>
          </span>
        </div>
      )
    },
    // ... další sloupce
  ], []);
  
  // ============= RENDER =============
  return (
    <TabContent>
      {/* Action Bar s fulltextovým vyhledáváním */}
      <ActionBar>
        <SearchBox>
          <FontAwesomeIcon icon={faSearch} />
          <SearchInput
            type="text"
            placeholder="Vyhledat v šablonách..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </SearchBox>
      </ActionBar>
      
      {/* Tabulka */}
      <TableContainer>
        <Table>
          <thead>
            {/* První řádek - názvy sloupců s řazením */}
            <tr>
              {table.getHeaderGroups()[0].headers.map(header => (
                <TableHeaderCell key={header.id}>
                  <HeaderContent 
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: 'pointer' }}
                  >
                    <span>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                    {header.column.getIsSorted() && (
                      <FontAwesomeIcon 
                        icon={header.column.getIsSorted() === 'asc' ? faChevronUp : faChevronDown}
                        style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}
                      />
                    )}
                  </HeaderContent>
                </TableHeaderCell>
              ))}
            </tr>
            
            {/* Druhý řádek - filtry */}
            <tr>
              {table.getHeaderGroups()[0].headers.map(header => (
                <TableHeaderCell key={header.id}>
                  {/* Zde implementovat filtry podle typu sloupce */}
                  {/* (viz sekce 2.2, 2.3, 2.4, 2.5) */}
                </TableHeaderCell>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </TableContainer>
    </TabContent>
  );
};
```

---

## 🎯 6. CHECKLIST PRO NOVOU TABULKU

Před nasazením zkontroluj:

### Struktura
- [ ] Hlavička má dva řádky (názvy + filtry)
- [ ] Šipky řazení jsou INLINE s textem
- [ ] Padding buněk: `0.75rem 1rem`
- [ ] ID jako superscript v názvu (NE samostatný sloupec)

### Fulltextové vyhledávání
- [ ] SearchBox v ActionBar nad tabulkou
- [ ] Ikona lupy vlevo v inputu
- [ ] Padding: `0.625rem 0.75rem 0.625rem 2.5rem`
- [ ] Focus state s modrým borderem a shadow

### Sloupcové filtry - Textové
- [ ] ColumnFilterWrapper s relativním positioningem
- [ ] Ikona lupy vlevo: `left: 0.5rem`
- [ ] Křížek vpravo: `right: 0.75rem` ← **KRITICKÉ!**
- [ ] Input padding: `0.5rem 2rem 0.5rem 2rem`
- [ ] Křížek: `width: 20px`, `height: 20px`

### Sloupcové filtry - Číselné
- [ ] Funkce `compareNumericValue` implementována
- [ ] Podporuje operátory: `>`, `<`, `>=`, `<=`, `=`
- [ ] Bez operátoru funguje textové hledání
- [ ] Placeholder s nápovědou (např. `">= 1"`)

### Sloupcové filtry - Ikony
- [ ] IconFilterButton se třemi stavy
- [ ] ALL: Split icon s clipPath (zelená/červená)
- [ ] ACTIVE/OK: Plná zelená ikona
- [ ] INACTIVE/ERROR: Plná červená ikona
- [ ] Každý sloupec má unikátní clipPath ID
- [ ] Tooltip s popisem stavu
- [ ] Cyklické přepínání při kliku

### Tlačítko smazání filtrů
- [ ] FilterActionButton v sloupci Akce
- [ ] Ikona `faEraser`
- [ ] Disabled pokud nejsou aktivní filtry
- [ ] Maže všechny typy filtrů (column, icon, global)

### localStorage
- [ ] Helper funkce: `getUserKey`, `getUserStorage`, `setUserStorage`
- [ ] State inicializace s `() => getUserStorage()`
- [ ] useEffect pro save při každé změně
- [ ] Dependency na `user_id` v useEffect
- [ ] Naming: `{tabulka}_{typ}_{user_id}`

### Ikony v buňkách
- [ ] Preview disabled místo hidden
- [ ] Opacity 0.3 pro disabled
- [ ] Tooltip vysvětluje proč je disabled
- [ ] ActionCell centruje ikony

### UX details
- [ ] Loading state při načítání dat
- [ ] Empty state když nejsou data
- [ ] Error handling s Toast notifikacemi
- [ ] Responsive design (mobile-friendly)

---

## 📖 7. REFERENCE SOUBORY

### Kompletní implementace:
- **DocxSablonyTab.js** - vzorový soubor, všechny funkce
  - Cesta: `/src/components/dictionaries/tabs/DocxSablonyTab.js`
  - Obsahuje: Icon filtry, číselné filtry, localStorage, všechny typy filtrů

### Styling reference:
- **Users.js** - styling vzor pro filtry
  - Cesta: `/src/pages/Users.js`
  - Obsahuje: ColumnFilterInput, ColumnClearButton, správný padding

### Částečné implementace:
- **LokalityTab.js** - ID jako superscript, localStorage
- **RoleTab.js** - localStorage pro search
- **PravaTab.js** - localStorage pro search

---

## 🚨 8. ČASTÉ CHYBY A ŘEŠENÍ

### Chyba 1: Křížek příliš blízko okraje
❌ `right: 0.5rem` nebo méně
✅ `right: 0.75rem`

### Chyba 2: Icon filtr nefunguje správně
❌ Striktní porovnání: `item.aktivni === true`
✅ Truthy/falsy: `!item.aktivni` a `item.aktivni`

### Chyba 3: clipPath konflikty
❌ Stejné ID pro více sloupců: `clip-left`
✅ Unikátní ID: `clip-left-aktivni`, `clip-left-disk`

### Chyba 4: localStorage se nesynchronizuje
❌ Chybí `user_id` v useEffect dependencies
✅ `useEffect(() => {...}, [filterValue, user_id])`

### Chyba 5: Číselný filtr nefunguje
❌ Regex nesprávný nebo chybí trim
✅ Použij přesně funkci `compareNumericValue` z dokumentace

### Chyba 6: Preview ikona zmizí
❌ `{canPreview && <IconButton>}`
✅ `<IconButton disabled={!canPreview} style={{opacity: canPreview ? 1 : 0.3}}>`

### Chyba 7: Padding inputu asymetrický
❌ `padding: 0.5rem 2rem` (jen horizontal)
✅ `padding: 0.5rem 2rem 0.5rem 2rem` (všechny strany)

### Chyba 8: Šipka řazení pod textem
❌ Flexbox direction column
✅ Inline span + icon s `marginLeft: 0.5rem`

---

## 💡 9. TIPS & BEST PRACTICES

### Performance
- Používej `useMemo` pro `filteredData` - filtrování může být náročné
- `useCallback` pro handlery které se předávají do child komponent
- Pokud je > 1000 řádků, zvažit virtualizaci (react-window)

### Accessibility
- Všechny interaktivní prvky mají `title` attribute
- Fokus stavy jsou viditelné (`outline` nebo `box-shadow`)
- Klávesové zkratky pro časté akce (Ctrl+F pro focus search)

### UX
- Loading state během fetch operací
- Skeleton loading místo prázdné obrazovky
- Debounce pro textové filtry (300ms)
- Auto-save do localStorage BEZ uživatelské interakce
- Toast notifikace jen pro významné akce

### Code Style
- Styled komponenty na začátku souboru
- Helper funkce před hlavní komponentou
- State seskupit podle typu (filters, UI, data)
- Comments pro složité logické bloky
- Consistent naming: `handle{Action}`, `is{State}`, `has{Permission}`

### Testing
- Test localStorage save/load cyklu
- Test všech filtrů samostatně i v kombinaci
- Test edge cases (prázdná data, všechny filtry aktivní, atd.)
- Test responsive breakpoints

---

## 📱 10. RESPONSIVE DESIGN

### Breakpoints
```javascript
const breakpoints = {
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px'
};
```

### Mobile adaptace
```javascript
const TableContainer = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  
  @media (max-width: 768px) {
    /* Horizontální scroll na mobile */
    table {
      min-width: 800px;
    }
    
    /* Zmenšit padding */
    td, th {
      padding: 0.5rem 0.75rem;
    }
    
    /* Skrýt méně důležité sloupce */
    .hide-mobile {
      display: none;
    }
  }
`;
```

---

## ✅ ZÁVĚR

Tento dokument obsahuje **vše potřebné** pro implementaci konzistentních tabulek v číselníkách. 

**Klíčové body:**
1. ✅ Dvojřádková hlavička (názvy + filtry)
2. ✅ ID jako superscript
3. ✅ Tři typy filtrů (textové, číselné, ikony)
4. ✅ localStorage per uživatel
5. ✅ Správný padding křížku (0.75rem)
6. ✅ Preview disabled, ne hidden
7. ✅ Icon filtry se třemi stavy

**Pro otázky nebo problémy:**
- Reference implementace: `DocxSablonyTab.js`
- Styling vzor: `Users.js`
- Tato dokumentace: `DESIGN-GUIDELINES-CISELNIKY-TABULKY.md`

---
**Verze:** 1.0  
**Datum:** 23. října 2025  
**Autor:** Development Team  
**Status:** ✅ Production Ready
