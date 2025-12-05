# 🔍 DEBUG: Admin nevidí CashboxSelector

## 📋 Problém
Admin uživatel nevidí možnost přepínat mezi pokladnami, ačkoliv by měl.

## ✅ Co bylo implementováno

### 1. **Komponenta CashboxSelector** ✅
- 📁 `src/components/CashboxSelector.jsx`
- Plně funkční komponenta pro přepínání pokladen
- Podporuje role a oprávnění

### 2. **Integrace v CashBookPage** ✅
- 📁 `src/pages/CashBookPage.js`
- Import komponenty: řádek 36
- Renderování: řádky 2364-2397
- Podmínka zobrazení: `canSeeAllCashboxes && !assignmentLoading`

### 3. **Oprávnění** ✅
- 📁 `src/utils/cashbookPermissions.js`
- `getCashbookPermissionsObject()` - vypočítá oprávnění
- `canSeeAllCashboxes` = má některé z:
  - `CASH_BOOK_READ_ALL`
  - `CASH_BOOK_EDIT_ALL`
  - `CASH_BOOK_DELETE_ALL`
  - `CASH_BOOK_MANAGE`

---

## 🔍 Možné příčiny problému

### 1. ❌ **Oprávnění nejsou přiřazena v DB**

**Kontrola v databázi:**

```sql
-- Zkontrolovat, zda admin má CASH_BOOK_MANAGE oprávnění
SELECT 
  r.kod_role,
  r.nazev_role,
  p.kod_prava,
  p.popis
FROM `25_role_prava` rp
JOIN `25_role` r ON rp.role_id = r.id
JOIN `25_prava` p ON rp.pravo_id = p.id
WHERE r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR')
  AND p.kod_prava LIKE 'CASH_BOOK_%'
ORDER BY r.kod_role, p.kod_prava;
```

**Očekávaný výstup pro admina:**
```
| kod_role      | nazev_role    | kod_prava         | popis                          |
|---------------|---------------|-------------------|--------------------------------|
| ADMINISTRATOR | Administrátor | CASH_BOOK_MANAGE  | Kompletní správa pokladní knihy|
```

**Řešení:** Spustit SQL skript:
```bash
# V MySQL klientovi nebo phpMyAdmin:
source setup_cashbook_permissions.sql;
```

📁 Soubor: `/setup_cashbook_permissions.sql`

---

### 2. ❌ **UserDetail nemá načtená oprávnění**

**Debug v konzoli prohlížeče:**

Po přihlášení jako admin a otevření CashBookPage byste měli vidět:

```javascript
🔐 CASHBOOK PERMISSIONS: {
  userDetail: {
    id: 1,
    roles: ['ADMINISTRATOR'],
    prava: ['CASH_BOOK_MANAGE', ...další práva...]
  },
  permissions: {
    canReadOwn: false,
    canReadAll: true,  ← MUSÍ být true
    canEditOwn: false,
    canEditAll: true,  ← MUSÍ být true
    canDeleteOwn: false,
    canDeleteAll: true, ← MUSÍ být true
    canExportOwn: false,
    canExportAll: true, ← MUSÍ být true
    canManage: true     ← MUSÍ být true
  }
}

👁️ canSeeAllCashboxes: true  ← MUSÍ být true
```

**Pokud je `canSeeAllCashboxes: false`**, problém je v oprávněních.

---

### 3. ❌ **allAssignments se nenačítají**

**Debug v konzoli:**

```javascript
🔍 loadAllAssignments CHECK: {
  hasUserId: true,
  canSeeAllCashboxes: true,  ← MUSÍ být true
  willLoad: true              ← MUSÍ být true
}

📊 CASHBOOK V3: Načítám všechny pokladny (user má _ALL oprávnění)...
✅ CASHBOOK V3: Načteno 5 pokladen: [...]  ← Měl by načíst pokladny
```

**Pokud vidíte:**
```javascript
⏭️ Přeskakuji načítání všech pokladen - nemá oprávnění nebo ID
```
→ Problém je v `canSeeAllCashboxes` nebo `userDetail.id`

---

### 4. ❌ **Backend API nefunguje**

**Test API endpointu:**

```bash
# Test v Postman nebo curl:
curl -X POST http://your-api/cashbox-assignments-all \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_AUTH_TOKEN",
    "user_id": 1
  }'
```

**Očekávaná odpověď:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "cislo_pokladny": 101,
      "nazev": "Pokladna 1",
      "ciselna_rada_vpd": "597",
      "ciselna_rada_ppd": "598",
      ...
    }
  ]
}
```

**Backend soubor:** 📁 `BACKEND-CASHBOX-ASSIGNMENTS-ALL-API.php`

---

## 🛠️ Kroky pro řešení

### Krok 1: Zkontrolovat databázi
```sql
-- Spustit v MySQL:
SELECT id, kod_role, nazev_role FROM `25_role`;

-- Zkontrolovat oprávnění adminů:
SELECT 
  r.kod_role,
  p.kod_prava
FROM `25_role_prava` rp
JOIN `25_role` r ON rp.role_id = r.id
JOIN `25_prava` p ON rp.pravo_id = p.id
WHERE r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR')
  AND p.kod_prava LIKE 'CASH_BOOK_%';
```

### Krok 2: Spustit setup skript (pokud chybí oprávnění)
```bash
# V MySQL:
source /path/to/setup_cashbook_permissions.sql;
```

### Krok 3: Restartovat aplikaci
```bash
# V terminálu:
Ctrl+C  # Zastavit npm start
npm start  # Spustit znovu
```

### Krok 4: Smazat cache prohlížeče
- F12 → Application/Úložiště → Clear storage
- Nebo Ctrl+Shift+Del → Smazat cookies a cache

### Krok 5: Přihlásit se znovu
- Odhlásit se z aplikace
- Přihlásit se znovu jako admin

### Krok 6: Zkontrolovat konzoli
- F12 → Console
- Hledat logy začínající: `🔐`, `👁️`, `🔍`, `🎯`

---

## 📊 Výstup z konzole (DEBUG)

Po načtení CashBookPage byste měli vidět:

```
🔐 CASHBOOK PERMISSIONS: {...}
👁️ canSeeAllCashboxes: true
🔍 loadAllAssignments CHECK: {...}
📊 CASHBOOK V3: Načítám všechny pokladny...
✅ CASHBOOK V3: Načteno X pokladen
🎯 CASHBOX SELECTOR RENDER CHECK: {
  canSeeAllCashboxes: true,
  assignmentLoading: false,
  shouldShow: true  ← MUSÍ být true
}
```

---

## 📞 Další kroky

Pokud výše uvedené kroky nepomohly:

1. **Pošlete screenshot konzole** (F12 → Console)
2. **Pošlete výsledek SQL dotazu** (kontrola oprávnění)
3. **Zkontrolujte backend log** (pokud API vrací chybu)

---

## 📚 Související soubory

- 📁 `src/pages/CashBookPage.js` - Hlavní stránka pokladny
- 📁 `src/components/CashboxSelector.jsx` - Komponenta pro přepínání
- 📁 `src/utils/cashbookPermissions.js` - Logika oprávnění
- 📁 `src/services/cashbookService.js` - API volání
- 📁 `setup_cashbook_permissions.sql` - SQL setup skript
- 📁 `CASHBOOK-PERMISSIONS-SETUP.md` - Návod na setup oprávnění

---

**Datum:** 9. listopadu 2025
