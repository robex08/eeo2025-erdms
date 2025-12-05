# 📋 DATA FORMAT CONTRACT - Frontend ↔ Backend

**Datum:** 1. listopadu 2025  
**Účel:** Definovat KONEČNÝ formát dat mezi FE a BE pro klíčové atributy

---

## 🎯 STŘEDISKA (`strediska_kod`)

### ✅ KONEČNÝ FORMÁT (ZÁVAZNÝ)

#### **Frontend → Backend (SAVE)**
```javascript
// ✅ POSLAT: Array stringů (kódy středisek UPPERCASE)
{
  "strediska_kod": ["KLADNO", "BENESOV", "NYMBURK"]
}
```

#### **Backend → Frontend (LOAD)**
```javascript
// ✅ OČEKÁVAT: Array stringů (kódy středisek UPPERCASE)
{
  "strediska_kod": ["KLADNO", "BENESOV", "NYMBURK"]
}
```

#### **Frontend interní formát**
```javascript
// ✅ formData.strediska_kod = ["KLADNO", "BENESOV"] (array stringů)
// UI komponenta: StableMultiSelect
// Options: strediskaOptions = [{value: "KLADNO", label: "Kladno"}, ...]
```

### ❌ DEPRECATED FORMÁTY (NEPOUŽÍVAT!)
```javascript
// ❌ JSON string: '["KLADNO","BENESOV"]'
// ❌ Objekty: [{kod_stavu: "KLADNO", nazev_stavu: "Kladno"}, ...]
// ❌ JSON string objektů: '[{"kod_stavu":"KLADNO"}]'
```

---

## 💰 FINANCOVÁNÍ (`financovani`, `zpusob_financovani`)

### ✅ KONEČNÝ FORMÁT (ZÁVAZNÝ)

#### **Frontend → Backend (SAVE)**
```javascript
// ✅ POSLAT: Objekt s typ + dynamická pole
{
  "financovani": {
    "typ": "LP",                    // POVINNÉ: "LP" | "POKLADNA" | "SMLOUVA" | "DOTACE" | "POJISTNA_UDALOST" | "INDIVIDUALNI"
    "lp_kody": ["LP123", "LP456"],  // Pro typ=LP
    "cislo_smlouvy": "SM/2025/001", // Pro typ=SMLOUVA
    "smlouva_poznamka": "...",      // Pro typ=SMLOUVA
    "individualni_schvaleni": 1,    // Pro typ=INDIVIDUALNI
    "individualni_poznamka": "...", // Pro typ=INDIVIDUALNI
    "pojistna_udalost_cislo": "PU123", // Pro typ=POJISTNA_UDALOST
    "pojistna_udalost_poznamka": "..." // Pro typ=POJISTNA_UDALOST
  }
}
```

#### **Backend → Frontend (LOAD)**
```javascript
// ✅ OČEKÁVAT: Objekt s typ + dynamická pole (STEJNÝ jako při SAVE)
{
  "financovani": {
    "typ": "LP",
    "lp_kody": ["LP123", "LP456"]
  }
}
```

#### **Frontend interní formát**
```javascript
// ✅ FLAT struktura v formData:
formData = {
  zpusob_financovani: "LP",              // STRING (typ financování)
  lp_kod: ["LP123", "LP456"],            // Array stringů
  cislo_smlouvy: "SM/2025/001",          // String
  smlouva_poznamka: "...",               // String
  individualni_schvaleni: 1,             // Number (0/1)
  individualni_poznamka: "...",          // String
  pojistna_udalost_cislo: "PU123",       // String
  pojistna_udalost_poznamka: "..."       // String
}
```

### ❌ DEPRECATED FORMÁTY (NEPOUŽÍVAT!)
```javascript
// ❌ JSON string: '{"typ":"LP","lp_kody":[...]}'
// ❌ Starý formát: {kod_stavu: "LP", nazev_stavu: "...", doplnujici_data: {...}}
// ❌ Mixed formát: {typ: "LP", nazev: "...", lp_kody: [...]} (nazev je redundantní)
```

