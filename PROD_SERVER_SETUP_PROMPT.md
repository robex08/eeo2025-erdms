# PROMPT PRO AI NA PRODUKČNÍM SERVERU – ERDMS Platform Setup

> **Úkol:** Nastavit Apache konfiguraci a runtime prostředí pro `/var/www/erdms-platform` – produkční provoz aplikací **Dashboard** (root `/`) a **EEO v2** (`/eeo-v2`).
> **Referenční DEV server:** `erdms.zachranka.cz` (10.3.174.11) – vše běží a funguje, konfigurace níže je odtud.

---

## 1. CO OVĚŘIT NA PRODUKČNÍM SERVERU

### 1.1 Operační systém a základní balíčky
```bash
cat /etc/os-release
apt update && apt list --upgradable
```

### 1.2 Apache
```bash
apache2 -v
# Vyžadováno: Apache 2.4.x (na DEV je 2.4.66)

# Ověř enabled moduly – VŠECHNY musí být aktivní:
apache2ctl -M 2>/dev/null | grep -E "proxy|rewrite|ssl|headers|alias|deflate|fcgi"
```

**Požadované Apache moduly:**
```bash
a2enmod alias
a2enmod rewrite
a2enmod headers
a2enmod proxy
a2enmod proxy_http
a2enmod proxy_fcgi
a2enmod proxy_wstunnel
a2enmod ssl
a2enmod deflate
```

Po aktivaci: `systemctl restart apache2`

### 1.3 PHP 8.4 + PHP-FPM
```bash
php -v
# Vyžadováno: PHP 8.4.x (na DEV je 8.4.16)

# Pokud není nainstalován:
apt install php8.4-fpm php8.4-mysql php8.4-mbstring php8.4-xml php8.4-curl php8.4-zip php8.4-gd php8.4-intl

# Ověř PHP-FPM socket:
ls -la /run/php/php8.4-fpm.sock
systemctl status php8.4-fpm
```

### 1.4 Node.js 20.x + npm
```bash
node -v
# Vyžadováno: Node.js v20.19.x (na DEV je v20.19.6)

npm -v
# Vyžadováno: npm 11.x (na DEV je 11.6.4)

# Pokud Node.js není nainstalován – doporučeno NVM:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# POZNÁMKA: systemd služby musí mít absolutní cestu k node!
# Zjisti: which node  →  např. /root/.nvm/versions/node/v20.19.6/bin/node
```

### 1.5 MariaDB / MySQL klient
```bash
mysql --version
# Databáze je na JINÉM serveru (10.3.172.11), potřeba jen klient pro diagnostiku
apt install mariadb-client
```

---

## 2. ADRESÁŘOVÁ STRUKTURA

```bash
# Ověř a případně vytvoř:
mkdir -p /var/www/erdms-platform/apps/eeo-v2
mkdir -p /var/www/erdms-platform/apps/eeo-v2/api
mkdir -p /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo
mkdir -p /var/www/erdms-platform/apps/dashboard
mkdir -p /var/www/erdms-platform/auth-api
mkdir -p /var/www/erdms-platform/data/eeo-v2/prilohy
mkdir -p /var/www/erdms-platform/data/eeo-v2/sablony
mkdir -p /var/www/erdms-platform/data/eeo-v2/manualy
mkdir -p /var/www/erdms-platform/backups
mkdir -p /var/www/erdms-platform/config
mkdir -p /var/log/erdms

chown -R www-data:www-data /var/www/erdms-platform/data
chown -R www-data:www-data /var/www/erdms-platform/apps/eeo-v2/api
chown -R www-data:www-data /var/www/erdms-platform/apps/eeo-v2/api-legacy
```

**Očekávaná finální struktura:**
```
/var/www/erdms-platform/
├── apps/
│   ├── dashboard/          ← Vite React build (root /)
│   │   ├── assets/
│   │   ├── index.html
│   │   └── logo-ZZS.png
│   ├── eeo-v2/             ← CRA React build (/eeo-v2)
│   │   ├── api/            ← Node.js API (port 4001) – NESMÍ SE SMAZAT!
│   │   ├── api-legacy/     ← PHP API (/api.eeo) – NESMÍ SE SMAZAT!
│   │   │   └── api.eeo/
│   │   ├── static/         ← Frontend JS/CSS
│   │   ├── index.html      ← Frontend
│   │   └── ...
│   ├── intranet/           ← (budoucí)
│   └── szm/                ← (budoucí)
├── auth-api/               ← Node.js Auth API (port 4000)
│   └── src/index.js
├── data/
│   └── eeo-v2/
│       ├── prilohy/        ← Upload přílohy
│       ├── sablony/        ← DOCX šablony
│       └── manualy/        ← Manuály
├── backups/
└── config/
```

