# 🔔 FLOW: Od kliknutí na notifikaci k otevření formuláře objednávky

## 📋 Přehled

Tento dokument popisuje **kompletní flow** od kliknutí na odkaz objednávky v NotificationsPanel až po úspěšné načtení a zobrazení formuláře OrderForm25.

---

## 🎯 Celkový přehled (7 hlavních kroků)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Kliknutí na odkaz v NotificationsPanel                      │
│    → handleOrderClick(orderId)                                  │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Kontrola user_id a draft existence                          │
│    → DraftManager.hasDraft()                                    │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Pokud draft existuje → načti a zkontroluj ownership         │
│    → DraftManager.loadDraft()                                   │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Rozhodnutí: Zobrazit dialog nebo přímá navigace?            │
│    → window.confirm() NEBO navigate() přímo                     │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. React Router navigace                                        │
│    → navigate('/order-form-25?edit=123')                        │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. OrderForm25 detekuje změnu editOrderId                       │
│    → useEffect → useFormController → useOrderDataLoader         │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Načtení dat z API a zobrazení formuláře                     │
│    → getOrderV2() → transformOrderData() → setFormData()        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 Detailní popis jednotlivých kroků

### **KROK 1: Kliknutí na odkaz v NotificationsPanel**

**Soubor:** `src/components/panels/NotificationsPanel.js`

**Akce:** Uživatel klikne na tlačítko s evidenčním číslem objednávky

```javascript
<button onClick={async () => {
  const id = n.orderId || n.orderNumber;
  if (!id) return;
  
  // ✅ Zavolej handleOrderClick pro kontrolu neuložených změn
  await handleOrderClick(id);
  
  // ✅ Zavři panel po navigaci
  onClose?.();
}}>
  Ev.č.: {n.orderNumber || n.orderId}
</button>
```

**Co se děje:**
1. Extrahuje se `orderId` z notifikace
2. Zavolá se `handleOrderClick(orderId)`
3. Po dokončení se zavře NotificationsPanel

**Logy v konzoli:**
```
═══════════════════════════════════════════════════════════════════
🔔 [KROK 1/7] NotificationsPanel - handleOrderClick ZAVOLÁNA!
📋 Parametry: { orderId: 123, typeof: 'number' }
═══════════════════════════════════════════════════════════════════
```

---

### **KROK 2: Extrakce user_id a konverze ID**

**Soubor:** `src/components/panels/NotificationsPanel.js` (funkce `handleOrderClick`)

**Akce:** Převede orderId na integer a získá user_id z AuthContext

```javascript
const targetOrderId = parseInt(orderId);
const user_id = userDetail?.user_id;

if (!user_id) {
  // Bez user_id nemůžeme kontrolovat draft
  navigate(`/order-form-25?edit=${targetOrderId}`);
  return;
}
```

**Co se děje:**
1. Převede `orderId` na integer (ochrana proti stringům)
2. Získá `user_id` z `AuthContext.userDetail`
3. **Pokud není user_id:** Přejde rovnou na navigaci (KROK 7) bez kontroly draftu

**Logy v konzoli:**
```
🔔 [KROK 2/7] Extrakce user_id a konverze ID
📊 Data: { targetOrderId: 123, user_id: 45, userDetail exists: true }
```

**NEBO při chybějícím user_id:**
```
⚠️ [KROK 2/7] Bez user_id - přímá navigace bez kontroly draftu
🔗 Navigate URL: /order-form-25?edit=123
```

---

### **KROK 3: Kontrola existence draftu**

**Soubor:** `src/components/panels/NotificationsPanel.js` (funkce `handleOrderClick`)

**Služba:** `DraftManager` (`src/services/DraftManager.js`)

**Akce:** Zkontroluje, zda existuje rozpracovaná objednávka v localStorage

```javascript
draftManager.setCurrentUser(user_id);
const hasDraft = await draftManager.hasDraft();
```

