# Backend Audit: Kontakty a oprávnění

**Datum:** 2025-01-05  
**Backend:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/`  
**Database:** eeo2025-dev

## 🚨 KRITICKÉ NÁLEZY

### 1. CONTACT_MANAGE_ALL vs CONTACT_MANAGE
**Problém:** Backend kontroluje právo `CONTACT_MANAGE_ALL` (handlers.php:2098, 2120), ale toto právo **NEEXISTUJE V DATABÁZI**.

**Databáze má:**
- `CONTACT_MANAGE` (ID 17)
- `CONTACT_READ` (ID 18) 
- `CONTACT_EDIT` (ID 19)

**Backend kontroluje:**
```php
// lib/handlers.php line 2098, 2120
if (in_array($kod, array('SUPERADMIN', 'ADMIN', 'CONTACT_MANAGE_ALL'))) {
    return true;
}
```

**Důsledek:** Nikdo nemá právo `CONTACT_MANAGE_ALL`, takže tato kontrola NIKDY nevrátí true (kromě SUPERADMIN/ADMIN).

---

### 2. SUPPLIER_* práva nejsou kontrolována v backendu

**Databáze má:**
- `SUPPLIER_MANAGE` (ID 14)
- `SUPPLIER_READ` (ID 91)
- `SUPPLIER_EDIT` (ID 92)

**Backend:** Dodavatelské endpointy v `lib/ciselnikyHandlers.php` **NEKONTROLUJÍ** žádné SUPPLIER_* práva!

**Endpointy dodavatelů:**
```php
handle_ciselniky_dodavatele_list()    // POST /dodavatele/list
handle_ciselniky_dodavatele_by_id()   // POST /dodavatele/by-id
handle_ciselniky_dodavatele_insert()  // POST /dodavatele/insert
handle_ciselniky_dodavatele_update()  // POST /dodavatele/update
handle_ciselniky_dodavatele_delete()  // POST /dodavatele/delete
```

**Kontrola:** Pouze `verify_token()` - žádná kontrola oprávnění!

**Důsledek:** Každý přihlášený uživatel může číst, vytvářet, editovat a mazat dodavatele bez ohledu na práva SUPPLIER_*.

---

### 3. PHONEBOOK_* práva nejsou kontrolována v backendu

**Databáze má:**
- `PHONEBOOK_VIEW` (ID 90)
- `PHONEBOOK_CREATE` (ID 142)
- `PHONEBOOK_EDIT` (ID 143)
- `PHONEBOOK_DELETE` (ID 144)

**Backend:** Nenalezen žádný endpoint pro PHONEBOOK v `lib/`.

**Důsledek:** Pravděpodobně frontend-only feature nebo používá jiný způsob autorizace.

---

## 📊 Shrnutí kontroly oprávnění

### Backend Permission Checks (lib/handlers.php)

```php
function has_permission($username, $kod_prava, $db) {
    // 1. Načte práva uživatele z DB
    // 2. Kontroluje:
    //    - SUPERADMIN (vždy má vše)
    //    - ADMIN (vždy má vše)
    //    - CONTACT_MANAGE_ALL (NEEXISTUJE V DB!)
    //    - Specifická práva uživatele
    //    - Práva z rolí uživatele
    
    if (in_array($kod, array('SUPERADMIN', 'ADMIN', 'CONTACT_MANAGE_ALL'))) {
        return true;
    }
}
```

### Dodavatelé (lib/ciselnikyHandlers.php)

Všechny funkce:
- ✅ Kontrolují token (`verify_token()`)
- ❌ **NEKONTROLUJÍ žádná SUPPLIER_* práva**
- ❌ Nekontrolují org. hierarchii
- ❌ Nekontrolují role

```php
function handle_ciselniky_dodavatele_insert($input, $config, $queries) {
    $token_data = verify_token($token);
    if (!$token_data) {
        // 401 Unauthorized
    }
    
    // ❌ CHYBÍ: Kontrola práv SUPPLIER_CREATE nebo SUPPLIER_MANAGE
    
    // Vytvoří dodavatele
    $sql = "INSERT INTO 25_dodavatele ...";
}
```

---

## 🎯 Doporučení oprav

### PRIORITA 1: Opravit CONTACT_MANAGE_ALL

**Varianta A: Přejmenovat v DB**
```sql
-- Přejmenovat existující právo
UPDATE 25_prava 
SET kod_prava = 'CONTACT_MANAGE_ALL'
WHERE kod_prava = 'CONTACT_MANAGE';
```

**Varianta B: Opravit backend** (DOPORUČENO)
```php
// lib/handlers.php line 2098, 2120
// ZMĚNIT Z:
if (in_array($kod, array('SUPERADMIN', 'ADMIN', 'CONTACT_MANAGE_ALL'))) {

// NA:
if (in_array($kod, array('SUPERADMIN', 'ADMIN', 'CONTACT_MANAGE'))) {
```

---

### PRIORITA 2: Přidat kontrolu SUPPLIER_* práv

```php
function handle_ciselniky_dodavatele_insert($input, $config, $queries) {
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný token'));
        return;
    }

    // ✅ PŘIDAT: Kontrola práv
    $db = get_db($config);
    if (!has_permission($token_data['username'], 'SUPPLIER_MANAGE', $db) &&
        !has_permission($token_data['username'], 'SUPPLIER_EDIT', $db)) {
        http_response_code(403);
        echo json_encode(array('err' => 'Nedostatečná oprávnění'));
        return;
    }
    
    // ... zbytek funkce
}
```

Aplikovat na všechny funkce:
- `handle_ciselniky_dodavatele_list()` → kontrola `SUPPLIER_READ` nebo `SUPPLIER_MANAGE`
- `handle_ciselniky_dodavatele_insert()` → kontrola `SUPPLIER_MANAGE` nebo `SUPPLIER_EDIT`
- `handle_ciselniky_dodavatele_update()` → kontrola `SUPPLIER_MANAGE` nebo `SUPPLIER_EDIT`
- `handle_ciselniky_dodavatele_delete()` → kontrola `SUPPLIER_MANAGE`

---

### PRIORITA 3: Zdokumentovat PHONEBOOK_*

1. Najít kde se používá PHONEBOOK v backendu
2. Pokud se nepoužívá, odstranit z DB nebo přidat endpoint
3. Pokud je frontend-only, přesunout logiku do backendu

---

## 📁 Analyzované soubory

### Handlers (oprávnění)
- `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php`
  - Line 2090-2130: `has_permission()` funkce
  - Line 2098, 2120: Kontrola `CONTACT_MANAGE_ALL` (CHYBA)

### Číselníky (dodavatelé)
- `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/ciselnikyHandlers.php`
  - Line 1242-1288: `handle_ciselniky_dodavatele_list()`
  - Line 1290-1345: `handle_ciselniky_dodavatele_by_id()`
  - Line 1347-1432: `handle_ciselniky_dodavatele_insert()`
  - Line 1434+: `handle_ciselniky_dodavatele_update()`, `handle_ciselniky_dodavatele_delete()`

---

## 🔍 Bezpečnostní rizika

### Vysoké riziko
1. **Dodavatelé bez kontroly oprávnění** 
   - Každý přihlášený uživatel může CRUD operace na dodavatele
   - Riziko: Neoprávněná editace, mazání citlivých dat

2. **Neexistující právo v kontrole**
   - `CONTACT_MANAGE_ALL` neexistuje v DB
   - Kontrola nikdy neprojde (kromě ADMIN/SUPERADMIN)

### Střední riziko
3. **Nepřehlednost práv**
   - 3 různé typy kontaktů (CONTACT, SUPPLIER, PHONEBOOK)
   - Není jasné které právo kontrolovat kde
   - Frontend používá jiná práva než backend

---

## ✅ Závěr

Backend má **vážné mezery v autorizaci**:
1. Kontrola neexistujícího práva `CONTACT_MANAGE_ALL`
2. Kompletní absence kontroly `SUPPLIER_*` práv
3. Nejasná role `PHONEBOOK_*` práv

**Doporučení:** Opravit podle priorit výše a sjednotit systém oprávnění mezi frontend/backend.
