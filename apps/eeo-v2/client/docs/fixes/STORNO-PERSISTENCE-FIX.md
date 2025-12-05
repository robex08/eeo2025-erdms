# 🔧 Oprava problému s persistencí po stornování objednávky

## 🐛 Problém
Po stornování editace/rozpracované objednávky a refreshi F5 se automaticky vytvářela nová objednávka s novým číslem, místo aby se zobrazila čistá "Nová objednávka".

## 🔍 Příčiny
1. **Zbytky v localStorage** - po stornování zůstávaly různé klíče
2. **Predicted order number** - automatické načítání nového čísla
3. **Draft persistence** - neúplné vyčištění draft stavů
4. **Edit mode persistence** - zůstávaly klíče pro editační režim

## ✅ Řešení

### 1. Rozšířené vyčištění v `handleCancel()`

```javascript
// KOMPLETNÍ VYČIŠTĚNÍ VŠECH LOCALSTORAGE KLÍČŮ

// 1. Základní drafty
localStorage.removeItem(draftKey);
localStorage.removeItem('order_draft');
localStorage.removeItem(attachmentsKey);

// 2. Predicted order number - KRITICKÉ!
if (user_id) localStorage.removeItem(`predicted_order_number_${user_id}`);

// 3. Edit mode persistence
if (persistedOrderId) {
  persistEditMode(persistedOrderId, null);
  localStorage.removeItem(`order_edit_mode_${persistedOrderId}`);
}

// 4. Workflow states
if (persistedOrderId) {
  localStorage.removeItem(nsKey(persistedOrderId, 'middleComplete'));
  localStorage.removeItem(nsKey(persistedOrderId, 'approvalSavedStatus'));
  localStorage.removeItem(nsKey(persistedOrderId, 'workflowLocked'));
}

// 5. Univerzální cleanup všech problematických klíčů
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key?.startsWith(`order_draft_${user_id}`) || 
      key?.startsWith(`order_edit_mode_`) ||
      key?.startsWith(`predicted_order_number_${user_id}`) ||
      key === 'order_draft' ||
      (persistedOrderId && key.includes(String(persistedOrderId)))) {
    keysToRemove.push(key);
  }
}
keysToRemove.forEach(key => localStorage.removeItem(key));
```

### 2. Reset state proměnných

```javascript
// Vyprázdnit všechny relevantní state
setFormData(initialState + autofill kontakt);
setIsEditMode(false);
setOriginalFormData(null);
setPersistedOrderId(null);
setPredictedOrderNumber('');  // KRITICKÉ!

// Event pro menu bar
dispatchDraftChangeEvent(false);
```

### 3. Zabránění automatickému načítání čísla

```javascript
// Ref pro dočasné zabránění auto-fetch
const preventAutoFetchRef = useRef(false);

// V useEffect pro predicted order number
if (preventAutoFetchRef.current) return;

// Po stornování nastavit
preventAutoFetchRef.current = true;
setTimeout(() => {
  preventAutoFetchRef.current = false;
}, 2000);
```

## 🎯 Scénáře nyní fungují správně

### ✅ **Scenario 1: Storno nové rozpracované**
1. Uživatel vytvoří novou objednávku
2. Vyplní nějaká data → "Rozpracovaná objednávka"  
3. Klikne Storno → Vše se vyčistí
4. F5 Refresh → "Nová objednávka" (bez auto-čísla)

### ✅ **Scenario 2: Storno editace existující**
1. Uživatel otevře editaci ze seznamu → "Editace objednávky"
2. Upraví data 
3. Klikne Storno → Vše se vyčistí
4. F5 Refresh → "Nová objednávka" (bez auto-čísla)

### ✅ **Scenario 3: Navigace pryč a zpět**
1. Uživatel má rozpracovanou/editovanou
2. Naviguje jinam a vrátí se → Stav se obnoví správně
3. F5 Refresh → Správný stav zachován

## 🚀 Klíčové vylepšení

### **Před opravou:**
❌ Po storno + F5 → Automaticky nová objednávka s číslem  
❌ Zbytky v localStorage způsobovaly problémy  
❌ Menu bar nesprávně ukazoval stavy  

### **Po opravě:**  
✅ Po storno + F5 → Čistá "Nová objednávka"  
✅ Kompletní vyčištění všech localStorage zbytků  
✅ Dočasné zabránění auto-fetch čísla  
✅ Menu bar správně reaguje na všechny stavy  

## 📋 Soubory změněny

- ✅ `/src/forms/OrderFormComponent.js` - rozšířený `handleCancel()`
- ✅ Přidán `preventAutoFetchRef` pro zabránění auto-fetch
- ✅ Rozšířené vyčištění localStorage
- ✅ Reset všech state proměnných

**Problém s persistencí po stornování je kompletně vyřešen! 🎉**