**Co se děje:**
1. Nastaví aktuálního uživatele v DraftManager
2. Zkontroluje existenci klíče `order25_draft_new_{user_id}` v localStorage
3. Vrátí `true` pokud draft existuje, jinak `false`

**Logy v konzoli:**
```
🔔 [KROK 3/7] Začínám kontrolu draftu přes DraftManager
📦 DraftManager.setCurrentUser: 45
📦 DraftManager.hasDraft() - volám...
✅ [KROK 3/7] DraftManager.hasDraft() vrátil: true
```

**NEBO pokud draft neexistuje:**
```
✅ [KROK 4/7] Draft NEexistuje - přímá navigace
```

---

### **KROK 4: Načtení a kontrola ownership draftu**

**Soubor:** `src/components/panels/NotificationsPanel.js` (funkce `handleOrderClick`)

**Služba:** `DraftManager.loadDraft()`

**Akce:** Načte draft z localStorage a zkontroluje, zda patří k aktuální objednávce

```javascript
const draftData = await draftManager.loadDraft();

// 🎯 KONTROLA OWNERSHIP: Patří draft k TÉTO objednávce?
const draftOrderId = draftData.savedOrderId || draftData.formData?.id;
const currentOrderId = targetOrderId;

if (String(draftOrderId) === String(currentOrderId)) {
  // ✅ Draft patří k TÉTO objednávce
  shouldShowConfirmDialog = false;
  isDraftForThisOrder = true;
} else {
  // ❌ Draft patří k JINÉ objednávce
  const hasNewConcept = isValidConcept(draftData);
  const hasDbChanges = hasDraftChanges(draftData);
  shouldShowConfirmDialog = hasNewConcept || hasDbChanges;
}
```

**Co se děje:**
1. Načte celý draft z localStorage (formData + metadata)
2. Porovná `draftOrderId` s `currentOrderId` (ID objednávky, na kterou se chystáme navigovat)
3. **Pokud IDs jsou stejné:** Draft patří k této objednávce → přímá navigace (KROK 6)
4. **Pokud IDs jsou různé:** Draft patří k jiné objednávce → kontrola změn

**Logy v konzoli:**
```
🔔 [KROK 4/7] Draft existuje - načítám data
📦 DraftManager.loadDraft() - volám...
✅ [KROK 4/7] Draft načten: {
  má formData: true,
  má savedOrderId: true,
  savedOrderId: 456,
  formData.id: 456
}

🔔 [KROK 5/7] Porovnání ownership draftu
📊 POROVNÁNÍ ID: {
  draftOrderId: 456,
  currentOrderId: 123,
  String(draftOrderId): '456',
  String(currentOrderId): '123',
  jsou stejné?: false
}

❌ [KROK 5/7] Draft patří k JINÉ objednávce - kontroluji změny
📊 Analýza změn v draftu: { hasNewConcept: false, hasDbChanges: true }
```

---

### **KROK 5: Rozhodnutí - Dialog nebo navigace?**

**Soubor:** `src/components/panels/NotificationsPanel.js` (funkce `handleOrderClick`)

**Akce:** Rozhodne, zda zobrazit confirm dialog nebo navigovat přímo

#### **Varianta A: Draft patří k TÉTO objednávce**

```javascript
if (isDraftForThisOrder) {
  navigate(`/order-form-25?edit=${targetOrderId}`);
  return;
}
```

**Logy:**
```
🔔 [KROK 6/7] Draft pro TUTO objednávku - navigace BEZ dialogu
🔗 Navigate URL: /order-form-25?edit=123
═══════════════════════════════════════════════════════════════════
```

#### **Varianta B: Draft patří k JINÉ objednávce + má změny**

