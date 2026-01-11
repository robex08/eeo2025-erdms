# 📁 ERDMS Platform - Production Directory Structure

**Created:** 20. prosince 2025  
**Version:** 2.0 - SIMPLIFIED  
**Environment:** Production

---

## 🎯 Design Philosophy

- **Simple & Portable** - Easy to backup and transfer to another server
- **No Symlinks** - Direct paths only, no complexity
- **Multi-App Ready** - Easy to add new applications (SZM, Intranet, etc.)
- **Centralized Auth** - One SSO system for all applications
- **Flat Attachment Storage** - XFS handles large directories efficiently

---

## 🏗️ Complete Directory Structure

```
/var/www/erdms-platform/
│
├── apps/                                    # All applications (current versions only)
│   ├── eeo-v2/                             # Economics & Invoicing
│   │   ├── client/                         # React frontend
│   │   │   └── build/                      # Production build
│   │   │       ├── index.html
│   │   │       ├── assets/
│   │   │       └── static/
│   │   ├── api/                            # Node.js API
│   │   │   ├── src/
│   │   │   ├── dist/
│   │   │   ├── package.json
│   │   │   ├── node_modules/
│   │   │   └── .env.production
│   │   └── api-legacy/                     # PHP API
│   │       └── api.eeo/
│   │           ├── api.php
│   │           ├── .env                    # Production ENV
│   │           ├── config/
│   │           │   ├── AppConfig.php
│   │           │   ├── constants.php
│   │           │   └── environments/
│   │           └── v2025.03_25/
│   │
│   ├── dashboard/                          # Main dashboard React app
│   │   └── build/                          # Production build
│   │       ├── index.html
│   │       ├── assets/
│   │       └── static/
│   │
│   ├── szm/                                # 🔜 Document Management (planned)
│   │   ├── client/build/
│   │   └── api/
│   │
│   └── intranet/                           # 🔜 Intranet Portal (planned)
│       └── build/
│
├── auth/                                    # 🔐 Central SSO Authentication
│   ├── src/                                # Node.js authentication service
│   │   ├── server.js
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── utils/
│   ├── config/
│   │   ├── .env.production                 # Auth credentials
│   │   ├── azure-apps.json                 # Registered applications
│   │   │   # {
│   │   │   #   "apps": [
│   │   │   #     {"name": "eeo-v2", "url": "...", "allowed": true},
│   │   │   #     {"name": "szm", "url": "...", "allowed": false},
│   │   │   #     {"name": "intranet", "remote": true}
│   │   │   #   ]
│   │   │   # }
│   │   └── allowed-origins.json            # CORS configuration
│   └── logs/
│       ├── auth-2025-12.log
│       └── error.log
│
├── data/                                    # 💾 Application data (outside Git)
│   ├── eeo-v2/
│   │   ├── attachments/                    # 📎 All attachments (flat structure)
│   │   │   ├── fa-001-20251220-invoice.pdf
│   │   │   ├── fa-002-20251220-contract.pdf
│   │   │   ├── obj-123-20251215-order.docx
│   │   │   ├── obj-123-20251215-attachment.pdf
│   │   │   ├── sm-456-20251210-contract.pdf
│   │   │   └── spis-789-20251205-document.pdf
│   │   │   #
│   │   │   # 📋 Naming convention (prefix-based):
│   │   │   #   fa-*    = Faktury (Invoices)
│   │   │   #   obj-*   = Objednávky (Orders)
│   │   │   #   sm-*    = Smlouvy (Contracts)
│   │   │   #   spis-*  = Spisovka (Registry)
│   │   │
│   │   └── templates/                      # 📄 DOCX templates
│   │       ├── invoice-template.docx
│   │       ├── order-template.docx
│   │       └── contract-template.docx
│   │
│   ├── szm/                                # 🔜 SZM data (planned)
│   │   ├── documents/
│   │   └── attachments/
│   │
│   ├── intranet/                           # 🔜 Intranet data (planned)
│   │   └── uploads/
│   │
│   └── dashboard/
│       └── exports/                        # Exported reports
│           ├── report-2025-12.xlsx
│           └── export-users.csv
│
├── config/                                  # ⚙️ Central configuration
│   ├── databases.json                      # Database connections
│   │   # {
│   │   #   "production": { "erdms": {...} },
│   │   #   "development": { "erdms": {...} }
│   │   # }
│   ├── apache/                             # Apache configs
│   │   ├── apps.conf
│   │   └── ssl.conf
│   ├── pm2/                                # PM2 ecosystem
│   │   ├── ecosystem.json
│   │   └── app-configs/
│   └── ssl/                                # SSL certificates
│       ├── fullchain.pem
│       ├── privkey.pem
│       └── cert.pem
│
└── backups/                                 # 🔒 Backups (restricted access)
    ├── db/                                 # Database backups
    │   ├── erdms-prod-2025-12-20.sql.gz
    │   └── erdms-prod-2025-12-19.sql.gz
    └── data/                               # File backups
        └── eeo-v2-attachments-2025-12-20.tar.gz

```

