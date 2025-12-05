# 🏗️ Draft Management Refactoring Plan

## 🎯 Cíl
Centralizovat všechnu draft logiku do **DraftManager** s jedním klíčem pro všechna data.

---

## 📊 Současný stav (BEFORE)

### Problémy:
- ❌ **16+ různých localStorage klíčů** pro jeden draft
- ❌ **Fragmentovaná logika** - OrderForm25.js má 50+ přímých localStorage volání
- ❌ **Inconsistentní formáty** - `order25_scroll_` vs `order25-scroll-`
- ❌ **Duplikace** - 3 místa kde se maže draft (INSERT, UPDATE, deleteDraft)
- ❌ **Race conditions** - async operace před navigací
- ❌ **Těžká údržba** - změna klíče = změna na 10+ místech

### Klíče používané nyní:
```javascript
// UI State (8 klíčů)
order_form_isEditMode_{userId}
openOrderInConcept-{userId}
order_form_savedOrderId_{userId}
savedOrderId-{userId}              // ⚠️ duplikát!
highlightOrderId-{userId}
order25_scroll_{userId}
order25-scroll-{userId}            // ⚠️ duplikát!
order_form_sectionState_{userId}

// Phase 2 (2 klíče)
order25-phase2-unlocked-{userId}
phase2-unlocked-{userId}           // ⚠️ duplikát!

// Draft Data (6+ klíčů)
order25_draft_new_{userId}         // ⭐ hlavní
order25_draft_new_{userId}_metadata
order25_draft_new_{userId}_attachments
order25-draft-{userId}             // legacy
order_draft_{userId}               // legacy
order25_draft_{userId}             // legacy
```

---

## 🎨 Nový design (AFTER)

### Jeden klíč pro všechna data:
```javascript
// JEDINÝ klíč obsahující vše:
order25_state_{userId} = {
  // Draft data (šifrovaná)
  formData: { /* formData */ },
  
  // Metadata (šifrovaná)
  metadata: {
    isEditMode: boolean,
    savedOrderId: number|null,
    isOrderSavedToDB: boolean,
    isChanged: boolean,
    isConceptSaved: boolean,
    timestamp: number,
    version: 2  // ⭐ nová verze pro migraci
  },
  
  // UI state (šifrovaná)
  uiState: {
    scrollPosition: number,
    sectionState: object,
    phase2Unlocked: boolean,
    highlightOrderId: string|null,
    openConceptNumber: string|null
  },
  
  // Attachments (šifrovaná)
  attachments: []
}
```

### Nové DraftManager API:
```javascript
// === CORE OPERATIONS ===
draftManager.save({formData, metadata, uiState, attachments})
  → Uloží VŠE najednou synchronně

draftManager.load()
  → Načte {formData, metadata, uiState, attachments}
  → Automaticky migruje staré formáty
  → Vrátí null pokud draft neexistuje nebo je invalidated

draftManager.delete()
  → Smaže VŠECHNY klíče synchronně (nové i legacy)
  → Broadcast změny

draftManager.has()
  → true/false - existuje platný draft?

// === PARTIAL OPERATIONS ===
draftManager.getMetadata()
  → Rychlý přístup k metadata bez dešifrování celého draftu

draftManager.saveMetadata(metadata)
  → Aktualizuj pouze metadata (isEditMode, savedOrderId, atd.)

draftManager.saveUIState(uiState)
  → Aktualizuj pouze UI state (scroll, phase2, atd.)

// === MIGRATION ===
draftManager.migrate()
  → Automaticky detekuje a migruje staré formáty
  → Volá se při loadDraft() automaticky
```

---

## 🔄 Migrace starých klíčů

### Strategie:
1. **Při prvním loadDraft():**
   - Zkus načíst nový formát `order25_state_{userId}`
   - Pokud neexistuje → hledej legacy klíče
   - Najdi nejnovější draft ze starých formátů
   - Převeď do nového formátu
   - Ulož jako `order25_state_{userId}`
   - **Smaž staré klíče**

2. **Legacy formáty k migraci:**
   ```javascript
   // Priorita (od nejnovějšího):
   1. order25_draft_new_{userId} + _metadata + _attachments
   2. order25-draft-{userId}
   3. order_draft_{userId}
   4. order25_draft_{userId}
   
   // Plus UI klíče:
   - order_form_isEditMode_{userId}
   - openOrderInConcept-{userId}
   - order25_scroll_{userId} nebo order25-scroll-{userId}
   - atd.
   ```

---

## 📝 Implementační kroky

### 1️⃣ **order25DraftStorageService.js refactoring**
- [ ] Změnit `_getDraftKey()` → vrací `order25_state_{userId}`
- [ ] `saveDraft()` - uloží celý objekt {formData, metadata, uiState, attachments}
- [ ] `loadDraft()` - načte a migruje staré formáty automaticky
- [ ] `deleteDraft()` - smaže VŠECHNY klíče (nové + legacy)
- [ ] `_migrateLegacyDraft()` - nová privátní metoda pro migraci

### 2️⃣ **DraftManager.js update**
- [ ] Přidat `saveMetadata()` a `saveUIState()` metody
- [ ] Přidat `getMetadata()` pro rychlý přístup bez dešifrování
- [ ] Update existujících metod pro nový formát

### 3️⃣ **OrderForm25.js cleanup**
- [ ] Odstranit VŠECHNY přímé `localStorage.setItem/getItem/removeItem`
- [ ] Nahradit za `draftManager.save()`, `draftManager.load()`, atd.
- [ ] Sjednotit 3 místa mazání (INSERT, UPDATE, deleteDraft) → jeden `draftManager.delete()`
- [ ] Odstranit helper funkce pro draft management

### 4️⃣ **Layout.js update**
- [ ] Použít `draftManager` místo přímého `order25DraftStorageService`
- [ ] MenuBar logika - simplifikovat díky centralizaci

### 5️⃣ **Testing**
- [ ] Nová objednávka → autosave → reload → načte se
- [ ] Editace objednávky → autosave → reload → načte se v edit mode
- [ ] Zavřít formulář → draft smazán → reload → čistý stav
- [ ] F5 po uložení → žádný draft
- [ ] Migrace starých draftů → načte se správně

### 6️⃣ **Cleanup**
- [ ] Smazat deprecated utility funkce
- [ ] Smazat komentáře o legacy formátech
- [ ] Update dokumentace

---

## ✅ Benefits po refactoringu

- ✅ **Jeden klíč** místo 16+
- ✅ **Centralizovaná logika** - změny na 1 místě
- ✅ **Konzistentní formát** - žádné duplicity
- ✅ **Snadná údržba** - jasné API
- ✅ **Automatická migrace** - transparentní pro uživatele
- ✅ **Žádné race conditions** - synchronní operace
- ✅ **Lepší performance** - méně localStorage volání
- ✅ **Type safety** - jasná struktura dat

---

## 🎯 Success Criteria

1. **Zero přímých localStorage volání** v OrderForm25.js (kromě jiných features)
2. **Jeden klíč** `order25_state_{userId}` v localStorage per user
3. **Všechny testy projdou** - autosave, edit, close, F5
4. **Legacy drafty se migrují** automaticky při prvním načtení
5. **MenuBar správně zobrazuje** draft status