```javascript
if (shouldShowConfirmDialog && draftDataToStore) {
  const confirmResult = window.confirm(
    `⚠️ POZOR - Máte rozpracovanou objednávku s neuloženými změnami.\n\n` +
    `Přepnutím na jinou objednávku přijdete o neuložené změny!\n\n` +
    `Chcete pokračovat a zahodit neuložené změny?`
  );

  if (!confirmResult) {
    // Uživatel zrušil
    return;
  }

  // Uživatel potvrdil - smaž draft
  await draftManager.deleteAllDraftKeys();
}

navigate(`/order-form-25?edit=${targetOrderId}`);
```

**Logy:**
```
🔔 [KROK 6/7] Kontrola, zda zobrazit confirm dialog
📊 Před zobrazením dialogu: { shouldShowConfirmDialog: true, má draftDataToStore?: true }

🚨 [KROK 6/7] ZOBRAZUJI CONFIRM DIALOG
📋 Dialog data: { draftTitle: 'OBJ-2025-456', hasNewConcept: false }
⏸️  Čekám na rozhodnutí uživatele...
```

**Po rozhodnutí uživatele:**
```
🔔 [KROK 7/7] Rozhodnutí uživatele: ✅ ANO (pokračovat)
✅ [KROK 7/7] Uživatel potvrdil - mažu draft
✅ Draft smazán

🔔 [KROK 7/7] FINÁLNÍ NAVIGACE
🔗 Navigate URL: /order-form-25?edit=123
✅ Navigate zavoláno - předávám kontrolu React Routeru
═══════════════════════════════════════════════════════════════════
```

#### **Varianta C: Žádný draft nebo bez změn**

```javascript
navigate(`/order-form-25?edit=${targetOrderId}`);
```

**Logy:**
```
🔔 [KROK 7/7] FINÁLNÍ NAVIGACE
🔗 Navigate URL: /order-form-25?edit=123
✅ Navigate zavoláno - předávám kontrolu React Routeru
═══════════════════════════════════════════════════════════════════
```

---

### **KROK 6: React Router navigace + OrderForm25 mount**

**Soubory:**
- React Router (interní)
- `src/forms/OrderForm25.js`

**Akce:** React Router zpracuje navigaci a mountne OrderForm25 komponentu

```javascript
// OrderForm25.js - useEffect na editOrderId
useEffect(() => {
  console.log('📋 [OrderForm25 - MOUNT/EDIT CHANGE] useEffect na editOrderId');
  
  if (editOrderId) {
    console.log('🔄 [OrderForm25] editOrderId detekováno - resetuji stav formuláře');
    setIsDraftLoaded(false);
    setIsInitialized(false);
  }
}, [editOrderId]);
```

**Co se děje:**
1. React Router parsuje URL a extrahuje parametr `edit=123`
2. OrderForm25 se mountne (nebo re-renderuje s novým editOrderId)
3. useEffect na `editOrderId` se spustí a resetuje stav
4. Spustí se **useFormController** hook

**Logy v konzoli:**
```
═══════════════════════════════════════════════════════════════════
📋 [OrderForm25 - MOUNT/EDIT CHANGE] useEffect na editOrderId
📊 Parametry: {
  editOrderId: '123',
  typeof editOrderId: 'string',
  isDraftLoaded: false,
  isInitialized: false,
  location.search: '?edit=123'
}
═══════════════════════════════════════════════════════════════════

🔄 [OrderForm25] editOrderId detekováno - resetuji stav formuláře
📌 Reset flags: { isDraftLoaded: 'false', isInitialized: 'false' }
```

---

### **KROK 7: Inicializace formuláře a načtení dat**

**Soubory:**
- `src/forms/OrderForm25/hooks/useFormController.js`
- `src/forms/OrderForm25/hooks/useOrderDataLoader.js`

**Akce:** useFormController orchestruje načtení číselníků a dat objednávky

#### **7.1 useFormController - Spuštění inicializace**

