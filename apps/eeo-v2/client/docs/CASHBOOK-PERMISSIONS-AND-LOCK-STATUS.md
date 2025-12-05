# 🔐 CASHBOOK PERMISSIONS & LOCK STATUS - Kompletní dokumentace

**Datum:** 9. listopadu 2025  
**Branch:** LISTOPAD-25 / POKLADNA-SYNC  
**Status:** ✅ Připraveno k implementaci

---

## 📋 PŘEHLED

Systém oprávnění a zamykání pokladních knih umožňuje:

1. **Granulární oprávnění** - READ/EDIT/DELETE/EXPORT s variantami _OWN/_ALL
2. **Dva režimy uzamčení:**
   - **UZAVŘENO** (closed) - uživatel sám, může sám otevřít
   - **ZAMKNUTO** (locked) - admin s MANAGE, může otevřít jen MANAGE
3. **Vizuální indikace** stavu ve UI
4. **Audit log** všech změn

---

## 🎯 OPRÁVNĚNÍ (9 PERMISSIONS)

### **A) ZOBRAZENÍ (READ)**
| Kód | Popis | Úroveň |
|-----|-------|--------|
| `CASH_BOOK_READ_OWN` | Zobrazení vlastní pokladní knihy | Základní |
| `CASH_BOOK_READ_ALL` | Zobrazení všech pokladních knih | Admin |

### **B) EDITACE (EDIT)**
| Kód | Popis | Úroveň |
|-----|-------|--------|
| `CASH_BOOK_EDIT_OWN` | Editace vlastní pokladní knihy | Základní |
| `CASH_BOOK_EDIT_ALL` | Editace všech pokladních knih | Admin |

### **C) MAZÁNÍ (DELETE)**
| Kód | Popis | Úroveň |
|-----|-------|--------|
| `CASH_BOOK_DELETE_OWN` | Mazání z vlastní pokladní knihy | Základní |
| `CASH_BOOK_DELETE_ALL` | Mazání ze všech pokladních knih | Admin |

### **D) EXPORT**
| Kód | Popis | Úroveň |
|-----|-------|--------|
| `CASH_BOOK_EXPORT_OWN` | Export vlastní pokladní knihy | Základní |
| `CASH_BOOK_EXPORT_ALL` | Export všech pokladních knih | Admin |

### **E) KOMPLETNÍ SPRÁVA**
| Kód | Popis | Úroveň |
|-----|-------|--------|
| `CASH_BOOK_MANAGE` | Kompletní správa všech knih (včetně zamykání) | Super Admin |

**Poznámka:** `CASH_BOOK_MANAGE` automaticky zahrnuje všechna ostatní oprávnění.

---

## 🔒 STAVY UZAMČENÍ

### **1. OTEVŘENÁ (open)** 🔓
- **Výchozí stav**
- Lze editovat (pokud má oprávnění)
- Barva: **zelená**

### **2. UZAVŘENÁ (closed)** 🔒
- **Uzavřel uživatel sám**
- Může otevřít:
  - ✅ Vlastník knihy
  - ✅ Uživatel s `CASH_BOOK_MANAGE`
- Barva: **oranžová**

### **3. ZAMKNUTA (locked)** 🔐
- **Zamkl administrátor**
- Může otevřít:
  - ✅ Pouze uživatel s `CASH_BOOK_MANAGE`
- Barva: **červená**

---

## 📊 PRAVIDLA PŘECHODŮ STAVŮ

```
┌─────────────────────────────────────────────────────────┐
│                  STAVY UZAMČENÍ                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   🔓 OTEVŘENÁ                                          │
│         │                                               │
│         │ Vlastník: uzavřít                            │
│         │ MANAGE: uzavřít, zamknout                    │
│         ↓                                               │
│   🔒 UZAVŘENÁ ←──────────┐                            │
│         │                 │                             │
│         │ Vlastník: otevřít                            │
│         │ MANAGE: otevřít, zamknout                    │
│         │                 │                             │
│         ↓                 │                             │
│   🔐 ZAMKNUTA            │                             │
│         │                 │                             │
│         │ MANAGE: otevřít, uzavřít                     │
│         └─────────────────┘                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### **Tabulka přechodů:**

| Z → Do | Vlastník | MANAGE |
|--------|----------|--------|
| open → closed | ✅ | ✅ |
| open → locked | ❌ | ✅ |
| closed → open | ✅ | ✅ |
| closed → locked | ❌ | ✅ |
| locked → open | ❌ | ✅ |
| locked → closed | ❌ | ✅ |

---

## 💻 IMPLEMENTACE

### **A) FRONTEND KOMPONENTY**

#### **1. Utility pro oprávnění:**
📁 `src/utils/cashbookPermissions.js`

```javascript
import { getCashbookPermissionsObject } from '../utils/cashbookPermissions';

