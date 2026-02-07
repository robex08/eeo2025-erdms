# 🚀 DEPLOYMENT GUIDE - SUPPLIERS & PERMISSIONS REFACTORING v2.00

**Datum vytvoření:** 5. ledna 2026  
**Cílová verze:** 2.00  
**Prostředí:** DEV → PRODUCTION  
**Odpovědná osoba:** [doplnit]  
**Plánovaný deploy:** Konec týdne (cca 10.-12. ledna 2026)

---

## ⚠️ PŘED ZAČÁTKEM

> **DŮLEŽITÉ:** Tento deployment se řídí standardním procesem dle **BUILD.md**  
> Před jakýmkoliv nasazením do produkce:
> 1. ✅ Otestovat všechny změny na DEV
> 2. ✅ Udělat **FULL BACKUP** produkční databáze
> 3. ✅ Udělat **FULL BACKUP** produkčních souborů
> 4. ✅ Nastavit aplikaci do maintenance mode
> 5. ✅ Spustit migrace postupně s validací po každém kroku

---

## 📋 PŘEHLED ZMĚN

### 🎯 Hlavní cíle deploymentu:

1. **Odstranění zastaralých CONTACT_* permissions** → přechod na SUPPLIER_*/PHONEBOOK_*
2. **Implementace visibility filteringu** pro dodavatele (personal, úsek, global)
3. **Universal search filtering** - neaktivní uživatelé/dodavatelé
4. **Oddělení viditelnosti v telefonním seznamu** od systémové aktivace
5. **Správné oprávnění pro "Administrace → Adresář"**
6. **Backend security fixes** - visibility filtering v API

---

## 📊 SOUHRN ZMĚN

### 🗄️ Databázové změny:
- ✅ Přidán sloupec `viditelny_v_tel_seznamu` do tabulky `25_uzivatele`
- ✅ Smazány permissions: `CONTACT_MANAGE`, `CONTACT_READ`, `CONTACT_EDIT`
- ✅ Vytvořeny nové permissions: `SUPPLIER_CREATE`, `SUPPLIER_DELETE`, `PHONEBOOK_MANAGE`
- ✅ Přejmenováno: `SUPPLIER_READ` → `SUPPLIER_VIEW`
- ✅ Migrace 20 přiřazení rolí z CONTACT_* na SUPPLIER_*
- ✅ **NOVÉ (7. ledna 2026):** Přidáno právo `FILE_REGISTRY_MANAGE` pro správu spisovky/file registry
  - Umožňuje přístup k "Spisovka Inbox" panelu v zaevidování faktury
  - Alternativa k ADMIN právu pro správu spisové služby

### 🎨 Frontend změny:
- ✅ ProfilePage.js - refactoring permissions
- ✅ ContactsPage.js - SUPPLIER_MANAGE místo CONTACT_MANAGE
- ✅ OrderForm25.js - SUPPLIER_* místo PHONEBOOK_* pro dodavatele
- ✅ availableSections.js - menu permissions
- ✅ Layout.js - "Administrace → Adresář" permissions

### 🔧 Hierarchy System Fixes:
- ✅ orderV2Endpoints.php - Enhanced error handling a fallback mechanismus
- ✅ hierarchyOrderFilters.php - Oprava table name constants
- ✅ Implementace robust error handling pro hierarchy filtering
- ✅ Graceful degradation na role-based filtering
- ✅ Comprehensive debug logging pro troubleshooting
- ✅ **PHONEBOOK VISIBILITY FIX:**
  - ✅ ContactsPage.js - filtr podle `viditelny_v_tel_seznamu`
  - ✅ EmployeeManagement.js - přepnutí na `viditelny_v_tel_seznamu`
  - ✅ api2auth.js - sjednocení na `viditelny_v_tel_seznamu`
  - ✅ Universal Search - oprava filtru viditelnosti

### 🔧 Backend změny:
- ✅ searchQueries.php - oprava z `visible_in_phonebook` na `viditelny_v_tel_seznamu`
- ✅ handlers.php - odstranění `visible_in_phonebook` fallback
- ✅ queries.php - přidán `viditelny_v_tel_seznamu` do SELECT
- ✅ App.js - route /address-book permissions
- ✅ AddressBookPage.js - podmíněné záložky podle práv
- ✅ **HIERARCHY FIXES:**
  - ✅ orderV2Endpoints.php - robust error handling a fallback na role-based filtering
  - ✅ hierarchyOrderFilters.php - oprava table name constants (TBL_* → direct names)
  - ✅ Comprehensive exception handling pro hierarchy system
  - ✅ Debug logging pro troubleshooting hierarchy issues

### 🔧 Backend Security:
- ✅ handlers.php - `CONTACT_MANAGE_ALL` → `SUPPLIER_MANAGE`
- ✅ ciselnikyHandlers.php - `handle_ciselniky_dodavatele_list()` - visibility filtering
- ✅ searchHandlers.php - universal search visibility + inactive filtering
- ✅ searchQueries.php - SQL queries s visibility conditions

### 💰 CASHBOOK - LP kód povinnost:
- ✅ **Tabulka `25a_pokladny`** - přidán sloupec `lp_kod_povinny` TINYINT(1) DEFAULT 0
- ✅ **CashboxModel.php** - `getAllCashboxes()` - SELECT zahrnuje `lp_kod_povinny`
- ✅ **CashbookModel.php** - `getBooks()` a `getBookById()` - JOIN na pokladny + `pokladna_lp_kod_povinny`
- ✅ **cashbookHandlersExtended.php** - nové endpointy:
  - `handle_cashbox_lp_requirement_update_post()` - Order V2 standard
  - `handle_cashbox_lp_requirement_get_post()` - Order V2 standard
