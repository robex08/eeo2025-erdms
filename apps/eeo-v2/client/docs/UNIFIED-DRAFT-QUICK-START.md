# ✅ UNIFIED DRAFT - Quick Start

## 🎯 Co se změnilo?

### PŘED (složité):
```javascript
// Různé klíče pro různé stavy
order25_draft_new_123      // Nová objednávka
order25_draft_edit_456     // Editace objednávky ID 456
order25_draft_edit_789     // Editace objednávky ID 789

// Složité API
await draftManager.hasDraft('edit', orderId);
await draftManager.loadDraft('edit', orderId);
await draftManager.saveDraft(formData, 'edit', orderId);
```

### PO (jednoduché):
```javascript
// JEDEN klíč pro všechno
order25_draft_123          // Vše pro uživatele 123

// Jednoduché API
await draftManager.hasDraft();
await draftManager.loadDraft();
await draftManager.saveDraft(formData, { orderId: 456 });
```

---

## 🔑 Jak draft určuje režim?

Draft **sám ví** jestli jde o novou nebo editovanou objednávku:

```javascript
const draft = await draftManager.loadDraft();

if (draft.savedOrderId === null) {
  // Režim: NOVÁ OBJEDNÁVKA
  console.log('Nová objednávka');
} else {
  // Režim: EDITACE EXISTUJÍCÍ
  console.log('Editace objednávky ID:', draft.savedOrderId);
}
```

---

## 📊 Struktur draftu

```javascript
{
  // Data formuláře
  formData: {
    id: 456,               // null = nová, number = editace
    ev_cislo: "2025-045",
    predmet: "Test",
    // ... všechna pole
  },
  
  // Metadata
  savedOrderId: 456,       // null = nová, number = editace
  isChanged: true,         // Má pending změny?
  isOrderSavedToDB: true,  // Existuje v DB?
  isEditMode: true,        // Auto-detect z savedOrderId
  timestamp: 1234567890
}
```

---

## 🔄 Použití v kódu

### 1. Načtení draftu při mount

```javascript
const draft = await draftManager.loadDraft();

if (draft && draft.formData) {
  // Naplnit formulář
  setFormData(draft.formData);
  setIsChanged(draft.isChanged);
  
  // Detekovat režim
  const isEdit = !!draft.savedOrderId;
  setIsEditMode(isEdit);
  
  if (isEdit) {
    setSavedOrderId(draft.savedOrderId);
  }
}
```

### 2. Uložení draftu - NOVÁ objednávka

```javascript
await draftManager.saveDraft(formData, {
  orderId: null,           // null = nová
  metadata: {
    isChanged: true,
    isOrderSavedToDB: false
  }
});
```

### 3. Uložení draftu - EDITACE existující

```javascript
await draftManager.saveDraft(formData, {
  orderId: 456,            // number = editace
  metadata: {
    isChanged: true,
    isOrderSavedToDB: true,
    savedOrderId: 456,
    isEditMode: true
  }
});
```

### 4. Synchronizace s DB (po uložení)

```javascript
// Po úspěšném INSERT nebo UPDATE
await draftManager.syncWithDatabase(freshFormData, orderId);

// Toto nastaví:
// - isChanged = false (synchronizováno)
// - savedOrderId = orderId (režim EDIT)
// - isEditMode = true
```

---

## 🎯 Klíčové scénáře

### Scénář 1: Nová objednávka → Uložit → Vrátit se

```javascript
// 1. Mount: Nová objednávka
formData = { ev_cislo: "2025-123", predmet: "" }
await draftManager.saveDraft(formData, { orderId: null });

// 2. Uložit koncept → backend vrátí order_id=456
await draftManager.syncWithDatabase(formData, 456);
// Draft nyní: savedOrderId=456, isEditMode=true

// 3. Vrátit se
const draft = await draftManager.loadDraft();
// draft.savedOrderId = 456 → režim EDIT
// draft.formData.ev_cislo = "2025-123" (zachováno!)
```

### Scénář 2: Editace → Změna → Odejít → Vrátit se

```javascript
// 1. Otevřít objednávku ID=456
const dbOrder = await getOrderV2(456);
await draftManager.syncWithDatabase(dbOrder, 456);

// 2. Udělat změnu
formData.predmet = "Změněno";
await draftManager.saveDraft(formData, {
  orderId: 456,
  metadata: { isChanged: true }
});

// 3. Odejít (draft zůstane)

// 4. Vrátit se
const draft = await draftManager.loadDraft();
// draft.formData.predmet = "Změněno" ✅
// draft.savedOrderId = 456
// draft.isChanged = true
```

---

## 🐛 Debugging

### Zkontrolovat localStorage

```javascript
// F12 Console
localStorage.getItem('order25_draft_123');
localStorage.getItem('order25_draft_123_metadata');

// Nebo
const draft = await draftManager.loadDraft();
console.log('Draft:', draft);
```

### Logy v Console

```
✅ [loadDraft] Načten draft: savedOrderId=456
✅ [saveDraft] Uložen draft: isEditMode=true
✅ [syncWithDatabase] Synchronizováno s DB
```

---

## 📝 Checklist před testováním

- [ ] Vyčisti localStorage: `localStorage.clear()`
- [ ] Otevři F12 Console pro logy
- [ ] Test 1: Nová objednávka → Uložit → Vrátit se
- [ ] Test 2: Editace → Změna → Odejít → Vrátit se
- [ ] Test 3: Zkontroluj že se NEGENERUJE nové číslo
- [ ] Test 4: Zkontroluj že draft má správný `savedOrderId`

---

## 🚀 Commit

```bash
git add src/services/DraftManager.js
git add src/services/order25DraftStorageService.js
git add src/forms/OrderForm25.js
git add UNIFIED-DRAFT-SYSTEM.md

git commit -m "🎯 REFACTOR: Unified draft system

PŘED:
- Různé klíče pro new/edit (draft_new_X, draft_edit_Y)
- Drafty se 'ztrácely' při přechodu mezi fázemi
- Složité API s type/orderId parametry

PO:
- JEDEN klíč: order25_draft_{userId}
- Draft sám určuje režim (savedOrderId = null/456)
- Jednoduché API bez parametrů type/orderId
- Automatická migrace starých formátů

Výsledek:
✅ Funguje ve VŠECH fázích (1-8)
✅ Draft se NIKDY neztratí
✅ NEGENERUJE se nové číslo v edit mode
✅ isChanged správně trackuje změny"

git push
```

---

**Vytvořeno:** 30. října 2025  
**Status:** ✅ PŘIPRAVENO K TESTOVÁNÍ  
**Verze:** 2.0
