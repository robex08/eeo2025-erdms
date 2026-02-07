DocumentRoot /var/www/erdms-platform/dashboard/build

<Directory /var/www/erdms-platform/dashboard/build>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
    
    # React Router - všechny requesty na index.html
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    
    # VYNECHAT API cesty z rewrite (pro ProxyPass)
    RewriteCond %{REQUEST_URI} ^/api/ [OR]
    RewriteCond %{REQUEST_URI} ^/api\.eeo [OR]
    RewriteCond %{REQUEST_URI} ^/auth
    RewriteRule ^ - [L]
    
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</Directory>

# PHP API - Alias BEZ uvozovek
Alias /api.eeo /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo

<Directory /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
    DirectoryIndex api.php
    
    <FilesMatch "\.php$">
        SetHandler "proxy:unix:/run/php/php8.4-fpm.sock|fcgi://localhost"
    </FilesMatch>
</Directory>

# EEO v2 - Přílohy (MUSÍ být PŘED hlavním /eeo-v2 Alias!)
<Location /eeo-v2/prilohy>
    ProxyPass !
</Location>

Alias /eeo-v2/prilohy /var/www/erdms-dev/data/eeo-v2/prilohy

<Directory /var/www/erdms-data/eeo-v2/prilohy>
    Options -Indexes +FollowSymLinks
    AllowOverride None
    Require all granted
    
    # Bezpečnost - zakázat vykonávání PHP
    <FilesMatch "\.php$">
        Require all denied
    </FilesMatch>
</Directory>

# EEO v2 Application - PRODUCTION (info page)
<Location /eeo-v2>
    ProxyPass !
</Location>

Alias /eeo-v2 /var/www/erdms-platform/apps/eeo-v2

<Directory /var/www/erdms-platform/apps/eeo-v2>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
    DirectoryIndex index.html
    
    # React Router pro subdirectory
    RewriteEngine On
    RewriteBase /eeo-v2/
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /eeo-v2/index.html [L]
</Directory>

# Node.js API Proxy - POŘADÍ JE DŮLEŽITÉ! (specifičtější cesty PRVNÍ)
ProxyPreserveHost On

# VYNECHAT PHP API z proxy
ProxyPass /api.eeo !

# Auth endpoints (bez /api prefixu pro Azure Entra callback a dashboard)
ProxyPass /auth http://localhost:4000/api/auth
ProxyPassReverse /auth http://localhost:4000/api/auth

# Auth API endpoints (s /api prefixem pro frontend volání)
ProxyPass /api/auth http://localhost:4000/api/auth
ProxyPassReverse /api/auth http://localhost:4000/api/auth

ProxyPass /api/users http://localhost:4000/api/users
ProxyPassReverse /api/users http://localhost:4000/api/users

# Entra API (Graph API proxy)
ProxyPass /api/entra http://localhost:4000/api/entra
ProxyPassReverse /api/entra http://localhost:4000/api/entra

# EEO v2 API
ProxyPass /api/eeo http://localhost:4001/api/eeo
ProxyPassReverse /api/eeo http://localhost:4001/api/eeo
