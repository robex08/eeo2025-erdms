# 🚀 OrderForm25 - SPRINT 1: Cleanup (START HERE)

**Datum:** 10. prosince 2025  
**Odhadovaný čas:** 2-3 hodiny  
**Riziko:** 🟢 NÍZKÉ

---

## 📊 Výsledky auditu

```
ZÁKLADNÍ METRIKY:
✅ Řádky: 26 589
✅ useState: 139
✅ useEffect: 114

ZAKOMENTOVANÝ KÓD:
⚠️  useState zakomentované: 6
⚠️  DEPRECATED značky: 32

API VOLÁNÍ:
✅ getOrderV2: 5 použití
✅ createOrderV2: 2 použití  
✅ updateOrderV2: 4 použití
✅ getStrediska25: 0 použití (není voláno, jen importováno!)

MANAGERS:
✅ draftManager: 81 použití (DOBRÉ!)
⚠️  formDataManager: 1 použití (MÁLO!)
❌ localStorage přímé: 28 použití (MEL BY BÝT 0!)
```

---

## ✅ SPRINT 1 CHECKLIST

### Fáze A: Odstranit zakomentovaný kód (30 min)

#### A1. Zakomentované useState (6 řádků)

**Lokace v kódu:**
```bash
# Najít všechny zakomentované useState
grep -n "//.*const \[.*useState" /var/www/erdms-dev/apps/eeo-v2/client/src/forms/OrderForm25.js
```

**Řádky k odstranění:**
- [ ] Řádek ~4928: `// const [showUnlockVecnaSpravnostConfirm, setShowUnlockVecnaSpravnostConfirm]`
- [ ] Řádek ~5877-5881: Zakomentované unlock states
- [ ] Další podle výstupu příkazu výše

**Akce:**
```bash
# Otevřít soubor a smazat tyto řádky
code /var/www/erdms-dev/apps/eeo-v2/client/src/forms/OrderForm25.js
```

#### A2. DEPRECATED značky a komentáře (32 výskytů)

**Typy k odstranění:**

1. **Deprecated import komentáře:**
```javascript
// Řádek 21-22:
// ❌ DEPRECATED: order25DraftStorageService - použij draftManager místo toho
// import order25DraftStorageService from '../services/order25DraftStorageService';

// Řádek 33-34:
  // ❌ DEPRECATED: getOrder25, getNextOrderNumber25, createPartialOrder25...
  
// Řádek 47:
  // ❌ DEPRECATED: api25orders - přímé volání...
```

**Akce:** SMAZAT všechny tyto komentáře - import už není, tak komentář není potřeba!

2. **Deprecated funkce v importu:**
```javascript
// Řádek ~33-47 v importu z api25orders
import {
  getStrediska25,
  getFinancovaniZdroj25,
  getDruhyObjednavky25,
  // ❌ DEPRECATED: getOrder25... ← SMAZAT tento komentář
  setDebugLogger,
  // ... další
} from '../services/api25orders';
```

**Akce:** Smazat deprecated komentáře, ponechat pouze aktivní importy

#### A3. Zakomentované bloky useEffect

**Najít:**
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client/src/forms
grep -B 2 -A 5 "^[[:space:]]*//[[:space:]]*useEffect" OrderForm25.js | head -20
```

**Akce:** Pokud je celý useEffect zakomentovaný, smazat včetně komentářů

---

### Fáze B: Odstranit nepoužívané importy (15 min)

#### B1. Kontrola api25orders importů

**Zkontrolovat každou importovanou funkci:**

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client/src/forms

# Zkontrolovat použití getStrediska25
echo "=== getStrediska25 ==="
grep -n 'getStrediska25(' OrderForm25.js | grep -v '//'

# Zkontrolovat getFinancovaniZdroj25
echo "=== getFinancovaniZdroj25 ==="
grep -n 'getFinancovaniZdroj25(' OrderForm25.js | grep -v '//'

# Zkontrolovat getDruhyObjednavky25
echo "=== getDruhyObjednavky25 ==="
grep -n 'getDruhyObjednavky25(' OrderForm25.js | grep -v '//'
```

**Výsledky:**
- `getStrediska25`: 0 použití → ❌ **ODSTRANIT Z IMPORTU**
- Ostatní funkce: kontrolovat obdobně

**Bezpečné odstranění:**

```javascript
// PŘED (řádek ~29-48):
import {
  getStrediska25,           // ❌ ODSTRANIT pokud 0 použití
  getFinancovaniZdroj25,    // ❌ ZKONTROLOVAT
  getDruhyObjednavky25,     // ❌ ZKONTROLOVAT
  setDebugLogger,           // ✅ PONECHAT pokud se používá
  updateAttachment25,
  // ... zbytek
} from '../services/api25orders';

// PO:
import {
  // Pouze to co se skutečně používá
  setDebugLogger,
  updateAttachment25,
  createDownloadLink25,
  // ...
} from '../services/api25orders';
```

#### B2. Kontrola dalších importů

**Font Awesome icons - používají se všechny?**

```bash
# Najít použití konkrétní ikony
grep -o 'fa[A-Z][a-zA-Z]*' OrderForm25.js | sort | uniq -c | sort -rn
```

