# 🚨 KRITICKÝ PROBLÉM: Draft Management ve Fázi 2

## 📋 Popis problému

Když otevřu formulář ve fázi 2 (EDIT MODE):
1. ✅ Načtou se data z DB
2. ❌ Udělám změnu
3. ❌ Přejdu jinam (jiný odkaz v menu)
4. ❌ Vrátím se zpět na formulář
5. 💥 **ZAPOMENE data a VYGENERUJE NOVÉ ČÍSLO OBJ!**

### Proč k tomu dochází?

**ROOT CAUSE**: Draft management má **2 ZÁSADNÍ PROBLÉMY**:

#### Problém 1: Draft není správně persistován při editaci

```javascript
// V loadOrderForEdit() (řádek ~4826)
await draftManager.syncWithDatabase(freshDraft.formData, orderId);
```

**PROBLÉM**: `syncWithDatabase()` ukládá s `isChanged: false`, což způsobí, že při návratu se draft **IGNORUJE**!

```javascript
// DraftManager.js - syncWithDatabase()
async syncWithDatabase(updatedFormData, orderId) {
  const result = await order25DraftStorageService.saveDraft(this.currentUserId, updatedFormData, {
    metadata: {
      isChanged: false,  // ❌ TOTO JE PROBLÉM!
      isOrderSavedToDB: true,
      savedOrderId: orderId
    }
  });
}
```

Pak v OrderForm25.js (řádek ~3375):

```javascript
if (draftData && draftData.formData && draftData.isChanged === true) {
  // Přepsat formData draftem
} else {
  console.log('📊 Draft BEZ neuložených změn (isChanged=false) - ponechávám DB data');
  // ❌ IGNORUJE DRAFT!
}
```

#### Problém 2: Chybí `editOrderId` v metadata

```javascript
// syncWithDatabase() NEPOSÍLÁ editOrderId!
await order25DraftStorageService.saveDraft(this.currentUserId, updatedFormData, {
  metadata: {
    isChanged: false,
    isOrderSavedToDB: true,
    savedOrderId: orderId
    // ❌ CHYBÍ: editOrderId: orderId
  }
});
```

Důsledek:
- Draft se uloží jako `order25_draft_new_123` (NEW mode)
- Při návratu se hledá `order25_draft_edit_456` (EDIT mode s orderId)
- **NENAJDE SE** → načte se z DB → vygeneruje se NOVÉ ČÍSLO!

#### Problém 3: Generování nového čísla při každém načtení

```javascript
// loadNextOrderNumber() (řádek ~5878)
const loadNextOrderNumber = async () => {
  if (isEditMode) {
    return false;  // ✅ Mělo by skipnout
  }
  
  // ❌ ALE: isEditMode není správně nastaveno při návratu!
  const orderNumberData = await getNextOrderNumberV2(token, username);
  setFormData(prev => ({
    ...prev,
    ev_cislo: nextNumber  // 💥 PŘEPÍŠE ČÍSLO!
  }));
}
```

---

## 🎯 Řešení

### Fix 1: Opravit syncWithDatabase()

```javascript
// DraftManager.js
async syncWithDatabase(updatedFormData, orderId) {
  if (!this.currentUserId) {
    console.warn('🚫 [DraftManager] syncWithDatabase: No current user');
    return false;
  }

  try {
    // ✅ OPRAVA: Uložit s CORRECT metadata pro EDIT mode
    const result = await order25DraftStorageService.saveDraft(
      this.currentUserId, 
      updatedFormData, 
      {
        type: 'edit',           // ✅ EXPLICITNĚ edit
        orderId: orderId,       // ✅ S orderId
        metadata: {
          isChanged: false,     // Draft = DB snapshot (žádné pending změny)
          isOrderSavedToDB: true,
          savedOrderId: orderId,
          editOrderId: orderId, // ✅ PŘIDAT pro rozpoznání EDIT mode
          isEditMode: true      // ✅ PŘIDAT flag
        }
      }
    );

    if (result) {
      this._notifyDraftChange();
    }

    return result;
  } catch (error) {
    console.error('❌ [DraftManager] syncWithDatabase error:', error);
    return false;
  }
}
```

### Fix 2: Uložit editOrderId do metadata při načtení

