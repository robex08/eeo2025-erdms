# 🎯 UNIFIED DRAFT SYSTEM

## 📋 Koncept

**PŮVODNÍ PROBLÉM:**
- Drafty se ukládaly pod různými klíči (`draft_new`, `draft_edit`)
- Při přechodu z fáze 1 do fáze 2 se draft "ztratil"
- Složitá logika pro rozhodování který draft použít

**NOVÉ ŘEŠENÍ:**
- **JEDEN klíč pro všechny stavy**: `order25_draft_{userId}`
- Draft sám ví jestli jde o novou nebo editovanou objednávku
- Automatická migrace starých formátů

---

## 🔑 Unified Draft Klíč

### Struktura:

```
order25_draft_123                    ← Hlavní draft (šifrovaný)
order25_draft_123_metadata           ← Metadata (nešifrované)
order25_draft_123_attachments        ← Přílohy (šifrované)
```

### Draft obsahuje:

```javascript
{
  // ✅ Hlavní data
  formData: {
    id: 456,                          // null = nová, number = editace
    ev_cislo: "2025-045",
    predmet: "Test objednávka",
    // ... všechna další pole formuláře
  },
  
  // ✅ Metadata
  timestamp: 1234567890,
  step: 2,                            // Aktuální krok formuláře
  version: 2,                         // Verze draftu (2 = unified)
  savedOrderId: 456,                  // null = nová, number = editace
  
  // ✅ State tracking
  isChanged: true,                    // true = má pending změny
  isOrderSavedToDB: true,             // true = existuje v DB
  isEditMode: true,                   // true = editace existující
  
  // ✅ Invalidation (po uložení do DB)
  invalidated: false,
  invalidatedAt: null,
  invalidatedReason: null
}
```

---

## 🔄 Workflow - Jak to funguje

### FÁZE 1: Nová objednávka

**1. Uživatel klikne "Nová objednávka"**

```javascript
// Inicializace
formData = {
  ev_cislo: "2025-123",  // Vygenerované
  predmet: "",
  // ... prázdné pole
}

// Draft se uloží jako:
{
  formData: { ev_cislo: "2025-123", ... },
  savedOrderId: null,     // ✅ null = NOVÁ objednávka
  isEditMode: false,
  isOrderSavedToDB: false,
  isChanged: false
}
```

**2. Uživatel vyplní formulář a klikne "Uložit koncept"**

```javascript
// Po uložení do DB (INSERT) → backend vrátí order_id = 456
// Draft se aktualizuje:
{
  formData: { 
    id: 456,              // ✅ Z DB
    ev_cislo: "2025-123",
    predmet: "Test",
    // ...
  },
  savedOrderId: 456,      // ✅ Teď je to EDITACE
  isEditMode: true,       // ✅ Přepnuto na EDIT
  isOrderSavedToDB: true,
  isChanged: false        // ✅ Synchronizováno s DB
}
```

**3. Uživatel přejde jinam a vrátí se**

```javascript
// Draft se načte:
const draft = await draftManager.loadDraft();

// draft obsahuje:
{
  formData: { id: 456, ev_cislo: "2025-123", ... },
  savedOrderId: 456,      // ✅ Víme že jde o editaci
  isChanged: false
}

// Formulář se naplní daty z draftu
setFormData(draft.formData);
setIsEditMode(!!draft.savedOrderId);  // true
setSavedOrderId(draft.savedOrderId);   // 456
```

---

### FÁZE 2-8: Editace existující objednávky

**1. Uživatel klikne na řádek v seznamu (např. order ID=456)**

```javascript
// URL: /orders25-form?edit=456
// Načte se z DB přes getOrderV2(456)

const dbOrder = {
  id: 456,
  ev_cislo: "2025-045",
  predmet: "Původní text",
  stav_workflow_kod: '["SCHVALENA"]',
  // ...
}

// Uloží se jako draft:
await draftManager.syncWithDatabase(dbOrder, 456);

// Draft:
{
  formData: dbOrder,
  savedOrderId: 456,      // ✅ Editace
  isEditMode: true,
  isOrderSavedToDB: true,
  isChanged: false        // ✅ Synchronizováno s DB
}
```

