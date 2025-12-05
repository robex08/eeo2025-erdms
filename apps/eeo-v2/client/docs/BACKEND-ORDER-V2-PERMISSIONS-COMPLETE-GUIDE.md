# 🔐 BACKEND: Kompletní Průvodce - Order V2 API Permissions

**Datum:** 11. listopadu 2025  
**Priorita:** 🔴 **KRITICKÁ**  
**Pro:** Backend Developer

---

## 📋 STRUČNÝ SOUHRN

**PROBLÉM:** Uživatelé s omezenými právy (`ORDER_READ_OWN`) nevidí **archivované objednávky**, i když mají permission `ORDER_OLD`.

**DŮVOD:** Backend aplikuje stejný filtr pro všechny objednávky, včetně `stav_objednavky != 'ARCHIVOVANO'`.

**ŘEŠENÍ:** Pro uživatele s `ORDER_OLD` musí backend použít **HYBRIDNÍ SQL** - vrátit všechny archivované + jen svoje nearchivované.

---

## 🎯 CO MUSÍ BACKEND DĚLAT

### **1. Validace tokenu a získání user_id**

```php
<?php
$token_data = validateToken($request['token']);
if (!$token_data) {
    return ['status' => 'error', 'message' => 'Invalid token'];
}

$user_id = $token_data['user_id']; // Token obsahuje POUZE user_id
?>
```

### **2. Načtení rolí z databáze**

```sql
-- Načti role uživatele
SELECT r.kod_role 
FROM 25_uzivatel_role ur
JOIN 25_role r ON ur.role_id = r.id
WHERE ur.uzivatel_id = :user_id
  AND ur.aktivni = 1
```

**Příklad výstupu:** `['SUPERADMIN']`, `['ADMINISTRATOR']`, `['UZIVATEL']`

### **3. Načtení permissions z databáze**

```sql
-- Načti VŠECHNA práva uživatele (z rolí + přímá přiřazení)
SELECT DISTINCT p.kod_prava 
FROM 25_prava p
WHERE p.id IN (
  -- Práva z rolí
  SELECT rp.pravo_id 
  FROM 25_role_prava rp
  JOIN 25_uzivatel_role ur ON rp.role_id = ur.role_id
  WHERE ur.uzivatel_id = :user_id
    AND ur.aktivni = 1
  
  UNION
  
  -- Přímá přiřazení práv
  SELECT up.pravo_id 
  FROM 25_uzivatel_prava up
  WHERE up.uzivatel_id = :user_id
)
```

**Příklad výstupu:** `['ORDER_READ_OWN', 'ORDER_EDIT_OWN', 'ORDER_OLD']`

---

## 🔍 DETEKCE ADMIN PRÁV

### **Tři úrovně přístupů:**

| Úroveň | Role | Permissions | Vidí objednávky | Vidí archivované |
|--------|------|-------------|-----------------|------------------|
| **1. FULL ADMIN** | `SUPERADMIN` nebo `ADMINISTRATOR` | Jakékoliv | ✅ VŠECHNY (bez filtru) | ✅ VŠECHNY |
| **2. PERMISSION ADMIN** | Jakákoliv | `ORDER_MANAGE`, `ORDER_*_ALL` | ✅ VŠECHNY (bez filtru) | ✅ VŠECHNY |
| **3. ORDER_OLD** | Jakákoliv | `ORDER_OLD` | ⚠️ Jen svoje nearchivované | ✅ VŠECHNY archivované |
| **4. BĚŽNÝ USER** | Jakákoliv | `ORDER_*_OWN` | ⚠️ Jen svoje (12-role WHERE) | ❌ ŽÁDNÉ |

### **Implementace detekce:**

```php
<?php
// 1. ADMIN ROLE
$isAdminByRole = 
    in_array('SUPERADMIN', $user_roles) ||
    in_array('ADMINISTRATOR', $user_roles);

// 2. ADMIN PERMISSIONS
$hasAdminPermissions = 
    in_array('ORDER_MANAGE', $user_permissions) ||
    in_array('ORDER_READ_ALL', $user_permissions) ||
    in_array('ORDER_VIEW_ALL', $user_permissions) ||
    in_array('ORDER_EDIT_ALL', $user_permissions) ||
    in_array('ORDER_DELETE_ALL', $user_permissions);

// 3. ORDER_OLD (speciální právo pro archivované)
$hasOrderOld = in_array('ORDER_OLD', $user_permissions);

// 4. VÝSLEDNÁ DETEKCE
$is_admin = $isAdminByRole || $hasAdminPermissions;
?>
```

---

## 🚀 SQL DOTAZY PODLE PERMISSIONS

### **Případ 1: FULL ADMIN (role nebo permissions)**

```sql
-- Vidí VŠECHNY objednávky (žádný role filtr)
SELECT * FROM 25a_objednavky 
WHERE 1=1
  AND dt_objednavky >= :datum_od
  AND dt_objednavky <= :datum_do
ORDER BY dt_objednavky DESC;
```