- ✅ **cashbookHandlers.php** - validace LP kódu podle `pokladna_lp_kod_povinny`:
  - `handle_cashbook_entry_create_post()` - kontrola LP povinnosti
  - `handle_cashbook_entry_update_post()` - kontrola LP povinnosti
- ✅ **EntryValidator.php** - upravena validace `obsah_zapisu` (akceptuje prázdný string)
- ✅ **api.php** - registrace endpointů `cashbox-lp-requirement-update`, `cashbox-lp-requirement-get`
- ✅ **FE - CashbookTab.js** - toggle button pro LP povinnost v číselníku pokladen
- ✅ **FE - CashBookPage.js** - podmíněná validace LP kódu podle nastavení pokladny
- ✅ **FE - cashbookService.js** - API metody `updateLpRequirement()`, `getLpRequirement()`

### 📄 DOCX GENEROVÁNÍ - Formátování částek (7. ledna 2026):
- ✅ **BE - docxOrderDataHandlers.php** - `format_cz_currency()`:
  - Změněno z `number_format($value, 2, '.', ' ')` na `number_format($value, 2, ',', ' ')`
  - **Důvod:** Český standard - čárka jako des. oddělovač, mezera jako tisícový
  - **Problém:** MS Word interpretoval `01.02.8157 Kč` jako datum `1. února 8157`
  - **Řešení:** Formát `8 157,02 Kč` Word správně interpretuje jako text/číslo
- ✅ **BE - docxOrderDataHandlers.php** - RAW formáty čísel:
  - Přidána mezera jako tisícový oddělovač do `vypocitane.celkova_cena_*` polí
  - Nyní: `38 842,98` místo `38842,98`
- ✅ **FE - newDocxGenerator.js** - `createFieldMappingForDocx()`:
  - **ODSTRANĚNO** automatické volání `formatDateForDocx()` na všechny hodnoty
  - **Důvod:** Backend už posílá správně naformátované hodnoty, frontend by je neměl měnit
  - Přidána ochrana: hodnoty obsahující `,` nebo `Kč` se neformátují jako data
- ✅ **FE - Orders25List.js** - odstranění debug console.log (filtry)
- ✅ **FE - newDocxGenerator.js** - odstranění debug console.warn (missing fields)
- ✅ **Dokumentace** - aktualizovány příklady na český formát:
  - `DOCX-VYPOCITANE-PROMENNE-DOKUMENTACE.md`
  - `DOCX-VYPOCITANE-POLOZKY.md`
  - `BACKEND-TODO-VYPOCITANE-PROMENNE.md`

### 💰 CASHBOOK - Validace příjem/výdaj a LP kód povinnost (7. ledna 2026):
- ✅ **FE - CashBookPage.js** - validace povinnosti příjmu nebo výdaje:
  - Přidána kontrola že musí být vyplněn buď příjem NEBO výdaj (ne oba současně)
  - Červené zvýraznění nevalidních polí (červený border + světle červené pozadí)
  - Error toast s jasnou chybovou hláškou
  - Validation error state ukládá které pole je nevalidní
- ✅ **FE - ConfirmDialog.js** - oprava FontAwesome ikony:
  - Změněno z `icon="trash"` (string) na `icon={faTrash}` (objekt)
  - Odstraněna chyba "Could not find icon {prefix: 'fas', iconName: 'trash'}"
- ✅ **BE - CashbookService.php** - backend validace:
  - Kontrola že je uvedena částka příjmu NEBO výdaje
  - Kontrola že nejsou uvedeny obě současně
  - Podmíněná validace LP kódu podle nastavení pokladny (`lp_kod_povinny`)

### 📖 FILE REGISTRY PERMISSION (7. ledna 2026):
- ✅ **Nové právo:** `FILE_REGISTRY_MANAGE` (ID 148, anglický název pro spisovku)
- ✅ **FE - InvoiceEvidencePage.js** - přejmenování práva:
  - Line 2509: `hasPermission('FILE_REGISTRY_MANAGE')` místo `SPISOVKA_MANAGE`
  - Line 4177: `hasPermission('FILE_REGISTRY_MANAGE')` místo `SPISOVKA_MANAGE`  
  - Line 6174: `hasPermission('FILE_REGISTRY_MANAGE')` místo `SPISOVKA_MANAGE`
- ✅ **Umožňuje:**
  - Přístup k "Spisovka Inbox" panelu v zaevidování faktury
  - Alternativa k ADMIN právu pro správu spisové služby
  - Drag & drop faktur do spisovky
  - Zobrazení posledních 5 záznamů a dnešního počtu

### 🏦 PRODUKČNÍ LP KÓDY - Očekávaná data (7. ledna 2026):
⚠️ **DŮLEŽITÉ:** V produkci se očekává že již existuje LP kód:
- **Kód:** `LPKP - FINKP`
- **Popis:** Limitovaný přísliv - Finanční kontrola pokladny
- **Použití:** Pro pokladní knihy a finanční operace
- **Tabulka:** `25_limitovane_prisliby`
- **Validace:** Při migraci zkontrolovat přítomnost tohoto LP kódu
- **Fallback:** Pokud neexistuje, vytvořit nebo použít alternativní LP kód dle instrukcí správce

