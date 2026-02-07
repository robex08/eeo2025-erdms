# 🎯 Multi-profilový systém práv a viditelnosti - Analýza & Plán

**Datum:** 15. ledna 2026  
**Status:** 📋 Návrh pro implementaci o víkendu  
**Autor:** Robert Novák & GitHub Copilot  

---

## 📋 Executive Summary

Potřebujeme rozšířit současný hierarchický systém NODE/EDGE (používaný pro notifikace) o **komplexní multi-profilový systém** definující práva a viditelnost objektů aplikace (objednávky, faktury, pokladna, smlouvy).

### Klíčové požadavky:
1. **Multi-profilový přístup** - kombinace profilů (NOTIF + VIDITELNOST)
2. **Viditelnost podle úseků** - NAMESTEK vidí vše pod svým úsekem
3. **Viditelnost podle lokalit** - vidím objednávky z Kladna, Benešova
4. **Personifikace** - konkrétní uživatelé vidí konkrétní další uživatele

---

## 🎯 Co už máme připraveno

### ✅ 1. Notifikační hierarchie (NODE/EDGE systém)

**Tabulka:** `25_hierarchy_profiles` (pro notifikace)  
**Status:** ✅ Implementováno

```sql
CREATE TABLE 25_hierarchy_profiles (
  id INT PRIMARY KEY,
  nazev VARCHAR(100),
  popis TEXT,
  aktivni TINYINT(1),
  structure_json LONGTEXT,  -- {nodes: [], edges: []}
  vytvoril_user_id INT,
  dt_vytvoreno TIMESTAMP,
  dt_upraveno TIMESTAMP
);
```

**Struktura JSON:**
```json
{
  "nodes": [
    {
      "id": "template-order-approved",
      "typ": "template",
      "pozice": {"x": 100, "y": 100},
      "data": {
        "label": "Objednávka schválena",
        "eventTypes": ["ORDER_APPROVED", "ORDER_REJECTED"]
      }
    },
    {
      "id": "role-ucetni",
      "typ": "role",
      "data": {
        "role_id": 5,
        "role_name": "UCETNI"
      }
    },
    {
      "id": "user-123",
      "typ": "user",
      "data": {
        "uzivatel_id": 123,
        "username": "robert"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "template-order-approved",
      "target": "role-ucetni",
      "typ": "notification",
      "data": {
        "notifications": {
          "types": ["ORDER_APPROVED"],
          "channels": {"email": true, "inapp": true}
        }
      }
    }
  ]
}
```

**Co umí:**
- ✅ Vizuální editor NODE/EDGE (React Flow)
- ✅ Definice kdo dostává jaké notifikace
- ✅ Template → Role → User mapping
- ✅ Podpora event types (ORDER_APPROVED, atd.)

---

### ✅ 2. Hierarchický systém práv (Vztahy)

**Tabulka:** `25_hierarchie_vztahy` (pro práva & viditelnost)  
**Status:** ✅ Implementováno pro objednávky

```sql
CREATE TABLE 25_hierarchie_vztahy (
  id INT PRIMARY KEY,
  profil_id INT,
  
  -- Typ vztahu
  typ_vztahu ENUM('user-user', 'location-user', 'user-location', 
                  'department-user', 'user-department'),
  
  -- Účastníci
  user_id_1 INT,
  user_id_2 INT,
  lokalita_id INT,
  usek_id INT,
  role_id INT,
  template_id INT,
  
  -- Rozsah viditelnosti
  scope ENUM('OWN', 'TEAM', 'LOCATION', 'ALL') DEFAULT 'OWN',
  druh_vztahu ENUM('prime', 'zastupovani', 'delegovani', 'rozsirene'),
  
  -- Viditelnost modulů
  viditelnost_objednavky TINYINT(1),
  viditelnost_faktury TINYINT(1),
  viditelnost_smlouvy TINYINT(1),
  viditelnost_pokladna TINYINT(1),
  viditelnost_uzivatele TINYINT(1),
  viditelnost_lp TINYINT(1),
  
  -- Úroveň práv (READ_ONLY, READ_WRITE, READ_WRITE_DELETE, INHERIT)
  uroven_prav_objednavky ENUM(...),
  uroven_prav_faktury ENUM(...),
  uroven_prav_smlouvy ENUM(...),
  uroven_prav_pokladna ENUM(...),
  
  -- Rozšířená oprávnění
  rozsirene_lokality JSON,  -- [12, 15, 18]
  rozsirene_useky JSON,     -- [3, 5, 7]
  kombinace_lokalita_usek JSON,  -- [{"locationId": 12, "departmentId": 3}]
  
  -- Notifikace
  notifikace_email TINYINT(1),
  notifikace_inapp TINYINT(1),
  notifikace_typy JSON,  -- [1, 5, 8] - IDs event types
  notifikace_recipient_role VARCHAR(50),  -- 'APPROVAL', 'CREATOR', atd.
  
  -- Pozice pro vizualizaci
  pozice_node_1 JSON,
  pozice_node_2 JSON,
  
  -- Extended data
  modules JSON,
  permission_level JSON,
  extended_data JSON,
  node_settings JSON,
  
  aktivni TINYINT(1),
  dt_vytvoreni DATETIME,
  dt_upraveno DATETIME,
  upravil_user_id INT
);
```

