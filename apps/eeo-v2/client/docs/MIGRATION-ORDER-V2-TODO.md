# 🚀 Order V2 API Migration - TODOs

**Datum:** 29. října 2025  
**Status:** ✅ Fáze 1 & 2 hotovo, 🔄 Fáze 3 & 4 pending  
**Účel:** Kompletní migrace FE na Order V2 API se standardizovanými daty

---

## ✅ HOTOVO

### 1. Order V2 API Service ✅
**Soubor:** `src/services/apiOrderV2.js`

**Vytvořeno:**
- ✅ `getOrderV2(id, token, username)` - načtení objednávky
- ✅ `createOrderV2(data, token, username)` - vytvoření nové
- ✅ `updateOrderV2(id, data, token, username)` - update existující
- ✅ `deleteOrderV2(id, token, username)` - soft delete
- ✅ `listOrdersV2(filters, token, username)` - seznam s filtrováním
- ✅ `prepareDataForAPI(data)` - transformace FE → BE
- ✅ `validateOrderV2Data(data)` - validace struktury
- ✅ Error handling + auth interceptors

**Commit:** `cc281ba` - "feat: Add Order V2 API service with standardized data types"

---

### 2. useOrderDataLoader Hook ✅
**Soubor:** `src/forms/OrderForm25/hooks/useOrderDataLoader.js`

**Upraveno:**
- ✅ `loadOrderForEdit()` - používá `getOrderV2()` místo `getOrder25()`
- ✅ `transformOrderData()` - očekává V2 formát:
  - `strediska_kod`: array stringů (ne objekty!)
  - `financovani`: `{typ, nazev, lp_kody}` (ne `kod_stavu`!)
  - `druh_objednavky_kod`: string (ne objekt!)
  - `dodavatel_zpusob_potvrzeni`: `{zpusob_potvrzeni[], zpusob_platby}`
- ✅ Fallback logika pro starý formát (během migrace)
- ✅ Debug logging pro kontrolu

**Commit:** `5d930db` - "feat: Migrate useOrderDataLoader to Order V2 API"

---

## 🔄 PENDING - Třeba upravit

### 3. OrderForm25.js - Data Transformace
**Soubor:** `src/forms/OrderForm25.js` (22,475 řádků!)

**Problém:** Funkce `saveOrderToAPI()` (řádek ~6299) stále transformuje data do **STARÉHO formátu**:

#### ❌ STARÝ formát (aktuální kód):
```javascript
// Střediska - transformovat na objekty (STARÝ formát!)
const strediskaObjecty = formData.strediska_kod.map(kod => {
  const stredisko = strediskaOptions.find(opt => opt.value === kod);
  return {
    kod_stavu: stredisko?.kod || kod,
    nazev_stavu: stredisko?.nazev || kod
  };
});
orderData.strediska_kod = strediskaObjecty; // ❌ Pole objektů

// Financování (STARÝ formát!)
const financovaniObj = {
  kod_stavu: financovani?.kod_stavu || formData.zpusob_financovani,
  nazev_stavu: financovani?.nazev_stavu || formData.zpusob_financovani,
  doplnujici_data: {
    lp_kod: formData.lp_kod
  }
};
orderData.financovani = JSON.stringify(financovaniObj); // ❌ JSON string

// Druh objednávky (STARÝ formát!)
const druhObjednavkyObj = {
  kod_stavu: druhObj?.kod_stavu || formData.druh_objednavky_kod,
  nazev_stavu: druhObj?.nazev_stavu || formData.druh_objednavky_kod
};
orderData.druh_objednavky_kod = JSON.stringify(druhObjednavkyObj); // ❌ JSON string
```

#### ✅ NOVÝ V2 formát (potřeba implementovat):
```javascript
// Střediska - JEDNODUŠE pole stringů
if (formData.strediska_kod && formData.strediska_kod.length > 0) {
  orderData.strediska_kod = formData.strediska_kod.map(kod => String(kod).toUpperCase());
  addDebugLog('info', 'SAVE-V2', 'strediska', `V2: Střediska jako array stringů: ${JSON.stringify(orderData.strediska_kod)}`);
}

// Financování - objekt s typ, nazev, lp_kody (NE JSON string!)
if (formData.zpusob_financovani) {
  const financovani = financovaniOptions.find(opt => 
    opt.kod_stavu === formData.zpusob_financovani ||
    opt.kod === formData.zpusob_financovani
  );
  
  orderData.financovani = {
    typ: financovani?.kod_stavu || financovani?.kod || formData.zpusob_financovani,
    nazev: financovani?.nazev_stavu || financovani?.nazev || formData.zpusob_financovani
  };
  
  // Přidat lp_kody pokud je LP
  const nazev = orderData.financovani.nazev.toLowerCase();
  if (nazev.includes('limitovan') || nazev.includes('příslib')) {
    if (formData.lp_kod && formData.lp_kod.length > 0) {
      orderData.financovani.lp_kody = formData.lp_kod.map(k => Number(k));
    }
  }
  
  addDebugLog('info', 'SAVE-V2', 'financovani', `V2: Financování jako objekt: ${JSON.stringify(orderData.financovani)}`);
}

// Druh objednávky - JEDNODUŠE string
if (formData.druh_objednavky_kod) {
  const druhObj = druhyObjednavkyOptions.find(opt => 
    opt.kod_stavu === formData.druh_objednavky_kod ||
    opt.kod === formData.druh_objednavky_kod
  );
  
  orderData.druh_objednavky_kod = druhObj?.kod_stavu || druhObj?.kod || formData.druh_objednavky_kod;
  addDebugLog('info', 'SAVE-V2', 'druh', `V2: Druh objednávky jako string: "${orderData.druh_objednavky_kod}"`);
}

// Způsob potvrzení dodavatele - {zpusob_potvrzeni[], zpusob_platby}
if (formData.dodavatel_zpusob_potvrzeni) {
  orderData.dodavatel_zpusob_potvrzeni = {
    zpusob_potvrzeni: formData.dodavatel_zpusob_potvrzeni.zpusoby || [],
    zpusob_platby: formData.dodavatel_zpusob_potvrzeni.platba || ''
  };
}

// Money fields - VŽDY string!
if (formData.max_cena_s_dph !== undefined) {
  orderData.max_cena_s_dph = String(formData.max_cena_s_dph);
}
```

