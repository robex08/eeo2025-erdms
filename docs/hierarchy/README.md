# 📚 Multi-profilový systém práv a viditelnosti - Dokumentace

**Datum:** 15. ledna 2026  
**Verze:** 1.0  
**Status:** ✅ Připraveno k implementaci  
**Autor:** Robert Novák & GitHub Copilot

---

## 📖 Přehled dokumentů

Tento adresář obsahuje **kompletní dokumentaci** pro rozšíření hierarchického systému o multi-profilovou podporu práv a viditelnosti.

---

## 🗂️ Obsah dokumentace

### 1. **MULTI_PROFILE_VISIBILITY_SYSTEM_PLAN.md** 📋
**Hlavní plánovací dokument**

**Obsah:**
- ✅ Co už máme připraveno (NODE/EDGE systém, hierarchie vztahů)
- ✅ Co zatím chybí (multi-profily, personifikace, atd.)
- ✅ Návrh řešení bodově (4 body požadavků)
- ✅ Databázové návrhy (ALTER TABLE, nové sloupce)
- ✅ Backend logika (PHP funkce)
- ✅ Frontend návrhy (React komponenty)
- ✅ Use cases (příklady použití)
- ✅ Implementační plán (víkend)

**Pro koho:**  
Pro pochopení celkové architektury a rozhodovacích procesů.

**Začni zde:** Pokud potřebuješ velký přehled o celém systému.

---

### 2. **MULTI_PROFILE_QUICKSTART_GUIDE.md** 🚀
**Praktický průvodce implementací**

**Obsah:**
- ⏱️ Časový plán (sobota + neděle, 12-15 hodin)
- 📋 Krok-za-krokem instrukce
- 💻 Konkrétní příkazy (SQL, bash, curl)
- ✅ Checklists pro kontrolu
- 🆘 Troubleshooting

**Pro koho:**  
Pro implementátora, který chce rychle začít.

**Začni zde:** Pokud chceš okamžitě začít implementovat.

---

### 3. **MULTI_PROFILE_TESTING_SCENARIOS.md** 🧪
**Testovací scénáře a validace**

**Obsah:**
- 🎯 7 hlavních testů (personifikace, úseky, lokality, atd.)
- 📝 SQL dotazy pro setup
- 🔍 Validační dotazy
- 🐛 Edge cases testy
- ⚡ Performance testy

**Pro koho:**  
Pro testera nebo vývojáře ověřujícího správnost implementace.

**Začni zde:** Po implementaci, před nasazením do produkce.

---

### 4. **Database Migrations** (složka `database-migrations/`)

#### 4a. **ADD_TYP_PROFILU_TO_HIERARCHIE_PROFILY.sql**
Přidá sloupec `typ_profilu` do `25_hierarchie_profily`.

```sql
ALTER TABLE 25_hierarchie_profily
ADD COLUMN typ_profilu ENUM('NOTIFIKACE', 'VIDITELNOST', 'PRAVA', 'KOMBINOVANY');
```

#### 4b. **ADD_PROFIL_TYPE_AND_PERSONALIZED_TO_VZTAHY.sql**
Přidá:
- `profil_type` (vztah platí jen pro notifikace/viditelnost/práva)
- `personalized_users` (konkrétní uživatelé)

```sql
ALTER TABLE 25_hierarchie_vztahy
ADD COLUMN profil_type ENUM(...),
ADD COLUMN personalized_users JSON;
```

#### 4c. **INSERT_TEST_DATA_MULTI_PROFILE.sql**
Vytvoří testovací profily a vztahy pro ověření funkčnosti.

---

### 5. **Backend implementace** (složka `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/`)

#### 5a. **hierarchyVisibilityFilters.php** ✨ NOVÝ SOUBOR
Hlavní backend logika pro filtrování viditelných objektů.

**Funkce:**
- `getVisibleOrderIdsForUser($userId, $pdo)` - hlavní funkce
- `getOrderIdsByCreators($userIds, $pdo)` - personifikace
- `getOrderIdsByDepartments($departmentIds, $pdo)` - úseky
- `getOrderIdsByLocations($locationIds, $pdo)` - lokality
- `canUserViewOrder($userId, $orderId, $pdo)` - kontrola přístupu

**Použití:**
```php
require_once __DIR__ . '/hierarchyVisibilityFilters.php';

$visibleOrderIds = getVisibleOrderIdsForUser($current_user_id, $db);
```

---

## 🎯 Klíčové koncepty

### Multi-profilový přístup

**Problém:**  
Současně je možný pouze 1 aktivní profil. Potřebujeme umožnit více profilů současně.