### **Případ 2: ORDER_OLD (bez admin práv)**

```sql
-- HYBRIDNÍ přístup:
-- ✅ ARCHIVOVANÉ: Vidí VŠECHNY (bez role filtru)
-- ⚠️ NEARCHIVOVANÉ: Jen kde má roli (12-role WHERE)

SELECT * FROM 25a_objednavky 
WHERE (
  -- ARCHIVOVANÉ: Bez role filtru
  stav_objednavky = 'ARCHIVOVANO'
  
  OR
  
  -- NEARCHIVOVANÉ: Jen svoje (12 rolí)
  (
    stav_objednavky != 'ARCHIVOVANO'
    AND (
      uzivatel_id = :user_id                      -- 1. Autor
      OR objednatel_id = :user_id                 -- 2. Objednatel
      OR garant_uzivatel_id = :user_id            -- 3. Garant
      OR schvalovatel_id = :user_id               -- 4. Schvalovatel
      OR prikazce_id = :user_id                   -- 5. Příkazce
      OR uzivatel_akt_id = :user_id               -- 6. Poslední editor
      OR odesilatel_id = :user_id                 -- 7. Odeslal dodavateli
      OR dodavatel_potvrdil_id = :user_id         -- 8. Potvrdil akceptaci
      OR zverejnil_id = :user_id                  -- 9. Zveřejnil
      OR fakturant_id = :user_id                  -- 10. Přidal fakturu
      OR dokoncil_id = :user_id                   -- 11. Dokončil
      OR potvrdil_vecnou_spravnost_id = :user_id  -- 12. Potvrdil věcnou správnost
    )
  )
)
AND dt_objednavky >= :datum_od
AND dt_objednavky <= :datum_do
ORDER BY dt_objednavky DESC;
```

### **Případ 3: BĚŽNÝ UŽIVATEL (ORDER_*_OWN)**

```sql
-- Vidí JEN svoje nearchivované objednávky (12-role WHERE)
SELECT * FROM 25a_objednavky 
WHERE (
  uzivatel_id = :user_id
  OR objednatel_id = :user_id
  OR garant_uzivatel_id = :user_id
  OR schvalovatel_id = :user_id
  OR prikazce_id = :user_id
  OR uzivatel_akt_id = :user_id
  OR odesilatel_id = :user_id
  OR dodavatel_potvrdil_id = :user_id
  OR zverejnil_id = :user_id
  OR fakturant_id = :user_id
  OR dokoncil_id = :user_id
  OR potvrdil_vecnou_spravnost_id = :user_id
)
AND stav_objednavky != 'ARCHIVOVANO'  -- ❌ BEZ archivovaných
AND dt_objednavky >= :datum_od
AND dt_objednavky <= :datum_do
ORDER BY dt_objednavky DESC;
```

---

## 📝 KOMPLETNÍ PHP IMPLEMENTACE