**Co umí:**
- ✅ User → User vztahy (nadřízený-podřízený)
- ✅ User → Location (vidí celou lokalitu)
- ✅ User → Department (vidí celý úsek)
- ✅ Location → User (všichni z lokality mají tohoto nadřízeného)
- ✅ Department → User (všichni z úseku mají tohoto nadřízeného)
- ✅ Scope (OWN, TEAM, LOCATION, ALL)
- ✅ Úroveň práv per modul (READ_ONLY, READ_WRITE, atd.)
- ✅ Rozšířené lokality & úseky (pole IDs)
- ✅ Kombinace lokalita+úsek (AND logika)
- ⚠️ Notifikace částečně - jsou tam sloupce, ale nejsou plně využity

---

### ✅ 3. Profily hierarchie

**Tabulka:** `25_hierarchie_profily`  
**Status:** ✅ Implementováno

```sql
CREATE TABLE 25_hierarchie_profily (
  id INT PRIMARY KEY,
  nazev VARCHAR(100),
  popis TEXT,
  aktivni TINYINT(1),
  dt_vytvoreno DATETIME,
  dt_upraveno DATETIME
);
```

**Co umí:**
- ✅ Více profilů organizačního řádu
- ✅ Aktivace/deaktivace profilu
- ✅ Vztahy v `25_hierarchie_vztahy` odkazují na `profil_id`

---

## 🔍 Současný stav - Co funguje

### Backend API (PHP)
- ✅ `hierarchyHandlers_v2.php` - načítání/ukládání hierarchie
- ✅ `hierarchyOrderFilters.php` - filtrace objednávek podle hierarchie
- ✅ `hierarchyPermissions.php` - rozšiřování práv
- ✅ `hierarchyTriggers.php` - notifikační triggery

### Frontend (React)
- ✅ Vizuální editor hierarchie (React Flow)
- ✅ Drag & drop nodes (User, Role, Location, Department, Template)
- ✅ Propojení edges s nastavením
- ✅ Ukládání/načítání struktury
- ✅ Integrace s AuthContext (rozšířená práva)

### Databáze
- ✅ Tabulky `25_hierarchie_profily`, `25_hierarchie_vztahy`
- ✅ Tabulka `25_hierarchy_profiles` (pro notifikace)
- ✅ Tabulky `25_lokality`, `25_useky`, `25_role`
- ✅ Foreign keys a indexy

---

## ❌ Co zatím nefunguje / chybí

### 1. Multi-profilový systém
**Status:** ❌ Není implementováno

**Problém:**  
Současně je možný **pouze 1 aktivní profil** (`aktivni = 1` v `25_hierarchie_profily`).

**Potřeba:**
- Umožnit **více aktivních profilů současně**
- Profil typu: NOTIFIKACE, VIDITELNOST, PRAVA
- Kombinovat je (např. PROF-NOTIF-MAIN + VIDITELNOST-NAMESTEK + VIDITELNOST-PRIKAZCE)

---

### 2. Personifikace práv
**Status:** ⚠️ Částečně připraveno

**Co máme:**
- ✅ `user-user` vztah (Černohorský → Holovský)
- ✅ `extended_data` JSON pole pro custom nastavení

**Co chybí:**
- ❌ Možnost říct: "NAMESTEK vidí objednávky Holovského + Sulganové"
- ❌ Možnost říct: "Uživatel Rusy vidí obj. Kvapilové, Lungerové, Wlachové"
- ❌ UI pro personifikaci (výběr konkrétních uživatelů)

---

### 3. Viditelnost podle úseků
**Status:** ⚠️ Částečně připraveno

**Co máme:**
- ✅ `user-department` vztah (Černohorský → Úsek IT)
- ✅ `rozsirene_useky` JSON pole (lze přidat více úseků)
- ✅ `scope = 'TEAM'` (vidí celý úsek)

**Co chybí:**
- ❌ Možnost vyjmenovat konkrétní úseky (UI)
- ❌ Kombinace úseků (A OR B)
- ❌ Backend logika pro filtraci podle `rozsirene_useky`

---

### 4. Viditelnost podle lokalit
**Status:** ⚠️ Částečně připraveno

**Co máme:**
- ✅ `user-location` vztah (Černohorský → Kladno)
- ✅ `rozsirene_lokality` JSON pole (lze přidat více lokalit)
- ✅ `scope = 'LOCATION'` (vidí celou lokalitu)

**Co chybí:**
- ❌ Možnost vyjmenovat konkrétní lokality (UI)
- ❌ Kombinace lokalit (Kladno OR Benešov)
- ❌ Backend logika pro filtraci podle `rozsirene_lokality`

---

### 5. Integrace notifikací s právy
**Status:** ⚠️ Částečně připraveno

**Co máme:**
- ✅ `25_hierarchy_profiles` (notifikační profily)
- ✅ `25_hierarchie_vztahy` má sloupce pro notifikace:
  - `notifikace_email`
  - `notifikace_inapp`
  - `notifikace_typy` JSON
  - `notifikace_recipient_role`

**Co chybí:**
- ❌ Propojení mezi `25_hierarchy_profiles` a `25_hierarchie_vztahy`
- ❌ Backend logika pro rozhodování: "Komu poslat notifikaci podle VZTAHU"
- ❌ Možnost mít více notifikačních profilů současně

---

## 🎯 Návrh řešení - Bod po bodu

### 📌 Bod 1: Multi-profilový systém

**Cíl:**  
Umožnit více profilů současně, každý s jiným účelem (NOTIFIKACE, VIDITELNOST, PRAVA).