---

## 🧾 FAKTURY - Střediska (`fa_strediska_kod`)

### ✅ KONEČNÝ FORMÁT (ZÁVAZNÝ)

#### **Frontend → Backend (SAVE)**
```javascript
// ✅ POSLAT: Array stringů (kódy středisek UPPERCASE)
{
  "faktury": [
    {
      "id": 123,
      "fa_strediska_kod": ["KLADNO", "BENESOV"]
    }
  ]
}
```

#### **Backend → Frontend (LOAD)**
```javascript
// ✅ OČEKÁVAT: Array stringů (kódy středisek UPPERCASE)
{
  "faktury": [
    {
      "id": 123,
      "fa_strediska_kod": ["KLADNO", "BENESOV"]
    }
  ]
}
```

#### **Frontend interní formát**
```javascript
// ✅ faktury[i].fa_strediska_kod = ["KLADNO", "BENESOV"] (array stringů)
```

### ❌ DEPRECATED FORMÁTY (NEPOUŽÍVAT!)
```javascript
// ❌ JSON string: '["KLADNO","BENESOV"]'
// ❌ Objekty: [{kod_stavu: "KLADNO", nazev_stavu: "Kladno"}, ...]
```

---

## 🔄 TRANSFORMAČNÍ PRAVIDLA

### 1. **Backend → Frontend** (`transformBackendDataToFrontend`)
```javascript
function transformBackendDataToFrontend(backendData) {
  const transformed = { ...backendData };
  
  // STŘEDISKA: Zajistit array stringů
  if (backendData.strediska_kod) {
    transformed.strediska_kod = normalizeStrediskaFromBackend(backendData.strediska_kod);
  }
  
  // FINANCOVÁNÍ: Rozbalit do flat struktury
  if (backendData.financovani) {
    const financing = normalizeFinancovaniFromBackend(backendData.financovani);
    Object.assign(transformed, financing);
  }
  
  return transformed;
}
```

### 2. **Frontend → Backend** (v `saveOrderToAPI`)
```javascript
function prepareDataForBackend(formData) {
  const backendData = { ...formData };
  
  // STŘEDISKA: Poslat array stringů (už je v požadovaném formátu)
  // ✅ Žádná transformace potřeba!
  
  // FINANCOVÁNÍ: Zabalit do objektu
  backendData.financovani = normalizeFinancovaniForBackend(formData);
  
  return backendData;
}
```

---

## 🛠️ HELPER FUNKCE (IMPLEMENTOVAT)

### `normalizeStrediskaFromBackend(data)`
```javascript
/**
 * Normalizuje střediska z BE do FE formátu
 * @param {any} data - Raw data z backendu
 * @returns {string[]} - Array kódů středisek UPPERCASE
 */
function normalizeStrediskaFromBackend(data) {
  // Už je array stringů → vrátit
  if (Array.isArray(data) && data.every(item => typeof item === 'string')) {
    return data.map(kod => String(kod).toUpperCase());
  }
  
  // JSON string → parsovat
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          if (typeof item === 'string') return item.toUpperCase();
          if (item.kod_stavu) return item.kod_stavu.toUpperCase();
          if (item.kod) return item.kod.toUpperCase();
          return String(item).toUpperCase();
        });
      }
    } catch (e) {
      console.error('Chyba parsování středisek:', e);
    }
  }
  
  // Array objektů → extrahovat kódy
  if (Array.isArray(data) && data.some(item => typeof item === 'object')) {
    return data.map(item => {
      if (item.kod_stavu) return item.kod_stavu.toUpperCase();
      if (item.kod) return item.kod.toUpperCase();
      return String(item).toUpperCase();
    });
  }
  
  return [];
}
```