// V komponentě:
const permissions = getCashbookPermissionsObject(userDetail);

console.log(permissions);
// {
//   canReadOwn: true,
//   canReadAll: false,
//   canEditOwn: true,
//   canEditAll: false,
//   canDeleteOwn: true,
//   canDeleteAll: false,
//   canExportOwn: true,
//   canExportAll: false,
//   canManage: false
// }
```

#### **2. Kontrola editovatelnosti knihy:**
```javascript
import { canEditCashbook } from '../utils/cashbookPermissions';

const result = canEditCashbook(userDetail, cashbook);

if (result.canEdit) {
  // Povolit editaci
} else {
  alert(result.reason); // "Pokladní kniha je zamknuta..."
}
```

#### **3. Komponenta pro zobrazení stavu:**
📁 `src/components/cashbook/LockStatusBadge.jsx`

```javascript
import LockStatusBadge from '../components/cashbook/LockStatusBadge';

<LockStatusBadge
  cashbook={currentBook}
  userDetail={userDetail}
  onStatusChange={handleLockStatusChange}
  size="medium"
/>
```

#### **4. Handler pro změnu stavu:**
```javascript
const handleLockStatusChange = async (bookId, newStatus) => {
  try {
    const result = await cashbookAPI.changeLockStatus(bookId, newStatus);
    showToast('Stav knihy byl změněn', 'success');
    // Aktualizovat data
    fetchBooks();
  } catch (error) {
    showToast(error.message, 'error');
  }
};
```

#### **5. Rozšířený CashboxSelector:**
📁 `src/components/CashboxSelector.jsx`

```javascript
import CashboxSelector from '../components/CashboxSelector';
import { getCashbookPermissionsObject } from '../utils/cashbookPermissions';

const permissions = getCashbookPermissionsObject(userDetail);

<CashboxSelector
  currentCashbox={currentAssignment}
  userCashboxes={assignments}
  allCashboxes={allCashboxes}
  permissions={permissions}
  onCashboxChange={handleCashboxChange}
/>
```

---

### **B) BACKEND IMPLEMENTACE**

#### **1. SQL migrace:**
📁 `add_lock_status_to_cashbooks.sql`

**Spustit v databázi:**
```bash
mysql -u username -p zzs_eeo < add_lock_status_to_cashbooks.sql
```

**Co přidává:**
- Sloupec `stav_uzamceni` (ENUM: open, closed, locked)
- Sloupec `zamknuto_uzivatel_id` (kdo zamkl)
- Sloupec `zamknuto_datum` (kdy zamkl)
- Foreign key na tabulku `zamestnanci`
- Trigger pro automatické nastavení data
- Index pro rychlé vyhledávání

#### **2. API endpoint:**
📁 `/api.eeo/cashbook-change-lock-status.php`

**Request:**
```json
{
  "username": "jan.novak@zachranka.cz",
  "token": "abc123...",
  "book_id": 5,
  "new_status": "closed"
}
```

**Response - úspěch:**
```json
{
  "status": "success",
  "message": "Stav pokladní knihy byl změněn",
  "data": {
    "book_id": 5,
    "old_status": "open",
    "new_status": "closed",
    "changed_by_user_id": 52,
    "changed_by_user_name": "Novák Jan",
    "timestamp": "2025-11-09 15:30:25"
  }
}
```

**Response - chyba:**
```json
{
  "status": "error",
  "message": "Zamknout knihu může jen správce s oprávněním CASH_BOOK_MANAGE"
}
```

#### **3. Rozšíření existujících endpointů:**

**Všechny endpointy vracející knihy musí vrátit:**
```json
{
  "id": 5,
  "stav_uzamceni": "closed",
  "zamknuto_uzivatel_id": 52,
  "zamknuto_datum": "2025-11-09 14:20:00"
}
```

**SQL příklad:**
```sql
SELECT 
  pk.id,
  pk.stav_uzamceni,
  pk.zamknuto_uzivatel_id,
  pk.zamknuto_datum,
  CONCAT(u.prijmeni, ' ', u.jmeno) AS zamkl_uzivatel_jmeno
