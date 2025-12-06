# Analýza tlačítka "Zavřít" v OrderForm25

**Datum:** 6. prosince 2025  
**Soubor:** `/apps/eeo-v2/client/src/forms/OrderForm25.js`  
**Funkce:** `handleCancelOrder`, `handleCancelConfirm`, `handleCancelCancel`

## 📋 Přehled

Tlačítko "Zavřít" slouží k uzavření formuláře objednávky a návratu na seznam objednávek. Chování se liší podle stavu objednávky a uživatelských práv.

---

## 🔍 Detailní analýza toku pro BĚŽNÉ UŽIVATELE (bez ADMIN práv)

### 1️⃣ **Kliknutí na tlačítko "Zavřít"**

**Funkce:** `handleCancelOrder` (řádky 14662-14730)

#### A) **Objednávka je DOKONČENÁ** (`isOrderCompleted = true`)
- ✅ **Zavře se OKAMŽITĚ bez potvrzení**
- 📦 Důvod: Objednávka je již uložená v DB, není co ztratit

**Postup:**
1. Zablokuje autosave: `draftManager.setAutosaveEnabled(false)`
2. Vyčistí všechna draft data z localStorage
3. Odstraní `activeOrderEditId` z localStorage
4. Odemkne objednávku v DB (pokud byla v editaci)
5. Nastaví unlock flag: `unlockOrderIdRef.current = null` (zabrání duplicitnímu odemykání)
6. Broadcast změnu stavu do jiných záložek
7. **Přesměruje na `/orders25-list` s `forceReload: true`**

#### B) **Objednávka NENÍ dokončená** (koncept/rozpracovaná)
- ⚠️ **Zobrazí se POTVRZOVACÍ DIALOG**
- 📝 Dialog obsahuje varování o neuložených změnách

**Kontrola před zobrazením dialogu:**
```javascript
// Zkontroluj neuložené a neklasifikované přílohy
const unsavedAttachments = attachments.filter(att =>
  !att.serverId && att.status !== 'uploaded' && !att.fromServer && att.file
);
const unclassifiedAttachments = attachments.filter(att =>
  !att.klasifikace || att.klasifikace.trim() === ''
);
```

**Obsah varování:**
- Základní text: "Koncept bude zrušen a neuložené změny nebudou uloženy."
- Pokud jsou neuložené přílohy: "+ X neuložených příloh"
- Pokud jsou neklasifikované přílohy: "+ Y neklasifikovaných příloh"

**Dialog:**
```jsx
<ConfirmDialog
  isOpen={showCancelConfirmModal}
  onConfirm={handleCancelConfirm}
  onClose={handleCancelCancel}
  title="Zavřít formulář"
  message={cancelWarningMessage}
  confirmText="Ano, zavřít"
  cancelText="Ne, pokračovat"
  isDangerous={true}
/>
```

---

### 2️⃣ **Potvrzení zavření** (`handleCancelConfirm`)

**Funkce:** `handleCancelConfirm` (řádky 14734-14838)

**Postup čištění a uzavírání:**

#### 🚨 KRITICKÁ FÁZE 1: Okamžité zastavení všech procesů
```javascript
// 1. OKAMŽITĚ zablokovat autosave
draftManager.setAutosaveEnabled(false, 'Form closing - prevent save during cleanup');

// 2. OKAMŽITĚ resetovat všechny saving stavy
setIsSaving(false);
setShowSaveProgress(false);
setSaveProgressText('');

// 3. Zrušit aktivní progress (pokud běží)
if (window._activeProgressControl) {
  window._activeProgressControl.cancel();
  window._activeProgressControl = null;
}

// 4. Nastavit flag pro unmount - zabráníme duplicitnímu unlock
unlockOrderIdRef.current = null;
```

#### 🧹 FÁZE 2: Vyčištění localStorage

