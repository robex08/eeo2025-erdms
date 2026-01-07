# 📋 CHANGELOG - EEO v2.00 Production Deployment

**Verze:** 2.00  
**Datum přípravy:** 7. ledna 2026  
**Plánovaný deployment:** 10.-12. ledna 2026  
**Prostředí:** DEV → PRODUCTION

---

## 🎯 Hlavní změny v této verzi

### 1. 👥 Suppliers & Permissions Refactoring
**Problém:** Zastaralý systém CONTACT_* permissions, nejednotná viditelnost dodavatelů  
**Řešení:** Kompletní refactoring na SUPPLIER_*/PHONEBOOK_* systém s visibility filteringem

### 2. 📞 Telefonní seznam - Oddělení viditelnosti
**Problém:** Viditelnost v telefonním seznamu vázána na systémovou aktivaci účtu  
**Řešení:** Nový sloupec `visible_in_phonebook` pro nezávislé řízení viditelnosti

### 3. 🔧 Org Hierarchy System - Robustnost
**Problém:** Hierarchický filtr mohl způsobit výpadky při chybách  
**Řešení:** Enhanced error handling s fallback na role-based filtering

### 4. 💰 Cashbook - LP kód povinnost
**Problém:** LP kód byl globálně povinný pro všechny pokladny  
**Řešení:** Konfigurovatelná povinnost LP kódu per pokladna

### 5. 📄 DOCX Generování - České formátování
**Problém:** MS Word interpretoval částky jako data (`01.02.8157 Kč` → datum)  
**Řešení:** Český standard formátování s čárkou a mezerami (`8 157,02 Kč`)

---

## 📊 Detailní changelog po kategoriích

### 🗄️ Databázové změny

#### Tabulka `25_uzivatele`
```sql
ALTER TABLE 25_uzivatele 
ADD COLUMN visible_in_phonebook TINYINT(1) NOT NULL DEFAULT 1 
COMMENT 'Viditelnost v telefonním seznamu' 
AFTER aktivni;
```

**Význam hodnot:**
- `aktivni=1, visible_in_phonebook=1` → Normální zaměstnanec (login + tel. seznam)
- `aktivni=1, visible_in_phonebook=0` → Systémový účet (login, ne v tel. seznamu)
- `aktivni=0, visible_in_phonebook=1` → Bývalý zaměstnanec (už nemá login, ale v tel. seznamu)
- `aktivni=0, visible_in_phonebook=0` → Plně deaktivovaný

#### Tabulka `25a_pokladny`
```sql
ALTER TABLE 25a_pokladny 
ADD COLUMN lp_kod_povinny TINYINT(1) DEFAULT 0 
COMMENT 'Zda je LP kód povinný pro tuto pokladnu';
```

#### Tabulka `25_prava` - Nové permissions
**Vytvořeno:**
- `SUPPLIER_CREATE` - Vytváření dodavatelů
- `SUPPLIER_DELETE` - Mazání dodavatelů  
- `PHONEBOOK_MANAGE` - Správa telefonního seznamu

**Přejmenováno:**
- `SUPPLIER_READ` → `SUPPLIER_VIEW`

**Odstraněno (deprecated):**
- `CONTACT_MANAGE` ❌
- `CONTACT_READ` ❌
- `CONTACT_EDIT` ❌

#### Tabulka `25_prava` - Nové oprávnění SPISOVKA_MANAGE
```sql
INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
VALUES ('SPISOVKA_MANAGE', 'Správa Spisovka InBox - přístup k evidenci faktur ze spisovny', 1);
```

**Automatické přiřazení:**
- Role `EKONOM` (pokud existuje)
- Role `UCETNI` (pokud existuje)

#### Tabulka `25_role_prava` - Migrace přiřazení
**Celkem migrováno:** 20 přiřazení z CONTACT_* na SUPPLIER_*

---

### 🎨 Frontend změny

#### Permissions refactoring
**Soubory:** 15 souborů upraveno

