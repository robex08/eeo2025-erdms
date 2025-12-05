# 🔧 FIX: FloatingNavigator - Viditelnost sekce "Dokončení"

**Datum implementace:** 27. listopadu 2025  
**Git commit:** 62e644e  
**Branch:** LISTOPAD-VIKEND  
**Status:** ✅ OPRAVENO

---

## 📋 Problém

Uživatel **BEZ práva dokončit objednávku** viděl v navigátoru sekci "Dokončení" už ve chvíli, kdy objednávka byla ve fázi 7 (Věcná správnost), ale nebyla ještě skutečně dokončená.

### Screenshot problému:
![Navigator zobrazuje "Dokončení" předčasně](attachment)

**Očekávané chování:**
- Sekce "Dokončení" by se měla zobrazit **POUZE** když je objednávka skutečně ve stavu **DOKONCENA**
- Ne jen proto, že workflow dosáhl fáze 8

---

## 🔍 Analýza příčiny

### ❌ První pokus o opravu (commit 1926a16) - NESPRÁVNÝ

```javascript
// ❌ ŠPATNĚ: Kontrola fáze místo skutečného stavu
const sectionPhase = FORM_SECTIONS.find(s => s.id === sectionId)?.phase || 8;
const isPhaseReached = currentPhase >= sectionPhase;

if (!isWorkflowCompleted && !isPhaseReached && !canUnlockAnything) {
  return { visible: false, enabled: false };
}
```

**Problém:** Kontroloval `currentPhase >= 8`, což znamená že sekce byla viditelná ve fázi 8, i když objednávka nebyla skutečně dokončená.

### Root Cause:

**Workflow fáze ≠ Workflow stav**

- **Fáze 8** = objednávka je připravená k dokončení (uživatel může workflow posunout do stavu DOKONCENA)
- **Stav DOKONCENA** = objednávka byla **skutečně dokončena** uživatelem s právem

**Uživatel bez práva dokončit:**
1. Vidí objednávku ve fázi 8 (připravenou k dokončení)
2. Ale **NEMŮŽE** ji dokončit (nemá právo)
3. Navigátor mu **NEMĚL** zobrazovat sekci "Dokončení", dokud ji někdo s právem nedokončí

---

## ✅ Řešení (commit 62e644e)

### Nová logika:

```javascript
// Helper funkce pro kontrolu workflow stavu
const hasWorkflowState = useCallback((workflowCode, state) => {
  if (!workflowCode) return false;
  try {
    if (typeof workflowCode === 'string' && workflowCode.startsWith('[')) {
      const states = JSON.parse(workflowCode);
      return Array.isArray(states) && states.includes(state);
    }
    return String(workflowCode).includes(state);
  } catch {
    return String(workflowCode).includes(state);
  }
}, []);

// ✅ SPRÁVNĚ: Kontrola skutečného stavu DOKONCENA
if (sectionId === 'dokonceni') {
  const isDokoncena = hasWorkflowState(formData.stav_workflow_kod, 'DOKONCENA');
  
  // Běžní uživatelé vidí sekci JEN když je objednávka SKUTEČNĚ dokončená
  if (!isDokoncena && !canUnlockAnything) {
    return { visible: false, enabled: false };
  }
  
  // ADMIN + ORDER_MANAGE vidí sekci vždy (i když není dokončená)
}
```

---

## 🎯 Logika po opravě

| Workflow stav | Právo uživatele | **Sekce "Dokončení" viditelná?** |
|--------------|----------------|----------------------------------|
| **ZKONTROLOVANA** (fáze 7) | Bez práva dokončit | ❌ **NE** |
| **ZKONTROLOVANA** (fáze 7) | ADMIN + ORDER_MANAGE | ✅ ANO (vidí vždy) |
| **Připraveno k dokončení** (fáze 8) | Bez práva dokončit | ❌ **NE** (čeká na dokončení) |
| **Připraveno k dokončení** (fáze 8) | ADMIN + ORDER_MANAGE | ✅ ANO (vidí vždy) |
| **DOKONCENA** | Jakýkoliv | ✅ **ANO** (skutečně dokončená) |

