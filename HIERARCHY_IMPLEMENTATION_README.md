# 🌲 Hierarchie Workflow - Implementační dokumentace

**Datum:** 13. prosince 2025  
**Autor:** GitHub Copilot & robex08  
**Verze:** 1.0  
**Status:** ✅ Implementováno pro modul OBJEDNÁVKY

---

## 📋 Přehled

Hierarchie workflow je systém pro řízení viditelnosti dat podle organizačního řádu firmy. Umožňuje definovat vztahy nadřízenosti/podřízenosti mezi uživateli, úseky, lokalitami a organizacemi.

### ✨ Klíčové vlastnosti

1. **Hierarchie má PRIORITU** nad standardními právy a rolemi
2. Může **rozšířit i omezit** viditelnost dat
3. **Transparentní** - pokud vypnuta, systém funguje jako dříve
4. **Imunita** - specifičtí uživatelé mohou být vyjmuti (HIERARCHY_IMMUNE)

---

## 🎯 Implementované moduly

### ✅ Objednávky (Sprint 1)
- Seznam objednávek (`Orders25List`)
- Detail objednávky (`OrderForm25`)
- Univerzální vyhledávání v objednávkách

### 🔜 Plánované moduly

- **Sprint 2:** Pokladna
- **Sprint 3:** Faktury

---

## 🔐 Nové právo: HIERARCHY_IMMUNE

### Popis
Uživatel s tímto právem vidí všechna data **bez ohledu na hierarchii**. Hierarchie ho neomezuje ani nerozšiřuje viditelnost.

### Automaticky přiřazeno
- **SUPERADMIN**
- **ADMINISTRATOR**

### Manuální přiřazení
Konkrétním uživatelům můžete přiřadit přes SQL nebo admin UI:

```sql
-- Přiřadit právo uživateli
INSERT INTO 25_uzivatele_prava (uzivatel_id, pravo_id)
SELECT {USER_ID}, id FROM 25_prava WHERE kod_prava = 'HIERARCHY_IMMUNE';
```

---

## 📊 Databázová struktura

### Tabulky hierarchie

#### `hierarchy_profiles`
Profily organizačního řádu.

```sql
id              INT PRIMARY KEY
name            VARCHAR(255)    -- Název profilu (např. "Org. řád 2025")
description     TEXT
is_active       TINYINT         -- Je aktivní?
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

#### `hierarchy_relationships`
Vztahy nadřízenosti v rámci profilu.

```sql
id              INT PRIMARY KEY
profile_id      INT             -- FK na hierarchy_profiles
parent_id       INT             -- ID nadřízeného (user/úsek/lokalita/org)
child_id        INT             -- ID podřízeného
level_type      VARCHAR(50)     -- 'user', 'usek', 'lokalita', 'organizace'
is_active       TINYINT
created_at      TIMESTAMP
```

#### `global_settings`
Globální nastavení hierarchie.

```sql
hierarchy_enabled       TINYINT     -- 1 = zapnuto, 0 = vypnuto
hierarchy_profile_id    INT         -- FK na aktivní profil
hierarchy_logic         VARCHAR(10) -- 'OR' nebo 'AND'
```

---

## ⚙️ Backend implementace (PHP)

### Soubory

#### `hierarchyOrderFilters.php`
Obsahuje kompletní logiku hierarchické filtrace:

- `getHierarchySettings()` - načte nastavení z DB
- `isUserHierarchyImmune()` - zkontroluje HIERARCHY_IMMUNE právo
- `getVisibleOrderIdsForUser()` - vrátí ID viditelných objednávek
- `applyHierarchyFilterToOrders()` - aplikuje WHERE clause pro SQL
- `canUserViewOrder()` - zkontroluje přístup k jedné objednávce

#### `orderV2Endpoints.php`
Integrace hierarchie do API:

**`handle_order_v2_list()`** - seznam objednávek
```php
// Hierarchie se aplikuje PŘED role-based filtering
require_once __DIR__ . '/hierarchyOrderFilters.php';

$hierarchyFilter = applyHierarchyFilterToOrders($current_user_id, $db);
if ($hierarchyFilter !== null) {
    $whereConditions[] = $hierarchyFilter;
}
```

**`handle_order_v2_get()`** - detail objednávky
```php
if (!canUserViewOrder($current_user_id, $numeric_order_id, $db)) {
    http_response_code(403);
    echo json_encode([
        'status' => 'error',
        'message' => 'Nemáte oprávnění k zobrazení této objednávky'
    ]);
    return;
}
```

---

## ⚛️ Frontend implementace (React)

### Soubory

#### `hierarchyOrderService.js`
Frontend služba pro práci s hierarchií:

```javascript
import { getHierarchyStatus } from '../services/hierarchyOrderService';

const status = await getHierarchyStatus(userId, token, username);
console.log(status);
// {
//   hierarchyEnabled: true,
//   isImmune: false,
//   profileId: 1,
//   profileName: "Organizační řád 2025",
//   logic: "OR",
//   logicDescription: "Liberální..."
// }
```

#### `AuthContext.js`
Context rozšířen o `hierarchyStatus`:

```javascript
const { hierarchyStatus } = useContext(AuthContext);

