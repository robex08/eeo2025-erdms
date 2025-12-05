# 📋 WORKFLOW DATA SYNCHRONIZATION - KOMPLEXNÍ PLÁN

**Datum:** 28.10.2025  
**Cíl:** Sjednotit způsob správy dat mezi FE a BE napříč všemi fázemi workflow (1-8)  
**Princip:** "Backend je single source of truth"

---

## 🎯 SOUČASNÝ PROBLÉM

### Nekonzistence v jednotlivých fázích:

| Fáze | Co se ukládá do DB | Co se vrací v response | Kde se drží změny před save |
|------|-------------------|----------------------|----------------------------|
| **1-6** | ✅ Všechna data | ✅ Celý záznam | localStorage (auto-save) |
| **7** | ⚠️ Jen checkbox + metadata | ⚠️ Částečná data | localStorage (textová pole) |
| **8** | ⚠️ Jen checkbox + metadata | ⚠️ Částečná data | localStorage (poznámka) |

### Problémy:
1. **Komplexní merge logika:** FE musí "hádat" co vzít z DB a co z konceptu
2. **Ztráta dat:** Po F5 se můžou ztratit neuložené změny, pokud koncept selže
3. **Nekonzistence:** Každá fáze se chová jinak
4. **Obtížná údržba:** Změny vyžadují úpravy na více místech
5. **Debugging nightmare:** Těžko se hledají chyby v synchronizaci

---

## ✅ CÍLOVÝ STAV - JEDNOTNÝ FLOW

```
┌─────────────────────────────────────────────────────────────┐
│                    JEDNOTNÝ DATOVÝ FLOW                      │
│                  (platí pro všechny fáze 1-8)                │
└─────────────────────────────────────────────────────────────┘

1. USER EDITACE
   ↓
   FE: Změna v React state (formData)
   ↓
   FE: Auto-save do localStorage (koncept) - každé 3s
   ↓
   
2. KLIK NA "ULOŽIT"
   ↓
   FE: POST/PUT všechna data na BE
   │   • Fáze 1: základní údaje
   │   • Fáze 2: dodavatel
   │   • Fáze 3: potvrzení
   │   • Fáze 4-6: fakturace
   │   • Fáze 7: věcná správnost (vše!)
   │   • Fáze 8: dokončení (vše!)
   ↓
   BE: Uloží do DB
   BE: Aktualizuje workflow stav
   BE: Vrátí CELÝ záznam (všechny fáze)
   ↓
   FE: Přepíše React state daty z BE response
   FE: Aktualizuje koncept s daty z BE (synchronizace)
   ↓
   
3. F5 REFRESH
   ↓
   FE: Načte koncept z localStorage
   ↓
   FE: Pokud koncept.isChanged === false:
       └─> Revalidace s DB (GET /api/orders/:id)
       └─> Přepíše koncept čerstvými daty z DB
   ↓
   FE: Zobrazí data (buď z konceptu nebo z DB)
```

---

## 📊 DETAILNÍ SPECIFIKACE PRO BE

### ⚠️ KRITICKÉ INFORMACE O PROSTŘEDÍ

**POZOR! Veškeré změny se provádějí na produkčním serveru s:**
- **PHP verze: 5.6** (starší syntax, bez moderních PHP 7+ features!)
- **MySQL verze: 5.5.43** (starší SQL syntax, bez JSON funkcí!)

**⚠️ DŮLEŽITÁ OMEZENÍ:**

#### PHP 5.6 omezení:
```php
// ❌ NELZE používat:
$data = $request->input('field') ?? 'default';  // Null coalescing operator
function getData(): array { }                    // Return type declarations
[$a, $b] = [1, 2];                              // Short array destructuring

// ✅ MÍSTO TOHO:
$data = isset($request['field']) ? $request['field'] : 'default';
function getData() { return array(); }
list($a, $b) = array(1, 2);
```

