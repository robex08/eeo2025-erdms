# 📋 PUBLIKACE DO PRODUKCE - 13. dubna 2026

## 🎯 PŘEHLED ZMĚN

Dnes jsme implementovali **3 hlavní funkcionality**:

### 1. 🔧 Oprava sledování aktivity uživatelů
- **Problém:** V seznamu aktivních uživatelů se zobrazovalo "Aplikace" místo konkrétních modulů
- **Řešení:** Doplněno mapování 9 nových routes (Roční poplatky, Čerpání LP, Majetek, atd.)

### 2. 📊 Dashboard - RSS kanály a widgety
- **RSS skrývání kanálů:** Nyní se ukládá do localStorage (přetrvává po reloadu)
- **Min. výška widgetů:** 280px (na mobilu 240px) - zajistí viditelnost prázdných widgetů
- **RSS řazení:** Finanční správa (bez data) se promíchá mezi ostatní pomocí hashe

### 3. ✅ Oprava názvosloví práv DEFERRALS
- **Problém:** Nová práva měla české kódy `DOHADNE_*`
- **Řešení:** Opraveno na anglické `DEFERRALS_*` s českým popisem

---

## 📁 SOUBORY K PUBLIKACI

### 🔹 FRONTEND (Client)

```bash
apps/eeo-v2/client/src/hooks/useActivityTracking.js
apps/eeo-v2/client/src/pages/DashboardPage.js
apps/eeo-v2/client/src/components/Layout.js
apps/eeo-v2/client/src/pages/StatsReportsPage.js
```

**Změny:**
- ✅ `useActivityTracking.js` - doplněno 9 nových route mapování
- ✅ `DashboardPage.js` - RSS localStorage persistence + min-height widgetů + RSS sorting fix
- ✅ `Layout.js` - oprava `DOHADNE_*` → `DEFERRALS_*`
- ✅ `StatsReportsPage.js` - oprava `DOHADNE_*` → `DEFERRALS_*`

---

### 🔹 DATABÁZE (SQL Migrace)

**⚠️ DŮLEŽITÉ:** Tyto migrace byly **spuštěny na DEV** dne 13.4.2026

```bash
migrations/2026_04_13_stats_reports_dohadne_permissions.sql
migrations/2026_04_13_cashbook_reports_permissions_fix.sql
migrations/2026_04_13_stats_reports_module_activation.sql
```

#### Migrace 1: **Práva DEFERRALS** (Dohadné položky)
**Soubor:** `2026_04_13_stats_reports_dohadne_permissions.sql`

**Změny:**
```sql
-- Vytvoří 3 práva:
- DEFERRALS_VIEW (Zobrazení dohadných položek)
- DEFERRALS_EDIT (Editace dohadných položek)
- DEFERRALS_MANAGE (Správa dohadných položek)

-- Přiřazení automaticky:
- SUPERADMIN, ADMINISTRATOR → všechna 3 práva
- HLAVNI_UCETNI, UCETNI, SPRAVCE_ROZPOCTU, ROZPOCTAR → VIEW
- HLAVNI_UCETNI, SPRAVCE_ROZPOCTU → EDIT
```

**⚠️ POZOR:** Migrace byla **opravena** - kódy nyní obsahují `DEFERRALS_*` (ne `DOHADNE_*`)

**Akce pro PROD:**
```bash
# Nejdřív smazat staré DOHADNE_* práva (pokud existují z DEV):
DELETE FROM `25_role_prava` WHERE pravo_id IN (SELECT id FROM `25_prava` WHERE kod_prava LIKE 'DOHADNE_%');
DELETE FROM `25_prava` WHERE kod_prava LIKE 'DOHADNE_%';

# Pak spustit migraci s DEFERRALS_*:
mysql -u erdms_prod_user -p -h PROD_HOST -D eeo2025 < migrations/2026_04_13_stats_reports_dohadne_permissions.sql
```

---

#### Migrace 2: **Oprava CASHBOOK_REPORTS práv**
**Soubor:** `2026_04_13_cashbook_reports_permissions_fix.sql`

**Problém:** V DB byly chybné kódy `CASHBOOK_OVERVIEW_*` místo správných `CASHBOOK_REPORTS_*`

**Změny:**
```sql
-- Smaže staré chybné práva:
- CASHBOOK_OVERVIEW_VIEW
- CASHBOOK_OVERVIEW_MANAGE
- CASHBOOK_OVERVIEW_EXPORT

-- Vytvoří správné:
- CASHBOOK_REPORTS_VIEW (Zobrazení reportů pokladny)
- CASHBOOK_REPORTS_MANAGE (Správa reportů pokladny)
- CASHBOOK_REPORTS_EXPORT (Export reportů pokladny)

-- Přiřazení:
- SUPERADMIN, ADMINISTRATOR, HLAVNI_UCETNI → všechna 3 práva
```

**Akce pro PROD:**
```bash
mysql -u erdms_prod_user -p -h PROD_HOST -D eeo2025 < migrations/2026_04_13_cashbook_reports_permissions_fix.sql
```

---

