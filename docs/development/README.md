# ERDMS Development Documentation

**Last Updated:** 5. prosince 2025

---

## 📚 Dokumentace

### 🎯 **START HERE: Executive Summary**
**Soubor:** [`MIGRATION-EXECUTIVE-SUMMARY.md`](./MIGRATION-EXECUTIVE-SUMMARY.md)

**Co obsahuje:**
- Přehled celého projektu migrace PHP → Node.js
- Současný status (10% complete)
- Blokující problémy
- Next steps
- Timeline (3 měsíce)

**Pro koho:** Management, Project Lead, Anyone new to project

---

## 📖 Hlavní dokumenty

### 1. 🔄 **PHP → Node.js Migration Plan**
**Soubor:** [`PHP-TO-NODEJS-MIGRATION-PLAN.md`](./PHP-TO-NODEJS-MIGRATION-PLAN.md)  
**Stav:** ✅ Complete (69,872 words)

**Obsah:**
- Kompletní inventář ~180 API endpointů
- Kategorie: Authentication, Orders, Invoices, Suppliers, Codebooks, ...
- Request/Response příklady pro každý endpoint
- Prioritizace P0-P3
- Migrační fáze (Week by week)
- Technická architektura (Express, MySQL, Middleware)
- Testing strategy (Jest, PHP compatibility tests)
- Deployment & Rollback plán

**Pro koho:** Developers, Architects

