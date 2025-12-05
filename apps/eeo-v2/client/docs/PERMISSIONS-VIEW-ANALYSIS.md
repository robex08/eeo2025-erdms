# 🔐 ANALÝZA OPRÁVNĚNÍ - Doplnění VIEW práv

**Datum:** 27. listopadu 2025  
**Účel:** Doplnit VIEW práva pro sekce, které mají pouze MANAGE

---

## 📊 SOUČASNÝ STAV OPRÁVNĚNÍ

### ✅ Dobře pokryté sekce (mají VIEW + MANAGE)

#### 1. OBJEDNÁVKY (ORDER_*)
```
✅ ORDER_READ_ALL          - Čtení všech objednávek
✅ ORDER_READ_OWN          - Čtení vlastních objednávek
✅ ORDER_VIEW_ALL          - Zobrazení všech objednávek
✅ ORDER_VIEW_OWN          - Zobrazení vlastních objednávek
✅ ORDER_MANAGE            - Správa objednávek
✅ ORDER_2025              - Přístup k novému systému
✅ ORDER_OLD               - Přístup ke starému systému
```

#### 2. POKLADNÍ KNIHA (CASH_BOOK_*)
```
✅ CASH_BOOK_READ_ALL      - Čtení všech knih
✅ CASH_BOOK_READ_OWN      - Čtení vlastních knih
✅ CASH_BOOK_MANAGE        - Správa pokladních knih
```

---

## ⚠️ SEKCE VYŽADUJÍCÍ DOPLNĚNÍ VIEW PRÁV

### 1. UŽIVATELÉ (USER_*)
**Současný stav:**
```
✅ USER_MANAGE             - Správa uživatelů (vše)
❌ USER_VIEW               - CHYBÍ - Zobrazení uživatelů (read-only)
```

**Použití v kódu:**
- `src/App.js`: `hasPermission('USER_MANAGE')` - Route k /users
- `src/components/Layout.js`: `hasPermission('USER_MANAGE')` - Menu položka
- `src/utils/availableSections.js`: `hasPermission('USER_MANAGE')` - Dostupné sekce

**Dopad:**
- Uživatelé bez USER_MANAGE nevidí sekci Uživatelé vůbec
- Není možnost povolit pouze zobrazení bez editace

---

### 2. KONTAKTY/ADRESÁŘ (CONTACT_*)
**Současný stav:**
```
✅ CONTACT_MANAGE          - Správa kontaktů (vše)
✅ CONTACT_EDIT            - Editace kontaktů
✅ CONTACT_READ            - Čtení kontaktů
```

**Poznámka:** ✅ Tato sekce JE dobře pokryta! Má READ, EDIT i MANAGE.

**Použití v kódu:**
- `src/pages/AddressBookPage.js`:
  ```javascript
  const hasContactManage = hasPermission('CONTACT_MANAGE');
  const hasContactEdit = hasContactManage || hasPermission('CONTACT_EDIT');
  const hasContactRead = hasContactManage || hasPermission('CONTACT_READ');
  ```

---

### 3. ČÍSELNÍKY (SETTINGS_*)
**Současný stav:**
```
✅ SETTINGS_MANAGE         - Správa číselníků (vše)
❌ SETTINGS_VIEW           - CHYBÍ - Zobrazení číselníků (read-only)
```

**Použití v kódu:**
- `src/App.js`: `hasPermission('SETTINGS_MANAGE')` - Route k /dictionaries
- `src/components/Layout.js`: (není v menu, je ve spodním menu)
- `src/utils/availableSections.js`: `hasPermission('SETTINGS_MANAGE')` - Dostupné sekce

**Dopad:**
- Uživatelé bez SETTINGS_MANAGE nemohou vidět číselníky
- Není možnost povolit pouze zobrazení pro kontrolu/inspiraci

---