#### MySQL 5.5.43 omezení:
```sql
-- ❌ NELZE používat:
SELECT JSON_EXTRACT(data, '$.field')  -- JSON funkce (od MySQL 5.7)
ALTER TABLE ... ALGORITHM=INSTANT     -- Instant ALTER (od MySQL 8.0)

-- ✅ MÍSTO TOHO:
SELECT data FROM table WHERE id = ?   -- Parsovat JSON v PHP
ALTER TABLE ... -- Použít klasický ALTER (může trvat déle)
```

**✅ CHECKLIST PŘED KAŽDÝM DEPLOYM:**
- [ ] Otestovat na PHP 5.6 (nebo zajistit backwards compatibility)
- [ ] Ověřit MySQL syntaxi pro verzi 5.5
- [ ] Nepoužívat `[]` array syntax, jen `array()`
- [ ] Nepoužívat type hints u return values
- [ ] Nepoužívat null coalescing operator `??`
- [ ] Nepoužívat spaceship operator `<=>`
- [ ] Otestovat na DEV serveru před PROD nasazením

---

### 1. API ENDPOINTY - Response struktura

#### POST /api/orders (CREATE)
**Request body:**
```json
{
  // Fáze 1
  "garant_uzivatel_id": 100,
  "prikazce_id": 50,
  "strediska_kod": ["KLADNO", "PRAHA"],
  "predmet": "Nákup PC",
  "max_cena_s_dph": 25000.00,
  // ... další pole fáze 1
  
  // Fáze 7 - VĚCNÁ SPRÁVNOST
  "potvrzeni_vecne_spravnosti": 1,
  "potvrdil_vecnou_spravnost_id": 1,
  "dt_potvrzeni_vecne_spravnosti": "2025-10-28 10:30:00",
  "vecna_spravnost_umisteni_majetku": "Kancelář 204, PC na stole vlevo",
  "vecna_spravnost_poznamka": "Zařízení zkontrolováno, vše v pořádku",
  
  // Fáze 8 - DOKONČENÍ
  "potvrzeni_dokonceni_objednavky": 1,
  "dokoncil_id": 1,
  "dt_dokonceni": "2025-10-28 11:00:00",
  "dokonceni_poznamka": "Objednávka kompletní, proces ukončen"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    // ✅ VRÁTIT KOMPLETNÍ ZÁZNAM - všechna pole včetně:
    "id": 11200,
    "ev_cislo": "O-1697/75030926/2025/IT",
    "stav_workflow_kod": ["SCHVALENA", "ODESLANA"],
    
    // Fáze 1-6: všechna existující pole
    "garant_uzivatel_id": 100,
    // ...
    
    // ⭐ FÁZE 7 - VRÁTIT VŠE (včetně textových polí!)
    "potvrzeni_vecne_spravnosti": 1,
    "potvrdil_vecnou_spravnost_id": 1,
    "dt_potvrzeni_vecne_spravnosti": "2025-10-28 10:30:00",
    "vecna_spravnost_umisteni_majetku": "Kancelář 204, PC na stole vlevo",
    "vecna_spravnost_poznamka": "Zařízení zkontrolováno, vše v pořádku",
    
    // ⭐ FÁZE 8 - VRÁTIT VŠE (včetně poznámky!)
    "potvrzeni_dokonceni_objednavky": 1,
    "dokoncil_id": 1,
    "dt_dokonceni": "2025-10-28 11:00:00",
    "dokonceni_poznamka": "Objednávka kompletní, proces ukončen"
  }
}
```

#### PUT /api/orders/:id (UPDATE)
**Request body:** Stejný jako POST (všechna pole)

**Response (200 OK):** Stejný jako POST response

**⚠️ DŮLEŽITÉ:**
- Vracet **VŠECHNA pole** která byla uložena do DB
- Pokud pole je NULL v DB, vrátit `null` (ne prázdný string)
- Pokud pole není v request body, v DB ho nenastavovat na NULL (zachovat stávající hodnotu)