### `normalizeFinancovaniFromBackend(data)`
```javascript
/**
 * Normalizuje financování z BE do FE formátu (flat struktura)
 * @param {any} data - Raw financovani objekt z backendu
 * @returns {object} - Flat objekt pro formData
 */
function normalizeFinancovaniFromBackend(data) {
  if (!data) return {};
  
  // JSON string → parsovat
  const financing = typeof data === 'string' ? JSON.parse(data) : data;
  
  return {
    zpusob_financovani: financing.typ || financing.kod_stavu || '',
    lp_kod: financing.lp_kody || financing.lp_kod || [],
    cislo_smlouvy: financing.cislo_smlouvy || '',
    smlouva_poznamka: financing.smlouva_poznamka || '',
    individualni_schvaleni: financing.individualni_schvaleni || 0,
    individualni_poznamka: financing.individualni_poznamka || '',
    pojistna_udalost_cislo: financing.pojistna_udalost_cislo || '',
    pojistna_udalost_poznamka: financing.pojistna_udalost_poznamka || ''
  };
}
```

### `normalizeFinancovaniForBackend(formData)`
```javascript
/**
 * Normalizuje financování z FE do BE formátu (vnořená struktura)
 * @param {object} formData - Frontend form data
 * @returns {object} - Objekt pro backend API
 */
function normalizeFinancovaniForBackend(formData) {
  if (!formData.zpusob_financovani) return null;
  
  const result = {
    typ: formData.zpusob_financovani
  };
  
  // Dynamická pole podle typu
  if (formData.lp_kod && formData.lp_kod.length > 0) {
    result.lp_kody = formData.lp_kod;
  }
  if (formData.cislo_smlouvy) {
    result.cislo_smlouvy = formData.cislo_smlouvy;
  }
  if (formData.smlouva_poznamka) {
    result.smlouva_poznamka = formData.smlouva_poznamka;
  }
  if (formData.individualni_schvaleni) {
    result.individualni_schvaleni = formData.individualni_schvaleni;
  }
  if (formData.individualni_poznamka) {
    result.individualni_poznamka = formData.individualni_poznamka;
  }
  if (formData.pojistna_udalost_cislo) {
    result.pojistna_udalost_cislo = formData.pojistna_udalost_cislo;
  }
  if (formData.pojistna_udalost_poznamka) {
    result.pojistna_udalost_poznamka = formData.pojistna_udalost_poznamka;
  }
  
  return result;
}
```

---

## 📝 POZNÁMKY PRO BACKEND TÝM

### Co MUSÍ backend vracet:
1. **strediska_kod**: `["KLADNO", "BENESOV"]` (array stringů, UPPERCASE)
2. **financovani**: `{typ: "LP", lp_kody: [...]}` (objekt s typ + dynamická pole)
3. **faktury[].fa_strediska_kod**: `["KLADNO"]` (array stringů, UPPERCASE)

### Co MUSÍ backend přijmout:
1. **strediska_kod**: `["KLADNO", "BENESOV"]` (array stringů)
2. **financovani**: `{typ: "LP", lp_kody: [...]}` (objekt)

### ⚠️ Backend NESMÍ:
- Vracet JSON stringy `'["KLADNO"]'`
- Vracet objekty `[{kod_stavu: "KLADNO", nazev_stavu: "..."}]`
- Měnit formát mezi INSERT a UPDATE
- Měnit formát mezi GET /orders/:id a GET /orders (seznam)

---

## ✅ TESTING CHECKLIST

- [ ] INSERT order → DB vrací `strediska_kod` jako array stringů
- [ ] UPDATE order → DB vrací `strediska_kod` jako array stringů (beze změny)
- [ ] GET order detail → DB vrací `strediska_kod` jako array stringů
- [ ] GET orders list → DB vrací `strediska_kod` jako array stringů
- [ ] INSERT order s financováním → DB vrací `financovani` jako objekt
- [ ] UPDATE order s financováním → DB vrací `financovani` jako objekt (beze změny)
- [ ] Faktury INSERT/UPDATE → `fa_strediska_kod` jako array stringů
- [ ] Faktury GET → `fa_strediska_kod` jako array stringů

---

**Poslední aktualizace:** 1.11.2025  
**Status:** 🚧 Implementace probíhá
