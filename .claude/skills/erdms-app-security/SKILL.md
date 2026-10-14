---
name: erdms-app-security
description: Bezpečná kostra nové aplikace v /var/www/erdms-dev/apps – přihlášení přes EntraID (sdílená session portálu ERDMS, auth-api /auth/me), párování uživatelů, session, CSRF, CORS, .env, Apache, logout. Použij VŽDY při zakládání nové aplikace nebo nového backendu/přihlášení v apps/ (intranet, nové projekty), a při review přihlášení existující aplikace – pokud uživatel výslovně neřekne jinak.
---

# Bezpečná kostra aplikace ERDMS (EntraID)

Shrnutí poučení z auditu 2026-10-14 (eeo-v2, vehicles, burza-sluzby, inventik, pwahelp, DS).
Cíl: nová aplikace je od prvního commitu napsaná tak, aby nebyl potřeba bezpečnostní refactor.
Pokud uživatel neřekne jinak, **přihlášení = jen EntraID přes portál ERDMS**, žádná vlastní hesla.

Referenční implementace (kopírovat odtud, ne vymýšlet znovu):
- PHP backend: `apps/burza-sluzby/api/index.php` – `fetch_auth_me()`, `find_local_user()`, `public_user()`, `enforce_csrf_guard()`, session + rate-limit
- Jednoduché PHP API + React: `apps/inventik/api/api.php` (`fetch_auth_me`, endpoint `me`, `is_owner`), `apps/inventik/src/auth.js` (login/logout), `src/pages/LoginPage.js`
- Podepsaný token (když je SPA ↔ API bez cookie): `apps/vehicles/api/vehicle/v2.0/src/Security/AuthToken.php` (`v1.<payload>.<sig>`, HMAC-SHA256)
- auth-api: `auth-api/src/routes/auth.js` (`/auth/login`, `/auth/me`, `POST /auth/logout`)
- Seznam nálezů, kterým se vyhnout: `apps/eeo-v2/_docs/SECURITY_REFACTOR_PLAN.md`, `apps/pwahelp/docs/SECURITY_AUDIT.md`

## 1. Architektura přihlášení (POVINNÉ)

```
prohlížeč ── cookie erdms_session (HttpOnly, celé erdms.zachranka.cz) ──► backend aplikace
backend ── GET http://localhost/auth/me, Host: erdms.zachranka.cz, Cookie: erdms_session=<raw> ──► auth-api
auth-api ──► { user: { entra_id, upn, email, ... }, entraData: { id: <oid> } }
```

- **Identita pochází VÝHRADNĚ ze serverového volání `/auth/me`.** Nikdy z těla požadavku, query, hlavičky,
  `localStorage`, ani z dat, která pošle frontend „po přihlášení“ (chyba eeo-v2 K4: Entra login věřil `session_data` od klienta).
- Backend přeposílá **jen cookie `erdms_session`** (raw hodnota z `HTTP_COOKIE`, validovat znaky), ne celou hlavičku Cookie.
- `/auth/me` ≠ 200 → **401**, fail-closed. Žádný „dev bypass“, žádný fallback uživatel.
- URL `/auth/me` a Host z `.env` (`<APP>_AUTH_ME_URL`, `<APP>_AUTH_HOST_HEADER`), default `http://localhost/auth/me` + `erdms.zachranka.cz`.
- Číst pevně `user.entra_id` / `entraData.id` (oid), ne benevolentní fallbacky přes různé názvy polí.
- Každý chráněný endpoint volá ověření (middleware/`require_user()` na začátku routeru), whitelist veřejných endpointů = jen `health` (bez detailů).
- Frontend má endpoint `me` → vrací přihlášeného uživatele přes `public_user()`; stav UI = `loading | anonymous | authenticated | error`.

## 2. Párování na lokálního uživatele

