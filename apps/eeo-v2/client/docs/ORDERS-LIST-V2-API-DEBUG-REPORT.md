# 🔍 Orders25List - Kompletní Analýza API V2 a Funkčnosti

**Datum:** 2. listopadu 2025  
**Soubor:** `src/pages/Orders25List.js` (10 730 řádků)  
**API:** Order V2 (`/order-v2/list-enriched`)

---

## ✅ POTVRZENÍ: Používá se POUZE API V2

```javascript
// Řádek 10: Import Order V2 API
import { getOrderV2, listOrdersV2 } from '../services/apiOrderV2';

// Řádek 3870: Volání API V2 v loadData()
return await listOrdersV2(filters, token, username);
```

**✅ Potvrzeno:** Žádné reference na `staryOrders25` nebyly nalezeny.

---

## 🔴 KRITICKÉ PROBLÉMY NALEZENÉ

### 1. ❌ **FILTRY ROKU A MĚSÍCE - PROBLÉM S DATUMY**

#### Problém:
Kód v `loadData()` správně vytváří `dateRange` s `datum_od` a `datum_do`, ale:

```javascript
// Řádek 3800-3850: Správná logika vytvoření dateRange
const getDateRange = () => {
  if (selectedYear !== 'all') {
    const year = parseInt(selectedYear);
    
    if (mesicFilter) {
      // Parsuj měsíc (může být "1", "1-3", "10-12")
      const monthMatch = mesicFilter.match(/^(\d+)(?:-(\d+))?$/);
      if (monthMatch) {
        const startMonth = parseInt(monthMatch[1]);
        const endMonth = monthMatch[2] ? parseInt(monthMatch[2]) : startMonth;
        
        const datum_od = `${year}-${String(startMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(year, endMonth, 0).getDate();
        const datum_do = `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        return { datum_od, datum_do };
      }
    } else {
      // Celý rok
      const datum_od = `${year}-01-01`;
      const datum_do = `${year}-12-31`;
      return { datum_od, datum_do };
    }
  }
  
  // Pokud je "Všechny roky" - neomezujeme datum
  return {};
};

const dateRange = getDateRange();
```

**✅ TENTO KÓD JE SPRÁVNĚ!**

Problém může být v:
- **Backend API** - možná nefiltruje podle `datum_od` a `datum_do`
- **Parsování měsíce** - pokud `selectedMonth` není správně nastavený

#### Kontrola: Co je v `selectedMonth`?

```javascript
// Řádek 3206: Inicializace selectedMonth
const [selectedMonth, setSelectedMonth] = useState(() => {
  return getUserStorage('orders25List_selectedMonth', 'all');
});
```

**Možný problém:** Pokud je `selectedMonth` nastavený na `'all'`, pak se `mesicFilter` v `loadData()` nepoužije!

```javascript
// Řádek 3877 uvnitř loadData():
const mesicFilter = selectedMonth !== 'all' ? selectedMonth : null;
```

**❗ ZÁVĚR:** Pokud je `selectedMonth = 'all'`, pak se posílá do API jen `datum_od: YYYY-01-01` a `datum_do: YYYY-12-31` pro celý rok. To je správně.

**🔍 KONTROLA POTŘEBNÁ:**
1. Zkontroluj v konzoli prohlížeče hodnoty:
   - `selectedYear`
   - `selectedMonth`
   - Výsledný `dateRange` objekt
2. Zkontroluj v Network tabu, jestli se posílá správný payload do API

---

### 2. ❌ **DLAŽDICE "MOJE OBJEDNÁVKY" - CHYBNÁ LOGIKA?**

#### Současný kód:

```javascript
// Řádek 9090-9116: Počítání "Moje objednávky"
const myOrdersCount = filteredData.filter(order => {
  const isObjednatel = order.objednatel_id === user_id || order.uzivatel_id === user_id;
  const isGarant = order.garant_id === user_id;
  const isSchvalovatel = order.schvalovatel_id === user_id;
  const isPrikazce = order.prikazce_id === user_id;
  return isObjednatel || isGarant || isSchvalovatel || isPrikazce;
}).length;
```

**❗ POZOR:** Používají se pole z API V2. Potřebujeme ověřit, jaké názvy polí vrací API:

**Order V2 enriched API vrací:**
- `uzivatel_id` - ID objednatele (vytvořil objednávku)
- `objednatel_id` - ??? (nemusí existovat!)
- `garant_uzivatel_id` - ID garanta (NE `garant_id`!)
- `prikazce_id` - ID příkazce
- `schvalovatel_id` - ID schvalovatele

**🔴 MOŽNÝ BUG:**
```javascript
// Chybné pole:
const isGarant = order.garant_id === user_id;

// Správně by mělo být:
const isGarant = order.garant_uzivatel_id === user_id;
```

**🔴 MOŽNÝ BUG 2:**
```javascript
// order.objednatel_id možná neexistuje v API V2!
const isObjednatel = order.objednatel_id === user_id || order.uzivatel_id === user_id;
```

#### 🔧 NAVRHOVANÁ OPRAVA:

```javascript
const myOrdersCount = filteredData.filter(order => {
  const isObjednatel = order.uzivatel_id === user_id;
  const isGarant = order.garant_uzivatel_id === user_id;
  const isSchvalovatel = order.schvalovatel_id === user_id;
  const isPrikazce = order.prikazce_id === user_id;
  return isObjednatel || isGarant || isSchvalovatel || isPrikazce;
}).length;
```

---

### 3. ⚠️ **FULLTEXT VYHLEDÁVÁNÍ - MOŽNÝ PROBLÉM S DIACRITIKOU**

#### Současný kód:

```javascript
// Řádek 5318-5380: filteredData useMemo
const filteredData = useMemo(() => {
  return orders.filter(order => {
    // Global search (fulltext)
    if (globalFilter) {
      const searchStr = removeDiacritics(globalFilter.toLowerCase());
      const fieldsToSearch = [
        order.cislo_objednavky,
        order.predmet,
        order.popis_pozadavku,
        order.poznamky,
        order.dodavatel_nazev,
        order.dodavatel_kontakt_jmeno,
        order.dodavatel_kontakt_email,
        getUserDisplayName(order.objednatel_id),
        getUserDisplayName(order.garant_id),
        getUserDisplayName(order.prikazce_id),
        getUserDisplayName(order.schvalovatel_id)
      ];
      
      const matches = fieldsToSearch.some(field => {
        if (!field) return false;
        return removeDiacritics(String(field).toLowerCase()).includes(searchStr);
      });
      
      if (!matches) return false;
    }
    // ... další filtry
  });
}, [orders, columnFilters, globalFilter, statusFilter, userFilter, ...]);
```

**✅ KÓD VYPADÁ SPRÁVNĚ** - používá `removeDiacritics` pro fulltext.

**Možný problém:** Kontrola, že `getUserDisplayName()` správně vrací jména z API V2 enriched dat.

---

### 4. ⚠️ **ROZŠÍŘENÝ FILTR - FILTRY DATA**

#### Současný kód pro filtrování podle datumu:

```javascript
// Řádek 5410-5520: Date filtering
if (dateFromFilter || dateToFilter) {
  const orderDate = getOrderDate(order);
  
  if (!orderDate) {
    // ... fallback kontroly na datum_obj_do
  }
  
  if (dateFromFilter) {
    const fromDate = new Date(dateFromFilter);
    const objDate = new Date(orderDate);
    if (objDate < fromDate) return false;
  }
  
  if (dateToFilter) {
    const toDate = new Date(dateToFilter);
    toDate.setHours(23, 59, 59, 999);
    const objDate = new Date(orderDate);
    if (objDate > toDate) return false;
  }
}
```

**✅ VYPADÁ SPRÁVNĚ**

---

### 5. ❌ **STATISTIKY (DLAŽDICE) - MOŽNÝ PROBLÉM S MAPOVÁNÍM STAVŮ**

#### Současný kód:

```javascript
// Řádek 4560-4650: stats calculation
const stats = useMemo(() => {
  const dataToCount = showArchived 
    ? orders 
    : orders.filter(order => {
        const status = getOrderSystemStatus(order);
        return status !== 'ARCHIVOVANO';
      });
  
  const byStatus = dataToCount.reduce((acc, order) => {
    const systemStatus = getOrderSystemStatus(order);
    acc[systemStatus] = (acc[systemStatus] || 0) + 1;
    return acc;
  }, {});
  
  // ...
}, [orders, showArchived, getOrderTotalPriceWithDPH]);
```

**Klíčová funkce:**

```javascript
// Řádek 4420-4450: getOrderSystemStatus
const getOrderSystemStatus = (order) => {
  // Speciální případ pro koncepty
  if (order.isDraft || order.je_koncept) {
    return 'NOVA';
  }
  
  // Pokud máme uživatelsky přívětivý stav, zmapuj na systémový kód
  if (order.stav_objednavky) {
    return mapUserStatusToSystemCode(order.stav_objednavky);
  }
  
  // Fallback na stav_workflow_kod
  if (order.stav_workflow_kod) {
    try {
      const workflowStates = JSON.parse(order.stav_workflow_kod);
      return Array.isArray(workflowStates) 
        ? workflowStates[workflowStates.length - 1] 
        : order.stav_workflow_kod;
    } catch {
      return order.stav_workflow_kod;
    }
  }
  
  return 'DRAFT';
};
```

**Mapování stavů:**

```javascript
// Řádek 280-300: mapUserStatusToSystemCode
const mapUserStatusToSystemCode = (userStatus) => {
  const mapping = {
    'Ke schválení': 'ODESLANA_KE_SCHVALENI',
    'Nová': 'NOVA', 
    'Schválená': 'SCHVALENA',
    'Zamítnutá': 'ZAMITNUTA',
    'Rozpracovaná': 'ROZPRACOVANA',
    'Odeslaná dodavateli': 'ODESLANA',
    'Potvrzená dodavatelem': 'POTVRZENA',
    'Uveřejněná': 'UVEREJNENA',
    'Čeká na potvrzení': 'CEKA_POTVRZENI',
    'Čeká se': 'CEKA_SE',
    'Dokončená': 'DOKONCENA',
    'Zrušená': 'ZRUSENA',
    'Smazaná': 'SMAZANA',
    'Koncept': 'NOVA'
  };
  return mapping[userStatus] || userStatus;
};
```

**✅ VYPADÁ SPRÁVNĚ**

---

## 🔍 DIAGNOSTIKA - CO ZKONTROLOVAT

### 1. **Zkontroluj API Response v Network Tabu**

**Otevři DevTools → Network → Filtruj: `list-enriched`**

**Payload request:**
```json
{
  "token": "...",
  "username": "...",
  "datum_od": "2025-01-01",
  "datum_do": "2025-12-31",
  "archivovano": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "cislo_objednavky": "O-0001/12345678/2025/IT",
      "stav_objednavky": "Nová",
      "uzivatel_id": 5,
      "garant_uzivatel_id": 10,  // ← POZOR na správný název pole!
      "prikazce_id": 8,
      "schvalovatel_id": 12,
      "dt_objednavky": "2025-01-15T10:30:00",
      // ... další pole
    }
  ]
}
```

**🔍 CO HLEDAT:**
- ✅ Jsou data filtrovaná podle `datum_od` a `datum_do`?
- ✅ Obsahuje response pole `garant_uzivatel_id` nebo `garant_id`?
- ✅ Kolik objednávek má backend vrátil vs. kolik se zobrazí?

---

### 2. **Zkontroluj Console Logs**

**Otevři DevTools → Console**

Hledej tyto logy:

```javascript
// Řádek 3820: Debug getDateRange
console.log('🔧 DEBUG getDateRange:', {
  selectedYear,
  selectedMonth,
  mesicFilter,
  startMonth,
  endMonth,
  datum_od,
  datum_do
});

// Řádek 776: Debug API request
console.log('🔍 DEBUG API REQUEST - listOrdersV2:', {
  endpoint: endpoint,
  payload: requestPayload
});

// Řádek 786: Debug API response
console.log('🔍 DEBUG API RESPONSE - listOrdersV2:', {
  status: response.status,
  dataCount: response.data?.data?.length || 0
});
```

**🔍 CO HLEDAT:**
- ✅ Jaké hodnoty má `datum_od` a `datum_do`?
- ✅ Kolik objednávek vrátilo API (`dataCount`)?
- ✅ Odpovídá počet API response počtu v `orders` state?

---

### 3. **Zkontroluj Dlaždice "Moje objednávky"**

**Otevři React DevTools → Components → Orders25List**

**Najdi state:**
- `user_id` - tvoje ID
- `orders` - pole všech objednávek
- `filteredData` - filtrovaná data

**Vyfiltruj ručně:**
```javascript
// Zkopíruj do console:
const myOrders = filteredData.filter(order => {
  console.log('Order:', {
    id: order.id,
    uzivatel_id: order.uzivatel_id,
    objednatel_id: order.objednatel_id,
    garant_uzivatel_id: order.garant_uzivatel_id,
    garant_id: order.garant_id,
    prikazce_id: order.prikazce_id,
    schvalovatel_id: order.schvalovatel_id
  });
  
  const user_id = 5; // ← Doplň své ID!
  
  const isObjednatel = order.uzivatel_id === user_id;
  const isGarant = order.garant_uzivatel_id === user_id;
  const isPrikazce = order.prikazce_id === user_id;
  const isSchvalovatel = order.schvalovatel_id === user_id;
  
  return isObjednatel || isGarant || isPrikazce || isSchvalovatel;
});

console.log('Moje objednávky:', myOrders.length, myOrders);
```

**🔍 CO HLEDAT:**
- ✅ Má API vrátit pole `garant_uzivatel_id` nebo `garant_id`?
- ✅ Tvoje ID se objevuje v některém z polí?
- ✅ Proč dlaždice ukazuje 0, když ručně najdeš objednávky?

---

### 4. **Zkontroluj Fulltext Search**

**Do vyhledávacího pole zadej:**
- Část evidenčního čísla (např. `0001`)
- Část předmětu objednávky
- Část jména objednatele

**Otevři Console a zkontroluj:**
```javascript
// V console:
const testSearch = (searchTerm) => {
  const searchStr = searchTerm.toLowerCase();
  
  orders.forEach(order => {
    const matches = [
      order.cislo_objednavky,
      order.predmet,
      order.dodavatel_nazev
    ].some(field => {
      return field && field.toLowerCase().includes(searchStr);
    });
    
    if (matches) {
      console.log('MATCH:', order.id, order.cislo_objednavky, order.predmet);
    }
  });
};

testSearch('test'); // ← Zadej svůj hledaný výraz
```

---

## 🛠️ NAVRHOVANÉ OPRAVY

### OPRAVA 1: Dlaždice "Moje objednávky" - Správné názvy polí

**Soubor:** `src/pages/Orders25List.js`  
**Řádek:** 9092

**Najdi:**
```javascript
const myOrdersCount = filteredData.filter(order => {
  const isObjednatel = order.objednatel_id === user_id || order.uzivatel_id === user_id;
  const isGarant = order.garant_id === user_id;
  const isSchvalovatel = order.schvalovatel_id === user_id;
  const isPrikazce = order.prikazce_id === user_id;
  return isObjednatel || isGarant || isSchvalovatel || isPrikazce;
}).length;
```

**Nahraď:**
```javascript
const myOrdersCount = filteredData.filter(order => {
  // Order V2 API enriched používá tyto názvy polí:
  const isObjednatel = order.uzivatel_id === user_id;
  const isGarant = order.garant_uzivatel_id === user_id;
  const isSchvalovatel = order.schvalovatel_id === user_id;
  const isPrikazce = order.prikazce_id === user_id;
  
  return isObjednatel || isGarant || isSchvalovatel || isPrikazce;
}).length;
```

**🔄 Totéž oprav i na řádku 9476** (druhá kopie dlaždic pro desktop režim)

---

### OPRAVA 2: Debug log pro diagnostiku filtru období

**Soubor:** `src/pages/Orders25List.js`  
**Řádek:** 3870 (za `const dateRange = getDateRange();`)

**Přidej debug log:**
```javascript
const dateRange = getDateRange();

// 🐛 DEBUG: Zobraz výsledný dateRange
console.log('%c📅 DATE RANGE FOR API:', 'background: #10b981; color: white; font-weight: bold; padding: 4px 8px; border-radius: 3px; font-size: 12px;', {
  selectedYear,
  selectedMonth,
  mesicFilter,
  dateRange,
  willFilterByDate: Object.keys(dateRange).length > 0
});
```

---

### OPRAVA 3: Debug log pro diagnostiku "Moje objednávky"

**Soubor:** `src/pages/Orders25List.js`  
**Řádek:** 9092 (před výpočtem myOrdersCount)

**Přidej debug log:**
```javascript
// 🐛 DEBUG: Zkontroluj názvy polí pro "Moje objednávky"
if (filteredData.length > 0) {
  const sampleOrder = filteredData[0];
  console.log('%c👤 SAMPLE ORDER FIELDS (pro Moje obj.):', 'background: #7c3aed; color: white; font-weight: bold; padding: 4px 8px; border-radius: 3px; font-size: 12px;', {
    id: sampleOrder.id,
    uzivatel_id: sampleOrder.uzivatel_id,
    objednatel_id: sampleOrder.objednatel_id,
    garant_uzivatel_id: sampleOrder.garant_uzivatel_id,
    garant_id: sampleOrder.garant_id,
    prikazce_id: sampleOrder.prikazce_id,
    schvalovatel_id: sampleOrder.schvalovatel_id,
    currentUserId: user_id
  });
}

const myOrdersCount = filteredData.filter(order => {
  const isObjednatel = order.uzivatel_id === user_id;
  const isGarant = order.garant_uzivatel_id === user_id;
  const isSchvalovatel = order.schvalovatel_id === user_id;
  const isPrikazce = order.prikazce_id === user_id;
  
  const match = isObjednatel || isGarant || isSchvalovatel || isPrikazce;
  
  // 🐛 DEBUG: Loguj každou objednávku kde jsi v nějaké roli
  if (match) {
    console.log('%c✅ MATCH:', 'color: green; font-weight: bold;', {
      id: order.id,
      cislo: order.cislo_objednavky,
      roles: {
        objednatel: isObjednatel,
        garant: isGarant,
        schvalovatel: isSchvalovatel,
        prikazce: isPrikazce
      }
    });
  }
  
  return match;
}).length;

console.log('%c📊 MOJE OBJEDNÁVKY COUNT:', 'background: #7c3aed; color: white; font-weight: bold; padding: 4px 8px; border-radius: 3px; font-size: 14px;', myOrdersCount);
```

---

## 📋 KONTROLNÍ SEZNAM

Postupně zkontroluj:

- [ ] **1. API Request v Network tabu**
  - [ ] Payload obsahuje správné `datum_od` a `datum_do`
  - [ ] Response vrací očekávaný počet objednávek
  - [ ] Response obsahuje pole `garant_uzivatel_id` (ne `garant_id`)

- [ ] **2. Console Logs**
  - [ ] Debug log `DATE RANGE FOR API` ukazuje správná data
  - [ ] Debug log `API REQUEST` ukazuje správný payload
  - [ ] Debug log `API RESPONSE` ukazuje správný počet dat

- [ ] **3. Dlaždice "Moje objednávky"**
  - [ ] Debug log `SAMPLE ORDER FIELDS` ukazuje správné názvy polí
  - [ ] Debug log `MATCH` ukazuje objednávky kde jsi v nějaké roli
  - [ ] Počet odpovídá zobrazené hodnotě na dlaždici

- [ ] **4. Fulltext vyhledávání**
  - [ ] Vyhledávání podle čísla objednávky funguje
  - [ ] Vyhledávání podle předmětu funguje
  - [ ] Vyhledávání podle jména objednatele funguje

- [ ] **5. Rozšířený filtr**
  - [ ] Filtr podle stavu funguje
  - [ ] Filtr podle uživatele funguje
  - [ ] Filtr podle datumu funguje
  - [ ] Filtr podle částky funguje

---

## 🎯 ZÁVĚR A DALŠÍ KROKY

1. **Aplikuj OPRAVU 1** (garant_uzivatel_id vs garant_id) - to je nejpravděpodobnější příčina problému s "Moje obj."

2. **Aplikuj OPRAVU 2 a 3** (debug logy) - získáš přesnou diagnostiku

3. **Spusť aplikaci a otevři Console** - podívej se na výpisy debug logů

4. **Zkontroluj Network tab** - ověř že backend vrací správná data

5. **Reportuj nálezy** - podle výsledků debug logů můžeme pokračovat v opravách

---

**Autor:** GitHub Copilot  
**Verze dokumentu:** 1.0  
**Status:** ✅ PŘIPRAVENO K TESTOVÁNÍ
