# 📱 Mobile Refactoring - Implementation Guide

**Praktický průvodce implementací refactoringu mobilní části**  
**Datum:** 11. března 2026  
**Status:** ✅ Připraveno k použití

---

## 🎯 Quick Start

### Krok 1: Vytvořit utility soubory (1 hodina)

#### 1.1 orderWorkflowUtils.js
```javascript
// utils/orderWorkflowUtils.js

/**
 * Parsuje workflow stavy z různých formátů
 * @param {string|array} stav_workflow_kod - Stav workflow (JSON string nebo array)
 * @returns {array} Array stavů
 */
export const parseWorkflowStates = (stav_workflow_kod) => {
  if (!stav_workflow_kod) return [];
  
  try {
    return Array.isArray(stav_workflow_kod)
      ? stav_workflow_kod
      : JSON.parse(stav_workflow_kod);
  } catch (error) {
    console.warn('[parseWorkflowStates] Invalid workflow states:', stav_workflow_kod);
    return [];
  }
};

/**
 * Aktualizuje workflow stavy (přidá/odebere)
 * @param {string|array} currentStates - Aktuální stavy
 * @param {array} removeStates - Stavy k odstranění
 * @param {array} addStates - Stavy k přidání
 * @returns {string} JSON string s novými stavy
 */
export const updateWorkflowState = (currentStates, removeStates = [], addStates = []) => {
  let states = parseWorkflowStates(currentStates);
  
  // Odstranit zadané stavy
  if (removeStates.length > 0) {
    states = states.filter(s => !removeStates.includes(s));
  }
  
  // Přidat nové stavy (bez duplicit)
  if (addStates.length > 0) {
    addStates.forEach(state => {
      if (!states.includes(state)) {
        states.push(state);
      }
    });
  }
  
  return JSON.stringify(states);
};

/**
 * Kontroluje zda objednávka obsahuje daný stav
 * @param {object} order - Objednávka
 * @param {string} state - Stav k ověření
 * @returns {boolean}
 */
export const hasWorkflowState = (order, state) => {
  const states = parseWorkflowStates(order.stav_workflow_kod);
  return states.includes(state);
};

/**
 * Workflow state konstanty
 */
export const WORKFLOW_STATES = {
  NOVA: 'NOVA',
  ODESLANA_KE_SCHVALENI: 'ODESLANA_KE_SCHVALENI',
  SCHVALENA: 'SCHVALENA',
  ZAMITNUTA: 'ZAMITNUTA',
  CEKA_SE: 'CEKA_SE',
  K_UVEREJNENI_DO_REGISTRU: 'K_UVEREJNENI_DO_REGISTRU',
  UVEREJNENA: 'UVEREJNENA',
  VECNA_SPRAVNOST: 'VECNA_SPRAVNOST',
  DOKONCENA: 'DOKONCENA',
  ZRUSENA: 'ZRUSENA'
};

/**
 * Mapování workflow stavů na lidské názvy
 */
export const WORKFLOW_STATE_LABELS = {
  [WORKFLOW_STATES.NOVA]: 'Nová',
  [WORKFLOW_STATES.ODESLANA_KE_SCHVALENI]: 'Ke schválení',
  [WORKFLOW_STATES.SCHVALENA]: 'Schválená',
  [WORKFLOW_STATES.ZAMITNUTA]: 'Zamítnutá',
  [WORKFLOW_STATES.CEKA_SE]: 'Čeká se',
  [WORKFLOW_STATES.K_UVEREJNENI_DO_REGISTRU]: 'Má být zveřejněna',
  [WORKFLOW_STATES.UVEREJNENA]: 'Zveřejněná',
  [WORKFLOW_STATES.VECNA_SPRAVNOST]: 'Věcná správnost',
  [WORKFLOW_STATES.DOKONCENA]: 'Dokončená',
  [WORKFLOW_STATES.ZRUSENA]: 'Zrušená'
};

/**
 * Získá lidský název stavu
 */
export const getWorkflowStateLabel = (state) => {
  return WORKFLOW_STATE_LABELS[state] || state;
};
```