---

## 🗓️ DEPLOYMENT CHECKLIST

### FÁZE 1: PŘÍPRAVA (DEV testování)

**Datum:** 5.-9. ledna 2026  
**Prostředí:** DEV (eeo2025-dev)
VZDY pouzij : /PHPAPI pro kontrolu api na beckaendu, db
- [ ] **Test 1:** Ověřit universal search - neaktivní dodavatelé/uživatelé se nezobrazují
- [ ] **Test 2:** Ověřit visibility filtering - běžný user vidí jen své/úsekové/globální dodavatele
- [ ] **Test 3:** Ověřit "Administrace → Adresář" - přístup pouze pro SUPPLIER_MANAGE/PHONEBOOK_MANAGE
- [ ] **Test 4:** Ověřit záložky v adresáři podle práv
- [ ] **Test 5:** Ověřit OrderForm25 - přidávání dodavatelů s visibility pravidly
- [ ] **Test 6:** Ověřit menu "Kontakty" - pouze visible_in_phonebook=1
- [ ] **Test 7:** Build FE bez chyb: `npm run build:dev:explicit`
- [ ] **Test 8:** PHP syntax check všech upravených BE souborů
- [ ] **Test 9:** Test s různými rolemi (admin, THP/PES, VEDOUCI)
- [ ] **Test 10:** Ověřit že CONTACT_* permissions již nejsou nikde použity
- [ ] **Test 11:** 💰 CASHBOOK - Ověřit toggle LP kód povinnosti v číselníku pokladen
- [ ] **Test 12:** 💰 CASHBOOK - Ověřit podmíněnou validaci LP kódu podle nastavení pokladny
- [ ] **Test 13:** 💰 CASHBOOK - Ověřit že výdaj bez LP kódu lze uložit když je LP volitelný
- [ ] **Test 14:** 💰 CASHBOOK - Ověřit že výdaj bez LP kódu NELZE uložit když je LP povinný
- [ ] **Test 15:** 🔧 HIERARCHY - Ověřit že objednávka 11569 je viditelná po filtraci
- [ ] **Test 16:** 🔧 HIERARCHY - Test fallback mechanismu při vypnutí hierarchie
- [ ] **Test 17:** 🔧 HIERARCHY - Kontrola error logů (nesmí obsahovat "Hierarchy filter failed")
- [ ] **Test 18:** 📄 DOCX - Vygenerovat DOCX pro objednávku s částkou 47 000 Kč a ověřit formátování
- [ ] **Test 19:** 📄 DOCX - Ověřit že DPH se zobrazuje jako `8 157,02 Kč` (ne jako datum)
- [ ] **Test 20:** 📄 DOCX - Ověřit že předmět objednávky se zobrazuje beze změny (např. "DEV: Test 02")
- [ ] **Test 21:** 📄 DOCX - Ověřit větší částky (nad 100 000 Kč) - správné tisícové oddělovače
- [ ] **Test 22:** 📖 FILE REGISTRY - Ověřit přístup k "Spisovka Inbox" panelu s FILE_REGISTRY_MANAGE právem
- [ ] **Test 23:** 📖 FILE REGISTRY - Ověřit že ikona spisovky se zobrazuje v header actions
- [ ] **Test 24:** 📖 FILE REGISTRY - Ověřit že běžný user bez FILE_REGISTRY_MANAGE práva nevidí ikonu
- [ ] **Test 25:** 💰 CASHBOOK - Ověřit validaci příjem/výdaj s červeným zvýrazněním
- [ ] **Test 26:** 💰 CASHBOOK - Ověřit že prázdný řádek nelze uložit (toast error)

**Dokumentace testů:**
```
Test provedl: _________________
Datum: _________________
Nalezené problémy: _________________
Status: ☐ PASS  ☐ FAIL  ☐ NEED REVIEW
```

---

### FÁZE 2: BACKUP PRODUKCE

**Datum:** Den před deployem  
**Prostředí:** PRODUCTION

- [ ] **Pre-check 1:** Ověřit existenci LP kódu `LPKP - FINKP` v produkci
  ```sql
  SELECT cislo_lp, popis, aktivni 
  FROM 25_limitovane_prisliby 
  WHERE cislo_lp LIKE 'LPKP%' OR cislo_lp LIKE '%FINKP%';
  ```
  **Očekávaný výsledek:** Minimálně 1 záznam s LP kódem pro finanční kontrolu pokladny  
  **Pokud neexistuje:** Kontaktovat správce - může být nutné vytvořit nebo použít alternativní LP

- [ ] **Backup 1:** Full dump produkční DB `eeo2025`
  ```bash
  mysqldump -h [PROD_HOST] -u [PROD_USER] -p eeo2025 > backup_PROD_pre_v2.00_$(date +%Y%m%d_%H%M%S).sql
  ```
  **Uložit na:** `/var/backups/erdms/` + off-site backup