```javascript
// OrderForm25.js - loadOrderForEdit() (řádek ~4826)
// ✅ Ulož draft přes DraftManager S EDIT METADATA
draftManager.setCurrentUser(user_id);
await draftManager.syncWithDatabase(freshDraft.formData, orderId);

// ✅ PŘIDAT: Explicitně ulož metadata pro EDIT mode
draftManager.saveMetadata({ 
  isEditMode: true,
  savedOrderId: orderId,
  editOrderId: orderId,  // ✅ KLÍČOVÉ!
  openConceptNumber: freshDraft.formData.ev_cislo || freshDraft.formData.cislo_objednavky
});
```

### Fix 3: Načíst metadata při mount

```javascript
// OrderForm25.js - useEffect pro isEditMode (řádek ~3590)
useEffect(() => {
  if (!user_id) return;
  
  try {
    // 🎯 Načíst z DraftManager
    const metadata = draftManager.getMetadata();
    
    if (metadata && metadata.isEditMode === true) {
      console.log('✅ Načteny EDIT metadata z DraftManager:', metadata);
      setIsEditMode(true);
      
      // ✅ PŘIDAT: Načíst i editOrderId
      if (metadata.editOrderId) {
        setSavedOrderId(metadata.editOrderId);
      }
    }
  } catch (error) {
    console.error('⚠️ Chyba při načítání metadata:', error);
  }
}, [user_id]);
```

### Fix 4: Zabránit generování nového čísla v EDIT mode

```javascript
// OrderForm25.js - loadNextOrderNumber() (řádek ~5878)
const loadNextOrderNumber = async () => {
  // ✅ PŘIDAT: Zkontrolovat i metadata
  const metadata = draftManager.getMetadata();
  const isInEditMode = isEditMode || metadata?.isEditMode === true;
  
  if (isInEditMode) {
    console.log('⏭️ Skip generating new number - EDIT MODE detected');
    return false;
  }
  
  // ✅ PŘIDAT: Pokud máme ev_cislo, skipnout
  if (formData.ev_cislo && formData.ev_cislo !== 'Načítám...') {
    console.log('⏭️ Skip generating new number - already have ev_cislo:', formData.ev_cislo);
    return false;
  }
  
  try {
    const orderNumberData = await getNextOrderNumberV2(token, username);
    const nextNumber = orderNumberData.next_order_string || orderNumberData.order_number_string || orderNumberData.next_number;
    
    if (!nextNumber) {
      throw new Error(`API nevrátilo next_order_string`);
    }
    
    // ✅ DOUBLE CHECK před nastavením
    if (isEditMode || metadata?.isEditMode === true) {
      console.warn('⚠️ Prevented overwriting ev_cislo in EDIT mode!');
      return false;
    }
    
    setFormData(prev => ({
      ...prev,
      ev_cislo: nextNumber
    }));
    
    return true;
  } catch (error) {
    return false;
  }
};
```

### Fix 5: Správné načítání draftu při návratu

```javascript
// OrderForm25.js - setTimeout v initializeForm() (řádek ~3358)
setTimeout(async () => {
  console.log('🔍 [OrderForm25] setTimeout SPUŠTĚN - kontrola draftu...', { editOrderId, user_id });
  if (editOrderId && user_id) {
    console.log('🔍 [OrderForm25] Podmínky splněny - načítám draft...');
    try {
      draftManager.setCurrentUser(user_id);
      
      // ✅ OPRAVA: Načíst draft S EXPLICITNÍM type='edit' a orderId
      const hasDraft = await draftManager.hasDraft('edit', editOrderId);
      console.log('🔍 [OrderForm25] hasDraft(edit, orderId)?', hasDraft);
      
      if (hasDraft) {
        const draftData = await draftManager.loadDraft('edit', editOrderId);
        console.log('🔍 [OrderForm25] Draft načten:', { 
          hasFormData: !!draftData?.formData, 
          isChanged: draftData?.isChanged,
          editOrderId: draftData?.orderId,
          ev_cislo: draftData?.formData?.ev_cislo
        });
        
        // ✅ OPRAVA: V EDIT mode VŽDY použít draft (i když isChanged=false)
        // Draft reprezentuje poslední known state pro tuto objednávku
        if (draftData && draftData.formData) {
          console.log('🔄 [OrderForm25] ✅ DRAFT PRO EDIT MODE nalezen - přepisuji formData');
          
          // Přepsat formData draftem, zachovat READ-ONLY pole z DB
          setFormData(prev => ({
            ...draftData.formData,
            // READ-ONLY pole se NEMĚNÍ
            id: prev.id || draftData.formData.id,
            datum_posledni_zmeny: prev.datum_posledni_zmeny || draftData.formData.datum_posledni_zmeny
          }));
          
          // ✅ PŘIDAT: Nastavit isChanged správně
          setIsChanged(draftData.isChanged === true);
          
          console.log('✅ [OrderForm25] formData přepsána draftem v EDIT mode');
        }
      } else {
        console.log('📊 [OrderForm25] Draft pro EDIT mode nenalezen - ponechávám DB data');
      }
    } catch (err) {
      console.error('⚠️ [OrderForm25] Chyba při kontrole draftu:', err);
    }
  }
}, 0);
```