#### 1.2 dateTimeUtils.js
```javascript
// utils/dateTimeUtils.js

/**
 * Konvertuje Date objekt na MySQL datetime formát
 * @param {Date} date - Datum (default: now)
 * @returns {string} YYYY-MM-DD HH:MM:SS
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

/**
 * Konvertuje Date objekt na MySQL date formát
 * @param {Date} date - Datum (default: now)
 * @returns {string} YYYY-MM-DD
 */
export const toMySQLDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Formátuje datum pro zobrazení
 * @param {string|Date} date - Datum k formátování
 * @param {string} locale - Locale (default: cs-CZ)
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string}
 */
export const formatDate = (date, locale = 'cs-CZ', options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  };
  
  try {
    return new Intl.DateTimeFormat(locale, defaultOptions).format(new Date(date));
  } catch (error) {
    console.warn('[formatDate] Invalid date:', date);
    return String(date);
  }
};

/**
 * Formátuje datum a čas pro zobrazení
 * @param {string|Date} date - Datum k formátování
 * @param {string} locale - Locale (default: cs-CZ)
 * @returns {string}
 */
export const formatDateTime = (date, locale = 'cs-CZ') => {
  return formatDate(date, locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formátuje relativní čas (před 5 minutami, před 2 hodinami...)
 * @param {string|Date} date - Datum
 * @param {string} locale - Locale (default: cs)
 * @returns {string}
 */
export const formatRelativeTime = (date, locale = 'cs') => {
  if (!date) return '';
  
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'právě teď';
  if (diffMin < 60) return `před ${diffMin} min`;
  if (diffHour < 24) return `před ${diffHour} hod`;
  if (diffDay < 7) return `před ${diffDay} dny`;
  
  return formatDate(date, locale);
};

/**
 * Ověří zda je datum validní
 * @param {any} date - Datum k ověření
 * @returns {boolean}
 */
export const isValidDate = (date) => {
  if (!date) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
};
```

#### 1.3 currencyUtils.js
```javascript
// utils/currencyUtils.js

/**
 * Formátuje částku jako měnu
 * @param {number|string} amount - Částka
 * @param {object} options - Formátovací options
 * @returns {string}
 */
export const formatCurrency = (amount, options = {}) => {
  const {
    currency = 'CZK',
    locale = 'cs-CZ',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0
  } = options;
  
  const value = parseCurrency(amount);
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(value);
  } catch (error) {
    console.warn('[formatCurrency] Formatting error:', error);
    return `${value} Kč`;
  }
};

/**
 * Parsuje řetězec/číslo na number
 * @param {any} value - Hodnota k parsování
 * @returns {number}
 */
export const parseCurrency = (value) => {
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Odstranit všechny znaky kromě číslic, desetinné tečky/čárky a minus
    const cleaned = value.replace(/[^0-9.,-]/g, '');
    // Nahradit čárku tečkou
    const normalized = cleaned.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
};

/**
 * Formátuje číslo (bez měny)
 * @param {number|string} value - Hodnota
 * @param {number} decimals - Počet desetinných míst
 * @returns {string}
 */
export const formatNumber = (value, decimals = 0) => {
  const num = parseCurrency(value);
  
  return new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

/**
 * Sečte částky (ignoruje null/undefined/nevalidní hodnoty)
 * @param {array} values - Array hodnot k sečtení
 * @returns {number}
 */
export const sumCurrencies = (...values) => {
  return values.reduce((sum, value) => {
    const parsed = parseCurrency(value);
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);
};
```

