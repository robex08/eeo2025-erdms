---
name: php-legacy-guardian
description: Pravidla a checklist pro úpravy produkčního PHP API v apps/eeo-v2/api-legacy/ (produkční bezpečnost, PHP 8.4/MariaDB 11.8 konvence, struktura endpointů). Použij při jakékoliv práci s api-legacy/*.php, api.eeo/, .env souborech v eeo-v2, nebo když jde o databázi/deploy/produkci eeo-v2.
---

# PHP Legacy API Guardian (eeo-v2)

## NEJVYŠŠÍ PRIORITA — produkční ochrana

Bez explicitního potvrzení uživatele je **absolutně zakázáno**:
1. Upravovat `/var/www/erdms-platform/` (produkce)
2. Měnit produkční `.env` v `/var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env`
3. Dělat `rsync` do `/var/www/erdms-platform/`
4. Používat `rsync --delete` (smaže `api-legacy/`)
5. Pracovat s produkční databází `eeo2025` (dev databáze je `EEO-OSTRA-DEV`)
6. Hardcodovat konstanty, URL, cesty — vše musí jít z `.env`/config

Když narazíš na příkaz mířící do `/var/www/erdms-platform/`, `DB_NAME=eeo2025` mimo `.env`, nebo `rsync --delete` → **zastav se a zeptej se uživatele** ("Mám provést deploy do PRODUKCE? ano/ne"), neprováděj automaticky.

## Technické prostředí

- **PHP:** 8.4 (CLI i PHP-FPM) — používej named arguments, constructor property promotion, null-safe operátor (`?->`), `match` místo `switch`, typed properties, arrow functions.
- **MariaDB:** 11.8 — JSON funkce, window functions, CTE, `INSERT ... ON DUPLICATE KEY UPDATE`.
- **Charset:** UTF-8 / utf8mb4.

## Zákaz hardcoded hodnot

Nikdy natvrdo: URL (`https://erdms.zachranka.cz`), cesty (`/var/www/erdms-dev/data/`), DB názvy (`eeo2025`, `EEO-OSTRA-DEV`), porty, `/api.eeo/`. Vždy:

```php
$uploadRoot = $_ENV['UPLOAD_ROOT_PATH'] ?? '/var/www/erdms-dev/data/';
$dbName = $_ENV['DB_NAME'] ?? 'EEO-OSTRA-DEV';
```

Když narazíš na hardcoded hodnotu v existujícím kódu, uprav ji podle tohoto vzoru (a uveď to v shrnutí), místo aby ses jí jen vyhnul.

## Struktura endpointu (Order V2 standard)

Každý handler:
1. Ověří metodu (typicky pouze `POST`), jinak `405`
2. Čte parametry z `$input` (body), ne z headers
3. Ověří `token` + `username` přes `verify_token_v2()`, jinak `401`
4. `$db = get_db($config)`, hned poté `TimezoneHelper::setMysqlTimezone($db)`
5. SQL přes **prepared statements** a `TBL_*` konstanty (nikdy `"25a_objednavky"` natvrdo)
6. Response vždy `{status, data, message}` + `meta.timestamp`/`meta.version`
7. `try/catch` odděleně pro `PDOException` (500, `DB_ERROR`) a obecné `Exception`
8. Chybové hlášky v kódu i uživateli **česky**

Referenční konstanty tabulek (viz `api.eeo/api.php` pro plný seznam): `TBL_OBJEDNAVKY`, `TBL_UZIVATELE`, `TBL_FAKTURY`, `TBL_SMLOUVY`, `TBL_ORGANIZACE_VIZITKA`, `TBL_DODAVATELE`, `TBL_PRILOHY`.

Před použitím sloupce, který neznáš jistě, ověř název greppem přes existující handlery, ne odhadem:
```bash
grep -r "25_organizace_vizitka" apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/*.php | grep -i select
```

## Debugging

- Hlavní log: `/var/www/erdms-dev/logs/php-error.log` (`tail -100`, `tail -f`, grep `SQLSTATE\|Column not found`)
- V kódu debuguj přes `error_log()`, nikdy `var_dump()`/`print_r()` bez obalení — rozbije JSON response.
- Po změně v PHP: `php -l soubor.php` (syntax check) a `systemctl reload apache2` (bez sudo, už root).

## Checklist před dokončením práce v api-legacy/

- [ ] Žádné hardcoded URL/cesty/DB názvy — vše z `.env`/`$_ENV`
- [ ] `DB_NAME` = `EEO-OSTRA-DEV` (ne `eeo2025`), pokud nejde o explicitně potvrzený produkční zásah
- [ ] Endpoint: POST metoda, auth z body, response `{status, data, message}`, správné HTTP kódy
- [ ] `TBL_*` konstanty, prepared statements, `TimezoneHelper::setMysqlTimezone($db)`
- [ ] Try/catch s `error_log()`, české chybové texty
- [ ] `php -l` prošel, `php-error.log` zkontrolován, Apache reloadnut
