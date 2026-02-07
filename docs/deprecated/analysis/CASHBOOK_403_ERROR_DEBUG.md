# 🐛 CASHBOOK 403 ERROR - ŘEŠENÍ PRO ROBIN THP

**Datum:** 7. ledna 2026  
**Chyba:** `Failed to load resource: the server responded with a status of 403`  
**Endpoint:** `/dev/api.eeo/cashbook-get`  
**Uživatel:** Robin THP (ID 137, username: thp.0000)

---

## 📋 SHRNUTÍ PROBLÉMU

Uživatel Robin THP dostává chybu **403 Forbidden** při pokusu o načtení pokladní knihy, přestože:
- ✅ Má všechna potřebná práva (CASH_BOOK_READ_OWN, CREATE, DELETE_OWN, atd.)
- ✅ Je přiřazen k pokladně (ID 13 - "Testovací")
- ✅ Má vytvořenou pokladní knihu (ID 12, rok 2026, měsíc 1)

---

## 🔍 CO JSME OVĚŘILI

### 1. Práva uživatele ✅
```sql
SELECT p.kod_prava, p.popis
FROM 25_role_prava rp
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE rp.role_id = 9  -- THP/PES
  AND p.kod_prava LIKE 'CASH_%'
  AND rp.user_id = -1
  AND rp.aktivni = 1;
```

**Výsledek:**
- CASH_BOOK_CREATE ✅
- CASH_BOOK_READ_OWN ✅
- CASH_BOOK_EDIT_OWN ✅
- CASH_BOOK_DELETE_OWN ✅
- CASH_BOOK_EXPORT_OWN ✅

### 2. Přiřazení k pokladně ✅
```sql
SELECT * FROM 25a_pokladny_uzivatele
WHERE uzivatel_id = 137 AND pokladna_id = 13;
```

**Výsledek:**
- Aktivní přiřazení od 2026-01-07 ✅

### 3. Existence knihy ✅
```sql
SELECT * FROM 25a_pokladni_knihy
WHERE id = 12 AND uzivatel_id = 137;
```

**Výsledek:**
- Kniha existuje, patří Robin THP ✅

---

## 🔧 DEBUG LOGY PŘIDANÉ

Přidány debug logy do:
1. **CashbookPermissions.php** - `hasPermission()` a `canReadCashbook()`
2. **cashbookHandlers.php** - `handle_cashbook_get_post()`

### Kde najít logy
```bash
sudo tail -f /var/log/apache2/error.log
```

### Co hledat v lozích
```
🔍 ===== handle_cashbook_get_post START =====
  - username: thp.0000
  - book_id: 12
  ✅ Token valid, userData keys: ...
  - userData['id']: 137

🔍 canReadCashbook DEBUG:
  - cashbookUserId: 137
  - pokladnaId: 13
  - this->user['id']: ???  <-- TOHLE JE KLÍČOVÉ!
  
🔍 hasPermission('CASH_BOOK_READ_OWN') check for user_id=137
  → Result: ✅ HAS PERMISSION (count=1)
```

---

## 🎯 MOŽNÉ PŘÍČINY CHYBY

### A) userData['id'] není nastaveno
**Příčina:** `verify_token_v2()` nevrací `id` nebo vrací pod jiným klíčem

**Kontrola:**
```php
// V handlers.php, verify_token_v2()
$token_data = verify_token($token, $db);
// ❓ Vrací verify_token() pole s klíčem 'id'?
```

**Řešení:** Zkontrolovat funkci `verify_token()` a ujistit se že vrací:
```php
return [
    'id' => $user_id,  // <-- MUSÍ BÝT PŘÍTOMNO!
    'username' => $username,
    'is_admin' => false,
    ...
];
```

### B) Frontend neposílá správný token
**Příčina:** `getAuthData()` vrací expired nebo neplatný token

**Kontrola:**
```javascript
// V cashbookService.js
const auth = await getAuthData();
console.log('Auth data:', auth); // DEBUG
```

**Řešení:** Ověřit že `getAuthData()` vrací:
```javascript
{
  token: "validní_base64_token",
  username: "thp.0000"
}
```

### C) SQL dotaz v hasPermission() selhává
**Příčina:** Chyba v SQL syntaxi nebo data v DB