### 4. REPORTY A STATISTIKY (nové)
**Návrh z předchozího dokumentu:**
```
🆕 REPORT_VIEW             - Zobrazení reportů
🆕 REPORT_EXPORT           - Export reportů
🆕 REPORT_MANAGE           - Správa reportů (vytváření vlastních)

🆕 STATISTICS_VIEW         - Zobrazení statistik
🆕 STATISTICS_EXPORT       - Export statistik
🆕 STATISTICS_MANAGE       - Správa statistik (dashboardy)
```

---

## 🎯 DOPORUČENÁ NOVÁ PRÁVA

### Pro databázi `25_prav`:

```sql
-- =============================================================================
-- DOPLNĚNÍ VIEW PRÁV PRO EXISTUJÍCÍ SEKCE
-- =============================================================================

-- 1. UŽIVATELÉ - Zobrazení uživatelů bez možnosti editace
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('USER_VIEW', 'Zobrazení seznamu uživatelů (read-only)', 1);

-- 2. ČÍSELNÍKY - Zobrazení číselníků bez možnosti editace
-- Poznámka: V DB existuje DICT_MANAGE (ID 26), proto přidáváme DICT_VIEW
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('DICT_VIEW', 'Zobrazení číselníků (read-only)', 1);

-- 3. POKLADNÍ KNIHA - Zobrazení (doplnění pro konzistenci)
-- Poznámka: CASH_BOOK_READ_ALL a CASH_BOOK_READ_OWN již existují
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('CASH_BOOK_VIEW', 'Zobrazení pokladní knihy (obecné právo)', 1);

-- =============================================================================
-- NOVÁ PRÁVA PRO REPORTY
-- =============================================================================

-- 4. REPORTY - Základní zobrazení
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('REPORT_VIEW', 'Zobrazení reportů', 1);

-- 5. REPORTY - Export dat
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('REPORT_EXPORT', 'Export dat z reportů (CSV/PDF/Excel)', 1);

-- 6. REPORTY - Správa (vytváření vlastních reportů)
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('REPORT_MANAGE', 'Správa reportů a vytváření vlastních šablon', 1);

-- =============================================================================
-- NOVÁ PRÁVA PRO STATISTIKY
-- =============================================================================

-- 7. STATISTIKY - Základní zobrazení
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('STATISTICS_VIEW', 'Zobrazení statistik a dashboardů', 1);

-- 8. STATISTIKY - Export dat
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('STATISTICS_EXPORT', 'Export statistických dat a grafů', 1);

-- 9. STATISTIKY - Správa (vytváření vlastních dashboardů)
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('STATISTICS_MANAGE', 'Správa statistik a vytváření dashboardů', 1);

-- =============================================================================
-- PRÁVA PRO KONFIGURACI APLIKACE (SUPERADMIN)
-- =============================================================================

-- 10. NASTAVENÍ APLIKACE - Zobrazení globální konfigurace
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('SETTINGS_VIEW', 'Zobrazení globální konfigurace aplikace (systémové nastavení)', 1);

-- 11. NASTAVENÍ APLIKACE - Správa globální konfigurace (pouze SUPERADMIN)
-- Poznámka: ID 15 SETTINGS_MANAGE již existuje, ale s nesprávným popisem - tento UPDATE ho opraví
UPDATE 25_prava 
SET popis = 'Správa globální konfigurace aplikace (parametry systému, integrace, bezpečnost)' 
WHERE kod_prava = 'SETTINGS_MANAGE';
```

---

## 📋 KATEGORIE PRÁV

### Aktuální kategorie v systému:
```
ORDER       - Práva pro objednávky
USER        - Práva pro uživatele
CONTACT     - Práva pro kontakty/adresář
SETTINGS    - Práva pro nastavení a číselníky
CASH_BOOK   - Práva pro pokladní knihu
REPORT      - Práva pro reporty (NOVÉ)
STATISTICS  - Práva pro statistiky (NOVÉ)
ADMIN       - Administrátorská práva
SYSTEM      - Systémová práva
```