---

## 3. PHP-FPM POOL KONFIGURACE

### Produkční pool (`/etc/php/8.4/fpm/pool.d/www.conf`):
```ini
[www]
user = www-data
group = www-data

listen = /run/php/php8.4-fpm.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

pm = dynamic
pm.max_children = 100
pm.start_servers = 25
pm.min_spare_servers = 10
pm.max_spare_servers = 40
pm.max_requests = 500

chdir = /

catch_workers_output = yes
decorate_workers_output = no

php_admin_value[error_reporting] = 32767
php_admin_flag[log_errors] = on
php_admin_flag[display_errors] = off
php_admin_flag[display_startup_errors] = off
php_value[error_log] = /var/log/erdms/php-error.log

php_admin_value[max_execution_time] = 300
php_admin_value[memory_limit] = 256M
```

```bash
systemctl restart php8.4-fpm
systemctl status php8.4-fpm
ls -la /run/php/php8.4-fpm.sock
```

---

## 4. NODE.JS SYSTEMD SLUŽBY

### 4.1 Auth API – `/etc/systemd/system/erdms-auth-api.service`
```ini
[Unit]
Description=ERDMS Auth API Server - Microsoft Entra ID Authentication
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/erdms-platform/auth-api
Environment="NODE_ENV=production"
Environment="PORT=4000"
ExecStart=/root/.nvm/versions/node/v20.19.6/bin/node src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### 4.2 EEO v2 Node API – `/etc/systemd/system/erdms-eeo-api.service`
```ini
[Unit]
Description=ERDMS EEO v2 API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/erdms-platform/apps/eeo-v2/api
Environment="NODE_ENV=production"
Environment="PORT=4001"
ExecStart=/root/.nvm/versions/node/v20.19.6/bin/node src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

**⚠️ DŮLEŽITÉ:** Uprav cestu `ExecStart` na skutečnou cestu k `node` na PROD serveru:
```bash
which node
# Nahraď /root/.nvm/versions/node/v20.19.6/bin/node správnou cestou
```

```bash
systemctl daemon-reload
systemctl enable erdms-auth-api erdms-eeo-api
systemctl start erdms-auth-api erdms-eeo-api
systemctl status erdms-auth-api erdms-eeo-api
```

---

## 5. APACHE VIRTUALHOST KONFIGURACE

### Soubor: `/etc/apache2/sites-available/erdms-platform.conf`