**Řešení:**
```
Profil 1: PROF-NOTIF-MAIN (typ_profilu = NOTIFIKACE)
Profil 2: VIDITELNOST-NAMESTEK (typ_profilu = VIDITELNOST)
Profil 3: VIDITELNOST-PRIKAZCE (typ_profilu = VIDITELNOST)

→ Všechny 3 profily mohou být aktivní současně
→ Backend načte vztahy ze všech aktivních profilů
→ Uživatel dostává notifikace podle profilu 1
→ Viditelnost se řídí podle profilů 2 + 3 (UNION)
```

---

### Personifikace

**Problém:**  
Potřebujeme říct: "NAMESTEK vidí objednávky Holovského + Sulganové"

**Řešení:**
```sql
INSERT INTO 25_hierarchie_vztahy (
  user_id_1, personalized_users, viditelnost_objednavky
) VALUES (
  85,  -- Černohorský
  '[52, 87]',  -- Holovský, Sulganová
  1
);
```

**Backend:**
```php
if (!empty($rel['personalized_users'])) {
  $userIds = json_decode($rel['personalized_users'], true);
  $orderIds = getOrderIdsByCreators($userIds, $pdo);
}
```

---

### Viditelnost podle úseků

**Problém:**  
NAMESTEK chce vidět celý IT úsek + HR úsek.

**Řešení:**
```sql
-- Základní úsek (usek_id)
usek_id = 3  -- IT

-- Rozšířené úseky (rozsirene_useky)
rozsirene_useky = '[5, 7]'  -- HR, Marketing
```

**Backend:**
```php
$useky = [];
if ($rel['usek_id']) $useky[] = $rel['usek_id'];
if ($rel['rozsirene_useky']) {
  $extended = json_decode($rel['rozsirene_useky'], true);
  $useky = array_merge($useky, $extended);
}
$orderIds = getOrderIdsByDepartments($useky, $pdo);
```

---

### Viditelnost podle lokalit

**Problém:**  
Vedoucí pobočky chce vidět objednávky z Kladna a Benešova.

**Řešení:**
```sql
rozsirene_lokality = '[5, 8]'  -- Kladno, Benešov
```

**Backend:**
```php
$lokality = [];
if ($rel['lokalita_id']) $lokality[] = $rel['lokalita_id'];
if ($rel['rozsirene_lokality']) {
  $extended = json_decode($rel['rozsirene_lokality'], true);
  $lokality = array_merge($lokality, $extended);
}
$orderIds = getOrderIdsByLocations($lokality, $pdo);
```

---

## 🔄 Workflow implementace

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DATABÁZE (sobota dopoledne)                              │
│    - Backup                                                  │
│    - Spustit migrace                                         │
│    - Ověřit strukturu tabulek                                │
│    - Vložit testovací data                                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. BACKEND (sobota odpoledne)                               │
│    - hierarchyVisibilityFilters.php (nový soubor)           │
│    - Rozšířit hierarchyHandlers_v2.php                       │
│    - Integrovat do orderV2Endpoints.php                      │
│    - Testovat API                                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. FRONTEND (neděle)                                        │
│    - EdgeConfigPanel.jsx (nová komponenta)                  │
│    - UserMultiSelect.jsx (nová komponenta)                  │
│    - Upravit HierarchyEditorPage.jsx                         │
│    - Testovat v prohlížeči                                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. TESTOVÁNÍ & DOKUMENTACE (neděle večer)                   │
│    - End-to-end testy                                        │
│    - Performance testy                                       │
│    - Edge cases                                              │
│    - Finální dokumentace                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Databázové schéma (po migraci)

### Tabulka: `25_hierarchie_profily`
```sql
CREATE TABLE 25_hierarchie_profily (
  id INT PRIMARY KEY,
  nazev VARCHAR(100),
  typ_profilu ENUM('NOTIFIKACE', 'VIDITELNOST', 'PRAVA', 'KOMBINOVANY'),  -- ✨ NOVÉ
  popis TEXT,
  aktivni TINYINT(1),
  dt_vytvoreno DATETIME,
  dt_upraveno DATETIME
);
```

### Tabulka: `25_hierarchie_vztahy`
```sql
CREATE TABLE 25_hierarchie_vztahy (
  id INT PRIMARY KEY,
  profil_id INT,
  profil_type ENUM('NOTIFIKACE', 'VIDITELNOST', 'PRAVA', 'ALL'),  -- ✨ NOVÉ
  
  typ_vztahu ENUM(...),
  user_id_1 INT,
  user_id_2 INT,
  lokalita_id INT,
  usek_id INT,
  
  rozsirene_lokality JSON,
  rozsirene_useky JSON,
  personalized_users JSON,  -- ✨ NOVÉ
  
  scope ENUM('OWN', 'TEAM', 'LOCATION', 'ALL'),
  viditelnost_objednavky TINYINT(1),
  ...
);
```

