# 🔥 DRAFT WORKFLOW FIX - Quick Checklist

## ✅ Implementované změny

- [x] **Fix 1**: `DraftManager.syncWithDatabase()` - ukládá s `type='edit'` a `orderId`
- [x] **Fix 2**: `loadOrderForEdit()` - explicitně ukládá metadata
- [x] **Fix 3**: Načítání draftu - používá `hasDraft('edit', orderId)`
- [x] **Fix 4**: `loadNextOrderNumber()` - 3x kontrola před generováním
- [x] **Fix 5**: Načítání metadata - `savedOrderId` z metadata při mount

## 🧪 Testování (před commitem)

### Test 1: Nová objednávka - Draft persistence
- [ ] Otevři "Nová objednávka"
- [ ] Zkontroluj že se vygeneruje číslo (např. 2025-123)
- [ ] Vyplň předmět: "Test objednávka 1"
- [ ] Vyplň garanta
- [ ] Přejdi na Dashboard (nebo jinam)
- [ ] **OČEKÁVÁNO**: Draft se uloží jako `order25_draft_new_{userId}`
- [ ] Vrať se zpět na "Nová objednávka"
- [ ] **OČEKÁVÁNO**: Načte se draft s textem "Test objednávka 1"
- [ ] **OČEKÁVÁNO**: Číslo zůstane 2025-123 (NEVYGENERUJE se nové)

### Test 2: Editace objednávky - Fáze 2
- [ ] V seznamu objednávek klikni na řádek (např. objednávka 2025-045)
- [ ] **OČEKÁVÁNO**: Formulář se otevře s daty z DB
- [ ] **OČEKÁVÁNO**: Zobrazí se číslo 2025-045 (NE nové číslo!)
- [ ] Změň předmět na: "Upravená objednávka TEST"
- [ ] **F12 Console**: Zkontroluj `order25_draft_edit_45` (s orderId!)
- [ ] Přejdi na Dashboard
- [ ] Vrať se zpět na stejnou objednávku (klik na řádek 2025-045)
- [ ] **OČEKÁVÁNO**: Načte se text "Upravená objednávka TEST"
- [ ] **OČEKÁVÁNO**: Číslo zůstane 2025-045 (NEVYGENERUJE se nové)
- [ ] **F12 Console**: Zkontroluj log "✅ DRAFT PRO EDIT MODE nalezen"

### Test 3: Editace ve vyšších fázích - Fáze 7
- [ ] Najdi objednávku ve fázi 7 (KONTROLA VĚCNÉ SPRÁVNOSTI)
- [ ] Klikni na řádek v seznamu
- [ ] **OČEKÁVÁNO**: Formulář se otevře
- [ ] **OČEKÁVÁNO**: Číslo se NEVYGENERUJE znovu
- [ ] Vyplň "Umístění majetku": "TEST BUDOVA A123"
- [ ] Zaškrtni "Potvrzení věcné správnosti"
- [ ] Přejdi na Dashboard
- [ ] Vrať se zpět na stejnou objednávku
- [ ] **OČEKÁVÁNO**: Načte se "TEST BUDOVA A123"
- [ ] **OČEKÁVÁNO**: Checkbox zůstane zaškrtnutý
- [ ] **OČEKÁVÁNO**: Číslo zůstane stejné

### Test 4: F5 Refresh v EDIT mode
- [ ] Otevři objednávku v EDIT mode (např. ?edit=45)
- [ ] Udělej změnu v formuláři
- [ ] Stiskni F5 (refresh stránky)
- [ ] **OČEKÁVÁNO**: Načte se draft s neuloženou změnou
- [ ] **OČEKÁVÁNO**: `isEditMode` zůstane `true` (zkontroluj MenuBar)
- [ ] **OČEKÁVÁNO**: Číslo se NEVYGENERUJE znovu

### Test 5: Přepínání mezi objednávkami
- [ ] Otevři objednávku A (např. 2025-001)
- [ ] Udělej změnu
- [ ] Otevři objednávku B (např. 2025-002)
- [ ] **OČEKÁVÁNO**: Načte se objednávka B (NE draft od A!)
- [ ] Vrať se na objednávku A
- [ ] **OČEKÁVÁNO**: Načte se draft s neuloženou změnou
- [ ] **OČEKÁVÁNO**: Každá objednávka má svůj draft (A má draft_edit_1, B má draft_edit_2)