#### Řešení A: Rozšířit `25_hierarchie_profily` o typ
```sql
ALTER TABLE 25_hierarchie_profily
ADD COLUMN typ_profilu ENUM(
  'NOTIFIKACE',
  'VIDITELNOST',
  'PRAVA',
  'KOMBINOVANY'
) DEFAULT 'KOMBINOVANY' AFTER nazev;
```

**Použití:**
```sql
-- Profil pro notifikace
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('PROF-NOTIF-MAIN', 'NOTIFIKACE', 1);

-- Profil pro viditelnost nám. ředitele
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('VIDITELNOST-NAMESTEK', 'VIDITELNOST', 1);

-- Profil pro příkazce
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('VIDITELNOST-PRIKAZCE', 'VIDITELNOST', 1);
```

**Backend logika:**
```php
// Načíst všechny aktivní profily
$stmt = $pdo->query("
  SELECT * FROM 25_hierarchie_profily 
  WHERE aktivni = 1
  ORDER BY typ_profilu, nazev
");
$profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Seskupit podle typu
$notificationProfiles = array_filter($profiles, fn($p) => $p['typ_profilu'] === 'NOTIFIKACE');
$visibilityProfiles = array_filter($profiles, fn($p) => $p['typ_profilu'] === 'VIDITELNOST');
$permissionProfiles = array_filter($profiles, fn($p) => $p['typ_profilu'] === 'PRAVA');
```

#### Řešení B: Rozšířit `25_hierarchie_vztahy` o profil_type
```sql
ALTER TABLE 25_hierarchie_vztahy
ADD COLUMN profil_type ENUM(
  'NOTIFIKACE',
  'VIDITELNOST',
  'PRAVA',
  'ALL'
) DEFAULT 'ALL' AFTER profil_id;
```

**Použití:**
```sql
-- Vztah jen pro notifikace
INSERT INTO 25_hierarchie_vztahy 
(profil_id, profil_type, typ_vztahu, user_id_1, user_id_2, notifikace_inapp)
VALUES (1, 'NOTIFIKACE', 'user-user', 85, 52, 1);

-- Vztah jen pro viditelnost
INSERT INTO 25_hierarchie_vztahy 
(profil_id, profil_type, typ_vztahu, user_id_1, usek_id, viditelnost_objednavky)
VALUES (2, 'VIDITELNOST', 'user-department', 85, 3, 1);
```

**Backend logika:**
```php
// Načíst vztahy pro notifikace
$stmt = $pdo->prepare("
  SELECT * FROM 25_hierarchie_vztahy 
  WHERE profil_id = ? AND profil_type IN ('NOTIFIKACE', 'ALL') AND aktivni = 1
");
$stmt->execute([$profilId]);

// Načíst vztahy pro viditelnost
$stmt = $pdo->prepare("
  SELECT * FROM 25_hierarchie_vztahy 
  WHERE profil_id = ? AND profil_type IN ('VIDITELNOST', 'ALL') AND aktivni = 1
");
```

#### ✅ Doporučení: **Řešení A + Řešení B kombinované**

**Proč:**
1. **Profil** (tabulka) má `typ_profilu` → jasné označení účelu
2. **Vztah** (řádek) má `profil_type` → umožňuje přepsat typ z profilu
3. Příklad: Profil "KOMBINOVANY" může obsahovat vztahy typu NOTIFIKACE i VIDITELNOST

**Výhody:**
- ✅ Flexibilní
- ✅ Zpětně kompatibilní
- ✅ Umožňuje mít 1 profil pro vše NEBO více profilů po účelech
- ✅ UI může filtrovat podle typu

---

### 📌 Bod 2: Viditelnost podle úseků

**Cíl:**  
NAMESTEK vidí objednávky všech uživatelů ze svého úseku + možnost přidat další úseky.

#### Co už máme:
```sql
-- Černohorský vidí celý úsek IT
INSERT INTO 25_hierarchie_vztahy (
  profil_id, typ_vztahu, user_id_1, usek_id,
  scope, viditelnost_objednavky, uroven_prav_objednavky
) VALUES (
  1, 'user-department', 85, 3,  -- Úsek IT
  'TEAM', 1, 'READ_ONLY'
);
```

#### Co potřebujeme přidat:

**Rozšířit o více úseků:**
```sql
UPDATE 25_hierarchie_vztahy 
SET rozsirene_useky = '[3, 5, 7]'  -- IT, HR, Marketing
WHERE id = 123;
```

**Backend logika - filtrování:**
```php
function getVisibleOrderIdsForUser($userId, $pdo) {
  // 1. Načíst všechny vztahy pro uživatele
  $stmt = $pdo->prepare("
    SELECT 
      v.usek_id,
      v.rozsirene_useky,
      v.scope,
      v.viditelnost_objednavky
    FROM 25_hierarchie_vztahy v
    WHERE v.user_id_1 = ? 
      AND v.aktivni = 1
      AND v.profil_type IN ('VIDITELNOST', 'ALL')
      AND v.viditelnost_objednavky = 1
  ");
  $stmt->execute([$userId]);
  $relations = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  // 2. Sbírat všechny úseky
  $visibleUseky = [];
  foreach ($relations as $rel) {
    if ($rel['usek_id']) {
      $visibleUseky[] = $rel['usek_id'];
    }
    if ($rel['rozsirene_useky']) {
      $extended = json_decode($rel['rozsirene_useky'], true);
      $visibleUseky = array_merge($visibleUseky, $extended);
    }
  }
  $visibleUseky = array_unique($visibleUseky);
  
  // 3. Načíst objednávky uživatelů z těchto úseků
  if (empty($visibleUseky)) {
    return [];
  }
  
  $placeholders = implode(',', array_fill(0, count($visibleUseky), '?'));
  $stmt = $pdo->prepare("
    SELECT DISTINCT o.id
    FROM 25_objednavky o
    JOIN 25_uzivatele u ON o.vytvoril = u.id
    WHERE u.usek_id IN ($placeholders)
  ");
  $stmt->execute($visibleUseky);
  
  return $stmt->fetchAll(PDO::FETCH_COLUMN);
}
```

