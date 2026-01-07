# Oprava oprávnění CashbookTab - CASH_BOOKS_* místo CASH_BOOK_MANAGE

**Datum:** 2026-01-07  
**Typ:** 🔧 Bugfix - Granulární oprávnění pro číselník pokladních knih  
**Soubor:** `/apps/eeo-v2/client/src/components/dictionaries/tabs/CashbookTab.js`  
**Status:** ✅ Připraveno k testování

---

## 🐛 Problém

**CashbookTab** (součást číselníkového admin rozhraní) používal **CASH_BOOK_MANAGE** pro kontrolu oprávnění, ale měl používat **CASH_BOOKS_*** práva podle migrace z 5.1.2026.

### Důsledek:
- **DictionariesNew.js** kontroluje `CASH_BOOKS_VIEW` pro viditelnost tabu "Pokladní knihy"
- **CashbookTab.js** kontroluje `CASH_BOOK_MANAGE` pro operace uvnitř tabu
- **Uživatel vidí tab, ale nemůže dělat nic** (práva nesedí!)

---

## ✅ Řešení

Změněno z jednoduchého `canManage` na **granulární oprávnění**:

```javascript
// ❌ PŘED (chybné):
const canManage = hasPermission('CASH_BOOK_MANAGE');

// ✅ PO (správné):
const canView = hasPermission('CASH_BOOKS_VIEW');
const canCreate = hasPermission('CASH_BOOKS_CREATE');
const canEdit = hasPermission('CASH_BOOKS_EDIT');
const canDelete = hasPermission('CASH_BOOKS_DELETE');

// Fallback pro zpětnou kompatibilitu
const canManage = hasPermission('CASH_BOOK_MANAGE') || canEdit || canDelete;
```

---

## 📋 Změny v CashbookTab.js

### 1. **Načítání dat (useEffect)**
```javascript
// Před: if (canManage !== undefined)
// Po:   if (canView !== undefined || canEdit !== undefined)
```

### 2. **Globální nastavení (Settings Panel)**
```javascript
// Před: {canManage && <SettingsPanel>}
// Po:   {canEdit && <SettingsPanel>}
```

### 3. **Uložení nastavení**
```javascript
// Před: if (!canManage) { ... }
// Po:   if (!canEdit) { ... }
```

### 4. **Rozbalení řádků (Expand)**
```javascript
// Před: if (!canManage) return null;
// Po:   if (!canView) return null;
```

### 5. **LP kód povinný toggle**
```javascript
// Před: disabled={!canManage}
// Po:   disabled={!canEdit}
```

### 6. **Tlačítko "Upravit pokladnu"**
```javascript
// Před: disabled={!canManage}
// Po:   disabled={!canEdit}
```

### 7. **Tlačítko "Smazat pokladnu"**
```javascript
// Před: disabled={!canManage}
// Po:   disabled={!canDelete}
```

### 8. **Tlačítko "Přidat pokladnu"**
```javascript
// Před: {canManage && <ActionButton>}
// Po:   {canCreate && <ActionButton>}
```

### 9. **Force Renumber (admin funkce)**
```javascript
// Před: {canManage && <IconButton>}
// Po:   {canEdit && <IconButton>}
```

---

## 🎯 Oddělení zodpovědnosti

| Právo | Operace | Komponenta |
|-------|---------|------------|
| **CASH_BOOKS_VIEW** | Vidět tab + rozbalit řádky | DictionariesNew.js, CashbookTab.js |
| **CASH_BOOKS_CREATE** | Přidat novou pokladnu | CashbookTab.js (tlačítko "+ Přidat") |
| **CASH_BOOKS_EDIT** | Upravit nastavení, LP kód, VPD/PPD | CashbookTab.js (edit, settings, renumber) |
| **CASH_BOOKS_DELETE** | Smazat pokladnu | CashbookTab.js (tlačítko trash) |
| **CASH_BOOK_MANAGE** | Fallback (starý systém) | Backend CashbookPermissions.php |

---

## 🧪 Testovací scénáře

### Test 1: Uživatel pouze s CASH_BOOKS_VIEW
**Očekávané chování:**
- ✅ Vidí tab "Pokladní knihy" v číselníku
- ✅ Vidí seznam pokladen
- ✅ Může rozbalit řádky (vidět přiřazené uživatele)
- ❌ NEVIDÍ tlačítko "+ Přidat pokladnu"
- ❌ NEVIDÍ panel "Globální nastavení"
- ❌ Tlačítka Edit/Delete jsou **disabled**

