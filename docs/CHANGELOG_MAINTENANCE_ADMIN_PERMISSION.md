# 🔒 MAINTENANCE_ADMIN - Implementace

**Datum:** 2025-12-31  
**Databáze:** eeo2025-dev  
**Status:** ✅ Implementováno

---

## 📋 Přehled změn

### 🎯 Cíl
Umožnit přístup do systému během maintenance režimu nejen pro SUPERADMIN, ale i pro uživatele s právem `MAINTENANCE_ADMIN`.

### ✅ Co bylo implementováno

#### 1. **Nové právo v databázi**
- **Kód práva:** `MAINTENANCE_ADMIN`
- **Popis:** "Přístup do systému během maintenance režimu"
- **Přiřazeno rolím:**
  - ✅ SUPERADMIN
  - ✅ ADMINISTRATOR

#### 2. **Backend kontrola** (PHP)
**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/globalSettingsHandlers.php`

**Změny:**
- Kontrola práva `MAINTENANCE_ADMIN` při ukládání nastavení
- Kombinovaná kontrola: `isSuperAdmin OR hasMaintenanceAdmin`
- SQL dotaz kontroluje přímá práva i práva z rolí

**Logika:**
```php
// Může měnit maintenance_mode:
if ($isSuperAdmin || $hasMaintenanceAdmin) {
    // Povoleno
}
```

#### 3. **Frontend kontrola** (React)
**Soubor:** `/apps/eeo-v2/client/src/App.js`

**Změny:**
- Nová funkce `hasMaintenanceAdmin` - kontroluje právo v `userDetail`
- Kontroluje přímá práva (`direct_rights`) i práva z rolí (`roles[].rights`)
- Kombinovaná kontrola: `isSuperAdmin OR hasMaintenanceAdmin`

**Logika:**
```javascript
const canBypassMaintenance = isSuperAdmin || hasMaintenanceAdmin;

if (maintenanceMode && !canBypassMaintenance) {
    return <MaintenancePage />;
}
```

---

## 🗄️ SQL Migrace

**Soubor:** `/_docs/database-migrations/ADD_MAINTENANCE_ADMIN_PERMISSION.sql`

**Spuštění:**
```bash
mysql -h 10.3.172.11 -u erdms_user -pAhchohTahnoh7eim eeo2025-dev < /_docs/database-migrations/ADD_MAINTENANCE_ADMIN_PERMISSION.sql
```

**Co dělá:**
1. Přidá právo `MAINTENANCE_ADMIN` do tabulky `25_prava`
2. Přiřadí právo roli `SUPERADMIN`
3. Přiřadí právo roli `ADMINISTRATOR`
4. Zobrazí kontrolní výpis

---

## 🔐 Kdo má přístup během údržby?

### ✅ Automatický přístup (přes role):
1. **SUPERADMIN** - má roli
2. **ADMINISTRATOR** - má roli + právo MAINTENANCE_ADMIN

### ✅ Přiřazením práva:
- Kdokoliv s přímým právem `MAINTENANCE_ADMIN` (přiřazené v tabulce `25_uzivatel_prava`)

### ❌ Bez přístupu:
- Všichni ostatní uživatelé vidí `MaintenancePage` s hláškou

---

## 🧪 Testování

### Test 1: SUPERADMIN
```
✅ Očekáváno: Přístup povolen
✅ Kontrola: isSuperAdmin === true
```

### Test 2: ADMINISTRATOR
```
✅ Očekáváno: Přístup povolen
✅ Kontrola: hasMaintenanceAdmin === true (z role)
```

### Test 3: Běžný uživatel s přímým právem
```
✅ Očekáváno: Přístup povolen
✅ Kontrola: hasMaintenanceAdmin === true (přímé právo)
```

### Test 4: Běžný uživatel bez práva
```
❌ Očekáváno: Zobrazí MaintenancePage
✅ Kontrola: canBypassMaintenance === false
```

---

## 📊 Struktura databáze

### Tabulka: `25_prava`
```sql
| id | kod_prava         | popis                                    | aktivni |
|----|-------------------|------------------------------------------|---------|
| XX | MAINTENANCE_ADMIN | Přístup do systému během maintenance... | 1       |
```

### Tabulka: `25_role_prava` (vztah role → právo)
```sql
| role_id | pravo_id | aktivni |
|---------|----------|---------|
| 1       | XX       | 1       | -- SUPERADMIN
| 2       | XX       | 1       | -- ADMINISTRATOR
```

### Tabulka: `25_uzivatel_prava` (přímé přiřazení práva uživateli)
```sql
| uzivatel_id | pravo_id | aktivni |
|-------------|----------|---------|
| 5           | XX       | 1       | -- Příklad: User 5 má přímé právo
```

---

## 🔧 Návod pro přidělení práva konkrétnímu uživateli

### Varianta 1: Přes roli (doporučeno)
```sql
-- Přiřadit uživateli roli ADMINISTRATOR
INSERT INTO `25_uzivatele_role` (`uzivatel_id`, `role_id`)
VALUES (5, (SELECT id FROM `25_role` WHERE kod_role = 'ADMINISTRATOR'));
```

### Varianta 2: Přímé právo
```sql
-- Přiřadit právo MAINTENANCE_ADMIN přímo uživateli
INSERT INTO `25_uzivatel_prava` (`uzivatel_id`, `pravo_id`, `aktivni`)
VALUES (
    5, -- ID uživatele
    (SELECT id FROM `25_prava` WHERE kod_prava = 'MAINTENANCE_ADMIN'),
    1
);
```

---

## 🚨 Bezpečnostní poznámky

1. **Backend validace je KRITICKÁ**
   - Frontend kontrola je pouze UX
   - Backend MUSÍ kontrolovat oprávnění při každém požadavku

2. **Maintenance mode je v DB**
   - Hodnota v `25a_nastaveni_globalni` → klíč `maintenance_mode`
   - Frontend kontroluje každých 30 sekund

3. **Logout při zapnutí údržby**
   - Uživatelé bez práva jsou automaticky přesměrováni na `MaintenancePage`
   - Po vypnutí údržby mohou pokračovat

---

## 📝 Checklist pro produkci

- [ ] Spustit SQL migraci na **eeo2025-dev** (testování)
- [ ] Otestovat přístup s různými rolemi
- [ ] Ověřit, že běžní uživatelé vidí MaintenancePage
- [ ] Ověřit, že ADMINISTRATOR má přístup
- [ ] **Po úspěšném testu:** Spustit SQL migraci na **eeo2025** (produkce)
- [ ] Provést smoke test na produkci

---

## 🔗 Související soubory

- SQL migrace: `/_docs/database-migrations/ADD_MAINTENANCE_ADMIN_PERMISSION.sql`
- Backend: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/globalSettingsHandlers.php`
- Frontend: `/apps/eeo-v2/client/src/App.js`
- Původní nastavení: `/_docs/database-migrations/INSTALL_GLOBAL_SETTINGS.sql`

---

**✅ Implementace dokončena**
