# 🚀 Orders25List Migrace na Order V2 API

**Datum:** 2. listopadu 2025  
**Komponenta:** `src/pages/Orders25List.js`  
**Status:** ✅ IMPLEMENTOVÁNO - Čeká na testování

---

## 📋 Přehled Změn

### ✅ Provedené Úpravy

#### 1. **Import V2 API funkcí**
```javascript
// ❌ PŘED
import { getOrdersList25, getOrdersByUser25, ... } from '../services/api25orders';

// ✅ PO
import { downloadAttachment25, createDownloadLink25, ... } from '../services/api25orders';
import { getOrderV2, listOrdersV2 } from '../services/apiOrderV2';
```

**Důvod:** Migrace z starého `getOrdersByUser25()` na nový `listOrdersV2()`

---

#### 2. **Aktualizace `fetchFunction` v `loadData()`**
```javascript
// ❌ PŘED - Složitá logika s podmínkami
const fetchFunction = async () => {
  if (canViewAllOrders) {
    return await getOrdersByUser25({ 
      token, username,
      ...(selectedYear !== 'all' && { rok: selectedYear }),
      ...(mesicFilter && { mesic: mesicFilter }),
      ...(showArchived && { archivovano: 1 })
    });
  } else {
    return await getOrdersByUser25({ 
      token, username,
      userId: user_id,
      ...(selectedYear !== 'all' && { rok: selectedYear }),
      ...(mesicFilter && { mesic: mesicFilter }),
      ...(showArchived && { archivovano: 1 })
    });
  }
};

// ✅ PO - Jednoduchá a čistá logika
const fetchFunction = async () => {
  const filters = {
    // Filtr podle uživatele (pokud nemá oprávnění vidět všechny)
    ...(!canViewAllOrders && { uzivatel_id: user_id }),
    // Filtr podle roku
    ...(selectedYear !== 'all' && { rok: selectedYear }),
    // Filtr podle měsíce
    ...(mesicFilter && { mesic: mesicFilter }),
    // Filtr archivovaných
    ...(showArchived && { archivovano: 1 })
  };
  
  return await listOrdersV2(filters, token, username);
};
```

**Výhody:**
- ✅ Jednodušší a čitelnější kód
- ✅ Jediné API volání místo podmíněné logiky
- ✅ Backend rozhoduje o filtrování podle `uzivatel_id`

---

#### 3. **Podpora V2 Formátu Financování**

**Zpracování `financovani` pole:**
```javascript
// ✅ V2 API vrací financovani jako OBJEKT (ne JSON string)
// Nové pořadí kontroly:

// 1. NOVĚ: Financovani jako objekt (V2 API)
if (row.original.financovani && typeof row.original.financovani === 'object') {
  finData = row.original.financovani;
}
// 2. Parsed financovani data (starý formát)
else if (row.original.financovani_parsed && typeof row.original.financovani_parsed === 'object') {
  finData = row.original.financovani_parsed;
}
// 3. JSON string (starý formát)
else if (row.original.financovani && typeof row.original.financovani === 'string') {
  try { finData = JSON.parse(row.original.financovani); }
  catch { financovaniText = row.original.financovani; }
}
```

**Extrakce názvu financování:**
```javascript
// ✅ V2 API: Přednostně 'nazev' (V2 formát)
// 🔄 Fallback: 'nazev_stavu' (starý formát)
financovaniText = finData.nazev ||                                    // ⭐ V2 API
                 finData.nazev_stavu ||                              // Starý formát
                 (finData.typ ? financovaniKodyMap[finData.typ] : null) ||  // ⭐ V2 API
                 (finData.kod_stavu ? financovaniKodyMap[finData.kod_stavu] : null) ||
                 finData.label || '---';
```

**V2 API formát:**
```json
{
  "typ": "LP",
  "nazev": "Limitovaný příslib",
  "lp_kody": [1, 5, 8]
}
```

**Starý API formát:**
```json
{
  "kod_stavu": "LP",
  "nazev_stavu": "Limitovaný příslib",
  "doplnujici_data": {
    "lp_kod": [1]
  }
}
```

---

## 🎯 Zachovaná Funkcionalita

### ✅ Co Funguje Stejně

#### 1. **Filtrování**
- ✅ Rok (`selectedYear`)
- ✅ Měsíc (`mesicFilter`)
- ✅ Archivované objednávky (`showArchived`)
- ✅ Filtrování podle uživatele (`uzivatel_id`)

#### 2. **Zobrazení Dat**
- ✅ Tabulka objednávek
- ✅ Uživatelská jména (s fallbackem na `users` mapu)
- ✅ Stavy objednávek
- ✅ Ceny
- ✅ Financování (s podporou obou formátů)