---

## 🔄 Workflow Objednávky - Kompletní analýza

### Fáze 1: Vytvoření konceptu (NOVÁ objednávka)

**Akce:** Klik na "Nová objednávka"

**Workflow:**
1. `OrderForm25` mount
2. `initializeForm()` se zavolá s `editOrderId = null`
3. `loadNextOrderNumber()` → vygeneruje číslo (např. `2025-001`)
4. Uživatel vyplní formulář
5. **AUTOSAVE** → uloží draft jako `order25_draft_new_123`
   ```javascript
   {
     formData: { ev_cislo: '2025-001', predmet: '...', ... },
     isChanged: false,
     isOrderSavedToDB: false,
     timestamp: 1234567890,
     type: 'new',
     orderId: null
   }
   ```
6. Uživatel klikne "Uložit koncept"
7. `saveOrderToAPI()` → CREATE v DB → vrátí `order_id = 456`
8. Draft se aktualizuje:
   ```javascript
   {
     formData: { id: 456, ev_cislo: '2025-001', ... },
     isChanged: false,
     isOrderSavedToDB: true,
     savedOrderId: 456,
     type: 'new',  // ❌ PROBLÉM: Mělo by být 'edit'!
     orderId: null  // ❌ PROBLÉM: Mělo by být 456!
   }
   ```

**❌ CO JE ŠPATNĚ:**
- Po uložení do DB se draft NEPŘEPNE na `type: 'edit'`
- `orderId` zůstane `null` místo `456`
- Při návratu se hledá `order25_draft_new_123`, ale měl by se hledat `order25_draft_edit_456`

### Fáze 2: Editace objednávky

**Akce:** Klik na řádek objednávky v seznamu → otevře `?edit=456`

**Workflow:**
1. `OrderForm25` mount s `editOrderId = 456`
2. `initializeForm()` → načte z DB (order ID 456)
3. `loadOrderForEdit()` (řádek ~4504):
   ```javascript
   const dbOrder = await getOrderV2(editOrderId, token, username, true);
   // dbOrder = { id: 456, ev_cislo: '2025-001', stav_workflow_kod: '["SCHVALENA"]', ... }
   ```
4. Uloží draft:
   ```javascript
   await draftManager.syncWithDatabase(freshDraft.formData, orderId);
   // ❌ PROBLÉM: Ukládá jako 'new' místo 'edit'!
   // ❌ PROBLÉM: Ukládá s isChanged: false → při návratu se IGNORUJE!
   ```
5. Uživatel udělá změnu → AUTOSAVE
6. **Uživatel přejde jinam** (klikne na jiný odkaz)
7. Draft zůstává v localStorage
8. **Uživatel se vrátí zpět** (klikne na stejnou objednávku)
9. `OrderForm25` mount s `editOrderId = 456`
10. `initializeForm()` hledá draft:
    ```javascript
    const hasDraft = await draftManager.hasDraft();
    // ❌ PROBLÉM: hasDraft() hledá 'order25_draft_new_123' (bez orderId)
    // ✅ MĚLO BY: hasDraft('edit', 456) → hledat 'order25_draft_edit_456'
    ```
