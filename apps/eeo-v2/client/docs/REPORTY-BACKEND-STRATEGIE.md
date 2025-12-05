# 🔌 REPORTY & STATISTIKY - Backend API Strategie

**Datum:** 27. listopadu 2025  
**Status:** STRATEGIC ANALYSIS  
**Update:** Objeveno existující LP čerpání API ✅

---

## 🎉 SKVĚLÁ ZPRÁVA!

**Čerpání LP už máme implementované!**
- ✅ Endpoint `/limitovane-prisliby/cerpani-podle-useku` existuje
- ✅ Používá se v ProfilePage + LimitovanePrislibyManager
- ✅ Vrací kompletní data o čerpání (skutečné, schválené, rozpracované)
- ✅ Podporuje filtrování podle roku a úseku

**Výsledek:** Potřebujeme pouze **3 nové BE endpointy** místo 4! 🚀

---

## 🎯 KLÍČOVÉ ZJIŠTĚNÍ

### Máme již k dispozici:

#### 1. `orders25/list` endpoint
```javascript
POST /orders25/list
{
  token, username,
  filters: {
    // Aktuálně podporované filtry
    year: 2025,
    status: "SCHVALENA",
    // ... další
  }
}
```

**Co umí:**
- ✅ Načíst všechny objednávky
- ✅ Filtrovat podle roku
- ✅ Filtrovat podle statusu
- ✅ Vrací enriched data (rozbalené číselníky)
- ✅ Respektuje oprávnění uživatele

#### 2. `orders25/stats` endpoint
```javascript
POST /orders25/stats
{
  token, username,
  action: "stats",
  filters: { ... }
}
```

**Co umí:**
- ✅ Základní statistiky
- ✅ Agregace dat

---

## 💡 STRATEGIE: Hybridní přístup

### ✅ CO ZVLÁDNEME NA FRONTENDU

Většinu reportů **lze implementovat čistě na FE** pomocí existujícího `orders25/list` + frontend filtrování!

#### Reporty implementovatelné na FE (bez nového BE):

##### 1. ⚠️ Objednávky ke zveřejnění
```javascript
// FE filtering
const toPublishOrders = allOrders.filter(order => {
  return order.cena_rok >= 50000 && !order.zverejneno;
});
```
**Backend:** ✅ Použít `orders25/list` (žádné změny)

##### 2. 💰 Objednávky nad 50 000 Kč
```javascript
// FE filtering
const overLimitOrders = allOrders.filter(order => {
  return order.cena_rok >= 50000;
});
```
**Backend:** ✅ Použít `orders25/list` (žádné změny)

##### 3. 📢 Zveřejněné objednávky
```javascript
// FE filtering
const publishedOrders = allOrders.filter(order => {
  return order.zverejneno !== null;
});
```
**Backend:** ✅ Použít `orders25/list` (žádné změny)

##### 4. ⏳ Objednávky čekající na schválení > 5 dní
```javascript
// FE filtering
const pendingOrders = allOrders.filter(order => {
  if (order.stav !== 'KE_SCHVALENI') return false;
  
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(order.datum_vytvoreni)) / (1000 * 60 * 60 * 24)
  );
  
  return daysSinceCreated > 5;
});
```
**Backend:** ✅ Použít `orders25/list` (žádné změny)

##### 5. 🏢 Majetkové objednávky
```javascript
// FE filtering
const assetOrders = allOrders.filter(order => {
  return order.druh_objednavky_display?.toLowerCase().includes('majetek');
});
```
**Backend:** ✅ Použít `orders25/list` (žádné změny)

---

### ⚠️ CO POTŘEBUJE NOVÝ BACKEND

Pouze **komplexní reporty** s agregacemi a JOIN přes více tabulek:

#### Reporty vyžadující nový BE endpoint:

##### 1. 💰 Čerpání LP (Limitované příslíby)
**✅ JUŽ MÁME! Endpoint existuje v ProfilePage + LimitovanePrislibyManager**

**Existující endpointy:**
- `POST /limitovane-prisliby/stav` - Detail LP včetně čerpání
- `POST /limitovane-prisliby/cerpani-podle-useku` - Čerpání podle úseků

