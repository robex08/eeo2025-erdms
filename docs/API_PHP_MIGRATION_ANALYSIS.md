# Analýza PHP API - Migrace z PHP 5.6 na PHP 8.4

**Datum analýzy:** 4. prosince 2025  
**Analyzované API:** `/var/www/erdms_oldapi/api.eeo/`  
**Zdrojová verze PHP:** 5.6  
**Cílová verze PHP:** 8.4 (aktuálně nainstalovaná)  
**Stav PHP-FPM:** ✅ Běží a funguje

---

## 📊 Přehled kódové báze

### Struktura souborů
```
api.eeo/
├── api.php (4,672 řádků) - hlavní entry point
├── old_endpoints.php (legacy)
└── v2025.03_25/
    ├── lib/ (50,188 řádků)
    ├── models/
    ├── services/
    ├── validators/
    └── middleware/
```

### Statistiky kódu
- **Celkový počet řádků:** ~58,877 PHP kódu
- **Počet PHP souborů:** 69 souborů
- **Největší soubory:**
  - `handlers.php` - 7,148 řádků (hlavní business logika)
  - `orderHandlers.php` - 5,337 řádků (správa objednávek)
  - `api.php` - 4,672 řádků (routing + namedays data)
  - `ciselnikyHandlers.php` - 3,054 řádků (číselníky)

---

## ✅ Pozitivní zjištění

### 1. **Moderní PDO Database Layer**
API **již používá PDO** (PHP Data Objects) místo zastaralých `mysql_*` funkcí:

```php
function get_db($config) {
    $dsn = "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4";
    return new PDO($dsn, $config['username'], $config['password'], array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ));
}
```

✅ **PDO je kompatibilní PHP 5.6 → 8.4** bez úprav

### 2. **Žádné kritické deprecated funkce**
- ❌ Neobsahuje `mysql_connect()`, `mysql_query()` 
- ❌ Neobsahuje `ereg()`, `eregi()` 
- ❌ Neobsahuje `mcrypt_*` funkce
- ❌ Neobsahuje `create_function()`
- ❌ Neobsahuje `each()`

### 3. **Syntax je platná pro PHP 8.4**
```bash
php -l api.php
# No syntax errors detected ✅
```

Všech 69 PHP souborů prošlo syntax checkingem bez chyb.

### 4. **Moderní OOP přístup**
Kód používá třídy, namespace-friendly strukturu:
```php
class CashbookRenumberService {
    private $db;
    private $settingsModel;
    
    public function __construct($db) {
        $this->db = $db;
    }
}
```

---

## ⚠️ Potenciální problémy (vyžadují testování)

### 1. **UTF-8 a string funkce**
V PHP 8.x je přísnější validace UTF-8 encodingu.

**Riziko:** Možné problémy s českou diakritikou pokud data v DB nejsou správně zakódována.

**Řešení:**
- ✅ API používá `charset=utf8mb4` v PDO connection
- ⚠️ Nutno ověřit, že DB tabulky mají collation `utf8mb4_czech_ci`

### 2. **Array access na non-arrays**
PHP 8.x vyhodí **Warning** při pokusu o array access na `null`, `false`, nebo non-array.

**Příklad problematického kódu:**
```php
$result = $stmt->fetch(PDO::FETCH_ASSOC);
$value = $result['column']; // Pokud fetch vrátí false → Warning v PHP 8
```

**Řešení:** Přidat null-safe checks:
```php
if ($result && isset($result['column'])) {
    $value = $result['column'];
}
```

### 3. **Deprecated parameter passing**
Některé funkce v PHP 8.x změnily signatury (např. `implode`, `explode`).

**Kontrola:** Nutno projít všechny volání těchto funkcí.

### 4. **JSON encoding chyby**
V PHP 8.x `json_encode()` může vrátit výjimku místo `false`.

**Aktuální kód:**
```php
header("Content-Type: application/json; charset=utf-8");
```
✅ Content-Type je správně nastaven

---

## 🔄 Aktuální konfigurace databáze

### PHP API Config (`dbconfig.php`)
```php
'mysql' => [
    'host' => 'localhost',
    'username' => 'root',
    'password' => 'adminSQL22107000',
    'database' => 'evidence_smluv'  // ⚠️ STARÁ DATABÁZE
]
```

