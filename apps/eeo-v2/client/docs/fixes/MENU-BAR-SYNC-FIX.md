# FIX: Menu Bar Synchronizace s Formulářem

**Datum:** 15. října 2025  
**Problém:** Menu bar se neaktualizoval po změně stavu objednávky (zavřít koncept, uložit, změna fáze)  
**Řešení:** Přidány broadcast události pro synchronizaci UI

---

## 🐛 Problém

### Popis
Menu bar v `Layout.js` zobrazoval zastaralé informace o stavu objednávky:

1. **Po zavření konceptu** - tlačítko zůstávalo jako "Koncept objednávka" místo "Nová objednávka"
2. **Po uložení objednávky** - menu se neaktualizovalo s novým stavem (NOVA → KONCEPT → SCHVALENA)
3. **Bez F5 refresh** - změny se projevily až po manuálním znovunačtení stránky

### Příklad chování
```
Uživatel:
1. Vytvoří koncept objednávky
2. Klikne "ZAVŘÍT" → smaže draft
3. Menu bar STÁLE ukazuje "Koncept objednávka" ❌
4. Teprve po F5 se zobrazí "Nová objednávka" ✅
```

---

## ✅ Řešení

### 1. Přidán Broadcast Event po Zavření Formuláře

**Soubor:** `src/forms/OrderForm25.js`  
**Funkce:** `handleCancelConfirm()`

```javascript
// 🔄 Broadcast změnu stavu do menu baru
try {
  window.dispatchEvent(new CustomEvent('orderDraftChange', { 
    detail: { 
      hasDraft: false,
      isEditMode: false,
      orderId: null,
      orderNumber: '',
      isLoading: false
    } 
  }));
  addDebugLog('success', 'STORNO', 'broadcast', 'Broadcast orderDraftChange odeslán (hasDraft: false)');
} catch (e) {
  console.error('Chyba při odeslání broadcast eventu:', e);
}

// Přesměruj na seznam objednávek
navigate('/orders25-list');
```

**Důvod:**  
Po smazání draftu z localStorage je nutné okamžitě informovat menu bar, že už není žádný rozpracovaný koncept.

---

### 2. Přidán Broadcast Event po Uložení Objednávky

**Soubor:** `src/forms/OrderForm25.js`  
**Funkce:** `saveOrderToAPI()` - finally blok

```javascript
} finally {
  setIsSavingDraft(false);
  setIsSaving(false);
  addDebugLog('info', 'SAVE', 'finally-cleanup', 'isSaving resetováno - UI refresh kompletní');
  
  // 🔄 Broadcast změnu stavu do menu baru po úspěšném uložení
  try {
    // Zjisti aktuální stav draftu
    const draftKey = getDraftKey();
    const draftRaw = draftKey ? localStorage.getItem(draftKey) : null;
    const hasDraft = !!draftRaw;
    
    // Zjisti fázi a číslo objednávky
    const orderNumber = formData.ev_cislo || formData.cislo_objednavky || '';
    const orderId = formData.id || savedOrderId;
    
    window.dispatchEvent(new CustomEvent('orderDraftChange', { 
      detail: { 
        hasDraft: hasDraft,
        isEditMode: isOrderSavedToDB || !!savedOrderId,
        orderId: orderId,
        orderNumber: orderNumber,
        isLoading: false
      } 
    }));
    addDebugLog('success', 'SAVE', 'broadcast', `Broadcast orderDraftChange odeslán (hasDraft: ${hasDraft}, isEditMode: ${isOrderSavedToDB || !!savedOrderId})`);
  } catch (e) {
    console.error('Chyba při odeslání broadcast eventu po uložení:', e);
  }
}
```

**Důvod:**  
Po každém uložení (INSERT nebo UPDATE) musí menu bar zobrazit aktuální stav:
- `hasDraft` - existuje draft v localStorage
- `isEditMode` - objednávka je v DB (editační režim)
- `orderId` / `orderNumber` - pro zobrazení čísla objednávky

---

### 3. Aktualizace Layout.js Event Handleru

**Soubor:** `src/components/Layout.js`  
**useEffect:** Listener pro `orderDraftChange`