if (hierarchyStatus.hierarchyEnabled && !hierarchyStatus.isImmune) {
  console.log('Hierarchie aktivní pro tohoto uživatele');
}
```

#### `OrderForm25.js`
Ošetření 403 erroru při načítání objednávky:

```javascript
try {
  dbOrder = await getOrderV2(editOrderId, token, username, true);
} catch (error) {
  if (error?.status === 403) {
    showToast('Nemáte oprávnění k zobrazení této objednávky', { type: 'error' });
    navigate('/orders25-list');
    return;
  }
}
```

---

## 🎮 Jak to funguje

### Scénář 1: Hierarchie vypnuta
```
1. User otevře seznam objednávek
2. Backend: hierarchyEnabled = false → SKIP hierarchii
3. Aplikují se pouze standardní práva (ORDER_VIEW, ORDER_EDIT_OWN, atd.)
4. User vidí data podle rolí
```

### Scénář 2: Hierarchie zapnuta + user má HIERARCHY_IMMUNE
```
1. User otevře seznam objednávek
2. Backend: hierarchyEnabled = true
3. Backend: isUserHierarchyImmune(userId) = true → SKIP hierarchii
4. User vidí VŠECHNA data (jako admin)
```

### Scénář 3: Hierarchie zapnuta + normální user
```
1. User otevře seznam objednávek
2. Backend: hierarchyEnabled = true
3. Backend: isUserHierarchyImmune(userId) = false
4. Backend: getVisibleOrderIdsForUser(userId, profileId, logic)
   → Vrátí array [1, 5, 8, 12, ...]
5. Backend přidá WHERE: o.id IN (1,5,8,12,...)
6. User vidí pouze objednávky z hierarchie
```

### Scénář 4: Logika OR vs AND

#### OR (liberální):
```sql
WHERE (
  o.uzivatel_id IN (10, 15, 20)        -- user má vztah s těmito uživateli
  OR o.usek_id IN (3, 7)                -- NEBO s těmito úseky
  OR o.lokalita_id IN (1)               -- NEBO s touto lokalitou
)
```
→ User vidí objednávku pokud splňuje **ALESPOŇ JEDNU** úroveň

#### AND (restriktivní):
```sql
WHERE (
  o.uzivatel_id IN (10, 15, 20)
  AND o.usek_id IN (3, 7)
  AND o.lokalita_id IN (1)
)
```
→ User vidí objednávku pouze pokud splňuje **VŠECHNY** úrovně současně

---

## 🧪 Testování

### Manuální test

1. **Přihlásit se jako SUPERADMIN**
   - V AppSettings zapnout hierarchii
   - Vybrat profil
   - Vybrat logiku (OR/AND)

2. **Přihlásit se jako normální user**
   - Otevřít seznam objednávek
   - Měli byste vidět pouze objednávky podle hierarchie

3. **Test HIERARCHY_IMMUNE**
   - Přiřadit právo uživateli
   - Ten by měl vidět VŠECHNY objednávky

### SQL test
```sql
-- Spustit SQL migraci
SOURCE /var/www/erdms-dev/docs/development/sql-migrations/ADD_HIERARCHY_IMMUNE_PERMISSION.sql;

-- Verifikace
SELECT * FROM 25_prava WHERE kod_prava = 'HIERARCHY_IMMUNE';
SELECT * FROM 25_role_prava rp
INNER JOIN 25_prava p ON p.id = rp.pravo_id
WHERE p.kod_prava = 'HIERARCHY_IMMUNE';
```

### PHP test
Můžete použít `test-hierarchy-api.php`:

```bash
cd /var/www/erdms-dev
php test-hierarchy-api.php
```

---

## 📦 Soubory v implementaci

### Backend (PHP)
```
apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/
├── hierarchyOrderFilters.php          # ✅ NOVÝ - logika hierarchie
└── orderV2Endpoints.php               # ✅ UPRAVENO - integrace

docs/development/sql-migrations/
└── ADD_HIERARCHY_IMMUNE_PERMISSION.sql # ✅ NOVÝ - SQL migrace
```

### Frontend (React)
```
apps/eeo-v2/client/src/
├── services/
│   └── hierarchyOrderService.js       # ✅ NOVÝ - FE služba
├── context/
│   └── AuthContext.js                 # ✅ UPRAVENO - hierarchyStatus
└── forms/
    └── OrderForm25.js                 # ✅ UPRAVENO - 403 handling
```

---

## 🔄 Git commits

1. **RH IMPLEMENTCE HIERACHIE 01** - Validace výběru profilu hierarchie
2. **RH IMPLEMENTCE HIERACHIE 02** - Backend PHP hierarchie pro objednávky
3. **RH IMPLEMENTCE HIERACHIE 03** - Frontend React hierarchie pro objednávky

---

## 🚀 Další kroky

### Okamžitě
- [ ] Spustit SQL migraci na DEV databázi
- [ ] Testovat s testovacími daty
- [ ] Verifikovat 403 errory v prohlížeči

### Sprint 2
- [ ] Implementovat hierarchii pro modul Pokladna
- [ ] Upravit API endpointy pro cashbook

### Sprint 3
- [ ] Implementovat hierarchii pro modul Faktury
- [ ] Upravit API endpointy pro invoices

---

## ⚠️ Důležité poznámky

1. **Hierarchie NENAHRAZUJE práva** - doplňuje je!
2. **Backend je autoritativní** - frontend jen zobrazuje errory
3. **HIERARCHY_IMMUNE > hierarchie** - imunní uživatelé vidí vše
4. **Vypnutá hierarchie = žádný vliv** - systém funguje jako dříve
5. **Univerzální vyhledávání** už automaticky respektuje hierarchii (používá stejné API)

---

## 📞 Kontakt

- **Vývojář:** robex08
- **AI asistent:** GitHub Copilot (Claude Sonnet 4.5)
- **Datum:** 13. prosince 2025

---

**✅ Implementace kompletní pro modul OBJEDNÁVKY**

*"Snad to aplikace přežije..."* 🙏
