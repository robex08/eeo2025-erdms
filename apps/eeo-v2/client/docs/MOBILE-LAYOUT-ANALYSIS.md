# 📱 Analýza mobilní části aplikace - Refactoring návrhy

**Datum analýzy:** 11. března 2026  
**Analyzované moduly:** Mobile components, hooks, services  
**Stav:** Připraveno k zásadnímu refactoringu

---

## 📊 Přehled mobilní struktury

### Struktura souborů
```
apps/eeo-v2/client/src/
├── components/mobile/
│   ├── MobileDashboard.jsx (1389 řádků) ⚠️ PŘÍLIŠ VELKÉ
│   ├── MobileDashboard.css (1199 řádků) ⚠️ PŘÍLIŠ VELKÉ
│   ├── MobileHeader.jsx (200 řádků)
│   ├── MobileHeader.css (286 řádků)
│   ├── MobileMenu.jsx (164 řádků)
│   ├── MobileMenu.css
│   ├── MobileLoginPage.jsx (122 řádků)
│   ├── MobileLoginPage.css
│   ├── OrderApprovalCard.jsx (257 řádků)
│   ├── OrderApprovalCard.css (243 řádků)
│   ├── MobileActivityLog.jsx
│   ├── MobileConfirmDialog.jsx
│   └── MobileSuccessAnimation.jsx
├── hooks/
│   └── useDevice.js (29 řádků) ✅ DOBRÉ
└── services/
    └── mobileDataService.js (414 řádků) ✅ DOBRÉ
```

---

## 🔴 Kritické problémy k řešení

### 1. **MobileDashboard.jsx - Monolitická komponenta**

#### Problémy:
- **1389 řádků kódu** - příliš velká komponenta
- **~15 useState hooks** - nepřehledný state management
- Mix business logiky, UI logiky a API volání
- Duplikace kódu mezi mobile a desktop verzí
- Těžce testovatelná a udržovatelná

#### useState hooks v MobileDashboard:
```javascript
const [menuOpen, setMenuOpen] = useState(false);
const [loading, setLoading] = useState(true);
const [data, setData] = useState({...});
const [refreshing, setRefreshing] = useState(false);
const [selectedYear, setSelectedYear] = useState(...);
const [activeUsers, setActiveUsers] = useState([]);
const [pendingApprovalOrders, setPendingApprovalOrders] = useState([]);
const [loadingApprovals, setLoadingApprovals] = useState(false);
const [showApprovalDetail, setShowApprovalDetail] = useState(false);
const [approvalFilter, setApprovalFilter] = useState('all');
const [approvalSearchQuery, setApprovalSearchQuery] = useState('');
const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
const [waitDialogOpen, setWaitDialogOpen] = useState(false);
const [currentOrder, setCurrentOrder] = useState(null);
const [stavyWorkflowMap, setStavyWorkflowMap] = useState({});
const [activityLogOpen, setActivityLogOpen] = useState(false);
const [activityCount, setActivityCount] = useState(0);
const [successAnimation, setSuccessAnimation] = useState({...});
```
**Celkem: 18 useState hooks!** ⚠️

---

### 2. **CSS Organizace a Breakpointy**

#### Problémy:
- **Nekonzistentní breakpointy**: 360px, 480px, 768px
- Dlouhé CSS soubory (1199 řádků v MobileDashboard.css)
- Mix globálních a komponent-specifických stylů
- Chybí CSS/SCSS proměnné pro breakpointy

#### Nalezené breakpointy v kódu:
```css
/* useDevice.js */
const isSmallScreen = window.innerWidth <= 768;

/* MobileHeader.css */
@media (max-width: 360px) { ... }

/* MobileActivityLog.css */
@media (max-width: 480px) { ... }

/* MobileLoginPage.css */
@media (max-width: 360px) { ... }
@media (max-height: 600px) and (orientation: landscape) { ... }

/* MobileDashboard.css */
@media (max-width: 360px) { ... }
```

**Doporučené standardizované breakpointy:**
```javascript
const BREAKPOINTS = {
  xs: '320px',   // Extra small phones
  sm: '480px',   // Small phones
  md: '768px',   // Tablets
  lg: '1024px',  // Desktop (non-mobile)
  xl: '1280px'   // Large desktop
};
```