**2. Uživatel udělá změnu**

```javascript
// Při změně pole (např. předmět):
handleInputChange('predmet', 'Upravený text');

// Draft se aktualizuje:
{
  formData: {
    id: 456,
    ev_cislo: "2025-045",
    predmet: "Upravený text",  // ✅ Změněno
    // ...
  },
  savedOrderId: 456,
  isChanged: true,              // ✅ Má pending změny!
  isOrderSavedToDB: true
}
```

**3. Uživatel přejde jinam (Dashboard)**

```javascript
// Draft zůstává v localStorage:
order25_draft_123 = { 
  formData: { predmet: "Upravený text" },
  savedOrderId: 456,
  isChanged: true  // ✅ Pending změny!
}
```

**4. Uživatel se vrátí na stejnou objednávku**

```javascript
// URL: /orders25-form?edit=456
// Nejdřív se načte z DB (pro získání lock info)
const dbOrder = await getOrderV2(456);

// Potom se zkontroluje draft:
const draft = await draftManager.loadDraft();

if (draft && draft.formData) {
  // ✅ POUŽIJE DRAFT (i když isChanged=false)
  setFormData(draft.formData);  // "Upravený text"
  setIsChanged(draft.isChanged); // true
}
```

---

## 🎯 Klíčové vlastnosti

### 1. **Automatická detekce režimu**

```javascript
// Draft sám ví jestli je to NEW nebo EDIT
const isEditMode = !!draft.savedOrderId;

if (draft.savedOrderId === null) {
  // Režim: NOVÁ OBJEDNÁVKA
  // - ev_cislo se generuje při mount
  // - formData.id = null
} else {
  // Režim: EDITACE EXISTUJÍCÍ
  // - ev_cislo se NEGENERUJE (už má)
  // - formData.id = savedOrderId
}
```

### 2. **Tracking změn**

```javascript
// isChanged určuje prioritu
if (draft.isChanged === true) {
  // ✅ Draft má pending změny → POUŽÍT DRAFT
  setFormData(draft.formData);
} else {
  // ✅ Draft = DB snapshot → použít stejně (reprezentuje known state)
  setFormData(draft.formData);
}

// Poznámka: V unified systému používáme draft VŽDY
```

### 3. **Synchronizace s DB**

```javascript
// Po uložení do DB:
await draftManager.syncWithDatabase(updatedFormData, orderId);

// Nastaví:
{
  formData: updatedFormData,  // Fresh data z DB
  savedOrderId: orderId,
  isChanged: false,           // ✅ Synchronizováno
  isOrderSavedToDB: true
}
```

---

## 🔧 API Reference

### DraftManager

```javascript
// ✅ UNIFIED API - bez parametrů type/orderId

// Zkontrolovat existenci draftu
const hasDraft = await draftManager.hasDraft();

// Načíst draft
const draft = await draftManager.loadDraft();

// Uložit draft (nová objednávka)
await draftManager.saveDraft(formData, {
  orderId: null,              // null = nová
  metadata: {
    isChanged: true,
    isOrderSavedToDB: false
  }
});

// Uložit draft (editace existující)
await draftManager.saveDraft(formData, {
  orderId: 456,               // number = editace
  metadata: {
    isChanged: true,
    isOrderSavedToDB: true,
    savedOrderId: 456,
    isEditMode: true
  }
});

// Synchronizovat s DB (po uložení)
await draftManager.syncWithDatabase(formData, orderId);

// Smazat draft
await draftManager.deleteDraft();
```

### order25DraftStorageService

```javascript
// ✅ UNIFIED API - zjednodušené parametry

// Uložit
await order25DraftStorageService.saveDraft(userId, formData, {
  orderId: 456,           // null = nová, number = editace
  step: 2,
  attachments: [],
  metadata: {
    isChanged: true,
    isEditMode: true
  }
});

// Načíst
const draft = await order25DraftStorageService.loadDraft(userId);

// Zkontrolovat existenci
const exists = await order25DraftStorageService.hasDraft(userId);

// Smazat
await order25DraftStorageService.deleteDraft(userId);
```