---

## 📊 Directory Ownership & Permissions

```bash
# Applications (readable by web server)
chown -R root:www-data /var/www/erdms-platform/apps/
chmod -R 755 /var/www/erdms-platform/apps/

# Authentication system (readable by web server)
chown -R root:www-data /var/www/erdms-platform/auth/
chmod -R 755 /var/www/erdms-platform/auth/
chmod 750 /var/www/erdms-platform/auth/config/
chmod 770 /var/www/erdms-platform/auth/logs/

# Data (writable by web server)
chown -R www-data:www-data /var/www/erdms-platform/data/
chmod -R 755 /var/www/erdms-platform/data/
chmod -R 770 /var/www/erdms-platform/data/*/attachments/
chmod -R 770 /var/www/erdms-platform/data/*/templates/

# Config (restricted access)
chown -R root:root /var/www/erdms-platform/config/
chmod 750 /var/www/erdms-platform/config/

# Backups (highly restricted)
chown -R root:root /var/www/erdms-platform/backups/
chmod -R 700 /var/www/erdms-platform/backups/
```

---

## 🔗 Apache Configuration

### Simple Direct Paths (No Symlinks!)
```apache
# In Apache VirtualHost - Production
<VirtualHost *:443>
    ServerName erdms.zachranka.cz
    
    # Dashboard (root)
    DocumentRoot /var/www/erdms-platform/apps/dashboard/build
    
    # EEO v2 Application
    Alias /eeo-v2 /var/www/erdms-platform/apps/eeo-v2/client/build
    
    # EEO v2 PHP API
    Alias /api.eeo /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo
    
    # EEO v2 Attachments
    Alias /eeo-v2/attachments /var/www/erdms-platform/data/eeo-v2/attachments
    
    # Central Auth API (Node.js proxy)
    ProxyPass /auth http://localhost:4000/auth
    ProxyPassReverse /auth http://localhost:4000/auth
    
    # EEO v2 Node API (proxy)
    ProxyPass /api/eeo http://localhost:4001/api/eeo
    ProxyPassReverse /api/eeo http://localhost:4001/api/eeo
</VirtualHost>
```

---

## 📝 Key Configuration Files

### Application Registry
```json
// /var/www/erdms-platform/auth/config/azure-apps.json
{
  "version": "1.0",
  "updated": "2025-12-20",
  "apps": [
    {
      "name": "eeo-v2",
      "display_name": "ERDMS - Ekonomika",
      "url": "https://erdms.zachranka.cz/eeo-v2",
      "callback": "https://erdms.zachranka.cz/auth/callback",
      "allowed": true,
      "remote": false
    },
    {
      "name": "dashboard",
      "display_name": "ERDMS - Dashboard",
      "url": "https://erdms.zachranka.cz",
      "callback": "https://erdms.zachranka.cz/auth/callback",
      "allowed": true,
      "remote": false
    },
    {
      "name": "szm",
      "display_name": "Spisová služba",
      "url": "https://erdms.zachranka.cz/szm",
      "callback": "https://erdms.zachranka.cz/auth/callback",
      "allowed": false,
      "remote": false,
      "status": "planned"
    },
    {
      "name": "intranet",
      "display_name": "Intranet ZZS",
      "url": "https://intranet.zachranka.cz",
      "callback": "https://intranet.zachranka.cz/auth/callback",
      "allowed": false,
      "remote": true,
      "status": "planned"
    }
  ],
  "allowed_origins": [
    "https://erdms.zachranka.cz",
    "https://erdms-dev.zachranka.cz",
    "https://intranet.zachranka.cz"
  ]
}
```