| Soubor | Změna |
|--------|-------|
| `ProfilePage.js` | `CONTACT_MANAGE_ALL` → `SUPPLIER_MANAGE` |
| `ContactsPage.js` | `CONTACT_MANAGE` → `SUPPLIER_MANAGE` |
| `OrderForm25.js` | `PHONEBOOK_*` → `SUPPLIER_*` pro dodavatele |
| `availableSections.js` | Menu permissions update |
| `Layout.js` | "Administrace → Adresář" permissions |
| `App.js` | Route `/address-book` permissions |
| `AddressBookPage.js` | Podmíněné záložky podle práv |

#### Telefonní seznam - Visibility filtering
```javascript
// PŘED (špatně):
.filter(user => user.aktivni === 1)

// PO (správně):
.filter(user => user.viditelny_v_tel_seznamu === 1 || user.visible_in_phonebook === 1)
```

**Soubory:**
- `ContactsPage.js` - filtr podle `viditelny_v_tel_seznamu`
- `EmployeeManagement.js` - přepnutí na `viditelny_v_tel_seznamu`
- `api2auth.js` - sjednocení na `viditelny_v_tel_seznamu`
- Universal Search - oprava filtru viditelnosti

#### DOCX generování - Odstranění auto-formátování
**Problém:** Frontend automaticky formátoval všechny hodnoty jako data  
**Řešení:** Backend = jediný zdroj pravdy, frontend pouze transportuje data

```javascript
// ODSTRANĚNO z createFieldMappingForDocx():
value = formatDateForDocx(value); // ❌ Způsobovalo problémy!

// PŘIDÁNO do formatDateForDocx():
if (value.includes(',') || value.includes('Kč')) {
  return value; // Je to částka, NE datum!
}
```

**Výsledek:**
- `predmet: "DEV: Test 02"` → zůstane beze změny ✅
- `vypoctene_dph: "8 157,02 Kč"` → není formátováno jako datum ✅

#### Debug cleanup
**Odstraněno:**
- `Orders25List.js` - velký debug blok s filtry (řádky 6062-6169)
- `newDocxGenerator.js` - console.warn pro missing fields

---

### 🔧 Backend změny

#### API Permissions
**Soubory:** handlers.php, ciselnikyHandlers.php, searchHandlers.php

**Změny:**
```php
// Dodavatelé - visibility filtering
$sql .= " AND (
  d.visibility = 'global' 
  OR d.visibility = 'personal' AND d.created_by = :user_id
  OR d.visibility = 'usek' AND d.usek_kod = :usek_kod
)";

// Universal search - neaktivní filtering
WHERE u.aktivni = 1 AND u.viditelny_v_tel_seznamu = 1
WHERE d.aktivni = 1
```

#### DOCX Generování - České formátování
**Soubor:** `docxOrderDataHandlers.php`

```php
// PŘED (problém):
function format_cz_currency($value) {
    return number_format((float)$value, 2, '.', ' ') . ' Kč';
    // 8157.02 → Word interpretuje jako datum 01.02.8157
}

// PO (řešení):
function format_cz_currency($value) {
    return number_format((float)$value, 2, ',', ' ') . ' Kč';
    // 8 157,02 → Word korektně zobrazí jako text/číslo
}
```

**RAW formáty čísel:**
```php
// Přidány mezery jako tisícové oddělovače
'celkova_cena_bez_dph' => number_format($x, 2, ',', ' '),  // 38 842,98
'vypoctene_dph' => number_format($x, 2, ',', ' '),         // 8 157,02
```

**Výsledné formáty:**
- Bez Kč: `38 842,98`
- S Kč: `38 842,98 Kč`
- Velké částky: `1 234 567,89 Kč`

#### Hierarchy System - Enhanced error handling
**Soubor:** `orderV2Endpoints.php`

```php
// Přidán try-catch a fallback
try {
    $result = apply_hierarchy_filtering($orders, $user_id, $config, $db);
} catch (Exception $e) {
    error_log("Hierarchy filter failed: " . $e->getMessage());
    $result = apply_role_based_filtering($orders, $user_id);  // FALLBACK
}
```

**Výhody:**
- ✅ Aplikace nepřestane fungovat při chybě hierarchie
- ✅ Graceful degradation na role-based filtering
- ✅ Comprehensive error logging
- ✅ User nevidí internal errors

#### Cashbook - LP kód validace
**Soubor:** `cashbookHandlers.php`

