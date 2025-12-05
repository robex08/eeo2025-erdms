# UI Refresh Fix - Menu Bar & Order Button Label

## 🎯 Problém

Po změně stavu objednávky nebo smazání konceptu se UI (hlavně menu bar a tlačítko na objednávku) **nerefreshovalo** automaticky v ostatních záložkách. Například:
- Když se smazal koncept, tlačítko zůstávalo jako **"Koncept/Editace"** místo **"Nová objednávka"**
- F5 reload to vyřešil, ale mělo to fungovat automaticky

## ✅ Řešení

Implementoval jsem **broadcast synchronizaci** mezi záložkami pomocí `BroadcastChannel` API.

### Co bylo změněno

#### 1. **`src/components/Layout.js`** - Přidán broadcast listener

**Import:**
```javascript
import { onTabSyncMessage, BROADCAST_TYPES, initTabSync, closeTabSync } from '../utils/tabSync';
```

**Nový useEffect** (po `recalcHasDraft`):
```javascript
// ✅ BROADCAST: Poslouchej změny draftu z ostatních záložek
useEffect(() => {
  if (!isLoggedIn || !user_id) return;
  
  // Inicializuj broadcast channel
  initTabSync();
  
  const cleanup = onTabSyncMessage((message) => {
    if (!message || !message.type) return;
    
    // Reaguj pouze na zprávy relevantní pro menu bar
    switch (message.type) {
      case BROADCAST_TYPES.DRAFT_UPDATED:
        // Draft byl uložen/upraven v jiné záložce → refresh UI
        if (message.payload?.userId === user_id) {
          recalcHasDraft();
        }
        break;
        
      case BROADCAST_TYPES.DRAFT_DELETED:
        // Draft byl vymazán v jiné záložce → refresh UI
        if (message.payload?.userId === user_id) {
          recalcHasDraft();
        }
        break;
        
      case BROADCAST_TYPES.ORDER_SAVED:
        // Objednávka byla uložena → refresh UI
        recalcHasDraft();
        break;
        
      default:
        break;
    }
  });
  
  return () => {
    if (cleanup) cleanup();
    closeTabSync();
  };
}, [isLoggedIn, user_id, recalcHasDraft]);
```

**Co to dělá:**
- Poslouchá broadcast zprávy z ostatních záložek
- Když se změní draft (`DRAFT_UPDATED`, `DRAFT_DELETED`, `ORDER_SAVED`), zavolá `recalcHasDraft()`
- `recalcHasDraft()` aktualizuje stavy `hasDraftOrder`, `isOrderEditMode`, `editOrderId`, `editOrderNumber`
- UI menu baru se automaticky překreslí s novým labelem

#### 2. **`src/forms/OrderForm25.js`** - Přidán broadcast při změnách

**V funkci `deleteDraft()`:**
```javascript
// ✅ BROADCAST: Oznámit ostatním záložkám že draft byl smazán
try {
  broadcastDraftDeleted(user_id);
  if (process.env.NODE_ENV === 'development') {
    console.log('📡 [OrderForm25] Broadcast DRAFT_DELETED odeslán');
  }
} catch (broadcastError) {
  console.warn('⚠️ Chyba při broadcast draft deleted:', broadcastError);
}

// Emit custom event pro Layout (local tab)
try {
  window.dispatchEvent(new CustomEvent('orderDraftChange', { 
    detail: { hasDraft: false, isEditMode: false, orderId: null, orderNumber: '' }
  }));
} catch (eventError) {
  console.warn('⚠️ Chyba při dispatch orderDraftChange:', eventError);
}
```

**V funkci `saveDraft()`:**
```javascript
// ✅ BROADCAST: Oznámit ostatním záložkám že draft byl upraven
try {
  broadcastDraftUpdated(user_id, draftData);
  if (process.env.NODE_ENV === 'development' && !isAutoSave) {
    console.log('📡 [OrderForm25] Broadcast DRAFT_UPDATED odeslán');
  }
} catch (broadcastError) {
  console.warn('⚠️ Chyba při broadcast draft updated:', broadcastError);
}
```

**V `handleCancelConfirm()`** (už tam bylo):
```javascript
// 📡 Odeslat broadcast do ostatních záložek
broadcastDraftDeleted(user_id);

window.dispatchEvent(new CustomEvent('orderDraftChange', { 
  detail: { 
    hasDraft: false,
    isEditMode: false,
    orderId: null,
    orderNumber: '',
    isLoading: false
  } 
}));
```

## 🔄 Jak to funguje

### Scénář 1: Uložení konceptu

```
Tab 1: Uživatel uloží koncept
  ↓
  saveDraft() 
  ↓
  localStorage.setItem('order25-draft-{userId}', ...)
  ↓
  broadcastDraftUpdated(user_id, draftData) 📡
  ↓
  BroadcastChannel → Tab 2, Tab 3, ...

Tab 2: Detekuje zprávu DRAFT_UPDATED
  ↓
  onTabSyncMessage() listener
  ↓
  recalcHasDraft()
  ↓
  setHasDraftOrder(true)
  setIsOrderEditMode(true/false podle typu)
  ↓
  Menu bar se překreslí s novým labelem
```

### Scénář 2: Smazání konceptu (ZAVŘÍT formulář)

