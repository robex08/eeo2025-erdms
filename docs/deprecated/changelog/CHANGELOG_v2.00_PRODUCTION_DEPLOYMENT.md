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

### 6. 💼 Cashbook Permissions - Granulární práva pro číselník
**Problém:** CashbookTab používal CASH_BOOK_MANAGE místo CASH_BOOKS_* pro číselníkové operace  
**Řešení:** Implementace granulárních práv (VIEW/CREATE/EDIT/DELETE) pro správu definic pokladních knih

### 7. 🐛 Cashbook Tab - Oprava přiřazení uživatelů a admin přístupu
**Problém 1:** Tlačítko "Přiřadit uživatele" nedělalo nic (placeholder funkce)  
**Problém 2:** Admin vidí tab ale nemůže editovat (chybí hasAdminRole check)  
**Řešení:** Oprava handleAssignUser() + přidání admin fallbacku pro všechna oprávnění

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

#### Tabulka `25_prava` - Cashbook oprávnění již existují
**CASH_BOOK_*** (IDs 35-47, 82) - Modul pokladny (práce s položkami):
- `CASH_BOOK_MANAGE` (ID 39) - Superpravo - kompletní správa všech pokladních knih
- `CASH_BOOK_READ_OWN` (ID 40) - Zobrazení vlastní pokladní knihy
- `CASH_BOOK_READ_ALL` (ID 41) - Zobrazení všech pokladních knih
- `CASH_BOOK_CREATE` (ID 35) - Vytvoření nového záznamu ve vlastní pokladní knize
- `CASH_BOOK_EDIT_OWN` (ID 42) - Editace záznamů ve vlastní pokladní knize
- `CASH_BOOK_EDIT_ALL` (ID 43) - Editace záznamů ve všech pokladních knihách
- `CASH_BOOK_DELETE_OWN` (ID 44) - Smazání záznamů z vlastní pokladní knihy
- `CASH_BOOK_DELETE_ALL` (ID 45) - Smazání záznamů ze všech pokladních knih
- `CASH_BOOK_EXPORT_OWN` (ID 46) - Export vlastní pokladní knihy
- `CASH_BOOK_EXPORT_ALL` (ID 47) - Export všech pokladních knih

**CASH_BOOKS_*** (IDs 134-137) - Číselník knih (správa definic):
- `CASH_BOOKS_VIEW` (ID 134) - Zobrazení pokladních knih v číselníku
- `CASH_BOOKS_CREATE` (ID 135) - Vytváření nových pokladních knih v číselníku
- `CASH_BOOKS_EDIT` (ID 136) - Editace pokladních knih v číselníku
- `CASH_BOOKS_DELETE` (ID 137) - Mazání pokladních knih z číselníku

**⚠️ NUTNÉ přiřadit podle rolí - práva existují, ale nejsou přiřazená!**

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

#### Cashbook Tab - Granulární permissions
**Soubor:** `CashbookTab.js`

```javascript
// PŘED (chybné):
const canManage = hasPermission('CASH_BOOK_MANAGE');

// PO (správné):
const canView = hasPermission('CASH_BOOKS_VIEW');
const canCreate = hasPermission('CASH_BOOKS_CREATE');
const canEdit = hasPermission('CASH_BOOKS_EDIT');
const canDelete = hasPermission('CASH_BOOKS_DELETE');
const canManage = hasPermission('CASH_BOOK_MANAGE') || canEdit || canDelete; // Fallback
```

**Změny v komponentě:**
- Viditelnost settings panelu: `canManage` → `canEdit`
- Rozbalení řádků: `canManage` → `canView`
- Tlačítko přidat: `canManage` → `canCreate`
- Tlačítko upravit: `canManage` → `canEdit`
- Tlačítko smazat: `canManage` → `canDelete`
- LP kód toggle: `canManage` → `canEdit`

**DictionariesNew.js:**
- Tab viditelnost: `canViewTab('CASH_BOOKS')` (už bylo správně)
- Obsah tabu: `<CashbookTab />` s granulárními právy

#### Cashbook Tab - Oprava přiřazení uživatelů + admin přístup
**Soubor:** `CashbookTab.js`