### Node.js API Config (`.env`)
```bash
DB_HOST=10.3.172.11
DB_PORT=3306
DB_NAME=eeo2025            # ✅ NOVÁ DATABÁZE (aplikační data)
DB_USER=erdms_user
DB_CHARSET=utf8mb4

# Poznámka: erdms DB existuje pro autentizaci (bude řešeno později)
```

---

## 🎯 Požadované změny

### 1. **Update database credentials v `dbconfig.php`**

```php
return [
    'mysql' => [
        'host' => '10.3.172.11',        // ← Změna: remote server
        'username' => 'erdms_user',     // ← Změna: nový user
        'password' => '[získat z .env]', // ← Změna: nové heslo
        'database' => 'eeo2025'         // ← Změna: nová DB (hlavní aplikační DB)
    ],
    // ... upload config zůstává
];
```

**⚠️ POZNÁMKA:** 
- **`eeo2025`** = hlavní databáze pro aplikační data (users, orders, invoices, cashbook, atd.)
- **`erdms`** = speciální databáze pro autentizaci a přístupy (bude konzultováno později)

### 2. **Verifikace schématu databáze**
Starý API očekává tabulky:
- `users` (s poli: id, username, password, email, role, ...)
- `orders` (objednávky)
- `invoices` (faktury)
- `cashbook` (pokladní kniha)
- `attachments` (přílohy)
- `notifications`
- `lokality`, `pozice`, `organizace` (číselníky)

**Akce:** Ověřit, že nová DB `eeo2025` obsahuje stejné tabulky a sloupce.

**🔍 Databázová architektura:**
- **`eeo2025`** - hlavní aplikační DB (všechna provozní data)
- **`erdms`** - speciální DB pro autentizaci/přístupy (budoucí integrace)

---

## 📋 Migrace Checklist

### Fáze 1: Příprava (BEZ ÚPRAV)
- [x] ✅ Analyzovat PHP syntaxi (hotovo)
- [x] ✅ Zkontrolovat deprecated funkce (hotovo)
- [x] ✅ Ověřit PDO usage (hotovo - OK)
- [x] ✅ Získat heslo z `.env` pro `erdms_user`
- [ ] ⏳ Porovnat DB schémata (`evidence_smluv` vs `eeo2025`)
- [ ] ⏳ Identifikovat rozdíly ve sloupcích/tabulkách

### Fáze 2: Minimální změny
- [x] ✅ Update `dbconfig.php` s novými credentials
- [x] ✅ Update `importHandlers.php` cesty k přílohám
- [x] ✅ Update URL prefix na `erdms.zachranka.cz`
- [x] ✅ Test základního endpointu (`/nameday` - funguje)
- [ ] ⏳ Otestovat složitější endpointy (`/login`, `/users/list`)
- [ ] ⏳ Zachytit a zalogovat všechny PHP Warnings/Errors

### Fáze 3: Opravy (pokud nutné)
- [ ] ⏳ Opravit array access issues (přidat null checks)
- [ ] ⏳ Opravit rozdíly v DB schématu (mapování sloupců)
- [ ] ⏳ Update queries pokud se změnily názvy tabulek

### Fáze 4: Testování
- [ ] ⏳ Test CRUD operací (Create, Read, Update, Delete)
- [ ] ⏳ Test file uploads (přílohy)
- [ ] ⏳ Test reportů a exportů
- [ ] ⏳ Test notifikací

---

## 🚀 Očekávané výsledky

### ✅ Optimistický scénář
Pokud DB schéma je kompatibilní:
- **90% kódu funguje bez úprav** (díky PDO)
- Nutné opravit pouze:
  - DB credentials (1 soubor)
  - Případné null-safe checks (5-10 míst)
  - Možná 2-3 deprecated warnings

### ⚠️ Realistický scénář
Pokud jsou drobné rozdíly v DB:
- Nutno upravit:
  - Mapování sloupců (např. `user_id` → `userId`)
  - Queries s JOINy (pokud se změnily názvy tabulek)
  - Validace dat (pokud se změnily typy sloupců)
