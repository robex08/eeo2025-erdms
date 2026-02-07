# Analýza duplicitních oprávnění CASH_BOOKS_* vs CASH_BOOK_*

**Datum:** 2026-01-07  
**Status:** ✅ **ZÁVĚR: CASH_BOOKS_* JSOU ČÁSTEČNĚ POUŽITÁ, ALE CHYBNĚ IMPLEMENTOVANÁ**

---

## 🔍 Původ problému

### 1. Vznik CASH_BOOKS_* oprávnění

**Migrace:** `migration_dictionaries_granular_permissions_20260105.sql`  
**Datum přidání:** 2026-01-05  
**Účel:** Granulární CRUD práva pro číselník pokladních knih v admin rozhraní

```sql
-- Řádky 134-143 v migraci
INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
VALUES 
  ('CASH_BOOKS_VIEW', 'Zobrazení pokladních knih v číselníku (read-only)', 1),
  ('CASH_BOOKS_CREATE', 'Vytváření nových pokladních knih v číselníku', 1),
  ('CASH_BOOKS_EDIT', 'Editace pokladních knih v číselníku', 1),
  ('CASH_BOOKS_DELETE', 'Mazání pokladních knih z číselníku', 1);
```

**Poznámka v migraci:**
> POZNÁMKA: CASH_BOOK_MANAGE zůstává jako právo pro modul Pokladna
> (správce všech pokladen, zamykání, atd.)
> Tato práva jsou jen pro správu číselníku pokladních knih

---

## 🗂️ Dva typy oprávnění pro pokladnu

### CASH_BOOK_* (původní, funkční - IDs 35-47, 82)
**Účel:** Práce s **MODULY POKLADNY** (záznamy, položky, operace)
**Umístění:** Backend `CashbookPermissions.php`

| Kód práva | Popis | Použití |
|-----------|-------|---------|
| CASH_BOOK_MANAGE | Kompletní správa pokladen | Superpravo pro admin |
| CASH_BOOK_READ_ALL | Čtení všech pokladen | Viditelnost záznamů |
| CASH_BOOK_READ_OWN | Čtení vlastních pokladen | Omezený přístup |
| CASH_BOOK_CREATE | Vytváření položek v pokladně | Nové záznamy |
| CASH_BOOK_EDIT_ALL | Editace všech pokladen | Úpravy záznamů |
| CASH_BOOK_EDIT_OWN | Editace vlastních pokladen | Vlastní úpravy |
| CASH_BOOK_DELETE_ALL | Mazání všech položek | Smazání záznamů |
| CASH_BOOK_DELETE_OWN | Mazání vlastních položek | Vlastní smazání |

### CASH_BOOKS_* (nové, NEDOKONČENÉ - IDs 134-137)
**Účel:** Práce s **ČÍSELNÍKEM POKLADNÍCH KNIH** (admin rozhraní DictionariesNew)
**Umístění:** Frontend `DictionariesNew.js` (kontrola viditelnosti tabu)

| Kód práva | Popis | Použití |
|-----------|-------|---------|
| CASH_BOOKS_VIEW | Zobrazení knih v číselníku | Viditelnost tabu |
| CASH_BOOKS_CREATE | Vytváření nových knih | Nové definice |
| CASH_BOOKS_EDIT | Editace knih v číselníku | Úpravy definic |
| CASH_BOOKS_DELETE | Mazání knih z číselníku | Smazání definic |

---

## 📋 Kde se CASH_BOOKS_* používají?

### ✅ Frontend - DictionariesNew.js (řádek 196)

**Kontrola viditelnosti tabu:**
```javascript
const availableTabs = [
  { key: 'cashbook', prefix: 'CASH_BOOKS', name: 'Pokladní knihy' },
  // ...
];

const canViewTab = (prefix) => {
  if (hasAdminRole()) return true;
  return hasPermission(`${prefix}_VIEW`) ||
         hasPermission(`${prefix}_CREATE`) ||
         hasPermission(`${prefix}_EDIT`) ||
         hasPermission(`${prefix}_DELETE`);
};

// Řádek 312: Viditelnost tabu
{canViewTab('CASH_BOOKS') && (
  <Tab $active={activeTab === 'cashbook'} onClick={() => handleTabChange('cashbook')}>
    <FontAwesomeIcon icon={faCalculator} />
    Pokladní knihy
  </Tab>
)}

// Řádek 382: Zobrazení obsahu
{hasAnyTab && activeTab === 'cashbook' && canViewTab('CASH_BOOKS') && 
  <CashbookTab key={`cashbook-${refreshKey}`} />
}
```

---

## ⚠️ PROBLÉM: Nekonzistence implementace

### CashbookTab.js (řádek 853) - POUŽIJE JINÉ PRÁVO!

```javascript
const CashbookTab = () => {
  const { user, hasPermission } = useContext(AuthContext);
  
  // ❌ CHYBA: používá CASH_BOOK_MANAGE místo CASH_BOOKS_*
  const canManage = hasPermission('CASH_BOOK_MANAGE');
  
  // Logika by měla být:
  // const canView = hasPermission('CASH_BOOKS_VIEW');
  // const canCreate = hasPermission('CASH_BOOKS_CREATE');
  // const canEdit = hasPermission('CASH_BOOKS_EDIT');
  // const canDelete = hasPermission('CASH_BOOKS_DELETE');
}
```