---

## 🔄 DOPORUČENÁ HIERARCHIE OPRÁVNĚNÍ

### Pattern pro každou sekci:
```
<SEKCE>_VIEW       → Základní zobrazení (read-only)
<SEKCE>_EXPORT     → Export dat
<SEKCE>_EDIT       → Editace (volitelné - ne všude potřeba)
<SEKCE>_MANAGE     → Kompletní správa (zahrnuje vše výše)
```

### Příklady:
```
USER_VIEW < USER_MANAGE
SETTINGS_VIEW < SETTINGS_MANAGE
REPORT_VIEW < REPORT_EXPORT < REPORT_MANAGE
STATISTICS_VIEW < STATISTICS_EXPORT < STATISTICS_MANAGE
```

---

## 🛠️ POTŘEBNÉ ÚPRAVY V KÓDU

### 1. App.js - Routes
```javascript
// PŘED (pouze MANAGE):
{isLoggedIn && hasPermission && hasPermission('USER_MANAGE') && 
  <Route path="/users" element={<Users />} />
}

// PO (VIEW nebo MANAGE):
{isLoggedIn && hasPermission && 
  (hasPermission('USER_VIEW') || hasPermission('USER_MANAGE')) && 
  <Route path="/users" element={<Users />} />
}

// PŘED (pouze MANAGE):
{isLoggedIn && hasPermission && hasPermission('SETTINGS_MANAGE') && 
  <Route path="/dictionaries" element={<DictionariesNew />} />
}

// PO (VIEW nebo MANAGE):
{isLoggedIn && hasPermission && 
  (hasPermission('SETTINGS_VIEW') || hasPermission('SETTINGS_MANAGE')) && 
  <Route path="/dictionaries" element={<DictionariesNew />} />
}
```

### 2. Layout.js - Menu
```javascript
// PŘED:
{ hasPermission && hasPermission('USER_MANAGE') && (
  <MenuLinkLeft to="/users" $active={isActive('/users')}>
    <FontAwesomeIcon icon={faUsers} /> Uživatelé
  </MenuLinkLeft>
) }

// PO:
{ hasPermission && (hasPermission('USER_VIEW') || hasPermission('USER_MANAGE')) && (
  <MenuLinkLeft to="/users" $active={isActive('/users')}>
    <FontAwesomeIcon icon={faUsers} /> Uživatelé
  </MenuLinkLeft>
) }
```

### 3. availableSections.js - Dostupné sekce
```javascript
// PŘED:
if (hasPermission && hasPermission('USER_MANAGE')) {
  sections.push({ value: 'users', label: 'Uživatelé' });
}

// PO:
if (hasPermission && (hasPermission('USER_VIEW') || hasPermission('USER_MANAGE'))) {
  sections.push({ value: 'users', label: 'Uživatelé' });
}

// PŘED:
if (hasPermission && hasPermission('SETTINGS_MANAGE')) {
  sections.push({ value: 'dictionaries', label: 'Číselníky' });
}

// PO:
if (hasPermission && (hasPermission('SETTINGS_VIEW') || hasPermission('SETTINGS_MANAGE'))) {
  sections.push({ value: 'dictionaries', label: 'Číselníky' });
}

// NOVÉ:
if (hasPermission && (hasPermission('REPORT_VIEW') || hasPermission('REPORT_MANAGE'))) {
  sections.push({ value: 'reports', label: 'Reporty' });
}

if (hasPermission && (hasPermission('STATISTICS_VIEW') || hasPermission('STATISTICS_MANAGE'))) {
  sections.push({ value: 'statistics', label: 'Statistiky' });
}
```