**Frontend UI:**
```jsx
// Komponenta pro výběr úseků
<MultiSelect
  label="Úseky (rozšířená viditelnost)"
  options={useky}  // Načteno z API
  value={relation.rozsirene_useky || []}
  onChange={(selected) => {
    updateRelation({
      ...relation,
      rozsirene_useky: selected
    });
  }}
/>
```

---

### 📌 Bod 3: Viditelnost podle lokalit

**Cíl:**  
Vidět objednávky uživatelů z Kladna, Benešova, nebo obou.

#### Implementace:

**Rozšířit o více lokalit:**
```sql
UPDATE 25_hierarchie_vztahy 
SET rozsirene_lokality = '[5, 8]'  -- Kladno, Benešov
WHERE id = 123;
```

**Backend logika:**
```php
function getVisibleOrderIdsByLocations($userId, $pdo) {
  $stmt = $pdo->prepare("
    SELECT 
      v.lokalita_id,
      v.rozsirene_lokality
    FROM 25_hierarchie_vztahy v
    WHERE v.user_id_1 = ? 
      AND v.aktivni = 1
      AND v.profil_type IN ('VIDITELNOST', 'ALL')
      AND v.viditelnost_objednavky = 1
  ");
  $stmt->execute([$userId]);
  $relations = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  $visibleLokality = [];
  foreach ($relations as $rel) {
    if ($rel['lokalita_id']) {
      $visibleLokality[] = $rel['lokalita_id'];
    }
    if ($rel['rozsirene_lokality']) {
      $extended = json_decode($rel['rozsirene_lokality'], true);
      $visibleLokality = array_merge($visibleLokality, $extended);
    }
  }
  $visibleLokality = array_unique($visibleLokality);
  
  if (empty($visibleLokality)) {
    return [];
  }
  
  $placeholders = implode(',', array_fill(0, count($visibleLokality), '?'));
  $stmt = $pdo->prepare("
    SELECT DISTINCT o.id
    FROM 25_objednavky o
    JOIN 25_uzivatele u ON o.vytvoril = u.id
    WHERE u.lokalita_id IN ($placeholders)
  ");
  $stmt->execute($visibleLokality);
  
  return $stmt->fetchAll(PDO::FETCH_COLUMN);
}
```

---

### 📌 Bod 4: Personifikace - konkrétní uživatelé

**Cíl:**  
- NAMESTEK vidí obj. Holovského + Sulganové
- Zaměstnanec Rusy vidí obj. Kvapilové, Lungerové, Wlachové

#### Řešení: Nové pole `personalized_users` v `25_hierarchie_vztahy`

```sql
ALTER TABLE 25_hierarchie_vztahy
ADD COLUMN personalized_users JSON NULL 
COMMENT '[52, 87, 91] - pole user IDs s personalizovanou viditelností'
AFTER rozsirene_useky;
```

**Použití:**
```sql
-- NAMESTEK vidí Holovského + Sulganovou
INSERT INTO 25_hierarchie_vztahy (
  profil_id, typ_vztahu, user_id_1,
  personalized_users,
  viditelnost_objednavky, uroven_prav_objednavky
) VALUES (
  2, 'user-user', 85,  -- Černohorský
  '[52, 87]',  -- Holovský (52), Sulganová (87)
  1, 'READ_ONLY'
);

-- Zaměstnanec Rusy vidí Kvapilovou, Lungerovou, Wlachovou
INSERT INTO 25_hierarchie_vztahy (
  profil_id, typ_vztahu, user_id_1,
  personalized_users,
  viditelnost_objednavky
) VALUES (
  2, 'user-user', 91,  -- Rusy
  '[45, 67, 89]',  -- Kvapilová, Lungerová, Wlachová
  1
);
```

**Backend logika:**
```php
function getPersonalizedVisibleOrderIds($userId, $pdo) {
  $stmt = $pdo->prepare("
    SELECT personalized_users
    FROM 25_hierarchie_vztahy
    WHERE user_id_1 = ? 
      AND aktivni = 1
      AND profil_type IN ('VIDITELNOST', 'ALL')
      AND personalized_users IS NOT NULL
  ");
  $stmt->execute([$userId]);
  $relations = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  $visibleUserIds = [];
  foreach ($relations as $rel) {
    $users = json_decode($rel['personalized_users'], true);
    $visibleUserIds = array_merge($visibleUserIds, $users);
  }
  $visibleUserIds = array_unique($visibleUserIds);
  
  if (empty($visibleUserIds)) {
    return [];
  }
  
  $placeholders = implode(',', array_fill(0, count($visibleUserIds), '?'));
  $stmt = $pdo->prepare("
    SELECT id
    FROM 25_objednavky
    WHERE vytvoril IN ($placeholders)
       OR objednatel_id IN ($placeholders)
       OR prikazce_id IN ($placeholders)
       OR garant_id IN ($placeholders)
  ");
  
  // Připravit parametry (4x pro každého uživatele)
  $params = array_merge($visibleUserIds, $visibleUserIds, $visibleUserIds, $visibleUserIds);
  $stmt->execute($params);
  
  return $stmt->fetchAll(PDO::FETCH_COLUMN);
}
```