```php
<?php
function handle_order_v2_list_enriched($request) {
    // 1. Validace tokenu
    $token_data = validateToken($request['token']);
    if (!$token_data) {
        return ['status' => 'error', 'message' => 'Invalid token'];
    }
    
    $user_id = $token_data['user_id'];
    
    // 2. Načti role a permissions z DB
    $user_roles = getUserRolesFromDB($user_id);
    $user_permissions = getUserPermissionsFromDB($user_id);
    
    // 3. Detekuj admin práva
    $isAdminByRole = 
        in_array('SUPERADMIN', $user_roles) ||
        in_array('ADMINISTRATOR', $user_roles);
    
    $hasAdminPermissions = 
        in_array('ORDER_MANAGE', $user_permissions) ||
        in_array('ORDER_READ_ALL', $user_permissions) ||
        in_array('ORDER_VIEW_ALL', $user_permissions) ||
        in_array('ORDER_EDIT_ALL', $user_permissions) ||
        in_array('ORDER_DELETE_ALL', $user_permissions);
    
    $is_admin = $isAdminByRole || $hasAdminPermissions;
    $hasOrderOld = in_array('ORDER_OLD', $user_permissions);
    
    // 4. Sestav SQL podle permissions
    $params = [':user_id' => $user_id];
    
    if ($is_admin) {
        // FULL ADMIN - žádný role filtr
        $sql = "SELECT * FROM 25a_objednavky WHERE 1=1";
        
    } else if ($hasOrderOld) {
        // ORDER_OLD - hybridní přístup
        $sql = "SELECT * FROM 25a_objednavky WHERE (
            stav_objednavky = 'ARCHIVOVANO'
            OR (
                stav_objednavky != 'ARCHIVOVANO'
                AND (
                    uzivatel_id = :user_id
                    OR objednatel_id = :user_id
                    OR garant_uzivatel_id = :user_id
                    OR schvalovatel_id = :user_id
                    OR prikazce_id = :user_id
                    OR uzivatel_akt_id = :user_id
                    OR odesilatel_id = :user_id
                    OR dodavatel_potvrdil_id = :user_id
                    OR zverejnil_id = :user_id
                    OR fakturant_id = :user_id
                    OR dokoncil_id = :user_id
                    OR potvrdil_vecnou_spravnost_id = :user_id
                )
            )
        )";
        
    } else {
        // BĚŽNÝ USER - 12-role filtr + bez archivovaných
        $sql = "SELECT * FROM 25a_objednavky WHERE (
            uzivatel_id = :user_id
            OR objednatel_id = :user_id
            OR garant_uzivatel_id = :user_id
            OR schvalovatel_id = :user_id
            OR prikazce_id = :user_id
            OR uzivatel_akt_id = :user_id
            OR odesilatel_id = :user_id
            OR dodavatel_potvrdil_id = :user_id
            OR zverejnil_id = :user_id
            OR fakturant_id = :user_id
            OR dokoncil_id = :user_id
            OR potvrdil_vecnou_spravnost_id = :user_id
        )
        AND stav_objednavky != 'ARCHIVOVANO'";
    }
    
    // 5. Přidej datumové filtry
    if (!empty($request['datum_od'])) {
        $sql .= " AND dt_objednavky >= :datum_od";
        $params[':datum_od'] = $request['datum_od'];
    }
    
    if (!empty($request['datum_do'])) {
        $sql .= " AND dt_objednavky <= :datum_do";
        $params[':datum_do'] = $request['datum_do'];
    }
    
    // 6. Frontend filtr archivovaných (pokud nemá ORDER_OLD)
    // ⚠️ DŮLEŽITÉ: Pokud má ORDER_OLD, tento filtr IGNORUJEME!
    if (empty($request['archivovano']) && !$hasOrderOld && !$is_admin) {
        // Frontend NEPOŽADUJE archivované a user NEMÁ právo je vidět
        // (Tento řádek je už obsažen v SQL pro běžné uživatele)
    }
    
    $sql .= " ORDER BY dt_objednavky DESC";
    
    // 7. Spusť dotaz
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 8. Vrať výsledek
    return [
        'status' => 'ok',
        'data' => $orders,
        'meta' => [
            'count' => count($orders),
            'is_admin' => $is_admin,
            'has_order_old' => $hasOrderOld,
            'user_id' => $user_id
        ]
    ];
}
?>
```

---

## ✅ CHECKLIST PRO BACKEND DEVELOPERA

- [ ] Implementovat načtení **rolí** z DB (`getUserRolesFromDB()`)
- [ ] Implementovat načtení **permissions** z DB (`getUserPermissionsFromDB()`)
- [ ] Přidat kontrolu **admin role** (`SUPERADMIN`, `ADMINISTRATOR`)
- [ ] Přidat kontrolu **admin permissions** (`ORDER_MANAGE`, `ORDER_*_ALL`)
- [ ] Implementovat **hybridní SQL** pro `ORDER_OLD` (všechny archivované + svoje nearchivované)
- [ ] Otestovat s uživatelem **S admin právy** (měl by vidět všechny objednávky)
- [ ] Otestovat s uživatelem **S ORDER_OLD** (měl by vidět všechny archivované + svoje nearchivované)
- [ ] Otestovat s uživatelem **BEZ ORDER_OLD** (měl by vidět jen svoje nearchivované)
- [ ] Ověřit že frontend checkbox **"Zobrazit archivované"** funguje správně
- [ ] Deployovat změnu na PROD

---

## 🧪 TESTOVACÍ SCÉNÁŘE

### **Test 1: SUPERADMIN**
- **Uživatel:** user_id=1, role=`SUPERADMIN`
- **Očekávaný výsledek:** Vidí VŠECHNY objednávky (včetně archivovaných)
- **SQL:** `WHERE 1=1` (bez role filtru)

### **Test 2: Uživatel s ORDER_OLD**
- **Uživatel:** user_id=5, permissions=`['ORDER_READ_OWN', 'ORDER_OLD']`
- **Očekávaný výsledek:** 
  - ✅ Všechny archivované objednávky (např. 200 objednávek)
  - ✅ Jen svoje nearchivované (např. 15 objednávek)
- **SQL:** Hybridní WHERE (viz výše)

### **Test 3: Běžný uživatel**
- **Uživatel:** user_id=10, permissions=`['ORDER_READ_OWN']`
- **Očekávaný výsledek:** Jen svoje nearchivované (např. 8 objednávek)
- **SQL:** 12-role WHERE + `stav_objednavky != 'ARCHIVOVANO'`

---

## 📞 KONTAKT

**Pokud máte otázky:**
- Frontend Developer: Tomáš Holoský
- Dokumentace: `/docs/BACKEND-ORDER-V2-ADMIN-PERMISSIONS-BUG.md`
