# 📊 MIGRATION REPORT - Deploy 2026-06-21
## Audit log a Zastupování - Analýza DB změn

**Datum analýzy:** 2026-06-21  
**Analyzované období:** 11.6. - 21.6.2026  
**DEV DB:** `EEO-OSTRA-DEV`  
**PROD DB:** `eeo2025`  
**Status:** ⏳ ČEKÁ NA SCHVÁLENÍ

---

## 🎯 SHRNUTÍ ZMĚN

### ✅ Nová tabulka (chybí v PROD):
1. **`25a_audit_zmen`** — Field-level audit log pro objednávky, faktury, roční poplatky

### ✅ Existující tabulky (již v PROD, BEZE ZMĚN):
- `25_uzivatele_zastupovani` — ✅ Struktura shodná DEV ↔ PROD
- `25_zastupovani_akce_log` — ✅ Struktura shodná DEV ↔ PROD
- `25a_pokladni_audit` — ✅ Struktura shodná DEV ↔ PROD
- `25_moznosti_zastupovani` — ✅ Existuje v obou DB
- `25_notifikace_audit` — ✅ Existuje v obou DB
- `25_auditni_zaznamy` — ✅ Existuje v obou DB

---

## 📋 DETAILNÍ ANALÝZA NOVÉ TABULKY

### `25a_audit_zmen`

**Účel:**  
Specializovaný field-level audit log pro sledování změn v objednávkách, fakturách, ročních poplatcích a dodavatelských kontaktech.

**Vytvořeno:** 13.6.2026 (SQL_CREATE_AUDIT_ZMEN_20260613.sql)

**Struktura:**
- 18 sloupců (id, user info snapshots, object tracking, field changes, context, substitution FK)
- 6 indexů pro optimalizaci timeline a filtrování
- FK vazba na `25_uzivatele_zastupovani` (nullable - pouze pokud akce proběhla v zastoupení)

**Stav v DEV:**
- ✅ Tabulka existuje
- ✅ Obsahuje **1397 řádků** testovacích dat z DEV prostředí
- ⚠️ **DŮLEŽITÉ:** Tato DEV data NESMÍ být kopírována do PROD!

**Indexy:**
- `idx_objekt` (objekt_typ, objekt_id, dt_akce)
- `idx_uzivatel` (uzivatel_id, dt_akce)
- `idx_batch` (batch_id)
- `idx_akce_typ` (akce_typ, dt_akce)
- `idx_zastupovani` (zastupovani_id)
- `idx_dt_akce` (dt_akce)

---

## 🔒 BEZPEČNOSTNÍ OVĚŘENÍ

### ✅ ŽÁDNÉ PŘEPISY DAT
- Migration SQL obsahuje **POUZE** `CREATE TABLE IF NOT EXISTS`
- **ŽÁDNÉ** `UPDATE` příkazy
- **ŽÁDNÉ** `DELETE` příkazy
- **ŽÁDNÉ** `INSERT` příkazy s daty
- **ŽÁDNÉ** `ALTER TABLE` na existujících tabulkách

### ✅ OCHRANA PROTI ZTRÁTĚ DAT
- Použit `IF NOT EXISTS` — pokud tabulka existuje, nebude přepsána
- Žádné `DROP TABLE` příkazy
- Žádné změny na existujících sloupcích

### ✅ ROLLBACK PLÁN
Pokud by bylo potřeba odstranit tabulku po nasazení:
```sql
DROP TABLE IF EXISTS `25a_audit_zmen`;
```

---

## 📦 GIT COMMITY ZA OBDOBÍ

**Klíčové commity související s audit logem:**
- `225fb5e1` — feat(audit): Přidán detail poslední auditní akce do V3 podřádku
- `dc7bc90d` — fix(audit): doplneni OBJ audit pri workflow zmenach VS
- `f0749ed4` — RH Audit+Zastup: Sjednocení audit akcí
- `6eebe194` — fix: Audit log pagination viditelnost
- `f4c9d9e5` — backup: zastupovani audit + faktury VS badge

**Dokumentace:**
- `007cc305` — Docs: Aktualizace dokumentace zastupování - 18.6.2026

---

## ⚠️ KRITICKÁ PRAVIDLA PRO NASAZENÍ

### 🔴 ZAKÁZÁNO:
1. ❌ Kopírovat testovací data z DEV do PROD
2. ❌ Měnit strukturu existujících tabulek
3. ❌ Spouštět UPDATE/DELETE na produkčních datech
4. ❌ Přepisovat existující záznamy