- Klíč = **Entra oid** (`entra_id`), unikátní index v DB.
- Fallback UPN/e-mail **jen** pro účet, který ještě nemá `entra_id`, a **jen při právě jedné shodě** → pak `entra_id` doplnit.
  Existující `entra_id` **nikdy nepřepisovat** (vehicles fix). Nejednoznačnost → odmítnout, nehádat (`rows[0]` je chyba – pwahelp S-3).
- Neznámý uživatel: podle aplikace buď 403 „nemáte přístup“, nebo auto-provisioning s nejnižší rolí – rozhodnout s uživatelem.
- Lokální testovací účty (bez Entra) jen na DEV a jen když je uživatel chce; na produkci žádné.

## 3. Autorizace

- Role/oprávnění z **lokální DB** aplikace, ne z klienta. Kontrola na serveru u každé akce.
- Objektová autorizace: čtení/zápis záznamu podle ID vždy ověřit vlastnictví/viditelnost (`is_owner`, `assertVisible`) –
  sekvenční ID nesmí stačit (pwahelp V-1/V-2, eeo-v2 přílohy).
- Admin/sync/import endpointy jen pro admin role (vehicles sync).
- Odpovědi přes whitelist polí (`public_user()`) – nikdy `SELECT *` rovnou do JSON (hash hesla, interní poznámky).

## 4. Session aplikace / token

Preferovat **bez vlastní session** – každý požadavek ověřit přes `/auth/me` (lze krátce cachovat, max. ~60 s).
Pokud vlastní session/token je potřeba:
- PHP session: `use_strict_mode=1`, `use_only_cookies=1`, vlastní `session_name`, cookie `HttpOnly`, `Secure`, `SameSite=Lax`,
  `path` z `.env` (ne natvrdo `/dev`), idle timeout (8 h) + absolutní limit (12 h), `session_regenerate_id(true)` po přihlášení.
- Token: `v1.<base64url payload>.<HMAC-SHA256>` s `exp`, `hash_equals`, tajný klíč z `.env`, **bez klíče = fail-closed**.
  Nikdy `base64(username|time)` (eeo-v2 K3). Token ideálně v HttpOnly cookie, ne v `localStorage`.
- Session nesmí přežít odhlášení z portálu dlouho → krátké TTL nebo periodické přeověření `/auth/me`.

## 5. Login / logout ve frontendu

- Login: `GET /auth/login?redirect=<relativní cesta aplikace>&origin=<window.location.origin>` → `authUrl` (ověřit `https://`) → redirect.
  auth-api povoluje jen relativní redirect / allowlist originů (ochrana proti open redirect) – nic neobcházet.
- Logout: `POST /auth/logout` (JSON, `credentials: 'same-origin'`) → `logoutUrl` (ověřit prefix `https://login.microsoftonline.com/`) → redirect.
  Odhlásí z portálu i všech aplikací – tlačítko „Odhlásit“ s tímto popisem **musí být v UI** (inventik ho neměl).
- Vždy i odkaz zpět na portál `https://erdms.zachranka.cz/`.

## 6. CSRF, CORS, vstupy

- **Žádné CORS** (`Access-Control-Allow-Origin: *` zakázáno) – aplikace běží na stejném originu jako portál.
- Zápisy (POST/PUT/PATCH/DELETE): kontrola `Origin`/`Referer` proti `erdms.zachranka.cz` + vlastnímu hostu, tělo jen
  `application/json` (jinak 415) → `enforce_csrf_guard()` z burzy.
- Rate-limit přihlášení a akcí, které posílají e-maily/tikety (burza: 5 / 15 min).
- SQL jen prepared statements; délkové limity polí a `limit` u výpisů.
- Výstup do HTML escapovat; žádné `dangerouslySetInnerHTML` s daty; CSP `script-src 'self'`.
- Upload: whitelist přípon + MIME, **ne SVG/HTML**, ukládat mimo webroot, servírovat přes autorizovaný endpoint
  s `Content-Disposition` a `X-Content-Type-Options: nosniff` (eeo-v2 K5).
