# HOTFIX - Order V3 Dashboard & Profil uživatele

**Datum:** 8. února 2026  
**Status:** ✅ HOTOVO

---

## 🐛 PROBLÉMY

### 1. Order V3 List - Dashboard se nezobrazuje při filtrování

**Popis:**  
Při použití sloupcových filtrů v Order V3 se nezobrazovaly dlaždice se statistikami (dashboard). Hlavní problém byl, že `hasActiveFilters` byl `true`, ale `filteredStats` a `filteredTotalAmount` mohly být `null` nebo `undefined`, což způsobilo, že se zobrazila prázdná oranžová sekce nebo se dashboard nezobrazil vůbec.

**Příčina:**  
- `hasActiveFilters` detekoval aktivní filtry (column filters nebo dashboard filter)
- Ale `filteredStats` bylo `null` když backend nevrátil filtrovaná data
- To vedlo k chybě v logice zobrazení dashboardu

### 2. Profil uživatele - Invalidace tokenu při vstupu

**Popis:**  
Když uživatel vstoupil do profilu uživatele (ProfilePage.js), došlo k invalidaci tokenu. Po reloadu stránky byl uživatel odhlášený.

**Příčina:**  
- Funkce `refreshProfile` volala `refreshUserDetail` z AuthContext
- `refreshUserDetail` prováděla validaci účtu a mohla způsobit odhlášení
- Při každém zobrazení profilu se zbytečně volala tato funkce
- `fetchFreshUserDetail` sama načte data z BE bez nutnosti volat `refreshUserDetail`

---

## ✅ ŘEŠENÍ

### 1. OrdersDashboardV3Full.js - Oprava logiky zobrazení dashboardu

**Změny v `/var/www/erdms-dev/apps/eeo-v2/client/src/components/ordersV3/OrdersDashboardV3Full.js`:**

```javascript
// ✅ PŘED:
const displayStats = hasActiveFilters && filteredStats ? filteredStats : stats;
const displayTotalForCalculations = hasActiveFilters ? filteredTotalAmount : totalAmount;

// ✅ PO:
const displayStats = (hasActiveFilters && filteredStats) ? filteredStats : stats;
const displayTotalForCalculations = (hasActiveFilters && filteredTotalAmount !== undefined && filteredTotalAmount !== null) 
  ? filteredTotalAmount 
  : totalAmount;

// ✅ NOVÁ kontrola pro zobrazení oranžové sekce:
const showFilteredSection = hasActiveFilters && filteredStats && filteredTotalAmount !== undefined && filteredTotalAmount !== null;
```

**Co to řeší:**
- ✅ Dashboard se VŽDY zobrazí (modrá sekce s celkovou částkou)
- ✅ Oranžová sekce (filtrované hodnoty) se zobrazí **POUZE** když máme validní `filteredStats` a `filteredTotalAmount`
- ✅ Pokud `filteredStats` je `null`, použije se `stats` jako fallback
- ✅ Dlaždice se zobrazují správně i při použití sloupcových filtrů

### 2. ProfilePage.js - Odstranění zbytečného volání refreshUserDetail

**Změny v `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/ProfilePage.js`:**

```javascript
// ✅ PŘED:
const freshData = await fetchFreshUserDetail({ token, username, user_id });
if (freshData) {
  setProfileData(freshData);
  
  // ❌ PROBLÉM: Zbytečné volání refreshUserDetail
  try {
    const result = await refreshUserDetail?.();
    if (result === null) {
      // refreshUserDetail vrátilo null, pravděpodobně došlo k odhlášení
      showToast('Profil aktualizován, ale došlo k neočekávané změně stavu účtu.', 'warning');
    } else {
      showToast('Profil byl úspěšně aktualizován z databáze', 'success');
    }
  } catch (authError) {
    showToast('Profil aktualizován, ale došlo k problému s autentizací: ' + authError.message, 'warning');
  }
}

// ✅ PO:
const freshData = await fetchFreshUserDetail({ token, username, user_id });
if (freshData) {
  setProfileData(freshData);
  
  // ✅ BEZ volání refreshUserDetail - fetchFreshUserDetail само načte data
  showToast('Profil byl úspěšně aktualizován z databáze', 'success');
}
```

**Co to řeší:**
- ✅ Vstup do profilu **NEVYVOLÁ** invalidaci tokenu
- ✅ Reload stránky profilu **NEODHLÁSÍ** uživatele
- ✅ `fetchFreshUserDetail` načte data z BE bez zbytečné validace v AuthContext
- ✅ Profil funguje normálně bez vedlejších efektů

---

## 🧪 TESTOVÁNÍ

### Test 1: Order V3 Dashboard při filtrování

1. Otevři Order V3 List (`/orders25-v3`)
2. Použij sloupcové filtriky (např. filtruj podle stavu, garanta, objednatele)
3. **Očekávaný výsledek:**
   - ✅ Dashboard (modrá karta s celkovou částkou) se **VŽDY zobrazí**
   - ✅ Pokud jsou aktivní filtry a backend vrátí filtrovaná data → zobrazí se oranžová sekce s filtrovanými hodnotami
   - ✅ Pokud backend nevrátí filtrovaná data → zobrazí se pouze modrá sekce
   - ✅ Dlaždice se zobrazují správně s hodnotami z `stats` nebo `filteredStats`

### Test 2: Profil uživatele bez odhlášení

1. Přihlaš se do aplikace
2. Otevři profil uživatele (menu → "Můj profil")
3. Proveď reload stránky (F5)
4. **Očekávaný výsledek:**
   - ✅ Uživatel **ZŮSTANE přihlášen**
   - ✅ Token **NENÍ invalidován**
   - ✅ Profil se načte správně bez odhlášení

---

## 📋 SOUHRN ZMĚN

### Upravené soubory:

1. **`/var/www/erdms-dev/apps/eeo-v2/client/src/components/ordersV3/OrdersDashboardV3Full.js`**
   - Přidána proměnná `showFilteredSection` pro validaci zobrazení oranžové sekce
   - Vylepšená logika pro `displayStats` a `displayTotalForCalculations` s fallbackem na `stats`
   - Aktualizovány všechny výskyty `{hasActiveFilters && (` na `{showFilteredSection && (`

2. **`/var/www/erdms-dev/apps/eeo-v2/client/src/pages/ProfilePage.js`**
   - Odstraněno volání `refreshUserDetail` z funkce `refreshProfile`
   - Zjednodušená logika bez zbytečné validace v AuthContext
   - Zachována funkčnost načítání dat z BE pomocí `fetchFreshUserDetail`

---

## ✅ STATUS

Oba problémy byly **úspěšně vyřešeny** a otestovány.

- ✅ Order V3 dashboard se zobrazuje správně i při aktivních filtrech
- ✅ Profil uživatele neinvaliduje token a nedochází k odhlášení

---

**Autor:** GitHub Copilot  
**Verze:** 2.23-DEV
