# EEO v2 (ERDMS)

React + PHP (legacy) aplikace pro evidenci objednávek, faktur, pokladní knihy a smluv. Tohle je hlavní vyvíjený projekt v repu `erdms-dev`.

## Struktura

- `client/` — React frontend (react-app-rewired). Zdroj: `client/src/`.
- `api-legacy/` — produkční PHP 8.4 API (`api.eeo/`), handlery v `api.eeo/v2025.03_25/lib/*Handlers.php`. Viz skill `php-legacy-guardian`.
- `api/` — novější Node.js API (menší rozsah, `api/src/`).
- `_docs/`, `_sql/` — aktuální (nikoliv archivované) poznámky a SQL skripty k projektu.
- `client/docs/` — aktuální architektonické poznámky (např. `NOTIFICATION-BELL-BADGE-ARCHITECTURE.md`); staré `archived-old/` už bylo archivováno dřív.

Staré/dokončené debug, test a fix soubory (desítky `test_*.php`, `FIX_*.md`, `ANALYZA_*.md` apod.) byly v září 2026 přesunuty mimo repo do `/home/erdms_zalohy/eeo-v2/` — pokud narazíš na odkaz na takový soubor ve staré dokumentaci, už není v repu.

## Prostředí (DEV vs PROD)

- **DEV:** DB `EEO-OSTRA-DEV`, build `npm run build:dev:explicit` → `client/build/`, API `/dev/api.eeo/`
- **PROD:** DB `eeo2025`, build `npm run build:prod` → `client/build-prod/`, API `/api.eeo/`, nasazeno v `/var/www/erdms-platform/`
- Detail postupu a troubleshooting: skill `eeo-build-troubleshoot`

## Klíčové konvence

- **Žádné hardcoded URL/cesty/DB názvy.** Vždy z `.env` / `process.env.REACT_APP_*` (FE) nebo `$_ENV` (PHP). Fallback jen relativní (`/api.eeo/`), nikdy absolutní produkční URL.
- **PHP API endpointy** mají pevnou strukturu (metoda, auth z body, PDO prepared statements, `TBL_*` konstanty místo hardcoded názvů tabulek, `TimezoneHelper::setMysqlTimezone($db)`) — viz skill `php-legacy-guardian`.
- **React state update ze starého stavu:** vždy `setX(prev => ...)`, nikdy `setX(x + 1)`.
- **Async řetězení:** vždy `async/await`, nikdy `.then()`/callbacky. Minimalizovat `useEffect`/`setTimeout`, pokud jde řešit synchronně.
- **Tabulky v UI:** řídit se vzorem `Order25List.js` (dvouřádková hlavička s vyhledávacími poli, paginace, akční sloupec s ikonou blesku). Detail v skill `eeo-fe-conventions`.
- **Komunikace v konverzaci a commit messages:** česky.

## Produkční bezpečnost — NEJVYŠŠÍ PRIORITA

- **Nikdy** neupravovat `/var/www/erdms-platform/` (produkce) bez explicitního potvrzení uživatele.
- **Nikdy** neměnit produkční `.env` nebo pracovat s DB `eeo2025` bez potvrzení (dev DB je `EEO-OSTRA-DEV`).
- **Nikdy** `rsync --delete` směrem k produkci.

Podrobný checklist a auto-detekce rizikových vzorů: skill `php-legacy-guardian` (aktivuje se při práci v `api-legacy/`).

## Skilly v tomto projektu

- `php-legacy-guardian` — produkční bezpečnost + konvence pro `api-legacy/*.php`
- `eeo-build-troubleshoot` — DEV/PROD build, časté chyby, deploy postup
- `eeo-fe-conventions` — React/JS konvence, tabulky, state management