## 🐛 Co kontrolovat v F12 Console

### ✅ Pozitivní signály (měly by být vidět):

```
✅ [loadOrderForEdit] Draft saved with EDIT metadata
✅ [useState init] Načteny EDIT metadata z DraftManager
✅ [useEffect] Nastaveno savedOrderId z metadata
✅ [OrderForm25] DRAFT PRO EDIT MODE nalezen
⏭️ [loadNextOrderNumber] Skip - EDIT MODE detected from metadata
⏭️ [loadNextOrderNumber] Skip - already have ev_cislo
⏭️ [loadNextOrderNumber] Skip - editOrderId in URL
```

### ❌ Negativní signály (NESMÍ být vidět):

```
❌ "Generating new number for NEW order" (v EDIT mode!)
❌ "Draft BEZ neuložených změn" (mělo by použít draft vždy v EDIT)
❌ Absence metadata: editOrderId, savedOrderId
```

## 📊 LocalStorage - Co kontrolovat

### V F12 → Application → Local Storage:

**Pro NOVOU objednávku:**
```
order25_draft_new_123          ← Draft pro novou objednávku
order25_draft_new_123_metadata ← Metadata
order_form_isEditMode_123: "false"
```

**Pro EDITACI objednávky (ID=45):**
```
order25_draft_edit_45          ← Draft pro editaci objednávky ID 45
order25_draft_edit_45_metadata ← Metadata
order_form_isEditMode_123: "true"
order_form_savedOrderId_123: "45"
openOrderInConcept-123: "2025-045"
```

## 🚀 Po úspěšném testu

```bash
# Zkontroluj změny
git status

# Přidej soubory
git add src/services/DraftManager.js
git add src/forms/OrderForm25.js
git add CRITICAL-DRAFT-WORKFLOW-FIX.md
git add DRAFT-WORKFLOW-FIX-IMPLEMENTED.md
git add DRAFT-WORKFLOW-FIX-CHECKLIST.md

# Commit
git commit -m "🔥 CRITICAL FIX: Draft workflow pro edit mode

Opraveno 5 kritických problémů s draft managementem:

1. ✅ syncWithDatabase() nyní ukládá s type='edit' a orderId
2. ✅ loadOrderForEdit() explicitně ukládá metadata (editOrderId)
3. ✅ Načítání draftu při návratu používá correct type/orderId
4. ✅ loadNextOrderNumber() má 3x kontrolu před generováním
5. ✅ Metadata se načítají správně při mount

Důsledek:
- V edit mode se VŽDY použije draft (ne DB data)
- Číslo objednávky se NEVYGENERUJE znovu
- Draft se ukládá pod správným klíčem (edit_{orderId})
- Workflow funguje napříč všemi fázemi (1-8)

Testováno:
- ✅ Nová objednávka (draft persistence)
- ✅ Editace ve fázi 2 (návrat po změně)
- ✅ Editace ve fázi 7 (věcná správnost)
- ✅ F5 refresh v edit mode
- ✅ Přepínání mezi objednávkami"

# Push
git push
```

## 📝 Poznámky pro testování

### Tippy:

1. **Vyčisti localStorage před testem**: `localStorage.clear()` v console
2. **Sleduj Network tab**: Zkontroluj že se volá správné API (`/order/v2/...`)
3. **Sleduj Console logy**: Měly by být debug logy s `✅` a `⏭️`
4. **Testuj v inkognito**: Pro čistý stav bez cached dat

### Pokud něco nefunguje:

1. Zkontroluj localStorage klíče (měly by být `_edit_` ne `_new_`)
2. Zkontroluj metadata (`order_form_isEditMode_...` by mělo být `"true"`)
3. Zkontroluj Console logy (měly by ukazovat správný flow)
4. Vyčisti localStorage a zkus znovu

---

**Vytvořeno:** 30. října 2025  
**Status:** ⏳ ČEKÁ NA TESTOVÁNÍ  
**Priority:** 🔥 KRITICKÉ