```javascript
// useFormController.js - useEffect
useEffect(() => {
  console.log('🔄 useFormController: editOrderId changed:', editOrderId);
  
  const init = async () => {
    console.log('🚀 useFormController: Starting initialization for order:', editOrderId || 'NEW');
    
    // FÁZE 1: Načtení číselníků
    await currentDictionaries.loadAll();
    
    // FÁZE 2: Načtení dat objednávky
    if (editOrderId) {
      loadedData = await currentOrderDataLoader.loadOrderForEdit({
        orderId: editOrderId,
        archivovano: archivovanoParam === '1' ? 1 : 0
      });
    }
    
    // FÁZE 3: Callbacks
    if (currentOnDataLoaded) {
      currentOnDataLoaded(loadedData, sourceOrderId);
    }
  };
  
  init();
}, [editOrderId]);
```

**Logy:**
```
🔄 useFormController: editOrderId changed: 123 - Resetting ALL flags
🚀 useFormController: Starting initialization for order: 123
📚 useFormController: Starting dictionaries load...
✅ useFormController: Dictionaries loaded successfully
📝 useFormController: EDIT mode - loading order: 123
```

#### **7.2 useOrderDataLoader - Načtení z API**

```javascript
// useOrderDataLoader.js - loadOrderForEdit
const loadOrderForEdit = useCallback(async ({ orderId, archivovano = 0 }) => {
  console.log('📦 [useOrderDataLoader] loadOrderForEdit ZAVOLÁNO');
  
  // Volání API
  const dbOrder = await getOrderV2(orderId, token, username);
  
  // Transformace dat
  const transformedData = transformOrderData(dbOrder, dictionaries);
  
  return transformedData;
}, [token, username, dictionaries, transformOrderData]);
```

**Logy:**
```
═══════════════════════════════════════════════════════════════════
📦 [useOrderDataLoader] loadOrderForEdit ZAVOLÁNO
📊 Parametry: { orderId: 123, archivovano: 0, typeof orderId: 'string' }
═══════════════════════════════════════════════════════════════════

🔄 [useOrderDataLoader] Nastavuji loading flags
🌐 [useOrderDataLoader] Volám API getOrderV2...
📡 API parametry: { orderId: 123, token: '✓', username: 'jan.novak' }

✅ [useOrderDataLoader] API getOrderV2 vrátilo data
📊 Základní info o objednávce: {
  id: 123,
  cislo_objednavky: 'OBJ-2025-123',
  ev_cislo: 'OBJ-2025-123',
  má data: true
}

🔧 [useOrderDataLoader] Transformuji data z DB formátu na FE formát...
✅ [useOrderDataLoader] Transformace dokončena
📊 Transformovaná data: {
  id: 123,
  ev_cislo: 'OBJ-2025-123',
  predmet: 'Nákup kancelářského materiálu',
  stav_workflow_kod: ['SCHVALENA', 'ROZPRACOVANA']
}

═══════════════════════════════════════════════════════════════════
✅ [useOrderDataLoader] loadOrderForEdit ÚSPĚŠNĚ DOKONČENO
═══════════════════════════════════════════════════════════════════
```

#### **7.3 handleDataLoaded - Zpracování načtených dat**

```javascript
// OrderForm25.js - handleDataLoaded callback
const handleDataLoaded = useCallback(async (loadedData, sourceOrderId) => {
  console.log('🔄 handleDataLoaded: Processing order', loadedData?.id || 'NEW');
  
  // Nastavit formData
  setFormData(loadedData);
  
  // Označit jako načteno
  setIsDraftLoaded(true);
  setIsInitialized(true);
}, []);
```

**Logy:**
```
🔄 handleDataLoaded: Processing order 123
```

---

## ⚠️ Řešení problémů

### **Problem 1: "Processing order undefined"**

**Popis:** V konzoli se objeví `Processing order undefined` při F5 refresh stránky

**Příčina:** Pro novou objednávku (editOrderId = null) není definován `currentEditId`

```javascript
const currentEditId = editOrderId || loadedData?.id; // undefined pro NEW
```

