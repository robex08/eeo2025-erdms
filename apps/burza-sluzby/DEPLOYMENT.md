# Burza Sluzby - DEV Deployment

Tento dokument popisuje pouze DEV variantu.

## 1. Frontend build

```bash
cd /var/www/erdms-dev/apps/burza-sluzby/client
npm install
npm run build
```

## 2. Bezpecna zaloha Apache configu

```bash
sudo cp /etc/apache2/sites-available/erdms-proxy-dev.inc \
  /etc/apache2/sites-available/erdms-proxy-dev.inc.backup-$(date +%Y%m%d-%H%M%S)
```

## 3. Pridani aliasu a PHP-FPM handleru

Pouzij snippet z:

- `/var/www/erdms-dev/apps/burza-sluzby/apache-config-snippet.conf`

## 4. Entra auth endpointy (bezpecna kontrola)

Burza Sluzby pouziva centralni endpointy `/auth/*`:

- `GET /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

Pred testem over, ze auth-api bezi a Apache je routuje.

## 5. Migrace lokalni tabulky uzivatelu

```bash
mysql -h <host> -u <user> -p <db_name> < /var/www/erdms-dev/apps/burza-sluzby/database/001_create_burza_sluzby_users.sql
```

Nastav API env promenne podle:

- `/var/www/erdms-dev/apps/burza-sluzby/api/.env.example`

## 6. Validace konfigurace

```bash
sudo apachectl configtest
sudo systemctl reload apache2
```

## 7. Test endpointu

```bash
curl -sS https://erdms.zachranka.cz/dev/api.burza-sluzby/health
curl -sS https://erdms.zachranka.cz/auth/me
curl -I https://erdms.zachranka.cz/dev/burza-sluzby
```

Kontrola, ze se servira spravny frontend (ne dashboard):

```bash
curl -sS https://erdms.zachranka.cz/dev/burza-sluzby | grep -E "/dev/burza-sluzby/assets/index-"
```

Pokud se v HTML objevi `/assets/index-Ddoy-iNT.js`, servira se dashboard fallback.
Pak je potreba:

- vlozit burza snippet pred dashboard rewrite blok
- pridat rewrite exclusions pro `/dev/burza-sluzby` a `/dev/api.burza-sluzby`

## 8. HMR pri vyvoji

```bash
cd /var/www/erdms-dev/apps/burza-sluzby/client
npm start
```

Dev server bezi na portu `5180`.