- [ ] **Backup 2:** Backup tabulek které budeme měnit
  ```bash
  mysqldump -h [PROD_HOST] -u [PROD_USER] -p eeo2025 \
    25_prava 25_role_prava 25_uzivatele 25_dodavatele \
    > backup_PROD_critical_tables_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Backup 3:** Backup produkčních souborů
  ```bash
  tar -czf /var/backups/erdms/erdms-platform_$(date +%Y%m%d_%H%M%S).tar.gz \
    /var/www/erdms-platform/
  ```

- [ ] **Backup 4:** Ověřit velikost a integritu backupů
  ```bash
  ls -lh /var/backups/erdms/
  gzip -t backup_PROD_*.sql.gz  # pokud komprimováno
  ```

**Backup verified by:** _________________  
**Backup location:** _________________  
**Backup size:** _________________ MB/GB

---

### FÁZE 3: DATABÁZOVÉ MIGRACE (PRODUKCE)

**Datum:** Den deploymentu  
**Prostředí:** PRODUCTION  
**Maintenance mode:** ✅ AKTIVNÍ

⚠️ **KRITICKÉ:** Provádět jednotlivě s validací po každém kroku!

#### 3.1 Přidání sloupce visible_in_phonebook

⚠️ **DŮLEŽITÉ:** Tento sloupec odděluje systémovou aktivaci (login) od viditelnosti v telefonním seznamu!

**Význam:**
- `aktivni = 1` + `visible_in_phonebook = 1` → Normální zaměstnanec (login + telefonní seznam)
- `aktivni = 1` + `visible_in_phonebook = 0` → Systémový účet (login, ale ne v tel. seznamu)
- `aktivni = 0` + `visible_in_phonebook = 1` → Bývalý zaměstnanec (již nemá login, ale zůstává v tel. seznamu)
- `aktivni = 0` + `visible_in_phonebook = 0` → Plně deaktivovaný

```sql
-- Kontrola před
SELECT COUNT(*) as total_users FROM 25_uzivatele;

-- Migrace
ALTER TABLE 25_uzivatele 
ADD COLUMN visible_in_phonebook TINYINT(1) NOT NULL DEFAULT 1 
COMMENT 'Viditelnost v telefonním seznamu (menu Kontakty). 1=viditelný, 0=skrytý' 
AFTER aktivni;

-- Validace
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'eeo2025'
  AND TABLE_NAME = '25_uzivatele'
  AND COLUMN_NAME = 'visible_in_phonebook';

-- Kontrola po (všichni by měli mít visible_in_phonebook=1)
SELECT visible_in_phonebook, COUNT(*) as count 
FROM 25_uzivatele 
GROUP BY visible_in_phonebook;
```

**Status:** ☐ DONE  ☐ FAILED  ☐ ROLLBACK NEEDED  
**Validace:** ☐ OK  ☐ ISSUES  
**Poznámky:** _________________

---

#### 3.2 Vytvoření nových permissions

```sql
-- Kontrola před
SELECT COUNT(*) FROM 25_prava WHERE kod_prava LIKE 'SUPPLIER_%' OR kod_prava LIKE 'PHONEBOOK_%' OR kod_prava = 'FILE_REGISTRY_MANAGE';

-- Migrace
INSERT INTO 25_prava (kod_prava, popis, aktivni) VALUES 
('SUPPLIER_CREATE', 'Oprávnění k vytváření nových dodavatelů', 1),
('SUPPLIER_DELETE', 'Oprávnění k mazání dodavatelů', 1),
('PHONEBOOK_MANAGE', 'Plný přístup k telefonnímu seznamu zaměstnanců (všechny operace)', 1),
('FILE_REGISTRY_MANAGE', 'Správa spisové služby / file registry (přístup k spisovka inbox)', 1)
ON DUPLICATE KEY UPDATE popis=VALUES(popis);

-- Validace
SELECT id, kod_prava, popis, aktivni 
FROM 25_prava 
WHERE kod_prava IN ('SUPPLIER_CREATE', 'SUPPLIER_DELETE', 'PHONEBOOK_MANAGE', 'FILE_REGISTRY_MANAGE');
```

**Status:** ☐ DONE  ☐ FAILED  ☐ ROLLBACK NEEDED  
**Poznámky:** _________________

---

#### 3.3 Přejmenování SUPPLIER_READ → SUPPLIER_VIEW

```sql
-- Kontrola před
SELECT id, kod_prava, popis FROM 25_prava WHERE kod_prava = 'SUPPLIER_READ';
SELECT COUNT(*) as assignments FROM 25_role_prava WHERE pravo_id IN (SELECT id FROM 25_prava WHERE kod_prava = 'SUPPLIER_READ');

-- Migrace
UPDATE 25_prava 
SET kod_prava = 'SUPPLIER_VIEW', 
    popis = 'Oprávnění k prohlížení dodavatelů (vlastní úsek + globální)'
WHERE kod_prava = 'SUPPLIER_READ';

-- Validace
SELECT id, kod_prava, popis FROM 25_prava WHERE kod_prava = 'SUPPLIER_VIEW';
SELECT COUNT(*) as assignments FROM 25_role_prava WHERE pravo_id IN (SELECT id FROM 25_prava WHERE kod_prava = 'SUPPLIER_VIEW');
```

**Status:** ☐ DONE  ☐ FAILED  ☐ ROLLBACK NEEDED  
**Počet affected assignments:** _________________

---

#### 3.4 Migrace přiřazení rolí CONTACT_* → SUPPLIER_*

⚠️ **KRITICKÉ:** Před smazáním CONTACT_* musíme přemigrovat přiřazení rolí!

```sql
-- Kontrola před - kolik přiřazení má CONTACT_MANAGE
SELECT COUNT(*) as contact_manage_assignments 
FROM 25_role_prava rp
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava = 'CONTACT_MANAGE';

-- Získat ID permissions
SELECT @supplier_manage_id := id FROM 25_prava WHERE kod_prava = 'SUPPLIER_MANAGE' LIMIT 1;
SELECT @contact_manage_id := id FROM 25_prava WHERE kod_prava = 'CONTACT_MANAGE' LIMIT 1;

