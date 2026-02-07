# Finální audit oprávnění a návrh oprav

**Datum:** 2025-01-05  
**Účel:** Kompletní audit SUPPLIER/PHONEBOOK práv na FE a BE, odstranění zombie kódu, centralizace kontroly na BE

---

## 🔍 AUDIT VÝSLEDKY

### Frontend - Zombie kód (CONTACT_*)

#### ✅ Již opraveno:
- ✅ `ProfilePage.js` - změněno na SUPPLIER_*
- ✅ `ContactsPage.js` - změněno na SUPPLIER_MANAGE
- ✅ `availableSections.js` - změněno na SUPPLIER_*
- ✅ `OrderForm25.js` - změněno na SUPPLIER_*

#### ⚠️ Komentáře a dokumentace (neškodné):
- `api2auth.js` (lines 1233-1259) - komentáře `CONTACT_MANAGE` → **změnit na SUPPLIER_MANAGE**
- `ContactsPage.js` (line 551) - komentář → **aktualizovat**
- `ContactManagement.js` (line 894) - komentář → **aktualizovat**

---

### Backend - KRITICKÉ PROBLÉMY

#### 🚨 Žádná kontrola oprávnění!

**Soubor:** `ciselnikyHandlers.php`

**Funkce bez kontroly práv:**
1. `handle_ciselniky_dodavatele_list()` (line 1242)
   - ❌ Kontroluje jen token
   - ✅ Mělo by: SUPPLIER_VIEW nebo SUPPLIER_MANAGE

2. `handle_ciselniky_dodavatele_insert()` (line 1347)
   - ❌ Kontroluje jen token
   - ✅ Mělo by: SUPPLIER_CREATE nebo SUPPLIER_EDIT nebo SUPPLIER_MANAGE

3. `handle_ciselniky_dodavatele_update()` (line 1434)
   - ❌ Kontroluje jen token
   - ✅ Mělo by: SUPPLIER_EDIT nebo SUPPLIER_MANAGE

4. `handle_ciselniky_dodavatele_delete()` (line 1531)
   - ❌ Kontroluje jen token
   - ✅ Mělo by: SUPPLIER_DELETE nebo SUPPLIER_MANAGE

**Důsledek:** Každý přihlášený uživatel může CRUD operace na dodavatele!

---

## 🎯 NÁVRH ŘEŠENÍ

### Krok 1: Oprava komentářů FE (kosmetické)

```javascript
// api2auth.js line 1233-1259
// PŘED:
// * For users without CONTACT_MANAGE permission...
// * @param {boolean} load_all - If true and user has CONTACT_MANAGE permission...

// PO:
// * For users without SUPPLIER_MANAGE permission...
// * @param {boolean} load_all - If true and user has SUPPLIER_MANAGE permission...
```

---

### Krok 2: Přidat kontrolu práv do BE (KRITICKÉ!)

**Soubor:** `ciselnikyHandlers.php`

#### A) Vytvořit helper funkci pro kontrolu práv dodavatelů:

```php
/**
 * Kontrola oprávnění pro dodavatele
 * 
 * @param string $username - uživatelské jméno
 * @param string $operation - operace: 'read', 'create', 'edit', 'delete', 'manage'
 * @param PDO $db - databázové spojení
 * @return bool
 */
function check_supplier_permission($username, $operation, $db) {
    // Admin má vždy vše
    if (is_admin($username, $db)) {
        return true;
    }
    
    // Mapování operací na práva
    $permission_map = array(
        'read' => array('SUPPLIER_VIEW', 'SUPPLIER_EDIT', 'SUPPLIER_CREATE', 'SUPPLIER_MANAGE'),
        'create' => array('SUPPLIER_CREATE', 'SUPPLIER_EDIT', 'SUPPLIER_MANAGE'),
        'edit' => array('SUPPLIER_EDIT', 'SUPPLIER_MANAGE'),
        'delete' => array('SUPPLIER_DELETE', 'SUPPLIER_MANAGE'),
        'manage' => array('SUPPLIER_MANAGE')
    );
    
    if (!isset($permission_map[$operation])) {
        return false;
    }
    
    $required_permissions = $permission_map[$operation];
    
    // Kontrola práv
    foreach ($required_permissions as $perm) {
        if (has_permission($username, $perm, $db)) {
            return true;
        }
    }
    
    return false;
}
```

#### B) Přidat kontroly do každé funkce:

**1. LIST - čtení dodavatelů:**
```php
function handle_ciselniky_dodavatele_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    // ✅ PŘIDAT: Kontrola práv
    $db = get_db($config);
    if (!check_supplier_permission($request_username, 'read', $db)) {
        http_response_code(403);
        echo json_encode(array('err' => 'Nemáte oprávnění k prohlížení dodavatelů'));
        return;
    }

    try {
        // ... zbytek funkce
```

**2. INSERT - vytváření:**
```php
function handle_ciselniky_dodavatele_insert($input, $config, $queries) {
    // ... ověření tokenu ...

    // ✅ PŘIDAT: Kontrola práv
    $db = get_db($config);
    if (!check_supplier_permission($request_username, 'create', $db)) {
        http_response_code(403);
        echo json_encode(array('err' => 'Nemáte oprávnění k vytváření dodavatelů'));
        return;
    }

    // ... zbytek funkce
```