11. Draft NENAJDE → načte z DB znovu
12. `loadNextOrderNumber()` se zavolá → 💥 **VYGENERUJE NOVÉ ČÍSLO**!

### Fáze 3-8: Další kroky workflow

**Fáze 3:** ODESLÁNA DODAVATELI
**Fáze 4:** POTVRZENA DODAVATELEM
**Fáze 5:** REGISTROVÁNA (zapsána do knihy faktur)
**Fáze 6:** FAKTURACE (příchozí faktury)
**Fáze 7:** KONTROLA VĚCNÉ SPRÁVNOSTI
**Fáze 8:** DOKONČENA

**Problém se opakuje ve VŠECH FÁZÍCH!**

---

## 🛠️ Implementační plán

### Krok 1: Opravit DraftManager.syncWithDatabase()

**Soubor:** `src/services/DraftManager.js` (řádek ~661)

```javascript
async syncWithDatabase(updatedFormData, orderId) {
  if (!this.currentUserId) {
    console.warn('🚫 [DraftManager] syncWithDatabase: No current user');
    return false;
  }

  try {
    // ✅ OPRAVA: Uložit s CORRECT metadata pro EDIT mode
    const result = await order25DraftStorageService.saveDraft(
      this.currentUserId, 
      updatedFormData, 
      {
        type: 'edit',           // ✅ EXPLICITNĚ edit
        orderId: orderId,       // ✅ S orderId
        metadata: {
          isChanged: false,     // Draft = DB snapshot (žádné pending změny)
          isOrderSavedToDB: true,
          savedOrderId: orderId,
          editOrderId: orderId, // ✅ PŘIDAT pro rozpoznání EDIT mode
          isEditMode: true      // ✅ PŘIDAT flag
        }
      }
    );

    if (result) {
      console.log('✅ [DraftManager] syncWithDatabase: Draft synchronized with DB', {
        orderId,
        type: 'edit',
        isEditMode: true
      });
      this._notifyDraftChange();
    }

    return result;
  } catch (error) {
    console.error('❌ [DraftManager] syncWithDatabase error:', error);
    return false;
  }
}
```

### Krok 2: Opravit loadOrderForEdit()

**Soubor:** `src/forms/OrderForm25.js` (řádek ~4826)

```javascript
// ✅ Ulož draft přes DraftManager S EDIT METADATA
draftManager.setCurrentUser(user_id);
await draftManager.syncWithDatabase(freshDraft.formData, orderId);

// ✅ PŘIDAT: Explicitně ulož metadata pro EDIT mode
draftManager.saveMetadata({ 
  isEditMode: true,
  savedOrderId: orderId,
  editOrderId: orderId,  // ✅ KLÍČOVÉ!
  openConceptNumber: freshDraft.formData.ev_cislo || freshDraft.formData.cislo_objednavky
});

console.log('✅ [loadOrderForEdit] Draft saved with EDIT metadata:', {
  orderId,
  ev_cislo: freshDraft.formData.ev_cislo
});
```

### Krok 3: Opravit načítání draftu při návratu

**Soubor:** `src/forms/OrderForm25.js` (řádek ~3358)