### Database Connections
```json
// /var/www/erdms-platform/config/databases.json
{
  "production": {
    "erdms": {
      "host": "10.3.172.11",
      "port": 3306,
      "database": "erdms_production",
      "username": "erdms_prod_user",
      "password": "*** SET IN .env ***",
      "charset": "utf8mb4",
      "collation": "utf8mb4_czech_ci"
    }
  }
}
```

### PM2 Ecosystem
```javascript
// /var/www/erdms-platform/config/pm2/ecosystem.json
{
  "apps": [
    {
      "name": "auth-api",
      "script": "/var/www/erdms-platform/auth/src/server.js",
      "cwd": "/var/www/erdms-platform/auth/",
      "instances": 1,
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production",
        "PORT": 4000
      },
      "error_file": "/var/www/erdms-platform/auth/logs/error.log",
      "out_file": "/var/www/erdms-platform/auth/logs/out.log"
    },
    {
      "name": "eeo-api",
      "script": "/var/www/erdms-platform/apps/eeo-v2/api/dist/server.js",
      "cwd": "/var/www/erdms-platform/apps/eeo-v2/api/",
      "instances": 2,
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production",
        "PORT": 4001
      },
      "error_file": "/var/www/erdms-platform/apps/eeo-v2/api/logs/error.log",
      "out_file": "/var/www/erdms-platform/apps/eeo-v2/api/logs/out.log"
    }
  ]
}
```

---

## 🔐 Environment Files

### Production .env for EEO v2 PHP API
```bash
# /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env
APP_ENV=production
APP_DEBUG=false

DB_HOST=10.3.172.11
DB_PORT=3306
DB_NAME=erdms_production
DB_USER=erdms_prod_user
DB_PASSWORD=***SECURE_PASSWORD***

STORAGE_UPLOADS_PATH=/var/www/erdms-platform/data/eeo-v2/attachments/
STORAGE_UPLOADS_URL=https://erdms.zachranka.cz/eeo-v2/attachments/
STORAGE_TEMPLATES_PATH=/var/www/erdms-platform/data/eeo-v2/templates/

API_BASE_URL=https://erdms.zachranka.cz/api
AUTH_TOKEN_LIFETIME=28800
MAIL_ENABLED=true
```

### Production .env for Central Auth
```bash
# /var/www/erdms-platform/auth/config/.env.production
NODE_ENV=production
PORT=4000

# Azure AD / Entra ID
AZURE_CLIENT_ID=***
AZURE_CLIENT_SECRET=***
AZURE_TENANT_ID=***
AZURE_REDIRECT_URI=https://erdms.zachranka.cz/auth/callback

# Database
DB_HOST=10.3.172.11
DB_NAME=erdms_production
DB_USER=erdms_prod_user
DB_PASSWORD=***SECURE_PASSWORD***

# Session
SESSION_SECRET=***RANDOM_SECRET***
SESSION_LIFETIME=28800

# Apps Config
APPS_CONFIG_PATH=/var/www/erdms-platform/auth/config/azure-apps.json
```

---

## 🚀 Deployment Workflow (Simplified)

### 1. Build in Development
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build
```

### 2. Deploy to Production (Simple rsync)
```bash
# Deploy frontend
rsync -av --delete \
  /var/www/erdms-dev/apps/eeo-v2/client/build/ \
  /var/www/erdms-platform/apps/eeo-v2/client/build/

# Deploy PHP API
rsync -av --delete \
  --exclude='.env' \
  /var/www/erdms-dev/apps/eeo-v2/api-legacy/ \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/

# Deploy Node.js API
rsync -av --delete \
  --exclude='node_modules' \
  --exclude='.env' \
  /var/www/erdms-dev/apps/eeo-v2/api/ \
  /var/www/erdms-platform/apps/eeo-v2/api/

cd /var/www/erdms-platform/apps/eeo-v2/api
npm ci --production
npm run build
```

### 3. Restart Services
```bash
pm2 restart eeo-api
sudo systemctl reload apache2
```

### 4. Verify
```bash
curl https://erdms.zachranka.cz/eeo-v2/
## 📦 Disk Usage Estimates

```
erdms-platform/
├── apps/           ~400 MB   (current versions only, no releases)
├── auth/           ~50 MB    (Node.js auth service)
├── data/           ~50 GB+   (attachments grow over time)
├── config/         ~5 MB     (configs, certs)
├── backups/        ~20 GB    (DB + file backups, rotating)
└── Total:          ~70 GB+
```

