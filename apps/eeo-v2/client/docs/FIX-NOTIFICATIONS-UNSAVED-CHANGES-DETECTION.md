# FIX: Detekce neuložených změn v notifikacích

**Datum:** 26. listopadu 2025  
**Branch:** LISTOPAD-VIKEND  
**Commit:** 2a0afef

---

## 🎯 PROBLÉM

Notifikace (zvonek a stránka notifikací) **NEPROVÁDĚLY KONTROLU** neuložených změn před otevřením objednávky. To vedlo k:

- ❌ **Okamžitému otevření** nové objednávky bez varování
- ❌ **Ztrátě dat** rozpracované objednávky
- ❌ **Nekonzistentnímu chování** oproti Orders25List

### Příklad problému:
1. Uživatel edituje objednávku A (neuložená změna)
2. Klikne na notifikaci pro objednávku B ze zvonečku
3. **OKAMŽITĚ** se otevře objednávka B
4. **ZTRÁTA DAT** - změny v objednávce A jsou pryč

---

## ✅ ŘEŠENÍ

Implementována **KOMPLETNÍ DETEKCE** neuložených změn podle vzoru z `Orders25List.js`.

### 1. NotificationsPanel.js (zvonek)

#### Před opravou:
```javascript
<button onClick={() => {
  // ROVNOU naviguje BEZ kontroly draftu!
  navigate('/orders-new');
}}>
  Ev.č.: {n.orderNumber}
</button>
```

#### Po opravě:
```javascript
<button onClick={async () => {
  const id = n.orderId || n.orderNumber;
  if (!id) return;
  
  // ✅ NOVÉ: Zavolej handleOrderClick pro kontrolu neuložených změn
  await handleOrderClick(id);
  
  // ✅ Zavři panel po navigaci
  onClose?.();
}}>
  Ev.č.: {n.orderNumber}
</button>
```

### 2. Nová funkce `handleOrderClick(orderId)`

Implementována podle **PŘESNÉHO VZORU** z `Orders25List.js`:

```javascript
const handleOrderClick = async (orderId) => {
  const targetOrderId = parseInt(orderId);
  const user_id = userDetail?.user_id;

  // 1️⃣ Kontrola user_id
  if (!user_id) {
    navigate(`/order-form-25?edit=${targetOrderId}`);
    return;
  }

  // 2️⃣ Načtení draftu
  draftManager.setCurrentUser(user_id);
  const hasDraft = await draftManager.hasDraft();

  // 3️⃣ Kontrola ownership
  if (hasDraft) {
    const draftData = await draftManager.loadDraft();
    const draftOrderId = draftData.savedOrderId || draftData.formData?.id;
    const currentOrderId = targetOrderId;

    // ✅ Pokud draft patří k TÉTO objednávce, naviguj bez ptaní
    if (String(draftOrderId) === String(currentOrderId)) {
      navigate(`/order-form-25?edit=${targetOrderId}`);
      return;
    }

    // ❌ Draft patří k JINÉ objednávce - zeptej se
    const hasNewConcept = isValidConcept(draftData);
    const hasDbChanges = hasDraftChanges(draftData);

    if (hasNewConcept || hasDbChanges) {
      const confirmResult = window.confirm(
        `⚠️ POZOR - Máte rozpracovanou objednávku s neuloženými změnami.\n\n` +
        `Přepnutím na jinou objednávku přijdete o neuložené změny!\n\n` +
        `Chcete pokračovat a zahodit neuložené změny?`
      );

      if (!confirmResult) {
        return; // Uživatel zrušil
      }

      // Uživatel potvrdil - smaž draft
      await draftManager.deleteAllDraftKeys();
    }
  }

  // 4️⃣ Naviguj na objednávku
  navigate(`/order-form-25?edit=${targetOrderId}`);
};
```

---

## 📦 ZMĚNY V SOUBORECH

### NotificationsPanel.js

#### Přidané importy:
```javascript
import { AuthContext } from '../../context/AuthContext';
import draftManager from '../../services/DraftManager';
import { isValidConcept, hasDraftChanges } from '../../utils/draftUtils';
```

#### Nové konstanty:
```javascript
const { userDetail } = useContext(AuthContext);
```

#### Nová funkce:
- `handleOrderClick(orderId)` - Kontrola neuložených změn

#### Upravený onClick handler:
- Async funkce
- Volání `handleOrderClick(id)`
- Zavření panelu po navigaci

---

## 🔍 LOGIKA KONTROLY

### 1. Kontrola user_id
```javascript
if (!user_id) {
  // Bez user_id nemůžeme kontrolovat draft
  navigate(`/order-form-25?edit=${targetOrderId}`);
  return;
}
```

### 2. Načtení draftu
```javascript
draftManager.setCurrentUser(user_id);
const hasDraft = await draftManager.hasDraft();
```

### 3. Kontrola ownership (patří draft k této objednávce?)
```javascript
const draftOrderId = draftData.savedOrderId || draftData.formData?.id;
const currentOrderId = targetOrderId;

if (String(draftOrderId) === String(currentOrderId)) {
  // ✅ Stejná objednávka - naviguj bez ptaní
  navigate(`/order-form-25?edit=${targetOrderId}`);
  return;
}
```