- **Odhad práce:** 4-8 hodin debugging + úpravy

### ❌ Pesimistický scénář
Pokud je DB kompletně jiná:
- Nutno **přepsat** většinu queries
- Zvážit refaktoring na nové API
- **Odhad práce:** 20-40 hodin

---

## 🔍 Další kroky

1. **Získat DB heslo:**
   ```bash
   grep "DB_PASSWORD" /var/www/eeo2025/server/.env
   ```

2. **Porovnat DB schémata:**
   ```sql
   -- Stará DB
   SHOW TABLES FROM evidence_smluv;
   DESCRIBE evidence_smluv.users;
   
   -- Nová DB (aplikační data)
   SHOW TABLES FROM eeo2025;
   DESCRIBE eeo2025.users;
   ```

3. **Test spojení:**
   ```bash
   curl -X POST https://erdms.zachranka.cz/api.eeo/login \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test"}'
   ```

---

## 💡 Doporučení

1. **Nechat kód beze změn** co nejdéle
2. **Postupná migrace** - endpoint po endpointu
3. **Obsáhlé logování** všech chyb do `/tmp/php_errors.log`
4. **Fallback plán** - ponechat starý server jako backup

---

## ✅ Provedené změny (4. prosince 2025)

### Database Configuration
**Soubor:** `/var/www/erdms_oldapi/api.eeo/v2025.03_25/lib/dbconfig.php`

```diff
- 'host' => 'localhost',
+ 'host' => '10.3.172.11',

- 'username' => 'root',
+ 'username' => 'erdms_user',

- 'password' => 'adminSQL22107000',
+ 'password' => 'AhchohTahnoh7eim',

- 'database' => 'evidence_smluv'
+ 'database' => 'eeo2025'

- 'web_url_prefix' => 'https://eeo.zachranka.cz/uploads/',
+ 'web_url_prefix' => 'https://erdms.zachranka.cz/uploads/',
```

### Import Handler Paths
**Soubor:** `/var/www/erdms_oldapi/api.eeo/v2025.03_25/lib/importHandlers.php:798`

```diff
- $systemova_cesta = '/var/www/eeo/evidence_smluv/prilohy/' . $soubor;
+ $systemova_cesta = '/var/www/eeo2025/doc/prilohy/' . $soubor;
```

### Test Results
- ✅ PHP API běží bez chyb
- ✅ Endpoint `/nameday` funguje → `{"status":"ok","date":"4.12.","name":"Barbora"}`
- ✅ Žádné PHP errors v `/tmp/php_errors.log`
- ⏳ Čeká na test složitějších endpointů s DB přístupem

---

**Status:** ✅ PHP 8.4 FPM nakonfigurován a funguje | ✅ DB credentials aktualizovány  
**Blokuje:** Otestovat kompatibilitu DB schématu (`eeo2025` vs `evidence_smluv`)  
**Riziko:** NÍZKÉ - kód je moderní, používá PDO, základní endpoint funguje

---

## 📌 DALŠÍ KROKY (až budeme pokračovat)

### 1. Porovnat DB schémata
```bash
# Připojit se k DB a porovnat strukturu
mysql -h 10.3.172.11 -u erdms_user -p eeo2025

# Zkontrolovat existenci tabulek
SHOW TABLES;

# Porovnat strukturu users tabulky
DESCRIBE users;
```

### 2. Otestovat složitější endpointy
```bash
# Test login endpointu (vyžaduje DB přístup)
curl -X POST https://erdms.zachranka.cz/api.eeo/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Test users/list (vyžaduje autentizaci)
curl -H "Host: erdms.zachranka.cz" \
  "http://localhost/api.eeo/users/list" \
  -H "x-auth-token: [token]"
```

### 3. Monitorovat PHP error log
```bash
tail -f /tmp/php_errors.log
```

### 4. Opravit případné rozdíly v DB schématu
- Pokud se názvy sloupců liší → upravit queries
- Pokud chybí tabulky → migrovat z `evidence_smluv`
- Pokud jsou nové sloupce → přidat default hodnoty

**⏸️ PŘERUŠENO:** Vracíme se k EntraID (server + klient) - migrace PHP API bude pokračovat později  

