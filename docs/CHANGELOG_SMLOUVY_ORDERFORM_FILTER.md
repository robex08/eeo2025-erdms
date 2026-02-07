# 📋 CHANGELOG: Filtr Smluv pro OrderForm25

**Datum:** 30. prosince 2025  
**Typ změny:** Enhancement - nový filtr v API  
**Status:** ✅ Implementováno v DEV

---

## 🎯 Požadavek

**Zadání:**
> "Potřebuji na OrderForm25 typ smlouva, při našeptávání donutil nás našeptávat hledat jen v smlouvy které mají sloupec v DB `pouzit_v_obj_formu = 1`"

---

## 🔧 Implementace

### Endpoint: `POST /api.eeo/ciselniky/smlouvy/list`

**Přidán nový filtr:** `pouzit_v_obj_formu`

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/smlouvyHandlers.php`

**Změna:**
```php
// Filter: pouzit_v_obj_formu (pro OrderForm25 autocomplete)
// Pokud je true, vrátí pouze smlouvy použitelné v objednávkovém formuláři
if (isset($input['pouzit_v_obj_formu']) && $input['pouzit_v_obj_formu']) {
    $where[] = 's.pouzit_v_obj_formu = 1';
}
```

---

## 📊 Použití

### Request: Všechny smlouvy (bez filtru)

```bash
curl -X POST http://localhost/api.eeo/ciselniky/smlouvy/list \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "token": "your_token",
    "search": "IT"
  }'
```

**Response:** Vrátí všechny smlouvy (aktivní i neaktivní v obj. formuláři)

---

### Request: Pouze smlouvy pro OrderForm25

```bash
curl -X POST http://localhost/api.eeo/ciselniky/smlouvy/list \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "token": "your_token",
    "search": "IT",
    "pouzit_v_obj_formu": true
  }'
```

**Response:** Vrátí pouze smlouvy s `pouzit_v_obj_formu = 1`

---

## 🔍 Příklady

### Příklad 1: Autocomplete pro OrderForm25

**Frontend kód:**
```javascript
// Při načítání našeptávače smluv v OrderForm25
const fetchSmlouvyForOrderForm = async (searchTerm) => {
  const response = await fetch('/api.eeo/ciselniky/smlouvy/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: currentUser.username,
      token: currentUser.token,
      search: searchTerm,
      pouzit_v_obj_formu: true,  // ← KLÍČOVÝ PARAMETR!
      limit: 20
    })
  });
  
  const data = await response.json();
  return data.data; // Pole smluv použitelných v OrderForm
};
```

---

### Příklad 2: Kombinace filtrů

**Request:**
```json
{
  "username": "user@example.com",
  "token": "token123",
  "search": "dodávka",
  "pouzit_v_obj_formu": true,
  "stav": "AKTIVNI",
  "usek_id": 5,
  "limit": 10
}
```

**Výsledek:** Vrátí max. 10 aktivních smluv z úseku ID=5, které:
- obsahují slovo "dodávka"
- jsou použitelné v OrderForm25 (`pouzit_v_obj_formu = 1`)
- jsou v stavu AKTIVNI

---

## 🗄️ Databázová struktura

**Tabulka:** `25_smlouvy`

**Sloupec:** `pouzit_v_obj_formu`
- **Typ:** `TINYINT(1)`
- **Default:** `0`
- **Index:** `idx_pouzit_obj_form`

**Hodnoty:**
- `1` = Smlouva **je** dostupná v OrderForm25 autocomplete
- `0` = Smlouva **není** dostupná v OrderForm25 (pouze v modulu smluv)

**Migrace:** `docs/setup/alter-smlouvy-obj-form-flag-2025-12-08.sql`

---

## 🧪 Testování

### Test 1: Bez filtru

```bash
# Vrátí VŠECHNY aktivní smlouvy
curl -X POST http://localhost/api.eeo/ciselniky/smlouvy/list \
  -d '{"username":"test","token":"xxx","limit":5}'
```

**Očekávaný výsledek:** 
- Smlouvy s `pouzit_v_obj_formu = 0` **JSOU** zahrnuty

---

### Test 2: S filtrem pouzit_v_obj_formu = true

```bash
# Vrátí POUZE smlouvy pro OrderForm
curl -X POST http://localhost/api.eeo/ciselniky/smlouvy/list \
  -d '{"username":"test","token":"xxx","pouzit_v_obj_formu":true,"limit":5}'
```

**Očekávaný výsledek:**
- Smlouvy s `pouzit_v_obj_formu = 0` **NEJSOU** zahrnuty
- Smlouvy s `pouzit_v_obj_formu = 1` **JSOU** zahrnuty

---

### Test 3: Kombinace s dalšími filtry

```bash
# Filtr: pouzit_v_obj_formu + search + stav
curl -X POST http://localhost/api.eeo/ciselniky/smlouvy/list \
  -d '{
    "username":"test",
    "token":"xxx",
    "pouzit_v_obj_formu":true,
    "search":"IT",
    "stav":"AKTIVNI"
  }'
```

**Očekávaný výsledek:**
- Vrátí pouze AKTIVNÍ smlouvy s "IT" v názvu, které mají `pouzit_v_obj_formu = 1`

---

## 📝 Poznámky pro Frontend

### Důležité!

1. **Parametr je volitelný:**
   - Pokud `pouzit_v_obj_formu` není v requestu, vrátí se všechny smlouvy (bez filtrace)
   
2. **Hodnota musí být boolean:**
   - ✅ `"pouzit_v_obj_formu": true` - filtruje
   - ❌ `"pouzit_v_obj_formu": false` - nefiltruje (stejné jako vynechání)
   - ❌ `"pouzit_v_obj_formu": 1` - nefiltruje (není boolean)

3. **Kombinace s ostatními filtry:**
   - Filtr `pouzit_v_obj_formu` se kombinuje s jinými filtry pomocí **AND**
   - Např: `aktivni = 1 AND pouzit_v_obj_formu = 1 AND search LIKE '%IT%'`

---

## 🚀 Deployment

### DEV
✅ Implementováno v `/var/www/erdms-dev/`  
✅ PHP syntax ověřena  
✅ Sloupec `pouzit_v_obj_formu` existuje v DEV DB

### PRODUCTION
⏳ Čeká na deployment  
📝 Žádné DB změny potřeba (sloupec už existuje)  
⚡ Pouze update PHP souboru: `smlouvyHandlers.php`

---

## 🔗 Související

- **DB migrace:** `docs/setup/alter-smlouvy-obj-form-flag-2025-12-08.sql`
- **Stored procedure:** `CREATE_SP_PREPOCET_CERPANI_SMLUV.sql` (používá `pouzit_v_obj_formu`)
- **API endpoint:** `POST /api.eeo/ciselniky/smlouvy/list`

---

**Implementováno:** 30.12.2025  
**Testing:** Ready  
**Production:** Připraveno k nasazení
