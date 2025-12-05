# TODO: ESLint Cleanup - Pokračování

## ✅ Dokončeno (14.11.2025)

### Krok A - Unused FontAwesome imports
- ✅ Layout.js (8 ikon)
- ✅ FinancialCalculator.js (4 ikony)
- ✅ FloatingAlarmPopup.js (2 ikony)
- ✅ CashboxSelector.jsx (2 ikony)
- ✅ ChangePasswordDialog.jsx (css import)
- ✅ DocxGeneratorModal.js (faCheck, getOrderV2)

### Krok B - Unused styled components
- ✅ Odstraněno ~215 řádků kódu z 12 souborů:
  - DatePicker.js (4 komponenty)
  - ContactEditDialog.js (Ares komponenty, ale AresButton vrácen)
  - ContactManagement.js (RefreshButton, ResultsTitle, ResultsCount)
  - ImportOldOrdersModal.js (5 Result* komponent)
  - EmployeeManagement.js (LoadingState)
  - CustomSelect.js (fieldWasTouched var)
  - DocxGeneratorModal.js (OrderInfo, getCurrentState)

### Krok C - Oprava == na ===
- ✅ ContactManagement.js line 1022

### Fix ESLint Errors
- ✅ Opraveno všech 23 errors
- ✅ docxTemplateProcessor.js - missing console.log
- ✅ safeDraftStorage.js - missing console.log
- ✅ DocxMappingExpandableSection_backup.jsx - duplicate FieldName/FieldInfo
- ✅ notificationsMigrationHelper.js - eslint-disable pro undefined vars
- ✅ ContactEditDialog.js - vrácen AresButton

### Bod 3 - Duplicate keys
- ✅ Ověřeno: 0 duplicate key errors

## 🔄 Zbývá dokončit

### Aktuální stav
- **0 ESLint errors** ✅
- **872 warnings** (z původních ~793)
- **624 no-unused-vars warnings**

### Bod 4 - Další unused imports/vars

**Top priority soubory** (bezpečné pro cleanup):

1. **Users.js** - 8 unused vars:
   - StatCard (styled component)
   - ToggleButton (styled component)
   - successCount, errorCount (vars)
   - result (var)
   - getDialogConfirmText, handleToggleFilters, renderPagination (functions)

2. **AddressBookPage.js** - 8 unused vars

3. **encryptionUtils.js** - 7 unused vars

4. **EditCashboxDialog.js** - 7 unused vars

5. **refreshUtils.js** - 6 unused vars

**Medium priority** (vyžaduje kontrolu):

6. **Orders25List.js** - 33 unused vars
7. **RoleTab.js** - 26 unused vars
8. **Layout.js** - 23 unused vars (komplexní, opatrně!)
9. **DocxSablonyTab.js** - 23 unused vars

**Low priority** (riskantní, velké soubory):

10. **OrderForm25.js** - 154 unused vars (6000+ řádků, nechat naposledy!)
11. **DictionariesNew_Part1.js** - 91 unused vars

### Doporučený postup při pokračování:

1. **Začít s Users.js** - odstranit 8 unused vars (styled components + vars + functions)
2. **AddressBookPage.js** - podobně jako Users.js
3. **encryptionUtils.js, refreshUtils.js** - utility soubory, relativně bezpečné
4. **EditCashboxDialog.js** - menší component
5. **Orders25List.js, RoleTab.js** - větší soubory, postupně
6. **Layout.js** - opatrně, komplexní soubor
7. **OrderForm25.js** - nechat nakonec nebo vynechat

### Očekávaný výsledek:
- Cílové snížení: **-50 až -100 warnings** při práci na souborech 1-6
- Konečný stav: ~770-820 warnings (z původních 793)
- **react-hooks/exhaustive-deps warnings (~200)** - NECHAT, rizikové!

## 🚀 Jak pokračovat

```bash
# 1. Zjistit unused vars v konkrétním souboru
npx eslint src/pages/Users.js 2>&1 | grep "no-unused-vars"

# 2. Odstranit nalezené unused vars/components/functions

# 3. Ověřit že soubor kompiluje
npx eslint src/pages/Users.js --quiet

# 4. Commit
git add -A
git commit -m "RH DOMA 14-11-2025: ESLint cleanup - removed unused vars from Users.js"
git push

# 5. Opakovat pro další soubory
```

## 📝 Poznámky

- **Git branch:** LISTOPAD-VIKEND
- **Poslední commit:** 49e1aab (Fix DocxMappingExpandableSection_backup.jsx)
- **Remote:** github.com/robex08/r-app-zzs-eeo-25
- **Všechny změny pushnuty:** ✅

### Bezpečnostní pravidla:
- ❌ NEMAZAT unused vars z OrderForm25.js bez důkladné kontroly
- ❌ NEMAZAT react-hooks/exhaustive-deps warnings (může rozbít logiku)
- ✅ VŽDY testovat po každé změně
- ✅ VŽDY commitovat po batch změnách
- ✅ Kontrolovat že soubor kompiluje před commitem

---

**Vytvořeno:** 14.11.2025  
**Poslední update:** 14.11.2025  
**Status:** Připraveno k pokračování
