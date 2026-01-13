# ERDMS Build & Deploy Guide

## 📋 Overview

ERDMS používá automatizované build skripty pro konzistentní development a production buildy. **VŽDY POUŽÍVEJ TYTO SKRIPTY** místo manuálních NPM commandů!

**Aktuální DEV verze:** `2.12` *(aktivní verze)*

## ⚠️ KRITICKÉ UPOZORNĚNÍ - PRODUCTION URL ⚠️

**NIKDY** nepoužívej `eeo.zachranka.cz` pro production!  
**VŽDY** používej `erdms.zachranka.cz` pro production!

```bash
❌ ŠPATNĚ: REACT_APP_API_BASE_URL=https://eeo.zachranka.cz/api
✅ SPRÁVNĚ: REACT_APP_API_BASE_URL=https://erdms.zachranka.cz/api
```

## 🚀 Quick Start

```bash
# Dashboard build a deploy
./build-dashboard.sh --dev --deploy

# EEO v2 frontend + backend (verze 2.12.0)
./build-eeo-v2.sh --dev --all --deploy

# Všechny aplikace najednou
./build-all.sh --dev --deploy

# Production build (verze 2.12.0)
./build-dashboard.sh --prod --deploy
```

## 📚 Dokumentace

> **Poznámka:** Starší dokumentace a technické analýzy byly přesunuty do [`docs/deprecated/`](./docs/deprecated/) během reorganizace workspace struktury (2026-01-11). Aktivní zůstávají pouze tento BUILD.md a README.md.

## 🏗️ Build Scripts

### Lokace
```
/var/www/erdms-dev/docs/scripts-shell/  (originály)
/var/www/erdms-dev/                     (symlinky)
```

### Dostupné skripty

| Script | Popis | Aplikace | Příklad použití |
|--------|--------|-----------|------------------|
| `build-dashboard.sh` | Dashboard build + deploy | Dashboard + Auth API trigger | `./build-dashboard.sh --dev --deploy` |
| `build-auth-api.sh` | Auth API deploy | Auth API standalone | `./build-auth-api.sh --prod --deploy` |
| `build-dashboard-auth.sh` | Dashboard + Auth API combo | Dashboard + Auth API | `./build-dashboard-auth.sh --dev --deploy` |
| `build-eeo-v2.sh` | EEO v2 frontend/backend | EEO v2 | `./build-eeo-v2.sh --dev --all --deploy` |
| `build-intranet-v26.sh` | Intranet v26 build + deploy | Intranet v26 | `./build-intranet-v26.sh --prod --deploy` |
| `build-all.sh` | Master script pro všechny aplikace | All | `./build-all.sh --dev --deploy` |

## 🎛️ Parametry

### Prostředí
- `--prod` - Production prostředí
- `--dev` - Development prostředí (default)

### Deployment
- `--deploy` - Provést deployment po buildu
- `--no-deploy` - Pouze build bez deploymentu (default)

### EEO v2 specifické
- `--frontend` / `--fe` - Pouze frontend
- `--backend` / `--be` - Pouze backend  
- `--all` - Frontend + backend (default)

### Master script
- `--app=dashboard,eeo-v2,intranet-v26` - Výběr aplikací

## 📁 Directory Structure

### Development
```
/var/www/erdms-dev/
├── dashboard/                 # Dashboard React app
├── auth-api/                 # Auth API Node.js
├── apps/
│   ├── eeo-v2/
│   │   ├── client/           # EEO v2 React frontend
│   │   └── api/              # EEO v2 Node.js backend
│   └── intranet-v26/         # Intranet v26 app
└── docs/scripts-shell/       # Build scripts
```

### Production
```
/var/www/erdms-platform/
├── apps/
│   ├── dashboard/            # Dashboard production
│   ├── eeo-v2/
│   │   ├── client/          # EEO v2 frontend production
│   │   └── api/             # EEO v2 backend production
│   └── intranet-v26/        # Intranet v26 production
├── auth-api/                 # Auth API production
├── backups/                  # Automatic backups
├── config/                   # Configuration files
└── data/                     # Application data
```

## 🚀 Usage Examples

### Dashboard Development
```bash
cd /var/www/erdms-dev/docs/scripts-shell

# Build pro development (zůstává v dev)
./build-dashboard.sh --dev

# Build a deploy do produkce
./build-dashboard.sh --prod --deploy
```