-- Migrace: UPDATE všech přiřazení z CONTACT_MANAGE na SUPPLIER_MANAGE
UPDATE 25_role_prava 
SET pravo_id = @supplier_manage_id 
WHERE pravo_id = @contact_manage_id;

-- Validace
SELECT r.nazev_role, p.kod_prava 
FROM 25_role_prava rp
JOIN 25_role r ON rp.role_id = r.id
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava = 'SUPPLIER_MANAGE'
ORDER BY r.nazev_role;
```

**Status:** ☐ DONE  ☐ FAILED  ☐ ROLLBACK NEEDED  
**Počet přemigrovaných přiřazení:** _________________

---

#### 3.6 💰 CASHBOOK - Přidání sloupce lp_kod_povinny do tabulky 25a_pokladny

```sql
-- Kontrola před - ověřit strukturu tabulky
DESCRIBE 25a_pokladny;

-- Migrace - přidání sloupce
ALTER TABLE `25a_pokladny` 
ADD COLUMN `lp_kod_povinny` TINYINT(1) NOT NULL DEFAULT 0 
COMMENT 'LP kód je povinný u výdajů: 0=volitelný, 1=povinný'
AFTER `poznamka`;

-- Validace - ověřit že sloupec existuje
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'eeo2025' 
  AND TABLE_NAME = '25a_pokladny' 
  AND COLUMN_NAME = 'lp_kod_povinny';

-- Kontrola počtu řádků
SELECT 
  COUNT(*) as total_cashboxes,
  SUM(lp_kod_povinny = 1) as required_count,
  SUM(lp_kod_povinny = 0) as optional_count
FROM 25a_pokladny;
```

**Status:** ☐ DONE  ☐ FAILED  ☐ ROLLBACK NEEDED  
**Výchozí hodnota:** 0 (LP kód volitelný)  
**Poznámka:** Správci mohou hodnotu změnit v Číselníku pokladen pomocí toggle buttonu

---

#### 3.7 Smazání zastaralých CONTACT_* permissions

⚠️ **POZOR:** Provádět až po úspěšné migraci 3.4!

```sql
-- Kontrola před - nesmí být žádná přiřazení!
SELECT p.kod_prava, COUNT(*) as assignments 
FROM 25_role_prava rp
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava IN ('CONTACT_MANAGE', 'CONTACT_READ', 'CONTACT_EDIT')
GROUP BY p.kod_prava;

-- Pokud jsou nějaká přiřazení, STOP! Nepokračovat!
-- Pokud je výsledek prázdný, pokračovat:

-- Smazání permissions
DELETE FROM 25_prava 
WHERE kod_prava IN ('CONTACT_MANAGE', 'CONTACT_READ', 'CONTACT_EDIT');

-- Validace - mělo by vrátit 0 rows
SELECT * FROM 25_prava WHERE kod_prava LIKE 'CONTACT_%';
```

**Status:** ☐ DONE  ☐ FAILED  ☐ ROLLBACK NEEDED  
**Smazáno permissions:** _________________ (očekáváno: 3)

---

### FÁZE 4: NASAZENÍ KÓDU (PRODUKCE)

**Datum:** Den deploymentu  
**Prostředí:** PRODUCTION

#### 4.1 Backend - PHP soubory

```bash
cd /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/

# Backup aktuálních souborů
cp handlers.php handlers.php.backup_$(date +%Y%m%d_%H%M%S)
cp ciselnikyHandlers.php ciselnikyHandlers.php.backup_$(date +%Y%m%d_%H%M%S)
cp searchHandlers.php searchHandlers.php.backup_$(date +%Y%m%d_%H%M%S)
cp searchQueries.php searchQueries.php.backup_$(date +%Y%m%d_%H%M%S)

# Nahrát nové verze z DEV (nebo z GIT)
# scp nebo rsync z DEV nebo git pull

# Syntax check
php -l handlers.php
php -l ciselnikyHandlers.php
php -l searchHandlers.php
php -l searchQueries.php
```

**Změněné soubory:**
- [ ] handlers.php - `CONTACT_MANAGE_ALL` → `SUPPLIER_MANAGE`, `handle_users_list()` s `visible_in_phonebook`
- [ ] ciselnikyHandlers.php - visibility filtering v `handle_ciselniky_dodavatele_list()`
- [ ] searchHandlers.php - universal search s visibility + user úseky
- [ ] searchQueries.php - SQL s visibility conditions a `visible_in_phonebook` filter

**Status:** ☐ DONE  ☐ FAILED  
**Syntax check:** ☐ PASS  ☐ FAIL

⚠️ **POZNÁMKA:** Backend `handle_users_list()` nyní vrací všechny uživatele s `visible_in_phonebook` sloupcem. Frontend ContactsPage a Universal Search tento flag respektují.

---

#### 4.2 Frontend - Build a nasazení

```bash
cd /var/www/erdms-platform/apps/eeo-v2/client/

# Backup aktuálního buildu
mv build build.backup_$(date +%Y%m%d_%H%M%S)

# Pull z GIT (nebo sync z DEV)
git pull origin main  # nebo jak máte větev

# Install dependencies (pokud se změnily)
npm ci --production

# Build PRODUCTION
export NODE_ENV=production
export REACT_APP_VERSION=2.00
npm run build