**Vrací:**
```javascript
{
  cislo_lp: "LP/2025/001",
  nazev: "Název LP",
  vyse_financniho_kryti: 1000000,
  cerpano_skutecne: 850000,
  cerpano_schvalene: 900000, 
  cerpano_rozpracovane: 50000,
  zbyva_skutecne: 150000,
  procento_skutecne: 85.0,
  je_prekroceno_skutecne: false
}
```

**→ NEMUSÍME vytvářet nový BE endpoint!** ✅

##### 2. ❗ Nesrovnalosti ve fakturaci
**Status:** ✅ **UŽ EXISTUJE** - řešeno v "Věcné kontrole" na úrovni objednávky

~~**Důvod:** Porovnání částek objednávky vs faktury, vyžaduje data z faktury~~

~~**Nový endpoint:** `POST /reports/invoice-discrepancy`~~ → **NEMUSÍME vytvářet!**

##### 3. ⏪ Zpětné objednávky (vytvořené po fakturaci)
**Status:** ⏸️ **ODLOŽENO** - vyžaduje analýzu workflow

**Poznámka:** Nemá samostatný modul vkládání faktury, faktura je vždy přidružena k objednávce. Potenciálně hlídat systémové datum vs datum vystavení faktury přímo na úrovni objednávky.

~~**Nový endpoint:** `POST /reports/retroactive-orders`~~ → **MOŽNÁ v budoucnu**

##### 4. ⚡ Urgentní platby (splatnost < 5 dní) **← PRIORITA!**
**Důvod:** Vyžaduje data z faktury (datum splatnosti) + filtrování NEZAPLACENÝCH

```sql
-- Viz detailní specifikace níže
SELECT o.cislo_objednavky, o.fa_datum_splatnosti, ...
FROM orders25 o
WHERE o.fa_zaplaceno = 0 
  AND o.fa_datum_splatnosti BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
```

**Nový endpoint:** `POST /reports/urgent-payments` → **POTŘEBUJEME vytvořit!** ⚠️

---

### 📊 STATISTIKY - Frontend vs Backend

#### Statistiky implementovatelné na FE:

##### 1. 📊 Základní metriky (Dashboard)
```javascript
// Vše lze spočítat z allOrders na FE
const stats = {
  total_count: allOrders.length,
  total_amount: allOrders.reduce((sum, o) => sum + o.cena_rok, 0),
  avg_amount: total_amount / total_count,
  approved: allOrders.filter(o => o.stav === 'SCHVALENA').length,
};
```
**Backend:** ✅ Použít `orders25/list` (žádné změny)

##### 2. 📈 Časové řady
```javascript
// Group by month na FE
const timeline = allOrders.reduce((acc, order) => {
  const month = order.datum_vytvoreni.substring(0, 7); // '2025-11'
  if (!acc[month]) acc[month] = { count: 0, amount: 0 };
  acc[month].count++;
  acc[month].amount += order.cena_rok;
  return acc;
}, {});
```
**Backend:** ✅ Použít `orders25/list` (žádné změny)

##### 3. 🥧 Rozdělení podle úseků
```javascript
// Group by department na FE
const byDepartment = allOrders.reduce((acc, order) => {
  const dept = order.usek_nazev || 'Neuvedeno';
  if (!acc[dept]) acc[dept] = { count: 0, amount: 0 };
  acc[dept].count++;
  acc[dept].amount += order.cena_rok;
  return acc;
}, {});
```
**Backend:** ✅ Použít `orders25/list` (žádné změny)

##### 4. 👥 TOP uživatelé
```javascript
// Group by user na FE
const byUser = allOrders.reduce((acc, order) => {
  const user = order.uzivatel_display || 'Neuvedeno';
  if (!acc[user]) acc[user] = { count: 0, amount: 0 };
  acc[user].count++;
  acc[user].amount += order.cena_rok;
  return acc;
}, {});

// Sort and take TOP 10
const topUsers = Object.entries(byUser)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 10);
```
**Backend:** ✅ Použít `orders25/list` (žádné změny)

---