**3. UPDATE - editace:**
```php
function handle_ciselniky_dodavatele_update($input, $config, $queries) {
    // ... ověření tokenu ...

    // ✅ PŘIDAT: Kontrola práv
    $db = get_db($config);
    if (!check_supplier_permission($request_username, 'edit', $db)) {
        http_response_code(403);
        echo json_encode(array('err' => 'Nemáte oprávnění k editaci dodavatelů'));
        return;
    }

    // ... zbytek funkce
```

**4. DELETE - mazání:**
```php
function handle_ciselniky_dodavatele_delete($input, $config, $queries) {
    // ... ověření tokenu ...

    // ✅ PŘIDAT: Kontrola práv
    $db = get_db($config);
    if (!check_supplier_permission($request_username, 'delete', $db)) {
        http_response_code(403);
        echo json_encode(array('err' => 'Nemáte oprávnění k mazání dodavatelů'));
        return;
    }

    // ... zbytek funkce
```

---

### Krok 3: Oprava handlers.php (již hotovo ✅)

- ✅ Změněno `CONTACT_MANAGE_ALL` → `SUPPLIER_MANAGE` (lines 2098, 2120)

---

## 📋 FINÁLNÍ STRUKTURA PRÁV

### DODAVATELÉ (Suppliers)

```
SUPPLIER_MANAGE (ID 14)
├── Plný přístup ke všem dodavatelům
├── Může ukládat do globálního adresáře
├── Vidí všechny úseky při výběru
└── Zahrnuje všechna práva níže

SUPPLIER_VIEW (ID 91)
├── Čtení dodavatelů
├── Vidí vlastní úsek + globální + osobní
└── Nemůže přidávat ani editovat

SUPPLIER_EDIT (ID 92)
├── Editace dodavatelů
├── Ukládání do osobního + úsekového (jen svůj)
└── Nemůže do globálního

SUPPLIER_CREATE (ID 145)
├── Vytváření nových dodavatelů
├── Ukládání do osobního + úsekového (jen svůj)
└── Nemůže do globálního

SUPPLIER_DELETE (ID 146)
└── Mazání dodavatelů
```

### ZAMĚSTNANCI (Phonebook)

```
PHONEBOOK_MANAGE (ID 147)
└── Plný přístup k telefonnímu seznamu

PHONEBOOK_VIEW (ID 90)
└── Čtení kontaktů zaměstnanců

PHONEBOOK_CREATE (ID 142)
└── Vytváření kontaktů

PHONEBOOK_EDIT (ID 143)
└── Editace kontaktů

PHONEBOOK_DELETE (ID 144)
└── Mazání kontaktů
```

---

## ✅ CHECKLIST IMPLEMENTACE

### Frontend (DEV)
- [x] OrderForm25.js - SUPPLIER_* práva
- [x] ProfilePage.js - SUPPLIER_* práva
- [x] ContactsPage.js - SUPPLIER_MANAGE
- [x] availableSections.js - SUPPLIER_* práva
- [ ] api2auth.js - aktualizovat komentáře
- [ ] ContactManagement.js - aktualizovat komentáře

### Backend (DEV)
- [x] handlers.php - SUPPLIER_MANAGE místo CONTACT_MANAGE_ALL
- [ ] ciselnikyHandlers.php - přidat check_supplier_permission()
- [ ] ciselnikyHandlers.php - přidat kontrolu do dodavatele_list
- [ ] ciselnikyHandlers.php - přidat kontrolu do dodavatele_insert
- [ ] ciselnikyHandlers.php - přidat kontrolu do dodavatele_update
- [ ] ciselnikyHandlers.php - přidat kontrolu do dodavatele_delete

### Databáze (DEV)
- [x] Migrace CONTACT_* → SUPPLIER_*
- [x] Smazání starých CONTACT_* práv
- [x] Vytvoření nových práv (SUPPLIER_CREATE, DELETE, PHONEBOOK_MANAGE)

---

## 🚀 DALŠÍ KROKY

1. **Opravit komentáře FE** (5 min)
2. **Implementovat check_supplier_permission() v BE** (10 min)
3. **Přidat kontroly do 4 funkcí** (15 min)
4. **Otestovat na DEV** (15 min)
5. **Build a deploy** (10 min)

**Celkem:** ~55 minut práce

---

## 📊 BEZPEČNOSTNÍ ZLEPŠENÍ

**Před:**
- ❌ Každý přihlášený může CRUD dodavatele
- ❌ Neexistující právo v kontrole (CONTACT_MANAGE_ALL)
- ❌ Zmatečná práva (CONTACT_*, SUPPLIER_* míchání)

**Po:**
- ✅ Kontrola práv na backendu
- ✅ Jednotný systém SUPPLIER_* pro dodavatele
- ✅ Jednotný systém PHONEBOOK_* pro zaměstnance
- ✅ Hierarchie práv (MANAGE > CREATE/EDIT/DELETE > VIEW)
- ✅ Odstranění zombie kódu