# Zkontrolovat že build proběhl úspěšně
ls -lh build/
```

**Změněné komponenty:**
- [ ] ProfilePage.js
- [ ] ContactsPage.js
- [ ] OrderForm25.js
- [ ] availableSections.js
- [ ] Layout.js
- [ ] App.js
- [ ] AddressBookPage.js

**Build status:** ☐ SUCCESS  ☐ FAILED  
**Build size:** _________________ MB

---

### FÁZE 5: VALIDACE PO NASAZENÍ (PRODUKCE)

**Maintenance mode:** ✅ STÁLE AKTIVNÍ (vypnout až po úspěšné validaci)

#### 5.1 Databázová validace

```sql
-- Check 1: visible_in_phonebook existuje a má správné hodnoty
SELECT 
    COUNT(*) as total,
    SUM(visible_in_phonebook = 1) as visible,
    SUM(visible_in_phonebook = 0) as hidden
FROM 25_uzivatele;

-- Check 2: Nové permissions existují
SELECT id, kod_prava, popis, aktivni 
FROM 25_prava 
WHERE kod_prava IN ('SUPPLIER_CREATE', 'SUPPLIER_DELETE', 'PHONEBOOK_MANAGE', 'SUPPLIER_VIEW')
ORDER BY kod_prava;

-- Check 3: CONTACT_* permissions jsou smazány
SELECT COUNT(*) as should_be_zero 
FROM 25_prava 
WHERE kod_prava LIKE 'CONTACT_%';

-- Check 4: Role assignments jsou správně
SELECT r.nazev_role, COUNT(*) as permissions_count
FROM 25_role_prava rp
JOIN 25_role r ON rp.role_id = r.id
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava LIKE 'SUPPLIER_%' OR p.kod_prava LIKE 'PHONEBOOK_%'
GROUP BY r.nazev_role
ORDER BY r.nazev_role;
```

**Validace:** ☐ PASS  ☐ FAIL  
**Poznámky:** _________________

---

#### 5.2 Funkční testování

**Test s admin účtem:**
- [ ] Login do systému
- [ ] Přístup do "Administrace → Adresář"
- [ ] Vidí obě záložky (Dodavatelé + Zaměstnanci)
- [ ] Universal search zobrazuje všechny uživatele/dodavatele
- [ ] Může editovat všechny dodavatele

**Test s běžným uživatelem (např. THP/PES s SUPPLIER_EDIT):**
- [ ] Login do systému
- [ ] NEMÁ přístup do "Administrace → Adresář"
- [ ] V profilu → Adresář vidí jen své/úsekové/globální dodavatele
- [ ] V OrderForm může přidat dodavatele (modal)
- [ ] Universal search nezobrazuje neaktivní uživatele
- [ ] Universal search zobrazuje jen své/úsekové/globální dodavatele
- [ ] Menu "Kontakty" zobrazuje jen visible_in_phonebook=1

**Test s uživatelem s SUPPLIER_MANAGE:**
- [ ] Login do systému
- [ ] Má přístup do "Administrace → Adresář"
- [ ] Vidí záložku "Dodavatelé" (ne "Zaměstnanci" pokud nemá PHONEBOOK_MANAGE)
- [ ] Může editovat všechny dodavatele včetně globálních
- [ ] Může aktivovat/deaktivovat dodavatele

**Test s uživatelem s PHONEBOOK_MANAGE:**
- [ ] Login do systému
- [ ] Má přístup do "Administrace → Adresář"
- [ ] Vidí záložku "Zaměstnanci" (ne "Dodavatelé" pokud nemá SUPPLIER_MANAGE)
- [ ] Může upravovat visible_in_phonebook flag

**Status:** ☐ ALL PASS  ☐ ISSUES FOUND  
**Issues:** _________________

---

#### 5.3 Performance check

```sql
-- Check query performance - Universal search suppliers
EXPLAIN SELECT * FROM 25_dodavatele d
WHERE d.nazev LIKE '%test%'
AND (1 = 1 OR d.aktivni = 1 OR 0 = 1)
AND (1 = 1 OR (
    d.user_id = 123
    OR (d.user_id = 0 AND (d.usek_zkr IS NULL OR d.usek_zkr = '' OR d.usek_zkr = '[]'))
));

-- Check indexes
SHOW INDEX FROM 25_dodavatele;
SHOW INDEX FROM 25_uzivatele;
```

**Query execution time:** _________________ ms  
**Index použity:** ☐ ANO  ☐ NE  
**Performance:** ☐ OK  ☐ NEED OPTIMIZATION

---

### FÁZE 6: GO LIVE

- [ ] Všechny testy v fázi 5 jsou úspěšné
- [ ] Backup je dostupný a validní
- [ ] Rollback plán je připraven
- [ ] **Vypnout maintenance mode**
- [ ] Monitorovat error logy první 30 minut

```bash
# Monitorování logů
tail -f /var/log/apache2/error.log
tail -f /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/logs/error.log
```

**Go-live čas:** _________________  
**Odpovědná osoba:** _________________  
**Status:** ☐ SUCCESS  ☐ ROLLBACK NEEDED

---

## 🔄 ROLLBACK PLÁN

Pokud se objeví kritické problémy:

### Rollback Step 1: Databáze

```sql
-- Restore z backupu
mysql -h [PROD_HOST] -u [PROD_USER] -p eeo2025 < backup_PROD_pre_v2.00_TIMESTAMP.sql
```

### Rollback Step 2: Kód

```bash
# Backend
cd /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/
cp handlers.php.backup_TIMESTAMP handlers.php
cp ciselnikyHandlers.php.backup_TIMESTAMP ciselnikyHandlers.php
cp searchHandlers.php.backup_TIMESTAMP searchHandlers.php
cp searchQueries.php.backup_TIMESTAMP searchQueries.php

