# 🎯 ESLint Opravy - Rychlý Start

## 📋 Co bylo vytvořeno

### 1. **ESLINT-OPRAVY-PLAN.md** 
   - Kompletní analýza všech 793 varování
   - Strategie oprav podle priority
   - Detailní příklady pro každý typ problému

### 2. **Automatizační Skripty**

#### `fix_eslint_auto.sh` ⚡
**Automatické opravy bezpečných problémů**
```bash
./fix_eslint_auto.sh
```
- ✅ Vytvoří zálohu
- ✅ Spustí `eslint --fix`
- ✅ Opraví `==` na `===`
- ✅ Odstraní trailing spaces
- ✅ Zkontroluje build

#### `fix_critical_dupe_keys.sh` 🚨
**Průvodce opravou kritických duplicitních klíčů**
```bash
./fix_critical_dupe_keys.sh
```
- 🔴 4 kritické problémy s duplicitními klíči
- Otevře soubory v editoru
- Provede zálohu před úpravami

#### `fix_eslint_manual.sh` 🔍
**Interaktivní průvodce manuálními opravami**
```bash
./fix_eslint_manual.sh
```
- Analyzuje aktuální stav
- Kategorizuje problémy podle priority
- Nabízí konkrétní kroky pro opravu

#### `analyze_eslint_by_file.sh` 📊
**Detailní analýza po souborech**
```bash
./analyze_eslint_by_file.sh
```
- Vytvoří report s top problémy
- Identifikuje nejvíce postižené soubory

---

## 🚀 Doporučený Postup

### KROK 1: Automatické Opravy (5 minut)
```bash
# Spustit automatické opravy
./fix_eslint_auto.sh

# Zkontrolovat změny
git diff

# Otestovat build
npm run build
```

**Očekávaný výsledek:** Odstranění ~30-50 varování

---

### KROK 2: Kritické Problémy (15 minut)
```bash
# Opravit duplicitní klíče
./fix_critical_dupe_keys.sh
```

**Manuální opravy 4 kritických míst:**

#### 1. `src/pages/CashBookPage.js` (řádek ~1336)
```javascript
// NAJDĚTE:
const someObject = {
  state: value1,
  // ... další kód
  state: value2  // ❌ DUPLICITNÍ!
};

// OPRAVTE (zachovejte pouze jeden):
const someObject = {
  state: value2  // ✅ Pouze jeden klíč
  // ... další kód
};
```

#### 2. `src/hooks/useFloatingPanels.js` (řádek ~1936)
```javascript
// Hledejte duplicitní 'serverSyncStatus'
```

#### 3. `src/pages/Orders25List.js` (řádek ~7021-7023)
```javascript
// Hledejte duplicitní 'size' a 'maxSize'
```

**Po opravě:**
```bash
npm run build  # Zkontrolovat
git diff       # Prohlédnout změny
```

---

### KROK 3: Nepoužívané Importy (30 minut)
Použít VS Code:
1. Otevřít problémový soubor
2. `Ctrl+Shift+P` → "Organize Imports"
3. Nebo manuálně odstranit nepoužívané importy

**Top soubory s nepoužívanými importy:**
- `src/pages/Orders25List.js` (~50 nepoužívaných importů)
- `src/pages/CashBookPage.js` (~20 nepoužívaných importů)
- `src/App.js` (~15 nepoužívaných importů)

---

### KROK 4: React Hooks Dependencies (Volitelné, 2+ hodiny)
Toto je nejsložitější část - 202 varování

**Strategie:**
- ✅ Ignorovat neškodné (stabilní funkce)
- ✅ Přidat důležité dependencies
- ✅ Použít `useCallback` pro funkce

**Příklad:**
```javascript
// VAROVÁNÍ:
useEffect(() => {
  setUserStorage('key', value);
}, [value]); // Chybí setUserStorage

// ŘEŠENÍ 1: Přidat komentář (pokud je funkce stabilní)
useEffect(() => {
  setUserStorage('key', value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [value]); // setUserStorage je stabilní

// ŘEŠENÍ 2: Přidat do dependencies (pokud se může měnit)
useEffect(() => {
  setUserStorage('key', value);
}, [value, setUserStorage]);

// ŘEŠENÍ 3: UseCallback
const setUserStorage = useCallback((key, val) => {
  localStorage.setItem(`user_${userId}_${key}`, val);
}, [userId]);

useEffect(() => {
  setUserStorage('key', value);
}, [value, setUserStorage]); // ✅ Nyní OK
```

