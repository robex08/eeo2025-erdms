# 🎯 ESLint Čištění - Další Kroky

**Datum:** 14. listopadu 2025  
**Aktuální stav:** 769 varování

---

## ✅ Co bylo dokončeno

### 1. Debug Console Logy
- ✅ OrderForm25.js - EV_CISLO debug (useEffect s 14 řádky)
- ✅ OrderForm25.js - DOCX workflow stavy (3x console.log)
- ✅ Orders25List.js - DOCX šablony
- ✅ TodoPanel.js - Export potvrzení

### 2. React Warnings
- ✅ Orders25List.js - `indeterminate` checkbox atribut → použit ref

### 3. ESLint Auto-Fix
- ✅ Escape sekvence
- ✅ `==` → `===`
- ✅ Trailing spaces

### 4. Duplicitní Klíče (3/4 opraveno)
- ✅ useFloatingPanels.js - `serverSyncStatus`
- ✅ Orders25List.js - `size`, `maxSize`
- ⏸️ CashBookPage.js - `state` (1 zbývá)

### 5. Nepoužívané Importy
- ✅ Orders25List.js - 14+ FontAwesome ikon + utility funkce

---

## 🎯 Další Doporučené Kroky

### KROK 1: Odstranit Nepoužívané Importy (Střední Priorita)

#### A) CashBookPage.js (~20 nepoužívaných)
```bash
# Najít nepoužívané importy
npx eslint src/pages/CashBookPage.js 2>&1 | grep "is defined but never used"
```

**Očekávané:**
- FontAwesome ikony: `faSave`, `faUndo`, `faTimes`, `faCalendarAlt`, `faUser`, `faReceipt`
- Funkce: `getUserCashbookPermissions` (pokud není použita)

#### B) App.js (~15 nepoužívaných)
```bash
npx eslint src/App.js 2>&1 | grep "is defined but never used"
```

**Očekávané:**
- `restoreLastLocation`
- Některé FontAwesome ikony

#### C) Users.js (~10 nepoužívaných)
```bash
npx eslint src/pages/Users.js 2>&1 | grep "is defined but never used"
```

**Očekávané:**
- FontAwesome: `faUser`, `faPhone`, `faEnvelope`
- `css`, `TooltipWrapper`
- Styled components: `StatCard`, `ToggleButton`

#### D) useFloatingPanels.js (~10 nepoužívaných)
```bash
npx eslint src/hooks/useFloatingPanels.js 2>&1 | grep "is defined but never used"
```

**Očekávané:**
- Nepoužívané proměnné z destructuring

---

### KROK 2: Odstranit Nepoužívané Styled Components (Nízká Priorita)

Mnoho souborů má styled components, které nejsou použité. Například:

**CashBookPage.js:**
- `EditableSelect`
- Další styled komponenty

**Orders25List.js:**
- `PageTitle`
- `YearFilterSelect`
- `MonthFilterSelect`
- `ClearFiltersWrapper`
- `FilterSelectWithIcon`
- `FilterSelect`
- `PhaseProgressBar`
- `PhaseProgressFill`
- `PhaseLabel`
- `CustomSelectLocal`

**App.js:**
- `MenuLinkRight`
- `MenuIconButton`
- `TaskInput`
- `NotificationsScroll`

**Users.js:**
- `StatCard`
- `ToggleButton`

---

### KROK 3: Opravit Zbývající Duplicitní Klíč (Vysoká Priorita)

**CashBookPage.js řádek 1336** - duplicitní `state`
- Tento problém je záhadný - ESLint ho hlásí, ale nenalezli jsme ho v kódu
- Možné příčiny:
  1. Cached build output
  2. Problém v jiné části souboru
  3. False positive

**Řešení:**
```bash
# Vyčistit cache a znovu zkontrolovat
rm -rf node_modules/.cache
npm run build 2>&1 | grep "Duplicate key 'state'"
```

---

### KROK 4: React Hooks Dependencies (Volitelné, Časově Náročné)

**202 varování** typu `react-hooks/exhaustive-deps`