# Frontend
cd /var/www/erdms-platform/apps/eeo-v2/client/
rm -rf build
mv build.backup_TIMESTAMP build
```

### Rollback Step 3: Validace

- [ ] Aplikace funguje
- [ ] Uživatelé se mohou přihlásit
- [ ] Základní funkce fungují

**Rollback provedl:** _________________  
**Rollback čas:** _________________

---

## 📝 POST-DEPLOYMENT ÚKOLY

### Okamžitě po deploymentu:

- [ ] Informovat uživatele o změnách (email, oznámení v systému)
- [ ] Aktualizovat dokumentaci uživatelskou
- [ ] Aktualizovat technickou dokumentaci
- [ ] Zrušit staré backupy (ponechat poslední 3)

### Do 7 dnů:

- [ ] Zkontrolovat error logy
- [ ] Shromáždit feedback od uživatelů
- [ ] Optimalizovat performance pokud potřeba
- [ ] Připravit hot-fix pokud nalezeny minor issues

---

## 📞 KONTAKTY PRO DEPLOYMENT

**Development:** _________________  
**DevOps:** _________________  
**Admin DB:** _________________  
**Emergency:** _________________

---

## 📚 REFERENCE DOKUMENTY

- `BUILD.md` - standardní build proces
- `PERMISSIONS_FINAL_AUDIT_AND_FIX.md` - kompletní audit permissions
- `UNIVERSAL_SEARCH_INACTIVE_FIX.md` - fix universal search
- `migration_add_visible_in_phonebook.sql` - SQL migrace
- `CONTACTS_SYSTEM_ANALYSIS.md` - původní analýza problému

---

## 🔍 KDE NAJÍT VISIBLE_IN_PHONEBOOK FLAG V UI

### Backend API endpoint:
- **Endpoint:** `POST users/list`
- **Handler:** `handle_users_list()` v `handlers.php` (řádek 3113)
- **Vrací:** Všechny uživatele včetně `visible_in_phonebook` sloupce
- **Filtrování:** Frontend komponenty filtrují podle tohoto flagu

### Frontend - kde se používá:

#### 1. **Universal Search** (`searchQueries.php` line ~97)
```sql
AND (:is_admin = 1 OR u.visible_in_phonebook = 1)
```
- Admin vidí všechny uživatele
- Běžný user vidí jen `visible_in_phonebook = 1`

#### 2. **ContactsPage** (menu "Kontakty")
- **Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/ContactsPage.js`
- **Funkce:** `fetchEmployees()` v `api2auth.js` (řádek 1303)
- **Filtruje:** Automaticky pomocí backend API `users/list` + `visible_in_phonebook`
- **Menu položka:** "Kontakty" → zobrazuje pouze zaměstnance s `visible_in_phonebook = 1`

#### 3. **AddressBookPage** (admin "Adresář → Zaměstnanci")
- **Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/AddressBookPage.js`
- **Tab:** "Zaměstnanci" (viditelný pouze pro PHONEBOOK_MANAGE)
- **Komponenta:** `EmployeeManagement.js`
- **Zde se BUDE editovat:** Přidáme checkbox pro změnu `visible_in_phonebook` (zatím není implementováno v UI)

### ⚠️ IMPLEMENTACE EDITACE (ZATÍM NENÍ V UI)

**Aktuální stav:** EmployeeManagement.js je pouze **read-only** komponent pro zobrazení zaměstnanců.

**Co chybí:**
1. Edit modal/formulář pro editaci zaměstnance
2. Backend endpoint `users/update` pro update uživatelských dat
3. Checkbox pro změnu `visible_in_phonebook` v edit formuláři

**Prozatímní řešení:**
Flag `visible_in_phonebook` lze měnit přímo v databázi:
```sql
-- Skrýt uživatele z telefonního seznamu:
UPDATE 25_uzivatele SET visible_in_phonebook = 0 WHERE id = 123;

-- Zobrazit uživatele v telefonním seznamu:
UPDATE 25_uzivatele SET visible_in_phonebook = 1 WHERE id = 123;
```

**Budoucí implementace (po deploymentu):**

1. **Backend:** Vytvořit endpoint `POST users/update` v handlers.php
   ```php
   function handle_users_update($input, $config, $queries) {
     // Permission check: PHONEBOOK_MANAGE required
     // UPDATE 25_uzivatele SET visible_in_phonebook = :visible WHERE id = :id
   }
   ```

2. **Frontend:** Přidat edit modal do EmployeeManagement.js
   ```javascript
   <Checkbox
     label="Viditelný v telefonním seznamu"
     checked={employee.visible_in_phonebook === 1}
     onChange={(e) => handleFieldChange('visible_in_phonebook', e.target.checked ? 1 : 0)}
   />
   ```

3. **Frontend API:** Přidat funkci do api2auth.js
   ```javascript
   export async function updateEmployee({ token, username, id, visible_in_phonebook }) {
     const payload = { token, username, id, visible_in_phonebook };
     return await api2.post('users/update', payload);
   }
   ```

---

## 🔴 KRITICKÉ - DATABÁZOVÉ MIGRACE PŘED DEPLOYEM

⚠️ **POZOR! Tyto SQL příkazy musí být spuštěny PŘED nasazením nového kódu:**

```sql
-- KROK 1: Nastavení viditelnosti podle aktivity uživatelů
UPDATE 25_uzivatele 
SET viditelny_v_tel_seznamu = CASE 
    WHEN aktivni = 1 THEN 1 
    WHEN aktivni = 0 THEN 0 
    ELSE viditelny_v_tel_seznamu 