FROM 25a_pokladni_knihy pk
LEFT JOIN zamestnanci u ON pk.zamknuto_uzivatel_id = u.id
```

---

## 🎨 UI/UX PŘÍKLADY

### **1. Zobrazení stavu v seznamu knih:**

```
┌──────────────────────────────────────────────────────┐
│  Pokladní kniha - Listopad 2025                      │
├──────────────────────────────────────────────────────┤
│  🔓 Otevřená     [⋮]  ← kliknutelné menu            │
│  💰 Stav: 12,450.50 Kč                              │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Pokladní kniha - Říjen 2025                         │
├──────────────────────────────────────────────────────┤
│  🔒 Uzavřená     [⋮]  ← může otevřít                │
│  📅 Uzavřeno: 1.11.2025 | Jan Novák                 │
│  💰 Stav: 8,230.00 Kč                               │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Pokladní kniha - Září 2025                          │
├──────────────────────────────────────────────────────┤
│  🔐 Zamknuta     [⋮]  ← jen pro MANAGE              │
│  📅 Zamknuto: 1.10.2025 | Admin                     │
│  💰 Stav: 15,670.30 Kč                              │
└──────────────────────────────────────────────────────┘
```

### **2. Menu pro změnu stavu (vlastník):**

```
┌───────────────────────┐
│ 🔓 Otevřít            │  ← pokud je CLOSED
│ 🔒 Uzavřít            │  ← pokud je OPEN
└───────────────────────┘
```

### **3. Menu pro změnu stavu (MANAGE):**

```
┌───────────────────────┐
│ 🔓 Otevřít            │
│ 🔒 Uzavřít            │
│ 🔐 Zamknout           │
└───────────────────────┘
```

### **4. Potvrzovací dialog:**

```
┌─────────────────────────────────────────────┐
│  Změna stavu pokladní knihy                 │
├─────────────────────────────────────────────┤
│                                             │
│  Opravdu chcete změnit stav na             │
│  🔒 Uzavřená?                              │
│                                             │
│  Uzavřena uživatelem - může otevřít        │
│  vlastník nebo správce                      │
│                                             │
│  [ Zrušit ]        [ ✓ Potvrdit ]         │
└─────────────────────────────────────────────┘
```

---

## 🧪 TESTOVACÍ SCÉNÁŘE

### **Test 1: Vlastník uzavírá svou knihu**
```javascript
// Uživatel: Jan Novák (ID: 52)
// Kniha: ID 5, vlastník: 52, stav: open

const result = await cashbookAPI.changeLockStatus(5, 'closed');
// Očekáváno: success
// Nový stav: closed, zamknuto_uzivatel_id: 52
```

### **Test 2: Vlastník otevírá svou uzavřenou knihu**
```javascript
// Uživatel: Jan Novák (ID: 52)
// Kniha: ID 5, vlastník: 52, stav: closed

const result = await cashbookAPI.changeLockStatus(5, 'open');
// Očekáváno: success
// Nový stav: open, zamknuto_uzivatel_id: null
```

### **Test 3: Uživatel se pokouší zamknout knihu (bez MANAGE)**
```javascript
// Uživatel: Jan Novák (bez MANAGE)
// Kniha: ID 5, stav: open

const result = await cashbookAPI.changeLockStatus(5, 'locked');
// Očekáváno: error
// Message: "Zamknout knihu může jen správce..."
```

### **Test 4: Admin zamyká knihu**
```javascript
// Uživatel: Admin (s MANAGE)
// Kniha: ID 5, stav: open

const result = await cashbookAPI.changeLockStatus(5, 'locked');
// Očekáváno: success
// Nový stav: locked, zamknuto_uzivatel_id: admin_id
```

### **Test 5: Uživatel se pokouší otevřít zamknutou knihu**
```javascript
// Uživatel: Jan Novák (vlastník, bez MANAGE)
// Kniha: ID 5, vlastník: 52, stav: locked

const result = await cashbookAPI.changeLockStatus(5, 'open');
// Očekáváno: error
// Message: "Odemknout zamknutou knihu může jen správce..."
```

### **Test 6: Uživatel se pokouší otevřít cizí uzavřenou knihu**
```javascript
// Uživatel: Petr Dvořák (ID: 45, bez MANAGE)
// Kniha: ID 5, vlastník: 52, stav: closed

