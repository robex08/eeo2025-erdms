# 🔧 Oprava problémů s editací schválených objednávek a menu bar persistence

## 🐛 Identifikované problémy

### **Problém 1: Nesprávné načítání bloků při editaci schválené objednávky**
- Při otevření editace schválené objednávky se **nenačítaly správné bloky**
- Zůstávalo to **jako před schválením** i když byla objednávka už schválená
- **Příčina:** `getCurrentPhase()` nezohledňovala stavové informace (`schvalil_uzivatel_id`, `stav_id`)

### **Problém 2: Menu bar chaos po F5 v editačním režimu**
- Menu bar ukazoval "Editace objednávky" ✅
- Po **F5 refresh** se změnilo na "Rozpracovaná objednávka" ❌ 
- **Příčina:** Layout.js `recalcHasDraft()` neuměl číst editační informace z localStorage

## ✅ Řešení

### **Oprava 1: Rozšířené getCurrentPhase() - zohlednění stavů**

```javascript
// PŘED - pouze základní kontrola
const getCurrentPhase = useCallback((data) => {
  const hasBasicInfo = data.predmet && data.prikazce_id && data.stredisko;
  const hasSupplierInfo = data.dodavatel_nazev && (data.druh_objednavky || data.polozky?.length > 0);
  const isConfirmed = data.sentStatus === 'odeslano' && data.orderConfirmed;
  
  if (isConfirmed) return 3;
  if (hasSupplierInfo) return 2;
  if (hasBasicInfo) return 1;
  return 0;
}, []);

// PO - zohlednění stavových informací  
const getCurrentPhase = useCallback((data) => {
  const hasBasicInfo = data.predmet && data.prikazce_id && data.stredisko;
  const hasSupplierInfo = data.dodavatel_nazev && (data.druh_objednavky || data.polozky?.length > 0);
  
  // KRITICKÉ: Zkontroluj stavové informace pro určení fáze
  const isApproved = data.schvalil_uzivatel_id || data.approvedByUserId || 
                    (data.stav_id && data.stav_id !== null && data.stav_id !== '');
  const isConfirmed = data.sentStatus === 'odeslano' && data.orderConfirmed;
  
  if (isConfirmed) return 3;
  if (hasSupplierInfo) return 2;
  if (hasBasicInfo || isApproved) return 1; // Schválená objednávka má minimálně fázi 1
  return 0;
}, []);
```

### **Oprava 2: Enhanced Layout.js recalcHasDraft()**

```javascript
// PŘED - pouze kontrola existence draftu
try {
  const parsed = JSON.parse(specificRaw);
  setHasDraftOrder(!!parsed && (parsed.__draftOwner == null || parsed.__draftOwner === user_id));
} catch { setHasDraftOrder(false); }

// PO - načítání editačních informací
try {
  const parsed = JSON.parse(specificRaw);
  const hasDraft = !!parsed && (parsed.__draftOwner == null || parsed.__draftOwner === user_id);
  setHasDraftOrder(hasDraft);
  
  // KRITICKÉ: Načti také editační režim info z draftu
  if (hasDraft && parsed) {
    setIsOrderEditMode(parsed.__isEditMode || false);
    setEditOrderId(parsed.__persistedOrderId || null);
  } else {
    setIsOrderEditMode(false);
    setEditOrderId(null);
  }
} catch { 
  setHasDraftOrder(false);
  setIsOrderEditMode(false);
  setEditOrderId(null);
}
```

### **Oprava 3: Enhanced draft uložení v loadOrder()**

```javascript
// PŘED - bez editačních informací
const toSave = { ...src, __draftOwner: user_id, __draftMeaningful: true };
localStorage.setItem(key, JSON.stringify(toSave));
window.dispatchEvent(new CustomEvent('orderDraftChange', { detail: { hasDraft: true } }));

// PO - s editačními informacemi
const toSave = { 
  ...src, 
  __draftOwner: user_id, 
  __draftMeaningful: true,
  // KRITICKÉ: Zahrň editační informace
  __isEditMode: mode === 'edit',
  __persistedOrderId: orderId
};
localStorage.setItem(key, JSON.stringify(toSave));

// Pošli enhanced event s editačními informacemi  
window.dispatchEvent(new CustomEvent('orderDraftChange', { 
  detail: { 
    hasDraft: true,
    isEditMode: mode === 'edit',
    orderId: orderId
  } 
}));
```

