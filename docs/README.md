# 📚 ERDMS - Dokumentace a skripty

**Datum reorganizace:** 19. prosince 2025  
**Celkem souborů:** 119

---

## 📁 Struktura

```
_docs/
├── README.md                      ← Tento soubor
├── hierarchy/                     ← 🏢 Organizační hierarchie
├── notifications/                 ← 🔔 Notifikační systém
├── database-migrations/           ← 🗄️ SQL migrace
├── database-backups/              ← 💾 Database backupy
├── scripts-php/                   ← 🐘 PHP utility skripty
├── scripts-shell/                 ← 🐚 Shell skripty
└── archived/                      ← 📦 Archivované dokumenty
```

---

## 🏢 Hierarchie (`hierarchy/`) - 11 dokumentů

Dokumentace organizační hierarchie a oprávnění:

- `HIERARCHY_IMPLEMENTATION_README.md` - Hlavní implementační dokumentace
- `HIERARCHY_CENTRAL_SERVICE_IMPLEMENTATION.md` - Centrální služby
- `HIERARCHY_PERMISSIONS_COMPLETE_AUDIT.md` - Audit oprávnění
- `HIERARCHY_PERMISSIONS_IMPLEMENTATION.md` - Implementace oprávnění
- `HIERARCHY_BACKWARD_COMPATIBILITY.md` - Zpětná kompatibilita
- `HIERARCHY_REFACTOR_COMPLETE.md` - Dokončený refaktoring
- `HIERARCHY_REFACTOR_PLAN.md` - Plán refaktoringu
- `HIERARCHY_ROLE_IMPLEMENTATION_PLAN.md` - Implementace rolí
- `HIERARCHY_MOBILE_INDICATOR.md` - Mobile indikátory
- `ANALYSIS_PERMISSION_HIERARCHY_CLEANUP.md` - Analýza cleanup

**Quick links:**
```bash
cd hierarchy/
cat HIERARCHY_IMPLEMENTATION_README.md
```

---

## 🔔 Notifikace (`notifications/`) - 21 dokumentů

Kompletní dokumentace notifikačního systému:

### Hlavní dokumenty:
- `NOTIFICATION_SYSTEM_AUDIT.md` - Systémový audit
- `NOTIFICATION_SYSTEM_DEPRECATIONS.md` - Zastaralé funkce
- `NOTIFICATION_SYSTEM_TODO.md` - TODO seznam
- `FINAL_REPORT_NOTIFICATION_3_LEVELS.md` - Finální report 3-úrovňové hierarchie

### Implementace:
- `NOTIFICATION_FILTERING_IMPLEMENTATION.md` - Filtrování
- `NOTIFICATION_PREFERENCES_IMPLEMENTATION_SUMMARY.md` - Uživatelské preference
- `NOTIFICATION_PREFERENCES_COMPLETE.md` - Dokončené preference
- `NOTIFICATION_TEMPLATES_SYSTEM_INTEGRATION.md` - Integrace šablon

### Šablony:
- `NOTIFICATION_TEMPLATES_PLACEHOLDERS.md` - Placeholdery v šablonách
- `NOTIFICATION_TEMPLATES_EXPANSION_PLAN.md` - Plán rozšíření
- `NOTIFICATION_TEMPLATES_PHASE1_COMPLETE.md` - Fáze 1
- `NOTIFICATION_TEMPLATE_VARIANTS_UPGRADE.md` - Upgrade varianty

### Sloupce a mapování:
- `NOTIFICATION_COLUMN_NAME_FIXES_COMPLETE.md` - Opravy názvů
- `NOTIFICATION_COLUMN_NAMES_QUICK_REFERENCE.md` - Quick reference
- `NOTIFICATION_COLUMNS_CZECH_MAPPING.md` - České názvy

### Debug & Fix:
- `NOTIFICATION_CRUD_AUDIT_CRITICAL_ERRORS.md` - Kritické chyby
- `NOTIFICATION_DEBUGGING_ZVONICEK.md` - Debug zvonečku
- `NOTIFICATION_FIX_COMPLETE.md` - Dokončené opravy
- `NOTIFICATION_PLACEHOLDERS_DEBUG_STATUS.md` - Debug placeholderů

### Migrace:
- `MIGRATION_PLAN_OLD_TO_NEW_NOTIFICATIONS.md` - Migrace starý → nový systém

**Quick links:**
```bash
cd notifications/
cat NOTIFICATION_SYSTEM_AUDIT.md
```

---

## 🗄️ Database Migrace (`database-migrations/`) - 31 SQL souborů

### Kategorie SQL migrací:

**ALTER - Úpravy tabulek:**
- `ALTER_ADD_GENERIC_RECIPIENT_SYSTEM.sql`
- `ALTER_ADD_NOTIFICATION_SETTINGS.sql`
- `ALTER_ADD_ROLE_RELATION_TYPES.sql`
- `ALTER_ADD_SPISOVKA_PRILOHA_ID.sql`
- `ALTER_HIERARCHY_VZTAHY_ADD_FIELDS.sql`
- `ALTER_NOTIFICATION_COLUMNS_CZECH.sql`
- `ALTER_NOTIFICATION_PRIORITA_ENUM.sql`

**CREATE - Nové tabulky:**
- `CREATE_DEBUG_API_LOG.sql`
- `CREATE_NOTIFICATION_SYSTEM_TABLES.sql`
- `CREATE_NOTIFICATION_HIERARCHY_PROFILES_TABLE.sql`
- `CREATE_SPISOVKA_ZPRACOVANI_LOG.sql`

**UPDATE - Aktualizace dat:**
- `UPDATE_NOTIFICATION_TEMPLATES_PHASE1.sql`
- `UPDATE_NOTIFICATION_TEMPLATES_PHASE2.sql`
- `UPDATE_NOTIFICATION_TEMPLATES_PHASE3_4.sql`
- `UPDATE_NOTIFICATION_TEMPLATES_PHASE5.sql`

**INSTALL - Instalační skripty:**
- `INSTALL_GLOBAL_SETTINGS.sql`

**MIGRATE - Migrace dat:**
- `MIGRATE_OLD_HIERARCHY_DATA.sql`

**RENAME - Přejmenování:**
- `RENAME_NOTIFICATION_TABLES.sql`
- `RENAME_ORDER_CREATED_TO_SENT_FOR_APPROVAL.sql`

**FIX - Opravy:**
- `FIX_HIERARCHY_PROFILES_TABLE.sql`
- `HIERARCHY_REFACTOR.sql`

**ANALYSIS - Analytické dotazy:**
- `ANALYSIS_EMPTY_EMAILS_DEBUG.sql`

**Quick links:**
```bash
cd database-migrations/
ls -1 ALTER_*.sql
ls -1 CREATE_*.sql
```

---

## 💾 Database Backupy (`database-backups/`) - 4 soubory

Bezpečnostní backupy před velkými změnami:

- `BACKUP_25_hierarchie_vztahy_20251216_200624.sql` - Backup hierarchie
- `BACKUP_GENERIC_RECIPIENT_20251217_072223.sql` - Backup generic recipient
- `BACKUP_NOTIFICATION_TABLES_20251216_185802.sql` - Backup notifikací
- `BACKUP_order_status_schvalena_template_20251219_003822.sql` - Backup šablony
- `BACKUP_PHP_API_20251216_185755.tar.gz` - Backup PHP API
- `BACKUP_VECNA_SPRAVNOST_SECTION.js` - Backup JS sekce

**⚠️ Důležité:**
- Tyto backupy jsou pro recovery před velkými změnami
- Nemazat bez konzultace
- Pravidelně archivovat starší než 6 měsíců

---

## 🐘 PHP Skripty (`scripts-php/`) - 25 souborů

Utility a testovací skripty:

### Generátory SQL:
- `generate-notification-sql-phase1.php`
- `generate-notification-sql-phase2.php`
- `generate-notification-sql-phase3-4.php`

### Migrace:
- `migrate-generic-recipient-system.php`

### Testovací skripty:
- `test-hierarchy-api.php`
- `test-notification-trigger.php`
- `test-order-approved.php`
- `test-order-sent-for-approval.php`
- `test-user-approve-permissions.php`
- `TEST_NOTIFICATION_TRIGGER.php`

### Debug skripty:
- `debug-hierarchy-profile-events.php`
- `debug-notification-500.php`
- `check-user-100-permissions.php`
- `check-user-100-hierarchy.php`
- `check-global-settings-table.php`
- `check-invoice-order.php`
- `check-locks-debug.php`
- `check-locks.php`
- `check-source-info.php`

### Fix skripty:
- `fix-all-recipient-types.php`
- `fix-hierarchy-profile-scope-filter.php`
- `fix-hierarchy-recipient-type.php`
- `fix-email-template.js` (ve _docs/archived/)

### Preview:
- `preview-notification-templates-phase1.php`

### Utility:
- `show-table-structure.php`

**Jak spustit:**
```bash
cd /var/www/erdms-dev/_docs/scripts-php/
php test-hierarchy-api.php
```

---

## 🐚 Shell Skripty (`scripts-shell/`) - 10 souborů

Build a deployment skripty:

### Build skripty:
- `build-multiapp.sh` - Build všech aplikací
- `build-quick.sh` - Rychlý build