```javascript
const handler = (e) => {
  if (typeof e.detail?.hasDraft === 'boolean') {
    setHasDraftOrder(e.detail.hasDraft);
    
    if (e.detail?.isLoading) {
      return; // Keep current menu bar state while loading
    }
    
    // Update edit mode information
    setIsOrderEditMode(e.detail?.isEditMode || false);
    setEditOrderId(e.detail?.orderId || null);
    setEditOrderNumber(e.detail?.orderNumber || '');
    
    // 🔄 KRITICKÉ: Aktualizuj fázi objednávky z draftu po změně
    if (e.detail?.hasDraft && user_id) {
      try {
        const draftKey = getDraftKey(user_id);
        const draftRaw = localStorage.getItem(draftKey);
        if (draftRaw) {
          const parsed = JSON.parse(draftRaw);
          const phaseInfo = getOrderPhaseFromDraft(parsed);
          setOrderPhaseInfo(phaseInfo);
        }
      } catch (err) {
        console.error('Chyba při načítání fáze z draftu:', err);
      }
    } else if (!e.detail?.hasDraft) {
      // Žádný draft - reset na výchozí stav
      setOrderPhaseInfo({ phase: 1, isZrusena: false });
    }
  } else {
    // fallback: explicitně načti jen pro aktuálního uživatele
    recalcHasDraft();
    setIsOrderEditMode(false);
    setEditOrderId(null);
    setEditOrderNumber('');
    setOrderPhaseInfo({ phase: 1, isZrusena: false });
  }
};
window.addEventListener('orderDraftChange', handler);
return () => window.removeEventListener('orderDraftChange', handler);
```

**Změny:**
1. ✅ Přidáno načítání `orderPhaseInfo` z draftu při změně
2. ✅ Reset `orderPhaseInfo` pokud není draft (`hasDraft: false`)
3. ✅ Použití `getOrderPhaseFromDraft()` pro správné určení fáze

---

## 🎯 Výsledek

### Menu Bar se nyní aktualizuje automaticky:

| Akce | Stav před | Stav po |
|------|-----------|---------|
| **Zavřít koncept** | "Koncept objednávka" ❌ | "Nová objednávka" ✅ |
| **Uložit koncept** | "Nová objednávka" | "Koncept objednávka" ✅ |
| **Schválit obj.** | "Koncept objednávka" | "Editace objednávky O-0042-2025-ZZS-EEO" ✅ |
| **Odeslat obj.** | Stará fáze ❌ | Aktuální fáze s ikonou ✅ |

### Testování

```javascript
// Scénář 1: Zavřít koncept
1. Otevřít formulář (/order-form-25)
2. Vyplnit základní data
3. Kliknout "ZAVŘÍT" → Ano, zavřít
✅ Menu bar okamžitě ukazuje "Nová objednávka" (bez F5)

// Scénář 2: Uložit koncept
1. Vyplnit povinná pole (FÁZE 1)
2. Kliknout "ULOŽIT"
✅ Menu bar okamžitě ukazuje "Koncept objednávka" (bez F5)

// Scénář 3: Změna fáze (schválení)
1. Schvalovatel schválí objednávku
2. Kliknout "ULOŽIT"
✅ Menu bar okamžitě ukazuje "Editace objednávky O-XXXX-2025-ZZS-EEO" (bez F5)
```

---

## 📚 Technické Detaily

### Event Schema

```typescript
interface OrderDraftChangeEvent {
  detail: {
    hasDraft: boolean;        // Existuje draft v localStorage?
    isEditMode: boolean;       // Objednávka je v DB (editační režim)?
    orderId: number | null;    // ID objednávky v DB
    orderNumber: string;       // Číslo objednávky (O-XXXX-2025-ZZS-EEO)
    isLoading: boolean;        // Probíhá načítání? (menu bar by měl zůstat)
  }
}
```

### Místa odeslání eventu

1. **`handleCancelConfirm()`** - po smazání draftu a před navigací
2. **`saveOrderToAPI()` - finally** - po každém uložení (INSERT/UPDATE)

### Layout.js State Management

```javascript
// State variables aktualizované z eventů
const [hasDraftOrder, setHasDraftOrder] = useState(false);
const [isOrderEditMode, setIsOrderEditMode] = useState(false);
const [editOrderId, setEditOrderId] = useState(null);
const [editOrderNumber, setEditOrderNumber] = useState('');
const [orderPhaseInfo, setOrderPhaseInfo] = useState({ phase: 1, isZrusena: false });
```

---

## 🔗 Související Soubory

- ✅ `src/forms/OrderForm25.js` - přidány broadcast události
- ✅ `src/components/Layout.js` - aktualizován event handler
- ✅ `src/utils/draftUtils.js` - funkce `getOrderPhaseFromDraft()` (existující)

---

## ⚠️ Poznámky

1. **Bez F5 refresh** - všechny změny se projevují okamžitě pomocí events
2. **User-specific** - draft klíče jsou vázány na `user_id` (izolace uživatelů)
3. **Multi-tab support** - events fungují pouze v rámci jedné záložky (localStorage není sdílený mezi záložkami)
4. **Fallback** - při chybě eventů se použije `recalcHasDraft()` pro načtení z localStorage

---

**Status:** ✅ Dokončeno  
**Testováno:** Ano (15.10.2025)  
**Regression:** Ne
