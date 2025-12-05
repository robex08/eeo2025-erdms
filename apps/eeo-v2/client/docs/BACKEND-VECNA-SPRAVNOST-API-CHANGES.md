# 🔧 Backend API změny pro Věcnou správnost (FÁZE 7 & 8)

**Datum:** 27. října 2025  
**Verze:** 1.0  
**Status:** ✅ DB sloupce již existují - potřebujeme jen aktualizovat API

---

## 📋 Přehled

Frontend je **plně připraven** pro práci s věcnou správností. DB sloupce **již existují** v tabulce `25a_objednavky`. Potřebujeme ověřit/aktualizovat následující API endpointy.

---

## 🗄️ Databázové sloupce (již existují v DB)

### Nové sloupce pro FÁZE 7 (Věcná správnost)

| Sloupec | Typ | Null | Default | Popis |
|---------|-----|------|---------|-------|
| `vecna_spravnost_umisteni_majetku` | TEXT | YES | NULL | Umístění majetku (volný text) |
| `vecna_spravnost_poznamka` | TEXT | YES | NULL | Poznámka k věcné správnosti |
| `potvrzeni_vecne_spravnosti` | TINYINT(1) | NO | 0 | ✅ Boolean checkbox (0/1) |
| `potvrdil_vecnou_spravnost_id` | INT(10) | YES | NULL | ID uživatele |
| `dt_potvrzeni_vecne_spravnosti` | DATETIME | YES | NULL | Datum/čas potvrzení |

### Existující sloupce pro FÁZE 8 (Dokončení)

| Sloupec | Typ | Null | Default | Popis |
|---------|-----|------|---------|-------|
| `potvrzeni_dokonceni_objednavky` | TINYINT(1) | NO | 0 | ✅ Boolean checkbox (0/1) |
| `dokoncil_id` | INT(10) | YES | NULL | ID uživatele |
| `dt_dokonceni` | DATETIME | YES | NULL | Datum/čas dokončení |
| `dokonceni_poznamka` | TEXT | YES | NULL | Poznámka |

---

## 🔌 API Endpointy k aktualizaci

### 1. `orders25/by-id` (Detail objednávky)

**Metoda:** POST  
**Endpoint:** `/orders25/by-id`

#### ✅ CO VRÁTIT:
```json
{
  "status": "ok",
  "data": {
    "id": 123,
    // ... existující pole ...
    
    // 🆕 FÁZE 7 - Věcná správnost
    "vecna_spravnost_umisteni_majetku": "Budova A, místnost 205",
    "vecna_spravnost_poznamka": "Poznámka k věcné správnosti",
    "potvrzeni_vecne_spravnosti": 1,
    "potvrdil_vecnou_spravnost_id": 42,
    "dt_potvrzeni_vecne_spravnosti": "2025-10-27 14:30:00",
    
    // 🆕 FÁZE 8 - Dokončení
    "potvrzeni_dokonceni_objednavky": 1,
    "dokoncil_id": 42,
    "dt_dokonceni": "2025-10-27 15:00:00",
    "dokonceni_poznamka": "Objednávka zkontrolována a dokončena"
  }
}
```

---

### 2. `orders25/update` (Plná aktualizace)

**Metoda:** POST  
**Endpoint:** `/orders25/update`

#### ✅ CO PŘIJMOUT:
```json
{
  "token": "...",
  "username": "...",
  "id": 123,
  
  // Existující pole...
  
  // 🆕 FÁZE 7 - Věcná správnost
  "vecna_spravnost_umisteni_majetku": "Budova A, místnost 205",
  "vecna_spravnost_poznamka": "Poznámka k věcné správnosti",
  "potvrzeni_vecne_spravnosti": 1,
  "potvrdil_vecnou_spravnost_id": 42,
  "dt_potvrzeni_vecne_spravnosti": "2025-10-27 14:30:00",
  
  // 🆕 FÁZE 8 - Dokončení
  "potvrzeni_dokonceni_objednavky": 1,
  "dokoncil_id": 42,
  "dt_dokonceni": "2025-10-27 15:00:00",
  "dokonceni_poznamka": "Objednávka zkontrolována a dokončena"
}
```

#### 🔧 LOGIKA V PHP:

