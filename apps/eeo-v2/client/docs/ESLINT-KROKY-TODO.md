# 🎯 ESLint Opravy - Akční Plán

**Datum:** 14. listopadu 2025  
**Stav projektu:** 793 varování  
**Čeká na potvrzení:**  ⏳

---

## 📋 Kroky k Provedení

### ✅ KROK 1: Automatické Opravy (5 minut)
```bash
./fix_eslint_auto.sh
```
**Co to udělá:**
- Vytvoří zálohu do `_BCK_/`
- Spustí `eslint --fix` pro automatické opravy
- Nahradí `==` za `===`
- Odstraní trailing spaces
- Zkontroluje build

**Odstraní:** ~30-50 varování  
**Riziko:** ⭐ Minimální (vytváří zálohu)

---

### 🚨 KROK 2: Oprava Kritických Duplicitních Klíčů (15 minut)
```bash
./fix_critical_dupe_keys.sh
```
**Manuální oprava 4 míst:**

#### 1. `src/pages/CashBookPage.js` - řádek ~1336
```javascript
// Najít a opravit duplicitní klíč 'state'
```

#### 2. `src/hooks/useFloatingPanels.js` - řádek ~1936
```javascript
// Najít a opravit duplicitní klíč 'serverSyncStatus'
```

#### 3. `src/pages/Orders25List.js` - řádek ~7021
```javascript
// Najít a opravit duplicitní klíč 'size'
```

#### 4. `src/pages/Orders25List.js` - řádek ~7023
```javascript
// Najít a opravit duplicitní klíč 'maxSize'
```

**Odstraní:** 4 KRITICKÁ varování  
**Riziko:** ⭐⭐⭐ Střední - může ovlivnit chování (nutná kontrola!)

---

### 🧹 KROK 3: Odstranění Nepoužívaných Importů (30 minut)
**Top soubory k úpravě:**
1. `src/pages/Orders25List.js` - ~50 nepoužívaných importů
2. `src/pages/CashBookPage.js` - ~20 nepoužívaných importů
3. `src/App.js` - ~15 nepoužívaných importů
4. `src/pages/Users.js` - ~10 nepoužívaných importů
5. `src/hooks/useFloatingPanels.js` - ~10 nepoužívaných importů

**Postup:**
- Otevřít soubor v VS Code
- Najít červeně podtržené nepoužívané importy
- Odstranit je nebo použít `Ctrl+Shift+O` (Organize Imports)

**Odstraní:** ~200 varování  
**Riziko:** ⭐ Minimální

---

### ⚛️ KROK 4: React Hooks Dependencies (VOLITELNÉ, 2+ hodiny)
**Status:** Můžeme přeskočit - není kritické

202 varování typu `react-hooks/exhaustive-deps`

**Strategie:**
- Ignorovat pokud aplikace funguje správně
- Nebo postupně opravovat při práci na jednotlivých komponentách
- Přidat `// eslint-disable-next-line` komentáře kde je to záměrné

**Odstraní:** 0-202 varování (dle rozsahu oprav)  
**Riziko:** ⭐⭐ Nízké - ale časově náročné

---

## 📊 Očekávané Výsledky

| Fáze | Varování před | Varování po | Čas | Riziko |
|------|---------------|-------------|-----|--------|
| **Začátek** | 793 | - | - | - |
| **Po Kroku 1** | 793 | ~740 | 5 min | ⭐ |
| **Po Kroku 2** | ~740 | ~736 | 15 min | ⭐⭐⭐ |
| **Po Kroku 3** | ~736 | ~530 | 30 min | ⭐ |
| **Po Kroku 4** | ~530 | <100 | 2+ hod | ⭐⭐ |

---

## ⚠️ Důležité Upozornění

### Před každým krokem:
1. ✅ Ujisti se, že máš aktuální zálohu
2. ✅ Zkontroluj, že aplikace funguje
3. ✅ Commitni změny po každém kroku

### Po každém kroku:
1. ✅ Spusť `npm run build` - zkontroluj chyby
2. ✅ Otestuj aplikaci v prohlížeči
3. ✅ Commitni funkční verzi: `git add -A && git commit -m "..."`

---

## 🎯 Doporučený Minimální Plán

Pokud chceš rychlé zlepšení s minimálním rizikem:

### ✅ Provést:
- ✅ **Krok 1** - Automatické opravy (bezpečné)
- ✅ **Krok 2** - Kritické duplicitní klíče (NUTNÉ!)

### ⏭️ Přeskočit (prozatím):
- ⏭️ **Krok 3** - Nepoužívané importy (není kritické)
- ⏭️ **Krok 4** - React hooks (není kritické)

**Celkový čas:** ~20 minut  
**Výsledek:** Odstranění kritických problémů + ~50 dalších varování  
**Nový počet varování:** ~740 (z původních 793)

---

## 🚀 Spuštění Po Potvrzení

Po tvém potvrzení provedu:

```bash
# 1. Automatické opravy
./fix_eslint_auto.sh

# 2. Kontrola buildu
npm run build | tee eslint-after-auto-fix.log

# 3. Git commit
git add -A
git commit -m "RH DOMA 14-11-2025: ESLint auto-fix - odstraneny escape sekvence, eqeqeq, formatovani"

# 4. Průvodce kritickými opravami
./fix_critical_dupe_keys.sh
```

---

## ❓ Co Potvrdit?

**Varianty:**

### A) **Minimální** (doporučuji) - 20 minut
- Krok 1: Automatické opravy ✅
- Krok 2: Kritické duplicitní klíče ✅

### B) **Střední** - 50 minut
- Krok 1: Automatické opravy ✅
- Krok 2: Kritické duplicitní klíče ✅
- Krok 3: Odstranění importů (top 5 souborů) ✅

### C) **Kompletní** - 3+ hodiny
- Všechny kroky včetně React hooks ✅

---

## 📝 Odpověz:

**Napiš:**
- `A` - Minimální (doporučuji)
- `B` - Střední
- `C` - Kompletní
- `STOP` - Neprovádět nic

---

**Čeká na tvoje potvrzení...** ⏳
