# STATS & REPORTS - KOMPLETNÍ PERFORMANCE AUDIT
**Datum:** 26. dubna 2026  
**Cíl:** Optimalizace načítání Stats & Reports sekce - VŠECHNY BLOKY

---

## 📊 PŘEHLED SEKCÍ A ENDPOINTŮ

### 1. KONTROLA (Tab: kontrola)
**Bloky:**
- ✅ Objednávky nad limit (`pagedOrdersOverLimit`)
- ✅ FA před schválením (`pagedInvoicesBeforeApproval`)
- ✅ Obj + FA bez příloh (`pagedOrdersAndInvoicesWithoutAttachments`)
- ✅ FA bez příloh (`pagedInvoicesWithoutAttachmentsOnly`)
- ✅ FA po splatnosti (`pagedInvoicesOverdue`)
- ✅ Storno objednávky (`pagedOrdersStorno`)
- ✅ Obj bez FA 2+ měsíce (`pagedOrdersWithoutInvoiceTwoMonths`)

**API Endpointy:**
- `/api.eeo/orders-v3/list` - hlavní endpoint s filtry
- Backend SQL: JOINy s fakturami, přílohami, LP kódy

### 2. PŘÍLOHY (Tab: attachments)
**Bloky:**
- ✅ Objednávky bez příloh (API paging) - **Backend sorting**
- ✅ Faktury bez příloh (API paging) - **Backend sorting**
- ✅ Přílohy obj podle typu (accordion)
- ✅ Přílohy FA podle typu (accordion)
- ✅ Přehled všech příloh (lokální sort)

**API Endpointy:**
- `/api.eeo/order-v2/attachments/stats`
- `/api.eeo/order-v2/invoices/attachments/stats`
- `/api.eeo/order-v2/attachments/orders-without`
- `/api.eeo/order-v2/invoices/attachments/invoices-without`
- `/api.eeo/order-v2/attachments/by-type`
- `/api.eeo/order-v2/invoices/attachments/by-type`

### 3. VZDĚLÁVÁNÍ (Tab: vzdel)
**Bloky:**
- ✅ Vzdělávání lékařské
- ✅ Vzdělávání nelékařské
- ✅ Přehled dle střediska

**API Endpointy:**
- Používá `/api.eeo/orders-v3/list` s filtry na druh objednávky

### 4. POKLADNA (Tab: cashbook)
**Bloky:**
- ✅ Přehled pokladen
- ✅ Grafy

**API Endpointy:**
- `/api.eeo/cashbook/entries`
- `/api.eeo/cashbook/stats`

### 5. DOHADNÉ POLOŽKY (Tab: dohadne)
**Bloky:**
- ✅ LP dle účtu
- ✅ LP dle kódu

**API Endpointy:**
- `/api.eeo/lp/dohadne-polozky`

### 6. PIVOT (Tab: pivot)
**Bloky:**
- ✅ Agregační tabulka

**API Endpointy:**
- Lokální agregace frontend dat

---

## 🔍 SQL ANALÝZA A PROBLÉMY

### ⚠️ PROBLÉM #1: Orders V3 List - TĚŽKÝ QUERY
**Endpoint:** `/api.eeo/orders-v3/list`

**Co dělá:**
- JOIN s fakturami (25a_objednavky_faktury)
- JOIN s přílohami (25a_objednavky_prilohy)
- JOIN s LP kódy (25_lp)
- JOIN s uživateli (25_uzivatele)
- JOIN s organizacemi (25_organizace_vizitka)
- Agregace COUNT(faktury), COUNT(přílohy)
- GROUP BY objednávka
- WHERE filtry na různé stavy

**Problém:**
- Množství JOINů
- GROUP BY na velkém datasetu
- Absence indexů na JOIN sloupce?

**Řešení:**
1. ✅ **Indexy na JOIN sloupce:**
   ```sql
   CREATE INDEX idx_faktury_objednavka ON 25a_objednavky_faktury(objednavka_id);
   CREATE INDEX idx_prilohy_objednavka ON 25a_objednavky_prilohy(objednavka_id);
   CREATE INDEX idx_obj_stav ON 25a_objednavky(stav_objednavky);
   CREATE INDEX idx_obj_druh ON 25a_objednavky(druh_objednavky_kod);
   ```

2. ✅ **Použít EXPLAIN ANALYZE** pro identifikaci bottlenecků

### ⚠️ PROBLÉM #2: Attachments Stats - 2 dotazy současně
**Endpointy:**
- `/api.eeo/order-v2/attachments/stats`
- `/api.eeo/order-v2/invoices/attachments/stats`

**Co dělá:**
- Agregace COUNT(*) GROUP BY typ_prilohy
- JOIN s aktivními objednávkami/fakturami

**Problém:**
- Oba se volají současně při načtení tabu
- Čeká se na oba než se zobrazí data

**Řešení:**
- ✅ Paralelní volání (už je)
- ✅ Možnost cachování výsledků (Redis/Memcached)?

### ⚠️ PROBLÉM #3: Frontend načítá VŠE najednou
**Co se děje:**
```javascript
useEffect(() => {
  if (activeTab === 'attachments') {
    handleLoadAttachmentsTabStats();        // 1. volání
    handleLoadOrdersWithoutAttachments(1);   // 2. volání
    handleLoadInvoicesWithoutAttachments(1); // 3. volání
  }
}, [activeTab]);
```

**Problém:**
- Všechny bloky se načítají současně
- Uživatel čeká na všechny než vidí COKOLIV