```php
// 🆕 FÁZE 7 - Věcná správnost
if (isset($data['vecna_spravnost_umisteni_majetku'])) {
    $updateFields[] = "`vecna_spravnost_umisteni_majetku` = ?";
    $params[] = $data['vecna_spravnost_umisteni_majetku'];
}

if (isset($data['vecna_spravnost_poznamka'])) {
    $updateFields[] = "`vecna_spravnost_poznamka` = ?";
    $params[] = $data['vecna_spravnost_poznamka'];
}

if (isset($data['potvrzeni_vecne_spravnosti'])) {
    $updateFields[] = "`potvrzeni_vecne_spravnosti` = ?";
    $params[] = (int)$data['potvrzeni_vecne_spravnosti'];
}

if (isset($data['potvrdil_vecnou_spravnost_id'])) {
    $updateFields[] = "`potvrdil_vecnou_spravnost_id` = ?";
    $params[] = (int)$data['potvrdil_vecnou_spravnost_id'];
}

if (isset($data['dt_potvrzeni_vecne_spravnosti'])) {
    $updateFields[] = "`dt_potvrzeni_vecne_spravnosti` = ?";
    $params[] = $data['dt_potvrzeni_vecne_spravnosti'];
}

// 🆕 FÁZE 8 - Dokončení
if (isset($data['potvrzeni_dokonceni_objednavky'])) {
    $updateFields[] = "`potvrzeni_dokonceni_objednavky` = ?";
    $params[] = (int)$data['potvrzeni_dokonceni_objednavky'];
}

if (isset($data['dokoncil_id'])) {
    $updateFields[] = "`dokoncil_id` = ?";
    $params[] = (int)$data['dokoncil_id'];
}

if (isset($data['dt_dokonceni'])) {
    $updateFields[] = "`dt_dokonceni` = ?";
    $params[] = $data['dt_dokonceni'];
}

if (isset($data['dokonceni_poznamka'])) {
    $updateFields[] = "`dokonceni_poznamka` = ?";
    $params[] = $data['dokonceni_poznamka'];
}
```

---

### 3. `orders25/update-partial` (Částečná aktualizace)

**Metoda:** POST  
**Endpoint:** `/orders25/update-partial`

#### ✅ STEJNÁ LOGIKA jako `orders25/update`

Musí podporovat aktualizaci jednotlivých polí bez nutnosti posílat celou objednávku.

---

### 4. `orders25/create-partial` (Částečné vytvoření)

**Metoda:** POST  
**Endpoint:** `/orders25/create-partial`

#### ⚠️ POZNÁMKA:
Pro nové objednávky budou všechna nová pole defaultně:
- TEXT pole: `NULL`
- TINYINT(1) pole: `0`
- INT pole: `NULL`
- DATETIME pole: `NULL`

**Není potřeba speciální úprava**, DB již má správné defaulty.

---

## 🔄 Workflow logika

### FÁZE 7 → FÁZE 8 automatika

Frontend automaticky řídí workflow:

```javascript
// ✅ FÁZE 7: Při zaškrtnutí "Potvrzuji věcnou správnost"
if (potvrzeni_vecne_spravnosti === 1) {
  // Automaticky nastaví:
  potvrdil_vecnou_spravnost_id = current_user_id
  dt_potvrzeni_vecne_spravnosti = NOW()
  
  // Odebere KONTROLA z workflow
  stav_workflow_kod = array_filter(stav_workflow_kod, 'KONTROLA')
}

// ✅ FÁZE 8: Při zaškrtnutí "Potvrzuji dokončení objednávky"
if (potvrzeni_dokonceni_objednavky === 1 && 
    potvrzeni_vecne_spravnosti === 1 &&
    faktury.length > 0) {
  
  // Automaticky nastaví:
  dokoncil_id = current_user_id
  dt_dokonceni = NOW()
  
  // Přidá DOKONCENA do workflow
  stav_workflow_kod.push('DOKONCENA')
}
```

**Backend nemusí tuto logiku implementovat** - frontend to řeší a posílá už kompletní data.

---

## ✅ Checklist pro Backend team