#### GET /api/orders/:id (LOAD)
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    // Stejná struktura jako POST/PUT response
    // ✅ VRÁTIT KOMPLETNÍ ZÁZNAM včetně Fáze 7 a 8
  }
}
```

---

### 2. DATABÁZOVÉ SLOUPCE

#### Tabulka: `objednavky`

**Fáze 7 sloupce (už existují):**
```sql
-- Checkbox a metadata
potvrzeni_vecne_spravnosti TINYINT(1) DEFAULT 0
potvrdil_vecnou_spravnost_id INT NULL
dt_potvrzeni_vecne_spravnosti DATETIME NULL

-- ⭐ Textová pole (OVĚŘIT, že existují!)
vecna_spravnost_umisteni_majetku TEXT NULL
vecna_spravnost_poznamka TEXT NULL
```

**Fáze 8 sloupce (už existují):**
```sql
-- Checkbox a metadata
potvrzeni_dokonceni_objednavky TINYINT(1) DEFAULT 0
dokoncil_id INT NULL
dt_dokonceni DATETIME NULL

-- ⭐ Poznámka (OVĚŘIT, že existuje!)
dokonceni_poznamka TEXT NULL
```

**⚠️ AKCE PRO BE:**
1. Ověřit, že všechny sloupce existují v DB
2. Pokud ne, vytvořit migraci
3. Aktualizovat INSERT/UPDATE queries, aby zapisovaly všechna pole
4. Aktualizovat SELECT queries, aby vracely všechna pole

---

### 3. BE ÚPRAVY - CHECKLIST

#### ✅ CREATE (POST /api/orders)
- [ ] Přijímat všechna pole včetně Fáze 7 a 8 textových polí
- [ ] Ukládat do DB všechna pole
- [ ] Vracet kompletní záznam v response (všechna pole)
- [ ] Testovat: Odeslat Fázi 7 s texty → Ověřit že se uložilo do DB

#### ✅ UPDATE (PUT /api/orders/:id)
- [ ] Přijímat všechna pole včetně Fáze 7 a 8 textových polí
- [ ] Aktualizovat v DB všechna pole
- [ ] Vracet kompletní záznam v response (všechna pole)
- [ ] Testovat: Změnit texty Fáze 7 → Ověřit že se aktualizovalo v DB

#### ✅ LOAD (GET /api/orders/:id)
- [ ] Vracet všechna pole včetně Fáze 7 a 8
- [ ] Testovat: Načíst záznam → Ověřit že má všechny Fáze 7 a 8 pole

#### ✅ PARTIAL UPDATE (pokud existuje)
- [ ] Stejná logika jako UPDATE
- [ ] Vracet kompletní záznam

---

## 📱 DETAILNÍ SPECIFIKACE PRO FE

### 1. ZMĚNY V OrderForm25.js

#### A) SAVE DO DB (INSERT i UPDATE)

**SOUČASNÝ STAV (ŠPATNĚ):**
```javascript
// ❌ Po uložení: Merge logika "co vzít z DB, co z formData"
const updatedFormDataImmediate = {
  ...formData,
  dokonceni_poznamka: formData.dokonceni_poznamka || '', // Merge!
  // ... komplikovaná logika
};
```

**NOVÝ STAV (SPRÁVNĚ):**
```javascript
// ✅ Po uložení: Použít VŠE z BE response
const updatedFormDataImmediate = {
  ...result.data  // Prostě vezmi všechno z BE!
};

// ✅ Aktualizovat koncept s čerstvými daty z DB
await draftManager.saveDraft(updatedFormDataImmediate, {
  step: getCurrentPhase(),
  attachments: attachments,
  metadata: {
    version: '1.4',
    isConceptSaved: true,
    isOrderSavedToDB: true,
    savedOrderId: result.data.id,
    isChanged: false, // Po DB save = false (žádné neuložené změny)
    dictionaries: { /* ... */ }
  }
});