**Problém 1: Nefunkční tlačítko "Přiřadit uživatele"**
```javascript
// PŘED (placeholder - nedělal nic!):
const handleAssignUser = useCallback((cashboxId) => {
  showToast('Funkce přiřazení uživatele - připravena pro implementaci', 'info');
}, [showToast]);

// PO (funkční - otevře EditCashboxDialog):
const handleAssignUser = useCallback((cashboxId) => {
  const cashbox = cashboxes.find(c => c.id === cashboxId);
  if (cashbox) {
    setSelectedAssignment(cashbox);
    setEditDialogOpen(true);
  } else {
    showToast('Pokladna nenalezena', 'error');
  }
}, [cashboxes, showToast]);
```

**Problém 2: Admin vidí tab ale nemůže editovat**
```javascript
// PŘED (admin nemá přístup):
const { user, hasPermission } = useContext(AuthContext);
const canView = hasPermission('CASH_BOOKS_VIEW');
const canEdit = hasPermission('CASH_BOOKS_EDIT');

// PO (admin má plný přístup):
const { user, hasPermission, hasAdminRole } = useContext(AuthContext);
const isAdmin = hasAdminRole();
const canView = isAdmin || hasPermission('CASH_BOOKS_VIEW');
const canCreate = isAdmin || hasPermission('CASH_BOOKS_CREATE');
const canEdit = isAdmin || hasPermission('CASH_BOOKS_EDIT');
const canDelete = isAdmin || hasPermission('CASH_BOOKS_DELETE');
const canManage = isAdmin || hasPermission('CASH_BOOK_MANAGE') || canEdit || canDelete;
```

**Výsledek:**
- ✅ Tlačítko "+ Přiřadit uživatele" nyní otevře EditCashboxDialog
- ✅ V dialogu lze vybrat uživatele z dropdownu a přiřadit jako hlavní/zástupce
- ✅ Admin má plný přístup ke všem operacím bez nutnosti specifických práv

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
- `migration_spisovka_manage_permission_v2.00.sql` - Migrace pro SPISOVKA_MANAGE oprávnění
- `ANALYSIS_CASH_BOOKS_PERMISSIONS.md` - Analýza CASH_BOOK_* vs CASH_BOOKS_*
- `CHANGELOG_CASHBOOK_TAB_PERMISSIONS_FIX.md` - Dokumentace opravy CashbookTab

---

## 🔄 Migrace dat

### Automatické migrace (SQL)
```sql
-- 1. Přidání visible_in_phonebook (výchozí 1)
ALTER TABLE 25_uzivatele ADD COLUMN visible_in_phonebook TINYINT(1) NOT NULL DEFAULT 1;

-- 2. Přidání lp_kod_povinny (výchozí 0)
ALTER TABLE 25a_pokladny ADD COLUMN lp_kod_povinny TINYINT(1) DEFAULT 0;

-- 3. Vytvoření nových permissions
INSERT INTO 25_prava (kod_prava, popis) VALUES 
  ('SUPPLIER_CREATE', 'Vytváření dodavatelů'),
  ('SUPPLIER_DELETE', 'Mazání dodavatelů'),
  ('PHONEBOOK_MANAGE', 'Správa telefonního seznamu');

-- 4. Vytvoření SPISOVKA_MANAGE permission
INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
SELECT 'SPISOVKA_MANAGE', 'Správa Spisovka InBox - přístup k evidenci faktur ze spisovny', 1
WHERE NOT EXISTS (
    SELECT 1 FROM `25_prava` WHERE `kod_prava` = 'SPISOVKA_MANAGE'
);

-- 5. Přiřazení SPISOVKA_MANAGE rolím EKONOM a UCETNI
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`)
SELECT r.id, p.id
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role IN ('EKONOM', 'UCETNI')
  AND p.kod_prava = 'SPISOVKA_MANAGE'
  AND NOT EXISTS (
      SELECT 1 FROM `25_role_prava` rp
      WHERE rp.role_id = r.id AND rp.pravo_id = p.id
  );

-- 6. Přejmenování SUPPLIER_READ → SUPPLIER_VIEW
UPDATE 25_prava SET kod_prava = 'SUPPLIER_VIEW' WHERE kod_prava = 'SUPPLIER_READ';

