# 🔄 HIERARCHY REFACTOR - Optimalizace na 1 tabulku

**Datum:** 16. prosince 2025  
**Cíl:** Sjednotit organizační hierarchii do `25_hierarchie_profily` s `structure_json`

---

## ✅ KROK 1: Backup dat z 25_hierarchie_vztahy

```sql
-- 4 záznamy k migraci:
-- ID 130, 131: role-location (role 11 → lokalita 1)
-- ID 258, 259: template-user (template 5 → user 100)
```

## ✅ KROK 2: ALTER TABLE 25_hierarchie_profily

```sql
ALTER TABLE 25_hierarchie_profily 
ADD COLUMN structure_json LONGTEXT NULL 
COMMENT 'Graf notifikací: {nodes: [], edges: []} - vztahy, scope, notifikace, pozice';
```

## ✅ KROK 3: DROP TABLE 25_hierarchie_vztahy

```sql
DROP TABLE 25_hierarchie_vztahy;
```

## ✅ KROK 4: Přepsat PHP soubory

1. `hierarchyOrderFilters.php` - číst z structure_json
2. `hierarchyPermissions.php` - číst z structure_json
3. `notificationHandlers.php` - opravit název tabulky
4. `hierarchyHandlers.php` - přidat API pro save structure_json

## ✅ KROK 5: Frontend OrganizationHierarchy.js

- Přidat Save API call místo localStorage
- Load z DB místo localStorage

---

## 📋 Soubory k úpravě:

### Backend PHP:
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyOrderFilters.php`
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyPermissions.php`
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyHandlers.php`
- `/apps/eeo-v2/api-legacy/api.eeo/api.php` (registrace endpointu)

### Frontend:
- `/apps/eeo-v2/client/src/pages/OrganizationHierarchy.js`

### SQL:
- `HIERARCHY_REFACTOR.sql` - všechny DB změny