// ✅ Aktualizovat React state
setFormData(result.data);
```

#### B) LOAD PO F5 (revalidateOrderWithDB)

**SOUČASNÝ STAV (ŠPATNĚ):**
```javascript
// ❌ Komplikovaný merge: Co vzít z DB, co z draftu
finalFormData = {
  ...dbOrderData,
  vecna_spravnost_poznamka: draftData.formData.vecna_spravnost_poznamka || dbOrderData.vecna_spravnost_poznamka,
  // ... 50 řádků merge logiky
};
```

**NOVÝ STAV (SPRÁVNĚ):**
```javascript
// ✅ Pokud draft není změněný (isChanged=false), revaliduj s DB
if (draftData.isOrderSavedToDB && !draftData.isChanged) {
  const dbOrderData = await revalidateOrderWithDB(draftData.savedOrderId);
  
  if (dbOrderData) {
    // Prostě vezmi VŠE z DB, žádný merge!
    finalFormData = dbOrderData;
    
    // Aktualizuj draft s čerstvými daty z DB
    await draftManager.saveDraft(dbOrderData, {
      /* metadata */
      isChanged: false
    });
  }
}

// ✅ Pokud draft JE změněný (isChanged=true), použij draft
if (draftData.isChanged) {
  finalFormData = draftData.formData;
  // Žádná revalidace s DB!
}
```

#### C) AUTO-SAVE (každé 3s)

**SOUČASNÝ STAV (SPRÁVNĚ - nechat):**
```javascript
// ✅ Auto-save funguje dobře
await draftManager.saveDraft(formData, {
  step: currentPhase,
  attachments: attachments,
  metadata: {
    isChanged: true, // Máme neuložené změny
    isOrderSavedToDB: true,
    savedOrderId: formData.id
  }
});
```

---

### 2. FE ÚPRAVY - CHECKLIST

#### ✅ SAVE DO DB (saveOrderToAPI)
- [ ] Odstranit složitou merge logiku z `updatedFormDataImmediate`
- [ ] Použít `result.data` přímo jako nový state
- [ ] Aktualizovat koncept s daty z DB (isChanged=false)
- [ ] Odstranit fallbacky typu `|| formData.xxx`
- [ ] Testovat: Uložit → F5 → Data jsou správná

#### ✅ LOAD (loadDraft → revalidateOrderWithDB)
- [ ] Odstranit merge logiku z `finalFormData`
- [ ] Pokud `isChanged=false`: použít DB data přímo
- [ ] Pokud `isChanged=true`: použít draft data
- [ ] Testovat: F5 po uložení → Načte se z DB
- [ ] Testovat: F5 před uložením → Načte se z draftu

#### ✅ AUTO-SAVE (saveDraft)
- [ ] Nechat jak je (funguje správně)
- [ ] Ověřit že `isChanged=true` při změnách

#### ✅ DEBUGOVÁNÍ
- [ ] Přidat logy pro tracking:
  - Co přišlo z BE (response)
  - Co se uložilo do draftu
  - Co se načetlo po F5
- [ ] Otestovat všechny fáze (1-8)

---

## 🧪 TESTOVACÍ SCÉNÁŘE

### Test 1: CREATE + Fáze 7 a 8
```
1. Vytvořit novou objednávku (Fáze 1-6)
2. Vyplnit Fázi 7:
   - Zaškrtnout checkbox
   - Vyplnit "Umístění majetku": "Kancelář 204"
   - Vyplnit "Poznámka": "Vše OK"
3. Vyplnit Fázi 8:
   - Vyplnit "Poznámka k dokončení": "Hotovo"
4. Kliknout ULOŽIT
5. ✅ Ověřit v DB:
   - vecna_spravnost_umisteni_majetku = "Kancelář 204"
   - vecna_spravnost_poznamka = "Vše OK"
   - dokonceni_poznamka = "Hotovo"
6. F5 (refresh)
7. ✅ Ověřit že se zobrazují správné hodnoty
```

### Test 2: UPDATE Fáze 7 a 8
```
1. Načíst existující objednávku
2. Změnit Fázi 7:
   - "Umístění majetku": "Změna: Kancelář 301"