**Řešení:** Přidat fallback na `'NEW'`

```javascript
const currentEditId = editOrderId || loadedData?.id || 'NEW';
console.log('🔄 handleDataLoaded: Processing order', 
  currentEditId === 'NEW' ? 'NEW (nová objednávka)' : currentEditId
);
```

### **Problem 2: Duplicitní načítání objednávky**

**Popis:** API getOrderV2 se volá 2x pro stejnou objednávku

**Příčina:** useEffect v useFormController se spouští při každé změně dependencies

**Řešení:** Lock flag `initLockRef.current` zabr braňuje duplicitnímu volání

```javascript
if (initLockRef.current) {
  console.log('⏸️ Init already in progress, skipping');
  return;
}
initLockRef.current = true;
```

### **Problem 3: Formulář zůstává v loading stavu**

**Popis:** Po načtení dat zůstává spinner viditelný

**Příčina:** `setIsDraftLoaded(true)` nebo `setIsInitialized(true)` se nenastaví

**Řešení:** V `handleDataLoaded` VŽDY nastavit oba flagy:

```javascript
setIsDraftLoaded(true);
setIsInitialized(true);
```

---

## 📊 Časová osa (typické délky)

| Krok | Akce | Typická doba |
|------|------|-------------|
| 1 | Kliknutí → handleOrderClick | <1ms |
| 2 | Extrakce user_id | <1ms |
| 3 | DraftManager.hasDraft() | 1-5ms |
| 4 | DraftManager.loadDraft() | 5-20ms |
| 5 | window.confirm() (pokud je potřeba) | Čeká na uživatele |
| 6 | React Router navigace | 10-50ms |
| 7.1 | loadAll() číselníky | 200-500ms |
| 7.2 | getOrderV2() API call | 100-300ms |
| 7.3 | handleDataLoaded callback | 10-50ms |
| **CELKEM** | **~350-950ms** (bez confirm) | |

---

## 🔍 Debug tipy

### **Jak debugovat problém v flow?**

1. **Otevři konzoli** (F12)
2. **Klikni na notifikaci** s objednávkou
3. **Sleduj logy** - každý krok má vlastní emoji prefix:
   - 🔔 = NotificationsPanel
   - 📦 = DraftManager
   - 📋 = OrderForm25
   - 🔄 = useFormController
   - 📦 = useOrderDataLoader

4. **Kontroluj, který krok selhal:**
   - Žádné logy = JavaScript error (check browser console errors)
   - Zastav se u určitého kroku = problem v té funkci
   - Duplicitní logy = možná re-render loop

### **Jak testovat různé scénáře?**

```javascript
// Scénář 1: Přechod na jinou objednávku (draft existuje)
// 1. Otevři objednávku #123
// 2. Udělej nějaké změny (NEukládej)
// 3. Klikni na notifikaci pro objednávku #456
// Očekávaný výsledek: Zobrazí se confirm dialog

// Scénář 2: Přechod na stejnou objednávku (draft existuje)
// 1. Otevři objednávku #123
// 2. Udělej nějaké změny (NEukládej)
// 3. Klikni na notifikaci pro objednávku #123
// Očekávaný výsledek: Přímá navigace BEZ dialogu

// Scénář 3: Přechod bez draftu
// 1. Vymaž localStorage nebo použij inkognito režim
// 2. Klikni na notifikaci
// Očekávaný výsledek: Přímá navigace
```

---

## 📚 Související dokumentace

- [DraftManager API](./DRAFT-MANAGER-API.md)
- [useFormController Hook](./USE-FORM-CONTROLLER.md)
- [Order V2 API](./API-V2-MIGRATION-ANALYSIS.md)
- [Workflow States](./WORKFLOW-STATES.md)

---

**Poslední aktualizace:** 28. listopadu 2025  
**Verze:** 1.0.0  
**Autor:** GitHub Copilot