**Top soubory s problémy:**
1. Orders25List.js - ~30 varování
2. CashBookPage.js - ~15 varování
3. useFloatingPanels.js - ~10 varování
4. Users.js - ~15 varování
5. App.js - ~5 varování

**Strategie:**
- ✅ Ignorovat s komentářem pokud je funkce stabilní
- ✅ Použít `useCallback` pro funkce
- ✅ Přidat chybějící dependencies pokud jsou důležité

**Příklad opravy:**
```javascript
// PŘED:
useEffect(() => {
  setUserStorage('key', value);
}, [value]); // ⚠️ Chybí setUserStorage

// PO:
useEffect(() => {
  setUserStorage('key', value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [value]); // setUserStorage je stabilní funkce
```

---

## 📊 Očekávané Výsledky Po Dalších Krocích

| Krok | Varování před | Varování po | Čas |
|------|---------------|-------------|-----|
| Aktuálně | 769 | - | - |
| + Krok 1 (importy) | 769 | ~720 | 30 min |
| + Krok 2 (styled) | ~720 | ~670 | 20 min |
| + Krok 3 (dupe key) | ~670 | ~669 | 5 min |
| + Krok 4 (hooks) | ~669 | <500 | 2+ hod |

---

## 🚀 Automatizační Skripty

### Skript pro odstranění nepoužívaných importů (Top 5 souborů)

```bash
#!/bin/bash
# remove_unused_imports_top5.sh

FILES=(
  "src/pages/CashBookPage.js"
  "src/App.js"
  "src/pages/Users.js"
  "src/hooks/useFloatingPanels.js"
  "src/pages/Orders25List.js"
)

echo "🔍 Analýza nepoužívaných importů v Top 5 souborech..."
echo ""

for file in "${FILES[@]}"; do
  echo "📄 $file:"
  npx eslint "$file" 2>&1 | grep "is defined but never used" | head -10
  echo ""
done

echo "💡 Pro automatickou opravu (nebezpečné!):"
echo "   npx eslint src/pages/CashBookPage.js --fix"
echo ""
echo "🔧 Nebo manuálně otevřít v editoru a použít:"
echo "   VS Code: Ctrl+Shift+O (Organize Imports)"
```

### Skript pro nalezení všech nepoužívaných styled components

```bash
#!/bin/bash
# find_unused_styled_components.sh

echo "🎨 Hledání nepoužívaných styled components..."
echo ""

# Najít všechny styled komponenty
for file in src/**/*.js src/**/*.jsx; do
  if [ -f "$file" ]; then
    unused=$(npx eslint "$file" 2>&1 | grep "is assigned a value but never used" | grep -v "no-unused-vars" || true)
    if [ ! -z "$unused" ]; then
      echo "📄 $file:"
      echo "$unused"
      echo ""
    fi
  fi
done
```

---

## 💡 Doporučení

### Co Dělat TEĎ (Vysoká Priorita):
1. ✅ **Krok 1A** - CashBookPage.js importy (10 min)
2. ✅ **Krok 1B** - App.js importy (5 min)
3. ✅ **Krok 3** - Zkusit najít poslední duplicitní klíč (10 min)

### Co Může Počkat (Nízká Priorita):
- 🔵 Krok 2 - Styled components (není kritické)
- 🔵 Krok 4 - React hooks (aplikace funguje)

### Co NEDĚLAT:
- ❌ Nemazat importy "na slepo" bez kontroly
- ❌ Neměnit hooks dependencies bez pochopení
- ❌ Neopravovat všechno najednou

---

## 📝 Checklist Pro Další Práci

- [ ] CashBookPage.js - odstranit nepoužívané importy
- [ ] App.js - odstranit nepoužívané importy
- [ ] Users.js - odstranit nepoužívané importy
- [ ] useFloatingPanels.js - kontrola nepoužívaných proměnných
- [ ] Najít a opravit poslední duplicitní klíč (CashBookPage.js)
- [ ] Build test - zkontrolovat, že vše funguje
- [ ] Commit a push

---

**Připraveno pro další práci!** 🚀

Počet varování: **769** → Cíl: **<700** (první fáze)
