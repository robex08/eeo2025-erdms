# Deployment Guide - Intranet Web

## 🚀 Deployment Checklist

### 1. Příprava

- [ ] Nakonfigurovat EntraID credentials v `.env` souborech
- [ ] Otestovat aplikaci lokálně
- [ ] Vytvořit production build
- [ ] Zkontrolovat všechny API endpointy

### 2. Development Deployment

```bash
# 1. Build frontend
cd /var/www/erdms-dev/apps/intranet-web/client
npm install
npm run build

# 2. Vytvořit .env pro API
cd /var/www/erdms-dev/apps/intranet-web/api
cp .env.example .env
# Upravit .env s production hodnotami

# 3. Vytvořit symlinky (jako root)
sudo ln -sf /var/www/erdms-dev/apps/intranet-web/client/build /var/www/html/dev/intranet-web
sudo ln -sf /var/www/erdms-dev/apps/intranet-web/api /var/www/html/dev/intranet-web/api

# 4. Nastavit oprávnění
sudo chown -R www-data:www-data /var/www/erdms-dev/apps/intranet-web/client/build
sudo chown -R www-data:www-data /var/www/erdms-dev/apps/intranet-web/api
sudo chmod -R 755 /var/www/erdms-dev/apps/intranet-web

# 5. Restart Apache
sudo systemctl reload apache2
```

### 3. Production Deployment

```bash
# 1. Build s production env
cd /var/www/erdms-dev/apps/intranet-web/client
npm run build

# 2. Kopírovat do production
sudo rsync -av --delete \
  /var/www/erdms-dev/apps/intranet-web/ \
  /var/www/erdms-platform/apps/intranet-web/

# 3. Production symlinky
sudo ln -sf /var/www/erdms-platform/apps/intranet-web/client/build /var/www/html/intranet-web
sudo ln -sf /var/www/erdms-platform/apps/intranet-web/api /var/www/html/intranet-web/api

# 4. Nastavit oprávnění
sudo chown -R www-data:www-data /var/www/erdms-platform/apps/intranet-web
sudo chmod -R 755 /var/www/erdms-platform/apps/intranet-web

# 5. Restart Apache
sudo systemctl reload apache2
```

## 🔐 EntraID Configuration

### Azure Portal Setup

1. Přejdi na **Azure Portal** → **App registrations**
2. Vytvoř novou registraci nebo použij existující
3. Nastav **Redirect URIs**:
   - Development: `https://erdms.zachranka.cz/dev/intranet-web`
   - Production: `https://erdms.zachranka.cz/intranet-web`
4. Zkopíruj:
   - **Application (client) ID** → `VITE_ENTRA_CLIENT_ID`
   - **Directory (tenant) ID** → `VITE_ENTRA_TENANT_ID`
5. Nastav **API permissions**: `User.Read`

### Update .env files

**Development:** `/var/www/erdms-dev/apps/intranet-web/client/.env.development`
```env
VITE_ENTRA_CLIENT_ID=your-dev-client-id
VITE_ENTRA_TENANT_ID=your-tenant-id
VITE_ENTRA_REDIRECT_URI=https://erdms.zachranka.cz/dev/intranet-web
```

**Production:** `/var/www/erdms-dev/apps/intranet-web/client/.env.production`
```env
VITE_ENTRA_CLIENT_ID=your-prod-client-id
VITE_ENTRA_TENANT_ID=your-tenant-id
VITE_ENTRA_REDIRECT_URI=https://erdms.zachranka.cz/intranet-web
```

## 🧪 Testing

### 1. Lokální vývoj
```bash
cd client
npm run dev
# Otevři http://localhost:5174
```

### 2. Test build
```bash
npm run build
npm run preview
```

### 3. Test API
```bash
curl https://erdms.zachranka.cz/dev/intranet-web/api/health
```

## 📋 Post-Deployment Checklist

- [ ] Aplikace běží na správné URL
- [ ] EntraID přihlášení funguje
- [ ] API health endpoint odpovídá
- [ ] React Router funguje (refresh na vnořených URL)
- [ ] CORS headers jsou správně nastavené
- [ ] PHP error logy jsou čisté

## 🐛 Troubleshooting

### Aplikace vrací 404
```bash
# Zkontroluj symlink
ls -la /var/www/html/dev/intranet-web

# Zkontroluj Apache config
sudo apache2ctl -S | grep intranet-web
```

### API nefunguje
```bash
# Test PHP
php -l /var/www/erdms-dev/apps/intranet-web/api/index.php

# Zkontroluj error log
tail -f /var/log/apache2/error.log
```

### EntraID nefunguje
- Zkontroluj redirect URIs v Azure Portal
- Ověř client ID a tenant ID v .env
- Zkontroluj console v browseru pro MSAL errors

## 🔄 Update Workflow

```bash
# 1. Pull změny z GIT
cd /var/www/erdms-dev/apps/intranet-web
git pull

# 2. Update dependencies (pokud je třeba)
cd client
npm install

# 3. Rebuild
npm run build

# 4. Reload Apache
sudo systemctl reload apache2
```

## 📝 Notes

- Vždy testuj v dev prostředí před production deploymentem
- Vytvářej zálohy před major changes
- Používej GIT pro verzování
- Dokumentuj všechny změny v konfiguraci
