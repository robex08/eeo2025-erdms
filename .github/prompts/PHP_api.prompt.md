---
agent: agent
name: PHPAPI
model: Claude Sonnet 4.5 (copilot)
description: PHP legacy API coding
priority: high
version: 1.0
last_updated: 2025-12-20
---

**DŮLEŽITÉ: Komunikuj vždy v češtině.**

---

## 🎯 KRITICKÁ PRAVIDLA (vždy dodržovat)
pokud vyvojvoy tym nerekne jinka tak pracuje s databazi 

eeo2025-dev   / verzi dev, a vse se odehrava v ni. 
pri kontrole obshu, zakladnai novych sloupcu apod. vzdy pracovat s touto verzi DB, nazvem !!


!!! vzdy ukladat u vsech PHP endpointu casove a datumove polozky s vyzuitim TimezoneHelper pro spravnou timezone (
setMysqlTimezone($db) - nastavuje MySQL session timezone na českou časovou zónu (+01:00 nebo +02:00)) !!!

### Testování a Debugging
- ❌ **NIKDY nepoužívej curl/wget/http požadavky na produkční URL** `https://erdms.zachranka.cz/api.eeo/`
- ❌ Nemáš k dispozici přístup k testování produkčních endpointů přes HTTP
- ✅ Místo toho používej: `php -l` pro syntax check, `grep` pro analýzu kódu
- ✅ Pro debugging spoléhej na PHP error logy: `/var/log/apache2/error.log`
- ✅ Kontroluj konzistenci kódu bez spouštění HTTP requestů

### Databázové připojení
- ❌ NIKDY nepoužívej `localhost` - databáze běží na vzdáleném serveru
- ✅ Všechny přístupy najdeš v: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php`
- ✅ Používej POUZE PDO připojení (žádné `mysqli`)
- ✅ Vždy používej prepared statements proti SQL injection

### Názvy tabulek a sloupců
- 🇨🇿 **České názvy** jsou primární (tabulky i sloupce)
- ✅ VŽDY ověř existenci konstant tabulek v `/apps/eeo-v2/api-legacy/api.eeo/api.php` (řádky 100-200)
- ❌ NIKDY nevytvářej nové názvy tabulek "od ruky"
- ❌ NIKDY nepředpokládej názvy sloupců - zkontroluj je v databázi

**Příklad konstant tabulek:**
```php
define('TBL_OBJEDNAVKY', '25a_objednavky');
define('TBL_UZIVATELE', '25_uzivatele');
define('TBL_FAKTURY', '25a_objednavky_faktury');
define('TBL_SMLOUVY', '25_smlouvy');
```

### Vytváření nových tabulek/sloupců
⚠️ **Pokud potřebuješ vytvořit novou tabulku nebo sloupec:**
1. ZASTAV se
2. Konzultuj s týmem vývojářů
3. Nečekej na odpověď v chatu - požádej uživatele o konzultaci

---

## 📡 STRUKTURA API

### Hlavní API router
- **Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/api.php`
- Veškeré API je integrováno přes tento centrální soubor
- Definuje konstanty tabulek a routuje požadavky na jednotlivé handlery

### Standard endpointů
Všechny nové endpointy **MUSÍ** dodržovat Order V2 strukturu:

#### HTTP Metoda
```php
// ✅ PRIMÁRNÍ metoda: POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
    exit;
}
```

#### Autentizace
```php
// ✅ Parametry v BODY (JSON nebo form-data)
$input = json_decode(file_get_contents('php://input'), true);
$token = $input['token'] ?? '';
$username = $input['username'] ?? '';

// ❌ NIKDY nečti token z x-headers
// ❌ Špatně: $_SERVER['HTTP_X_AUTH_TOKEN']
```

#### Formát odpovědi (JSON)
```php
// ✅ Standardní formát úspěšné odpovědi:
http_response_code(200);
echo json_encode([
    'status' => 'success',
    'data' => $vysledky,
    'message' => 'Operace proběhla úspěšně',
    'count' => count($vysledky) // pokud je to pole
]);

// ✅ Standardní formát chybové odpovědi:
http_response_code(400); // nebo jiný error kód
echo json_encode([
    'status' => 'error',
    'message' => 'Popis chyby v češtině',
    'error_code' => 'VALIDATION_FAILED', // volitelné
    'debug' => [...] // pouze pro development
]);
```

---

## 📚 REFERENČNÍ SOUBORY

### Konstanty a konfigurace
- **DB config:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php`
- **Konstanty tabulek:** `/apps/eeo-v2/api-legacy/api.eeo/api.php` (řádky 100-200)
- **Verze API:** `define('VERSION', 'v2025.03_25');` v `api.php`

### Vzorové implementace
- **Faktury API:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`
- **Order V2 vzory:** Hledej soubory s prefixem `orderV2*Handlers.php`
- **Autentizace:** Podívej se, jak je implementována v `invoiceHandlers.php` (funkce `verify_token()`)

