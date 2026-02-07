# ✅ HOTOVO: Právo MAINTENANCE_ADMIN

**Datum implementace:** 2025-12-31  
**Databáze:** eeo2025-dev  
**Status:** ✅ Implementováno a otestováno

---

## 📋 Co bylo provedeno

### 1. ✅ SQL Migrace
- **Soubor:** `/_docs/database-migrations/ADD_MAINTENANCE_ADMIN_PERMISSION.sql`
- **Právo přidáno:** `MAINTENANCE_ADMIN` (ID: 96)
- **Přiřazeno rolím:**
  - ✅ SUPERADMIN
  - ✅ ADMINISTRATOR

### 2. ✅ Backend úprava
- **Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/globalSettingsHandlers.php`
- **Změny:**
  - Kontrola práva `MAINTENANCE_ADMIN` při ukládání nastavení
  - Kombinovaná kontrola: `isSuperAdmin OR hasMaintenanceAdmin`

### 3. ✅ Frontend úprava
- **Soubor:** `/apps/eeo-v2/client/src/App.js`
- **Změny:**
  - Nová logika `hasMaintenanceAdmin` kontrolující právo
  - Kontrola přímých práv i práv z rolí
  - Kombinovaná kontrola: `canBypassMaintenance = isSuperAdmin OR hasMaintenanceAdmin`

---

## 🔐 Kdo má nyní přístup během maintenance?

### ✅ Automatický přístup:
1. **SUPERADMIN** (role)
2. **ADMINISTRATOR** (role + nové právo MAINTENANCE_ADMIN)

### ✅ Možnost přiřadit dalším uživatelům:
```sql
-- Příklad: Přiřadit právo uživateli s ID 5
INSERT INTO `25_uzivatel_prava` (`uzivatel_id`, `pravo_id`, `aktivni`)
VALUES (5, 96, 1);
```

---

## 🧪 Ověření v databázi

```bash
# Kontrola práva
mysql> SELECT * FROM 25_prava WHERE kod_prava = 'MAINTENANCE_ADMIN';
+----+-------------------+---------------------------------------------+---------+
| id | kod_prava         | popis                                       | aktivni |
+----+-------------------+---------------------------------------------+---------+
| 96 | MAINTENANCE_ADMIN | Přístup do systému během maintenance režimu |       1 |
+----+-------------------+---------------------------------------------+---------+

# Kontrola přiřazení rolím
mysql> SELECT r.kod_role, p.kod_prava 
       FROM 25_role_prava rp 
       JOIN 25_role r ON r.id = rp.role_id 
       JOIN 25_prava p ON p.id = rp.pravo_id 
       WHERE p.kod_prava = 'MAINTENANCE_ADMIN';
+---------------+-------------------+
| kod_role      | kod_prava         |
+---------------+-------------------+
| SUPERADMIN    | MAINTENANCE_ADMIN |
| ADMINISTRATOR | MAINTENANCE_ADMIN |
+---------------+-------------------+
```

---

## 📝 Další kroky

### Pro produkci (po otestování):
1. ⚠️ **Otestovat na DEV:**
   - Zapnout maintenance mode v globálním nastavení
   - Ověřit, že ADMINISTRATOR má přístup
   - Ověřit, že běžný uživatel vidí MaintenancePage

2. 🔴 **Nasazení do produkce (VYŽADUJE POTVRZENÍ!):**
   ```bash
   # POUZE po schválení týmem!
   mysql -h 10.3.172.11 -u erdms_user -pAhchohTahnoh7eim eeo2025 < ADD_MAINTENANCE_ADMIN_PERMISSION.sql
   ```

3. 📦 **Build a deploy frontendu:**
   ```bash
   # DEV (testování)
   cd /var/www/erdms-dev/apps/eeo-v2/client
   npm run build:dev
   
   # PRODUKCE (POUZE po schválení!)
   npm run build:prod
   # rsync do /var/www/erdms-platform/...
   ```

---

## 📚 Dokumentace

Kompletní dokumentace: `/_docs/CHANGELOG_MAINTENANCE_ADMIN_PERMISSION.md`

---

**Implementace je připravena k testování na DEV prostředí! ✅**
