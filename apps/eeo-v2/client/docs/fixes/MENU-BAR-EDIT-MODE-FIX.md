# 🔧 Oprava menu baru pro editační režim objednávek

## 🐛 Problém
Menu bar stále ukazoval "Rozpracovaná objednávka" místo "Editace objednávky" při editaci existující objednávky.

## ✅ Řešení

### 1. Rozšíření `orderDraftChange` eventu
Původní event obsahoval pouze `hasDraft: boolean`, nyní obsahuje:

```javascript
window.dispatchEvent(new CustomEvent('orderDraftChange', { 
  detail: { 
    hasDraft: boolean,        // Existuje draft
    isEditMode: boolean,      // Je v editačním režimu
    orderId: string|null      // ID editované objednávky
  } 
}));
```

### 2. Helper funkce v OrderFormComponent
```javascript
const dispatchDraftChangeEvent = useCallback((hasDraft) => {
  try {
    window.dispatchEvent(new CustomEvent('orderDraftChange', { 
      detail: { 
        hasDraft: hasDraft,
        isEditMode: isEditMode,
        orderId: persistedOrderId
      } 
    }));
  } catch (e) {
    console.warn('Failed to dispatch draft change event:', e);
  }
}, [isEditMode, persistedOrderId]);
```

### 3. Aktualizace menu baru při změnách
```javascript
// Update menu bar when edit mode or order ID changes
useEffect(() => {
  if (hasMountedRef.current) {
    const hasDraft = computeDraftMeaningful(formData);
    dispatchDraftChangeEvent(hasDraft);
  }
}, [isEditMode, persistedOrderId, dispatchDraftChangeEvent]);
```

### 4. Rozšíření Layout.js pro zpracování editačního režimu

#### Nové state proměnné:
```javascript
const [isOrderEditMode, setIsOrderEditMode] = useState(false);
const [editOrderId, setEditOrderId] = useState(null);
```

#### Aktualizovaný event handler:
```javascript
const handler = (e) => {
  if (typeof e.detail?.hasDraft === 'boolean') {
    setHasDraftOrder(e.detail.hasDraft);
    // Update edit mode information
    setIsOrderEditMode(e.detail?.isEditMode || false);
    setEditOrderId(e.detail?.orderId || null);
  } else {
    recalcHasDraft();
    setIsOrderEditMode(false);
    setEditOrderId(null);
  }
};
```

#### Aktualizované zobrazení textu:
```javascript
{hasDraftOrder 
  ? (isOrderEditMode ? 'Editace objednávky' : 'Rozpracovaná objednávka')
  : 'Nová objednávka'
}
```

## 🚀 Výsledek

### ✅ **Správné chování menu baru:**

1. **Nová objednávka** → "Nová objednávka" 
2. **Rozpracovaná nová** → "Rozpracovaná objednávka"
3. **Editace existující** → "Editace objednávky" ✨

### 🎯 **Scénáře nyní fungují:**

1. ✅ Otevřít editaci ze seznamu → Menu bar: **"Editace objednávky"**
2. ✅ Navigovat pryč a zpět → Menu bar: **"Editace objednávky"** (zachováno)
3. ✅ Vytvořit novou objednávku → Menu bar: **"Nová objednávka"**
4. ✅ Uložit novou objednávku → Menu bar: **"Editace objednávky"** (přechod)
5. ✅ Stornovat editaci → Menu bar: **"Nová objednávka"** (vyčištěno)

### 📋 **Soubory změněny:**

- ✅ `/src/forms/OrderFormComponent.js` - rozšířený event dispatch
- ✅ `/src/components/Layout.js` - zpracování editačního režimu

### 🔧 **Klíčové změny:**

#### OrderFormComponent.js:
- Helper `dispatchDraftChangeEvent()` pro konzistentní event dispatch
- useEffect pro aktualizaci menu při změně `isEditMode` / `persistedOrderId`
- Rozšířené payload v `orderDraftChange` eventu

#### Layout.js:
- Nové state: `isOrderEditMode`, `editOrderId` 
- Rozšířený event handler pro zpracování editačních info
- Logika rozlišení textu: Editace vs Rozpracovaná vs Nová

**Menu bar nyní správně rozpoznává a zobrazuje editační režim! 🎉**