---

### 3. **Duplikace logiky mezi Mobile a Desktop**

#### Duplikované funkce:
```javascript
// MobileDashboard.jsx
const getStavObjednavky = (workflowKod) => { ... }
const toMySQLDateTime = () => { ... }
const formatCurrency = (amount) => { ... }
const handleApproveOrder = async (order) => { ... }
const handleRejectOrder = async (order) => { ... }
```

**Tyto funkce existují také v:**
- `Orders25List.jsx`
- `OrderForm25.jsx`
- Různých utility files

**Řešení:** Vytvořit sdílené utility a hooks!

---

### 4. **State Management - Žádná centralizace**

#### Současný stav:
- Všechen state v lokálních useState
- Props drilling mezi komponentami
- Těžké sdílení stavu mezi mobile komponentami

#### Chybějící:
- Context API pro mobilní dashboard state
- Custom hooks pro order management
- Reducer pattern pro komplexní state

---

## ✅ Co funguje dobře

### 1. **useDevice Hook**
```javascript
// ✅ Čistý, jednoduchý, účelný
export const useDevice = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      
      setIsMobile(isMobileUA || isSmallScreen);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return { isMobile };
};
```

### 2. **mobileDataService**
```javascript
// ✅ Dobrá separace concerns
// ✅ Používá centrální hierarchyService
// ✅ Sdílí utility funkce s desktop verzí
const mobileDataService = {
  async getAllMobileData({ token, username, year, userId, isAdmin, showArchived }) {
    // ...
  },
  calculateOrdersStats(orders, userId, isAdmin, showArchived) {
    // Používá sdílené funkce z orderStatsUtils
  },
  calculateInvoicesStats(invoices) {
    // ...
  }
};
```

### 3. **Theme Mode integrace**
```javascript
// ✅ Konzistentní s desktop verzí
const { mode } = useThemeMode();
```

### 4. **Komponentová struktura**
- Samostatné komponenty pro každou část UI
- Čistá separace concerns (Header, Menu, Dashboard, Cards)
- Reusable dialogy (MobileConfirmDialog)

---

## 🎯 Refactoring návrhy

### Priorita 1: Rozdělit MobileDashboard

#### Nová struktura:
```
components/mobile/
├── dashboard/
│   ├── MobileDashboard.jsx (hlavní kontejner, max 200 řádků)
│   ├── components/
│   │   ├── ApprovalWidget.jsx
│   │   ├── OrdersSection.jsx
│   │   ├── InvoicesSection.jsx
│   │   ├── CashbookSection.jsx
│   │   ├── ActiveUsersSection.jsx
│   │   ├── QuickNavBar.jsx
│   │   └── RefreshButton.jsx
│   ├── hooks/
│   │   ├── useMobileDashboard.js (hlavní state management)
│   │   ├── useOrderApprovals.js (schvalování objednávek)
│   │   ├── useDashboardData.js (načítání dat)
│   │   └── useActiveUsers.js (aktivní uživatelé)
│   └── context/
│       └── MobileDashboardContext.jsx
├── orders/
│   ├── OrderApprovalCard.jsx
│   ├── OrderApprovalList.jsx
│   └── OrderApprovalFilters.jsx
├── shared/
│   ├── MobileHeader.jsx
│   ├── MobileMenu.jsx
│   ├── MobileConfirmDialog.jsx
│   └── MobileSuccessAnimation.jsx
└── styles/
    ├── breakpoints.js (konstanty)
    ├── mobile-variables.css (CSS proměnné)
    └── mobile-mixins.css (SCSS mixins)
```

---

### Priorita 2: Custom Hooks pro State Management

#### 1. useMobileDashboard.js
```javascript
/**
 * Hlavní hook pro mobilní dashboard
 * Centralizuje state management a side effects
 */
export const useMobileDashboard = () => {
  const { user, userDetail, token, username } = useContext(AuthContext);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [refreshing, setRefreshing] = useState(false);
  
  const {
    data,
    loading,
    error,
    refresh: refreshData
  } = useDashboardData({ token, username, year: selectedYear });
  
  const {
    approvals,
    loadingApprovals,
    approveOrder,
    rejectOrder,
    waitOrder
  } = useOrderApprovals({ token, username, userDetail, year: selectedYear });
  
  const {
    activeUsers,
    loadingUsers
  } = useActiveUsers({ token, username, isAdmin: isAdmin(userDetail) });
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };
  
  return {
    // State
    data,
    loading,
    error,
    refreshing,
    selectedYear,
    approvals,
    loadingApprovals,
    activeUsers,
    
    // Actions
    setSelectedYear,
    handleRefresh,
    approveOrder,
    rejectOrder,
    waitOrder
  };
};
```