END;

-- KROK 2: Ověření (musí vrátit 2 řádky)
SELECT COUNT(*) as pocet, aktivni, viditelny_v_tel_seznamu 
FROM 25_uzivatele 
GROUP BY aktivni, viditelny_v_tel_seznamu 
ORDER BY aktivni DESC;
-- Očekávaný výsledek: aktivní=1,visible=1 | neaktivní=0,visible=0
```

**Důvod:** Nový kód už nepoužívá `visible_in_phonebook` fallback - vše je na `viditelny_v_tel_seznamu`.

---

## 🔧 HIERARCHY SYSTEM FIXES (KRITICKÉ OPRAVY)

⚠️ **POZOR:** Tyto opravy řeší kritický problém s hierarchie filtrem v objednávkách kde byly objednávky neviditelné po změně stavu.

### 🎯 Problém:
- Order 11569 se nezobrazoval po změně stavu na "CEKA_SE"
- Hierarchy filter měl nedefinované table constants (TBL_*)
- Chyběl robust error handling pro hierarchy system
- Nebyl fallback mechanismus při selhání hierarchy

### 🔧 Implementované opravy:

#### 1. orderV2Endpoints.php
```php
// Přidáno robust error handling s fallback
try {
    $orders = applyHierarchyFilterToOrders($orders, $userId);
} catch (Exception $e) {
    // Graceful degradation na role-based filtering
    error_log("Hierarchy filter failed: " . $e->getMessage());
    $orders = applyRoleBasedFilterToOrders($orders, $userId);
}
```

#### 2. hierarchyOrderFilters.php
```php
// Opraveny table name constants
$query = "SELECT * FROM 25a_uzivatel_vztahy_organizace"; // místo TBL_*
$query = "SELECT * FROM 25a_nastaveni_globalni"; // místo TBL_*

// Přidáno comprehensive error handling
try {
    $relationships = getUserRelationshipsFromStructure($userId);
} catch (Exception $e) {
    error_log("Hierarchy getUserRelationships failed: " . $e->getMessage());
    return []; // Vrať prázdný array pro graceful degradaci
}
```

### ✅ Validace po deployi:

```bash
# Zkontrolovat hierarchy settings v databázi
mysql -u [USER] -p eeo2025 -e "
SELECT 
    klic_nastaveni, 
    hodnota_nastaveni 
FROM 25a_nastaveni_globalni 
WHERE klic_nastaveni LIKE 'hierarchy%';
"

# Očekávaný výsledek:
# hierarchy_enabled = 1
# hierarchy_profile_id = 12
# hierarchy_logic = OR
```

```bash
# Test order visibility pro uživatele 136 (příkazce order 11569)
mysql -u [USER] -p eeo2025 -e "
SELECT 
    obj_id,
    obj_cislo,
    stav_workflow_kod,
    prikazce_id,
    aktivni
FROM 25a_objednavky 
WHERE obj_id = 11569;
"

# Očekávaný výsledek:
# obj_id=11569, stav_workflow_kod=CEKA_SE, prikazce_id=136, aktivni=1
```

### 🔍 Monitoring a troubleshooting:

```bash
# Zkontrolovat error logy pro hierarchy issues
tail -f /var/log/apache2/error.log | grep -i hierarchy

# Debug hierarchy settings pomocí PHP
php -r "
include '/path/to/config.php';
\$result = mysql_query('SELECT * FROM 25a_nastaveni_globalni WHERE klic_nastaveni LIKE \"hierarchy%\"');
while(\$row = mysql_fetch_assoc(\$result)) {
    echo \$row['klic_nastaveni'] . ': ' . \$row['hodnota_nastaveni'] . \"\n\";
}
"
```

### 📋 Post-deployment checklist:

- [ ] Hierarchy enabled správně nastaveno (=1)
- [ ] Order 11569 viditelný pro příkazce (userId 136)
- [ ] Error logy neobsahují "Hierarchy filter failed" zprávy
- [ ] Frontend zobrazuje správný počet objednávek (5 místo 3)
- [ ] Status "Čeká se" obsahuje správný počet objednávek
- [ ] Rollback plan připraven v případě problémů

**Status oprav:** ☐ DEPLOYED  ☐ TESTED  ☐ VERIFIED  
**Poznámky:** _________________

---

📋 **TODO Task:** ~~Vytvořit issue/ticket pro implementaci edit zaměstnanců s `visible_in_phonebook` checkboxem.~~
✅ **HOTOVO:** Implementováno toggle viditelnosti v Administrace → Adresář zaměstnanců

---

## ✅ FINÁLNÍ SIGN-OFF

**Deployment dokončen:** ☐ ANO  ☐ NE  
**Všechny testy prošly:** ☐ ANO  ☐ NE  
**Production stabilní:** ☐ ANO  ☐ NE  

**Datum:** _________________  
**Podpis (DEV):** _________________  
**Podpis (DevOps):** _________________  
**Podpis (PM):** _________________

---

*Tento dokument byl vygenerován: 5. ledna 2026*  
*Verze dokumentu: 1.0*