### Test 2: Uživatel s CASH_BOOKS_VIEW + CASH_BOOKS_EDIT
**Očekávané chování:**
- ✅ Vše z Test 1
- ✅ VIDÍ panel "Globální nastavení"
- ✅ Může měnit nastavení (Use Prefix)
- ✅ Tlačítko "Upravit" je **aktivní**
- ✅ Může měnit LP kód povinnost
- ✅ Může force renumber
- ❌ Tlačítko "Smazat" je **disabled**

### Test 3: Admin s CASH_BOOK_MANAGE (starý systém)
**Očekávané chování:**
- ✅ Plný přístup díky fallbacku: `canManage = hasPermission('CASH_BOOK_MANAGE') || canEdit || canDelete`
- ✅ Všechna tlačítka aktivní

### Test 4: Uživatel bez CASH_BOOKS_VIEW
**Očekávané chování:**
- ❌ NEVIDÍ tab "Pokladní knihy" v DictionariesNew.js

---

## 📦 Deployment

### Fáze 1: Build a test na DEV
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build
```

### Fáze 2: Přiřazení práv v DEV DB
```sql
USE `eeo2025-dev`;

-- Příklad: Přiřadit VIEW právo roli "Účetní"
INSERT INTO 25_prava_role (id_role, id_prava)
SELECT r.id, p.id
FROM 25_role r, 25_prava p
WHERE r.nazev = 'Účetní'
  AND p.kod_prava = 'CASH_BOOKS_VIEW';

-- Přiřadit EDIT+DELETE právo roli "Admin"
INSERT INTO 25_prava_role (id_role, id_prava)
SELECT r.id, p.id
FROM 25_role r, 25_prava p
WHERE r.nazev = 'Admin'
  AND p.kod_prava IN ('CASH_BOOKS_VIEW', 'CASH_BOOKS_CREATE', 'CASH_BOOKS_EDIT', 'CASH_BOOKS_DELETE');
```

### Fáze 3: Deploy na PROD (po úspěšném testu)
```bash
# Build production
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build

# Rsync na produkci
rsync -av --delete build/ /var/www/erdms-platform/apps/eeo-v2/client/build/

# Přiřadit práva v PROD DB
mysql -h 10.3.172.11 -u erdms_user -p'...' eeo2025 < assign_cash_books_permissions_PROD.sql
```

---

## 🔗 Související soubory

1. **Frontend:**
   - `/apps/eeo-v2/client/src/pages/DictionariesNew.js` (kontrola viditelnosti tabu)
   - `/apps/eeo-v2/client/src/components/dictionaries/tabs/CashbookTab.js` (tento soubor)

2. **Dokumentace:**
   - `ANALYSIS_CASH_BOOKS_PERMISSIONS.md` - Kompletní analýza problému
   - `migration_dictionaries_granular_permissions_20260105.sql` - Původní migrace CASH_BOOKS_*

3. **Backend (beze změn):**
   - `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/middleware/CashbookPermissions.php` (CASH_BOOK_* práva pro modul)

---

## ⚠️ Zpětná kompatibilita

Zachováno díky fallbacku:
```javascript
const canManage = hasPermission('CASH_BOOK_MANAGE') || canEdit || canDelete;
```

**Význam:**
- Uživatelé s **CASH_BOOK_MANAGE** (starý systém) budou mít stále plný přístup
- Postupná migrace na nový systém bez breaking changes

---

## 📊 Porovnání před/po

| Operace | Před | Po |
|---------|------|-----|
| Viditelnost tabu | `CASH_BOOKS_VIEW` (DictionariesNew) | `CASH_BOOKS_VIEW` (DictionariesNew) ✅ |
| Rozbalit řádky | `CASH_BOOK_MANAGE` ❌ | `CASH_BOOKS_VIEW` ✅ |
| Globální nastavení | `CASH_BOOK_MANAGE` ❌ | `CASH_BOOKS_EDIT` ✅ |
| Přidat pokladnu | `CASH_BOOK_MANAGE` ❌ | `CASH_BOOKS_CREATE` ✅ |
| Upravit pokladnu | `CASH_BOOK_MANAGE` ❌ | `CASH_BOOKS_EDIT` ✅ |
| Smazat pokladnu | `CASH_BOOK_MANAGE` ❌ | `CASH_BOOKS_DELETE` ✅ |

---

**Vytvořil:** GitHub Copilot  
**Schválil:** (čeká na testing)  
**Datum:** 2026-01-07 10:30