```javascript
setTimeout(async () => {
  console.log('🔍 [OrderForm25] setTimeout SPUŠTĚN - kontrola draftu...', { editOrderId, user_id });
  if (editOrderId && user_id) {
    console.log('🔍 [OrderForm25] Podmínky splněny - načítám draft...');
    try {
      draftManager.setCurrentUser(user_id);
      
      // ✅ OPRAVA: Načíst draft S EXPLICITNÍM type='edit' a orderId
      const hasDraft = await draftManager.hasDraft('edit', editOrderId);
      console.log('🔍 [OrderForm25] hasDraft(edit, orderId)?', hasDraft);
      
      if (hasDraft) {
        const draftData = await draftManager.loadDraft('edit', editOrderId);
        console.log('🔍 [OrderForm25] Draft načten:', { 
          hasFormData: !!draftData?.formData, 
          isChanged: draftData?.isChanged,
          editOrderId: draftData?.orderId,
          ev_cislo: draftData?.formData?.ev_cislo
        });
        
        // ✅ OPRAVA: V EDIT mode VŽDY použít draft (i když isChanged=false)
        // Draft reprezentuje poslední known state pro tuto objednávku
        if (draftData && draftData.formData) {
          console.log('🔄 [OrderForm25] ✅ DRAFT PRO EDIT MODE nalezen - přepisuji formData');
          
          // Přepsat formData draftem, zachovat READ-ONLY pole z DB
          setFormData(prev => ({
            ...draftData.formData,
            // READ-ONLY pole se NEMĚNÍ
            id: prev.id || draftData.formData.id,
            datum_posledni_zmeny: prev.datum_posledni_zmeny || draftData.formData.datum_posledni_zmeny
          }));
          
          // ✅ PŘIDAT: Nastavit isChanged správně
          setIsChanged(draftData.isChanged === true);
          
          // ✅ PŘIDAT: Nastavit isEditMode
          setIsEditMode(true);
          
          console.log('✅ [OrderForm25] formData přepsána draftem v EDIT mode');
        }
      } else {
        console.log('📊 [OrderForm25] Draft pro EDIT mode nenalezen - ponechávám DB data');
      }
    } catch (err) {
      console.error('⚠️ [OrderForm25] Chyba při kontrole draftu:', err);
    }
  }
}, 0);
```

### Krok 4: Zabránit generování nového čísla

**Soubor:** `src/forms/OrderForm25.js` (řádek ~5878)

```javascript
const loadNextOrderNumber = async () => {
  // ✅ PŘIDAT: Zkontrolovat i metadata
  const metadata = draftManager.getMetadata();
  const isInEditMode = isEditMode || metadata?.isEditMode === true;
  
  if (isInEditMode) {
    console.log('⏭️ [loadNextOrderNumber] Skip - EDIT MODE detected from metadata');
    return false;
  }
  
  // ✅ PŘIDAT: Pokud máme ev_cislo, skipnout
  if (formData.ev_cislo && formData.ev_cislo !== 'Načítám...') {
    console.log('⏭️ [loadNextOrderNumber] Skip - already have ev_cislo:', formData.ev_cislo);
    return false;
  }
  
  // ✅ PŘIDAT: Pokud máme editOrderId v URL, skipnout
  const urlParams = new URLSearchParams(window.location.search);
  const editOrderId = urlParams.get('edit');
  if (editOrderId) {
    console.log('⏭️ [loadNextOrderNumber] Skip - editOrderId in URL:', editOrderId);
    return false;
  }
  
  try {
    // ✅ V2 API: GET next order number
    const orderNumberData = await getNextOrderNumberV2(token, username);
    const nextNumber = orderNumberData.next_order_string || orderNumberData.order_number_string || orderNumberData.next_number;
    
    if (!nextNumber) {
      throw new Error(`API nevrátilo next_order_string`);
    }
    
    // ✅ DOUBLE CHECK před nastavením
    if (isEditMode || metadata?.isEditMode === true || editOrderId) {
      console.warn('⚠️ [loadNextOrderNumber] Prevented overwriting ev_cislo in EDIT mode!');
      return false;
    }
    
    console.log('✅ [loadNextOrderNumber] Generating new number for NEW order:', nextNumber);
    
    setFormData(prev => ({
      ...prev,
      ev_cislo: nextNumber
    }));
    
    return true;
  } catch (error) {
    console.error('❌ [loadNextOrderNumber] Error:', error);
    return false;
  }
};
```

### Krok 5: Opravit načítání metadata

**Soubor:** `src/forms/OrderForm25.js` (řádek ~3590)

```javascript
useEffect(() => {
  if (!user_id) return;
  
  try {
    // 🎯 Načíst z DraftManager
    const metadata = draftManager.getMetadata();
    
    if (metadata && metadata.isEditMode === true) {
      console.log('✅ [useEffect] Načteny EDIT metadata z DraftManager:', metadata);
      setIsEditMode(true);
      
      // ✅ PŘIDAT: Načíst i editOrderId
      if (metadata.editOrderId || metadata.savedOrderId) {
        const orderId = metadata.editOrderId || metadata.savedOrderId;
        setSavedOrderId(orderId);
        console.log('✅ [useEffect] Nastaveno savedOrderId z metadata:', orderId);
      }
    }
  } catch (error) {
    console.error('⚠️ [useEffect] Chyba při načítání metadata:', error);
  }
}, [user_id]);
```