```apache
# ============================================
# ERDMS Platform - Production Apache Config
# Domain: erdms.zachranka.cz
# ============================================

<VirtualHost *:80>
    ServerName erdms.zachranka.cz
    ServerAdmin admin@zachranka.cz
    Redirect permanent / https://erdms.zachranka.cz/
</VirtualHost>

<VirtualHost *:443>
    ServerName erdms.zachranka.cz
    ServerAdmin admin@zachranka.cz

    # ==========================================
    # SSL (odkomentovat když je certifikát ready)
    # ==========================================
    # SSLEngine on
    # SSLCertificateFile /etc/letsencrypt/live/erdms.zachranka.cz/fullchain.pem
    # SSLCertificateKeyFile /etc/letsencrypt/live/erdms.zachranka.cz/privkey.pem

    # ==========================================
    # AUTH API (Node.js na portu 4000)
    # MUSÍ BÝT PŘED Alias/DocumentRoot!
    # ==========================================
    ProxyPreserveHost On
    ProxyPass /auth http://localhost:4000/api/auth
    ProxyPassReverse /auth http://localhost:4000/api/auth

    ProxyPass /api/users http://localhost:4000/api/users
    ProxyPassReverse /api/users http://localhost:4000/api/users

    # ==========================================
    # EEO NODE.JS API (port 4001)
    # MUSÍ BÝT PŘED Alias/Directory bloky!
    # ==========================================
    ProxyPass /api/eeo http://localhost:4001/api/eeo
    ProxyPassReverse /api/eeo http://localhost:4001/api/eeo

    # ==========================================
    # EEO-V2 Frontend – vyřadit z ProxyPass
    # ==========================================
    <Location /eeo-v2>
        ProxyPass !
    </Location>

    # ==========================================
    # PRODUCTION EEO-V2 Frontend (/eeo-v2/)
    # React CRA build – SPA routing
    # ==========================================
    Alias /eeo-v2 /var/www/erdms-platform/apps/eeo-v2

    <Directory /var/www/erdms-platform/apps/eeo-v2>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        DirectoryIndex index.html

        RewriteEngine On
        RewriteBase /eeo-v2/
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /eeo-v2/index.html [L]
    </Directory>

    # ==========================================
    # EEO LEGACY PHP API (/api.eeo/)
    # ==========================================
    Alias /api.eeo /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo

    <Directory /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo>
        Options +ExecCGI -Indexes
        AllowOverride All
        Require all granted

        # PROD Environment Variables
        SetEnv DB_HOST "10.3.172.11"
        SetEnv DB_PORT "3306"
        SetEnv DB_NAME "eeo2025"
        SetEnv DB_USER "erdms_user"
        SetEnv DB_PASSWORD "CHANGE_ME_DB_PASSWORD"
        SetEnv APP_ENV "production"
        SetEnv UPLOAD_ROOT_PATH "/var/www/erdms-platform/data/eeo-v2/prilohy/"
        SetEnv DOCX_TEMPLATES_PATH "/var/www/erdms-platform/data/eeo-v2/sablony/"

        # PHP-FPM Handler
        <FilesMatch "\.php$">
            SetHandler "proxy:unix:/run/php/php8.4-fpm.sock|fcgi://localhost"
        </FilesMatch>

        DirectoryIndex api.php
    </Directory>

    # ==========================================
    # DASHBOARD (root /) – Vite React build
    # MUSÍ BÝT POSLEDNÍ – fallback pro vše ostatní
    # ==========================================
    DocumentRoot /var/www/erdms-platform/apps/dashboard

    <Directory /var/www/erdms-platform/apps/dashboard>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # ==========================================
    # LOGS
    # ==========================================
    ErrorLog ${APACHE_LOG_DIR}/erdms-error.log
    CustomLog ${APACHE_LOG_DIR}/erdms-access.log combined

    # ==========================================
    # SECURITY HEADERS
    # ==========================================
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # ==========================================
    # COMPRESSION
    # ==========================================
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css
        AddOutputFilterByType DEFLATE application/javascript application/json
        AddOutputFilterByType DEFLATE image/svg+xml
    </IfModule>

</VirtualHost>
```

### Aktivace:
```bash
a2ensite erdms-platform.conf
a2dissite 000-default.conf   # případně starou konfiguraci
apache2ctl configtest        # MUSÍ vrátit "Syntax OK"
systemctl reload apache2
```

---

## 6. ENVIRONMENT SOUBORY PRO APLIKACE

### 6.1 EEO v2 PHP API – `/var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env`
```env
DB_HOST=10.3.172.11
DB_PORT=3306
DB_NAME=eeo2025
DB_USER=erdms_user
DB_PASSWORD=CHANGE_ME_DB_PASSWORD
DB_CHARSET=utf8mb4
REACT_APP_VERSION=2.40
APP_ENV=production
UPLOAD_ROOT_PATH=/var/www/erdms-platform/data/eeo-v2/prilohy/
DOCX_TEMPLATES_PATH=/var/www/erdms-platform/data/eeo-v2/sablony/
MANUALS_PATH=/var/www/erdms-platform/data/eeo-v2/manualy/
```

### 6.2 EEO v2 Frontend build – `.env.production` (pro build)
```env
REACT_APP_ENCRYPTION_DEBUG=false
REACT_APP_DB_ORDER_KEY=objednavky0123
REACT_APP_DB_ATTACHMENT_KEY=oprilohy0123
REACT_APP_DB_OBJMETADATA_KEY=r_objMetaData
REACT_APP_API_BASE_URL=https://erdms.zachranka.cz/api
REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/api.eeo/
REACT_APP_DB_NAME=eeo2025
REACT_APP_VERSION=2.40
```

### 6.3 Dashboard – `.env.production` (pro build)
```env
VITE_API_URL=https://erdms.zachranka.cz
VITE_AUTH_API_URL=https://erdms.zachranka.cz/auth
VITE_ENTRA_CLIENT_ID=92eaadde-7e3e-4ad1-8c45-3b875ff5c76b
VITE_ENTRA_TENANT_ID=2bd7827b-4550-48ad-bd15-62f9a17990f1
VITE_ENTRA_AUTHORITY=https://login.microsoftonline.com/2bd7827b-4550-48ad-bd15-62f9a17990f1
VITE_REDIRECT_URI=https://erdms.zachranka.cz
VITE_APP_NAME=ERDMS Dashboard
VITE_APP_VERSION=2.12
```

---

## 7. BUILD PŘÍKAZY (spustit na build serveru / DEV)