**Note:** Simplified structure saves ~1.6 GB by not keeping multiple releases.
echo "🚀 Deploying $APP to production..."

# Backup current version
tar -czf /var/www/erdms-platform/backups/data/$APP-$(date +%Y%m%d-%H%M).tar.gz \
  /var/www/erdms-platform/apps/$APP/

# Deploy
rsync -av --delete \
  /var/www/erdms-dev/apps/$APP/ \
  /var/www/erdms-platform/apps/$APP/

# Restart
pm2 restart $APP-api 2>/dev/null || true
systemctl reload apache2

echo "✅ Deployment complete!"
```

---

## 📦 Disk Usage Estimates

```
erdms-platform/
├── core/           ~500 MB   (Node.js apps, node_modules)
├── apps/           ~2 GB     (3-5 releases × ~400MB each)
├── data/           ~50 GB+   (attachments grow over time)
├── shared/         ~10 GB    (backups, certificates)
└── Total:          ~62 GB+
```

---

## 🔍 Monitoring & Health Checks

### Check Active Versions
```bash
cat /var/www/erdms-platform/.deployment/current-version.json | jq .
```

### Check Attachments Count
```bash
find /var/www/erdms-platform/data/eeo-v2/attachments -type f | wc -l
```

### Check Disk Space
```bash
df -h /var/www/erdms-platform/
```

### Check PM2 Status
```bash
pm2 list
pm2 logs eeo-api --lines 50
```

---

## 📋 Maintenance Tasks

### Daily
- ✅ Check PM2 processes: `pm2 status`
- ✅ Check logs for errors: `tail -f /var/www/erdms-platform/apps/*/shared/logs/*.log`
- ✅ Check disk space: `df -h`

### Weekly
- ✅ Database backup: `/var/www/erdms-platform/shared/scripts/backup.sh`
- ✅ Clean old logs: `find logs/ -name "*.log" -mtime +30 -delete`
- ✅ Review deployment history

### Monthly
- ✅ Clean old releases: Keep last 3 versions
- ✅ Archive old backups
- ✅ Review attachments count
- ✅ Update SSL certificates if needed
## 🆘 Rollback Procedure

Since we don't keep releases, rollback uses backups:

```bash
# List available backups
ls -lh /var/www/erdms-platform/backups/data/

# Restore from backup
cd /var/www/erdms-platform/apps/
tar -xzf ../backups/data/eeo-v2-20251220-1430.tar.gz

# Restart services
pm2 restart eeo-api
systemctl reload apache2
```

**Alternative:** Use Git to rollback code in erdms-dev, then redeploy.

---

## 🌐 Multi-Domain & Remote Apps Support

The centralized auth system supports:

```javascript
// auth/config/azure-apps.json
{
  "apps": [
    // Local apps (same server)
    {"name": "eeo-v2", "url": "https://erdms.zachranka.cz/eeo-v2"},
    {"name": "dashboard", "url": "https://erdms.zachranka.cz"},
    
    // Remote apps (different subdomain)
    {"name": "intranet", "url": "https://intranet.zachranka.cz", "remote": true},
    
    // Remote apps (different server, accessible from LAN)
    {"name": "external", "url": "https://app.someserver.com", "remote": true}
  ]
}
```

---

## 🔄 Migration from erdms-data

To migrate existing data:

```bash
# Move attachments
rsync -av --progress \
  /var/www/erdms-data/eeo-v2/prilohy/ \
  /var/www/erdms-platform/data/eeo-v2/attachments/

# Fix permissions
chown -R www-data:www-data /var/www/erdms-platform/data/eeo-v2/
chmod -R 770 /var/www/erdms-platform/data/eeo-v2/attachments/
```

---

## ✅ Benefits of Simplified Structure

1. **Easy Backup** - Single `tar` command backs up everything
2. **Easy Transfer** - Simple `rsync` to another server
3. **Easy Deployment** - Direct copy, no symlink management
4. **Less Disk Space** - No multiple releases stored
5. **Git for History** - Code versions in Git, not filesystem
6. **Multi-App Ready** - Easy to add SZM, Intranet, etc.
7. **Centralized Auth** - One SSO for all apps (even remote)

---

**Status:** 🟢 Implemented  
**Date:** 2025-12-20  
**Version:** 2.0 (Simplified)

**Status:** 🟢 Ready for implementation  
**Next Steps:** Create directory structure and deploy first release