#### 1.4 permissionUtils.js
```javascript
// utils/permissionUtils.js

/**
 * Kontroluje zda je uživatel admin
 * @param {object} userDetail - Detail uživatele
 * @returns {boolean}
 */
export const isAdmin = (userDetail) => {
  if (!userDetail?.roles) return false;
  
  return userDetail.roles.some(role =>
    role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
  );
};

/**
 * Kontroluje zda má uživatel dané oprávnění
 * @param {object} userDetail - Detail uživatele
 * @param {string} permissionCode - Kód oprávnění
 * @returns {boolean}
 */
export const hasPermission = (userDetail, permissionCode) => {
  // Admin má všechna oprávnění
  if (isAdmin(userDetail)) return true;
  
  if (!userDetail?.permissions) return false;
  
  return userDetail.permissions.some(p =>
    p.kod_opravneni === permissionCode
  );
};

/**
 * Kontroluje zda má uživatel právo schvalovat objednávky
 * @param {object} userDetail - Detail uživatele
 * @returns {boolean}
 */
export const canApproveOrders = (userDetail) => {
  return hasPermission(userDetail, 'ORDER_APPROVE');
};

/**
 * Kontroluje zda má uživatel právo editovat objednávky
 * @param {object} userDetail - Detail uživatele
 * @returns {boolean}
 */
export const canEditOrders = (userDetail) => {
  return hasPermission(userDetail, 'ORDER_EDIT');
};

/**
 * Kontroluje zda má uživatel právo vytvářet objednávky
 * @param {object} userDetail - Detail uživatele
 * @returns {boolean}
 */
export const canCreateOrders = (userDetail) => {
  return hasPermission(userDetail, 'ORDER_CREATE');
};

/**
 * Kontroluje zda má uživatel právo mazat objednávky
 * @param {object} userDetail - Detail uživatele
 * @returns {boolean}
 */
export const canDeleteOrders = (userDetail) => {
  return hasPermission(userDetail, 'ORDER_DELETE');
};

/**
 * Vrací všechna oprávnění uživatele jako array kódů
 * @param {object} userDetail - Detail uživatele
 * @returns {array}
 */
export const getUserPermissions = (userDetail) => {
  if (!userDetail?.permissions) return [];
  
  return userDetail.permissions.map(p => p.kod_opravneni);
};

/**
 * Permission constants
 */
export const PERMISSIONS = {
  ORDER_VIEW: 'ORDER_VIEW',
  ORDER_CREATE: 'ORDER_CREATE',
  ORDER_EDIT: 'ORDER_EDIT',
  ORDER_DELETE: 'ORDER_DELETE',
  ORDER_APPROVE: 'ORDER_APPROVE',
  
  INVOICE_VIEW: 'INVOICE_VIEW',
  INVOICE_CREATE: 'INVOICE_CREATE',
  INVOICE_EDIT: 'INVOICE_EDIT',
  INVOICE_DELETE: 'INVOICE_DELETE',
  
  CASHBOOK_VIEW: 'CASHBOOK_VIEW',
  CASHBOOK_CREATE: 'CASHBOOK_CREATE',
  CASHBOOK_EDIT: 'CASHBOOK_EDIT',
  CASHBOOK_DELETE: 'CASHBOOK_DELETE',
  
  ADMIN_PANEL: 'ADMIN_PANEL',
  USER_MANAGEMENT: 'USER_MANAGEMENT',
  
  HIERARCHY_IMMUNE: 'HIERARCHY_IMMUNE'
};
```

---

### Krok 2: Vytvořit breakpoints systém (30 minut)