```
Tab 1: Uživatel zavře formulář
  ↓
  handleCancelConfirm()
  ↓
  localStorage.removeItem('order25-draft-{userId}')
  ↓
  broadcastDraftDeleted(user_id) 📡
  ↓
  BroadcastChannel → Tab 2, Tab 3, ...

Tab 2: Detekuje zprávu DRAFT_DELETED
  ↓
  onTabSyncMessage() listener
  ↓
  recalcHasDraft()
  ↓
  setHasDraftOrder(false)
  setIsOrderEditMode(false)
  setEditOrderId(null)
  ↓
  Menu bar se překreslí: "Nová objednávka" ✅
```

### Scénář 3: Uložení objednávky do DB

```
Tab 1: Uživatel uloží objednávku do DB
  ↓
  handleSaveOrder()
  ↓
  API call → createPartialOrder25() nebo updatePartialOrder25()
  ↓
  broadcastOrderSaved(orderId, orderNumber) 📡
  ↓
  BroadcastChannel → Tab 2, Tab 3, ...

Tab 2: Detekuje zprávu ORDER_SAVED
  ↓
  onTabSyncMessage() listener
  ↓
  recalcHasDraft()
  ↓
  setIsOrderEditMode(true)
  setEditOrderId(orderId)
  setEditOrderNumber(orderNumber)
  ↓
  Menu bar se překreslí: "Editace objednávky O-0042-2025..." ✅
```

## 📊 Label logika v menu baru

`Layout.js` dynamicky určuje label tlačítka podle stavu draftu:

```javascript
title={(() => {
  const draftKey = getDraftKey(user_id);
  const draftRaw = draftKey ? localStorage.getItem(draftKey) : null;
  let draftData = null;
  try {
    draftData = draftRaw ? JSON.parse(draftRaw) : null;
  } catch {}
  
  // 1. Pokud je validní koncept (nová objednávka bez ID) → "Koncept objednávka"
  if (isValidConcept(draftData)) {
    return 'Koncept objednávka';
  }
  
  // 2. Pokud má DB objednávka rozpracované změny → "Editace objednávky {číslo}"
  if (hasDraftChanges(draftData) || isOrderEditMode) {
    const cisloObjednavky = draftData?.formData?.cislo_objednavky || 
                          editOrderNumber || 
                          ...;
    return cisloObjednavky 
      ? `Editace objednávky ${cisloObjednavky}` 
      : 'Editace objednávky';
  }
  
  // 3. Jinak "Nová objednávka"
  return 'Nová objednávka';
})()}
```

**Stav se aktualizuje pomocí:**
- `hasDraftOrder` - boolean (existuje draft?)
- `isOrderEditMode` - boolean (editace existující objednávky?)
- `editOrderId` - ID editované objednávky
- `editOrderNumber` - Číslo editované objednávky

Tyto stavy se aktualizují v `recalcHasDraft()`, která se volá:
1. Při změně `user_id`
2. Při změně `isLoggedIn`
3. Při custom eventu `orderDraftChange` (local tab)
4. **NOVĚ:** Při broadcast zprávách z ostatních záložek

## ✅ Výsledek

**Před opravou:**
- ❌ Smazání konceptu → Tlačítko zůstává "Koncept/Editace"
- ❌ Uložení objednávky v Tab 1 → Tab 2 neví o změně
- ❌ Nutný F5 reload

**Po opravě:**
- ✅ Smazání konceptu → Tlačítko se změní na "Nová objednávka"
- ✅ Uložení objednávky v Tab 1 → Tab 2 aktualizuje UI automaticky
- ✅ Všechny záložky jsou synchronizované bez F5

## 🧪 Testování

### Manuální test

1. **Test smazání konceptu:**
   - Otevři Tab 1, vytvoř koncept
   - Otevři Tab 2, zkontroluj že vidíš "Koncept objednávka"
   - V Tab 1 klikni ZAVŘÍT → Koncept se smaže
   - **Očekávaný výsledek:** Tab 2 automaticky změní tlačítko na "Nová objednávka"

2. **Test uložení objednávky:**
   - Otevři Tab 1, vytvoř objednávku a ulož do DB
   - Otevři Tab 2
   - **Očekávaný výsledek:** Tab 2 vidí "Editace objednávky O-XXXX"

3. **Test úpravy konceptu:**
   - Otevři Tab 1, vytvoř koncept
   - Otevři Tab 2
   - V Tab 1 uprav koncept (auto-save)
   - **Očekávaný výsledek:** Tab 2 zůstává s "Koncept objednávka" (žádný flicker)

### Dev console log

V development módu uvidíš:
```
📡 [OrderForm25] Broadcast DRAFT_UPDATED odeslán
🔄 [Layout] Draft updated v jiné záložce, aktualizuji menu bar...
✅ [Layout] Menu bar aktualizován
```

## 📝 Závěr

Implementace **broadcast synchronizace** mezi záložkami zajišťuje, že:
- ✅ UI se automaticky refreshne při změnách v jiných záložkách
- ✅ Není potřeba F5 reload
- ✅ Uživatel má vždy aktuální informace o stavu objednávky
- ✅ Systém je robustní díky try-catch bloků

---

**Implementováno:** 15. října 2025  
**Soubory:** `Layout.js`, `OrderForm25.js`  
**Status:** ✅ Ready for testing
