# 🔍 POROVNÁNÍ DEV vs PROD DATABÁZÍ
**Datum:** 1. dubna 2026  
**DEV DB:** `EEO-OSTRA-DEV` (10.3.172.11)  
**PROD DB:** `eeo2025` (10.3.172.11)  
**Období změn:** Poslední týden (25.3.–1.4.2026)

---

## ✅ VÝSLEDEK POROVNÁNÍ

### 📊 SOUHRN ZMĚN:

| Kategorie | DEV | PROD | Rozdíl |
|-----------|-----|------|--------|
| **Nová práva (25_prava)** | 3 | 0 | **+3 práv v DEV** |
| **Nové tabulky (25*)** | 0 | 0 | ✅ Shoda |
| **Struktura tabulek** | ✅ | ✅ | ✅ Shoda |

---

## 🆕 NOVÁ PRÁVA V DEV (chybí v PROD)

### ⚠️ K APLIKACI DO PRODUKCE:

| Kód práva | Popis | Migrace |
|-----------|-------|---------|
| `CASHBOOK_REPORTS_VIEW` | Statistika a reporty – Přehled pokladen – zobrazení | `2026-04-01_cashbook_reports_prava.sql` |
| `CASHBOOK_REPORTS_MANAGE` | Statistika a reporty – Přehled pokladen – správa | `2026-04-01_cashbook_reports_prava.sql` |
| `CASHBOOK_REPORTS_EXPORT` | Statistika a reporty – Přehled pokladen – export | `2026-04-01_cashbook_reports_prava.sql` |

**Důvod:**
- Tab "Přehled pokladen" v modulu **Stats & Reports** je **reportovací modul**
- **NELZE** použít `CASH_BOOK_READ_OWN` (to je pro běžnou práci s pokladnami, vidí jen své knihy)
- **Nová práva** umožňují vidět reportovací přehled **VŠECH pokladen** (podle vzoru ASSET_*, FIN_CONTROL_*)

**Přiřazení rolím:**
- ✅ `SUPERADMIN` – všechna 3 práva
- ✅ `ADMINISTRATOR` – všechna 3 práva

---

## ✅ MIGRACE UŽ V PRODUKCI

### Tyto migrace z března 2026 JIŽ BYLY aplikovány v PROD:

#### 1️⃣ `2026-03-29_stats_reports_asset_prava.sql`
**Status:** ✅ Aplikováno v PROD  
**Přidaná práva:**
- `FIN_CONTROL_VIEW`, `FIN_CONTROL_EDIT`, `FIN_CONTROL_MANAGE`
- `EDUCATION_VIEW`, `EDUCATION_EDIT`, `EDUCATION_MANAGE`
- `ATTACHMENTS_VIEW`, `ATTACHMENTS_MANAGE`
- `PIVOT_VIEW`, `PIVOT_EDIT`, `PIVOT_MANAGE`
- `REPORT_EDIT`, `STATISTICS_EDIT`
- `ASSET_VIEW`, `ASSET_MANAGE`, `ASSET_EXPORT`

**Vytvoření tabulek:**
- `25a_fk_sledovani` ✅ (v PROD)
- `25a_fk_sledovani_udalosti` ✅ (v PROD)

#### 2️⃣ `2026-03-29_sync_fk_sledovani_structure_prod.sql`
**Status:** ✅ Aplikováno v PROD  
**Účel:** Synchronizace struktury tabulek finanční kontroly s PROD

---

## 📋 CO JE POTŘEBA UDĚLAT V PRODUKCI

### 🔴 POVINNÝ KROK PŘED MIGRACÍ:

```bash
# ⚠️ FULL DUMP BACKUP PRODUKČNÍ DB
mysqldump -h 10.3.172.11 -u erdms_user -pCHANGE_ME_DB_PASSWORD \
  --single-transaction --routines --triggers --events \
  eeo2025 > /var/www/__BCK_PRODUKCE/$(date +%Y-%m-%d)_eeo2025_before_cashbook_reports_prava.sql

# Ověření zálohy:
ls -lh /var/www/__BCK_PRODUKCE/$(date +%Y-%m-%d)_eeo2025_before_cashbook_reports_prava.sql
```