3. Změnit Fázi 8:
   - "Poznámka": "Změna: Přesunuto"
4. Kliknout ULOŽIT
5. ✅ Ověřit v DB že se změny uložily
6. F5 (refresh)
7. ✅ Ověřit že se zobrazují nové hodnoty
```

### Test 3: F5 s neuloženými změnami
```
1. Načíst objednávku
2. Změnit Fázi 7: "Umístění": "Test"
3. Počkat 3s (auto-save do draftu)
4. F5 (BEZ uložení do DB)
5. ✅ Ověřit že změna "Test" je stále vidět
6. (Draft má isChanged=true, takže se nevaliduje s DB)
```

### Test 4: F5 po uložení (bez změn)
```
1. Načíst objednávku
2. Kliknout ULOŽIT (bez změn)
3. F5
4. ✅ Ověřit že se načetla z DB (revalidace)
5. (Draft má isChanged=false, provede se revalidace)
```

---

## 📋 IMPLEMENTAČNÍ KROKY

### FÁZE 1: BE ÚPRAVY (1-2 hodiny)
1. Ověřit DB sloupce (Fáze 7 a 8)
2. Upravit INSERT query (uložit všechna pole)
3. Upravit UPDATE query (aktualizovat všechna pole)
4. Upravit SELECT query (vrátit všechna pole)
5. Testovat: POST/PUT/GET všechna pole

### FÁZE 2: FE ÚPRAVY - SAVE (1 hodina)
1. Upravit `saveOrderToAPI` (INSERT i UPDATE)
2. Odstranit merge logiku
3. Použít `result.data` přímo
4. Aktualizovat draft s DB daty
5. Testovat: Uložit → Data jsou v DB i v draftu

### FÁZE 3: FE ÚPRAVY - LOAD (1 hodina)
1. Upravit `revalidateOrderWithDB`
2. Odstranit merge logiku
3. Použít DB data přímo (pokud isChanged=false)
4. Testovat: F5 po uložení → Načte z DB

### FÁZE 4: TESTOVÁNÍ (2 hodiny)
1. Test CREATE s Fází 7 a 8
2. Test UPDATE Fáze 7 a 8
3. Test F5 s neuloženými změnami
4. Test F5 po uložení
5. Test všech fází (1-8)
6. Regression testing

### FÁZE 5: CLEANUP (30 min)
1. Odstranit staré debug logy
2. Odstranit komentáře o "merge"
3. Přidat dokumentaci
4. Git commit + push

---

## ⚠️ RIZIKA A MITIGACE

| Riziko | Pravděpodobnost | Dopad | Mitigace |
|--------|----------------|-------|----------|
| Ztráta dat při refactoringu | Střední | Vysoký | Git backup + DB backup |
| BE nevrací všechna pole | Nízká | Vysoký | Testovat response struktur |
| FE cache problémy | Střední | Střední | Clear localStorage při deployi |
| Regression v Fázi 1-6 | Nízká | Vysoký | Testovat všechny fáze |

---

## ✅ DEFINITION OF DONE

- [ ] BE vrací všechna pole v response (včetně Fáze 7 a 8)
- [ ] FE ukládá všechna pole do DB
- [ ] FE načítá všechna pole z DB po F5
- [ ] Žádná merge logika v kódu
- [ ] Auto-save funguje (koncept jako backup)
- [ ] Všechny testy prošly
- [ ] Dokumentace aktualizována
- [ ] Code review dokončen
- [ ] Deployment na PROD

---

## 📚 REFERENCE

- **Git backup:** commit `662eabb` (28.10.2025)
- **Původní ticket:** Fáze 7 a 8 persistence fix
- **Dokumenty:**
  - `BACKEND-VECNA-SPRAVNOST-API-CHANGES.md`
  - `CACHE-BEST-PRACTICES.md`

---

**Připravil:** GitHub Copilot  
**Schválil:** ___________ (čeká na review)  
**Datum zahájení:** ___________ 
**Datum dokončení:** ___________
