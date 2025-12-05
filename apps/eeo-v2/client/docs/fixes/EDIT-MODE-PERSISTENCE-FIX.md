# 🔧 Oprava persistence editačního režimu objednávek

## 🐛 Problém
Po opuštění editačního režimu a návratu se ztratila informace o editaci existující objednávky a místo toho se zobrazila jako "rozpracovaná nová objednávka". Obsah byl správný, ale chyběly vizuální indikátory editace.

## ✅ Řešení

### 1. Persistence editačního režimu per objednávka
```javascript
// Ukládání editačního režimu pro konkrétní objednávku
const persistEditMode = (orderId, mode) => {
  if (!orderId) return;
  const key = `order_edit_mode_${orderId}`;
  if (mode === 'edit') {
    localStorage.setItem(key, 'edit');
  } else {
    localStorage.removeItem(key);
  }
};

// Kontrola uloženého editačního režimu
const checkPersistedEditMode = (orderId) => {
  if (!orderId) return false;
  const key = `order_edit_mode_${orderId}`;
  return localStorage.getItem(key) === 'edit';
};
```

### 2. Obnovení editačního režimu při návratu
```javascript
// Kontrola při načtení komponenty s existující objednávkou
useEffect(() => {
  if (persistedOrderId && !isEditMode) {
    const shouldBeInEditMode = checkPersistedEditMode(persistedOrderId);
    if (shouldBeInEditMode) {
      setIsEditMode(true);
      if (formData && !originalFormData) {
        setOriginalFormData({ ...formData });
      }
    }
  }
}, [persistedOrderId, isEditMode, checkPersistedEditMode, formData, originalFormData]);
```

### 3. Obnovení z draft dat
```javascript
// Ukládání editačního režimu do draft
const payload = { ...formData };
payload.__isEditMode = isEditMode;
payload.__persistedOrderId = persistedOrderId;
localStorage.setItem(draftKey, JSON.stringify(payload));

// Obnovení editačního režimu z draft při inicializaci
useEffect(() => {
  const raw = localStorage.getItem(draftKey);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.__isEditMode && parsed.__persistedOrderId) {
      setIsEditMode(true);
      setPersistedOrderId(parsed.__persistedOrderId);
      if (formData && !originalFormData) {
        setOriginalFormData({ ...formData });
      }
    }
  }
}, [draftKey, formData, originalFormData]);
```

### 4. Přechod z nové objednávky na editaci
```javascript
// Po prvním uložení nové objednávky přejít do editačního režimu
if (returnedId) {
  setPersistedOrderId(returnedId);
  // If this was a new order creation, switch to edit mode
  if (!shouldUseUpdate) {
    setIsEditMode(true);
    persistEditMode(returnedId, 'edit');
    if (!originalFormData) {
      setOriginalFormData({ 
        ...formData, 
        orderId: returnedId, 
        orderNumber: found || formData.orderNumber 
      });
    }
  }
}
```

### 5. Čištění při cancelaci
```javascript
// Vyčištění perzistentního editačního režimu při storno
if (persistedOrderId) {
  persistEditMode(persistedOrderId, null);
}
setIsEditMode(false);
setOriginalFormData(null);
setPersistedOrderId(null);
```

## 🚀 Výsledek

### ✅ **Opravené chování:**

1. **Persistence při navigaci** - Editační režim se zachová i po opuštění a návratu na formulář
2. **Správné vizuální indikátory** - Žluté pozadí, upravený text, fázový indikátor
3. **Menu bar konzistence** - Zobrazí se jako "editace objednávky" místo "rozpracovaná nová"
4. **Přechod nová → editace** - Po prvním uložení se automaticky přepne do editačního režimu
5. **Čištění stavu** - Správné vymazání při cancelaci nebo dokončení

### 🔧 **Technické detaily:**

#### Klíče localStorage:
- `order_edit_mode_${orderId}` - persistence editačního režimu per objednávka
- Rozšířený draft obsahuje `__isEditMode` a `__persistedOrderId`

#### State management:
- `isEditMode` - aktuální editační režim
- `originalFormData` - původní data pro reset
- `persistedOrderId` - ID existující objednávky

#### Lifecycle hooks:
- Kontrola persistence při mount s `persistedOrderId`
- Obnovení z draft při inicializaci
- Automatický přechod při prvním uložení
- Čištění při cancelaci

## ✅ **Testovací scénáře dokončené:**

1. ✅ Otevřít editaci objednávky ze seznamu
2. ✅ Navigovat pryč (jiná stránka) 
3. ✅ Vrátit se na formulář
4. ✅ Ověřit zachované vizuální indikátory editace
5. ✅ Ověřit funkční reset na původní data
6. ✅ Ověřit přechod nová objednávka → editace po uložení
7. ✅ Ověřit čištění při storno

**Persistence editačního režimu je nyní plně funkční! 🎉**