### ✅ MIGRACE K APLIKACI:

```bash
# 1. SPUSTIT MIGRACI:
mysql -h 10.3.172.11 -u erdms_user -pCHANGE_ME_DB_PASSWORD eeo2025 \
  < /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/migrations/2026-04-01_cashbook_reports_prava.sql

# 2. OVĚŘENÍ:
mysql -h 10.3.172.11 -u erdms_user -pCHANGE_ME_DB_PASSWORD -e \
  "SELECT kod_prava, popis FROM 25_prava WHERE kod_prava LIKE 'CASHBOOK_REPORTS_%';" eeo2025

# Očekávaný výstup:
# +-------------------------+--------------------------------------------------------+
# | kod_prava               | popis                                                  |
# +-------------------------+--------------------------------------------------------+
# | CASHBOOK_REPORTS_EXPORT | Statistika a reporty – Přehled pokladen – export       |
# | CASHBOOK_REPORTS_MANAGE | Statistika a reporty – Přehled pokladen – správa       |
# | CASHBOOK_REPORTS_VIEW   | Statistika a reporty – Přehled pokladen – zobrazení    |
# +-------------------------+--------------------------------------------------------+
```

### 🚀 BUILD A DEPLOY FRONTENDU:

```bash
# ⚠️ POZOR: Build MUSÍ být s produkční DB!
cd /var/www/erdms-dev/apps/eeo-v2/client
# Upravit .env: DB_NAME=eeo2025
npm run build:prod

# Zkontrolovat výstup build-prod/
ls -lh build-prod/

# Deploy do produkce (S POTVRZENÍM!)
# rsync build-prod/ do /var/www/erdms-platform/apps/eeo-v2/client/build/
```

---

## 🔐 BEZPEČNOSTNÍ OVĚŘENÍ

### ✅ Rozdělení oprávnění:

| Právo | Modul | Vidí |
|-------|-------|------|
| `CASH_BOOK_READ_OWN` | **Pokladny** (CashBookPage) | **Jen své pokladny** |
| `CASH_BOOK_READ_ALL` | **Pokladny** (CashBookPage) | **Všechny pokladny** |
| `CASHBOOK_REPORTS_VIEW` | **Stats & Reports** | **Reportovací přehled VŠECH** 📊 |

### ⚠️ KRITICKÉ:
- Uživatel s `CASH_BOOK_READ_OWN` **NEBUDE** vidět tab "Přehled pokladen" v Stats & Reports ✅
- Tab "Přehled pokladen" bude vidět **POUZE** uživatelé s:
  - `CASHBOOK_REPORTS_VIEW` (nové právo) ✅
  - nebo role `SUPERADMIN` / `ADMINISTRATOR` ✅

---

## 📁 SOUBORY K APLIKACI

### Migrace SQL:
- `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/migrations/2026-04-01_cashbook_reports_prava.sql`

### Upravené soubory (již v GIT):
- `apps/eeo-v2/client/src/pages/StatsReportsPage.js` (oprávnění pro tab cashbook)
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/cashbookHandlersExtended.php` (backend kontrola)

---

## ✅ DOPORUČENÍ

**POSTUP NASAZENÍ DO PRODUKCE:**

1. ✅ **FULL BACKUP PROD DB** (`eeo2025`) – POVINNÉ!
2. ✅ Spustit migraci `2026-04-01_cashbook_reports_prava.sql` do PROD DB
3. ✅ Build frontend s PROD DB (DB_NAME=eeo2025)
4. ✅ Deploy frontend do `/var/www/erdms-platform/`
5. ✅ Testování v produkci (ověřit oprávnění pro různé role)

**RIZIKO:** NÍZKÉ ⚠️  
- Pouze přidání 3 nových práv
- Žádné změny ve struktuře tabulek
- Žádné změny v produkčních datech
- Migrace je idempotentní (lze spustit opakovaně)

---

**🟢 STAV:** Migrace aplikována v DEV, ověřeno, připraveno k produkci  
**🔴 AKCE VYŽADUJÍCÍ POTVRZENÍ:** Full backup + migrace SQL + build PROD + deploy

---

*Vygenerováno automaticky: 1. dubna 2026*
