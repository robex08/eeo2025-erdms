# ✅ VYHLEDÁVACÍ POLE V SELECTECH - VŽDY ZOBRAZIT

**Datum:** 19. října 2025  
**Status:** ✅ IMPLEMENTOVÁNO  
**Priorita:** P3 - LOW (UX zlepšení)

---

## 📋 ZMĚNA

Vyhledávací pole v `StableCustomSelect` komponentě se nyní zobrazuje **vždy** (pokud jsou nějaké položky), ne až od 6 položek.

### PŘED:
```javascript
{filteredOptions.length > 5 && (
  <StableSelectSearchBox>
    <StableSelectSearchInput ... />
  </StableSelectSearchBox>
)}
```
**→ Vyhledávací pole se zobrazilo pouze při 6+ položkách**

### PO:
```javascript
{filteredOptions.length > 0 && (
  <StableSelectSearchBox>
    <StableSelectSearchInput ... />
  </StableSelectSearchBox>
)}
```
**→ Vyhledávací pole se zobrazí vždy (pokud není select prázdný)**

---

## 🎯 DŮVOD ZMĚNY

### Problém:
- **GARANT** select měl 50+ uživatelů → vyhledávací pole ✅ ZOBRAZENO
- **PŘÍKAZCE** select měl pouze 5 uživatelů → vyhledávací pole ❌ SKRYTO
- Uživatel očekával konzistentní UX - vyhledávání ve všech selectech

### Scénáře kdy bylo vyhledávání skryté:
- PŘÍKAZCE (5 schvalovatelů)
- STŘEDISKA (3-4 střediska)
- Malé seznamy obecně

---

## 🔧 MODIFIKOVANÝ SOUBOR

**`/src/forms/OrderForm25.js`**

### Komponenta: `StableCustomSelect` (řádek ~16318)

**Změna:** Threshold pro zobrazení vyhledávacího pole

```diff
{isOpen && !disabled && (
  <StableSelectDropdown ref={dropdownRef}>
-   {filteredOptions.length > 5 && (
+   {filteredOptions.length > 0 && (
      <StableSelectSearchBox>
        <StableSelectSearchIcon>
          <Search size={16} />
        </StableSelectSearchIcon>
        <StableSelectSearchInput
          ref={searchInputRef}
          type="text"
          placeholder="Vyhledat..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </StableSelectSearchBox>
    )}
```

---

## 📊 DOPAD

### UX:
- ✅ **Konzistentní** - všechny selecty mají vyhledávání
- ✅ **Intuitivní** - uživatel se naučí jedno chování
- ✅ **Příprava na budoucnost** - pokud se seznam rozroste, vyhledávání už bude

### Výkon:
- **Zanedbatelný** - vyhledávací input je lehký (~1KB HTML)
- Filtrování se provádí stejně (useMemo)

### Ovlivněné selecty:
1. **GARANT** (allUsers) - před: zobrazeno ✅ → po: zobrazeno ✅
2. **PŘÍKAZCE** (approvers) - před: skryto ❌ → po: zobrazeno ✅
3. **STŘEDISKA** (strediskaOptions) - před: možná skryto → po: zobrazeno ✅
4. **LIMITOVANÉ PŘÍSLIBY** (lp_kod) - před: možná skryto → po: zobrazeno ✅
5. Všechny další `StableCustomSelect` instance

---

## 🧪 TESTOVÁNÍ

### Test 1: GARANT select
**Kroky:**
1. Otevřít Order formulář
2. Kliknout na GARANT dropdown
3. Ověřit vyhledávací pole

**Očekáváno:** ✅ Zobrazeno (jako před)

---

### Test 2: PŘÍKAZCE select
**Kroky:**
1. Otevřít Order formulář
2. Kliknout na PŘÍKAZCE dropdown
3. Ověřit vyhledávací pole

**Očekáváno:** ✅ **Nově zobrazeno** (i když je jen 5 příkazců)

---

### Test 3: STŘEDISKA select
**Kroky:**
1. V sekci "Schválení nákupu PO"
2. Kliknout na STŘEDISKO dropdown
3. Ověřit vyhledávací pole

