# 🚀 Multi-profilový systém - Quick Start Guide

**Datum:** 15. ledna 2026  
**Odhadovaný čas:** 12-15 hodin (víkend)

---

## 📋 Prerekvizity

- [x] MySQL databáze `eeo2025`
- [x] PHP 7.4+
- [x] Node.js 18+ (pro frontend)
- [x] Přístup k produkční/dev databázi
- [x] Backup databáze (DŮLEŽITÉ!)

---

## 🎯 Sobota dopoledne (2-3 hodiny)

### Krok 1: Backup databáze

```bash
cd /var/www/erdms-dev
mkdir -p docs/database-backups/multi-profile-$(date +%Y%m%d)
mysqldump -u root -p eeo2025 > docs/database-backups/multi-profile-$(date +%Y%m%d)/backup_before_migration.sql
```

### Krok 2: Spustit migrace

```bash
cd /var/www/erdms-dev/docs/database-migrations

# Migrace 1: Přidat typ_profilu
mysql -u root -p eeo2025 < ADD_TYP_PROFILU_TO_HIERARCHIE_PROFILY.sql

# Migrace 2: Přidat profil_type a personalized_users
mysql -u root -p eeo2025 < ADD_PROFIL_TYPE_AND_PERSONALIZED_TO_VZTAHY.sql

# Migrace 3: Testovací data
mysql -u root -p eeo2025 < INSERT_TEST_DATA_MULTI_PROFILE.sql
```

### Krok 3: Ověřit migrace

```bash
mysql -u root -p eeo2025 -e "SHOW CREATE TABLE 25_hierarchie_profily\G"
mysql -u root -p eeo2025 -e "SHOW CREATE TABLE 25_hierarchie_vztahy\G"
mysql -u root -p eeo2025 -e "SELECT * FROM 25_hierarchie_profily WHERE nazev LIKE 'PROF-%' OR nazev LIKE 'VIDITELNOST-%'"
```

**Očekávaný výstup:**
- ✅ Sloupec `typ_profilu` v `25_hierarchie_profily`
- ✅ Sloupec `profil_type` v `25_hierarchie_vztahy`
- ✅ Sloupec `personalized_users` v `25_hierarchie_vztahy`
- ✅ 3 testovací profily (PROF-NOTIF-MAIN, VIDITELNOST-NAMESTEK, VIDITELNOST-PRIKAZCE)

---

## 🎯 Sobota odpoledne (4-5 hodin)

### Krok 4: Backend - Vytvořit `hierarchyVisibilityFilters.php`

```bash
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib
nano hierarchyVisibilityFilters.php
```

**Obsah souboru:** (viz sekce "Backend implementace" níže)

### Krok 5: Backend - Rozšířit `hierarchyHandlers_v2.php`

```bash
nano hierarchyHandlers_v2.php
```

**Úpravy:**
1. Přidat `profil_type` do SELECT
2. Přidat `personalized_users` do SELECT
3. Upravit INSERT pro uložení nových polí

### Krok 6: Backend - Integrovat do `orderV2Endpoints.php`

```bash
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/endpoints
nano orderV2Endpoints.php
```

**Přidat na začátek:**
```php
require_once __DIR__ . '/../lib/hierarchyVisibilityFilters.php';
```

**V `handle_order_v2_list()` přidat:**
```php
// Načíst viditelné objednávky podle hierarchie
$visibleOrderIds = getVisibleOrderIdsForUser($current_user_id, $db);
if (!empty($visibleOrderIds)) {
  $placeholders = implode(',', array_fill(0, count($visibleOrderIds), '?'));
  $whereConditions[] = "o.id IN ($placeholders)";
  $params = array_merge($params, $visibleOrderIds);
}
```

### Krok 7: Testovat Backend API

```bash
curl -X POST http://localhost/api.eeo/order/v2/list \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN",
    "username": "YOUR_USERNAME"
  }'
```

---

## 🎯 Neděle (6-8 hodin)

### Krok 8: Frontend - Vytvořit komponenty

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client/src/components/hierarchy
nano EdgeConfigPanel.jsx
nano UserMultiSelect.jsx
```

### Krok 9: Frontend - Upravit editor hierarchie

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client/src/pages
nano HierarchyEditorPage.jsx
```

**Přidat:**
1. State pro `selectedEdge`
2. Panel `<EdgeConfigPanel />` při výběru edge
3. Ukládání nových polí při save

