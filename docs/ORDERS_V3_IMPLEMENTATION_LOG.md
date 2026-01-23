# 📋 Orders V3 - Implementation Log

**Projekt:** Objednávky V3 s backend paging  
**Začátek:** 23. ledna 2026  
**Status:** 🚧 V IMPLEMENTACI  
**Dokumentace:** [ORDERS25LIST_BACKEND_PAGINATION_ANALYSIS.md](ORDERS25LIST_BACKEND_PAGINATION_ANALYSIS.md)

---

## 🎯 Cíl Projektu

Vytvořit novou verzi seznamu objednávek (V3) s:
- ✅ Backend pagination (50-100 záznamů na stránku místo všech najednou)
- ✅ Backend filtering (SQL místo JavaScript)
- ✅ Postupné načítání (lazy loading)
- ✅ Optimalizace pro velké množství dat (10 000+ objednávek)
- ✅ Paralelní systém - stávající V2 zůstává nedotčen

---

## 📅 Implementační Fáze

### ✅ Fáze 1: Příprava & Routing (HOTOVO - 23.1.2026)

**Commity:**
- `f90648e` - Příprava před začátkem implementace
- `7b3c7d8` - Fáze 1 - Routing a menu pro Orders V3 Beta

**Implementováno:**

#### 1.1 Frontend Component
- ✅ Vytvořen `/apps/eeo-v2/client/src/pages/Orders25ListV3.js`
- ✅ Placeholder s informačními kartami o nové verzi
- ✅ Připraven pro postupnou implementaci funkcí

```javascript
// Hlavní features:
- Info karta s popisem vylepšení
- Lista funkcí (pagination, filtering, lazy loading, atd.)
- Status karta "Implementace probíhá..."
- Verze info footer
```

#### 1.2 Routing
- ✅ Přidán lazy import do `App.js`:
  ```javascript
  const Orders25ListV3 = lazy(() => import('./pages/Orders25ListV3'));
  ```
- ✅ Přidána route `/orders25-list-v3` (jen pro ADMINY)
  ```javascript
  {isLoggedIn && hasAdminRole && hasAdminRole() && 
    <Route path="/orders25-list-v3" element={<Orders25ListV3 />} />}
  ```

#### 1.3 Menu
- ✅ Přidána menu položka do `Layout.js` (jen pro ADMINY)
- ✅ Použita ikona `faRocket` pro visual feedback
- ✅ Přidán BETA badge vedle názvu
- ✅ Modrý gradient styling pro odlišení od běžných položek

```javascript
<MenuLinkLeft to="/orders25-list-v3" $active={isActive('/orders25-list-v3')}>
  <FontAwesomeIcon icon={faRocket} style={{color: '#3b82f6'}} /> 
  Objednávky V3 
  <span style={{...BETA badge styling...}}>BETA</span>
</MenuLinkLeft>
```

#### 1.4 Testování
- ✅ Route dostupná pouze pro administrátory
- ✅ Menu položka viditelná pouze pro administrátory
- ✅ Stávající V2 verze zůstává plně funkční
- ✅ Zero impact na produkční kód

**Status:** ✅ **HOTOVO**  
**Trvání:** ~30 minut  
**Git commits:** 2  

---

### 🚧 Fáze 2: Backend API (PLÁNOVÁNO)

**Cíl:** Vytvořit nové PHP endpointy s podporou pagingu

**Plánované soubory:**
```
/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/
├── orderV3Endpoints.php      [NOVÝ] Hlavní endpointy
└── orderV3Helpers.php         [NOVÝ] Helper funkce
```

**Plánované endpointy:**
```php
POST /api/order-v3/list          // Seznam s pagingem
POST /api/order-v3/get           // Detail objednávky
POST /api/order-v3/stats         // Statistiky (dashboard)
```

**Klíčové features:**
- ✅ Povinný paging (page, per_page parametry)
- ✅ Server-side filtering (všechny filtry v SQL WHERE)
- ✅ Agregované statistiky (COUNT, SUM v SQL)
- ✅ Pagination metadata v response
- ✅ Role-based filtrování (z V2 API)
- ✅ Hierarchy filtrování (z V2 API)

**Status:** ⏸️ **ČEKÁ NA ZAČÁTEK**  
**Odhadovaná doba:** 2-3 dny

---

### 📋 Fáze 3: Frontend Service Layer (PLÁNOVÁNO)

**Cíl:** Vytvořit API wrapper pro V3 endpointy

**Plánované soubory:**
```
/apps/eeo-v2/client/src/services/
├── apiOrderV3.js              [NOVÝ] API calls pro V3
└── orders25PagingCache.js     [NOVÝ] Cache pro paging
```

**Plánované funkce:**
```javascript
listOrdersV3({ page, per_page, filters... })
getOrderV3(orderId)
getOrderStatsV3(filters)
```