---

## 🚀 NÁVRH ŘEŠENÍ: PROGRESSIVE LOADING

### Pattern: "Show First, Load Rest"

**Princip:**
1. ✅ **Zobraz aktivní blok s loading spinnerem**
2. ✅ **Načti data pro aktivní blok** (priority)
3. ✅ **Zobraz data aktivního bloku**
4. ✅ **Na pozadí dočti ostatní bloky** (lazy)

**Implementace:**

```javascript
// 1. PRIORITNÍ načtení - aktivní blok
const loadPriorityBlock = async (tab, block) => {
  setBlockLoading(block, true);
  const data = await fetchBlockData(block);
  setBlockData(block, data);
  setBlockLoading(block, false);
};

// 2. LAZY načtení - ostatní bloky (na pozadí)
const loadOtherBlocks = async (tab, excludeBlock) => {
  const blocks = getTabBlocks(tab).filter(b => b !== excludeBlock);
  
  // Postupně načíst (ne paralelně - šetří server)
  for (const block of blocks) {
    await loadBlockData(block);
    await delay(200); // Anti-throttle
  }
};

// 3. useEffect s progressive loading
useEffect(() => {
  if (activeTab === 'attachments') {
    const visibleBlock = getFirstVisibleBlock('attachments');
    
    // Priorita: načti viditelný blok HNED
    loadPriorityBlock('attachments', visibleBlock);
    
    // Lazy: ostatní bloky na pozadí
    setTimeout(() => {
      loadOtherBlocks('attachments', visibleBlock);
    }, 500);
  }
}, [activeTab]);
```

---

## 🎯 KONKRÉTNÍ ÚPRAVY

### 1. SQL OPTIMALIZACE
- [ ] Přidat indexy na JOIN sloupce (DB migrace)
- [ ] EXPLAIN ANALYZE na Orders V3 List
- [ ] Zvážit materialized views pro agregace

### 2. PROGRESSIVE LOADING PATTERN
- [ ] Implementovat priority loading
- [ ] Lazy loading ostatních bloků
- [ ] Loading state per blok (ne globální)

### 3. CACHING STRATEGIE
- [ ] Stats endpointy - cache 5 minut (Redis)
- [ ] Invalidace při změně dat
- [ ] Frontend localStorage cache?

### 4. FRONTEND OPTIMALIZACE
- [ ] Virtualizace dlouhých seznamů (react-window)
- [ ] Memoizace těžkých výpočtů
- [ ] Debounce search inputů

---

## 📈 OČEKÁVANÉ ZLEPŠENÍ

**Před:**
- ⏱️ Načtení celého tabu: 3-5 sekund
- 🔴 Uživatel vidí prázdnou stránku

**Po:**
- ⏱️ První viditelný obsah: 0.5-1 sekunda
- 🟢 Uživatel vidí aktivní blok rychle
- 🟢 Ostatní bloky se dotáhnou na pozadí

---

## 🔧 IMPLEMENTAČNÍ PLÁN

### Fáze 1: Progressive Loading (CRITICAL)
1. ✅ Refactor loading states (per-block)
2. ✅ Implementovat priority loading pattern
3. ✅ Lazy loading ostatních bloků
4. ✅ Testování UX

### Fáze 2: SQL Optimalizace (HIGH)
1. ⚠️ EXPLAIN ANALYZE na Orders V3 List
2. ⚠️ Přidat DB indexy (DEV → PROD)
3. ⚠️ Měření improvement

### Fáze 3: Caching (MEDIUM)
1. 🔵 Redis cache pro stats endpointy
2. 🔵 Invalidace strategie
3. 🔵 Frontend localStorage

### Fáze 4: Frontend Optimalizace (LOW)
1. 🟡 React.memo pro komponenty
2. 🟡 Virtualizace seznamů
3. 🟡 Code splitting

---

## 💡 MŮJNEÁVORY

### ✅ DOPORUČUJI IMPLEMENTOVAT:
1. **Progressive Loading** - IHNED (biggest win, malá změna)
2. **DB Indexy** - IHNED (easy, velký efekt)
3. **Per-block loading states** - IHNED (lepší UX)

### 🤔 ZVÁŽIT POZDĚJI:
1. **Redis Cache** - potřebuje Redis server setup
2. **Virtualizace** - jen pokud seznamy >1000 řádků
3. **Code splitting** - až při růstu bundle size

### ❌ NEDOPORUČUJI:
1. **Server-side rendering** - přehnaně složité
2. **GraphQL** - velký refactoring
3. **Websockets** - není potřeba real-time

---

## 🎬 AKČNÍ PLÁN - CO IMPLEMENTOVAT TEĎ?

**Priorita 1: Progressive Loading (30 minut)**
- Refactor `useEffect` pro postupné načítání
- Loading state per blok
- Testování UX

**Priorita 2: DB Indexy (15 minut)**
- SQL migrace s indexy
- EXPLAIN ANALYZE ověření

**Priorita 3: Monitoring (10 minut)**
- Přidat time tracking do API responses
- Log slow queries

**Celkem: ~1 hodina práce, velké zlepšení UX!**

---

## ✅ IMPLEMENTACE - READY TO GO?

Čekám na potvrzení, abych implementoval:
1. ✅ Progressive Loading Pattern
2. ✅ DB Indexy
3. ✅ Per-block Loading States

**Chceš to? Napíš "ano" a začnu!** 🚀