### Krok 10: Testovat Frontend

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm start
```

1. Otevřít http://localhost:3000/hierarchy
2. Vytvořit nový vztah
3. Nastavit `profil_type = VIDITELNOST`
4. Přidat `personalized_users`
5. Uložit
6. Ověřit v DB

---

## 🎯 Neděle večer (2 hodiny)

### Krok 11: End-to-end test

**Scénář:**
1. Přihlásit se jako Jan Černohorský (user_id = 85)
2. Otevřít seznam objednávek
3. Ověřit, že vidí:
   - Objednávky z IT úseku
   - Objednávky Holovského
   - Objednávky Sulganové
   - Objednávky z Kladna a Benešova

### Krok 12: Dokumentace

```bash
cd /var/www/erdms-dev/docs/hierarchy
nano MULTI_PROFILE_IMPLEMENTATION_COMPLETE.md
```

**Obsah:**
- ✅ Co bylo implementováno
- ✅ SQL migrace
- ✅ Backend změny
- ✅ Frontend změny
- ✅ Testovací scénáře
- ✅ Known issues

---

## 📁 Backend implementace

### `hierarchyVisibilityFilters.php`

```php
<?php
/**
 * Multi-profilový systém viditelnosti
 * Filtruje objekty (objednávky, faktury, atd.) podle hierarchických vztahů
 * 
 * @author Robert Novák
 * @date 2026-01-15
 */

require_once __DIR__ . '/queries.php';

/**
 * Získá ID objednávek viditelných pro uživatele
 * podle VŠECH aktivních profilů a vztahů
 * 
 * @param int $userId ID uživatele
 * @param PDO $pdo Databázové připojení
 * @return array Pole ID objednávek
 */