### 4. Kontrola změn v draftu (pokud je pro jinou objednávku)
```javascript
const hasNewConcept = isValidConcept(draftData);
const hasDbChanges = hasDraftChanges(draftData);

if (hasNewConcept || hasDbChanges) {
  // ⚠️ Zobraz confirm dialog
}
```

### 5. Confirm dialog
```javascript
const confirmResult = window.confirm(
  `⚠️ POZOR - Máte rozpracovanou objednávku s neuloženými změnami.\n\n` +
  `Přepnutím na jinou objednávku přijdete o neuložené změny!\n\n` +
  `Chcete pokračovat a zahodit neuložené změny?`
);

if (!confirmResult) {
  return; // Uživatel zrušil - zůstane na stránce
}

// Uživatel potvrdil - smaž draft a pokračuj
await draftManager.deleteAllDraftKeys();
```

---

## ✅ TESTOVACÍ SCÉNÁŘE

### 1. Test: Otevření JINÉ objednávky s neuloženými změnami

**Kroky:**
1. Otevři objednávku A na formuláři
2. Proveď změny (např. změň předmět)
3. Klikni na notifikaci pro objednávku B ze zvonečku

**Očekávaný výsledek:**
- ✅ Zobrazí se confirm dialog
- ✅ Text: "Máte rozpracovanou objednávku s neuloženými změnami"
- ✅ Možnost zrušit nebo pokračovat

### 2. Test: Otevření STEJNÉ objednávky

**Kroky:**
1. Otevři objednávku A na formuláři
2. Proveď změny
3. Klikni na notifikaci pro **STEJNOU** objednávku A

**Očekávaný výsledek:**
- ✅ NEPTAT SE - rovnou naviguj
- ✅ Zachovej neuložené změny

### 3. Test: Otevření objednávky BEZ neuložených změn

**Kroky:**
1. Otevři objednávku A
2. NEUDĚLEJ žádné změny
3. Klikni na notifikaci pro objednávku B

**Očekávaný výsledek:**
- ✅ NEPTAT SE - rovnou naviguj
- ✅ Žádný confirm dialog

### 4. Test: Potvrzení ztráty dat

**Kroky:**
1. Otevři objednávku A, udělej změny
2. Klikni na notifikaci pro objednávku B
3. V confirm dialogu klikni **"OK"**

**Očekávaný výsledek:**
- ✅ Draft se smaže
- ✅ Navigace na objednávku B
- ✅ Změny v objednávce A jsou ztraceny

### 5. Test: Zrušení přechodu

**Kroky:**
1. Otevři objednávku A, udělej změny
2. Klikni na notifikaci pro objednávku B
3. V confirm dialogu klikni **"Zrušit"**

**Očekávaný výsledek:**
- ✅ Zůstane na objednávce A
- ✅ Změny jsou zachovány
- ✅ Panel notifikací se nezavře

---

## 🎯 KONZISTENCE NAPŘÍČ APLIKACÍ

Nyní **VŠECHNY TŘI ENTRY POINTS** používají STEJNOU logiku:

| Entry Point | Kontrola draftu | Confirm dialog | Ownership check |
|------------|----------------|----------------|-----------------|
| **Orders25List** | ✅ | ✅ | ✅ |
| **NotificationsPage** | ✅ | ✅ | ✅ |
| **NotificationsPanel (zvonek)** | ✅ | ✅ | ✅ |

---

## 📝 CONSOLE LOGY

Pro debugging byly přidány logy:

```javascript
console.log('🔔 NotificationsPanel - handleOrderClick ZAVOLÁNA!', orderId);
console.log('🔍 NotificationsPanel - Začínám kontrolu draftu pro user_id:', user_id);
console.log('📋 NotificationsPanel - Má uživatel draft?', hasDraft);
console.log('🔍 NotificationsPanel - DEBUG POROVNÁNÍ ID:', { ... });
console.log('✅ Draft patří k TÉTO objednávce - naviguju bez ptaní');
console.log('❌ Draft patří k JINÉ objednávce - kontroluji změny');
console.log('📊 Změny v draftu:', { hasNewConcept, hasDbChanges });
console.log('⚠️ ZOBRAZUJI CONFIRM DIALOG');
console.log('👤 Uživatel odpověděl:', confirmResult ? 'ANO' : 'NE');
console.log('🚫 Uživatel zrušil - zůstávám na stránce');
console.log('✅ Uživatel potvrdil - mažu draft a naviguju');
```

---

## 🛡️ ERROR HANDLING

```javascript
try {
  // ... kontrola draftu ...
} catch (error) {
  console.error('❌ Kritická chyba v handleOrderClick:', error);
  // V případě chyby naviguj bez kontroly (fallback)
  navigate(`/order-form-25?edit=${targetOrderId}`);
}
```

---

## ✅ ZÁVĚR

**PŘED:**
- ❌ Ztráta dat při kliknutí na notifikaci
- ❌ Žádná ochrana neuložených změn
- ❌ Nekonzistentní chování

**PO:**
- ✅ Kompletní detekce neuložených změn
- ✅ Confirm dialog s varováním
- ✅ Inteligentní ownership check
- ✅ Konzistentní chování napříč aplikací
- ✅ Bezpečná navigace s ochranou dat

---

**Status:** ✅ HOTOVO  
**Testováno:** ⏳ Čeká na manuální test  
**Commit:** 2a0afef