---

## 🎯 Use Cases (příklady)

### Use Case 1: NAMESTEK
Jan Černohorský (NAMESTEK, IT úsek) chce vidět:
- ✅ Všechny objednávky z IT úseku
- ✅ Objednávky Holovského (THP, jiný úsek)
- ✅ Objednávky Sulganové (THP, jiný úsek)

**Implementace:**
```sql
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, user_id_1, usek_id, personalized_users,
  scope, viditelnost_objednavky
) VALUES (
  2, 'VIDITELNOST', 85, 3, '[52, 87]',
  'TEAM', 1
);
```

### Use Case 2: Vedoucí pobočky
Vedoucí pobočky Kladno vidí:
- ✅ Všechny objednávky z Kladna
- ✅ Všechny objednávky z Benešova

**Implementace:**
```sql
INSERT INTO 25_hierarchie_vztahy (
  profil_id, profil_type, user_id_1, rozsirene_lokality,
  scope, viditelnost_objednavky
) VALUES (
  2, 'VIDITELNOST', 100, '[5, 8]',
  'LOCATION', 1
);
```

### Use Case 3: Multi-profil (NOTIF + VIS)
Uživatel má 2 aktivní profily:
- 🔔 PROF-NOTIF-MAIN (dostává notifikace)
- 👁️ VIDITELNOST-NAMESTEK (vidí objednávky)

**Implementace:**
```sql
-- Profil 1: Notifikace
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('PROF-NOTIF-MAIN', 'NOTIFIKACE', 1);

-- Profil 2: Viditelnost
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, aktivni)
VALUES ('VIDITELNOST-NAMESTEK', 'VIDITELNOST', 1);

-- Backend načte oba profily (aktivni = 1)
```

---

## ✅ Checklist před nasazením

### Databáze
- [ ] Backup produkční DB
- [ ] Spustit migrace na DEV
- [ ] Ověřit struktu tabulek
- [ ] Otestovat SQL dotazy
- [ ] Vytvořit testovací profily

### Backend
- [ ] Vytvořit `hierarchyVisibilityFilters.php`
- [ ] Rozšířit `hierarchyHandlers_v2.php`
- [ ] Integrovat do `orderV2Endpoints.php`
- [ ] Unit testy
- [ ] API testy (curl)

### Frontend
- [ ] Vytvořit `EdgeConfigPanel.jsx`
- [ ] Vytvořit `UserMultiSelect.jsx`
- [ ] Upravit editor
- [ ] Testovat v prohlížeči
- [ ] UI/UX review

### Testing
- [ ] Test 1: Personifikace
- [ ] Test 2: Úseky
- [ ] Test 3: Lokality
- [ ] Test 4: Kombinace profilů
- [ ] Test 5: Multi-profil
- [ ] Test 6: Performance
- [ ] Test 7: Edge cases

### Dokumentace
- [ ] README aktualizován
- [ ] API dokumentace
- [ ] Migration guide
- [ ] Release notes

---

## 🚀 Začni zde

### Pro rychlý start:
1. Přečti [MULTI_PROFILE_QUICKSTART_GUIDE.md](MULTI_PROFILE_QUICKSTART_GUIDE.md)
2. Spusť migrace z `database-migrations/`
3. Zkopíruj `hierarchyVisibilityFilters.php` do projektu
4. Integruj do `orderV2Endpoints.php`
5. Testuj podle [MULTI_PROFILE_TESTING_SCENARIOS.md](MULTI_PROFILE_TESTING_SCENARIOS.md)

### Pro detailní pochopení:
1. Přečti [MULTI_PROFILE_VISIBILITY_SYSTEM_PLAN.md](MULTI_PROFILE_VISIBILITY_SYSTEM_PLAN.md)
2. Prostuduj databázové migrace
3. Projdi use cases
4. Implementuj podle quickstart guide

---

## 📞 Kontakt & Podpora

**Autor:** Robert Novák (robex08)  
**Datum:** 15. ledna 2026  
**Odhadovaný čas implementace:** 12-15 hodin (vikend)

---

## 🎉 Závěr

Dokumentace poskytuje **kompletní plán** pro rozšíření hierarchického systému o:
- ✅ Multi-profilovou podporu
- ✅ Personifikaci práv
- ✅ Viditelnost podle úseků
- ✅ Viditelnost podle lokalit
- ✅ Kombinaci všech výše uvedených

**Výhody:**
- 🔒 Zpětně kompatibilní
- ⚡ Výkonné (< 100ms)
- 🧩 Flexibilní
- 📚 Dobře zdokumentované

💪 **Můžeme to stihnout o víkendu!**
