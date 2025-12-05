# 🔍 DEBUG FINANCOVÁNÍ - RAW FORMÁT

## 📋 Přehled
Debug výpisy pro sledování transformace dat financování mezi Frontend ↔ Backend

---

## 📥 NAČÍTÁNÍ Z DATABÁZE (Backend → Frontend)

### 1️⃣ RAW data z backendu
```javascript
// Console výpis:
═══════════════════════════════════════════════════════════
🔍 [NAČÍTÁNÍ Z DB] RAW financování objekt z backendu:
{
  "typ": "LP",
  "kod_stavu": "LP",
  "nazev": "Limitovaný příslib",
  "nazev_stavu": "Limitovaný příslib",
  "lp_kody": [3, 5],
  "doplnujici_data": {
    "lp_kod": [3, 5]
  }
}
═══════════════════════════════════════════════════════════
```

### 2️⃣ Normalizace v dataTransformHelpers.js
```javascript
// Console výpis z normalizeFinancovaniFromBackend:
🔧 [normalizeFinancovaniFromBackend] VSTUP (RAW):
   typeof: object
   value: {
  "typ": "LP",
  "kod_stavu": "LP",
  "nazev": "Limitovaný příslib",
  "nazev_stavu": "Limitovaný příslib",
  "lp_kody": [3, 5],
  "doplnujici_data": {
    "lp_kod": [3, 5]
  }
}

🔧 [normalizeFinancovaniFromBackend] Detekovaný STARÝ FORMÁT s doplnujici_data

🔧 [normalizeFinancovaniFromBackend] VÝSTUP (normalizované):
{
  "zpusob_financovani": "LP",
  "lp_kod": [3, 5]
}
```

### 3️⃣ Výsledek pro formData
```javascript
// Console výpis:
🔍 [NAČÍTÁNÍ Z DB] Normalizované financování pro formData:
{
  "zpusob_financovani": "LP",
  "lp_kod": [3, 5]
}
═══════════════════════════════════════════════════════════
```

### 4️⃣ Individuální pole z root objektu
```javascript
// Console výpis:
🔍 [NAČÍTÁNÍ Z DB] RAW individuální pole z root objektu:
{
  "individualni_schvaleni": "123/2025",
  "individualni_poznamka": "Poznámka k individuálnímu",
  "pojistna_udalost_cislo": "PU-456",
  "pojistna_udalost_poznamka": "Poznámka k pojistné události",
  "cislo_smlouvy": "SM-789",
  "smlouva_poznamka": "Poznámka ke smlouvě"
}
```

---

## 📤 UKLÁDÁNÍ DO DATABÁZE (Frontend → Backend)

### 1️⃣ Individuální pole PŘED zpracováním
```javascript
// Console výpis:
═══════════════════════════════════════════════════════════
🔍 [UKLÁDÁNÍ DO DB] RAW formData - individuální pole PŘED zpracováním:
{
  "zpusob_financovani": "LP",
  "individualni_schvaleni": "123/2025",
  "individualni_poznamka": "Poznámka k individuálnímu",
  "pojistna_udalost_cislo": "PU-456",
  "pojistna_udalost_poznamka": "Poznámka k pojistné události",
  "cislo_smlouvy": "SM-789",
  "smlouva_poznamka": "Poznámka ke smlouvě",
  "lp_kod": [3, 5]
}
```

### 2️⃣ Individuální pole PO zpracování (do root objektu)
```javascript
// Console výpis:
🔍 [UKLÁDÁNÍ DO DB] RAW orderData - individuální pole PO zpracování (do root objektu):
{
  "individualni_schvaleni": "123/2025",
  "individualni_poznamka": "Poznámka k individuálnímu",
  "pojistna_udalost_cislo": "PU-456",
  "pojistna_udalost_poznamka": "Poznámka k pojistné události",
  "cislo_smlouvy": "SM-789",
  "smlouva_poznamka": "Poznámka ke smlouvě"
}
═══════════════════════════════════════════════════════════
```