**Používá centralizovaný DraftManager:**
```javascript
if (user_id) {
  draftManager.setCurrentUser(user_id);
  const deleted = await draftManager.deleteAllDraftKeys();
  
  // VERIFIKACE: Zkontroluj že draft opravdu neexistuje
  const stillHasDraft = await draftManager.hasDraft();
  if (stillHasDraft) {
    // Zkus znovu smazat
    await draftManager.deleteAllDraftKeys();
  }
}
```

**Co se maže z localStorage:**
- `order25_draft_{user_id}` - hlavní draft data
- `order25_draft_{user_id}_timestamp` - časové razítko
- `order25_draft_{user_id}_metadata` - metadata draftu
- `order25_draft_{user_id}_ui_state` - UI stav (scrollPos atd.)
- `activeOrderEditId` - ID editované objednávky

#### 🔓 FÁZE 3: Odemknutí objednávky v DB

```javascript
const unlockOrderId = sourceOrderIdForUnlock || savedOrderId;
if (unlockOrderId && token && username) {
  try {
    await unlockOrder25({ token, username, orderId: unlockOrderId });
    // ✅ Úspěch: Objednávka je odemknuta pro jiné uživatele
  } catch (error) {
    // ⚠️ Chyba se IGNORUJE - formulář se zavře i když odemykání selže
  }
}
```

**Proč graceful handling:**
- Pokud uživatel ztratí síťové připojení, formulář se musí zavřít i tak
- Backend automaticky odemkne objednávky po timeoutu (15 minut)
- Lepší UX - uživatel není blokován kvůli technickým problémům

#### 📡 FÁZE 4: Broadcast do jiných záložek

```javascript
try {
  broadcastDraftDeleted(user_id);
  
  // Počkej 50ms, aby se broadcast stihl zpracovat
  await new Promise(resolve => setTimeout(resolve, 50));
  
  window.dispatchEvent(new CustomEvent('orderDraftChange', {
    detail: {
      hasDraft: false,
      isEditMode: false,
      orderId: null,
      orderNumber: '',
      isLoading: false
    }
  }));
} catch (e) {
  // Chyba se loguje, ale NEBRÁNÍ zavření
}
```

**Účel broadcastu:**
- Aktualizuje MenuBar (tlačítko "Nová objednávka" místo "Editace")
- Informuje jiné záložky, že draft byl smazán
- Synchronizuje UI napříč všemi otevřenými okny

#### 🔄 FÁZE 5: Zavření dialogu a přesměrování

```javascript
// 1. Zavři confirm modal
setShowCancelConfirmModal(false);
setCancelWarningMessage('');

// 2. Přesměruj s 200ms zpožděním (aby se stihly dokončit async operace)
setTimeout(() => {
  navigate('/orders25-list', { state: { forceReload: true } });
}, 200);
```

**Proč 200ms zpoždění:**
- Dává čas broadcast operacím, aby se zpracovaly
- Zabraňuje race conditions při čištění localStorage
- Zlepšuje plynulost přechodu

---

### 3️⃣ **Zrušení zavření** (`handleCancelCancel`)

**Funkce:** `handleCancelCancel` (řádky 14840-14843)

```javascript
const handleCancelCancel = useCallback(() => {
  setShowCancelConfirmModal(false);
  setCancelWarningMessage('');
}, []);
```

- ✅ Jednoduché zavření dialogu
- ✅ Uživatel zůstává na formuláři
- ✅ Žádné změny v datech ani stavech

---

## 🎯 Klíčové rozdíly pro ADMIN vs BĚŽNÉHO UŽIVATELE

### Pro ADMIN uživatele:
- ✅ Může odemknout uzamčené sekce
- ✅ Může editovat dokončené objednávky
- ✅ Po uložení zůstává na formuláři (skipUnlock = true)
- ✅ Má přístup k pokročilým funkcím (Reset do Fáze 4, atd.)

### Pro BĚŽNÉ uživatele:
- ❌ Nemůže odemknout uzamčené sekce
- ❌ Nemůže editovat dokončené objednávky
- ✅ Po uložení se automaticky přesměruje na seznam
- ✅ Objednávka se automaticky odemkne
- ✅ Draft se automaticky smaže z localStorage

---