#### Migrace 3: **Aktivace modulu Stats & Reporty**
**Soubor:** `2026_04_13_stats_reports_module_activation.sql`

**Změny:**
```sql
-- Zapne modul v globálním nastavení:
UPDATE `25a_nastaveni_globalni` 
SET module_stats_reports_visible = '1';
```

**Akce pro PROD:**
```bash
mysql -u erdms_prod_user -p -h PROD_HOST -D eeo2025 < migrations/2026_04_13_stats_reports_module_activation.sql
```

---

## 🚀 POSTUP PUBLIKACE

### Krok 1️⃣: Databáze (PRODUKCE)

```bash
# Připojit k PROD DB
mysql -u erdms_prod_user -p -h PROD_HOST -D eeo2025

# 1. Smazat staré DOHADNE_* práva (pokud existují):
DELETE FROM `25_role_prava` WHERE pravo_id IN (SELECT id FROM `25_prava` WHERE kod_prava LIKE 'DOHADNE_%');
DELETE FROM `25_prava` WHERE kod_prava LIKE 'DOHADNE_%';

# 2. Spustit migrace postupně:
SOURCE /cesta/k/migrations/2026_04_13_stats_reports_dohadne_permissions.sql;
SOURCE /cesta/k/migrations/2026_04_13_cashbook_reports_permissions_fix.sql;
SOURCE /cesta/k/migrations/2026_04_13_stats_reports_module_activation.sql;

# 3. Verifikace:
SELECT kod_prava, popis FROM `25_prava` WHERE kod_prava LIKE 'DEFERRALS_%';
SELECT kod_prava, popis FROM `25_prava` WHERE kod_prava LIKE 'CASHBOOK_REPORTS_%';
SELECT module_stats_reports_visible FROM `25a_nastaveni_globalni` LIMIT 1;
```

---

### Krok 2️⃣: Frontend (Build + Deploy)

```bash
# 1. Build frontend
cd /var/www/erdms-prod/apps/eeo-v2/client
npm run build:prod

# 2. Zkontrolovat build
ls -lh build/

# 3. Restartovat služby (podle vašeho setupu)
# Např.:
sudo systemctl restart nginx
# nebo
pm2 restart eeo-v2

# 4. Vybavit cache prohlížečů
# CTRL+SHIFT+R nebo vyčistit cache
```

---

### Krok 3️⃣: Ověření na PROD

#### ✅ Checklist:

1. **Sledování aktivity:**
   - [ ] Otevřít Správa uživatelů → sekce "Aktivní uživatelé"
   - [ ] Navigovat na moduly: Roční poplatky, Čerpání LP, Majetek
   - [ ] Ověřit, že se zobrazují konkrétní názvy (ne "Aplikace")

2. **Dashboard widgety:**
   - [ ] Dashboard → widget Zprávy (RSS) má min. výšku i když je prázdný
   - [ ] Kliknout na RSS kanál pro skrytí → reload stránky → kanál zůstane skrytý
   - [ ] Zprávy Finanční správy promíchané mezi ostatními (ne vždy první)

3. **Práva DEFERRALS:**
   - [ ] Přihlásit se jako Hlavní účetní
   - [ ] Statistika a reporty → záložka "Dohadné položky" viditelná
   - [ ] Ověřit, že práva v DB mají kódy `DEFERRALS_*` (ne `DOHADNE_*`)

4. **Práva CASHBOOK_REPORTS:**
   - [ ] Přihlásit se jako Hlavní účetní
   - [ ] Statistika a reporty → záložka "Pokladna" viditelná
   - [ ] Ověřit widget v Dashboard (pokud máte permission)

---

## 📝 DOKUMENTACE VYTVOŘENÁ

```
USER_ACTIVITY_TRACKING_FIX.md - Dokumentace opravy activity trackingu
PUBLIKACE_PROD_2026-04-13.md - Tento soubor
```

---

## ⚠️ DŮLEŽITÁ POZNÁMKA

**BEFORE PROD:**
- [ ] Zkontrolovat DB připojení v produkčním `config.php`
- [ ] Ověřit backup DB před spuštěním migrací
- [ ] Změnit databázi v migračních souborech z `EEO-OSTRA-DEV` na `eeo2025` (PROD DB)
- [ ] Otestovat všechny migrace na kopii PROD DB

**AFTER PROD:**
- [ ] Notifikovat uživatele o nových funkcích
- [ ] Monitorovat logy prvních 24h
- [ ] Zkontrolovat, zda se neobjevují chyby v prohlížeči (F12 Console)

---

## 🔄 ROLLBACK PLÁN (pokud by bylo potřeba)

### Databáze:
```sql
-- Vrátit zpět CASHBOOK_OVERVIEW_* (pokud bylo v původní DB)
-- Smazat DEFERRALS_*, CASHBOOK_REPORTS_*
-- Vypnout modul: module_stats_reports_visible = '0'
```

### Frontend:
```bash
# Vrátit se na předchozí commit
git checkout <previous-commit>
npm run build:prod
```

---

**Připravil:** GitHub Copilot  
**Datum:** 13. dubna 2026  
**Status:** ✅ Připraveno k publikaci
