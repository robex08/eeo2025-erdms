- Frontend nepouziva lokalni username/password formular.
- Pro DEV lze zapnout i lokální admin fallback přes username/password, pokud je potřeba obejít Entra při lokálním testování.
# Burza Sluzby (DEV)

Nova aplikace pro ERDMS pod URL:

- Frontend: https://erdms.zachranka.cz/dev/burza-sluzby
- API: https://erdms.zachranka.cz/dev/api.burza-sluzby

## Struktura

- `client/` - React + Vite frontend
- `api/` - PHP-FPM backend (PHP 8.4)
- `apache-config-snippet.conf` - snippet pro Apache virtualhost
- `database/` - SQL migrace pro lokalni tabulky aplikace

## Auth model (Entra-only)

Burza Sluzby pouziva pouze centralni ERDMS Entra auth flow:

- `GET /auth/login?redirect=...` - zahajeni login flow
- `GET /auth/me` - overeni aktivni session (`erdms_session` cookie)
- `POST /auth/logout` - odhlaseni

Frontend nepouziva lokalni username/password formular.

### Login flow (doporučeny postup)

1. FE vyvola `GET /auth/login?redirect=<url>` a presmeruje uzivatele na `authUrl`.
2. Po navratu FE vola Burza API endpoint `GET /dev/api.burza-sluzby/me` s `credentials: include`.
3. Burza API overi session pres centralni `GET /auth/me`.
4. Burza API provede local upsert uzivatele (`burza_sluzby_users`) a vrati role/prava.

Burza API zamerne nepridava vlastni JWT vrstvu. Zdroj autentizace je centralni `erdms_session` cookie.

## Lokalni uzivatele + prava

Aplikace ma lokalni tabulku `burza_sluzby_users`, kde jsou aplikační data:

- role (`role`)
- prava (`permissions_json`)
- lokalni poznamka (`local_note`)
- aktivni flag (`aktivni`)

Pri volani `/dev/api.burza-sluzby/me` backend:

1. overi session pres centralni `/auth/me`
2. upsertne uzivatele do `burza_sluzby_users`
3. vrati spojena data (`auth_user` + `local_user`)

## Frontend (HMR)

```bash
cd /var/www/erdms-dev/apps/burza-sluzby/client
npm install
npm start
```

- `npm start` spousti Vite dev server s HMR na portu `5180`
- API volani `/dev/api.burza-sluzby/*` jsou proxovany na Apache (`http://localhost:80`)

## Build frontendu pro Apache

```bash
cd /var/www/erdms-dev/apps/burza-sluzby/client
npm run build
```

Build vystup je v `client/build` a je pripraven pro alias `/dev/burza-sluzby`.

## API

- Router: `api/index.php`
- Rewrite: `api/.htaccess`
- Health endpoint: `/dev/api.burza-sluzby/health`
- Session + local sync endpoint: `/dev/api.burza-sluzby/me`

### Aktualni endpointy (PHP API)

- `GET /dev/api.burza-sluzby/health`
- `GET /dev/api.burza-sluzby/me`
- `GET /dev/api.burza-sluzby/permissions`
- `POST /dev/api.burza-sluzby/availabilities`
- `GET /dev/api.burza-sluzby/availabilities/mine`
- `GET /dev/api.burza-sluzby/approvals/availabilities`
- `POST /dev/api.burza-sluzby/approvals/availabilities/{id}/assign`
- `POST /dev/api.burza-sluzby/approvals/availabilities/{id}/reject`
- `GET /dev/api.burza-sluzby/assignments/mine`
- `GET /dev/api.burza-sluzby/assignments/calendar`

Pred prvnim pouzitim je potreba aplikovat SQL migraci:

```bash
mysql -h <host> -u <user> -p <db_name> < /var/www/erdms-dev/apps/burza-sluzby/database/001_create_burza_sluzby_users.sql
```

## Apache konfigurace (OPATRNE + ZALOHA)

Pred jakoukoliv upravou existujiciho configu vzdy nejdriv zaloha:

```bash
sudo cp /etc/apache2/sites-available/erdms-proxy-dev.inc \
  /etc/apache2/sites-available/erdms-proxy-dev.inc.backup-$(date +%Y%m%d-%H%M%S)
```

Pak vlozit obsah z `apache-config-snippet.conf` do dev virtualhostu (typicky `erdms-proxy-dev.inc`), otestovat a reload:

```bash
sudo apachectl configtest
sudo systemctl reload apache2
```

## Rychly test

```bash
curl -sS https://erdms.zachranka.cz/dev/api.burza-sluzby/health
curl -I https://erdms.zachranka.cz/dev/burza-sluzby
```
