# ERDMS - požadavek na povolení oprávnění v Microsoft Entra ID

## Důvod požadavku
Pro pilotní funkci v dashboardu (uživatel `u03924`) potřebujeme vedle kalendáře načítat i:

- poslední e-maily,
- naposledy použité dokumenty (OneDrive/SharePoint recent).

Aktuálně funguje kalendář, ale mail/dokumenty vrací chyby typu:

- `Access is denied` (chybí oprávnění/consent),
- `Item not found` (typicky neprovisionovaný OneDrive nebo nedostatečné oprávnění).

## Aplikace, které se požadavek týká
- Název aplikace: `ERDMS`
- Tenant ID: `2bd7827b-4550-48ad-bd15-62f9a17990f1`
- Client ID (Application ID): `92eaadde-7e3e-4ad1-8c45-3b875ff5c76b`
- Redirect URI: `https://erdms.zachranka.cz/auth/callback`
- URL aplikace: `https://erdms.zachranka.cz`

## Co je potřeba povolit (Microsoft Graph - Delegated permissions)
### Již používané (ponechat)
- `User.Read`
- `Calendars.Read`
- `Calendars.Read.Shared`
- `openid`
- `profile`
- `email`

### Nově požadované
- `Mail.Read` - čtení e-mailů aktuálně přihlášeného uživatele
- `Files.Read` - čtení recent dokumentů aktuálně přihlášeného uživatele

### Volitelné fallback (pouze pokud by `Files.Read` nestačilo kvůli tenant policy)
- `Files.Read.All` (Delegated)

Poznámka: Začněte prosím minimálním rozsahem (`Mail.Read` + `Files.Read`).

## Kde se to v aplikaci používá
Backend endpointy:

- `GET /api/entra/me/messages/recent`
- `GET /api/entra/me/documents/recent`

Pilotní UI blok:
- Dashboard -> `Graph API test` -> `Mini produktový náhled` (zatím jen pro `u03924`).

## Postup pro správce (Entra Portal)
1. Otevřít `Microsoft Entra admin center`.
2. `App registrations` -> vyhledat aplikaci `ERDMS`.
3. `API permissions` -> `Add a permission` -> `Microsoft Graph` -> `Delegated permissions`.
4. Přidat:
   - `Mail.Read`
   - `Files.Read`
5. Kliknout `Grant admin consent for <tenant>`.
6. Ověřit, že stav je `Granted for <tenant>`.

## Ověření po povolení
1. Uživatel se odhlásí a znovu přihlásí do ERDMS (nový access token).
2. V dashboardu otevře `Graph API test` a spustí test.
3. Očekávaný výsledek:
   - Mail sekce vrací seznam zpráv (ne prázdná chyba `Access is denied`).
   - Dokumenty vrací recent položky (pokud má uživatel aktivní OneDrive).

## Důležité provozní poznámky
- Bez admin consent může být uživatel zablokován consent obrazovkou při loginu.
- Proto držíme login flow na minimálních scope a rozšířené scope aktivujeme až po schválení správcem.
- `Item not found` u dokumentů může znamenat, že OneDrive pro uživatele ještě není vytvořený.

## Rollback / bezpečný režim
Pokud by byly potíže, je možné dočasně běžet pouze s minimálními scope (bez `Mail.Read` a `Files.Read`) a mini náhled omezit jen na kalendář.