**Status:** ⏸️ **ČEKÁ NA FÁZI 2**  
**Odhadovaná doba:** 1 den

---

### 🎨 Fáze 4: Frontend UI (PLÁNOVÁNO)

**Cíl:** Implementovat plně funkční UI s pagingem

**Plánované komponenty:**
```
/apps/eeo-v2/client/src/components/orders/
├── OrdersTableV3.js           [NOVÝ] Tabulka s TanStack Table
├── OrdersFiltersV3.js         [NOVÝ] Filtry
├── OrdersPaginationV3.js      [NOVÝ] Pagination controls
└── OrdersDashboardV3.js       [NOVÝ] Dashboard karty
```

**Plánované custom hooks:**
```javascript
useOrdersV3()                   // Data loading + state management
useOrdersFiltersV3()            // Filter management + debounce
useOrdersPaginationV3()         // Pagination logic
```

**Status:** ⏸️ **ČEKÁ NA FÁZI 3**  
**Odhadovaná doba:** 3-4 dny

---

### 🧪 Fáze 5: Testing & Optimalizace (PLÁNOVÁNO)

**Cíl:** Testování s adminy a optimalizace výkonu

**Plánované aktivity:**
- ✅ A/B testing s několika adminy
- ✅ Performance profiling (DevTools)
- ✅ SQL query optimization
- ✅ Cache implementace a fine-tuning
- ✅ Bug fixing
- ✅ UX improvements based on feedback

**Status:** ⏸️ **ČEKÁ NA FÁZI 4**  
**Odhadovaná doba:** 2 dny

---

### 🚀 Fáze 6: Rollout (PLÁNOVÁNO)

**Cíl:** Postupné rozšíření přístupu a případná migrace

**Plánované kroky:**
1. ✅ Dokumentace pro uživatele
2. ✅ Rozšíření přístupu na více rolí
3. ✅ Monitoring výkonu
4. ✅ Případná migrace všech uživatelů na V3
5. ✅ Deprecation starého Orders25List (V2)

**Status:** ⏸️ **ČEKÁ NA FÁZI 5**  
**Odhadovaná doba:** 1 den

---

## 📊 Progress Tracking

```
Fáze 1: ████████████████████ 100% ✅ HOTOVO
Fáze 2: ░░░░░░░░░░░░░░░░░░░░   0% ⏸️ PLÁNOVÁNO
Fáze 3: ░░░░░░░░░░░░░░░░░░░░   0% ⏸️ PLÁNOVÁNO
Fáze 4: ░░░░░░░░░░░░░░░░░░░░   0% ⏸️ PLÁNOVÁNO
Fáze 5: ░░░░░░░░░░░░░░░░░░░░   0% ⏸️ PLÁNOVÁNO
Fáze 6: ░░░░░░░░░░░░░░░░░░░░   0% ⏸️ PLÁNOVÁNO

Celkový progress: ████░░░░░░░░░░░░░░░░ 17%
```

---

## 🔗 Související Dokumentace

- [ORDERS25LIST_BACKEND_PAGINATION_ANALYSIS.md](ORDERS25LIST_BACKEND_PAGINATION_ANALYSIS.md) - Kompletní analýza a návrh
- [ORDERS-V2-OPTIMIZATION-REPORT-2025-11-03.md](../apps/eeo-v2/client/docs/ORDERS-V2-OPTIMIZATION-REPORT-2025-11-03.md) - Historie optimalizací V2
- [ORDERS25_API_DOCUMENTATION.md](../apps/eeo-v2/client/docs/ORDERS25_API_DOCUMENTATION.md) - API dokumentace V2

---

## 🎯 Klíčová Rozhodnutí

### Proč paralelní systém místo refaktoringu?
- ✅ Zero risk - stávající V2 zůstává funkční
- ✅ Postupné testování - můžeme iterovat bez tlaku
- ✅ Snadný rollback - stačí skrýt menu položku
- ✅ A/B testing možnost - srovnání výkonu obou verzí

### Proč nejprve jen pro adminy?
- ✅ Menší skupina pro testování
- ✅ Rychlejší feedback loop
- ✅ Admini rozumí beta testování
- ✅ Možnost rychle řešit chyby bez dopadu na všechny

### Proč nový component místo kopie Orders25List?
- ✅ Orders25List má 18 795 řádků - příliš velký
- ✅ Možnost začít s čistým kódem
- ✅ Reuse pouze potřebných částí (styled components)
- ✅ Modernější React patterns (custom hooks)

---

## 📝 Poznámky

- Všechny commity mají prefix `RH-V3-ORDER:`
- Branch: `feature/generic-recipient-system`
- Dev server: http://localhost:3001/dev/
- Route V3: `/orders25-list-v3`

---

**Poslední aktualizace:** 23. ledna 2026, 14:30  
**Autor:** GitHub Copilot + Robert Hraboš  
**Status:** Fáze 1 HOTOVÁ ✅