**Test SQL:**
```sql
-- Spustit manuálně v MySQL
SELECT COUNT(*) as count
FROM 25_prava p
WHERE p.kod_prava = 'CASH_BOOK_READ_OWN'
AND p.aktivni = 1
AND (
    p.id IN (
        SELECT rp.pravo_id 
        FROM 25_role_prava rp 
        WHERE rp.user_id = 137 AND rp.aktivni = 1
    )
    OR p.id IN (
        SELECT rp.pravo_id 
        FROM 25_uzivatele_role ur
        JOIN 25_role_prava rp ON ur.role_id = rp.role_id AND rp.user_id = -1
        WHERE ur.uzivatel_id = 137 AND rp.aktivni = 1
    )
);
```

**Očekávaný výsledek:** `count = 1` ✅

---

## ✅ JAK OPRAVIT

### KROK 1: Ověř logy
```bash
# Spusť frontend a zkus načíst pokladnu
# Sleduj error log:
sudo tail -f /var/log/apache2/error.log | grep -E "handle_cashbook|canReadCashbook|hasPermission"
```

### KROK 2: Hledej tyto klíčové informace
```
1. userData['id']: ???  <-- MUSÍ BÝT 137!
2. this->user['id']: ??? <-- MUSÍ BÝT 137!
3. hasPermission result: ✅ nebo ❌?
4. cashbookUserId == user_id: TRUE nebo FALSE?
```

### KROK 3: Podle výsledku

#### Pokud `userData['id']` je NULL nebo NOT SET:
→ **Problém je v `verify_token_v2()`**

```php
// Opravit v handlers.php
function verify_token_v2($username, $token, $db = null) {
    // ...
    $token_data = verify_token($token, $db);
    
    // ✅ UJISTI SE ŽE token_data OBSAHUJE 'id'!
    if (!isset($token_data['id'])) {
        error_log("❌ verify_token_v2: token_data nemá klíč 'id'!");
        return false;
    }
    
    return $token_data;
}
```

#### Pokud `hasPermission()` vrací FALSE přesto že SQL test vrací count=1:
→ **Problém je v PDO nebo execute()**

```php
// Přidat error handling
public function hasPermission($permissionCode) {
    // ...
    try {
        $stmt->execute(array($permissionCode, $this->user['id'], $this->user['id']));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            error_log("❌ hasPermission: fetch() vrátil FALSE!");
            return false;
        }
        
        return $result['count'] > 0;
    } catch (PDOException $e) {
        error_log("❌ hasPermission SQL error: " . $e->getMessage());
        return false;
    }
}
```

#### Pokud všechno vypadá OK ale stále 403:
→ **Problém může být v isOwnCashbox()**

```php
// Zkontrolovat metodu isOwnCashbox()
private function isOwnCashbox($pokladnaId) {
    // Musí správně zkontrolovat přiřazení
    $stmt = $this->db->prepare("
        SELECT COUNT(*) as count
        FROM 25a_pokladny_uzivatele
        WHERE pokladna_id = ? 
          AND uzivatel_id = ?
          AND (platne_do IS NULL OR platne_do >= CURDATE())
    ");
    $stmt->execute(array($pokladnaId, $this->user['id']));
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result['count'] > 0;
}
```

---

## 📞 CO UDĚLAT TEĎKA

1. **Refresh stránky** v browseru aby se znovu zavolal endpoint
2. **Sleduj error log:** `sudo tail -f /var/log/apache2/error.log`
3. **Hledej řádky s:**
   - `handle_cashbook_get_post START`
   - `userData['id']:`
   - `this->user['id']:`
   - `hasPermission result:`
   
4. **Zkopíruj relevantní logy** a pošli mi je

---

## 🔥 RYCHLÁ OPRAVA (pokud máš urgentní potřebu)

Pokud potřebuješ aby to fungovalo HNED a debug trvá dlouho, můžeš dočasně:

```php
// V CashbookPermissions.php, na začátek canReadCashbook()
public function canReadCashbook($cashbookUserId, $pokladnaId = null) {
    // 🔥 DOČASNÝ BYPASS pro Robin THP (ID 137)
    if (isset($this->user['id']) && $this->user['id'] == 137) {
        error_log("⚠️ DOČASNÝ BYPASS pro user_id=137");
        return true;
    }
    
    // Normální logika...
}
```

**⚠️ VAROVÁNÍ:** Toto je POUZE pro testování! Odstraň po vyřešení problému!

---

**Status:** DEBUG logy přidány, čeká se na test a výsledky z error logu.