#### 2.1 constants/breakpoints.js
```javascript
// constants/breakpoints.js

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

/**
 * Media query strings
 */
export const BREAKPOINT_QUERIES = {
  // Max-width queries (mobile-first)
  xs: `(max-width: ${BREAKPOINTS.xs}px)`,
  sm: `(max-width: ${BREAKPOINTS.sm}px)`,
  md: `(max-width: ${BREAKPOINTS.md}px)`,
  lg: `(max-width: ${BREAKPOINTS.lg}px)`,
  xl: `(max-width: ${BREAKPOINTS.xl}px)`,
  xxl: `(max-width: ${BREAKPOINTS.xxl}px)`,
  
  // Min-width queries (desktop-first)
  smUp: `(min-width: ${BREAKPOINTS.sm + 1}px)`,
  mdUp: `(min-width: ${BREAKPOINTS.md + 1}px)`,
  lgUp: `(min-width: ${BREAKPOINTS.lg + 1}px)`,
  xlUp: `(min-width: ${BREAKPOINTS.xl + 1}px)`,
  xxlUp: `(min-width: ${BREAKPOINTS.xxl + 1}px)`,
  
  // Device type queries
  isMobile: `(max-width: ${BREAKPOINTS.md}px)`,
  isTablet: `(min-width: ${BREAKPOINTS.md + 1}px) and (max-width: ${BREAKPOINTS.lg}px)`,
  isDesktop: `(min-width: ${BREAKPOINTS.lg + 1}px)`,
  
  // Orientation queries
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  
  // Combined queries
  mobilePortrait: `(max-width: ${BREAKPOINTS.md}px) and (orientation: portrait)`,
  mobileLandscape: `(max-width: ${BREAKPOINTS.md}px) and (orientation: landscape)`
};

/**
 * Pomocné funkce pro okamžité ověření
 */
export const isMobileDevice = () => {
  return typeof window !== 'undefined' && window.matchMedia(BREAKPOINT_QUERIES.isMobile).matches;
};

export const isTabletDevice = () => {
  return typeof window !== 'undefined' && window.matchMedia(BREAKPOINT_QUERIES.isTablet).matches;
};

export const isDesktopDevice = () => {
  return typeof window !== 'undefined' && window.matchMedia(BREAKPOINT_QUERIES.isDesktop).matches;
};

export const getDeviceType = () => {
  if (isMobileDevice()) return 'mobile';
  if (isTabletDevice()) return 'tablet';
  return 'desktop';
};
```

#### 2.2 hooks/useBreakpoint.js
```javascript
// hooks/useBreakpoint.js
import { useState, useEffect } from 'react';
import { BREAKPOINT_QUERIES, getDeviceType } from '../constants/breakpoints';

/**
 * Universal breakpoint hook
 * @param {string} query - Media query string
 * @returns {boolean}
 */
export const useBreakpoint = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
    
    const handler = (e) => setMatches(e.matches);
    
    // Modern API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    
    // Legacy API fallback
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [query]);
  
  return matches;
};

/**
 * Hook pro detekci mobilního zařízení
 * @returns {boolean}
 */
export const useIsMobile = () => {
  return useBreakpoint(BREAKPOINT_QUERIES.isMobile);
};

/**
 * Hook pro detekci tabletu
 * @returns {boolean}
 */
export const useIsTablet = () => {
  return useBreakpoint(BREAKPOINT_QUERIES.isTablet);
};

/**
 * Hook pro detekci desktopu
 * @returns {boolean}
 */
export const useIsDesktop = () => {
  return useBreakpoint(BREAKPOINT_QUERIES.isDesktop);
};

/**
 * Hook pro získání typu zařízení
 * @returns {'mobile'|'tablet'|'desktop'}
 */
export const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState(() => getDeviceType());
  
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  useEffect(() => {
    if (isMobile) setDeviceType('mobile');
    else if (isTablet) setDeviceType('tablet');
    else setDeviceType('desktop');
  }, [isMobile, isTablet]);
  
  return deviceType;
};

/**
 * Hook pro orientaci zařízení
 * @returns {'portrait'|'landscape'}
 */
export const useOrientation = () => {
  const isPortrait = useBreakpoint(BREAKPOINT_QUERIES.portrait);
  return isPortrait ? 'portrait' : 'landscape';
};

/**
 * Hook pro komplexní informace o zařízení
 * @returns {object}
 */
export const useDeviceInfo = () => {
  const deviceType = useDeviceType();
  const orientation = useOrientation();
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';
  
  return {
    deviceType,
    orientation,
    isMobile,
    isTablet,
    isDesktop,
    isMobilePortrait: isMobile && orientation === 'portrait',
    isMobileLandscape: isMobile && orientation === 'landscape'
  };
};
```

---

### Krok 3: Vytvořit první custom hook - useDashboardData (1 hodina)