#### 3. **Enriched Data Fallback**
Kód má robustní fallback logiku:
```javascript
// Preferuje enriched data, ale má fallback na ID mapping
if (enriched?.objednatel_uzivatel) {
  name = getUserDisplayName(null, enriched.objednatel_uzivatel);
}
else if (row.original.objednatel_id) {
  name = getUserDisplayName(row.original.objednatel_id); // ✅ Fallback
}
```

**Poznámka:** V2 API endpoint `/order-v2/list` zatím nevrací enriched data. Backend plánuje implementaci `/order-v2/list-enriched` v budoucnu. Díky fallback logice aplikace funguje i bez enriched dat.

---

## 📊 Datové Typy V2 API

### Standardizovaný Formát

| Pole | Starý Formát | V2 Formát | Zpětná Kompatibilita |
|------|-------------|-----------|---------------------|
| `strediska_kod` | `[{kod_stavu, nazev_stavu}]` | `["KLADNO", "PRAHA"]` | ✅ Array se používá jen pro vyhledávání |
| `financovani` | JSON string objektu | `{typ, nazev, lp_kody}` | ✅ Fallback na starý formát |
| `druh_objednavky_kod` | JSON string objektu | `"AUTA"` (string) | ✅ Fallback na string |
| `max_cena_s_dph` | `number` | `string` | ✅ `parseFloat()` funguje pro oba |

---

## 🧪 Co Testovat

### Základní Funkcionalita
- [ ] Načtení seznamu objednávek
- [ ] Filtrování podle roku
- [ ] Filtrování podle měsíce
- [ ] Zobrazení archivovaných objednávek
- [ ] Vyhledávání v objednávkách

### Zobrazení Dat
- [ ] Správné zobrazení jmen uživatelů (Objednatel, Garant, atd.)
- [ ] Správné zobrazení způsobu financování
- [ ] Správné zobrazení cen
- [ ] Správné zobrazení stavů objednávek

### Oprávnění
- [ ] Uživatel s `_ALL` oprávněním vidí všechny objednávky
- [ ] Uživatel s `_OWN` oprávněním vidí jen své objednávky

### Edge Cases
- [ ] Objednávka bez enriched dat (fallback na users mapu)
- [ ] Objednávka se starým formátem financování
- [ ] Objednávka s V2 formátem financování
- [ ] Prázdný seznam objednávek

---

## 🚨 Známé Limitace

### 1. **Chybí Enriched Data v `/order-v2/list`**
**Status:** Dočasné  
**Workaround:** Aplikace má fallback logiku - používá `users` mapu načtenou z `fetchAllUsers()`  
**Plán:** Backend implementuje `/order-v2/list-enriched` v budoucnu

### 2. **Střediska - Chybí Názvy**
**Aktuálně:** V2 API vrací jen kódy: `["KLADNO", "PRAHA"]`  
**Zobrazení:** Pokud nejsou enriched data, zobrazují se jen kódy  
**Řešení:** Po implementaci `/order-v2/list-enriched` budou k dispozici názvy

---

## 📝 Změněné Soubory

### Modified
- ✅ `src/pages/Orders25List.js` - Migrace na V2 API

### Unchanged
- ✅ `src/services/api25orders.js` - Zachován pro ostatní funkce (download, lock, atd.)
- ✅ `src/services/apiOrderV2.js` - Již existující V2 API client

---

## 🎯 Další Kroky

### 1. **Testování**
- Otestovat v DEV prostředí
- Ověřit všechny filtry a vyhledávání
- Zkontrolovat zobrazení dat

### 2. **Backend Implementace**
- `/order-v2/list-enriched` - Pro kompletní obohacená data
- Optimalizace dotazů pro rychlejší načítání

### 3. **Případné Úpravy**
- Po implementaci list-enriched odstranit fallback logiku
- Přidat podporu pro další filtry (pokud bude třeba)

---

## 📞 Kontakt

**Otázky k migraci:** Frontend tým  
**Backend API podpora:** Backend tým  
**Datum dokončení:** 2. listopadu 2025

---

## ✅ Checklist pro Merge

- [x] Kód nemá ESLint/TypeScript errory
- [x] Zachována 1:1 funkcionalita
- [x] Neprovádí se změny UI/CSS/barev
- [x] Git záloha vytvořena (větev: `feature/orders-list-v2-api-migration`)
- [ ] Testováno v DEV prostředí
- [ ] Code review provedena
- [ ] Dokumentace aktualizována

---

**Status:** ✅ Implementace dokončena, čeká na testování
