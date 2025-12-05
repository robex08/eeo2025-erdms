# ✅ API Testing Checklist - Data Types Standardization

**Datum:** 29. října 2025  
**Pro:** Backend Developer  
**Účel:** Testování standardizovaného API před nasazením

---

## 🔍 Test Cases

### 1. GET /api/orders/:id - Načtení Objednávky

#### Test Case 1.1: Základní načtení
```bash
GET /api/orders/11201
```

**Očekávaný response:**
```json
{
  "status": "ok",
  "data": {
    "id": 11201,
    "cislo_objednavky": "O-1698/75030926/2025/IT",
    "predmet": "Nová objednávka",
    
    "strediska_kod": ["KLADNO"],  // ✅ Array stringů, NE objektů
    
    "financovani": {  // ✅ Přejmenované klíče
      "typ": "LP",
      "nazev": "Limitovaný příslib",
      "lp_kody": [1]
    },
    
    "druh_objednavky_kod": "AUTA",  // ✅ String, NE objekt
    
    "stav_workflow_kod": ["SCHVALENA", "ODESLANA", "POTVRZENA", "FAKTURACE", "KONTROLA", "ZKONTROLOVANA", "DOKONCENA"],
    
    "dodavatel_zpusob_potvrzeni": {  // ✅ Přejmenované klíče
      "zpusob_potvrzeni": ["email"],
      "zpusob_platby": "faktura"
    },
    
    "max_cena_s_dph": "25000.00",  // ✅ String, NE number!
    
    "uzivatel_id": 1,
    "garant_uzivatel_id": 100,
    "objednatel_id": 1,
    
    "aktivni": true,  // ✅ Boolean, NE 0/1
    "potvrzeni_dokonceni_objednavky": true
  }
}
```

**Kontrolní body:**
- [ ] `strediska_kod` je array stringů (ne objektů)
- [ ] `financovani.typ` existuje (ne `kod_stavu`)
- [ ] `financovani.nazev` existuje (ne `nazev_stavu`)
- [ ] `financovani.lp_kody` existuje (ne `doplnujici_data.lp_kod`)
- [ ] `druh_objednavky_kod` je string (ne objekt)
- [ ] `dodavatel_zpusob_potvrzeni.zpusob_potvrzeni` existuje (ne `zpusob`)
- [ ] `dodavatel_zpusob_potvrzeni.zpusob_platby` existuje (ne `platba`)
- [ ] `max_cena_s_dph` je string s 2 desetinnými místy
- [ ] Boolean hodnoty jsou true/false (ne 1/0)

---

#### Test Case 1.2: Objednávka s NULL hodnotami
```bash
GET /api/orders/{id_s_null_hodnotami}
```

**Očekávané chování:**
```json
{
  "garant_uzivatel_id": null,  // ✅ null je OK
  "dodavatel_id": null,
  "dt_schvaleni": null,
  "poznamka": null
}
```

**Kontrolní body:**
- [ ] NULL hodnoty jsou `null`, ne prázdný string `""`
- [ ] NULL hodnoty nejsou vynechané

---

### 2. POST /api/orders - Vytvoření Objednávky

#### Test Case 2.1: Minimální objednávka
```bash
POST /api/orders
Content-Type: application/json

{
  "predmet": "Test objednávka",
  "strediska_kod": ["KLADNO"],
  "max_cena_s_dph": "10000.00",
  "uzivatel_id": 1,
  "objednatel_id": 1,
  "druh_objednavky_kod": "AUTA",
  "financovani": {
    "typ": "ROZPOCET",
    "nazev": "Rozpočet"
  }
}
```

**Očekávaný response:**
```json
{
  "status": "ok",
  "data": {
    "id": 11234,
    "cislo_objednavky": "O-...",
    ...
  }
}
```

**Kontrolní body:**
- [ ] HTTP Status 201 Created
- [ ] Response obsahuje nové `id`
- [ ] Response obsahuje vygenerované `cislo_objednavky`
- [ ] Všechna data jsou správně uložena v DB

---

#### Test Case 2.2: Komplexní objednávka s LP
```bash
POST /api/orders
Content-Type: application/json

{
  "predmet": "Test LP objednávka",
  "strediska_kod": ["KLADNO", "PRAHA", "MOST"],
  "max_cena_s_dph": "50000.50",
  "uzivatel_id": 1,
  "objednatel_id": 1,
  "garant_uzivatel_id": 100,
  "druh_objednavky_kod": "IT",
  "financovani": {
    "typ": "LP",
    "nazev": "Limitovaný příslib",
    "lp_kody": [1, 5, 8]
  },
  "dodavatel_zpusob_potvrzeni": {
    "zpusob_potvrzeni": ["email", "telefon"],
    "zpusob_platby": "prevodka"
  }
}
```

**Kontrolní body:**
- [ ] Více středisek uloženo správně
- [ ] `lp_kody` array uložen správně
- [ ] Peněžní částka má 2 desetinná místa v DB
- [ ] Způsob potvrzení je array