### 4. Users.js - Komponenta
```javascript
// Na začátku komponenty - kontrola oprávnění
const canManageUsers = hasPermission && hasPermission('USER_MANAGE');
const canViewUsers = hasPermission && (hasPermission('USER_VIEW') || hasPermission('USER_MANAGE'));

// Read-only mode pokud má pouze VIEW
const isReadOnly = canViewUsers && !canManageUsers;

// Zobrazení upozornění pro read-only režim
{isReadOnly && (
  <Alert type="info">
    Máte oprávnění pouze pro zobrazení uživatelů. Pro editaci kontaktujte správce.
  </Alert>
)}

// Podmíněné zobrazení tlačítek
{canManageUsers && (
  <Button onClick={handleAddUser}>Přidat uživatele</Button>
)}
```

### 5. DictionariesNew.js - Komponenta
```javascript
// Podobně jako u Users.js
const canManageSettings = hasPermission && hasPermission('SETTINGS_MANAGE');
const canViewSettings = hasPermission && (hasPermission('SETTINGS_VIEW') || hasPermission('SETTINGS_MANAGE'));

const isReadOnly = canViewSettings && !canManageSettings;

// Disable editační pole v read-only režimu
<input disabled={isReadOnly} ... />
```

---

## 📊 MATICE OPRÁVNĚNÍ

| Sekce | VIEW | EXPORT | EDIT | MANAGE | Poznámka |
|-------|------|--------|------|--------|----------|
| **Objednávky** | ✅ ORDER_VIEW_* | ✅ ORDER_EXPORT | ✅ ORDER_EDIT_* | ✅ ORDER_MANAGE | Kompletní |
| **Uživatelé** | 🆕 USER_VIEW | ❌ | ❌ | ✅ USER_MANAGE | Přidat VIEW |
| **Kontakty** | ✅ CONTACT_READ | ❌ | ✅ CONTACT_EDIT | ✅ CONTACT_MANAGE | Kompletní |
| **Číselníky** | 🆕 SETTINGS_VIEW | ❌ | ❌ | ✅ SETTINGS_MANAGE | Přidat VIEW |
| **Pokladna** | ✅ CASH_BOOK_READ_* | ✅ CASH_BOOK_EXPORT_* | ✅ CASH_BOOK_EDIT_* | ✅ CASH_BOOK_MANAGE | Kompletní |
| **Reporty** | 🆕 REPORT_VIEW | 🆕 REPORT_EXPORT | ❌ | 🆕 REPORT_MANAGE | Nová sekce |
| **Statistiky** | 🆕 STATISTICS_VIEW | 🆕 STATISTICS_EXPORT | ❌ | 🆕 STATISTICS_MANAGE | Nová sekce |

---

## ✅ SOUHRN NOVÝCH PRÁV

**Celkem 8 nových oprávnění:**

1. ✅ `USER_VIEW` - Zobrazení uživatelů (read-only)
2. ✅ `SETTINGS_VIEW` - Zobrazení číselníků (read-only)
3. ✅ `REPORT_VIEW` - Zobrazení reportů
4. ✅ `REPORT_EXPORT` - Export reportů
5. ✅ `REPORT_MANAGE` - Správa reportů
6. ✅ `STATISTICS_VIEW` - Zobrazení statistik
7. ✅ `STATISTICS_EXPORT` - Export statistik
8. ✅ `STATISTICS_MANAGE` - Správa statistik

---

## 🎯 PŘÍŠTÍ KROKY

1. ✅ **HOTOVO** - SQL inserty připraveny výše
2. ⏳ **Spustit SQL** - Vložit práva do databáze
3. ⏳ **Aktualizovat kód** - Upravit App.js, Layout.js, availableSections.js
4. ⏳ **Testovat** - Ověřit, že práva fungují správně
5. ⏳ **Přiřadit práva rolím** - Nastavit, které role mají která práva

---

**Status:** ✅ PŘIPRAVENO K IMPLEMENTACI  
**SQL inserty:** ✅ Připraveny výše  
**Dopad na kód:** 4 soubory k úpravě (App.js, Layout.js, availableSections.js, + komponenty)