**📍 Kde upravit:**
- **Řádek ~6380-6420:** Střediska transformace
- **Řádek ~6430-6470:** Financování transformace  
- **Řádek ~6480-6500:** Druh objednávky transformace
- **Řádek ~6420:** Money fields (max_cena_s_dph)

---

### 4. OrderForm25.js - Save/Update Logika
**Soubor:** `src/forms/OrderForm25.js`

**Problém:** Funkce `saveOrderToAPI()` volá **STARÉ API funkce**:

#### ❌ STARÝ kód (aktuální):
```javascript
// Řádek ~6986 - CREATE
result = await createPartialOrder25({
  token,
  username,
  ...orderData
});

// Řádek ~7375 - UPDATE
result = await updatePartialOrder25({
  token,
  username,
  orderId: savedOrderId,
  ...orderData
});
```

#### ✅ NOVÝ V2 kód (potřeba implementovat):
```javascript
// 1. Import V2 API na začátku souboru (řádek ~50)
import { 
  // ... existing imports ...
} from '../services/api25orders';
import { 
  getOrderV2, 
  createOrderV2, 
  updateOrderV2 
} from '../services/apiOrderV2'; // ✨ NOVÝ IMPORT

// 2. Upravit saveOrderToAPI() - CREATE (řádek ~6986)
console.log('[OrderForm25] 📤 Creating order via V2 API...');
addDebugLog('info', 'SAVE-V2', 'create-start', 'Volám createOrderV2()');

result = await createOrderV2(orderData, token, username);

addDebugLog('info', 'SAVE-V2', 'create-success', `Order created: ID ${result.id}`);

// 3. Upravit saveOrderToAPI() - UPDATE (řádek ~7375)
console.log(`[OrderForm25] 📤 Updating order ${savedOrderId} via V2 API...`);
addDebugLog('info', 'SAVE-V2', 'update-start', `Volám updateOrderV2(${savedOrderId})`);

result = await updateOrderV2(savedOrderId, orderData, token, username);

addDebugLog('info', 'SAVE-V2', 'update-success', `Order ${savedOrderId} updated`);
```

**📍 Kde upravit:**
- **Řádek ~50:** Přidat import Order V2 API
- **Řádek ~6986:** Replace `createPartialOrder25()` → `createOrderV2()`
- **Řádek ~7375:** Replace `updatePartialOrder25()` → `updateOrderV2()`
- **Řádek ~12065:** Replace `updatePartialOrder25()` → `updateOrderV2()` (pokud tam je další volání)

---

## 🧪 TESTOVÁNÍ

### Test #5: Načtení existující objednávky
**ID:** 11201

**Postup:**
1. Otevřít existující objednávku s ID 11201
2. Zkontrolovat console logy:
   ```
   [useOrderDataLoader] Loading order 11201 via Order V2 API
   [OrderV2] GET /order-v2/11201
   [OrderV2] ✅ Order 11201 loaded successfully
   [useOrderDataLoader] Order V2 data received: {
     id: 11201,
     strediska_kod: ["KLADNO", "PRAHA"],
     financovani_typ: "LP",
     druh_objednavky_kod: "AUTA"
   }
   ```
3. **Očekávaný výsledek:**
   - ✅ Všechna pole správně zobrazena
   - ✅ Střediska jako array ["KLADNO", "PRAHA"]
   - ✅ Financování {typ: "LP", nazev: "...", lp_kody: [1]}
   - ✅ Druh objednávky jako string "AUTA"
   - ✅ max_cena_s_dph jako string "25000.00"

**Status:** 🔄 Čeká na dokončení Fáze 3 & 4

---

