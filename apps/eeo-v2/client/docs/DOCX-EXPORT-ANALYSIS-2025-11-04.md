# Analýza funkce "Generovat DOCX" v Orders25List
**Datum:** 4. listopadu 2025  
**Soubor:** `src/pages/Orders25List.js`  
**Funkce:** `canExportDocument` (řádek 6667)

---

## 📋 Aktuální stav

### Funkce `canExportDocument(order)`

**Umístění:** Řádek 6667-6720  
**Účel:** Rozhoduje, zda je tlačítko "Generovat DOCX" **povoleno** nebo **zakázáno (disabled)**

---

## 🔍 Analýza podmínek

### Krok 1: Získání aktuálního stavu objednávky

Funkce získává stav v tomto pořadí (priorita):

1. **`stav_workflow_kod`** (pole stavů - bere poslední)
   - JSON pole stavů workflow
   - Bere se **POSLEDNÍ stav** z pole
   - Formát: `[{kod_stavu: 'XXX', nazev_stavu: 'YYY'}, ...]`

2. **Fallback na jiná pole:**
   - `stav_id_num`
   - `stav_id`
   - `stav`
   - `nazev_stavu`

### Krok 2: Normalizace stavu

```javascript
const stav = normalizeStav(aktualniStav);
const stavCode = stav?.code;
```

Převede různé formáty stavů na **standardizovaný kód** (např. "POTVRZENA", "DOKONCENA").

### Krok 3: Kontrola povoleních

#### ✅ POVOLENÉ stavy (allowedStates):
```javascript
const allowedStates = ['POTVRZENA', 'DOKONCENA', 'ODESLANA', 'CEKA_SE'];
```

| Kód stavu | Popis | Povoleno |
|-----------|-------|----------|
| `POTVRZENA` | Potvrzená dodavatelem | ✅ ANO |
| `DOKONCENA` | Dokončená objednávka | ✅ ANO |
| `ODESLANA` | Odeslaná dodavateli | ✅ ANO |
| `CEKA_SE` | Čeká se | ✅ ANO |

#### ✅ DODATEČNÁ kritéria (textová kontrola):
```javascript
const stavText = nazevStavu.toLowerCase();
const isRozpracovana = stavText.includes('rozpracovan');
const isDodavatel = stavText.includes('dodavatel');
```

| Kritérium | Popis | Povoleno |
|-----------|-------|----------|
| Text obsahuje "rozpracovan" | Rozpracovaná objednávka | ✅ ANO |
| Text obsahuje "dodavatel" | Cokoliv s dodavatelem | ✅ ANO |

#### ❌ ZAKÁZANÉ stavy:

| Kód stavu | Popis | Důvod |
|-----------|-------|-------|
| `NOVA` | Nová objednávka | ❌ Není dokončená |
| `ODESLANA_KE_SCHVALENI` | Ke schválení | ❌ Není schválená |
| `SCHVALENA` | **SCHVÁLENÁ** | ❌ **EXPLICITNĚ ODSTRANĚNO** |
| `ZAMITNUTA` | Zamítnutá | ❌ Není platná |
| `ZRUSENA` | Zrušená | ❌ Není aktivní |
| `ARCHIVOVANO` | Archivovaná | ❌ Import |

---

## 🤔 Proč je tlačítko vždy disabled?

### Možné příčiny:

#### 1. ❌ **Stav objednávky není v povolených**
Pokud jsou všechny vaše objednávky ve stavu:
- `NOVA`
- `ODESLANA_KE_SCHVALENI`
- `SCHVALENA` ← **TOTO JE PRAVDĚPODOBNĚ PROBLÉM!**
- `ZAMITNUTA`

→ Tlačítko bude **disabled**.

#### 2. ❌ **Chybná data stavu**
Pokud:
- `stav_workflow_kod` je prázdné nebo nevalidní JSON
- Fallback pole (`stav_id_num`, `stav_id`) jsou prázdná
- Stav se nepodaří normalizovat

→ `aktualniStav` bude `null` → Tlačítko bude **disabled**.

#### 3. ❌ **Normalizace selhává**
Pokud funkce `normalizeStav()` nepozná formát stavu:
- Vrátí `null` nebo neplatný `code`
- Stav se nepovede zmapovat na standardní kódy

→ Tlačítko bude **disabled**.

---

## 🔧 Doporučené řešení

### Varianta A: Povolit stav "SCHVALENA"

Pokud chcete generovat DOCX už pro **schválené** objednávky:

```javascript
const allowedStates = ['SCHVALENA', 'POTVRZENA', 'DOKONCENA', 'ODESLANA', 'CEKA_SE'];
```

**Změna:** Přidat `'SCHVALENA'` do pole `allowedStates`.

**Dopad:** Tlačítko bude aktivní ihned po schválení objednávky.

### Varianta B: Povolit další stavy podle potřeby

```javascript
const allowedStates = [
  'SCHVALENA',      // ← Přidat
  'ROZPRACOVANA',   // ← Přidat
  'POTVRZENA', 
  'DOKONCENA', 
  'ODESLANA', 
  'CEKA_SE'
];
```

### Varianta C: Debug - Zjistit skutečný stav objednávky

Přidat debug log do funkce `canExportDocument`:

```javascript
const canExportDocument = (order) => {
  // ... existující kód ...
  
  console.log('🔍 [DOCX Export Debug]', {
    orderId: order.id || order.objednavka_id,
    cislo: order.cislo_objednavky,
    aktualniStav,
    nazevStavu,
    stavCode,
    allowedStates,
    canGenerate
  });
  
  return canGenerate;
};
```

Pak v konzoli uvidíte, proč je tlačítko disabled pro konkrétní objednávku.

---

## 📊 Statistiky stavů v databázi

Pro lepší rozhodnutí doporučuji zjistit:

1. **Kolik objednávek je ve stavu "SCHVALENA"?**
2. **Jsou objednávky ve stavu "POTVRZENA", "DOKONCENA", "ODESLANA"?**
3. **Jaké stavy se skutečně používají?**

### SQL dotaz pro analýzu:
```sql
SELECT 
  stav_workflow_kod,
  COUNT(*) as pocet
FROM objednavky25
WHERE stav_workflow_kod IS NOT NULL
GROUP BY stav_workflow_kod
ORDER BY pocet DESC;
```

---

## 🎯 Závěr

**Pravděpodobně hlavní problém:** Stav `SCHVALENA` byl **explicitně odstraněn** z povolených stavů.

**Řešení:**
1. Přidat `'SCHVALENA'` do `allowedStates` pole
2. Případně přidat i `'ROZPRACOVANA'` pokud je potřeba

**Doporučení:** Přidat debug log pro zjištění skutečných stavů objednávek.

---

**Chcete, abych přidal `SCHVALENA` do povolených stavů?**

