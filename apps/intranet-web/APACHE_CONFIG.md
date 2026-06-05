# Apache Configuration for Intranet Web

## Development Setup

⚠️ **NEPOUŽÍVAT SYMLINKY!** Aplikace běží přímo z `/var/www/erdms-dev/apps/` přes Apache Alias.

### Konfigurace je v:
- `/etc/apache2/sites-available/erdms-proxy-dev.inc`

URL:
- Frontend: `/dev/intranet-web` → `/var/www/erdms-dev/apps/intranet-web/client/build`
- API: `/dev/api-intranet-web` → `/var/www/erdms-dev/apps/intranet-web/api`

### 2. Apache Virtual Host Snippet

Přidej do konfigurace virtuálního hostu pro `erdms.zachranka.cz`:

```apache
# Intranet Web - Development
Alias /dev/intranet-web "/var/www/erdms-dev/apps/intranet-web/client/build"
Alias /dev/intranet-web/api "/var/www/erdms-dev/apps/intranet-web/api"

<Directory "/var/www/erdms-dev/apps/intranet-web/client/build">
    Options -Indexes +FollowSymLinks
    AllowOverride None
    Require all granted
    
    # React Router - pokud soubor neexistuje, vrať index.html
    <IfModule mod_rewrite.c>
        RewriteEngine On
        RewriteBase /dev/intranet-web/
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_URI} !^/dev/intranet-web/api/
        RewriteRule . /dev/intranet-web/index.html [L]
    </IfModule>
</Directory>

<Directory "/var/www/erdms-dev/apps/intranet-web/api">
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
    
    # PHP handler
    <FilesMatch \.php$>
        SetHandler "proxy:unix:/run/php/php8.1-fpm.sock|fcgi://localhost"
    </FilesMatch>
</Directory>
```

### 3. Povol mod_rewrite pokud není

```bash
sudo a2enmod rewrite
sudo a2enmod proxy_fcgi
sudo systemctl reload apache2
```

### 4. Oprávnění

```bash
# Nastav správná oprávnění
sudo chown -R www-data:www-data /var/www/erdms-dev/apps/intranet-web/client/build
sudo chown -R www-data:www-data /var/www/erdms-dev/apps/intranet-web/api
sudo chmod -R 755 /var/www/erdms-dev/apps/intranet-web
```

## Production Setup (/intranet-web)

Pro produkci použij podobnou konfiguraci, ale místo `/dev/intranet-web` použij `/intranet-web` a symlink do `/var/www/erdms-platform/`.

### Production Symlinks

```bash
# Production build
sudo ln -s /var/www/erdms-platform/apps/intranet-web/client/build /var/www/html/intranet-web

# Production API
sudo ln -s /var/www/erdms-platform/apps/intranet-web/api /var/www/html/intranet-web/api
```

## Testing

Po nastavení:

1. Build frontend: `cd client && npm run build`
2. Test URL: `https://erdms.zachranka.cz/dev/intranet-web`
3. Test API: `https://erdms.zachranka.cz/dev/intranet-web/api/health`

## Troubleshooting

### React Router nefunguje (404 na refresh)
- Zkontroluj, že mod_rewrite je povolen
- Ověř RewriteBase v Apache konfiguraci

### API vrací 404
- Zkontroluj symlink na api složku
- Ověř, že .htaccess v api/ má správná pravidla
- Zkontroluj PHP-FPM konfiguraci

### CORS chyby
- Zkontroluj allowed origins v `api/index.php`
- Ověř, že mod_headers je povolen

### PHP chyby
- Zkontroluj Apache error log: `/var/log/apache2/error.log`
- Zkontroluj PHP-FPM log: `/var/log/php8.1-fpm.log`