## 🎯 FINÁLNÍ STRATEGIE

### FÁZE 1-2: Použít pouze FE (rychlý start)

**Implementovat na FE bez nových BE endpointů:**
- ✅ Objednávky ke zveřejnění
- ✅ Objednávky nad 50k Kč
- ✅ Zveřejněné objednávky
- ✅ Čekající na schválení > 5 dní
- ✅ Majetkové objednávky
- ✅ Všechny základní statistiky
- ✅ Časové řady
- ✅ Rozdělení podle úseků
- ✅ TOP uživatelé

**Výhody:**
- 🚀 Rychlá implementace (bez BE práce)
- 🔧 Snadné testování
- 💡 Flexibilní filtry na FE
- 🎨 Rychlé iterace

**Nevýhody:**
- ⚠️ Načítá všechny objednávky do paměti (může být pomalé pro 10k+ objednávek)
- ⚠️ Filtrování na FE (může být pomalé)

**Řešení:**
- Použít cache (`ordersCacheService` - už máme!)
- Použít Web Workers pro filtering (pokud bude potřeba)
- Virtualizace tabulek (už používáme @tanstack/react-table)

---

### FÁZE 3: Přidat nové BE endpointy (optimalizace)

**Vytvořit pouze pro komplexní reporty:**
- 💰 Čerpání LP (`POST /reports/lp-status`)
- ❗ Nesrovnalosti ve fakturaci (`POST /reports/invoice-discrepancy`)
- ⏪ Zpětné objednávky (`POST /reports/retroactive-orders`)
- ⚡ Urgentní platby (`POST /reports/urgent-payments`)

**Důvod:**
- Tyto reporty vyžadují data z více tabulek (JOIN)
- SQL agregace je rychlejší než FE filtering
- Redukce objemu přenášených dat

---

## 💻 IMPLEMENTACE - Frontend Service

### reportsApi.js - Hybrid Service