### orders25/by-id
- [ ] Vrací `vecna_spravnost_umisteni_majetku`
- [ ] Vrací `vecna_spravnost_poznamka`
- [ ] Vrací `potvrzeni_vecne_spravnosti`
- [ ] Vrací `potvrdil_vecnou_spravnost_id`
- [ ] Vrací `dt_potvrzeni_vecne_spravnosti`
- [ ] Vrací `potvrzeni_dokonceni_objednavky`
- [ ] Vrací `dokoncil_id`
- [ ] Vrací `dt_dokonceni`
- [ ] Vrací `dokonceni_poznamka`

### orders25/update
- [ ] Přijímá a ukládá `vecna_spravnost_umisteni_majetku`
- [ ] Přijímá a ukládá `vecna_spravnost_poznamka`
- [ ] Přijímá a ukládá `potvrzeni_vecne_spravnosti` (INT)
- [ ] Přijímá a ukládá `potvrdil_vecnou_spravnost_id` (INT)
- [ ] Přijímá a ukládá `dt_potvrzeni_vecne_spravnosti` (DATETIME)
- [ ] Přijímá a ukládá `potvrzeni_dokonceni_objednavky` (INT)
- [ ] Přijímá a ukládá `dokoncil_id` (INT)
- [ ] Přijímá a ukládá `dt_dokonceni` (DATETIME)
- [ ] Přijímá a ukládá `dokonceni_poznamka`

### orders25/update-partial
- [ ] Stejné jako orders25/update
- [ ] Podporuje částečnou aktualizaci (jen vyplněná pole)

### orders25/create-partial
- [ ] Defaultní hodnoty jsou nastaveny v DB
- [ ] Žádná speciální úprava není potřeba

---

## 🧪 Testování

### Test 1: Načtení objednávky
```bash
curl -X POST "http://your-api/orders25/by-id" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "...",
    "username": "...",
    "id": 123
  }'
```

**Očekávaný výsledek:** Odpověď obsahuje všechna nová pole včetně `potvrzeni_vecne_spravnosti` a `potvrzeni_dokonceni_objednavky`.

### Test 2: Uložení věcné správnosti
```bash
curl -X POST "http://your-api/orders25/update" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "...",
    "username": "...",
    "id": 123,
    "vecna_spravnost_umisteni_majetku": "Budova A",
    "vecna_spravnost_poznamka": "Test poznámky",
    "potvrzeni_vecne_spravnosti": 1,
    "potvrdil_vecnou_spravnost_id": 42,
    "dt_potvrzeni_vecne_spravnosti": "2025-10-27 14:30:00"
  }'
```

**Očekávaný výsledek:** 
```json
{
  "status": "ok",
  "message": "Objednávka byla úspěšně aktualizována"
}
```

### Test 3: Potvrzení dokončení
```bash
curl -X POST "http://your-api/orders25/update" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "...",
    "username": "...",
    "id": 123,
    "potvrzeni_dokonceni_objednavky": 1,
    "dokoncil_id": 42,
    "dt_dokonceni": "2025-10-27 15:00:00",
    "stav_workflow_kod": "[\"PRIPRAVA\",\"SCHVALENO\",\"ODESLANO\",\"POTVRZENO\",\"REGISTR\",\"FAKTURACE\",\"DOKONCENA\"]"
  }'
```

**Očekávaný výsledek:** 
```json
{
  "status": "ok",
  "message": "Objednávka byla úspěšně aktualizována"
}
```

---

## 📝 Poznámky

1. **DB sloupce již existují** - není potřeba žádná DB migrace
2. **Frontend je připraven** - čeká jen na API podporu
3. **Workflow logiku řeší frontend** - backend jen ukládá data
4. **Defaultní hodnoty** jsou nastaveny v DB schématu
5. **Backwards compatible** - staré objednávky budou mít NULL/0 hodnoty

---

## 🚀 Priorita

**VYSOKÁ** - Frontend je plně implementován a čeká na backend podporu.

---

## 📞 Kontakt

Pokud máte dotazy k implementaci, kontaktujte frontend team nebo se podívejte do:
- `docs/VECNA-SPRAVNOST-API-IMPLEMENTATION.md` - podrobná frontend dokumentace
- `add_vecna_spravnost_fields.sql` - SQL definice sloupců
- `src/forms/OrderForm25.js` - řádky 3780-3790, 6660-6870, 19400-19900