**Akce:** Pravděpodobně PONECHAT všechny - manuální kontrola by trvala příliš dlouho

---

### Fáze C: Cleanup zbytečných komentářů (20 min)

#### C1. Odstranit "removed" komentáře

**Najít:**
```bash
grep -n "❌ REMOVED:\|🗑️ REMOVED:" OrderForm25.js
```

Příklad:
```javascript
// Řádek 4153:
// ❌ REMOVED: Debug useEffect pro tracking re-renders

// Řádek ~70:
// ❌ REMOVED: getLPOptionsForItems - lp_options se načítají přímo z enriched objednávky
```

**Akce:** SMAZAT - pokud je něco odstraněno, nepotřebujeme o tom komentář

#### C2. Cleanup TODO/FIXME komentářů

**Najít:**
```bash
grep -n "TODO\|FIXME\|XXX\|HACK" OrderForm25.js | head -20
```

**Akce:**
- Pokud je TODO již hotovo → SMAZAT
- Pokud je relevantní → PONECHAT nebo přesunout do GitHub Issues

---

### Fáze D: Git commit (5 min)

```bash
cd /var/www/erdms-dev

# Vytvořit feature branch
git checkout -b feature/orderform25-sprint1-cleanup

# Zkontrolovat změny
git diff apps/eeo-v2/client/src/forms/OrderForm25.js

# Stage změny
git add apps/eeo-v2/client/src/forms/OrderForm25.js

# Commit s popisem
git commit -m "refactor(OrderForm25): Sprint 1 - cleanup commented code and deprecated imports

Changes:
- Remove 6 commented useState declarations
- Remove 32 DEPRECATED comment blocks
- Remove unused imports from api25orders
- Remove 'REMOVED' comment markers
- Clean up obsolete TODO comments

Impact:
- Reduced file size by ~300-500 lines
- Improved code readability
- No functional changes

Risk: LOW (only comments and unused code removed)"

# Push
git push origin feature/orderform25-sprint1-cleanup
```

---

## 🧪 Testing After Cleanup

### 1. Spustit aplikaci

```bash
cd /var/www/erdms-dev
npm run dev
```

### 2. Otevřít formulář

```
http://localhost:3000/objednavky/nova
```

### 3. Checklist

- [ ] Formulář se načte bez chyb
- [ ] Console je čistá (žádné errors)
- [ ] Lze vyplnit pole
- [ ] Lze uložit draft
- [ ] Lze přidat přílohu
- [ ] Workflow tlačítka fungují

### 4. Pokud NĚCO nefunguje

```bash
# Zkontrolovat console errors
# Pokud je problém, můžeme vrátit změny:
git checkout main apps/eeo-v2/client/src/forms/OrderForm25.js
```

---

## 📈 Očekávané výsledky Sprint 1

### PŘED:
```
Řádky: 26 589
useState: 139
useEffect: 114
DEPRECATED komentáře: 32
Zakomentovaný kód: 6+ useState
Unused imports: 3+
```

### PO:
```
Řádky: ~26 100 (-400 až -500)
useState: 133 (-6 commented)
useEffect: 114 (bez změny)
DEPRECATED komentáře: 0 (-32) ✅
Zakomentovaný kód: 0 ✅
Unused imports: 0 ✅
```

### Impact:
- 🟢 **Čitelnější kód** - Méně noise, snadnější navigace
- 🟢 **Menší bundle size** - Byť minimálně, každý byte se počítá
- 🟢 **Příprava na další sprinty** - Clean slate pro větší refactoring

---

## 🎯 Next Steps (Sprint 2)

Po úspěšném dokončení Sprint 1:

1. **API Unifikace** - Zkontrolovat všechna zbývající api25 volání
2. **localStorage → draftManager** - 28 přímých volání přesunout
3. **useState konsolidace** - Loading states do jednoho objektu

---

## 📝 Notes

- Všechny změny jsou **non-breaking**
- Žádný funkční kód není dotčen
- Pouze cleanup nepoužívaného/zakomentovaného kódu
- Můžeme kdykoliv vrátit změny přes Git

---

**⏱️ Čas:** 2-3 hodiny  
**🎯 Cíl:** Čistý, připravený kód pro další optimalizace  
**✅ Status:** Ready to start!

---

## 🚀 QUICK START Commands

```bash
# 1. Audit aktuálního stavu
cd /var/www/erdms-dev/apps/eeo-v2/client/src/forms
grep -n "DEPRECATED" OrderForm25.js | wc -l
grep -n "//.*const \[.*useState" OrderForm25.js

# 2. Vytvořit branch
cd /var/www/erdms-dev
git checkout -b feature/orderform25-sprint1-cleanup

# 3. Otevřít editor
code apps/eeo-v2/client/src/forms/OrderForm25.js

# 4. Po dokončení úprav
git diff
git add .
git commit -m "refactor(OrderForm25): Sprint 1 cleanup"
git push origin feature/orderform25-sprint1-cleanup

# 5. Test
npm run dev
# Otevřít http://localhost:3000/objednavky/nova
```