### ✅ POVOLENO:
1. ✅ Vytvořit prázdnou tabulku `25a_audit_zmen` v PROD
2. ✅ Ponechat všechny existující tabulky beze změn
3. ✅ Aplikovat indexy dle DEV struktury

---

## 📝 MIGRATION SQL KE SCHVÁLENÍ

SQL soubor: `SQL_MIGRATION_PROD_2026-06-21_AUDIT_ZMEN.sql`

**Obsah:**
- CREATE TABLE `25a_audit_zmen` (IF NOT EXISTS)
- Definice všech sloupců dle DEV verze
- Vytvoření 6 indexů
- **ŽÁDNÁ DATA** — tabulka bude prázdná po vytvoření

**Velikost:** ~2.5 KB (pouze DDL, žádná data)

---

## ✅ SCHVALOVACÍ CHECKLIST

- [ ] **Ověřeno:** Nová tabulka `25a_audit_zmen` chybí v PROD
- [ ] **Ověřeno:** Existující tabulky mají shodnou strukturu DEV ↔ PROD
- [ ] **Ověřeno:** SQL neobsahuje UPDATE/DELETE/INSERT příkazy
- [ ] **Ověřeno:** Použit `IF NOT EXISTS` pro ochranu
- [ ] **Připravena záloha:** Backup PROD z 2026-06-21 ✅ (viz `/var/www/__BCK_PRODUKCE/2026-06-21/`)
- [ ] **Připravena migrace DB:** `eeo2025_migrace0626` pro testování ✅
- [ ] **SCHVÁLENO UŽIVATELEM:** ⏳ ČEKÁ

---

## 🚀 DOPORUČENÝ POSTUP NASAZENÍ

### 1. Testování na migrační DB (PŘED nasazením do PROD):
```bash
# Test na eeo2025_migrace0626
mysql -h 10.3.172.11 -u phpmyadmin -p'7BI2X5DSzC1W' eeo2025_migrace0626 < SQL_MIGRATION_PROD_2026-06-21_AUDIT_ZMEN.sql

# Ověření struktury
mysql -h 10.3.172.11 -u phpmyadmin -p'7BI2X5DSzC1W' eeo2025_migrace0626 -e "DESCRIBE 25a_audit_zmen;"
```

### 2. Nasazení do PROD (PO schválení a testu):
```bash
# Aplikace na produkční DB
mysql -h 10.3.172.11 -u phpmyadmin -p'7BI2X5DSzC1W' eeo2025 < SQL_MIGRATION_PROD_2026-06-21_AUDIT_ZMEN.sql

# Ověření
mysql -h 10.3.172.11 -u phpmyadmin -p'7BI2X5DSzC1W' eeo2025 -e "SHOW TABLES LIKE '25a_audit_zmen';"
mysql -h 10.3.172.11 -u phpmyadmin -p'7BI2X5DSzC1W' eeo2025 -e "SELECT COUNT(*) FROM 25a_audit_zmen;"
# Očekávaný výsledek: 0 (prázdná tabulka)
```

### 3. Verifikace po nasazení:
```bash
# Zkontrolovat indexy
mysql -h 10.3.172.11 -u phpmyadmin -p'7BI2X5DSzC1W' eeo2025 -e "SHOW INDEX FROM 25a_audit_zmen;"

# Otestovat insert (aby bylo jisté, že tabulka funguje)
# Provede se automaticky při první API akci, která zapisuje do auditu
```

---

## 📞 KONTAKT PRO SCHVÁLENÍ

**Vyžadováno potvrzení:**
- ✅ Schválení vytvoření nové tabulky `25a_audit_zmen`
- ✅ Potvrzení, že testovací data z DEV se NEMAJÍ kopírovat
- ✅ Povolení spustit migration SQL na PROD DB

**Po schválení:**
1. Vytvořím finální SQL soubor
2. Otestuji na `eeo2025_migrace0626`
3. Po vašem potvrzení testu aplikuji na `eeo2025` PROD
4. Provedu verifikaci

---

**Status:** ⏳ **ČEKÁ NA VAŠE SCHVÁLENÍ**

Potvrďte prosím:
- Souhlasíte s vytvořením tabulky `25a_audit_zmen` v PROD?
- Souhlasíte s pravidlem "prázdná tabulka = žádná data z DEV"?
- Mám připravit finální SQL a otestovat na migrační DB?