```php
// Podmíněná validace podle nastavení pokladny
if ($cashbox['lp_kod_povinny'] == 1 && empty($lp_kod)) {
    api_error(400, 'LP kód je povinný pro tuto pokladnu');
}
```

**Nové endpointy:**
- `POST /cashbox-lp-requirement-update` - Změna povinnosti LP kódu
- `POST /cashbox-lp-requirement-get` - Získání nastavení LP kódu

---

### 📝 Dokumentace

**Aktualizované soubory:**
- `DEPLOYMENT_GUIDE_SUPPLIERS_PERMISSIONS_v2.00.md` - Hlavní deployment guide
- `DOCX-VYPOCITANE-PROMENNE-DOKUMENTACE.md` - České formáty
- `DOCX-VYPOCITANE-POLOZKY.md` - České formáty
- `BACKEND-TODO-VYPOCITANE-PROMENNE.md` - České formáty
- `BUILD.md` - Build proces (bez změn)

**Nové soubory:**
- `CHANGELOG_v2.00_PRODUCTION_DEPLOYMENT.md` - Tento soubor

---

## 🔄 Migrace dat

### Automatické migrace (SQL)
```sql
-- 1. Přidání visible_in_phonebook (výchozí 1)
ALTER TABLE 25_uzivatele ADD COLUMN visible_in_phonebook TINYINT(1) NOT NULL DEFAULT 1;

-- 2. Přidání lp_kod_povinny (výchozí 0)
ALTER TABLE 25a_pokladny ADD COLUMN lp_kod_povinny TINYINT(1) DEFAULT 0;

-- 3. Vytvoření nových permissions
INSERT INTO 25_prava (nazev_prava, popis) VALUES 
  ('SUPPLIER_CREATE', 'Vytváření dodavatelů'),
  ('SUPPLIER_DELETE', 'Mazání dodavatelů'),
  ('PHONEBOOK_MANAGE', 'Správa telefonního seznamu');

-- 4. Přejmenování SUPPLIER_READ → SUPPLIER_VIEW
UPDATE 25_prava SET nazev_prava = 'SUPPLIER_VIEW' WHERE nazev_prava = 'SUPPLIER_READ';

-- 5. Smazání deprecated permissions
DELETE FROM 25_role_prava WHERE pravo_id IN (
  SELECT id FROM 25_prava WHERE nazev_prava IN ('CONTACT_MANAGE', 'CONTACT_READ', 'CONTACT_EDIT')
);
DELETE FROM 25_prava WHERE nazev_prava IN ('CONTACT_MANAGE', 'CONTACT_READ', 'CONTACT_EDIT');
```

### Manuální úpravy (podle potřeby)
```sql
-- Skrýt systémové účty z telefonního seznamu
UPDATE 25_uzivatele 
SET visible_in_phonebook = 0 
WHERE username IN ('system', 'admin', 'robot', ...);

-- Nastavit LP kód jako povinný pro hlavní pokladny
UPDATE 25a_pokladny 
SET lp_kod_povinny = 1 
WHERE nazev IN ('Hlavní pokladna', 'Pokladna ředitelství');
```

---

## ⚠️ Breaking Changes

### 1. CONTACT_* Permissions odstraněny
**Impact:** Kód který používá `CONTACT_MANAGE`, `CONTACT_READ`, `CONTACT_EDIT` musí být aktualizován

**Migration guide:**
```javascript
// PŘED:
hasPermission('CONTACT_MANAGE')      // ❌
hasPermission('CONTACT_READ')        // ❌

// PO:
hasPermission('SUPPLIER_MANAGE')     // ✅ Pro správu dodavatelů
hasPermission('PHONEBOOK_MANAGE')    // ✅ Pro správu tel. seznamu
hasPermission('SUPPLIER_VIEW')       // ✅ Pro zobrazení dodavatelů
```

### 2. Visibility filtering v Universal Search
**Impact:** Neaktivní uživatelé a dodavatelé se už nezobrazují v search

**Před:**
```javascript
// Zobrazovalo i neaktivní záznamy
searchResults = allRecords;
```

**Po:**
```javascript
// Filtruje podle aktivnosti a viditelnosti
searchResults = allRecords.filter(r => 
  (r.type === 'user' && r.aktivni === 1 && r.viditelny_v_tel_seznamu === 1) ||
  (r.type === 'supplier' && r.aktivni === 1)
);
```