---

## 📊 Migrace starých formátů

### Automatická migrace při načtení

```javascript
// Pokud unified klíč neexistuje, zkusí legacy formáty:
const legacyKeys = [
  `order25_draft_${userId}`,          // ✅ Current (unified)
  `order25_draft_new_${userId}`,      // Legacy: separate new/edit
  `order25_draft_edit_${userId}`,     // Legacy: separate new/edit
  `order25-draft-${userId}`,          // Legacy format 1
  `order_draft_${userId}`             // Legacy format 2
];

// Načte první existující a migruje na unified formát
```

---

## ✅ Výhody unified systému

### 1. **Jednodušší logika**
- Jeden klíč místo několika
- Draft sám určuje režim (NEW vs EDIT)
- Žádné if/else pro rozhodování který draft použít

### 2. **Bezproblémový přechod mezi fázemi**
- Při uložení do DB se draft automaticky přepne na EDIT režim
- Zachová se číslo objednávky
- Zachovají se všechny změny

### 3. **Lepší tracking změn**
- `isChanged` jasně říká jestli má pending změny
- `savedOrderId` jasně říká jestli existuje v DB
- Žádné "ztracené" drafty při přechodu mezi fázemi

### 4. **Automatická migrace**
- Podporuje všechny starší formáty
- Při prvním načtení se migruje na unified formát

---

## 🧪 Testování

### Test 1: Nová objednávka

```
1. Otevři "Nová objednávka"
2. Vygeneruje se číslo 2025-XXX
3. Vyplň formulář
4. Klikni "Uložit koncept"
5. ✅ Draft se přepne na EDIT režim (savedOrderId = 456)
6. Přejdi jinam
7. Vrať se zpět
8. ✅ Načte se draft s číslem 2025-XXX (NEGENERUJE nové)
```

### Test 2: Editace existující

```
1. Klikni na objednávku 2025-045
2. Udělej změnu
3. Přejdi jinam
4. Vrať se zpět
5. ✅ Načte se draft s změnou
6. ✅ Číslo zůstane 2025-045 (NEGENERUJE nové)
```

### Test 3: Přechod NEW → EDIT

```
1. Vytvoř novou objednávku (2025-123)
2. ✅ Draft: savedOrderId = null
3. Ulož koncept → order_id = 456
4. ✅ Draft: savedOrderId = 456 (přepnuto na EDIT)
5. Přejdi jinam
6. Vrať se zpět
7. ✅ Načte se jako EDIT režim (isEditMode=true)
8. ✅ Číslo zůstane 2025-123
```

---

## 📝 Změněné soubory

1. **`src/services/order25DraftStorageService.js`**
   - `_getDraftKey()` → vrací unified klíč
   - `saveDraft()` → zjednodušené API (bez type)
   - `loadDraft()` → bez parametrů type/orderId
   - `hasDraft()` → bez parametrů
   - `deleteDraft()` → bez parametrů

2. **`src/services/DraftManager.js`**
   - `hasDraft()` → bez parametrů
   - `loadDraft()` → bez parametrů
   - `saveDraft()` → zjednodušené API
   - `deleteDraft()` → bez parametrů
   - `syncWithDatabase()` → používá unified API

3. **`src/forms/OrderForm25.js`**
   - Načítání draftu používá unified API
   - Automatická detekce režimu z `savedOrderId`

---

## 🚀 Implementováno

**Datum:** 30. října 2025  
**Status:** ✅ IMPLEMENTOVÁNO  
**Verze:** 2.0 (Unified Draft System)

---

**Co dál:**
1. Testovat všechny scénáře
2. Pokud funguje → commit
3. Smazat staré dokumenty (CRITICAL-DRAFT-WORKFLOW-FIX.md, atd.)