-- 7. Smazání deprecated permissions
DELETE FROM 25_role_prava WHERE pravo_id IN (
  SELECT id FROM 25_prava WHERE kod_prava IN ('CONTACT_MANAGE', 'CONTACT_READ', 'CONTACT_EDIT')
);
DELETE FROM 25_prava WHERE kod_prava IN ('CONTACT_MANAGE', 'CONTACT_READ', 'CONTACT_EDIT');
```

**📄 Migrační soubor:** `migration_spisovka_manage_permission_v2.00.sql`

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

-- Manuální přiřazení SPISOVKA_MANAGE jednotlivým uživatelům
-- (pokud potřebují přístup mimo své role)
INSERT INTO 25_uzivatel_prava (uzivatel_id, pravo_id)
SELECT [USER_ID], id FROM 25_prava WHERE kod_prava = 'SPISOVKA_MANAGE';
```

**🔍 Kontrola SPISOVKA_MANAGE přiřazení:**
```sql
-- Zobrazit všechny uživatele s přístupem ke Spisovka InBox
SELECT 
    u.jmeno, 
    u.prijmeni, 
    u.username,
    r.nazev_role,
    'přes roli' AS zdroj
FROM 25_uzivatel_role ur
JOIN 25_uzivatele u ON ur.uzivatel_id = u.id
JOIN 25_role r ON ur.role_id = r.id
JOIN 25_role_prava rp ON r.id = rp.role_id
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava = 'SPISOVKA_MANAGE'

UNION

SELECT 
    u.jmeno, 
    u.prijmeni, 
    u.username,
    NULL AS nazev_role,
    'přímo uživateli' AS zdroj
FROM 25_uzivatel_prava up
JOIN 25_uzivatele u ON up.uzivatel_id = u.id
JOIN 25_prava p ON up.pravo_id = p.id
WHERE p.kod_prava = 'SPISOVKA_MANAGE'
ORDER BY prijmeni, jmeno;
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

### Test 10: Cashbook Tab - Granulární permissions
1. Vytvořit testovacího uživatele s **pouze** `CASH_BOOKS_VIEW` (ID 134)
2. Přihlásit se a otevřít Číselníky → Pokladní knihy
3. Ověřit viditelnost:
   - ✅ Tab "Pokladní knihy" je viditelný
   - ✅ Seznam pokladen se zobrazuje
   - ✅ Řádky lze rozbalit (vidět přiřazené uživatele)
   - ❌ Panel "Globální nastavení" NENÍ viditelný
   - ❌ Tlačítko "+ Přidat pokladnu" NENÍ viditelné
   - ❌ Tlačítka Edit/Delete jsou **disabled**
4. Přidat oprávnění `CASH_BOOKS_EDIT` (ID 136):
   ```sql
   INSERT INTO 25_uzivatel_prava (uzivatel_id, pravo_id) VALUES ([USER_ID], 136);
   ```
5. Refresh stránky (F5)
6. Ověřit novou viditelnost:
   - ✅ Panel "Globální nastavení" je nyní viditelný
   - ✅ Tlačítko "Upravit" je **aktivní**
   - ✅ Může měnit LP kód povinnost
   - ❌ Tlačítko "Smazat" je stále **disabled**
7. Přidat oprávnění `CASH_BOOKS_CREATE` (ID 135):
   ```sql
   INSERT INTO 25_uzivatel_prava (uzivatel_id, pravo_id) VALUES ([USER_ID], 135);
   ```
8. Ověřit:
   - ✅ Tlačítko "+ Přidat pokladnu" je viditelné a aktivní
9. Přidat oprávnění `CASH_BOOKS_DELETE` (ID 137):
   ```sql
   INSERT INTO 25_uzivatel_prava (uzivatel_id, pravo_id) VALUES ([USER_ID], 137);
   ```
10. Ověřit:
    - ✅ Tlačítko "Smazat" je **aktivní**

### Test 11: Cashbook - Fallback na CASH_BOOK_MANAGE
1. Vytvořit uživatele s **pouze** `CASH_BOOK_MANAGE` (ID 39, starý systém)
2. Přihlásit se a otevřít Číselníky → Pokladní knihy
3. Ověřit že uživatel má **plný přístup** díky fallbacku:
   ```javascript
   canManage = hasPermission('CASH_BOOK_MANAGE') || canEdit || canDelete;
   ```
4. Všechna tlačítka musí být aktivní (zpětná kompatibilita) ✅

### Test 12: Přiřazení práv podle rolí
**Role Účetní:**
```sql
-- Ověřit přiřazení
SELECT r.nazev, p.kod_prava, p.popis
FROM 25_prava_role pr
JOIN 25_role r ON pr.id_role = r.id
JOIN 25_prava p ON pr.id_prava = p.id
WHERE r.nazev = 'Účetní' AND p.kod_prava LIKE 'CASH_%'
ORDER BY p.kod_prava;
```
Očekávaný výsledek:
- CASH_BOOK_MANAGE (superpravo)
- CASH_BOOKS_VIEW, CREATE, EDIT, DELETE

**Role THP pracovník:**
Očekávaný výsledek:
- CASH_BOOK_READ_OWN, CREATE, EDIT_OWN, DELETE_OWN
- ŽÁDNÉ CASH_BOOKS_* práva

### Test 13: Cashbook Tab - Přiřazení uživatelů + Admin přístup
**Test 13a: Ověření funkčnosti přiřazení uživatele**
1. Přihlásit se jako admin nebo uživatel s CASH_BOOKS_EDIT
2. Otevřít Číselníky → Pokladní knihy
3. Rozbalit řádek u pokladny (kliknout na šipku)
4. Kliknout na tlačítko "+ Přiřadit uživatele"
5. Ověřit že se otevře **EditCashboxDialog** ✅ (NE toast "připravena pro implementaci" ❌)
6. V pravé části dialogu vybrat uživatele z dropdownu
7. Zaškrtnout/odškrtnout "Zástupce" podle potřeby
8. Kliknout "Přidat uživatele"
9. Ověřit toast: "Uživatel byl úspěšně přiřazen" ✅
10. Zavřít dialog a obnovit stránku (F5)
11. Rozbalit řádek a ověřit že uživatel je přiřazen ✅

**Test 13b: Ověření admin přístupu**
1. Přihlásit se jako **admin BEZ** jakýchkoliv CASH_BOOKS_* práv
2. Otevřít Číselníky → Pokladní knihy
3. Ověřit viditelnost:
   - ✅ Tab "Pokladní knihy" je viditelný (díky hasAdminRole v DictionariesNew)
   - ✅ Panel "Globální nastavení" je viditelný
   - ✅ Tlačítko "+ Přidat pokladnu" je aktivní
   - ✅ Tlačítko "Upravit" je aktivní (NE disabled)
   - ✅ Tlačítko "Smazat" je aktivní (NE disabled)
   - ✅ LP kód toggle je aktivní
4. Zkusit upravit nastavení (Use Prefix) - musí fungovat ✅
5. Zkusit přidat uživatele do pokladny - musí fungovat ✅

**Test 13c: Non-admin bez práv**
1. Přihlásit se jako běžný uživatel BEZ CASH_BOOKS_* práv
2. Otevřít Číselníky
3. Ověřit že tab "Pokladní knihy" **NENÍ viditelný** ❌

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
INSERT INTO 25_prava (kod_prava, popis) VALUES 
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
- [ ] **KRITICKÉ: Spustit migraci `migration_spisovka_manage_permission_v2.00.sql`**
- [ ] **KRITICKÉ: Přiřadit CASH_BOOKS_* práva podle rolí** (viz níže)
- [ ] Ověřit přístup ke Spisovka InBox pro role EKONOM/UCETNI
- [ ] Zkontrolovat error logy (5-10 minut po deploymentu)
- [ ] Ověřit že performance je OK
- [ ] Deaktivovat maintenance mode
- [ ] Informovat uživatele o nové verzi
- [ ] Archivovat skripty a backupy
- [ ] Aktualizovat dokumentaci
- [ ] Git tag pro produkční verzi: `git tag -a v2.00 -m "Production release v2.00"`

---

## 📋 KROK 1: Spustit SPISOVKA_MANAGE migraci

```bash
# Připojit se na PROD databázi
mysql -h [PROD_HOST] -u [PROD_USER] -p eeo2025 < migration_spisovka_manage_permission_v2.00.sql
```

**Co migrace udělá:**
1. ✅ Vytvoří oprávnění `SPISOVKA_MANAGE`
2. ✅ Automaticky přiřadí rolím `EKONOM` a `UCETNI` (pokud existují)
3. ✅ Zobrazí kontrolní výpis přiřazení

**Očekávaný výstup:**
```
✅ Oprávnění SPISOVKA_MANAGE bylo vytvořeno
✅ SPISOVKA_MANAGE přiřazeno roli: EKONOM
✅ SPISOVKA_MANAGE přiřazeno roli: UCETNI
```

**Kontrola po migraci:**
```sql
-- Ověřit že oprávnění existuje
SELECT id, kod_prava, popis, aktivni 
FROM 25_prava 
WHERE kod_prava = 'SPISOVKA_MANAGE';