### Dashboard (Vite):
```bash
cd /var/www/erdms-dev/dashboard
npm ci
npm run build
# Výstup: /var/www/erdms-dev/dashboard/build/
# Kopírovat: rsync -av build/ /var/www/erdms-platform/apps/dashboard/
```

### EEO v2 Frontend (CRA):
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm ci
npm run build:prod
# Výstup: /var/www/erdms-dev/apps/eeo-v2/client/build-prod/
# Kopírovat: rsync -av build-prod/ /var/www/erdms-platform/apps/eeo-v2/
# ⚠️ NIKDY s --delete! Smazalo by api/ a api-legacy/!
```

### Auth API (Node.js):
```bash
cd /var/www/erdms-platform/auth-api
npm ci --production
systemctl restart erdms-auth-api
```

### EEO Node API:
```bash
cd /var/www/erdms-platform/apps/eeo-v2/api
npm ci --production
systemctl restart erdms-eeo-api
```

---

## 8. VERIFIKACE PO NASAZENÍ

```bash
# 1. Apache syntax test
apache2ctl configtest

# 2. PHP-FPM běží
systemctl status php8.4-fpm

# 3. Node služby běží
systemctl status erdms-auth-api
systemctl status erdms-eeo-api

# 4. Sockety existují
ls -la /run/php/php8.4-fpm.sock

# 5. Test Dashboard (root /)
curl -s -o /dev/null -w "%{http_code}" https://erdms.zachranka.cz/
# Očekáváno: 200

# 6. Test EEO v2 frontend
curl -s -o /dev/null -w "%{http_code}" https://erdms.zachranka.cz/eeo-v2/
# Očekáváno: 200

# 7. Test PHP API
curl -s -o /dev/null -w "%{http_code}" https://erdms.zachranka.cz/api.eeo/system-info.php
# Očekáváno: 200

# 8. Test Auth API
curl -s -o /dev/null -w "%{http_code}" https://erdms.zachranka.cz/auth/status
# Očekáváno: 200 nebo 401

# 9. Test Node API
curl -s -o /dev/null -w "%{http_code}" https://erdms.zachranka.cz/api/eeo/health
# Očekáváno: 200

# 10. API složky EXISTUJÍ (kritické!)
ls -la /var/www/erdms-platform/apps/eeo-v2/ | grep -E "^d.*api"
# Musí být: api/ a api-legacy/
```

---

## 9. SOUHRN VERZÍ A PORTŮ

| Komponenta        | Verze       | Port/Socket                          | Cesta                                          |
|-------------------|-------------|--------------------------------------|-------------------------------------------------|
| Apache            | 2.4.x       | 80, 443                             | –                                               |
| PHP               | 8.4.x       | `/run/php/php8.4-fpm.sock`          | –                                               |
| Node.js           | 20.19.x     | –                                    | `/root/.nvm/versions/node/v20.19.6/bin/node`   |
| npm               | 11.x        | –                                    | –                                               |
| Auth API          | 1.0.0       | 4000                                | `/var/www/erdms-platform/auth-api`              |
| EEO Node API      | –           | 4001                                | `/var/www/erdms-platform/apps/eeo-v2/api`       |
| EEO PHP API       | –           | FPM socket                          | `/var/www/erdms-platform/apps/eeo-v2/api-legacy`|
| Dashboard (Vite)  | 2.12        | – (static)                          | `/var/www/erdms-platform/apps/dashboard`        |
| EEO v2 (CRA)      | 2.40        | – (static)                          | `/var/www/erdms-platform/apps/eeo-v2`           |
| React (EEO)       | 18.2.0      | –                                    | –                                               |
| React (Dashboard) | 19.2.0      | –                                    | –                                               |
| Databáze          | MariaDB     | 10.3.172.11:3306                    | DB: `eeo2025`                                   |

---

## 10. ČASTÉ PROBLÉMY

1. **403 Forbidden** → Zkontroluj `chown -R www-data:www-data` na datových složkách a `Require all granted` v Apache.
2. **502 Bad Gateway** na `/auth` nebo `/api/eeo` → Node služba neběží. `systemctl status erdms-auth-api`.
3. **503** na PHP API → PHP-FPM neběží nebo socket neexistuje. `systemctl restart php8.4-fpm`.
4. **React SPA 404** → Chybí `RewriteEngine` / `.htaccess` → ověř `AllowOverride All` a `a2enmod rewrite`.
5. **CORS chyby** → Ověř `ProxyPreserveHost On` v Apache.
6. **Build selhává (out of memory)** → Node potřebuje `NODE_OPTIONS=--max_old_space_size=8192`.