### 3️⃣ Vstupní formData pro financování
```javascript
// Console výpis:
═══════════════════════════════════════════════════════════
🔍 [UKLÁDÁNÍ DO DB] Vstupní formData pro financování:
{
  "zpusob_financovani": "LP",
  "lp_kod": [3, 5],
  "cislo_smlouvy": "SM-789",
  "smlouva_poznamka": "Poznámka ke smlouvě",
  "individualni_schvaleni": "123/2025",
  "individualni_poznamka": "Poznámka k individuálnímu",
  "pojistna_udalost_cislo": "PU-456",
  "pojistna_udalost_poznamka": "Poznámka k pojistné události"
}
```

### 4️⃣ Normalizace v dataTransformHelpers.js
```javascript
// Console výpis z normalizeFinancovaniForBackend:
🔧 [normalizeFinancovaniForBackend] VSTUP (formData):
{
  "zpusob_financovani": "LP",
  "lp_kod": [3, 5],
  "cislo_smlouvy": "SM-789",
  "smlouva_poznamka": "Poznámka ke smlouvě",
  "individualni_schvaleni": "123/2025",
  "individualni_poznamka": "Poznámka k individuálnímu",
  "pojistna_udalost_cislo": "PU-456",
  "pojistna_udalost_poznamka": "Poznámka k pojistné události"
}

🔧 [normalizeFinancovaniForBackend] Přidána doplnujici_data (zpětná kompatibilita):
{
  "lp_kod": [3, 5]
}

🔧 [normalizeFinancovaniForBackend] VÝSTUP (pro backend API):
{
  "typ": "LP",
  "kod_stavu": "LP",
  "nazev": "Limitovaný příslib",
  "nazev_stavu": "Limitovaný příslib",
  "lp_kody": [3, 5],
  "doplnujici_data": {
    "lp_kod": [3, 5]
  }
}
```

### 5️⃣ RAW financování objekt pro API
```javascript
// Console výpis:
🔍 [UKLÁDÁNÍ DO DB] RAW financování objekt pro API:
{
  "typ": "LP",
  "kod_stavu": "LP",
  "nazev": "Limitovaný příslib",
  "nazev_stavu": "Limitovaný příslib",
  "lp_kody": [3, 5],
  "doplnujici_data": {
    "lp_kod": [3, 5]
  }
}
═══════════════════════════════════════════════════════════
```

### 6️⃣ FINÁLNÍ orderData před API voláním
```javascript
// Console výpis:
═══════════════════════════════════════════════════════════
🔍 [UKLÁDÁNÍ DO DB] *** FINÁLNÍ orderData před API voláním ***
═══════════════════════════════════════════════════════════
{
  "=== ROOT POLE ===": "---",
  "individualni_schvaleni": "123/2025",
  "individualni_poznamka": "Poznámka k individuálnímu",
  "pojistna_udalost_cislo": "PU-456",
  "pojistna_udalost_poznamka": "Poznámka k pojistné události",
  "cislo_smlouvy": "SM-789",
  "smlouva_poznamka": "Poznámka ke smlouvě",
  "=== FINANCOVANI OBJEKT ===": "---",
  "financovani": {
    "typ": "LP",
    "kod_stavu": "LP",
    "nazev": "Limitovaný příslib",
    "nazev_stavu": "Limitovaný příslib",
    "lp_kody": [3, 5],
    "doplnujici_data": {
      "lp_kod": [3, 5]
    }
  },
  "=== OSTATNI ===": "---",
  "strediska_kod": ["KLADNO", "BENESOV"],
  "zpusob_financovani_v_formData": "LP"
}
═══════════════════════════════════════════════════════════
```

---

## 📊 Příklady pro různé typy financování

### LP (Limitovaný příslib)
```javascript
// Backend → Frontend:
{
  "typ": "LP",
  "lp_kody": [3, 5]
}
// → formData: { zpusob_financovani: "LP", lp_kod: [3, 5] }

// Frontend → Backend:
formData: { zpusob_financovani: "LP", lp_kod: [3, 5] }
// → API: {
//   typ: "LP",
//   kod_stavu: "LP",
//   nazev: "Limitovaný příslib",
//   nazev_stavu: "Limitovaný příslib",
//   lp_kody: [3, 5]
// }
```