-- Ověřit přiřazení rolím
SELECT r.nazev_role, p.kod_prava
FROM 25_role_prava rp
JOIN 25_role r ON rp.role_id = r.id
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava = 'SPISOVKA_MANAGE';
```

---

## 📋 KROK 2: Přiřadit CASH_BOOKS_* práva podle rolí

**⚠️ Práva existují v DB (IDs 134-137), ale NEJSOU PŘIŘAZENÁ!**

### Doporučené přiřazení podle rolí:

#### Role: Účetní / Ekonom
```sql
USE eeo2025;

-- Přiřadit plný přístup k číselníku pokladních knih
INSERT IGNORE INTO 25_prava_role (id_role, id_prava)
SELECT r.id, p.id
FROM 25_role r
CROSS JOIN 25_prava p
WHERE r.nazev IN ('Účetní', 'Ekonom')
  AND p.kod_prava IN (
    'CASH_BOOK_MANAGE',         -- Superpravo pro modul pokladny
    'CASH_BOOKS_VIEW',          -- Vidět číselník
    'CASH_BOOKS_CREATE',        -- Přidat knihu
    'CASH_BOOKS_EDIT',          -- Upravit knihu
    'CASH_BOOKS_DELETE'         -- Smazat knihu
  );
```

#### Role: THP pracovník
```sql
USE eeo2025;