### Development:
- `dev-start.sh` - Start dev prostředí
- `dev-stop.sh` - Stop dev prostředí

### Migrace:
- `apply-layout-migration.sh` - Aplikace layout migrací

### Další utility:
(další shell skripty podle potřeby)

**Jak spustit:**
```bash
cd /var/www/erdms-dev/_docs/scripts-shell/
chmod +x build-quick.sh
./build-quick.sh
```

---

## 📦 Archiv (`archived/`) - ~17 souborů

Staré dokumenty a ukončené implementace:

- `DB_API_AUDIT_REPORT_PRODUCTION_READY.md` - Produkční audit
- `ESLINT_BUILD_ISSUE_FIX.md` - ESLint opravy
- `CLEAR_BROWSER_CACHE.md` - Cache cleanup
- `FIX_ORDER_MANAGE_HIERARCHY.md` - Opravy hierarchie
- `CHANGELOG_INVOICES_SEARCH_FIX.md` - Changelog faktury
- `INVOICE_MODULE_LOCK_IMPLEMENTATION.md` - Lock implementace
- `LOCK_DIAGNOSTIC_GUIDE.md` - Diagnostic zámků
- `MIGRACE_ORDERFORM25_DOKONCENA.md` - Dokončená migrace
- `MIGRATION_PLAN_LEGACY_TO_V2.md` - Legacy → V2
- `REPORT_EMPTY_EMAILS_ANALYSIS.md` - Analýza emailů
- `ROLE_IMPLEMENTATION_COMPLETE.md` - Dokončené role
- `SPISOVKA_TRACKING_IMPLEMENTATION_DONE.md` - Spisovka tracking
- `TEST_SPISOVKA_TRACKING.md` - Testy spisovky
- `VECNA_SPRAVNOST_REFACTOR_PLAN.md` - Věcná správnost
- A další ukončené projekty...

---

## 🎯 Quick Start - Jak najít dokumentaci

### 1️⃣ Hledáš hierarchii?
```bash
cd /var/www/erdms-dev/_docs/hierarchy/
ls -1 *.md
```

### 2️⃣ Hledáš notifikace?
```bash
cd /var/www/erdms-dev/_docs/notifications/
ls -1 *.md
```

### 3️⃣ Potřebuješ SQL migraci?
```bash
cd /var/www/erdms-dev/_docs/database-migrations/
ls -1 *.sql | grep -i "notification"
```

### 4️⃣ Chceš spustit test?
```bash
cd /var/www/erdms-dev/_docs/scripts-php/
php test-hierarchy-api.php
```

### 5️⃣ Potřebuješ build?
```bash
cd /var/www/erdms-dev/_docs/scripts-shell/
./build-quick.sh
```

---

## 📊 Statistika

| Kategorie | Počet souborů | Popis |
|-----------|--------------|-------|
| **Hierarchy** | 11 | Organizační struktura |
| **Notifications** | 21 | Notifikační systém |
| **DB Migrations** | 31 | SQL migrace |
| **DB Backups** | 6 | Bezpečnostní zálohy |
| **PHP Scripts** | 25 | Utility a testy |
| **Shell Scripts** | 10 | Build & deployment |
| **Archived** | ~17 | Staré dokumenty |
| **CELKEM** | **121** | **Přesunutých souborů** |

---

## 🔍 Grep Cheatsheet

```bash
# Najdi všechny odkazy na notifikace
grep -r "notification" _docs/ --include="*.md"

# Najdi SQL migrace s HIERARCHY
grep -l "HIERARCHY" _docs/database-migrations/*.sql

# Najdi PHP testy
find _docs/scripts-php/ -name "test-*.php"

# Najdi backupy od prosince
ls -la _docs/database-backups/*202512*.sql
```

---

## ⚠️ Poznámky

### ❗ Co NENÍ v _docs/:
- `README.md` - hlavní README projektu (v rootu)
- `QUICKSTART.md` - quick start guide (v rootu)
- `.copilot-context.md` - Copilot kontext (v rootu)
- `apps/` - aplikační kód
- `auth-api/` - autentizační API
- `dashboard/` - dashboard aplikace
- `docs/` - původní docs složka
- `templates/` - šablony

### 📝 Konvence:
- **VELKÁ_PÍSMENA.md** = důležité dokumenty
- **lowercase.md** = běžné dokumenty
- **PREFIX_*.sql** = kategorizované SQL
- **test-*.php** = testovací skripty
- **debug-*.php** = debug skripty
- **fix-*.php** = fix skripty

---

**🎉 Dokumentace je nyní přehledně organizovaná!**

Pro aktualizace nebo dotazy kontaktujte administrátora.