- Chyby: klientovi generická hláška, detail do `error_log`. Nikdy v odpovědi `debug`, SQL, hash, stack trace (eeo-v2 K1).

## 7. Konfigurace a soubory

- Tajemství jen v `.env` (mimo git, v `.gitignore`), práva **`640 root:www-data`**; `.env.example` bez hodnot.
- Ladicí/DEV režim jen z `.env` / serverové konfigurace, **nikdy z URL nebo hlavičky** (eeo-v2 K5 `IS_DEV_ENV`).
- Do repa ani na server nedávat: `phpinfo*.php`, `test_*.php`, `*.backup*`, `*.orig`, `*.old`, SQL dumpy, seed hesla v komentářích.
  Apache je sice globálně blokuje (`/etc/apache2/conf-available/erdms-deny-sensitive.conf`: dotfiles, `.md/.sql/.bak/.example/.log`,
  zálohy, `phpinfo*`, `test[-_]*.php`), ale to je pojistka, ne řešení.
- CLI skripty (importy, migrace) s guardem `if (PHP_SAPI !== 'cli') exit;` a ideálně mimo webroot.
- Dočasná/data složky mimo webroot nebo `Require all denied`.
- Migrace DB jako soubory v `migrations/`, spouštět nejdřív jen na DEV.

## 8. Postup při zakládání nové aplikace

1. Git repo přes skill `erdms-app-git` (`<app>/develop`).
2. Backend: zkopírovat z burzy `fetch_auth_me` (+ normalize), `require_user`, `find_local_user` (oid → jednoznačný fallback),
   `public_user`, `enforce_csrf_guard`, `send_json`; endpoint `me` a `health`.
3. Frontend: `auth.js` podle inventiku (AuthProvider, `startPortalLogin`, `portalLogout`), LoginPage, tlačítko Odhlásit.
4. `.env` + `.env.example`, práva 640, `.gitignore`.
5. Apache: `/dev/<app>` include, bez CORS hlaviček; ověřit `curl -I` na `.env`, `.git`, `*.md` → 403.
6. Ověřit checklist níže na DEV, teprve pak produkce.

## 9. Kontrolní checklist (před prvním deployem i při review)

- [ ] Bez cookie `erdms_session` vrací každý datový endpoint 401 (`curl` bez cookie).
- [ ] Podvržené `user_id`/`username`/`entra_id` v těle ani query nic nezmění.
- [ ] Cizí záznam podle ID → 403/404.
- [ ] POST s cizím `Origin` → 403, s `text/plain` → 415.
- [ ] Žádná `Access-Control-Allow-*` hlavička.
- [ ] Odpověď `me`/user neobsahuje hash, tokeny ani interní pole.
- [ ] Chyba (špatný vstup, výpadek DB) nevrací SQL/stack/debug.
- [ ] `.env`, `.git`, dumpy, test skripty → 403; `.env` má 640.
- [ ] Odhlásit funguje (portál i Microsoft) a po něm API vrací 401.
- [ ] Žádný lokální login/heslo, pokud ho uživatel výslovně nechtěl; žádný přepínač DEV z URL.

## Na co dát bacha

- **Restart auth-api odhlásí všechny uživatele portálu** – nové aplikace nesmí vyžadovat změny auth-api bez domluvy;
  změna auth-api nesmí rozbít přihlášení eeo-v2 (má zatím starý mechanismus).
- Produkční `.env` a produkční DB nikdy neměnit bez výslovného pokynu; vše nejdřív DEV.
- Aplikace za proxy 10.1.1.51 – IP klienta řešit přes `remoteip`, ne slepou důvěrou v `X-Forwarded-For`.
- Integrace s externím systémem (iTop apod.): servisní token vidí vše → autorizace je celá na nás; test vs. ostrá instance
  explicitním přepínačem v `.env` s varováním v UI; test iTop posílá skutečné e-maily.
