# Archív dokumentace ERDMS (deprecated)

Tento adresář obsahuje archivované .md soubory, které byly přesunuty z root složky `/var/www/erdms-dev/` během reorganizace v lednu 2026.

## Struktura archívu

### 📊 analysis/
Obsahuje analýzy systému a technických problémů:
- `ANALYSIS_*.md` - Technické analýzy různých částí systému
- `CASHBOOK_*.md` - Analýzy pokladního systému
- `CASHBOX_*.md` - Analýzy cashbox funkcionalit
- `PERMISSIONS_*.md` - Analýzy oprávnění a bezpečnosti
- `BACKEND_*.md` - Analýzy backend systémů
- `CONTACTS_*.md` - Analýzy kontaktního systému
- `FRONTEND_*.md` - Analýzy frontend částí

### 📝 changelog/
Obsahuje záznamy změn v systému:
- `CHANGELOG_*.md` - Detailní záznamy všech změn a úprav

### 📋 reports/
Obsahuje reporty a výstupy z auditů:
- `REPORT_*.md` - Technické reporty a výstupy
- `HOTFIX_*.md` - Dokumentace hotfixů
- `SECURITY_*.md` - Bezpečnostní audity

### 📖 guides/
Obsahuje návody a deployment dokumentaci:
- `DEPLOYMENT_*.md` - Deployment návody a postupy
- `QUICKSTART.md` - Rychlý start průvodce

### 🗃️ misc/
Obsahuje ostatní dokumenty:
- `TODO_*.md` - Seznam úkolů
- `TEST_*.md` - Testovací dokumentace
- `MIGRATION_*.md` - Migrace dat a systémů
- `BUILD-old-*.md` - Staré build dokumenty
- Další specifické dokumenty

### 🔧 scripts/
Obsahuje PHP test a utility scripty:
- `*.php` - Test scripty, analýzy, migrace, debugování (51 souborů)
- `*.sql` - SQL migrace, deploymenty, backupy (41 souborů)
- `*.sh` - Shell scripty pro deployment a utility (7 souborů)
- Utility scripty pro databázi a uživatele
- Development a debug nástroje

### 💾 data-exports/
Obsahuje exportované data a CSV soubory:
- `*.txt` - Data exporty uživatelů, mapování, telefonní seznamy
- `*.csv` - CSV data soubory
- `*.json` - JSON konfigurace a export data

### 🗄️ backups/
Obsahuje záložní soubory:
- `*.tar.gz` - Komprimované zálohy
- `*backup*.json` - JSON zálohy konfigurace

### 📋 logs/
Obsahuje log soubory:
- `*.log` - Aplikační a debug logy

## Aktivní dokumentace

V root složce `/var/www/erdms-dev/` zůstávají pouze:
- `BUILD.md` - Aktuální build dokumentace a návody
- `README.md` - Hlavní projektová dokumentace

## Poznámka

Tyto dokumenty byly archivovány **2026-01-11** během reorganizace workspace struktury a přechodu na modulární build systém.