---

## 📝 Implementované změny

### Soubor: `src/components/FloatingNavigator.js`

**Přidáno:**
1. ✅ Helper funkce `hasWorkflowState()` pro kontrolu workflow stavů
2. ✅ Kontrola `formData.stav_workflow_kod` místo `currentPhase`
3. ✅ Dependency v `useCallback`: `formData.stav_workflow_kod`, `hasWorkflowState`

**Změněno:**
```javascript
// PŘED (nesprávné):
const isPhaseReached = currentPhase >= sectionPhase;
if (!isWorkflowCompleted && !isPhaseReached && !canUnlockAnything) {
  return { visible: false, enabled: false };
}

// PO (správné):
const isDokoncena = hasWorkflowState(formData.stav_workflow_kod, 'DOKONCENA');
if (!isDokoncena && !canUnlockAnything) {
  return { visible: false, enabled: false };
}
```

---

## 🧪 Test scénáře

### ✅ Test 1: Uživatel bez práva dokončit - Fáze 7 (Věcná správnost)
1. Přihlásit se jako uživatel **bez práva dokončit**
2. Otevřít objednávku ve fázi 7
3. **Očekáváno:**
   - ✅ Navigátor zobrazuje "Věcná správnost" jako poslední položku
   - ❌ Sekce "Dokončení" **NENÍ** viditelná

### ✅ Test 2: Uživatel bez práva dokončit - Fáze 8 (Připraveno k dokončení)
1. Přihlásit se jako uživatel **bez práva dokončit**
2. Otevřít objednávku ve fázi 8 (připravenou k dokončení, ale **NEDOKONČENOU**)
3. **Očekáváno:**
   - ❌ Sekce "Dokončení" **NENÍ** viditelná (čeká na dokončení uživatelem s právem)

### ✅ Test 3: Uživatel s právem dokončit - Dokončí objednávku
1. Přihlásit se jako uživatel **s právem dokončit**
2. Otevřít objednávku ve fázi 8
3. Dokončit objednávku → stav **DOKONCENA**
4. **Očekáváno:**
   - ✅ Sekce "Dokončení" je viditelná
   - ✅ Uživatel bez práva nyní také vidí sekci "Dokončení"

### ✅ Test 4: ADMIN s ORDER_MANAGE
1. Přihlásit se jako **ADMIN** s právem **ORDER_MANAGE**
2. Otevřít objednávku v jakémkoliv stavu
3. **Očekáváno:**
   - ✅ Sekce "Dokončení" je viditelná **vždy** (i když není dokončená)

---

## 📊 Workflow stavy vs. Fáze

| Workflow stav | Fáze | Popis |
|--------------|------|-------|
| NOVA | 1 | Nová objednávka |
| ROZPRACOVANA | 2 | Rozpracovaná |
| ODESLANA | 3 | Odeslaná ke schválení |
| SCHVALENA | 3 | Schválená PO |
| POTVRZENA | 4 | Potvrzená dodavatelem |
| REGISTR_SMLUV | 5 | Registr smluv |
| FAKTURACE | 6 | Fakturace |
| ZKONTROLOVANA | 7 | Věcná správnost |
| **➡️ Připraveno k dokončení** | **8** | **Může být dokončena** |
| **DOKONCENA** | **8** | **✅ Skutečně dokončená** |

**Klíčový rozdíl:**
- **Fáze 8** = objednávka **může být** dokončena
- **Stav DOKONCENA** = objednávka **byla** dokončena

---

## 🔗 Související commity

1. **44d427a** - Fix falešné detekce zamčení ve fázi Věcná správnost
2. **1926a16** - První pokus o fix navigátoru (nesprávný - kontrola fáze)
3. **62e644e** - Druhý pokus o fix navigátoru (**správný** - kontrola stavu DOKONCENA)

---

## 📞 Kontakt

**Autor:** GitHub Copilot  
**Datum:** 27.11.2025  
**Git commit:** 62e644e  
**Branch:** LISTOPAD-VIKEND

---

**Status:** ✅ **OPRAVENO - Připraveno k testování**