**Frontend UI:**
```jsx
// Komponenta pro výběr konkrétních uživatelů
<UserMultiSelect
  label="Personalizovaní uživatelé (viditelnost)"
  placeholder="Vyberte konkrétní uživatele..."
  value={relation.personalized_users || []}
  onChange={(selectedUserIds) => {
    updateRelation({
      ...relation,
      personalized_users: selectedUserIds
    });
  }}
  loadOptions={async (searchTerm) => {
    const response = await fetch(`/api/users/search?q=${searchTerm}`);
    const users = await response.json();
    return users.map(u => ({
      value: u.id,
      label: `${u.prijmeni} ${u.jmeno} (${u.username})`
    }));
  }}
/>
```

---

## 🔄 Kombinovaná logika - Jak to funguje dohromady

### Backend funkce: `getVisibleOrderIdsForUser()`

```php
/**
 * Získá ID objednávek viditelných pro uživatele
 * podle VŠECH aktivních profilů a vztahů
 */
function getVisibleOrderIdsForUser($userId, $pdo) {
  $visibleOrderIds = [];
  
  // 1. Načíst všechny AKTIVNÍ profily (všechny typy)
  $stmt = $pdo->query("
    SELECT id FROM 25_hierarchie_profily WHERE aktivni = 1
  ");
  $activeProfiles = $stmt->fetchAll(PDO::FETCH_COLUMN);
  
  if (empty($activeProfiles)) {
    // Žádný profil aktivní → použít standardní práva
    return [];
  }
  
  // 2. Pro každý profil načíst vztahy uživatele
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
    FROM 25_hierarchie_vztahy v
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
      $orderIds = getOrderIdsByCreators($userIds, $pdo);
      $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
    }
    
    // 3b. Přímý vztah user-user
    if ($rel['typ_vztahu'] === 'user-user' && $rel['user_id_2']) {
      $orderIds = getOrderIdsByCreator($rel['user_id_2'], $pdo, $rel['scope']);
      $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
    }
    
    // 3c. Viditelnost podle úseků
    $useky = [];
    if ($rel['usek_id']) {
      $useky[] = $rel['usek_id'];
    }
    if (!empty($rel['rozsirene_useky'])) {
      $extended = json_decode($rel['rozsirene_useky'], true);
      $useky = array_merge($useky, $extended);
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
      $lokality = array_merge($lokality, $extended);
    }
    if (!empty($lokality)) {
      $orderIds = getOrderIdsByLocations($lokality, $pdo);
      $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
    }
    
    // 3e. Kombinace lokalita + úsek (AND logika)
    if (!empty($rel['kombinace_lokalita_usek'])) {
      $combinations = json_decode($rel['kombinace_lokalita_usek'], true);
      foreach ($combinations as $combo) {
        $orderIds = getOrderIdsByLocationAndDepartment(
          $combo['locationId'], 
          $combo['departmentId'], 
          $pdo
        );
        $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
      }
    }
    
    // 3f. Scope = ALL (vidí všechny objednávky)
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
    SELECT id FROM 25_objednavky
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

/**
 * Helper: Načíst objednávky uživatelů z kombinace lokalita + úsek
 */
function getOrderIdsByLocationAndDepartment($locationId, $departmentId, $pdo) {
  $stmt = $pdo->prepare("
    SELECT DISTINCT o.id
    FROM 25_objednavky o
    JOIN 25_uzivatele u ON o.vytvoril = u.id
    WHERE u.lokalita_id = ? AND u.usek_id = ?
  ");
  $stmt->execute([$locationId, $departmentId]);
  
  return $stmt->fetchAll(PDO::FETCH_COLUMN);
}
```

---

## 🎨 Frontend - Upravit vizuální editor

### Nové komponenty pro nastavení vztahu