### 3. DOCX formátování - Backend odpovědnost
**Impact:** Frontend už neformátuje data z backendu

**Před:**
```javascript
// Frontend automaticky formátoval všechny hodnoty
value = formatDateForDocx(value);  // Způsobovalo problémy!
```

**Po:**
```javascript
// Frontend pouze předává data beze změny
mappedData[field] = String(value || '');  // Žádné transformace!
```

**Důsledek:** Backend musí vracet už správně naformátované hodnoty

---

## 📊 Statistiky změn

### Code Changes
- **Frontend soubory změněno:** 23 (+1 InvoiceEvidencePage.js)
- **Backend soubory změněno:** 16 (+1 spisovkaZpracovaniEndpoints.php)
- **Dokumentace změněno:** 5 (+1 tento CHANGELOG)
- **SQL migrace:** 8 příkazů (+1 SPISOVKA_MANAGE)
- **Permissions změněno:** 20 přiřazení

### Lines of Code
- **Přidáno:** ~850 řádků
- **Odstraněno:** ~320 řádků (včetně debug kódu)
- **Upraveno:** ~450 řádků

### Database Impact
- **Nové sloupce:** 2 (`visible_in_phonebook`, `lp_kod_povinny`)
- **Nové permissions:** 4 (`SUPPLIER_CREATE`, `SUPPLIER_DELETE`, `PHONEBOOK_MANAGE`, `SPISOVKA_MANAGE`)
- **Odstraňené permissions:** 3 (`CONTACT_*`)
- **Přejmenované permissions:** 1 (`SUPPLIER_READ` → `SUPPLIER_VIEW`)

---

## 🧪 Testovací scénáře

### Test 1: Permissions refactoring
1. Přihlásit se jako běžný uživatel (bez SUPPLIER_MANAGE)
2. Zkontrolovat že "Administrace → Adresář" není viditelné v menu
3. Přihlásit se jako admin (s SUPPLIER_MANAGE)
4. Ověřit přístup k "Administrace → Adresář"
5. Ověřit všechny záložky (Dodavatelé, Zaměstnanci, Banky)

### Test 2: Visibility filtering - Dodavatelé
1. Vytvořit dodavatele jako User A s visibility="personal"
2. Přihlásit se jako User B (jiný úsek)
3. Ověřit že User B nevidí tohoto dodavatele v seznamu
4. Změnit visibility na "global"
5. Ověřit že User B teď vidí dodavatele

### Test 3: Telefonní seznam - visible_in_phonebook
1. Vytvořit uživatele s `aktivni=1, visible_in_phonebook=0`
2. Ověřit že user se může přihlásit
3. Otevřít menu "Kontakty"
4. Ověřit že user **není** v telefonním seznamu
5. Nastavit `visible_in_phonebook=1`
6. Ověřit že user **je** v telefonním seznamu

### Test 4: Universal Search - Neaktivní filtering
1. Vytvořit dodavatele s `aktivni=0`
2. Vytvořit uživatele s `aktivni=0`
3. Vyhledat v universal search
4. Ověřit že neaktivní záznamy **nejsou** ve výsledcích
5. Aktivovat záznamy (`aktivni=1`)
6. Ověřit že záznamy **jsou** ve výsledcích

### Test 5: Cashbook - LP kód povinnost
1. Vytvořit pokladnu s `lp_kod_povinny=0`
2. Vytvořit výdaj **bez** LP kódu
3. Ověřit že výdaj lze uložit ✅
4. Změnit nastavení na `lp_kod_povinny=1`
5. Zkusit vytvořit výdaj **bez** LP kódu
6. Ověřit že se zobrazí chyba ❌

### Test 6: DOCX generování - České formátování
1. Vytvořit objednávku s částkou `47 000 Kč`
2. Vygenerovat DOCX
3. Otevřít v MS Word
4. Ověřit formátování:
   - `38 842,98 Kč` (cena bez DPH) ✅
   - `8 157,02 Kč` (DPH) ✅ **NE jako datum!**
   - `47 000,00 Kč` (cena s DPH) ✅
5. Ověřit předmět: `"DEV: Test 02"` zůstane beze změny ✅