### Handler soubory (knihovny funkcí)
- Všechny handlery: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/*Handlers.php`
- Queries: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/*Queries.php`

---

## ✅ CHECKLIST před dokončením endpointu

Před dokončením práce vždy zkontroluj:

- [ ] **Metoda:** Používáš POST?
- [ ] **Autentizace:** Validuješ `username` a `token` z body?
- [ ] **Bezpečnost:** Používáš prepared statements?
- [ ] **Konstanty:** Všechny názvy tabulek jsou z konstant (TBL_*)?
- [ ] **Ověření sloupců:** Ověřil jsi názvy sloupců v databázi?
- [ ] **Odpověď:** JSON formát má `status`, `data`, `message`?
- [ ] **Error handling:** Try-catch pro všechny DB operace?
- [ ] **HTTP kódy:** Správné status codes (200, 400, 401, 403, 500)?
- [ ] **České texty:** Všechny error messages jsou česky?

---

## 🔒 BEZPEČNOSTNÍ POŽADAVKY

### SQL Injection prevence
```php
// ✅ Správně - prepared statements
$stmt = $db->prepare("SELECT * FROM `$table` WHERE id = ?");
$stmt->execute([$id]);

// ❌ Špatně - concatenation
$query = "SELECT * FROM $table WHERE id = $id"; // NIKDY!
```

### XSS prevence
```php
// ✅ Escapování výstupů
$safe_output = htmlspecialchars($user_input, ENT_QUOTES, 'UTF-8');
```

### Validace vstupů
```php
// ✅ Validuj vše před použitím
$email = filter_var($input['email'], FILTER_VALIDATE_EMAIL);
$id = filter_var($input['id'], FILTER_VALIDATE_INT);
```

---

## 🚀 WORKFLOW při vytváření endpointu

1. **Ověř konstanty:**
   - Otevři `/apps/eeo-v2/api-legacy/api.eeo/api.php`
   - Zkontroluj, že konstanty tabulek existují

2. **Podívej se na vzor:**
   - Najdi podobný endpoint v `*Handlers.php` souborech
   - Zkopíruj strukturu autentizace a response formátu

3. **Implementuj logiku:**
   - Připojení k DB přes PDO
   - Prepared statements pro všechny queries
   - Kompletní error handling

4. **Otestuj:**
   - Správný response formát
   - Error stavy (chybějící token, neplatná data)
   - SQL injection pokusy

5. **Dokumentuj:**
   - Přidej PHPDoc komentář s příkladem použití
   - Zaznamenej parametry a response formát

---

## 📝 PŘÍKLAD NOVÉHO ENDPOINTU

```php
<?php
/**
 * POST - Vytvoří novou položku
 * Endpoint: muj-endpoint/create
 * POST: {token, username, data...}
 */
function handle_muj_endpoint_create($input, $config) {
    // 1. Validace požadavku
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    // 2. Parametry z body
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    // 3. Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        // 4. DB připojení
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        // 5. Business logika - VŽDY používej konstanty tabulek
        $stmt = $db->prepare("SELECT * FROM `" . TBL_OBJEDNAVKY . "` WHERE id = ?");
        $stmt->execute([$input['id']]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        // 6. Úspěšná odpověď
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $result,
            'message' => 'Data načtena úspěšně'
        ]);

    } catch (Exception $e) {
        // 7. Error handling
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při zpracování: ' . $e->getMessage()
        ]);
    }
}
```

---

## 💡 TIPY A BEST PRACTICES

1. **Před psaním kódu:**
   - Vždy si najdi podobný existující endpoint jako vzor
   - Ověř strukturu databáze pomocí existujících queries

2. **Pokud nevíš:**
   - ❌ Nehádej názvy tabulek nebo sloupců
   - ✅ Zeptej se uživatele nebo vyhledej v kódu

3. **Error messages:**
   - Vždy česky
   - Buď konkrétní (ne "Chyba", ale "Objednávka s ID 123 neexistuje")
   
4. **Logování:**
   - Pro production: Loguj důležité akce do audit tabulky
   - Pro development: Používej `error_log()` místo `var_dump()`

---

## 📖 SOUVISEJÍCÍ DOKUMENTACE

- Bezpečnost: `/_docs/PHP_API_SECURITY_AUDIT_20251220.md`
- DB struktura: `/_docs/ERDMS_PLATFORM_STRUCTURE.md`
- Migrace: `/_docs/CHANGELOG_LP_PDO_MIGRATION_COMPLETE.md`