```jsx
// EdgeConfigPanel.jsx
import React from 'react';
import { MultiSelect, Select, Checkbox } from './ui';

export const EdgeConfigPanel = ({ edge, onUpdate }) => {
  const [config, setConfig] = React.useState(edge.data || {});
  
  const handleUpdate = (updates) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onUpdate(edge.id, newConfig);
  };
  
  return (
    <div className="edge-config-panel">
      <h3>Nastavení vztahu</h3>
      
      {/* Typ profilu */}
      <Select
        label="Typ profilu"
        value={config.profil_type || 'ALL'}
        onChange={(value) => handleUpdate({ profil_type: value })}
        options={[
          { value: 'ALL', label: 'Vše (kombinovaný)' },
          { value: 'NOTIFIKACE', label: 'Notifikace' },
          { value: 'VIDITELNOST', label: 'Viditelnost' },
          { value: 'PRAVA', label: 'Práva' }
        ]}
      />
      
      {/* Scope */}
      <Select
        label="Rozsah viditelnosti"
        value={config.scope || 'OWN'}
        onChange={(value) => handleUpdate({ scope: value })}
        options={[
          { value: 'OWN', label: 'Vlastní záznamy' },
          { value: 'TEAM', label: 'Celý tým/úsek' },
          { value: 'LOCATION', label: 'Celá lokalita' },
          { value: 'ALL', label: 'Všechny záznamy' }
        ]}
      />
      
      {/* Viditelnost modulů */}
      <div className="module-visibility">
        <h4>Viditelnost v modulech</h4>
        <Checkbox
          label="Objednávky"
          checked={config.visibility?.objednavky || false}
          onChange={(checked) => handleUpdate({
            visibility: { ...config.visibility, objednavky: checked }
          })}
        />
        <Checkbox
          label="Faktury"
          checked={config.visibility?.faktury || false}
          onChange={(checked) => handleUpdate({
            visibility: { ...config.visibility, faktury: checked }
          })}
        />
        <Checkbox
          label="Smlouvy"
          checked={config.visibility?.smlouvy || false}
          onChange={(checked) => handleUpdate({
            visibility: { ...config.visibility, smlouvy: checked }
          })}
        />
        <Checkbox
          label="Pokladna"
          checked={config.visibility?.pokladna || false}
          onChange={(checked) => handleUpdate({
            visibility: { ...config.visibility, pokladna: checked }
          })}
        />
      </div>
      
      {/* Rozšířené úseky */}
      <MultiSelect
        label="Rozšířené úseky (navíc)"
        placeholder="Vyberte úseky..."
        options={useky}  // Načteno z API
        value={config.rozsirene_useky || []}
        onChange={(selected) => handleUpdate({ rozsirene_useky: selected })}
      />
      
      {/* Rozšířené lokality */}
      <MultiSelect
        label="Rozšířené lokality (navíc)"
        placeholder="Vyberte lokality..."
        options={lokality}  // Načteno z API
        value={config.rozsirene_lokality || []}
        onChange={(selected) => handleUpdate({ rozsirene_lokality: selected })}
      />
      
      {/* Personalizovaní uživatelé */}
      <UserMultiSelect
        label="Konkrétní uživatelé (personifikace)"
        placeholder="Vyberte uživatele..."
        value={config.personalized_users || []}
        onChange={(selected) => handleUpdate({ personalized_users: selected })}
        loadOptions={async (searchTerm) => {
          const response = await fetch(`/api/users/search?q=${searchTerm}`);
          const users = await response.json();
          return users.map(u => ({
            value: u.id,
            label: `${u.prijmeni} ${u.jmeno} (${u.username})`
          }));
        }}
      />
      
      {/* Notifikace */}
      {config.profil_type === 'NOTIFIKACE' || config.profil_type === 'ALL' ? (
        <div className="notifications">
          <h4>Nastavení notifikací</h4>
          <Checkbox
            label="E-mail"
            checked={config.notifications?.email || false}
            onChange={(checked) => handleUpdate({
              notifications: { ...config.notifications, email: checked }
            })}
          />
          <Checkbox
            label="In-App"
            checked={config.notifications?.inapp || false}
            onChange={(checked) => handleUpdate({
              notifications: { ...config.notifications, inapp: checked }
            })}
          />
        </div>
      ) : null}
    </div>
  );
};
```

---

## 📋 Databázové migrace

### Migrace 1: Přidat `typ_profilu` do `25_hierarchie_profily`

```sql
-- Migration: ADD_TYP_PROFILU_TO_HIERARCHIE_PROFILY.sql
ALTER TABLE 25_hierarchie_profily
ADD COLUMN typ_profilu ENUM(
  'NOTIFIKACE',
  'VIDITELNOST',
  'PRAVA',
  'KOMBINOVANY'
) DEFAULT 'KOMBINOVANY' 
AFTER nazev,
ADD INDEX idx_typ_profilu (typ_profilu);

-- Update existujících profilů (volitelně)
UPDATE 25_hierarchie_profily 
SET typ_profilu = 'KOMBINOVANY' 
WHERE typ_profilu IS NULL;
```

### Migrace 2: Přidat `profil_type` a `personalized_users` do `25_hierarchie_vztahy`

```sql
-- Migration: ADD_PROFIL_TYPE_AND_PERSONALIZED_TO_VZTAHY.sql
ALTER TABLE 25_hierarchie_vztahy
ADD COLUMN profil_type ENUM(
  'NOTIFIKACE',
  'VIDITELNOST',
  'PRAVA',
  'ALL'
) DEFAULT 'ALL' 
AFTER profil_id,
ADD COLUMN personalized_users JSON NULL 
COMMENT '[52, 87, 91] - pole user IDs s personalizovanou viditelností'
AFTER rozsirene_useky;

-- Index pro rychlejší filtrování
ALTER TABLE 25_hierarchie_vztahy
ADD INDEX idx_profil_type (profil_id, profil_type, aktivni);

-- Update existujících vztahů (volitelně)
UPDATE 25_hierarchie_vztahy 
SET profil_type = 'ALL' 
WHERE profil_type IS NULL;
```

### Migrace 3: Optimalizace indexů

```sql
-- Migration: OPTIMIZE_HIERARCHIE_VZTAHY_INDEXES.sql

-- Přidat composite index pro nejčastější dotazy
ALTER TABLE 25_hierarchie_vztahy
ADD INDEX idx_user_profil_visibility (
  user_id_1, 
  profil_id, 
  profil_type, 
  aktivni, 
  viditelnost_objednavky
);

-- Index pro filtrování podle úseků
ALTER TABLE 25_hierarchie_vztahy
ADD INDEX idx_usek_visibility (
  usek_id, 
  viditelnost_objednavky, 
  aktivni
);

-- Index pro filtrování podle lokalit
ALTER TABLE 25_hierarchie_vztahy
ADD INDEX idx_lokalita_visibility (
  lokalita_id, 
  viditelnost_objednavky, 
  aktivni
);
```

