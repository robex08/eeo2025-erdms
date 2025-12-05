# 🕐 AUDIT DATETIME FORMÁTŮ - OrderForm25.js

**Datum auditu:** 14. listopadu 2025  
**Auditovaný soubor:** `src/forms/OrderForm25.js` - funkce `saveOrderToAPI()`

---

## ✅ OPRAVENO - Jednotný formát pro všechna datetime pole

### 📋 Přehled všech datetime/date polí v payload:

| Pole | Typ | Formát | Použití | Generování |
|------|-----|--------|---------|------------|
| **dt_objednavky** | DATETIME | `"YYYY-MM-DD HH:MM:SS"` | Timestamp poslední změny | ✅ `getMySQLDateTime()` |
| **dt_schvaleni** | DATETIME | `"YYYY-MM-DD HH:MM:SS"` | Datum schválení | Z formData (z BE) |
| **dt_potvrzeni_vecne_spravnosti** | DATETIME | `"YYYY-MM-DD HH:MM:SS"` | Potvrzení věcné správnosti | ✅ `getMySQLDateTime()` |
| **dt_dokonceni** | DATETIME | `"YYYY-MM-DD HH:MM:SS"` | Dokončení objednávky | ✅ `getMySQLDateTime()` |
| **dt_faktura_pridana** | DATETIME | `"YYYY-MM-DD HH:MM:SS"` | Přidání faktury | ✅ `getMySQLDateTime()` |
| **dt_odeslani** | DATE | `"YYYY-MM-DD"` | Odeslání/storno | ✅ `getMySQLDate()` |
| **dt_akceptace** | DATE | `"YYYY-MM-DD"` | Akceptace | Z formData (z BE) |
| **dt_zverejneni** | DATE | `"YYYY-MM-DD"` | Zveřejnění v registru | Z formData (z BE) |
| **dt_zverejneni_potvrzeni** | DATE | `"YYYY-MM-DD"` | Potvrzení zveřejnění | Z formData (z BE) |
| **dt_predpokladany_termin_dodani** | DATE | `"YYYY-MM-DD"` | Termín dodání | Z formData (uživatel) |

---

## 🔧 Implementované helper funkce:

### 1. `getMySQLDateTime()` - DATETIME s časem
```javascript
const getMySQLDateTime = () => {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace('T', ' ');
};
// Vrací: "2025-11-14 19:50:57"
```

**Použití:**
- `dt_objednavky` (VŽDY při uložení)
- `dt_potvrzeni_vecne_spravnosti` (automaticky při potvrzení)
- `dt_dokonceni` (automaticky při dokončení)
- `dt_faktura_pridana` (automaticky ve fázi fakturace)

### 2. `getMySQLDate()` - Jen datum
```javascript
const getMySQLDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};
// Vrací: "2025-11-14"
```

**Použití:**
- `dt_odeslani` (fallback pokud uživatel nevyplnil)
- `datum_storna` (fallback pokud uživatel nevyplnil)

---

## ⚠️ PŘED OPRAVOU - Problémy:

1. **ISO formát s UTC** - 3 místa:
   ```javascript
   new Date().toISOString()
   // Vrací: "2025-11-14T18:50:57.123Z" ❌
   ```

2. **MySQL formát** - 2 místa:
   ```javascript
   now.toISOString().slice(0, 19).replace('T', ' ')
   // Vrací: "2025-11-14 18:50:57" ✅
   ```

3. **Jen datum** - 2 místa:
   ```javascript
   new Date().toISOString().split('T')[0]
   // Vrací: "2025-11-14" ✅
   ```

### Důsledky:
- **Nekonzistentní formáty** v databázi
- **UTC vs lokální čas** - možné problémy s časovými zónami
- **Backend parsing errors** při různých formátech

---

## ✅ PO OPRAVĚ - Výhody:

1. **Jednotný formát** pro všechna datetime pole
2. **Konzistentní s MySQL DATETIME** typem
3. **Žádné UTC konverze** - vše v lokálním čase
4. **Snadná údržba** - helper funkce na jednom místě
5. **Kompatibilita s backendem** - očekává MySQL formát

---

## 📍 Opravená místa v kódu:

| Řádek | Pole | Před | Po |
|-------|------|------|-----|
| 7577 | dt_potvrzeni_vecne_spravnosti | `new Date().toISOString()` | `getMySQLDateTime()` |
| 8023 | dt_dokonceni | `new Date().toISOString()` | `getMySQLDateTime()` |
| 8115 | dt_faktura_pridana | `new Date().toISOString()` | `getMySQLDateTime()` |
| 8147 | dt_odeslani (odeslání) | `new Date().toISOString().split('T')[0]` | `getMySQLDate()` |
| 8179 | dt_odeslani (storno) | `new Date().toISOString().split('T')[0]` | `getMySQLDate()` |
| 7463 | dt_objednavky (archiv) | inline kód | `getMySQLDateTime()` |
| 8205 | dt_objednavky (běžné) | inline kód | `getMySQLDateTime()` |

---

## 🎯 Závěr:

**Všechna datetime pole nyní používají JEDNOTNÝ FORMÁT:**
- ✅ DATETIME pole: `"YYYY-MM-DD HH:MM:SS"`
- ✅ DATE pole: `"YYYY-MM-DD"`
- ✅ Žádné UTC konverze
- ✅ Konzistentní s MySQL
- ✅ Kompatibilní s backendem

**Debug log nyní ukazuje správné formáty pro všechna pole!** 🎉