```javascript
// hooks/mobile/useDashboardData.js
import { useState, useEffect, useCallback } from 'react';
import mobileDataService from '../../services/mobileDataService';
import { isAdmin } from '../../utils/permissionUtils';

/**
 * Hook pro načítání dat mobilního dashboardu
 * 
 * @param {object} params - Parametry
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.year - Rok
 * @param {object} params.userDetail - Detail uživatele
 * 
 * @returns {object} - { data, loading, error, refresh, meta }
 */
export const useDashboardData = ({ token, username, year, userDetail }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);
  
  const isUserAdmin = isAdmin(userDetail);
  const userId = isUserAdmin ? null : userDetail?.id;
  
  const loadData = useCallback(async () => {
    // Pokud nemáme token, nastavit prázdná data
    if (!token || !username) {
      setData({
        orders: null,
        invoices: null,
        cashbook: null,
        notifications: { unread: 0 }
      });
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
        isAdmin: isUserAdmin,
        showArchived: false
      });
      
      if (result.success) {
        setData(result.data);
        setMeta(result.meta);
      } else {
        setError(result.error || 'Nepodařilo se načíst data');
      }
    } catch (err) {
      console.error('[useDashboardData] Load error:', err);
      setError(err.message || 'Nastala chyba při načítání dat');
    } finally {
      setLoading(false);
    }
  }, [token, username, year, userId, isUserAdmin]);
  
  // Načíst data při mount nebo změně parametrů
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  return {
    data,
    loading,
    error,
    meta,
    refresh: loadData
  };
};
```

---

### Krok 4: Příklad použití nových utils v MobileDashboard

```javascript
// PŘED refactoringem:
import { toMySQLDateTime } from '../../utils/dateTimeUtils';
import { formatCurrency } from '../../utils/currencyUtils';
import { canApproveOrders, isAdmin } from '../../utils/permissionUtils';
import { 
  updateWorkflowState, 
  WORKFLOW_STATES 
} from '../../utils/orderWorkflowUtils';

function MobileDashboard() {
  const { user, userDetail, token, username } = useContext(AuthContext);
  
  // ✅ Použití permission utils
  const userIsAdmin = isAdmin(userDetail);
  const userCanApprove = canApproveOrders(userDetail);
  
  // ✅ Použití dashboard data hook
  const {
    data,
    loading,
    error,
    refresh
  } = useDashboardData({ token, username, year: selectedYear, userDetail });
  
  const handleApproveOrder = async (order) => {
    if (!token || !username || !order.id) return;
    
    try {
      const currentOrder = await getOrderV2(order.id, token, username, true);
      
      // ✅ Použití workflow utils
      const newWorkflowState = updateWorkflowState(
        currentOrder.stav_workflow_kod,
        [WORKFLOW_STATES.ODESLANA_KE_SCHVALENI, WORKFLOW_STATES.CEKA_SE, WORKFLOW_STATES.ZAMITNUTA],
        [WORKFLOW_STATES.SCHVALENA]
      );
      
      const updateData = {
        stav_workflow_kod: newWorkflowState,
        schvalovatel_id: userDetail?.id || null,
        dt_schvaleni: toMySQLDateTime(), // ✅ Použití dateTime utils
        schvaleni_komentar: ''
      };
      
      await updateOrderV2(order.id, updateData, token, username);
      
      // Success handling...
    } catch (error) {
      alert(`Chyba: ${error.message}`);
    }
  };
  
  // ... zbytek komponenty
}
```

---

## 📝 Checklist pro implementaci

### Fáze 1: Utility functions (Den 1)
- [ ] Vytvořit `utils/orderWorkflowUtils.js`
- [ ] Vytvořit `utils/dateTimeUtils.js`
- [ ] Vytvořit `utils/currencyUtils.js`
- [ ] Vytvořit `utils/permissionUtils.js`
- [ ] Otestovat každou funkci konzolí/unit testy
- [ ] Refaktorovat existující kód aby používal nové utils
- [ ] Commit: `refactor: add shared utility functions`

### Fáze 2: Breakpoints systém (Den 1)
- [ ] Vytvořit `constants/breakpoints.js`
- [ ] Vytvořit `hooks/useBreakpoint.js` a related hooks
- [ ] Vytvořit `styles/mobile-variables.css`
- [ ] Refaktorovat `useDevice.js` aby používal nový systém
- [ ] Update všech CSS media queries na použití konstanta
- [ ] Commit: `refactor: unified breakpoint system`