#### 2. useOrderApprovals.js
```javascript
/**
 * Hook pro správu objednávek ke schválení
 * Izoluje logiku schvalování/zamítání
 */
export const useOrderApprovals = ({ token, username, userDetail, year }) => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'normal' | 'urgent'
  const [searchQuery, setSearchQuery] = useState('');
  
  const loadApprovals = useCallback(async () => {
    if (!token || !username || !canApprove(userDetail)) return;
    
    setLoading(true);
    try {
      const orders = await listOrdersV2({ rok: year }, token, username, false, true);
      const pending = orders.filter(order => {
        const workflowStates = parseWorkflowStates(order.stav_workflow_kod);
        return workflowStates.includes('ODESLANA_KE_SCHVALENI') 
          && order.prikazce_id === userDetail?.id;
      });
      setApprovals(pending);
    } catch (error) {
      console.error('Failed to load approvals:', error);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, [token, username, userDetail, year]);
  
  const approveOrder = useCallback(async (order) => {
    // Logika schválení...
  }, [token, username, userDetail]);
  
  const rejectOrder = useCallback(async (order, reason) => {
    // Logika zamítnutí...
  }, [token, username, userDetail]);
  
  const waitOrder = useCallback(async (order, reason) => {
    // Logika pozastavení...
  }, [token, username, userDetail]);
  
  // Filtrované a vyhledané aprobace
  const filteredApprovals = useMemo(() => {
    return filterAndSearchApprovals(approvals, filter, searchQuery);
  }, [approvals, filter, searchQuery]);
  
  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);
  
  return {
    approvals: filteredApprovals,
    loading,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    approveOrder,
    rejectOrder,
    waitOrder,
    refresh: loadApprovals
  };
};
```

#### 3. useDashboardData.js
```javascript
/**
 * Hook pro načítání dat dashboardu
 * Wrappuje mobileDataService a poskytuje state management
 */
export const useDashboardData = ({ token, username, year, userId, isAdmin }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const loadData = useCallback(async () => {
    if (!token || !username) {
      setData(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await mobileDataService.getAllMobileData({
        token,
        username,
        year,
        userId,
        isAdmin,
        showArchived: false
      });
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, username, year, userId, isAdmin]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  return {
    data,
    loading,
    error,
    refresh: loadData
  };
};
```

---

### Priorita 3: Context API pro Mobilní Dashboard

```javascript
/**
 * MobileDashboardContext.jsx
 * Sdílený state pro celý mobilní dashboard
 */
import React, { createContext, useContext } from 'react';
import { useMobileDashboard } from '../hooks/useMobileDashboard';

const MobileDashboardContext = createContext(null);

export const MobileDashboardProvider = ({ children }) => {
  const dashboardState = useMobileDashboard();
  
  return (
    <MobileDashboardContext.Provider value={dashboardState}>
      {children}
    </MobileDashboardContext.Provider>
  );
};

export const useMobileDashboardContext = () => {
  const context = useContext(MobileDashboardContext);
  if (!context) {
    throw new Error('useMobileDashboardContext must be used within MobileDashboardProvider');
  }
  return context;
};
```

**Použití:**
```javascript
// App.js nebo MobileDashboard.jsx
<MobileDashboardProvider>
  <MobileDashboard />
</MobileDashboardProvider>

// V child komponentách
const ApprovalWidget = () => {
  const { approvals, approveOrder, rejectOrder } = useMobileDashboardContext();
  // ...
};
```

---

### Priorita 4: Sdílené Utility funkce

#### Vytvořit nové utility soubory:

**1. utils/orderWorkflowUtils.js**
```javascript
/**
 * Sdílené funkce pro workflow objednávek
 * Používají desktop i mobile
 */
export const parseWorkflowStates = (stav_workflow_kod) => {
  try {
    return Array.isArray(stav_workflow_kod)
      ? stav_workflow_kod
      : JSON.parse(stav_workflow_kod || '[]');
  } catch {
    return [];
  }
};

export const updateWorkflowState = (currentStates, removeStates, addStates) => {
  let states = parseWorkflowStates(currentStates);
  
  // Remove specified states
  if (removeStates && removeStates.length > 0) {
    states = states.filter(s => !removeStates.includes(s));
  }
  
  // Add new states
  if (addStates && addStates.length > 0) {
    addStates.forEach(state => {
      if (!states.includes(state)) {
        states.push(state);
      }
    });
  }
  
  return JSON.stringify(states);
};
```

**2. utils/dateTimeUtils.js**
```javascript
/**
 * Sdílené funkce pro práci s datumy
 */
export const toMySQLDateTime = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const formatDate = (date, format = 'cs-CZ') => {
  return new Intl.DateTimeFormat(format).format(new Date(date));
};
```

**3. utils/currencyUtils.js**
```javascript
/**
 * Sdílené funkce pro formátování měny
 */
export const formatCurrency = (amount, options = {}) => {
  const {
    currency = 'CZK',
    locale = 'cs-CZ',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0
  } = options;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(amount);
};

export const parseCurrency = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};
```

**4. utils/permissionUtils.js**
```javascript
/**
 * Sdílené funkce pro kontrolu oprávnění
 */
export const isAdmin = (userDetail) => {
  return userDetail?.roles?.some(role =>
    role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
  ) || false;
};

export const hasPermission = (userDetail, permissionCode) => {
  return isAdmin(userDetail) || userDetail?.permissions?.some(p =>
    p.kod_opravneni === permissionCode
  ) || false;
};

export const canApproveOrders = (userDetail) => {
  return hasPermission(userDetail, 'ORDER_APPROVE');
};
```

---

### Priorita 5: Unifikovat Breakpointy

**1. Vytvořit constants/breakpoints.js**
```javascript
/**
 * Standardizované breakpointy pro celou aplikaci
 */
export const BREAKPOINTS = {
  xs: 320,   // Extra small phones (portrait)
  sm: 480,   // Small phones (landscape)
  md: 768,   // Tablets (portrait)
  lg: 1024,  // Desktop / Tablets (landscape)
  xl: 1280,  // Large desktop
  xxl: 1536  // Extra large desktop
};

export const BREAKPOINT_QUERIES = {
  xs: `(max-width: ${BREAKPOINTS.xs}px)`,
  sm: `(max-width: ${BREAKPOINTS.sm}px)`,
  md: `(max-width: ${BREAKPOINTS.md}px)`,
  lg: `(max-width: ${BREAKPOINTS.lg}px)`,
  xl: `(max-width: ${BREAKPOINTS.xl}px)`,
  xxl: `(max-width: ${BREAKPOINTS.xxl}px)`,
  
  // Ranges
  smUp: `(min-width: ${BREAKPOINTS.sm + 1}px)`,
  mdUp: `(min-width: ${BREAKPOINTS.md + 1}px)`,
  lgUp: `(min-width: ${BREAKPOINTS.lg + 1}px)`,
  xlUp: `(min-width: ${BREAKPOINTS.xl + 1}px)`,
  
  // Mobile detection
  isMobile: `(max-width: ${BREAKPOINTS.md}px)`,
  isTablet: `(min-width: ${BREAKPOINTS.md + 1}px) and (max-width: ${BREAKPOINTS.lg}px)`,
  isDesktop: `(min-width: ${BREAKPOINTS.lg + 1}px)`
};

export const isMobileDevice = () => {
  return window.matchMedia(BREAKPOINT_QUERIES.isMobile).matches;
};

export const isTabletDevice = () => {
  return window.matchMedia(BREAKPOINT_QUERIES.isTablet).matches;
};

export const isDesktopDevice = () => {
  return window.matchMedia(BREAKPOINT_QUERIES.isDesktop).matches;
};
```