---

## 🚀 Implementační plán (vikend)

### Fáze 1: Databáze (sobota dopoledne, 2-3 hodiny)

1. ✅ **Spustit migrace**
   ```bash
   mysql -u root -p eeo2025 < ADD_TYP_PROFILU_TO_HIERARCHIE_PROFILY.sql
   mysql -u root -p eeo2025 < ADD_PROFIL_TYPE_AND_PERSONALIZED_TO_VZTAHY.sql
   mysql -u root -p eeo2025 < OPTIMIZE_HIERARCHIE_VZTAHY_INDEXES.sql
   ```

2. ✅ **Ověřit migrace**
   ```sql
   SHOW CREATE TABLE 25_hierarchie_profily;
   SHOW CREATE TABLE 25_hierarchie_vztahy;
   ```

3. ✅ **Vytvořit testovací data**
   ```sql
   -- Profil pro notifikace
   INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
   VALUES ('PROF-NOTIF-MAIN', 'NOTIFIKACE', 1);
   
   -- Profil pro viditelnost
   INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
   VALUES ('VIDITELNOST-NAMESTEK', 'VIDITELNOST', 1);
   ```

---

### Fáze 2: Backend (sobota odpoledne, 4-5 hodin)

1. ✅ **Rozšířit `hierarchyHandlers_v2.php`**
   - Upravit `handle_hierarchy_save_v2()` pro podporu nových polí
   - Upravit `handle_hierarchy_structure_v2()` pro načítání

2. ✅ **Vytvořit `hierarchyVisibilityFilters.php`**
   - `getVisibleOrderIdsForUser()` (hlavní funkce)
   - `getOrderIdsByCreators()`
   - `getOrderIdsByDepartments()`
   - `getOrderIdsByLocations()`
   - `getOrderIdsByLocationAndDepartment()`

3. ✅ **Integrovat do `orderV2Endpoints.php`**
   ```php
   require_once __DIR__ . '/hierarchyVisibilityFilters.php';
   
   // V handle_order_v2_list()
   $visibleOrderIds = getVisibleOrderIdsForUser($current_user_id, $db);
   if (!empty($visibleOrderIds)) {
     $placeholders = implode(',', array_fill(0, count($visibleOrderIds), '?'));
     $whereConditions[] = "o.id IN ($placeholders)";
     $params = array_merge($params, $visibleOrderIds);
   }
   ```

4. ✅ **Testovat API**
   ```bash
   curl -X POST http://localhost/api.eeo/order/v2/list \
     -H "Content-Type: application/json" \
     -d '{"token":"...","username":"robert"}'
   ```

---

### Fáze 3: Frontend (neděle, 6-8 hodin)

1. ✅ **Rozšířit vizuální editor**
   - Přidat `EdgeConfigPanel` komponentu
   - Přidat `UserMultiSelect` komponentu
   - Přidat `MultiSelect` pro úseky/lokality

2. ✅ **Upravit ukládání hierarchie**
   ```js
   const saveHierarchy = async () => {
     const relations = edges.map(edge => ({
       ...edge.data,
       profil_type: edge.data.profil_type || 'ALL',
       personalized_users: edge.data.personalized_users || [],
       rozsirene_useky: edge.data.rozsirene_useky || [],
       rozsirene_lokality: edge.data.rozsirene_lokality || []
     }));
     
     await fetch('/api/hierarchy/save', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ relations, profile_id: activeProfileId })
     });
   };
   ```

3. ✅ **Přidat filtraci profilů**
   ```jsx
   <Select
     label="Typ profilu"
     value={filterProfilType}
     onChange={setFilterProfilType}
     options={[
       { value: 'ALL', label: 'Všechny profily' },
       { value: 'NOTIFIKACE', label: 'Notifikace' },
       { value: 'VIDITELNOST', label: 'Viditelnost' },
       { value: 'PRAVA', label: 'Práva' }
     ]}
   />
   ```

4. ✅ **Testovat v prohlížeči**

---

### Fáze 4: Testování & Dokumentace (neděle večer, 2 hodiny)

1. ✅ **End-to-end test**
   - Vytvořit profil VIDITELNOST-NAMESTEK
   - Přidat vztah: Černohorský → Úsek IT
   - Přidat rozšířené lokality: [Kladno, Benešov]
   - Přidat personalized_users: [Holovský, Sulganová]
   - Otestovat filtraci objednávek

2. ✅ **Dokumentace**
   - Aktualizovat README
   - Vytvořit příklady použití
   - Zdokumentovat API endpointy

---

## 📊 Příklady použití (Use Cases)

### Use Case 1: NAMESTEK vidí celý svůj úsek + konkrétní lidi

**Scénář:**  
Jan Černohorský (NAMESTEK, IT úsek) chce vidět:
- Všechny objednávky z IT úseku
- Objednávky Holovského (THP, jiný úsek)
- Objednávky Sulganové (THP, jiný úsek)

**Implementace:**
```sql
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1,
  usek_id,  -- IT úsek
  personalized_users,  -- Holovský, Sulganová
  scope, viditelnost_objednavky, uroven_prav_objednavky
) VALUES (
  2, 'VIDITELNOST', 'user-department', 85,
  3,  -- Úsek IT
  '[52, 87]',  -- Holovský (52), Sulganová (87)
  'TEAM', 1, 'READ_ONLY'
);
```

