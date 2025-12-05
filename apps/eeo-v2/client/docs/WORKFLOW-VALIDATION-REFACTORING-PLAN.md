# 🎯 Plán refaktoringu validace a workflow management

## 📊 Aktuální stav

### Problémy:
1. **Duplicitní logika zamykání sekcí**
   - `shouldLockPhase1Sections`, `shouldLockPhase2Sections`, `shouldLockPhase3Sections` v `OrderForm25.js`
   - WorkflowManager má vlastní `SECTION_DEFINITIONS` s `lockLogic`
   - **KONFLIKT**: Obě logiky existují paralelně

2. **Roztříštěná validace**
   - Validace se volá ručně na 3 místech v `OrderForm25.js`
   - Každé místo ručně vytváří `sectionStates` objekt
   - Není DRY (Don't Repeat Yourself)

3. **Nekonzistentní mapování fází na sekce**
   - WorkflowManager: `financovani: { phase: 3 }`
   - OrderForm25: `shouldLockPhase3Sections = isFieldDisabled(financovaniState)`
   - workflowUtils: `zpusob_financovani: 'financovani'`
   - **Matoucí**: Fáze ≠ Sekce

## 🎯 Cílový stav

### Centralizace do WorkflowManager:

```javascript
// ✅ useWorkflowManager.js
const workflowManager = useWorkflowManager(formData, unlockStates);

// 1️⃣ Stavy sekcí (visible + enabled)
const allSectionStates = workflowManager.getAllSectionStates();

// 2️⃣ Validace - NOVÉ API
const validationErrors = workflowManager.validateFormData();

// 3️⃣ Kontrola, zda je pole disabled
const isFieldDisabled = workflowManager.isFieldDisabled('zpusob_financovani');
```

## 📝 Implementační kroky

### Krok 1: Přidat validační funkci do WorkflowManager

```javascript
// useWorkflowManager.js

/**
 * Mapa polí na sekce
 * Toto určuje, která sekce musí být odemčená pro validaci daného pole
 */
const FIELD_TO_SECTION = {
  // Objednatel sekce
  predmet: 'objednatel',
  garant_uzivatel_id: 'objednatel',
  prikazce_id: 'objednatel',
  max_cena_s_dph: 'objednatel',
  strediska_kod: 'objednatel',
  
  // Schválení sekce
  jmeno: 'schvaleni',
  email: 'schvaleni',
  schvaleni_komentar: 'schvaleni',
  
  // Financování sekce
  zpusob_financovani: 'financovani',
  lp_kod: 'financovani',
  
  // Dodavatel sekce
  dodavatel_nazev: 'dodavatel',
  dodavatel_adresa: 'dodavatel',
  dodavatel_ico: 'dodavatel',
  dodavatel_kontakt: 'dodavatel',
  
  // Detaily sekce
  druh_objednavky_kod: 'detaily',
  polozky_objednavky: 'detaily',
  
  // Potvrzení sekce
  datum_odeslani: 'potvrzeni_objednavky',
  dodavatel_zpusob_potvrzeni: 'potvrzeni_objednavky',
  zpusob_platby: 'potvrzeni_objednavky',
  dt_akceptace: 'potvrzeni_objednavky',
  
  // Storno
  odeslani_storno_duvod: 'schvaleni'
};

/**
 * 🎯 CENTRALIZOVANÁ VALIDACE
 * Validuje formData podle aktuálního workflow stavu a stavu sekcí
 */
const validateFormData = useCallback(() => {
  const errors = {};
  const requiredFields = getRequiredFields(mainWorkflowState);
  
  // Získat aktuální stavy všech sekcí
  const sectionStates = getAllSectionStates();
  
  // Helper: Určí, zda validovat pole
  const shouldValidateField = (fieldName) => {
    const sectionKey = FIELD_TO_SECTION[fieldName];
    if (!sectionKey) return true; // Neznámé pole = validuj
    
    const sectionState = sectionStates[sectionKey];
    if (!sectionState) return true; // Neznámá sekce = validuj
    
    // ⚠️ VÝJIMKA: Dodavatel se VŽDY validuje i když je sekce zamčená
    const alwaysValidateFields = ['dodavatel_nazev', 'dodavatel_adresa', 'dodavatel_ico'];
    if (alwaysValidateFields.includes(fieldName)) {
      return sectionState.visible; // Validuj pokud je viditelná
    }
    
    // VALIDOVAT: Sekce je viditelná A odemčená (enabled)
    return sectionState.visible && sectionState.enabled;
  };
  
  // Validuj každé required pole
  requiredFields.forEach(field => {
    if (!shouldValidateField(field)) {
      return; // Přeskoč - sekce není aktivní
    }
    
    // ... validační logika pro každé pole ...
    // (přesunout z workflowUtils.js)
  });
  
  return errors;
}, [formData, mainWorkflowState, getAllSectionStates]);
```

### Krok 2: Přidat `isFieldDisabled` helper do WorkflowManager

```javascript
/**
 * 🔒 Zjistí, zda je konkrétní pole disabled
 * Kombinuje: section state + UI flags (showSaveProgress, isSaving)
 */
const isFieldDisabled = useCallback((fieldName, uiContext = {}) => {
  const sectionKey = FIELD_TO_SECTION[fieldName];
  if (!sectionKey) return false; // Neznámé pole není disabled
  
  const sectionState = getSectionState(sectionKey);
  
  return (
    !sectionState.enabled ||           // Sekce je zamčená
    uiContext.showSaveProgress ||      // Probíhá ukládání (progress bar)
    uiContext.isSaving                 // Probíhá save operace
  );
}, [getSectionState]);
```

### Krok 3: Odstranit `shouldLockPhase*Sections` z OrderForm25.js

```diff
- const objednatelState = allSectionStates.objednatel;
- const shouldLockPhase1Sections = isFieldDisabled(objednatelState);
- 
- const schvaleniState = allSectionStates.schvaleni;
- const shouldLockPhase2Sections = isFieldDisabled(schvaleniState);
- 
- const financovaniState = allSectionStates.financovani;
- const shouldLockPhase3Sections = isFieldDisabled(financovaniState);

+ // ✅ Všechny lock states jsou nyní v workflowManager.getAllSectionStates()
```

### Krok 4: Použít centralizovanou validaci

```diff
  // Validace při pokusu o submit
  useEffect(() => {
    if (hasTriedToSubmit) {
-     const validationWorkflowCode = currentPhase === 1 ? 'NOVA' : (formData.stav_workflow_kod || 'NOVA');
-     
-     const sectionStates = {
-       phase1: { visible: currentPhase >= 1, locked: shouldLockPhase1Sections },
-       phase2: { visible: currentPhase >= 2, locked: shouldLockPhase2Sections },
-       financovani: { visible: financovaniState.visible, locked: !financovaniState.enabled },
-       phase3: { visible: currentPhase >= 3, locked: shouldLockPhase3Sections },
-       phase4to6: { visible: currentPhase >= 4, locked: shouldLockPhase4to6Sections }
-     };
-     
-     const errors = validateWorkflowData(formData, validationWorkflowCode, sectionStates);
-     setValidationErrors(errors);
+     // ✅ Centralizovaná validace
+     const errors = workflowManager.validateFormData();
+     setValidationErrors(errors);
    }
- }, [hasTriedToSubmit, formData.predmet, ..., shouldLockPhase1Sections, shouldLockPhase2Sections, ...]);
+ }, [hasTriedToSubmit, workflowManager]);
```

### Krok 5: Použít `isFieldDisabled` pro input fields

```diff
  <input
    name="predmet"
    value={formData.predmet}
-   disabled={shouldLockPhase1Sections}
+   disabled={workflowManager.isFieldDisabled('predmet', { showSaveProgress, isSaving })}
  />
```

## 📦 Výhody refaktoringu

1. ✅ **Single Source of Truth**: Všechna logika v WorkflowManageru
2. ✅ **Konzistence**: Stejná logika pro UI a validaci
3. ✅ **Čitelnost**: Méně kódu v OrderForm25.js
4. ✅ **Testovatelnost**: Workflow logika izolovaná v hooku
5. ✅ **DRY**: Žádná duplicitní logika

## ⚠️ Rizika a migrace

### Postupná migrace:
1. **Nejdřív přidat** nové funkce do WorkflowManageru (nebreakující změna)
2. **Pak postupně nahrazovat** staré `shouldLockPhase*` v OrderForm25.js
3. **Nakonec odstranit** staré proměnné

### Testování:
- Testovat každou fázi workflow (1-10)
- Testovat unlock funkce (admin odemyká sekce)
- Testovat validaci v každé fázi

## 🚀 Timeline

- [ ] **Den 1**: Přidat `validateFormData()` do WorkflowManager
- [ ] **Den 2**: Přidat `isFieldDisabled()` + `FIELD_TO_SECTION` mapování
- [ ] **Den 3**: Odstranit `shouldLockPhase*Sections` a nahradit použití
- [ ] **Den 4**: Testování všech workflow fází
- [ ] **Den 5**: Cleanup + dokumentace

---

**Autor**: Senior Developer  
**Datum**: 5. listopadu 2025  
**Status**: 📋 NÁVRH - čeká na schválení