**Důsledek:**
- Tab "Pokladní knihy" v číselníku je viditelný pro uživatele s `CASH_BOOKS_VIEW`
- Ale uvnitř tabu se kontroluje `CASH_BOOK_MANAGE` (jiné právo!)
- **Uživatel vidí tab, ale nemůže nic dělat (práva nesedí)**

---

## 📊 Stav přiřazení v DB

### CASH_BOOK_* (původní) - AKTIVNĚ POUŽÍVANÉ
```sql
SELECT COUNT(*) FROM 25_prava_role WHERE id_prava IN (35,36,37,38,39,40,41,42,43,44,45,46,47,82);
-- Výsledek: 15+ přiřazení rolím

SELECT COUNT(*) FROM 25_prava_uzivatel WHERE id_prava IN (35,36,37,38,39,40,41,42,43,44,45,46,47,82);
-- Výsledek: 5+ přiřazení uživatelům
```

### CASH_BOOKS_* (nové) - ŽÁDNÉ PŘIŘAZENÍ
```sql
SELECT COUNT(*) FROM 25_prava_role WHERE id_prava IN (134,135,136,137);
-- Výsledek: 0

SELECT COUNT(*) FROM 25_prava_uzivatel WHERE id_prava IN (134,135,136,137);
-- Výsledek: 0
```

---

## 🎯 Závěry a doporučení

### 1. ❌ **NELZE SMAZAT** CASH_BOOKS_* - používají se pro viditelnost tabu

Frontend **DictionariesNew.js** aktivně kontroluje:
```javascript
canViewTab('CASH_BOOKS')  // řádek 312, 382
```

### 2. 🔧 **NUTNÁ OPRAVA** CashbookTab.js

**CashbookTab** musí používat `CASH_BOOKS_*` práva, ne `CASH_BOOK_MANAGE`:

```javascript
// PŘED (chybné):
const canManage = hasPermission('CASH_BOOK_MANAGE');

// PO (správné):
const canView = hasPermission('CASH_BOOKS_VIEW');
const canCreate = hasPermission('CASH_BOOKS_CREATE');
const canEdit = hasPermission('CASH_BOOKS_EDIT');
const canDelete = hasPermission('CASH_BOOKS_DELETE');
```

### 3. 🎯 **Oddělení zodpovědnosti**

| Právo | Odpovědnost |
|-------|-------------|
| **CASH_BOOK_*** | Modul Pokladna (záznamy, položky, operace) - Backend CashbookPermissions.php |
| **CASH_BOOKS_*** | Číselník knih (admin rozhraní) - Frontend DictionariesNew.js + CashbookTab.js |

---

## 📝 Akční plán

### ✅ Fáze 1: Analýza (HOTOVO)
- [x] Zjistit původ CASH_BOOKS_* práv (migrace 2026-01-05)
- [x] Najít všechna použití v kódu
- [x] Potvrdit nekonzistenci v CashbookTab.js

### 🔄 Fáze 2: Oprava CashbookTab.js
- [ ] Upravit `CashbookTab.js` řádek 853 pro použití `CASH_BOOKS_*`
- [ ] Implementovat granulární kontrolu (VIEW, CREATE, EDIT, DELETE)
- [ ] Otestovat na DEV prostředí

### 🔄 Fáze 3: Přiřazení práv
- [ ] Přiřadit `CASH_BOOKS_VIEW` rolím s přístupem k číselníkům
- [ ] Přiřadit `CASH_BOOKS_*` admin rolím
- [ ] Otestovat viditelnost a funkčnost tabu

### 🔄 Fáze 4: Dokumentace
- [ ] Aktualizovat dokumentaci oprávnění
- [ ] Vytvořit changelog pro deploy
- [ ] Připravit produkční migraci přiřazení

---

## 🚨 VAROVÁNÍ

**NESMAZAT CASH_BOOKS_* PRÁVA!**

Ačkoliv mají 0 přiřazení v DB, aktivně se používají pro:
1. Viditelnost tabu "Pokladní knihy" v DictionariesNew.js
2. Budoucí implementaci granulární kontroly v CashbookTab.js

**Problém není v existenci práv, ale v nedokončené implementaci.**

---

## 📁 Dotčené soubory

1. **Frontend:**
   - `/apps/eeo-v2/client/src/pages/DictionariesNew.js` (řádek 196, 312, 382)
   - `/apps/eeo-v2/client/src/components/dictionaries/tabs/CashbookTab.js` (řádek 853)

2. **Backend:**
   - `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/middleware/CashbookPermissions.php` (CASH_BOOK_*)

3. **Database:**
   - `migration_dictionaries_granular_permissions_20260105.sql` (CASH_BOOKS_*)
   - Tabulka `25_prava` (IDs 134-137)

---

## 🔗 Související dokumentace

- `CHANGELOG_CASHBOOK_DELETE_ENTRY_FIX.md` - Oprava 500 erroru na delete endpoint
- `migration_dictionaries_granular_permissions_20260105.sql` - Původní migrace CASH_BOOKS_*
- `CashbookPermissions.php` - Backend middleware pro CASH_BOOK_* práva

---

**Vytvořil:** GitHub Copilot  
**Datum:** 2026-01-07 10:15  
**Typ:** Technická analýza