```javascript
// src/services/reportsApi.js

import { getOrdersList25 } from './api25orders';
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Reports API - Hybrid approach
 * 
 * Většina reportů používá orders25/list + FE filtering
 * Pouze komplexní reporty volají dedikované BE endpointy
 */
export const reportsApi = {
  
  // ============================================================
  // FRONTEND-BASED REPORTS (použití orders25/list)
  // ============================================================
  
  /**
   * Objednávky ke zveřejnění
   * FE filtering - žádný nový BE endpoint
   */
  async getToPublish({ token, username, filters }) {
    const allOrders = await getOrdersList25({ token, username, filters });
    
    const filtered = allOrders.filter(order => {
      // Musí se zveřejnit (nad 50k Kč) a ještě není zveřejněna
      const mustPublish = parseFloat(order.cena_rok || 0) >= 50000;
      const notPublished = !order.zverejneno;
      
      return mustPublish && notPublished;
    });
    
    return {
      status: 'ok',
      data: {
        items: filtered,
        total_count: filtered.length,
        source: 'frontend-filter'
      }
    };
  },
  
  /**
   * Objednávky nad limit
   * FE filtering - žádný nový BE endpoint
   */
  async getOverLimit({ token, username, filters }) {
    const limit = filters.limit || 50000;
    const allOrders = await getOrdersList25({ token, username, filters });
    
    const filtered = allOrders.filter(order => {
      return parseFloat(order.cena_rok || 0) >= limit;
    });
    
    return {
      status: 'ok',
      data: {
        items: filtered,
        total_count: filtered.length,
        source: 'frontend-filter'
      }
    };
  },
  
  /**
   * Zveřejněné objednávky
   * FE filtering - žádný nový BE endpoint
   */
  async getPublished({ token, username, filters }) {
    const allOrders = await getOrdersList25({ token, username, filters });
    
    const filtered = allOrders.filter(order => {
      return order.zverejneno !== null && order.zverejneno !== undefined;
    });
    
    return {
      status: 'ok',
      data: {
        items: filtered,
        total_count: filtered.length,
        source: 'frontend-filter'
      }
    };
  },
  
  /**
   * Čekající na schválení > X dní
   * FE filtering - žádný nový BE endpoint
   */
  async getPendingApprovals({ token, username, filters }) {
    const days = filters.days || 5;
    const allOrders = await getOrdersList25({ token, username, filters });
    
    const now = Date.now();
    const filtered = allOrders.filter(order => {
      if (order.stav !== 'KE_SCHVALENI') return false;
      
      const created = new Date(order.datum_vytvoreni).getTime();
      const daysSinceCreated = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      
      return daysSinceCreated > days;
    });
    
    return {
      status: 'ok',
      data: {
        items: filtered,
        total_count: filtered.length,
        source: 'frontend-filter'
      }
    };
  },
  
  /**
   * Majetkové objednávky
   * FE filtering - žádný nový BE endpoint
   */
  async getAssetOrders({ token, username, filters }) {
    const allOrders = await getOrdersList25({ token, username, filters });
    
    const filtered = allOrders.filter(order => {
      const type = (order.druh_objednavky_display || '').toLowerCase();
      return type.includes('majetek') || type.includes('asset');
    });
    
    return {
      status: 'ok',
      data: {
        items: filtered,
        total_count: filtered.length,
        source: 'frontend-filter'
      }
    };
  },
  
  // ============================================================
  // BACKEND-BASED REPORTS (nové BE endpointy)
  // ============================================================
  
  /**
   * Čerpání LP (Limitované příslíby)
   * ✅ POUŽITÍ EXISTUJÍCÍHO BE ENDPOINTU
   */
  async getLpStatus({ token, username, filters }) {
    try {
      const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL;
      
      // Použít existující endpoint pro čerpání podle úseků
      const response = await api.post(
        `${API_BASE_URL}limitovane-prisliby/cerpani-podle-useku`,
        {
          token,
          username,
          rok: filters.year || new Date().getFullYear(),
          usek_id: filters.department_id || null
        }
      );
      
      // Response obsahuje pole LP s čerpáním
      if (response.data && Array.isArray(response.data)) {
        const lpData = response.data;
        
        // Agregovat data
        const total_limit = lpData.reduce((sum, lp) => 
          sum + parseFloat(lp.vyse_financniho_kryti || 0), 0
        );
        const total_spent_skutecne = lpData.reduce((sum, lp) => 
          sum + parseFloat(lp.cerpano_skutecne || 0), 0
        );
        const total_spent_schvalene = lpData.reduce((sum, lp) => 
          sum + parseFloat(lp.cerpano_schvalene || 0), 0
        );
        
        return {
          status: 'ok',
          data: {
            total_limit,
            total_spent_skutecne,
            total_spent_schvalene,
            remaining: total_limit - total_spent_skutecne,
            percentage: total_limit > 0 ? (total_spent_skutecne / total_limit * 100) : 0,
            by_lp: lpData.map(lp => ({
              cislo_lp: lp.cislo_lp,
              nazev: lp.nazev,
              limit: parseFloat(lp.vyse_financniho_kryti || 0),
              spent_skutecne: parseFloat(lp.cerpano_skutecne || 0),
              spent_schvalene: parseFloat(lp.cerpano_schvalene || 0),
              spent_rozpracovane: parseFloat(lp.cerpano_rozpracovane || 0),
              remaining: parseFloat(lp.zbyva_skutecne || 0),
              percentage: parseFloat(lp.procento_skutecne || 0),
              is_exceeded: lp.je_prekroceno_skutecne || false
            })),
            source: 'existing-backend'
          }
        };
      }
      
      throw new Error('Neočekávaná struktura odpovědi');
    } catch (error) {
      console.error('getLpStatus error:', error);
      throw error;
    }
  },
  
  /**
   * Nesrovnalosti ve fakturaci
   * VYŽADUJE nový BE endpoint
   */
  async getInvoiceDiscrepancy({ token, username, filters }) {
    try {
      const response = await api.post('reports/invoice-discrepancy', {
        token,
        username,
        filters
      });
      
      return response.data;
    } catch (error) {
      console.error('getInvoiceDiscrepancy error:', error);
      throw error;
    }
  },
  
  /**
   * Zpětné objednávky
   * VYŽADUJE nový BE endpoint
   */
  async getRetroactiveOrders({ token, username, filters }) {
    try {
      const response = await api.post('reports/retroactive-orders', {
        token,
        username,
        filters
      });
      
      return response.data;
    } catch (error) {
      console.error('getRetroactiveOrders error:', error);
      throw error;
    }
  },
  
  /**
   * Urgentní platby
   * VYŽADUJE nový BE endpoint
   */
  async getUrgentPayments({ token, username, filters }) {
    try {
      const response = await api.post('reports/urgent-payments', {
        token,
        username,
        filters
      });
      
      return response.data;
    } catch (error) {
      console.error('getUrgentPayments error:', error);
      throw error;
    }
  }
};

/**
 * Statistics API - Frontend-based
 * Všechny statistiky lze spočítat na FE z orders25/list
 */
export const statisticsApi = {
  
  /**
   * Dashboard overview
   * FE calculation - žádný nový BE endpoint
   */
  async getOverview({ token, username, filters }) {
    const allOrders = await getOrdersList25({ token, username, filters });
    
    const total_count = allOrders.length;
    const total_amount = allOrders.reduce((sum, o) => sum + parseFloat(o.cena_rok || 0), 0);
    const avg_amount = total_count > 0 ? total_amount / total_count : 0;
    
    const approved = allOrders.filter(o => o.stav === 'SCHVALENA').length;
    const rejected = allOrders.filter(o => o.stav === 'ZAMITNUTA').length;
    const pending = allOrders.filter(o => o.stav === 'KE_SCHVALENI').length;
    
    return {
      status: 'ok',
      data: {
        total_count,
        total_amount,
        avg_amount,
        approved_count: approved,
        approved_pct: total_count > 0 ? (approved / total_count * 100) : 0,
        rejected_count: rejected,
        pending_count: pending,
        source: 'frontend-calculation'
      }
    };
  },
  
  /**
   * Timeline (časové řady)
   * FE calculation - žádný nový BE endpoint
   */
  async getTimeline({ token, username, filters }) {
    const allOrders = await getOrdersList25({ token, username, filters });
    const groupBy = filters.group_by || 'month';
    
    const timeline = {};
    
    allOrders.forEach(order => {
      let period;
      const date = new Date(order.datum_vytvoreni);
      
      if (groupBy === 'month') {
        period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        period = `${date.getFullYear()}-Q${quarter}`;
      } else if (groupBy === 'year') {
        period = String(date.getFullYear());
      }
      
      if (!timeline[period]) {
        timeline[period] = { count: 0, total_amount: 0 };
      }
      
      timeline[period].count++;
      timeline[period].total_amount += parseFloat(order.cena_rok || 0);
    });
    
    // Convert to array and sort
    const timelineArray = Object.entries(timeline).map(([period, data]) => ({
      period,
      ...data,
      avg_amount: data.count > 0 ? data.total_amount / data.count : 0
    })).sort((a, b) => a.period.localeCompare(b.period));
    
    return {
      status: 'ok',
      data: {
        timeline: timelineArray,
        source: 'frontend-calculation'
      }
    };
  },
  
  /**
   * By departments (podle úseků)
   * FE calculation - žádný nový BE endpoint
   */
  async getDepartments({ token, username, filters }) {
    const allOrders = await getOrdersList25({ token, username, filters });
    
    const byDept = {};
    const total_amount = allOrders.reduce((sum, o) => sum + parseFloat(o.cena_rok || 0), 0);
    
    allOrders.forEach(order => {
      const dept = order.usek_nazev || 'Neuvedeno';
      
      if (!byDept[dept]) {
        byDept[dept] = { count: 0, total_amount: 0 };
      }
      
      byDept[dept].count++;
      byDept[dept].total_amount += parseFloat(order.cena_rok || 0);
    });
    
    // Convert to array and add percentages
    const departments = Object.entries(byDept).map(([name, data]) => ({
      department_name: name,
      count: data.count,
      total_amount: data.total_amount,
      avg_amount: data.count > 0 ? data.total_amount / data.count : 0,
      percentage: total_amount > 0 ? (data.total_amount / total_amount * 100) : 0
    })).sort((a, b) => b.total_amount - a.total_amount);
    
    return {
      status: 'ok',
      data: {
        departments,
        source: 'frontend-calculation'
      }
    };
  },
  
  /**
   * By users (podle uživatelů)
   * FE calculation - žádný nový BE endpoint
   */
  async getUsers({ token, username, filters }) {
    const allOrders = await getOrdersList25({ token, username, filters });
    const topN = filters.top_n || 10;
    
    const byUser = {};
    
    allOrders.forEach(order => {
      const user = order.uzivatel_display || 'Neuvedeno';
      
      if (!byUser[user]) {
        byUser[user] = { 
          count: 0, 
          total_amount: 0,
          approved: 0,
          rejected: 0
        };
      }
      
      byUser[user].count++;
      byUser[user].total_amount += parseFloat(order.cena_rok || 0);
      
      if (order.stav === 'SCHVALENA') byUser[user].approved++;
      if (order.stav === 'ZAMITNUTA') byUser[user].rejected++;
    });
    
    // Convert to array, sort, and take TOP N
    const users = Object.entries(byUser)
      .map(([name, data]) => ({
        user_name: name,
        created_count: data.count,
        approved_count: data.approved,
        rejected_count: data.rejected,
        total_amount: data.total_amount,
        avg_amount: data.count > 0 ? data.total_amount / data.count : 0
      }))
      .sort((a, b) => b.created_count - a.created_count)
      .slice(0, topN);
    
    return {
      status: 'ok',
      data: {
        users,
        source: 'frontend-calculation'
      }
    };
  }
};
```