**2. Hook useBreakpoint**
```javascript
/**
 * hooks/useBreakpoint.js
 * Hook pro detekci breakpointů
 */
import { useState, useEffect } from 'react';
import { BREAKPOINT_QUERIES } from '../constants/breakpoints';

export const useBreakpoint = (query) => {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
    
    const handler = (e) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);
  
  return matches;
};

export const useIsMobile = () => {
  return useBreakpoint(BREAKPOINT_QUERIES.isMobile);
};

export const useIsTablet = () => {
  return useBreakpoint(BREAKPOINT_QUERIES.isTablet);
};

export const useIsDesktop = () => {
  return useBreakpoint(BREAKPOINT_QUERIES.isDesktop);
};
```

**3. CSS Variables**
```css
/* styles/mobile-variables.css */
:root {
  /* Breakpoints */
  --breakpoint-xs: 320px;
  --breakpoint-sm: 480px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-xxl: 1536px;
  
  /* Mobile specific spacing */
  --mobile-padding: 16px;
  --mobile-gap: 12px;
  --mobile-header-height: 60px;
  --mobile-nav-height: 48px;
  --mobile-footer-height: 80px;
  
  /* Mobile specific font sizes */
  --mobile-font-xs: 11px;
  --mobile-font-sm: 12px;
  --mobile-font-md: 14px;
  --mobile-font-lg: 16px;
  --mobile-font-xl: 20px;
  
  /* Mobile specific border radius */
  --mobile-radius-sm: 8px;
  --mobile-radius-md: 12px;
  --mobile-radius-lg: 16px;
}
```

---

### Priorita 6: Optimalizovat CSS

#### 1. Split CSS do logických souborů
```
styles/mobile/
├── _variables.css
├── _mixins.css
├── _utilities.css
├── layout/
│   ├── header.css
│   ├── navigation.css
│   ├── content.css
│   └── footer.css
├── components/
│   ├── cards.css
│   ├── buttons.css
│   ├── dialogs.css
│   └── animations.css
└── themes/
    ├── light.css
    └── dark.css
```

#### 2. CSS Modules (volitelně)
```javascript
// MobileHeader.module.css
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--mobile-header-height);
}

// MobileHeader.jsx
import styles from './MobileHeader.module.css';

const MobileHeader = () => (
  <header className={styles.header}>
    {/* ... */}
  </header>
);
```

#### 3. SCSS Mixins pro responsive design
```scss
// _mixins.scss
@mixin mobile {
  @media (max-width: #{$breakpoint-md}) {
    @content;
  }
}

@mixin tablet {
  @media (min-width: #{$breakpoint-md + 1}) and (max-width: #{$breakpoint-lg}) {
    @content;
  }
}

@mixin desktop {
  @media (min-width: #{$breakpoint-lg + 1}) {
    @content;
  }
}

// Použití
.component {
  padding: 24px;
  
  @include mobile {
    padding: 16px;
  }
  
  @include tablet {
    padding: 20px;
  }
}
```

---

## 📋 Implementační plán

### Fáze 1: Příprava (1-2 dny)
- [ ] Vytvořit utility soubory (orderWorkflowUtils, dateTimeUtils, currencyUtils, permissionUtils)
- [ ] Vytvořit breakpoints constants + hooks
- [ ] Vytvořit CSS variables soubor
- [ ] Připravit folder strukturu pro nové komponenty a hooks

### Fáze 2: Custom Hooks (2-3 dny)
- [ ] Vytvořit useDashboardData hook
- [ ] Vytvořit useOrderApprovals hook
- [ ] Vytvořit useActiveUsers hook
- [ ] Vytvořit useMobileDashboard hook (hlavní orchestrátor)
- [ ] Otestovat hooks izolovaně

### Fáze 3: Context API (1 den)
- [ ] Vytvořit MobileDashboardContext
- [ ] Implementovat provider
- [ ] Připravit custom hook useMobileDashboardContext

### Fáze 4: Rozdělit MobileDashboard (3-4 dny)
- [ ] Extrahovat ApprovalWidget komponentu
- [ ] Extrahovat OrdersSection komponentu
- [ ] Extrahovat InvoicesSection komponentu
- [ ] Extrahovat CashbookSection komponentu
- [ ] Extrahovat ActiveUsersSection komponentu
- [ ] Extrahovat QuickNavBar komponentu
- [ ] Refaktorovat hlavní MobileDashboard.jsx (max 200 řádků)