function getVisibleOrderIdsForUser($userId, $pdo) {
  $visibleOrderIds = [];
  
  // 1. Načíst všechny AKTIVNÍ profily
  $stmt = $pdo->query("
    SELECT id FROM ".TBL_HIERARCHIE_PROFILY." WHERE aktivni = 1
  ");
  $activeProfiles = $stmt->fetchAll(PDO::FETCH_COLUMN);
  
  if (empty($activeProfiles)) {
    return []; // Žádný profil aktivní
  }
  
  // 2. Načíst vztahy uživatele pro viditelnost
  $profilesPlaceholder = implode(',', array_fill(0, count($activeProfiles), '?'));
  
  $stmt = $pdo->prepare("
    SELECT 
      v.id,
      v.profil_id,
      v.profil_type,
      v.typ_vztahu,
      v.scope,
      v.user_id_2,
      v.lokalita_id,
      v.usek_id,
      v.rozsirene_lokality,
      v.rozsirene_useky,
      v.personalized_users,
      v.kombinace_lokalita_usek,
      v.viditelnost_objednavky
    FROM ".TBL_HIERARCHIE_VZTAHY." v
    WHERE v.user_id_1 = ?
      AND v.profil_id IN ($profilesPlaceholder)
      AND v.aktivni = 1
      AND v.profil_type IN ('VIDITELNOST', 'PRAVA', 'ALL')
      AND v.viditelnost_objednavky = 1
  ");
  
  $params = array_merge([$userId], $activeProfiles);
  $stmt->execute($params);
  $relations = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  // 3. Sbírat viditelné IDs podle různých kritérií
  foreach ($relations as $rel) {
    
    // 3a. Personalizovaní uživatelé (nejvyšší priorita)
    if (!empty($rel['personalized_users'])) {
      $userIds = json_decode($rel['personalized_users'], true);
      if (is_array($userIds) && !empty($userIds)) {
        $orderIds = getOrderIdsByCreators($userIds, $pdo);
        $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
      }
    }
    
    // 3b. Přímý vztah user-user
    if ($rel['typ_vztahu'] === 'user-user' && $rel['user_id_2']) {
      $orderIds = getOrderIdsByCreators([$rel['user_id_2']], $pdo);
      $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
    }
    
    // 3c. Viditelnost podle úseků
    $useky = [];
    if ($rel['usek_id']) {
      $useky[] = $rel['usek_id'];
    }
    if (!empty($rel['rozsirene_useky'])) {
      $extended = json_decode($rel['rozsirene_useky'], true);
      if (is_array($extended)) {
        $useky = array_merge($useky, $extended);
      }
    }
    if (!empty($useky)) {
      $orderIds = getOrderIdsByDepartments($useky, $pdo);
      $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
    }
    
    // 3d. Viditelnost podle lokalit
    $lokality = [];
    if ($rel['lokalita_id']) {
      $lokality[] = $rel['lokalita_id'];
    }
    if (!empty($rel['rozsirene_lokality'])) {
      $extended = json_decode($rel['rozsirene_lokality'], true);
      if (is_array($extended)) {
        $lokality = array_merge($lokality, $extended);
      }
    }
    if (!empty($lokality)) {
      $orderIds = getOrderIdsByLocations($lokality, $pdo);
      $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
    }
    
    // 3e. Scope = ALL (vidí všechny objednávky)
    if ($rel['scope'] === 'ALL') {
      $stmt = $pdo->query("SELECT id FROM 25_objednavky");
      $orderIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
      $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
    }
  }
  
  // 4. Deduplikace a návrat
  $visibleOrderIds = array_unique($visibleOrderIds);
  
  return $visibleOrderIds;
}

/**
 * Helper: Načíst objednávky vytvořené konkrétními uživateli
 */
function getOrderIdsByCreators($userIds, $pdo) {
  if (empty($userIds)) return [];
  
  $placeholders = implode(',', array_fill(0, count($userIds), '?'));
  $stmt = $pdo->prepare("
    SELECT DISTINCT id FROM 25_objednavky
    WHERE vytvoril IN ($placeholders)
       OR objednatel_id IN ($placeholders)
       OR prikazce_id IN ($placeholders)
       OR garant_id IN ($placeholders)
  ");
  
  $params = array_merge($userIds, $userIds, $userIds, $userIds);
  $stmt->execute($params);
  
  return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * Helper: Načíst objednávky uživatelů z daných úseků
 */
function getOrderIdsByDepartments($departmentIds, $pdo) {
  if (empty($departmentIds)) return [];
  
  $placeholders = implode(',', array_fill(0, count($departmentIds), '?'));
  $stmt = $pdo->prepare("
    SELECT DISTINCT o.id
    FROM 25_objednavky o
    JOIN 25_uzivatele u ON o.vytvoril = u.id
    WHERE u.usek_id IN ($placeholders)
  ");
  $stmt->execute($departmentIds);
  
  return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * Helper: Načíst objednávky uživatelů z daných lokalit
 */
function getOrderIdsByLocations($locationIds, $pdo) {
  if (empty($locationIds)) return [];
  
  $placeholders = implode(',', array_fill(0, count($locationIds), '?'));
  $stmt = $pdo->prepare("
    SELECT DISTINCT o.id
    FROM 25_objednavky o
    JOIN 25_uzivatele u ON o.vytvoril = u.id
    WHERE u.lokalita_id IN ($placeholders)
  ");
  $stmt->execute($locationIds);
  
  return $stmt->fetchAll(PDO::FETCH_COLUMN);
}
```

---

## ✅ Checklist

### Před začátkem
- [ ] Backup databáze
- [ ] Git branch `feature/multi-profile-system`
- [ ] Přečíst kompletní dokumentaci

### Databáze
- [ ] Spustit migrace
- [ ] Ověřit struktu tabulek
- [ ] Vložit testovací data
- [ ] Otestovat SQL dotazy

### Backend
- [ ] Vytvořit `hierarchyVisibilityFilters.php`
- [ ] Rozšířit `hierarchyHandlers_v2.php`
- [ ] Integrovat do `orderV2Endpoints.php`
- [ ] Testovat API endpointy

### Frontend
- [ ] Vytvořit `EdgeConfigPanel.jsx`
- [ ] Vytvořit `UserMultiSelect.jsx`
- [ ] Upravit editor hierarchie
- [ ] Testovat v prohlížeči

### Testing
- [ ] End-to-end test
- [ ] Testovat různé scénáře
- [ ] Ověřit performance

### Dokumentace
- [ ] Aktualizovat README
- [ ] Vytvořit migration guide
- [ ] Zdokumentovat nová API

---

## 🆘 Troubleshooting

### Problem: Migrace selže

**Řešení:**
```bash
# Rollback
mysql -u root -p eeo2025 < docs/database-backups/multi-profile-YYYYMMDD/backup_before_migration.sql

# Zkontrolovat syntax
cat docs/database-migrations/ADD_TYP_PROFILU_TO_HIERARCHIE_PROFILY.sql
```

### Problem: API nevrací data

**Debug:**
```php
// Přidat na začátek hierarchyVisibilityFilters.php
error_log("DEBUG: getVisibleOrderIdsForUser userId=$userId");
error_log("DEBUG: Active profiles: " . json_encode($activeProfiles));
error_log("DEBUG: Relations: " . json_encode($relations));
```

### Problem: Frontend nezobrazuje nová pole

**Debug:**
```bash
# Vyčistit cache
rm -rf node_modules/.cache
npm start
```

---

## 📞 Kontakt

**Autor:** Robert Novák (robex08)  
**Datum:** 15. ledna 2026  
**Odhadovaný čas:** 12-15 hodin

💪 **Můžeme to stihnout o víkendu!**