**Očekáváno:** ✅ Zobrazeno (i když jsou jen 3-4 střediska)

---

### Test 4: Prázdný select
**Kroky:**
1. Vytvořit select s 0 položkami (např. při chybě načtení)
2. Otevřít dropdown

**Očekáváno:** ❌ Vyhledávací pole **NENÍ** zobrazeno (logické - není co hledat)

---

## 🎨 ALTERNATIVNÍ ŘEŠENÍ (neimplementováno)

### Varianta A: Threshold jako prop
```javascript
<StableCustomSelect
  ...
  searchThreshold={3} // Zobrazit od 4 položek
/>
```
**Výhoda:** Flexibilita per-select  
**Nevýhoda:** Složitější API, nekonzistentní UX

### Varianta B: Adaptivní threshold
```javascript
{filteredOptions.length > 3 && (
  <StableSelectSearchBox>...</StableSelectSearchBox>
)}
```
**Výhoda:** Kompromis mezi "vždy" a "od 6"  
**Nevýhoda:** Stále nekonzistentní

### Varianta C: Vždy zobrazit (ZVOLENO)
```javascript
{filteredOptions.length > 0 && (
  <StableSelectSearchBox>...</StableSelectSearchBox>
)}
```
**Výhoda:** Maximální konzistence, jednoduchost  
**Nevýhoda:** Zbytečné pro 1-2 položky (ale nijak nevadí)

---

## 📈 STATISTIKY POUŽITÍ

**Selecty v OrderForm25:**
1. GARANT - ~50 uživatelů → před: ✅ po: ✅
2. PŘÍKAZCE - ~5 příkazců → před: ❌ po: ✅
3. STŘEDISKA - ~4 střediska → před: ❌ po: ✅
4. LIMITOVANÉ PŘÍSLIBY - ~10-20 LP → před: možná ✅ po: ✅

**Celkem:** 4+ selectů ovlivněno, **2-3 nově s vyhledáváním**

---

## ⚠️ POZNÁMKY

### Proč ne "vždy bez podmínky"?

Původní kód:
```javascript
{filteredOptions.length > 0 && (
  <StableSelectSearchBox>...</StableSelectSearchBox>
)}
```

Mohlo by být:
```javascript
<StableSelectSearchBox>...</StableSelectSearchBox>
```

**Důvod podmínky:**
- Pokud je select prázdný (0 položek), nemá smysl zobrazovat vyhledávání
- Lepší zobrazit "Žádné položky" místo prázdného vyhledávacího pole

---

### Mobile UX
Na mobilu může vyhledávací pole zabírat hodně místa při malých seznamech.

**Budoucí vylepšení (volitelné):**
```javascript
const isMobile = window.innerWidth < 768;
const showSearch = isMobile ? filteredOptions.length > 10 : filteredOptions.length > 0;
```

---

## ✅ COMPLETION CHECKLIST

- [x] Změněn threshold z `> 5` na `> 0`
- [x] Žádné syntax/lint chyby
- [x] Dokumentace vytvořena
- [ ] Browser test - GARANT select (mělo by fungovat jako před)
- [ ] Browser test - PŘÍKAZCE select (nově zobrazeno)
- [ ] Browser test - STŘEDISKA select (nově zobrazeno)

---

## 🎯 ZÁVĚR

**Status:** ✅ IMPLEMENTOVÁNO (vyžaduje browser test)

**Změna:**
- Vyhledávací pole v `StableCustomSelect` se nyní zobrazuje vždy (pokud jsou položky)
- Threshold změněn z `> 5` na `> 0`
- Ovlivněno 4+ selectů, zejména PŘÍKAZCE a STŘEDISKA

**UX zlepšení:**
- ✅ Konzistentní chování napříč všemi selecty
- ✅ Uživatel má vždy k dispozici vyhledávání
- ✅ Lepší příprava na budoucnost (rozrůstající se seznamy)

---

**Autor:** GitHub Copilot  
**Verze dokumentu:** 1.0  
**Poslední update:** 19. října 2025