**Klíčové sekce:**
- [Inventář všech endpointů](#inventář-všech-endpointů) - Tabulky všech 180 endpointů
- [Migrační strategie](#migrační-strategie) - Týdenní breakdown
- [Technická architektura](#technická-architektura) - Code examples
- [Response Compatibility Layer](#response-compatibility-layer) - 100% kompatibilita

---

### 2. 🔐 **Entra ID ↔ PHP Token Bridge**
**Soubor:** [`ENTRA-PHP-TOKEN-BRIDGE.md`](./ENTRA-PHP-TOKEN-BRIDGE.md)  
**Stav:** ✅ Complete, Ready for implementation

**Obsah:**
- Analýza legacy PHP token systému
- Token formát: `base64(username|timestamp)`
- Bridge architektura (Entra session → PHP token)
- **ŽÁDNÉ změny v 69 PHP souborech!**
- Implementační kód:
  - PHP `handle_entra_login()` funkce
  - Node.js `/entra-bridge` endpoint
  - React Auth Service
- Just-In-Time provisioning
- Security considerations
- Testing scénáře

**Pro koho:** Backend Developers, Security Team

**Flow:**
```
User → Entra Login → Node.js Bridge → PHP Token Generator → Frontend Storage
```

**Výhody:**
- ✅ Zachování legacy token formátu
- ✅ Žádné breaking changes
- ✅ Dual authentication (Entra + local)
- ✅ Backward compatible

---

### 3. 💾 **Database Synchronization Strategy**
**Soubor:** [`ENTRA-DB-SYNC-STRATEGY.md`](./ENTRA-DB-SYNC-STRATEGY.md)  
**Stav:** ✅ Complete, SQL migrations ready

**Obsah:**
- Hybrid architecture: Entra ID (identity) + Local DB (application data)
- Just-In-Time provisioning flow
- Dual authentication modes
- Migration SQL scripts:
  - `ALTER TABLE` pro přidání `entra_id`, `upn`, `auth_source`
  - User mapping queries
- Data flow diagramy
- Rollout strategie
- Edge cases handling

**Pro koho:** Database Admins, Backend Developers

**Architektura:**
```
Entra ID (Single Source of Truth)
    ↓
erdms.erdms_users (Basic identity)
    ↓
eeo_db.25_uzivatele (Application data + 25 custom fields)
```

**Migrace:**
1. Přidání nových sloupců (entra_id, upn, auth_source)
2. JIT provisioning při prvním přihlášení
3. Postupné mapování existujících uživatelů
4. Dual-mode authentication support

---

### 4. 🗄️ **Database Backup Checklist**
**Soubor:** [`DATABASE-BACKUP-CHECKLIST.md`](./DATABASE-BACKUP-CHECKLIST.md)  
**Stav:** ⚠️ Pending - Čeká na DB credentials

**Obsah:**
- Backup příkazy (mysqldump)
- Test restore postup
- Očekávané velikosti backupů
- Git záloha status (✅ Complete)

**Blokující problém:**
```
ERROR 1045: Access denied for user 'erdms_user'@'10.3.174.11'
```

**Akce potřebná:**
- Získat správné DB credentials
- Vytvořit backup před Phase 1 migrace

**Pro koho:** DevOps, Database Admins

---

## 🗂️ Struktura dokumentace

```
docs/development/
├── README.md (tento soubor)
├── MIGRATION-EXECUTIVE-SUMMARY.md     ← START HERE
├── PHP-TO-NODEJS-MIGRATION-PLAN.md    ← Hlavní migrační plán
├── ENTRA-PHP-TOKEN-BRIDGE.md          ← Token bridge design
├── ENTRA-DB-SYNC-STRATEGY.md          ← Database sync
├── DATABASE-BACKUP-CHECKLIST.md       ← Backup guide
├── CODE-INVENTORY.md                  ← Code overview
├── CHECKLIST.md                       ← Development checklist
├── IMPLEMENTATION-CHECKLIST.md        ← Implementation steps
├── START.md                           ← Getting started
└── TESTING-CHECKLIST.md               ← Testing guide
```

---

## 🚦 Current Status

### ✅ Dokončeno

1. **Analýza PHP API** - 100%
   - ~180 endpointů zinventarizováno
   - Request/Response formáty zdokumentovány
   - Priority P0-P3 přiřazeny

2. **Token Bridge Design** - 100%
   - Architektura navržena
   - Implementační kód připraven
   - Security review complete

3. **Database Sync Strategy** - 100%
   - Hybrid architecture defined
   - SQL migrations ready
   - JIT provisioning designed

4. **Git Záloha** - 100%
   - Commit: `08971ad`
   - Branch: `backup/php-api-2025-12-05`
   - Tag: `v1.0.0-php-final`
   - GitHub: ✅ Pushed

### ⚠️ Čeká na řešení

1. **Database Backup** - Blocked
   - Potřebné správné DB credentials
   - Priority: MEDIUM
   - Deadline: Před Phase 1

2. **React EEO App zdrojáky** - Pending
   - Potřebné pro implementaci token bridge
   - Priority: HIGH
   - Deadline: ASAP

### 📅 Plánováno

- **Week 1:** Phase 0 completion + Infrastructure setup
- **Week 2-6:** Priority 0 endpoints migration
- **Week 7-10:** Priority 1 endpoints migration
- **Week 11-13:** Priority 2-3 endpoints migration

---

## 🎯 Priority Endpoints (Phase 2)

### P0 - Kritické

**Authentication:**
- `POST /login` - PHP compatible login
- `POST /entra-login` - Entra bridge
- `POST /user/detail` - User detail
- `POST /users/list` - User listing

**Orders Core:**
- `POST /orders25/list` - Order listing
- `POST /orders25/by-id` - Order detail
- `POST /orders25/insert` - Create order
- `POST /orders25/update` - Update order
- `POST /orders25/select-for-edit` - Edit mode

**Orders V2:**
- `POST /order-v2/list` - V2 listing
- `POST /order-v2/list-enriched` - Enriched data
- `POST /order-v2/create` - V2 create

**Supporting:**
- `POST /useky/list` - Departments
- `POST /useky/detail` - Department detail
- `POST /stavy/list` - States
- `POST /dodavatele/list` - Suppliers
- `POST /dodavatele/detail` - Supplier detail

**Timeline:** Week 4-6 (3 týdny)

---

## 🔧 Technical Stack

### Current (PHP)
```
PHP 8.x
├── Apache 2.4.65
├── PHP-FPM
├── mysql extension
└── Custom token auth
```

### Target (Node.js)
```
Node.js v20.19.6
├── Express.js 4.x
├── mysql2/promise
├── JWT + Entra sessions
├── Jest testing
└── Winston logging
```

### Infrastructure
```
Production: erdms.zachranka.cz (10.3.174.11)
Database: 10.3.172.11:3306
├── erdms (identity DB)
└── eeo_db (application DB)

Services:
├── erdms-auth-api (Port 4000)
├── erdms-eeo-api (Port 4001)
└── erdms-eeo-nodejs-api (Port 4002) ← NEW
```

---

## 🧪 Testing Strategy

### Test Pyramid

```
       ┌─────────────┐
       │  E2E Tests  │  10% - Selenium/Playwright
       └─────────────┘
     ┌─────────────────┐
     │ Integration     │  30% - PHP Compatibility
     └─────────────────┘
   ┌───────────────────────┐
   │  Unit Tests           │  60% - Controllers, Models
   └───────────────────────┘
```

### Testing Goals

- **Unit tests:** > 80% coverage
- **Integration tests:** 100% migrovaných endpointů
- **PHP compatibility:** Automatické porovnání responses
- **Load testing:** 1000 req/s throughput
- **Response time:** < 200ms (stejně jako PHP)

### Tools

- **Jest** - Unit & Integration testing
- **Supertest** - HTTP testing
- **Artillery** - Load testing
- **ESLint** - Code quality

---

## 📊 Metrics & Monitoring

### KPIs

1. **Migration Progress**
   - Endpointy migrované: 0/180 (0%)
   - Tests passing: TBD
   - Coverage: TBD

2. **Performance**
   - Response time: Target < 200ms
   - Throughput: Target > 1000 req/s
   - Error rate: Target < 0.1%

3. **Quality**
   - Code coverage: Target > 80%
   - ESLint violations: Target 0
   - Security issues: Target 0

### Monitoring Setup

- **Health checks:** `/health` endpoint
- **Logging:** Winston → File/Syslog
- **Metrics:** Response times, error rates
- **Alerting:** TBD (Email? Slack?)

---

## 🔄 Git Workflow

### Branches

```
main ← Production-ready code
├── backup/php-api-2025-12-05 ← PHP backup
├── feature/nodejs-migration ← Active development
└── hotfix/* ← Emergency fixes
```

### Tags

```
v1.0.0-php-final ← Last PHP version (08971ad)
migration-phase-* ← Phase completion markers
```

### Commit Convention

```
feat: Add new feature
fix: Bug fix
docs: Documentation
test: Tests
refactor: Code refactoring
chore: Maintenance
```

---

## 🚀 Getting Started (Pro developery)

### 1. Clone repo

```bash
git clone https://github.com/robex08/eeo2025-erdms.git
cd eeo2025-erdms
```

### 2. Přečíst dokumentaci

1. Start s: `MIGRATION-EXECUTIVE-SUMMARY.md`
2. Deep dive: `PHP-TO-NODEJS-MIGRATION-PLAN.md`
3. Token bridge: `ENTRA-PHP-TOKEN-BRIDGE.md`
4. Database: `ENTRA-DB-SYNC-STRATEGY.md`

### 3. Setup environment

```bash
# Install Node.js v20
nvm install 20
nvm use 20

# Install dependencies (až bude Node.js projekt)
cd apps/eeo-v2/api-nodejs
npm install

# Setup .env
cp .env.example .env.production
# Edit .env.production s production credentials
```

### 4. Database access

```bash
# Získat DB credentials od admina
# Test connection:
mysql -h 10.3.172.11 -u [USER] -p

# Explore schema
SHOW DATABASES;
USE eeo_db;
SHOW TABLES;
DESCRIBE 25_uzivatele;
```

### 5. Run tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# PHP compatibility tests
npm run test:compatibility

# All tests
npm run test:all
```

---

## 📞 Support & Contacts

### Documentation Issues

- **GitHub Issues:** https://github.com/robex08/eeo2025-erdms/issues
- **Tag:** `documentation`

### Technical Questions

- **Team Lead:** TBD
- **Backend Lead:** TBD
- **Database Admin:** TBD

### Resources

- **GitHub Repo:** https://github.com/robex08/eeo2025-erdms
- **Production:** https://erdms.zachranka.cz
- **Dev Docs:** `/var/www/erdms-dev/docs/development/`

---

## 🎓 Learning Resources

### Node.js & Express

- Express.js Official: https://expressjs.com/
- Node.js Best Practices: https://github.com/goldbergyoni/nodebestpractices

### Testing

- Jest Documentation: https://jestjs.io/
- Supertest: https://github.com/visionmedia/supertest

### Database

- mysql2 Documentation: https://github.com/sidorares/node-mysql2
- MariaDB Best Practices: https://mariadb.com/kb/en/optimization-and-tuning/

---

## 📝 Changelog

### 2025-12-05 - Initial Documentation

- ✅ Created complete migration plan
- ✅ Documented ~180 API endpoints
- ✅ Designed token bridge strategy
- ✅ Defined database sync approach
- ✅ Git backup complete (v1.0.0-php-final)
- ⚠️ Database backup pending (credentials needed)

---

## ✅ Quick Checklist

**Před zahájením Phase 1:**

- [x] Dokumentace připravena
- [x] Git záloha vytvořena (v1.0.0-php-final)
- [ ] Database backup vytvořen
- [ ] React EEO app nahráno
- [ ] Node.js projekt setup
- [ ] Testing framework připraven
- [ ] DB credentials získány
- [ ] Resources alokovány

**Ready to start:** ⚠️ **80% - čeká na DB backup a React app**

---

**Last Updated:** 5. prosince 2025  
**Maintained by:** Development Team  
**Version:** 1.0

**Next Review:** Start of Phase 1