---

## 📊 Statistiky

### Před Opravami
```
Celkem varování: 793
├─ no-unused-vars: 554
├─ react-hooks/exhaustive-deps: 202
├─ no-useless-escape: 12
├─ import/no-anonymous-default-export: 11
├─ no-dupe-keys: 4 (KRITICKÉ!)
├─ eqeqeq: 4
├─ default-case: 4
└─ no-mixed-operators: 2
```

### Po Automatických Opravách (Očekáváno)
```
Celkem varování: ~740
├─ no-unused-vars: 554 (beze změny)
├─ react-hooks/exhaustive-deps: 202 (beze změny)
├─ no-useless-escape: 0 ✅
├─ import/no-anonymous-default-export: 0 ✅
├─ no-dupe-keys: 0 ✅ (po manuální opravě)
├─ eqeqeq: 0 ✅
├─ default-case: 0 ✅
└─ no-mixed-operators: 0 ✅
```

### Po Kompletních Opravách (Cíl)
```
Celkem varování: <100
├─ no-unused-vars: <50 (odstraněny nepoužívané)
├─ react-hooks/exhaustive-deps: <50 (přidány komentáře)
└─ ostatní: 0
```

---

## 🎯 Priority

### 🔴 VYSOKÁ (Hned)
1. **Duplicitní klíče** - Může způsobit bugy!
2. **eqeqeq** - Potenciální logické chyby

### 🟡 STŘEDNÍ (Tento týden)
3. **Nepoužívané importy** - Zlepší build performance
4. **Anonymous exports** - Lepší debugging
5. **Default cases** - Robustnost kódu

### 🟢 NÍZKÁ (Postupně)
6. **React hooks deps** - Pouze pokud způsobují problémy
7. **Nepoužívané proměnné** - Čitelnost kódu

---

## 💾 Zálohy

Všechny skripty automaticky vytváří zálohy do:
```
_BCK_/eslint-fix-YYYYMMDD-HHMMSS/
_BCK_/dupe-keys-fix-YYYYMMDD-HHMMSS/
```

**Obnovení ze zálohy:**
```bash
# Najděte nejnovější zálohu
ls -lt _BCK_/

# Obnovte
cp -r _BCK_/eslint-fix-XXXXXX/src/* src/
```

---

## 🔧 Užitečné Příkazy

```bash
# Kontrola konkrétního souboru
npx eslint src/pages/Orders25List.js

# Automatická oprava konkrétního souboru
npx eslint src/pages/Orders25List.js --fix

# Kontrola pouze určitého typu problému
npx eslint src --rule 'no-unused-vars: error'

# Počet varování
npm run build 2>&1 | grep -E "Line [0-9]+" | wc -l

# Top 10 souborů s problémy
npm run build 2>&1 | grep "^src/" | cut -d: -f1 | sort | uniq -c | sort -rn | head -10
```

---

## 📚 Zdroje

- **Kompletní plán:** `ESLINT-OPRAVY-PLAN.md`
- **ESLint dokumentace:** https://eslint.org/docs/rules/
- **React Hooks Rules:** https://react.dev/warnings/invalid-hook-call-warning

---

## ✅ Checklist

- [ ] Spuštěn `fix_eslint_auto.sh`
- [ ] Opraveny duplicitní klíče (4x)
- [ ] Odstraněny nepoužívané importy (top 5 souborů)
- [ ] Build funguje bez chyb
- [ ] Aplikace testována v prohlížeči
- [ ] Změny commitnuty
- [ ] React hooks dependencies zkontrolovány (volitelné)

---

**Vytvořeno:** 14. listopadu 2025  
**Autor:** Automatická analýza ESLint  
**Účel:** Systematické odstranění ESLint varování z projektu