### EEO v2 Deployment
```bash
# Build frontend pro dev (speciální: zůstává v dev složce)
./build-eeo-v2.sh --dev --frontend

# Build a deploy celý EEO v2 do produkce
./build-eeo-v2.sh --prod --all --deploy

# Pouze backend do produkce
./build-eeo-v2.sh --prod --backend --deploy
```

### Auth API
```bash
# Deploy auth API do produkce
./build-auth-api.sh --prod --deploy
```

### Master Build
```bash
# Build všechny aplikace pro produkci
./build-all.sh --prod --deploy

# Build pouze dashboard a EEO v2
./build-all.sh --prod --deploy --app=dashboard,eeo-v2

# Dev build všech aplikací
./build-all.sh --dev
```

## 🆕 Verze 2.10.0 - Připraveno k nasazení

**Stav:** ✅ READY FOR DEPLOYMENT  
**Datum:** 11. ledna 2026  
**Git tag:** v2.10-backup-20260111_2042

### Co je nového v 2.10.0:
- 📧 **HTML Email šablony** pro věcnou kontrolu faktur (MS Outlook 365)
- 🔄 **Standardizace notifikačních typů** (126 záznamů migrováno)
- 🎨 **UI improvements** (tooltips, custom dialogs, field validation fix)
- 🛡️ **Anti-spam notifikace** (pouze při změně workflow stavu)

### Frontend změny:
- **package.json:** 2.08 → 2.10.0
- **8 souborů upraveno:** OrganizationHierarchy, InvoiceEvidencePage, CustomSelect, atd.
- **2 nové notification triggery** pro invoice material check

### Databáze:
- ✅ **126 notifikací migrováno** (11.1.2026 18:47)
- ✅ **HTML šablony nahrány** (11.1.2026 20:35)
- ✅ **Event types standardizovány**

### Deployment postup:
```bash
# 1. Build EEO v2 s novou verzí
./build-eeo-v2.sh --prod --all --deploy

# 2. Po deployment - refresh org hierarchie profil PRIKAZCI
# (nutné pro načtení nových templates a event types)
```

**📖 Kompletní deployment guide:** [DEPLOYMENT_v2.10_*.md](./docs/deployment/)

## ⚡ Quick Commands

### Rychlý production deploy všeho
```bash
cd /var/www/erdms-dev/docs/scripts-shell
./build-all.sh --prod --deploy
```

### Pouze dashboard do produkce
```bash
./build-dashboard-auth.sh --prod --deploy
```

### EEO v2 dev build (frontend zůstane v dev)
```bash
./build-eeo-v2.sh --dev --all
```

## 🔧 Technical Details

### EEO v2 Special Behavior
- **DEV builds**: Frontend zůstává v `/var/www/erdms-dev/apps/eeo-v2/client/build/`
- **PROD builds**: Frontend se deployne do `/var/www/erdms-platform/apps/eeo-v2/client/`

### Services
Build skripty automaticky restartují potřebné systemd services:
- `erdms-auth-api.service` - Auth API
- `erdms-eeo-api.service` - EEO v2 API
- `apache2` - reload konfigurace

### Backups
Při production deployment se automaticky vytváří zálohy:
- Lokace: `/var/www/erdms-platform/backups/`
- Format: `{app}-backup-{timestamp}`

### Environment Variables
Production deployment automaticky upravuje `.env` soubory:
- `NODE_ENV=production`
- Správné porty (4000, 4001, atd.)
- HTTPS URLs místo localhost

## 🛠️ Troubleshooting

### Permission Issues
```bash
# Fix permissions
chown -R www-data:www-data /var/www/erdms-platform/apps/
chown -R root:www-data /var/www/erdms-platform/auth-api/
```

### Service Issues
```bash
# Check service status
systemctl status erdms-auth-api.service
systemctl status erdms-eeo-api.service

# Restart services manually
systemctl restart erdms-auth-api.service
systemctl reload apache2
```

### Build Issues
```bash
# Clear npm cache
cd /var/www/erdms-dev/dashboard
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## 📝 Development Workflow

1. **Vývoj**: Pracuj v `/var/www/erdms-dev/`
2. **Test**: `./build-{app}.sh --dev` 
3. **Deploy**: `./build-{app}.sh --prod --deploy`

### Git Integration
Build skripty pracují s aktuálním stavem souborů v dev složce. Pro production deployment doporučujeme:

```bash
# Commit změny
git add .
git commit -m "Feature: XYZ"

# Deploy do produkce
./build-all.sh --prod --deploy

# Tag release
git tag v$(date +%Y%m%d-%H%M%S)
git push --tags
```