### SMLOUVA
```javascript
// Backend → Frontend:
{
  "typ": "SMLOUVA"
}
// → formData: { zpusob_financovani: "SMLOUVA" }
// → root objekt: { cislo_smlouvy: "SM-789", smlouva_poznamka: "..." }

// Frontend → Backend:
formData: { 
  zpusob_financovani: "SMLOUVA",
  cislo_smlouvy: "SM-789",
  smlouva_poznamka: "..."
}
// → API financovani: { typ: "SMLOUVA", kod_stavu: "SMLOUVA", ... }
// → API root: { cislo_smlouvy: "SM-789", smlouva_poznamka: "..." }
```

### INDIVIDUÁLNÍ
```javascript
// Backend → Frontend:
{
  "typ": "INDIVIDUÁLNÍ"
}
// → formData: { zpusob_financovani: "INDIVIDUÁLNÍ" }
// → root objekt: { individualni_schvaleni: "123/2025", individualni_poznamka: "..." }

// Frontend → Backend:
formData: { 
  zpusob_financovani: "INDIVIDUÁLNÍ",
  individualni_schvaleni: "123/2025",
  individualni_poznamka: "..."
}
// → API financovani: { typ: "INDIVIDUÁLNÍ", kod_stavu: "INDIVIDUÁLNÍ", ... }
// → API root: { individualni_schvaleni: "123/2025", individualni_poznamka: "..." }
```

### POJISTNÁ UDÁLOST
```javascript
// Backend → Frontend:
{
  "typ": "POJISTNÁ UDÁLOST"
}
// → formData: { zpusob_financovani: "POJISTNÁ UDÁLOST" }
// → root objekt: { pojistna_udalost_cislo: "PU-456", pojistna_udalost_poznamka: "..." }

// Frontend → Backend:
formData: { 
  zpusob_financovani: "POJISTNÁ UDÁLOST",
  pojistna_udalost_cislo: "PU-456",
  pojistna_udalost_poznamka: "..."
}
// → API financovani: { typ: "POJISTNÁ UDÁLOST", kod_stavu: "POJISTNÁ UDÁLOST", ... }
// → API root: { pojistna_udalost_cislo: "PU-456", pojistna_udalost_poznamka: "..." }
```

---

## 🎯 Klíčová pravidla

### ✅ CO JDE DO `financovani` OBJEKTU
- `typ` / `kod_stavu` - typ financování (LP, SMLOUVA, INDIVIDUÁLNÍ, ...)
- `nazev` / `nazev_stavu` - název typu financování
- `lp_kody` - POUZE pro typ LP (array čísel)
- `doplnujici_data` - zpětná kompatibilita (DEPRECATED)

### ✅ CO JDE DO ROOT OBJEKTU
- `cislo_smlouvy` - SMLOUVA
- `smlouva_poznamka` - SMLOUVA
- `individualni_schvaleni` - INDIVIDUÁLNÍ
- `individualni_poznamka` - INDIVIDUÁLNÍ
- `pojistna_udalost_cislo` - POJISTNÁ UDÁLOST
- `pojistna_udalost_poznamka` - POJISTNÁ UDÁLOST

### ❌ CO NIKDY NEJDE DO `financovani` OBJEKTU
- `cislo_smlouvy`, `smlouva_poznamka`
- `individualni_schvaleni`, `individualni_poznamka`
- `pojistna_udalost_cislo`, `pojistna_udalost_poznamka`

---

## 🔧 Debugging
Pro sledování transformací sleduj console v prohlížeči:
1. Otevři Developer Tools (F12)
2. Přejdi na záložku Console
3. Filtruj podle: `[NAČÍTÁNÍ Z DB]` nebo `[UKLÁDÁNÍ DO DB]`
4. Hledej oddělovače: `═══════════════════════`

## 📝 Soubory
- **OrderForm25.js** - hlavní komponenta s debug výpisy
- **dataTransformHelpers.js** - normalizační funkce s debug výpisy
- **DATA-FORMAT-CONTRACT.md** - specifikace formátů dat

---

**Datum vytvoření:** 26. 11. 2025  
**Autor:** GitHub Copilot  
**Verze:** 1.0