## 🔒 Bezpečnostní aspekty

### 1. **Prevence duplicitního odemykání**
```javascript
unlockOrderIdRef.current = null;
```
- Zabraňuje duplicitnímu odemykání v useEffect cleanup
- Důležité při rychlém zavírání formuláře

### 2. **Graceful handling chyb**
```javascript
catch (error) {
  // Ignoruj chybu odemykání - formulář se zavře i tak
}
```
- Uživatel není blokován při technických problémech
- Backend má timeout mechanismus jako fallback

### 3. **Atomické čištění dat**
- Používá centralizovaný DraftManager
- Verifikuje smazání (double-check)
- Broadcastuje změny do všech záložek

### 4. **Prevence race conditions**
```javascript
draftManager.setAutosaveEnabled(false, 'Form closing...');
setIsSaving(false);
window._activeProgressControl?.cancel();
```
- Okamžité zastavení všech procesů
- Prevence ukládání během čištění
- Zrušení běžícího progress baru

---

## 📊 Flow diagram

```
Kliknutí "Zavřít"
        │
        ├─── Je dokončená? ──► ANO ──► Okamžité zavření
        │                              ├─ Zablokuj autosave
        │                              ├─ Vyčisti localStorage
        │                              ├─ Odemkni v DB
        │                              ├─ Broadcast změnu
        │                              └─ Přesměruj na seznam
        │
        └─── NE (koncept)
                │
                ├─ Zkontroluj přílohy
                ├─ Zobraz confirm dialog
                │
                ├─── Uživatel potvrdí ──► handleCancelConfirm
                │                          ├─ [FÁZE 1] Stop všechny procesy
                │                          ├─ [FÁZE 2] Vyčisti localStorage
                │                          ├─ [FÁZE 3] Odemkni v DB
                │                          ├─ [FÁZE 4] Broadcast změnu
                │                          └─ [FÁZE 5] Přesměruj (200ms delay)
                │
                └─── Uživatel zruší ──► handleCancelCancel
                                        └─ Zůstat na formuláři
```

---

## ⚠️ Známé edge cases

### 1. **Ztráta připojení během zavírání**
- ✅ Formulář se zavře i když odemykání selže
- ✅ Backend odemkne automaticky po timeoutu
- ⚠️ Může trvat až 15 minut, než je objednávka dostupná

### 2. **Více otevřených záložek**
- ✅ Broadcast synchronizuje všechny záložky
- ✅ MenuBar se aktualizuje ve všech oknech
- ⚠️ 50ms delay může být nedostatečný při pomalém zařízení

### 3. **Přerušení během čištění**
- ✅ UnlockOrderIdRef zabraňuje duplicitnímu unlock
- ✅ Double-check verifikuje smazání draftu
- ⚠️ Velmi rychlé zavření může ponechat "ghost" data

---

## 🔧 Možná vylepšení

### 1. **Přidat loading indikátor do confirm dialogu**
```javascript
const [isClosing, setIsClosing] = useState(false);

// V handleCancelConfirm:
setIsClosing(true);
try {
  // ... cleanup operace
} finally {
  setIsClosing(false);
}
```

### 2. **Zvýšit broadcast delay pro pomalejší zařízení**
```javascript
// Z 50ms na 100ms
await new Promise(resolve => setTimeout(resolve, 100));
```

### 3. **Přidat retry mechanismus pro odemykání**
```javascript
async function unlockWithRetry(orderId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await unlockOrder25({ token, username, orderId });
      return true;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

---

## 📝 Závěr

Tlačítko "Zavřít" implementuje robustní čištění a uzavírání formuláře s těmito prioritami:

1. **Bezpečnost dat** - Žádná ztráta uložených dat
2. **Konzistence UI** - Synchronizace všech záložek
3. **Graceful degradation** - Funguje i při problémech
4. **Dobrý UX** - Plynulé přechody, jasné zpětné vazby

Pro **běžné uživatele** je proces automatizovaný a bezpečný, zatímco **ADMIN** má plnou kontrolu nad editací.