---

## 📋 SHRNUTÍ - Backend Potřeby

**✅ NEPOTŘEBUJEME nové BE endpointy pro (9 reportů + 4 statistiky):

**Reporty:**
1. ⚠️ Objednávky ke zveřejnění → FE filter
2. 💰 Objednávky nad 50k Kč → FE filter
3. 📢 Zveřejněné objednávky → FE filter
4. ⏳ Čekající na schválení > 5 dní → FE filter
5. 🏢 Majetkové objednávky → FE filter
6. 💰 Čerpání LP → **Použít existující BE** (`/limitovane-prisliby/cerpani-podle-useku`)

**Statistiky:**
1. 📊 Dashboard overview → FE calculation
2. 📈 Časové řady → FE calculation
3. 🥧 Rozdělení podle úseků → FE calculation
4. 👥 TOP uživatelé → FE calculation

**= 10 funkcí bez NOVÉHO BE!** 🎉

---

### ⚠️ POTŘEBUJEME nové BE endpointy pouze pro (3 reporty):

1. ~~💰 Čerpání LP~~ → ✅ **JUŽ MÁME** (`/limitovane-prisliby/cerpani-podle-useku`)
2. ❗ Nesrovnalosti ve fakturaci → `POST /reports/invoice-discrepancy`
3. ⏪ Zpětné objednávky → `POST /reports/retroactive-orders`
4. ⚡ Urgentní platby → `POST /reports/urgent-payments`

**= 3 nové BE endpointy** (1 už existuje!)

---

## 🚀 DOPORUČENÍ

### Implementační plán:

**FÁZE 1-2:** (5-7 dní)
- ✅ Implementovat všechny FE-based reporty (9 funkcí)
- ✅ Otestovat na produkčních datech
- ✅ Optimalizovat pomocí cache
- ✅ Získat feedback od uživatelů

**FÁZE 3:** (1-2 dny) 
- 📋 Vytvořit pouze 3 nové BE endpointy (LP už máme!)
- 📋 Integrovat do FE

**Výhoda tohoto přístupu:**
- 🚀 Rychlý start (většina funkcí ihned)
- 💪 Menší závislost na BE vývojáři
- 🎨 Flexibilita (snadné přidávání filtrů na FE)
- ✅ Graduální implementace (nejdřív jednoduché, pak složité)
- 🎁 Bonus: Čerpání LP už máme hotové!

---

**Připravil:** AI Assistant  
**Datum:** 27. listopadu 2025  
**Status:** ✅ STRATEGIC RECOMMENDATION