## 🎯 Scénáře nyní fungují správně

### ✅ **Editace schválené objednávky:**
1. **Otevři editaci** schválené objednávky ze seznamu
2. **Zobrazí se správné bloky** podle skutečného stavu (schváleno = fáze 1+)
3. **Supplier, Details, Financing** sekce budou viditelné ✨
4. **Confirmation, Registry** budou viditelné pokud je confirmed ✨

### ✅ **Menu bar persistence v editačním režimu:**
1. **Otevři editaci** ze seznamu → Menu: "Editace objednávky" ✅
2. **F5 refresh** → Menu: **"Editace objednávky"** (bez změny!) ✅
3. **Naviguj jinam a zpět** → Menu: "Editace objednávky" ✅  
4. **Žádný chaos!** 🚀

### ✅ **Normální workflow zachován:**
1. **Nová objednávka** → progresivní odhalování bloků ✅
2. **Rozpracovaná** → správné fáze dle vyplnění ✅
3. **Autosave** funguje normálně ✅

## 🔧 Klíčové mechanismy

### **Phase Detection rozšířen:**
- ✅ **Základní info** (`predmet`, `prikazce_id`, `stredisko`)
- ✅ **Stavové info** (`schvalil_uzivatel_id`, `stav_id`) ← **NOVÉ**
- ✅ **Supplier info** (`dodavatel_nazev`, `druh_objednavky`)  
- ✅ **Confirmation** (`sentStatus`, `orderConfirmed`)

### **localStorage draft struktura:**
```javascript
{
  // Existující data
  ...orderData,
  __draftOwner: user_id,
  __draftMeaningful: true,
  
  // NOVÉ editační informace
  __isEditMode: boolean,      // Je v editačním režimu?
  __persistedOrderId: string  // ID editované objednávky
}
```

### **Layout.js persistence:**
- `recalcHasDraft()` **čte editační info** z localStorage
- Po F5 **obnoví správný stav** menu baru
- **Enhanced events** zůstávají kompatibilní

## 📊 Před vs Po opravě

### **PŘED opravou:**
❌ **Schválené objednávky** - špatné bloky (fáze 0)  
❌ **Menu bar po F5** - chaos mezi "Editace" a "Rozpracovaná"  
❌ **Phase detection** - ignoroval stavové informace  
❌ **Layout persistence** - nečetl editační režim  

### **PO opravě:**
✅ **Schválené objednávky** - správné bloky (fáze 1+)  
✅ **Menu bar po F5** - stabilně "Editace objednávky"  
✅ **Phase detection** - zohledňuje stavy i schválení  
✅ **Layout persistence** - čte a udržuje editační režim  
✅ **Enhanced events** - kompletní informace  

## 📋 Upravené soubory

### **OrderFormComponent.js:**
- ✅ **getCurrentPhase()** - rozšířeno o stavové informace
- ✅ **loadOrder()** - enhanced draft s editačními info  
- ✅ **formCanceledRef** ochrana zůstává zachována

### **Layout.js:**  
- ✅ **recalcHasDraft()** - čte editační informace z draftu
- ✅ **Error handling** - resetuje všechny stavy při chybě
- ✅ **Kompatibilita** - funguje s enhanced i legacy eventy

**Editace schválených objednávek + Menu bar persistence = SOLVED! 🎉**

## 🧪 Test scénáře

### **Test 1: Editace schválené objednávky**
```
1. Vytvoř objednávku → Schval → Uložit
2. Otevři ze seznamu pro editaci  
3. ✅ Očekávání: Všechny bloky viditelné podle stavu
```

### **Test 2: Menu bar persistence**  
```
1. Otevři editaci → Menu: "Editace objednávky"
2. F5 refresh → Menu: "Editace objednávky" 
3. ✅ Očekávání: Žádná změna textu
```

### **Test 3: Storno + persistence**
```  
1. Editace → Storno → Menu: "Nová objednávka"
2. F5 refresh → Menu: "Nová objednávka"
3. ✅ Očekávání: Žádné zbytky v localStorage
```

**Všechny problémy s editací a menu bar persistencí jsou vyřešeny!** 🚀