-- Přiřadit práva jen pro vlastní pokladnu
INSERT IGNORE INTO 25_prava_role (id_role, id_prava)
SELECT r.id, p.id
FROM 25_role r
CROSS JOIN 25_prava p
WHERE r.nazev = 'THP pracovník'
  AND p.kod_prava IN (
    'CASH_BOOK_READ_OWN',       -- Vidět jen svou pokladnu
    'CASH_BOOK_CREATE',         -- Vytvářet položky
    'CASH_BOOK_EDIT_OWN',       -- Editovat vlastní položky
    'CASH_BOOK_DELETE_OWN'      -- Mazat vlastní položky
  );
-- ŽÁDNÉ CASH_BOOKS_* práva = nemůže spravovat číselník
```

#### Role: Admin
```sql
USE eeo2025;

-- Admin by měl mít všechna práva
INSERT IGNORE INTO 25_prava_role (id_role, id_prava)
SELECT r.id, p.id
FROM 25_role r
CROSS JOIN 25_prava p
WHERE r.nazev = 'Admin'
  AND p.kod_prava LIKE 'CASH_%';
```

### Kontrola přiřazení:
```sql
-- Výpis všech CASH_* práv podle rolí
SELECT 
  r.nazev AS role,
  p.kod_prava,
  p.popis
FROM 25_prava_role pr
JOIN 25_role r ON pr.id_role = r.id
JOIN 25_prava p ON pr.id_prava = p.id
WHERE p.kod_prava LIKE 'CASH_%'
ORDER BY r.nazev, p.kod_prava;
```

---

**Připravil:** GitHub Copilot + Robert Holovský  
**Datum:** 7. ledna 2026  
**Schválil:** _________________  
**Deployment provedl:** _________________  
**Datum deploymentu:** _________________
