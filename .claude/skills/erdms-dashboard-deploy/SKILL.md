---
name: erdms-dashboard-deploy
description: Deploy ERDMS dashboardu (portál erdms.zachranka.cz) a auth-api z /var/www/erdms-dev na produkci /var/www/erdms-platform, včetně zvýšení verze. Použij, když uživatel chce "nasadit/deploy dashboard", "dát dashboard na produkci", nebo nasadit auth-api.
---

# Deploy dashboardu + auth-api

Zdroj: `/var/www/erdms-dev/dashboard`, `/var/www/erdms-dev/auth-api` (git přes **`dashgit`**, větev `erdms-dashboard/develop`).
Produkce: `/var/www/erdms-platform/apps/dashboard` (Apache), `/var/www/erdms-platform/auth-api` (`erdms-auth-api.service`, :4000).

## 1. Verze (povinné před každým deployem)
- **Velká změna** (nová funkce, UI, zabezpečení): **+0.10** (2.20 → 2.30)
- **Drobná úprava** (oprava, text, kosmetika): **+0.01** (2.20 → 2.21)
- Pokud nejde poznat, kterou variantu použít, zeptej se uživatele.

Upravit na třech místech:
- `dashboard/.env.production`: `VITE_APP_VERSION=X.YZ`
- `dashboard/.env.development`: `VITE_APP_VERSION=X.YZ-DEV`
- `dashboard/package.json`: `"version": "X.YZ.0"`

## 2. Kontroly před deployem
- `dashgit status`: vědět, co se nasazuje. Commit jen na pokyn uživatele.
- Pokud se mění auth-api:
  - `node --check` změněných souborů.
  - Ověřit, že změna nerozbije aplikace, které volají auth-api: eeo-v2, vehicles, DS, pwahelp, burza. Grep volajících endpointu.
  - `cmp auth-api/.env.production /var/www/erdms-platform/auth-api/.env`. Deploy skript prod `.env` přepíše, takže pokud se soubory liší, zastav se a zeptej se.
- Deploy na produkci jen po potvrzení uživatele, ideálně mimo hlavní provoz.

## 3. Deploy
Skripty jsou v `docs/scripts-shell/` (spouštět z této složky). Každý si sám dělá zálohu do `/var/www/erdms-platform/backups/`.
- Jen dashboard: `./build-dashboard.sh --prod --deploy`. Build, záloha, kopie, `chown`, reload Apache.
- Jen auth-api: `./build-auth-api.sh --prod --deploy`. Stop, záloha tar, kopie `src`, `npm ci`, start. **Krátký výpadek přihlášení pro všechny aplikace.**
- Obojí: `./build-dashboard-auth.sh --prod --deploy`.

## 4. Test po deployi
- `systemctl is-active erdms-auth-api.service`, `journalctl -u erdms-auth-api -n 30`: bez chyb.
- Nasazená verze: `grep -o '2\.[0-9][0-9]' /var/www/erdms-platform/apps/dashboard/assets/*.js | sort -u`.
- Hlavičky:
  - `curl -skI https://erdms.zachranka.cz/ --resolve erdms.zachranka.cz:443:127.0.0.1` → `Cache-Control: no-cache`.
  - `/assets/*` → `immutable`.
  - `index.html` obsahuje CSP meta.
- `curl … /auth/me` bez cookie → 401, `/api/entra/user/abc/groups` → 400.
- Uživatel v prohlížeči ověří:
  - přihlášení a odhlášení;
  - pošta (obrázky v e-mailu), OneDrive, Copilot;
  - konzole bez chyb „Content-Security-Policy“;
  - proklik do eeo-v2.

## 5. Rollback
- Dashboard: obsah `/var/www/erdms-platform/backups/dashboard-backup-<ts>/` zkopírovat zpět do `apps/dashboard/`.
- auth-api: `systemctl stop erdms-auth-api`, rozbalit `backups/auth-api-backup-<ts>.tar.gz` do `/var/www/erdms-platform`, start.

## Poznámky
- Cache: v `/etc/apache2/sites-available/erdms-proxy-production.inc` (Directory dashboardu) je `index.html` nastavený na `no-cache` a `assets/` na `immutable`. Neodstraňovat, jinak se po deployi načítá stará verze.
- CSP se vkládá jen do produkčního buildu (`dashboard/vite.config.js`, plugin `erdms-csp-meta`). Nový externí zdroj (iframe, API, font) je potřeba do CSP přidat.