---

### 3. PUT /api/orders/:id - Aktualizace Objednávky

#### Test Case 3.1: Změna středisek
```bash
PUT /api/orders/11201
Content-Type: application/json

{
  "strediska_kod": ["PRAHA", "MOST"]
}
```

**Kontrolní body:**
- [ ] Pouze `strediska_kod` je změněn
- [ ] Ostatní pole zůstávají nezměněna
- [ ] GET vrací nové střediska

---

#### Test Case 3.2: Změna financování z LP na ROZPOCET
```bash
PUT /api/orders/11201
Content-Type: application/json

{
  "financovani": {
    "typ": "ROZPOCET",
    "nazev": "Rozpočet"
  }
}
```

**Kontrolní body:**
- [ ] `lp_kody` je odstraněno (není potřeba pro ROZPOCET)
- [ ] `typ` a `nazev` jsou správně uloženy

---

#### Test Case 3.3: Změna ceny
```bash
PUT /api/orders/11201
Content-Type: application/json

{
  "max_cena_s_dph": "99999.99"
}
```

**Kontrolní body:**
- [ ] Cena je správně uložena s 2 desetinnými místy
- [ ] GET vrací string "99999.99"

---

### 4. Edge Cases

#### Test Case 4.1: Prázdné pole středisek
```bash
POST /api/orders
{
  "strediska_kod": []
}
```

**Očekávané chování:** Error nebo warning

---

#### Test Case 4.2: Nevalidní JSON v request
```bash
POST /api/orders
{
  "strediska_kod": "KLADNO"  // ❌ String místo array
}
```

**Očekávané chování:** HTTP 400 Bad Request

---

#### Test Case 4.3: Velmi velká částka
```bash
POST /api/orders
{
  "max_cena_s_dph": "999999999.99"
}
```

**Kontrolní body:**
- [ ] Částka je správně uložena
- [ ] Žádné zaokrouhlení nebo ztráta přesnosti

---

#### Test Case 4.4: Částka s více než 2 desetinnými místy
```bash
POST /api/orders
{
  "max_cena_s_dph": "1000.12345"
}
```

**Očekávané chování:** 
- Zaokrouhleno na "1000.12" nebo
- Error s upozorněním

---

## 🐛 Common Issues to Check

### Issue 1: JSON Parsing
```php
// ❌ ŠPATNĚ
$data = $row['strediska_kod']; // String, ne array

// ✅ SPRÁVNĚ
$data = json_decode($row['strediska_kod'], true); // Array
```

### Issue 2: Number Precision
```php
// ❌ ŠPATNĚ
$price = (float)$row['max_cena_s_dph']; // Ztráta přesnosti

// ✅ SPRÁVNĚ
$price = number_format($row['max_cena_s_dph'], 2, '.', ''); // String
```

### Issue 3: Boolean Conversion
```php
// ❌ ŠPATNĚ
$active = $row['aktivni']; // 0 nebo 1 (int)

// ✅ SPRÁVNĚ
$active = (bool)$row['aktivni']; // true nebo false
```

### Issue 4: NULL vs Empty String
```php
// ❌ ŠPATNĚ
$note = $row['poznamka'] ?? ''; // Prázdný string

// ✅ SPRÁVNĚ
$note = $row['poznamka']; // null pokud NULL v DB
```

---

## 📝 Postman Collection

### Environment Variables
```json
{
  "base_url": "http://localhost/api",
  "token": "your_auth_token",
  "test_order_id": "11201"
}
```

### Test Script Template
```javascript
// Postman Test Script
pm.test("Status is OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has status ok", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.status).to.eql("ok");
});

pm.test("strediska_kod is array", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.strediska_kod).to.be.an('array');
});

pm.test("max_cena_s_dph is string", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.max_cena_s_dph).to.be.a('string');
});

pm.test("aktivni is boolean", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.aktivni).to.be.a('boolean');
});
```

---

## 🔄 Rollback Plan

Pokud standardizace selže, BE musí mít připraven rollback:

```php
// Fallback režim - podporuje oba formáty
function standardizeOrderData($row) {
    // Pokud je nový formát, použij ho
    if (isNewFormat($row)) {
        return standardizeNew($row);
    }
    
    // Pokud je starý formát, konvertuj ho
    return convertOldToNew($row);
}
```

---

## ✅ Sign-off

**Backend Developer:**
- [ ] Všechny test cases prošly
- [ ] Edge cases jsou ošetřeny
- [ ] Performance je OK
- [ ] Dokumentace aktualizována

**Frontend Developer:**
- [ ] Načítání objednávek funguje
- [ ] Ukládání objednávek funguje
- [ ] TypeScript typy odpovídají
- [ ] Žádné konzolové errory

**Datum testování:** _____________  
**Tester:** _____________  
**Schváleno pro nasazení:** ☐ ANO ☐ NE

---

**Poznámky:**