### Fáze 2: První custom hooks (Den 2)
- [ ] Vytvořit `hooks/mobile/useDashboardData.js`
- [ ] Integrovat do MobileDashboard.jsx
- [ ] Otestovat že data se načítají správně
- [ ] Commit: `refactor: add useDashboardData hook`

---

## 🧪 Testing checklist

### Unit testy pro utils
```javascript
// __tests__/utils/orderWorkflowUtils.test.js
import { parseWorkflowStates, updateWorkflowState, hasWorkflowState } from '../orderWorkflowUtils';

describe('orderWorkflowUtils', () => {
  test('parseWorkflowStates - array input', () => {
    expect(parseWorkflowStates(['NOVA', 'SCHVALENA'])).toEqual(['NOVA', 'SCHVALENA']);
  });
  
  test('parseWorkflowStates - JSON string input', () => {
    expect(parseWorkflowStates('["NOVA","SCHVALENA"]')).toEqual(['NOVA', 'SCHVALENA']);
  });
  
  test('updateWorkflowState - add and remove', () => {
    const result = updateWorkflowState(
      '["NOVA","ODESLANA_KE_SCHVALENI"]',
      ['ODESLANA_KE_SCHVALENI'],
      ['SCHVALENA']
    );
    expect(JSON.parse(result)).toEqual(['NOVA', 'SCHVALENA']);
  });
  
  test('hasWorkflowState - positive', () => {
    const order = { stav_workflow_kod: '["NOVA","SCHVALENA"]' };
    expect(hasWorkflowState(order, 'SCHVALENA')).toBe(true);
  });
  
  test('hasWorkflowState - negative', () => {
    const order = { stav_workflow_kod: '["NOVA"]' };
    expect(hasWorkflowState(order, 'SCHVALENA')).toBe(false);
  });
});
```

### Integration test pro hook
```javascript
// __tests__/hooks/useDashboardData.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from '../useDashboardData';

jest.mock('../../services/mobileDataService');

describe('useDashboardData', () => {
  test('loads data on mount', async () => {
    const { result } = renderHook(() => useDashboardData({
      token: 'test-token',
      username: 'testuser',
      year: 2026,
      userDetail: { id: 1 }
    }));
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeTruthy();
    });
  });
  
  test('handles error gracefully', async () => {
    // Mock error...
  });
});
```

---

## 💡 Pro Tips

### 1. Postupná migrace
Nepřepisuj všechno najednou! Postupuj po malých krocích:
1. ✅ Přidej utils
2. ✅ Refaktoruj jednu funkci aby je používala
3. ✅ Testuj
4. ✅ Commit
5. ✅ Repeat

### 2. Keep it backwards compatible
Při refactoringu zachovej zpětnou kompatibilitu dokud nemigruješ všechny použití:

```javascript
// Original
const getStavObjednavky = (workflowKod) => { ... };

// New - but keep old as alias during migration
import { getWorkflowStateLabel } from './utils/orderWorkflowUtils';
const getStavObjednavky = getWorkflowStateLabel; // Alias for backwards compatibility
```

### 3. Use console.warn pro deprecated functions
```javascript
export const getStavObjednavky = (workflowKod) => {
  console.warn('DEPRECATED: Use getWorkflowStateLabel from orderWorkflowUtils instead');
  return getWorkflowStateLabel(workflowKod);
};
```

### 4. Document everything
Každá nová funkce by měla mít JSDoc komentář s příklady použití.

---

## 🔄 Next Steps

Po dokončení těchto kroků pokračuj na:
1. **useOrderApprovals hook** - Viz MOBILE-LAYOUT-ANALYSIS.md
2. **Context API setup** - Viz MOBILE-LAYOUT-ANALYSIS.md
3. **Component splitting** - Viz MOBILE-LAYOUT-ANALYSIS.md

---

**Poznámka:** Tento guide je living document. Aktualizuj ho jak postupuješ s refactoringem!