### Test 7: Hierarchy fallback
1. Simulovat chybu v hierarchii (např. chybějící tabulka)
2. Načíst seznam objednávek
3. Ověřit že aplikace funguje (použije role-based filtering)
4. Zkontrolovat error log pro "Hierarchy filter failed"
5. Opravit problém
6. Ověřit že hierarchie znovu funguje normálně

### Test 8: Spisovka Inbox - Nové oprávnění SPISOVKA_MANAGE
1. Přihlásit se jako běžný uživatel (bez ADMIN, bez SPISOVKA_MANAGE)
2. Otevřít Evidence faktur
3. Ověřit že tlačítko "Spisovka InBox" není viditelné ❌
4. Přiřadit uživateli oprávnění SPISOVKA_MANAGE:
   ```sql
   INSERT INTO 25_uzivatel_prava (uzivatel_id, pravo_id)
   SELECT [USER_ID], id FROM 25_prava WHERE kod_prava = 'SPISOVKA_MANAGE';
   ```
5. Refresh stránky (F5)
6. Ověřit že tlačítko "Spisovka InBox" je nyní viditelné ✅
7. Kliknout na tlačítko a ověřit že se otevře panel
8. Ověřit že uživatel vidí faktury ze spisovny
9. Vyzkoušet drag & drop faktury do formuláře
10. Odebrat oprávnění a ověřit že panel zmizí

### Test 9: Spisovka Backend API - Permission check
1. Zkusit volat API bez oprávnění:
   ```bash
   curl -X POST /api.eeo/spisovka-zpracovani/list \
     -d "token=[TOKEN]&username=[USER_WITHOUT_PERM]"
   ```
2. Očekávaná odpověď: HTTP 403 + "Nedostatečná oprávnění" ❌
3. Přiřadit SPISOVKA_MANAGE
4. Zkusit volat API znovu
5. Očekávaná odpověď: HTTP 200 + data ✅

---

## 🚨 Rollback plán

### V případě kritických problémů:

#### 1. Databáze rollback
```bash
# Obnovit z full backupu
mysql -h [PROD_HOST] -u [PROD_USER] -p eeo2025 < backup_PROD_pre_v2.00_YYYYMMDD_HHMMSS.sql
```

#### 2. Soubory rollback
```bash
# Obnovit předchozí verzi
cd /var/www/erdms-platform
rm -rf apps/eeo-v2
tar -xzf /var/backups/erdms/erdms-platform_YYYYMMDD_HHMMSS.tar.gz apps/eeo-v2
```

#### 3. Částečný rollback (pouze permissions)
```sql
-- Obnovit CONTACT_* permissions
INSERT INTO 25_prava (nazev_prava, popis) VALUES 
  ('CONTACT_MANAGE', 'Správa kontaktů'),
  ('CONTACT_READ', 'Zobrazení kontaktů'),
  ('CONTACT_EDIT', 'Editace kontaktů');

-- Obnovit přiřazení
-- (použít backup_PROD_critical_tables_*.sql)
```

---

## 📞 Kontakty pro support

**Deployment team:**
- Developer: [jméno]
- DB Admin: [jméno]
- Testing: [jméno]

**V případě problémů:**
1. Zastavit deployment
2. Dokumentovat problém
3. Kontaktovat deployment lead
4. Rozhodnout o rollbacku nebo fix forward

---

## ✅ Post-deployment checklist

Po úspěšném deploymentu:

- [ ] Ověřit že aplikace funguje v PROD
- [ ] Test všech klíčových funkcí (viz Testovací scénáře)
- [ ] Zkontrolovat error logy (5-10 minut po deploymentu)
- [ ] Ověřit že performance je OK
- [ ] Deaktivovat maintenance mode
- [ ] Informovat uživatele o nové verzi
- [ ] Archivovat skripty a backupy
- [ ] Aktualizovat dokumentaci
- [ ] Git tag pro produkční verzi: `git tag -a v2.00 -m "Production release v2.00"`

---

**Připravil:** GitHub Copilot + Robert Holovský  
**Datum:** 7. ledna 2026  
**Schválil:** _________________  
**Deployment provedl:** _________________  
**Datum deploymentu:** _________________