**Výsledek:**
- Černohorský uvidí objednávky VŠECH z IT úseku
- + objednávky Holovského
- + objednávky Sulganové

---

### Use Case 2: Zaměstnanec vidí konkrétní kolegy

**Scénář:**  
Uživatel Rusy (běžný zaměstnanec) potřebuje vidět objednávky:
- Kvapilové
- Lungerové
- Wlachové

**Implementace:**
```sql
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1,
  personalized_users,
  viditelnost_objednavky, uroven_prav_objednavky
) VALUES (
  2, 'VIDITELNOST', 'user-user', 91,
  '[45, 67, 89]',  -- Kvapilová, Lungerová, Wlachová
  1, 'READ_ONLY'
);
```

---

### Use Case 3: Viditelnost podle lokalit

**Scénář:**  
Vedoucí pobočky vidí objednávky z Kladna a Benešova.

**Implementace:**
```sql
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1,
  rozsirene_lokality,
  scope, viditelnost_objednavky
) VALUES (
  2, 'VIDITELNOST', 'user-location', 100,
  '[5, 8]',  -- Kladno (5), Benešov (8)
  'LOCATION', 1
);
```

---

### Use Case 4: Kombinace více profilů

**Scénář:**  
Uživatel má 2 aktivní profily:
1. PROF-NOTIF-MAIN (notifikace)
2. VIDITELNOST-NAMESTEK (viditelnost)

**Implementace:**
```sql
-- Profil 1: Notifikace
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('PROF-NOTIF-MAIN', 'NOTIFIKACE', 1);

INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1, user_id_2,
  notifikace_inapp, notifikace_email
) VALUES (
  1, 'NOTIFIKACE', 'user-user', 85, 52,
  1, 1
);

-- Profil 2: Viditelnost
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('VIDITELNOST-NAMESTEK', 'VIDITELNOST', 1);

INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, typ_vztahu, user_id_1, usek_id,
  scope, viditelnost_objednavky
) VALUES (
  2, 'VIDITELNOST', 'user-department', 85, 3,
  'TEAM', 1
);
```

**Výsledek:**
- Černohorský dostává notifikace od Holovského (profil 1)
- + vidí objednávky celého IT úseku (profil 2)

---

## ⚠️ Důležité poznámky

### 1. Priorita pravidel
Pokud má uživatel více vztahů, které se překrývají, aplikuje se **nejpřísnější pravidlo**.

**Příklad:**
- Vztah 1: Scope = TEAM, uroven_prav = READ_ONLY
- Vztah 2: Scope = LOCATION, uroven_prav = READ_WRITE

→ Výsledek: Scope = LOCATION (širší), uroven_prav = READ_WRITE (silnější)

### 2. Performance
Pro velké počty uživatelů/vztahů doporučuji:
- ✅ Cache výsledků `getVisibleOrderIdsForUser()` (Redis, 5 min TTL)
- ✅ Materialized views pro častá spojení
- ✅ Denormalizace pro rychlé filtrování

### 3. Zpětná kompatibilita
Všechny změny jsou zpětně kompatibilní:
- ✅ Nová pole mají DEFAULT hodnoty
- ✅ Staré profily budou fungovat (typ = KOMBINOVANY)
- ✅ Staré vztahy budou fungovat (profil_type = ALL)

---

## ✅ Checklist před implementací

### Databáze
- [ ] Zálohovat produkční DB
- [ ] Spustit migrace na DEV
- [ ] Ověřit SHOW CREATE TABLE
- [ ] Vytvořit testovací data
- [ ] Otestovat SQL dotazy

### Backend
- [ ] Vytvořit `hierarchyVisibilityFilters.php`
- [ ] Rozšířit `hierarchyHandlers_v2.php`
- [ ] Integrovat do `orderV2Endpoints.php`
- [ ] Napsat unit testy
- [ ] Otestovat API endpointy

### Frontend
- [ ] Vytvořit `EdgeConfigPanel.jsx`
- [ ] Vytvořit `UserMultiSelect.jsx`
- [ ] Upravit ukládání hierarchie
- [ ] Přidat filtraci profilů
- [ ] Otestovat v prohlížeči

### Dokumentace
- [ ] Aktualizovat README
- [ ] Vytvořit příklady použití
- [ ] Zdokumentovat API
- [ ] Vytvořit migration guide

---

## 📞 Kontakt & Podpora

**Autor:** Robert Novák (robex08)  
**Datum:** 15. ledna 2026  
**Status:** Připraveno k implementaci o víkendu

---

## 🎉 Závěr

Máme **pevný základ** v podobě:
- ✅ 2 tabulky hierarchie (profily + vztahy)
- ✅ Vizuální NODE/EDGE editor
- ✅ Backend API pro načítání/ukládání
- ✅ Podporu pro lokality, úseky, role

**Co zbývá:**
1. ✅ Přidat 2 sloupce do DB (`typ_profilu`, `profil_type`, `personalized_users`)
2. ✅ Rozšířit backend logiku o filtrování
3. ✅ Upravit frontend UI pro nová pole
4. ✅ Otestovat

**Odhadovaný čas implementace:** 12-15 hodin (sobota + neděle)

💪 **Můžeme to stihnout o víkendu!**