const result = await cashbookAPI.changeLockStatus(5, 'open');
// Očekáváno: error
// Message: "Otevřít uzavřenou knihu může jen vlastník nebo správce"
```

---

## ✅ IMPLEMENTAČNÍ CHECKLIST

### **Frontend:**
- [x] `src/utils/cashbookPermissions.js` - vytvořeno
- [x] `src/components/cashbook/LockStatusBadge.jsx` - vytvořeno
- [x] `src/components/CashboxSelector.jsx` - rozšířeno o permissions
- [x] `src/services/cashbookService.js` - přidána metoda changeLockStatus
- [ ] Integrovat do CashBookPage.js:
  - [ ] Import permissions utility
  - [ ] Výpočet permissions objektu
  - [ ] Předat do CashboxSelector
  - [ ] Handler handleLockStatusChange
  - [ ] Zobrazit LockStatusBadge v seznamu knih
- [ ] Podmíněné zobrazení tlačítek (edit, delete) podle stavu uzamčení
- [ ] Testování všech scénářů v UI

### **Backend:**
- [ ] Spustit SQL: `add_lock_status_to_cashbooks.sql`
- [ ] Vytvořit endpoint: `/api.eeo/cashbook-change-lock-status.php`
- [ ] Rozšířit endpoint `/api.eeo/cashbook-list.php` o stav_uzamceni
- [ ] Rozšířit endpoint `/api.eeo/cashbook-detail.php` o stav_uzamceni
- [ ] Rozšířit endpoint `/api.eeo/cashbook-assignments-list.php` o permissions
- [ ] Kontrola oprávnění v `/api.eeo/cashbook-entry-create.php`
- [ ] Kontrola oprávnění v `/api.eeo/cashbook-entry-update.php`
- [ ] Kontrola oprávnění v `/api.eeo/cashbook-entry-delete.php`
- [ ] Audit log všech změn stavu
- [ ] Otestovat všech 6 test cases

### **Databáze:**
- [ ] Přidat oprávnění do tabulky `opravneni`:
  ```sql
  INSERT INTO opravneni (kod_opravneni, nazev, aktivni) VALUES
  ('CASH_BOOK_READ_OWN', 'Zobrazení vlastní pokladní knihy', 1),
  ('CASH_BOOK_READ_ALL', 'Zobrazení všech pokladních knih', 1),
  ('CASH_BOOK_EDIT_OWN', 'Editace vlastní pokladní knihy', 1),
  ('CASH_BOOK_EDIT_ALL', 'Editace všech pokladních knih', 1),
  ('CASH_BOOK_DELETE_OWN', 'Mazání z vlastní pokladní knihy', 1),
  ('CASH_BOOK_DELETE_ALL', 'Mazání ze všech pokladních knih', 1),
  ('CASH_BOOK_EXPORT_OWN', 'Export vlastní pokladní knihy', 1),
  ('CASH_BOOK_EXPORT_ALL', 'Export všech pokladních knih', 1),
  ('CASH_BOOK_MANAGE', 'Kompletní správa všech pokladních knih', 1);
  ```
- [ ] Přiřadit oprávnění rolím (role_opravneni)

---

## 📝 POZNÁMKY

1. **Zpětná kompatibilita:** Pokud `stav_uzamceni` je NULL → považuje se za 'open'
2. **Audit:** Každá změna stavu se loguje do `25a_pokladni_audit`
3. **Trigger:** Automaticky nastaví `zamknuto_datum` při změně na closed/locked
4. **MANAGE:** Má absolutní moc - může měnit jakýkoli stav jakékoli knihy
5. **UI feedback:** Vždy zobrazit reason proč akce selhala (user-friendly message)

---

## 🚀 DALŠÍ ROZŠÍŘENÍ (BUDOUCNOST)

- [ ] Email notifikace při zamknutí knihy vlastníkovi
- [ ] Historie změn stavů (kdo, kdy, proč)
- [ ] Bulk operace (zamknout všechny knihy starší než X měsíců)
- [ ] Automatické uzavření knihy po X dnech bez aktivity
- [ ] Oprávnění na úrovni konkrétní pokladny (ne jen globální _ALL)

---

**✅ Vše připraveno k implementaci!**