---

## ✅ Testovací scénář

### Test 1: Nová objednávka

1. Otevři "Nová objednávka"
2. ✅ Vygeneruje se číslo `2025-XXX`
3. Vyplň předmět, garanta
4. Přejdi jinam (např. na Dashboard)
5. Vrať se na "Nová objednávka"
6. ✅ **OČEKÁVÁNO**: Načte se draft s původním číslem `2025-XXX`
7. ✅ **NE**: Nevygeneruje se nové číslo

### Test 2: Editace objednávky ve fázi 2

1. V seznamu objednávek klikni na řádek (např. `2025-045`)
2. ✅ Otevře se formulář s daty z DB
3. ✅ Zobrazí se číslo `2025-045`
4. Změň předmět objednávky
5. Přejdi jinam (např. na Dashboard)
6. Vrať se na stejnou objednávku (klik na řádek)
7. ✅ **OČEKÁVÁNO**: Načte se změněný předmět
8. ✅ **OČEKÁVÁNO**: Číslo zůstane `2025-045`
9. ✅ **NE**: Nevygeneruje se nové číslo

### Test 3: Editace ve vyšších fázích (3-8)

1. Objednávka ve fázi 7 (KONTROLA VĚCNÉ SPRÁVNOSTI)
2. Klikni na řádek v seznamu
3. ✅ Otevře se formulář
4. Vyplň "Věcná správnost" pole
5. Přejdi jinam
6. Vrať se zpět
7. ✅ **OČEKÁVÁNO**: Načte se vyplněná věcná správnost
8. ✅ **OČEKÁVÁNO**: Číslo zůstane stejné
9. ✅ **NE**: Nevygeneruje se nové číslo

---

## 📊 Důležité poznámky

### Správné používání draft keys

```javascript
// ❌ ŠPATNĚ - všechny drafty pod jedním klíčem
order25_draft_new_123

// ✅ SPRÁVNĚ - separátní klíče pro NEW a EDIT
order25_draft_new_123      // Pro novou objednávku
order25_draft_edit_456     // Pro editaci objednávky ID 456
order25_draft_edit_789     // Pro editaci objednávky ID 789
```

### Správné používání metadata

```javascript
// ❌ ŠPATNĚ - metadata nejsou kompletní
{
  isEditMode: true,
  savedOrderId: 456
}

// ✅ SPRÁVNĚ - kompletní metadata
{
  isEditMode: true,
  savedOrderId: 456,
  editOrderId: 456,          // ✅ KLÍČOVÉ pro správné načtení
  openConceptNumber: '2025-045',
  isOrderSavedToDB: true
}
```

### Správné používání syncWithDatabase()

```javascript
// ❌ ŠPATNĚ - ukládá jako 'new' bez orderId
await draftManager.syncWithDatabase(formData, orderId);

// ✅ SPRÁVNĚ - ukládá jako 'edit' s orderId a metadata
// (toto je zajištěno v opravené verzi syncWithDatabase)
```

---

## 🎯 Priorita

**KRITICKÁ** - Tento bug brání správné práci s objednávkami ve všech fázích workflow!

**Doporučení**: Implementovat VŠECH 5 KROKŮ najednou, otestovat, pak commit.

---

## 📝 Checklist před commitem

- [ ] Fix 1: Opravit `DraftManager.syncWithDatabase()` 
- [ ] Fix 2: Opravit `loadOrderForEdit()` 
- [ ] Fix 3: Opravit načítání draftu při návratu
- [ ] Fix 4: Opravit `loadNextOrderNumber()` 
- [ ] Fix 5: Opravit načítání metadata
- [ ] Test 1: Nová objednávka (draft persistence)
- [ ] Test 2: Editace ve fázi 2 (návrat po změně)
- [ ] Test 3: Editace ve vyšších fázích (7-8)
- [ ] Otestovat autosave
- [ ] Otestovat přepínání mezi objednávkami
- [ ] Commit s popisem: "🔥 CRITICAL FIX: Draft workflow for edit mode"

---

**Vytvořeno:** 30. října 2025  
**Autor:** GitHub Copilot  
**Status:** ⚠️ ČEKÁ NA IMPLEMENTACI