### Fáze 5: CSS Refactoring (2-3 dny)
- [ ] Split MobileDashboard.css do logických souborů
- [ ] Aplikovat CSS variables
- [ ] Unifikovat breakpointy napříč všemi mobile CSS
- [ ] Implementovat SCSS mixins (volitelně)
- [ ] Optimalizovat a deduplikovat styly

### Fáze 6: Testování (2 dny)
- [ ] Funkční testování všech částí dashboardu
- [ ] Testování na různých rozlišeních (320px, 480px, 768px)
- [ ] Testování schvalování objednávek
- [ ] Testování activity log
- [ ] Performance testing

### Fáze 7: Dokumentace (1 den)
- [ ] Dokumentovat nové hooks
- [ ] Dokumentovat komponentovou strukturu
- [ ] Vytvořit migration guide
- [ ] Update README

---

## 🎯 Očekávané výsledky po refactoringu

### Zlepšení struktury kódu:
- **MobileDashboard.jsx**: 1389 řádků → **~150-200 řádků**
- **Počet useState**: 18 hooks → **3-5 hooks** (zbytek v custom hooks)
- **Testovatelnost**: Nízká → **Vysoká** (izolované hooks a komponenty)
- **Udržovatelnost**: Těžká → **Snadná** (malé, fokusované komponenty)

### Zlepšení performance:
- Lepší memoizace díky useCallback a useMemo
- Menší re-renders díky context API
- Lazy loading pro velké sekce
- Optimalizované CSS (menší bundle)

### Zlepšení developer experience:
- Jasná separace concerns
- Reusable hooks a komponenty
- Konzistentní breakpointy
- Lepší type safety (připraveno pro TypeScript)

---

## 🚀 Doporučení pro budoucnost

### 1. **TypeScript migrace**
Po dokončení refactoringu zvážit migraci na TypeScript:
```typescript
interface MobileDashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  selectedYear: number;
}

interface OrderApproval {
  id: number;
  cislo_objednavky: string;
  predmet: string;
  max_cena_s_dph: number;
  // ...
}
```

### 2. **Performance optimizace**
- Implementovat React.lazy() pro code splitting
- Použít react-window pro virtualizaci dlouhých seznamů
- Implementovat service worker pro offline mode

### 3. **Testing**
- Unit testy pro hooks (Jest + React Testing Library)
- Integration testy pro komponenty
- E2E testy pro kritické flow (Cypress/Playwright)

### 4. **Accessibility (a11y)**
- ARIA labels pro všechny interaktivní elementy
- Keyboard navigation
- Screen reader support
- High contrast mode

---

## 📊 Metriky před a po refactoringu

| Metrika | Před | Po (cíl) | Zlepšení |
|---------|------|----------|----------|
| Velikost MobileDashboard.jsx | 1389 řádků | 150-200 řádků | **-85%** |
| Počet useState hooks | 18 | 3-5 | **-75%** |
| Počet komponent | 3 | 12+ | **+300%** |
| CSS soubor velikost | 1199 řádků | 200-300 řádků/file | **Rozděleno** |
| Testovatelnost | Nízká | Vysoká | **✅** |
| Udržovatelnost | Těžká | Snadná | **✅** |
| Code reuse | Nízká | Vysoká | **✅** |
| Bundle size | - | - | **-10-15%** (odhad) |

---

## 🔗 Související dokumentace

- [COMPONENT-SPLIT-DETAILED-PLAN.md](./COMPONENT-SPLIT-DETAILED-PLAN.md) - Desktop refactoring plán
- [CSS-LAYOUT-HEADER-UNIFICATION.md](./CSS-LAYOUT-HEADER-UNIFICATION.md) - CSS pattern guide
- [DESIGN-GUIDELINES-CISELNIKY-TABULKY.md](./DESIGN-GUIDELINES-CISELNIKY-TABULKY.md) - Design guidelines

---

## ✅ Checkpoint

Po dokončení každé fáze:
1. Code review
2. Testování funkcionality
3. Performance check
4. Update dokumentace
5. Git commit s popisným message

---

**Prepared by:** GitHub Copilot (Claude Sonnet 4.5)  
**Date:** 11. března 2026  
**Status:** 📋 Připraveno k implementaci