### Test #6: Ukládání změn
**Postup:**
1. Upravit objednávku 11201
2. Změnit střediska na ["PRAHA", "MOST"]
3. Změnit max_cena_s_dph na "50000.00"
4. Uložit
5. Zkontrolovat console logy:
   ```
   [OrderForm25] 📤 Updating order 11201 via V2 API...
   [SAVE-V2] strediska: V2: Střediska jako array stringů: ["PRAHA","MOST"]
   [SAVE-V2] financovani: V2: Financování jako objekt: {"typ":"LP","nazev":"Limitovaný příslib","lp_kody":[1]}
   [OrderV2] PUT /order-v2/11201/update
   [OrderV2] ✅ Order 11201 updated successfully
   ```
6. **Očekávaný výsledek:**
   - ✅ Data uložena v novém V2 formátu
   - ✅ Backend přijal data bez chyb
   - ✅ Reload zobrazuje správné hodnoty

**Status:** 🔄 Čeká na dokončení Fáze 3 & 4

---

### Test #7: Nová objednávka
**Postup:**
1. Vytvořit novou objednávku
2. Vyplnit:
   - Předmět: "Test V2 API"
   - Střediska: ["KLADNO"]
   - Financování: "ROZPOCET"
   - Druh: "AUTA"
   - Max cena: "10000.00"
3. Uložit
4. Zkontrolovat console logy:
   ```
   [OrderForm25] 📤 Creating order via V2 API...
   [SAVE-V2] create-start: Volám createOrderV2()
   [OrderV2] POST /order-v2/create
   [OrderV2] ✅ Order created with ID: 12345
   ```
5. **Očekávaný výsledek:**
   - ✅ Objednávka vytvořena
   - ✅ Získáno nové ID
   - ✅ Data uložena v V2 formátu
   - ✅ Redirect na edit s novým ID

**Status:** 🔄 Čeká na dokončení Fáze 3 & 4

---

## 📋 Checklist Kroků

### Fáze 3: FormData Transformace
- [ ] Upravit `saveOrderToAPI()` řádek ~6380 - střediska jako array stringů
- [ ] Upravit `saveOrderToAPI()` řádek ~6430 - financování jako objekt (ne JSON string)
- [ ] Upravit `saveOrderToAPI()` řádek ~6480 - druh objednávky jako string (ne JSON string)
- [ ] Upravit `saveOrderToAPI()` řádek ~6420 - money jako string
- [ ] Upravit `saveOrderToAPI()` - dodavatel_zpusob_potvrzeni jako {zpusob_potvrzeni[], zpusob_platby}
- [ ] Přidat debug logy pro kontrolu transformací
- [ ] Commit změn

### Fáze 4: Save/Update Logika
- [ ] Přidat import Order V2 API (řádek ~50)
- [ ] Replace `createPartialOrder25()` → `createOrderV2()` (řádek ~6986)
- [ ] Replace `updatePartialOrder25()` → `updateOrderV2()` (řádek ~7375)
- [ ] Replace další volání `updatePartialOrder25()` pokud existují (řádek ~12065)
- [ ] Přidat debug logy pro CREATE/UPDATE operace
- [ ] Commit změn

### Fáze 5-7: Testování
- [ ] Test #5: Načíst existující objednávku 11201
- [ ] Test #6: Upravit a uložit objednávku 11201
- [ ] Test #7: Vytvořit novou objednávku
- [ ] Zkontrolovat console logy - všechny operace přes V2 API
- [ ] Zkontrolovat DB - data v novém formátu
- [ ] Final commit s "feat: Complete Order V2 API migration"

---

## 🎯 Poznámky

### Důležité Změny
1. **Střediska:** `[{kod_stavu:"X"}]` → `["X","Y"]`
2. **Financování:** `{kod_stavu:"LP",doplnujici_data:{lp_kod:[1]}}` → `{typ:"LP",nazev:"...",lp_kody:[1]}`
3. **Druh:** `{kod_stavu:"AUTA"}` → `"AUTA"`
4. **Money:** `25000.00` (number) → `"25000.00"` (string)

### prepareDataForAPI Helper
Order V2 API má helper `prepareDataForAPI()` který:
- ✅ Zajistí že peníze jsou stringy
- ✅ Zajistí že střediska jsou array stringů
- ✅ Zajistí že financování má správnou strukturu
- ✅ Zajistí že druh je string

**→ Můžeš ho volat před odesláním:**
```javascript
import { prepareDataForAPI } from '../services/apiOrderV2';

const preparedData = prepareDataForAPI(orderData);
result = await createOrderV2(preparedData, token, username);
```

### Backward Compatibility
- Backend zachovává **oba endpointy**: `/orders25/*` (starý) + `/order-v2/*` (nový)
- `useOrderDataLoader` má **fallback logiku** pro starý formát
- Migrace je **postupná** - obě verze fungují současně

---

## 📚 Související Dokumenty
- **API Standardization:** `docs/API-DATA-TYPES-STANDARDIZATION.md`
- **Backend Testing:** `docs/api/API-TESTING-CHECKLIST.md`
- **Order V2 Service:** `src/services/apiOrderV2.js`
- **Hook Migrace:** `src/forms/OrderForm25/hooks/useOrderDataLoader.js`

---

**Další krok:** Dokončit Fázi 3 & 4 (úprava OrderForm25.js)
