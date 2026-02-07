# 🔐 Permission Validation Rules & Konfliktní kombinace

**Datum vytvoření:** 19. ledna 2026  
**Účel:** Definice pravidel pro validaci oprávnění, prevence konfliktních kombinací

---

## 📋 Obsah

1. [Základní principy](#základní-principy)
2. [Cashbook permissions](#cashbook-permissions)
3. [Order permissions](#order-permissions)
4. [Validační pravidla](#validační-pravidla)
5. [SQL detekce problémů](#sql-detekce-problémů)
6. [Implementační návrh](#implementační-návrh)

---

## 🎯 Základní principy

### Hierarchie oprávnění (od nejvyššího):

1. **SUPERADMIN / ADMINISTRATOR** - absolutní přístup
2. **MANAGE / *_ALL** - správa všech entit
3. ***_SUBORDINATE / *_DEPARTMENT** - přístup k entitám podřízených
4. ***_OWN** - přístup pouze k vlastním entitám
5. **Žádné oprávnění** - žádný přístup

### Klíčové pravidlo:

> **Vyšší oprávnění OBSAHUJE funkcionalitu nižších oprávnění.**
> 
> Pokud má uživatel `READ_ALL`, nepotřebuje `READ_OWN` (je redundantní).
> Pokud má `DELETE_ALL`, nepotřebuje `DELETE_OWN` (je redundantní).

---

## 💰 Cashbook Permissions

### Úrovně oprávnění (priorita):

| Priorita | Oprávnění | Popis | Obsahuje |
|----------|-----------|-------|----------|
| 1️⃣ | `CASH_BOOK_MANAGE` | Kompletní správa včetně zamykání | Všechna ostatní |
| 2️⃣ | `CASH_BOOK_*_ALL` | Operace na všech pokladnách | Příslušné `*_OWN` |
| 3️⃣ | `CASH_BOOK_*_OWN` | Operace na vlastních pokladnách | - |
| 4️⃣ | Přiřazení k pokladně | Přístup k přiřazené pokladně | - |

### ✅ Platné kombinace:

```
1. MANAGE (sám o sobě)
   → Vše ostatní je zbytečné

2. READ_ALL + EDIT_OWN + DELETE_OWN
   → Vidí všechny, edituje/maže jen vlastní

3. READ_OWN + EDIT_OWN + DELETE_OWN + EXPORT_OWN
   → Konzistentní "OWN" sada

4. CREATE (samostatně)
   → Každý může vytvořit novou knihu
```

### ❌ ZAKÁZANÉ kombinace:

```
1. READ_OWN + DELETE_ALL
   ❌ PROBLÉM: Vidí jen vlastní, ale může mazat všechny?
   ✅ FIX: Buď READ_ALL + DELETE_ALL, nebo READ_OWN + DELETE_OWN

2. READ_ALL + READ_OWN
   ❌ PROBLÉM: Redundance - READ_ALL obsahuje READ_OWN
   ✅ FIX: Pouze READ_ALL

3. EDIT_ALL bez READ_ALL/READ_OWN
   ❌ PROBLÉM: Může editovat, ale nevidí co edituje
   ✅ FIX: Přidat READ_ALL nebo READ_OWN

4. DELETE_OWN + EDIT_ALL
   ⚠️  NESTANDARDNÍ: Edituje všechny, maže jen vlastní
   → Vyžaduje obchodní zdůvodnění

5. MANAGE + jakékoliv jiné cashbook právo
   ❌ PROBLÉM: MANAGE obsahuje vše, ostatní jsou zbytečná
   ✅ FIX: Pouze MANAGE
```

### Validační matice (Cashbook):

| Má právo | Může mít navíc | NESMÍ mít současně |
|----------|----------------|-------------------|
| `MANAGE` | - | ❌ Jakékoliv jiné CASH_BOOK_* |
| `*_ALL` | `*_OWN` (redundantní) | ❌ Nižší `*_ALL` bez vyššího READ |
| `READ_OWN` | `EDIT/DELETE/EXPORT_OWN` | ❌ `*_ALL` (upgrade na ALL) |
| `CREATE` | Cokoliv | - (nezávislé) |

---

## 📦 Order Permissions

### Úrovně oprávnění (priorita):

| Priorita | Oprávnění | Popis | Obsahuje |
|----------|-----------|-------|----------|
| 1️⃣ | `ORDER_MANAGE` | Kompletní správa | Všechna ostatní |
| 2️⃣ | `ORDER_*_ALL` | Operace na všech objednávkách | `*_SUBORDINATE` + `*_OWN` |
| 3️⃣ | `ORDER_*_SUBORDINATE` | Operace na objednávkách podřízených | - |
| 4️⃣ | `ORDER_*_OWN` | Operace na vlastních objednávkách | - |
| 5️⃣ | Role-based (12 polí) | Viditelnost dle role v objednávce | - |

### ✅ Platné kombinace:

```
1. ORDER_MANAGE (sám o sobě)
   → Vše ostatní je zbytečné

2. ORDER_READ_ALL (samostatně)
   → Vidí všechny objednávky
   → Department/Subordinate filtry se PŘESKAKUJÍ

3. ORDER_EDIT_SUBORDINATE + ORDER_READ_SUBORDINATE
   → Konzistentní "SUBORDINATE" sada
   → Department filtr se aplikuje

4. ORDER_READ_OWN + ORDER_EDIT_OWN
   → Konzistentní "OWN" sada
```

### ❌ ZAKÁZANÉ kombinace:

```
1. ORDER_READ_ALL + ORDER_EDIT_SUBORDINATE
   ❌ PROBLÉM: Vidí všechny, edituje jen podřízené
   ⚠️  REÁLNÝ BUG: User 71 (Zahrádková) - viděla jen 30 místo 162!
   ✅ FIX 1: ORDER_READ_ALL + ORDER_EDIT_ALL (upgrade EDIT)
   ✅ FIX 2: ORDER_READ_SUBORDINATE + ORDER_EDIT_SUBORDINATE (downgrade READ)

2. ORDER_READ_OWN + ORDER_APPROVE_ALL
   ❌ PROBLÉM: Vidí jen vlastní, schvaluje všechny?
   ✅ FIX: ORDER_READ_ALL + ORDER_APPROVE_ALL

3. ORDER_EDIT_ALL bez ORDER_READ_ALL/READ_SUBORDINATE/READ_OWN
   ❌ PROBLÉM: Může editovat, ale nevidí co edituje
   ✅ FIX: Přidat minimálně ORDER_READ_OWN

4. ORDER_VIEW_ALL + ORDER_READ_ALL
   ❌ PROBLÉM: Redundance - obě dělají totéž
   ✅ FIX: Pouze ORDER_READ_ALL (novější název)

5. MANAGE + jakékoliv jiné order právo
   ❌ PROBLÉM: MANAGE obsahuje vše
   ✅ FIX: Pouze ORDER_MANAGE
```

### Validační matice (Orders):

| Má právo | Může mít navíc | NESMÍ mít současně | Důsledek |
|----------|----------------|-------------------|----------|
| `ORDER_READ_ALL` | - | ❌ `*_SUBORDINATE` nebo `*_OWN` | Filtr se ignoruje → Vidí vše ✅ |
| `ORDER_*_ALL` | `*_SUBORDINATE` (redundantní) | ❌ Nižší `*_ALL` bez READ | Nelze editovat co nevidíš |
| `ORDER_*_SUBORDINATE` | Department filtr se aplikuje | ❌ `*_ALL` (upgrade) | Vidí kolegy z úseku |
| `ORDER_CREATE` | Cokoliv | - | Nezávislé právo |

---

## 🔍 Validační pravidla

### 1. Redundance check:

**Pravidlo:** Pokud má vyšší oprávnění, nižší je zbytečné.

```sql
-- Cashbook redundance
SELECT u.id, u.username,
       'REDUNDANT: Has MANAGE + other CASH_BOOK rights' as issue
FROM 25_uzivatele u
WHERE EXISTS (
    SELECT 1 FROM 25_role_prava rp1 
    JOIN 25_prava p1 ON rp1.pravo_id = p1.id
    WHERE (rp1.role_id IN (SELECT role_id FROM 25_uzivatele_role WHERE uzivatel_id = u.id) 
           OR rp1.user_id = u.id)
    AND p1.kod_prava = 'CASH_BOOK_MANAGE'
)
AND EXISTS (
    SELECT 1 FROM 25_role_prava rp2
    JOIN 25_prava p2 ON rp2.pravo_id = p2.id
    WHERE (rp2.role_id IN (SELECT role_id FROM 25_uzivatele_role WHERE uzivatel_id = u.id)
           OR rp2.user_id = u.id)
    AND p2.kod_prava LIKE 'CASH_BOOK_%'
    AND p2.kod_prava != 'CASH_BOOK_MANAGE'
);
```

### 2. Conflict check (kritický):

**Pravidlo:** READ level musí být >= WRITE level

```sql
-- Cashbook conflicts
SELECT u.id, u.username,
       CONCAT('CONFLICT: Has ', p_write.kod_prava, ' but only READ_OWN') as issue
FROM 25_uzivatele u
-- Má DELETE_ALL nebo EDIT_ALL
JOIN 25_role_prava rp_write ON (
    rp_write.role_id IN (SELECT role_id FROM 25_uzivatele_role WHERE uzivatel_id = u.id)
    OR rp_write.user_id = u.id
)
JOIN 25_prava p_write ON rp_write.pravo_id = p_write.id
WHERE p_write.kod_prava IN ('CASH_BOOK_DELETE_ALL', 'CASH_BOOK_EDIT_ALL')
-- ALE má jen READ_OWN
AND EXISTS (
    SELECT 1 FROM 25_role_prava rp_read
    JOIN 25_prava p_read ON rp_read.pravo_id = p_read.id
    WHERE (rp_read.role_id IN (SELECT role_id FROM 25_uzivatele_role WHERE uzivatel_id = u.id)
           OR rp_read.user_id = u.id)
    AND p_read.kod_prava = 'CASH_BOOK_READ_OWN'
)
-- A NEMÁ READ_ALL
AND NOT EXISTS (
    SELECT 1 FROM 25_role_prava rp_all
    JOIN 25_prava p_all ON rp_all.pravo_id = p_all.id
    WHERE (rp_all.role_id IN (SELECT role_id FROM 25_uzivatele_role WHERE uzivatel_id = u.id)
           OR rp_all.user_id = u.id)
    AND p_all.kod_prava = 'CASH_BOOK_READ_ALL'
);
```

### 3. Mixed level check:

**Pravidlo:** Pokud máš *_ALL na jedné operaci a *_OWN na jiné, je to podezřelé.

```sql
-- Orders: Mixed ALL/SUBORDINATE levels
SELECT u.id, u.username,
       'SUSPICIOUS: Mixed READ_ALL with EDIT_SUBORDINATE' as issue
FROM 25_uzivatele u
WHERE EXISTS (
    SELECT 1 FROM 25_role_prava rp1 JOIN 25_prava p1 ON rp1.pravo_id = p1.id
    WHERE (rp1.role_id IN (SELECT role_id FROM 25_uzivatele_role WHERE uzivatel_id = u.id)
           OR rp1.user_id = u.id)
    AND p1.kod_prava = 'ORDER_READ_ALL'
)
AND EXISTS (
    SELECT 1 FROM 25_role_prava rp2 JOIN 25_prava p2 ON rp2.pravo_id = p2.id
    WHERE (rp2.role_id IN (SELECT role_id FROM 25_uzivatele_role WHERE uzivatel_id = u.id)
           OR rp2.user_id = u.id)
    AND p2.kod_prava IN ('ORDER_EDIT_SUBORDINATE', 'ORDER_APPROVE_SUBORDINATE', 'ORDER_DELETE_SUBORDINATE')
);
```

---

## 🔧 SQL Detekce problémů

### Kompletní audit script:

```sql
-- CASHBOOK PERMISSION AUDIT
-- =============================================

-- 1. Redundantní práva (MANAGE + ostatní)
SELECT 'CASHBOOK-REDUNDANCE' as issue_type,
       u.id, u.username, u.email,
       GROUP_CONCAT(p.kod_prava ORDER BY p.kod_prava) as all_permissions
FROM 25_uzivatele u
JOIN 25_role_prava rp ON (
    rp.role_id IN (SELECT role_id FROM 25_uzivatele_role WHERE uzivatel_id = u.id)
    OR rp.user_id = u.id
)
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava LIKE 'CASH_BOOK_%'
GROUP BY u.id, u.username, u.email
HAVING SUM(p.kod_prava = 'CASH_BOOK_MANAGE') > 0
   AND COUNT(DISTINCT p.kod_prava) > 1

UNION ALL

-- 2. Konfliktní kombinace (např. READ_OWN + DELETE_ALL)
SELECT 'CASHBOOK-CONFLICT' as issue_type,
       u.id, u.username, u.email,
       GROUP_CONCAT(p.kod_prava ORDER BY p.kod_prava) as all_permissions
FROM 25_uzivatele u
JOIN 25_role_prava rp ON (
    rp.role_id IN (SELECT role_id FROM 25_uzivatele_role WHERE uzivatel_id = u.id)
    OR rp.user_id = u.id
)
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava LIKE 'CASH_BOOK_%'
GROUP BY u.id, u.username, u.email
HAVING (
    -- Má *_ALL ale jen READ_OWN
    (SUM(p.kod_prava IN ('CASH_BOOK_DELETE_ALL', 'CASH_BOOK_EDIT_ALL')) > 0
     AND SUM(p.kod_prava = 'CASH_BOOK_READ_OWN') > 0
     AND SUM(p.kod_prava = 'CASH_BOOK_READ_ALL') = 0
     AND SUM(p.kod_prava = 'CASH_BOOK_MANAGE') = 0)
)

UNION ALL

-- 3. ORDER PERMISSION AUDIT
-- =============================================

SELECT 'ORDER-MIXED-LEVELS' as issue_type,
       u.id, u.username, u.email,
       GROUP_CONCAT(p.kod_prava ORDER BY p.kod_prava) as all_permissions
FROM 25_uzivatele u
JOIN 25_role_prava rp ON (
    rp.role_id IN (SELECT role_id FROM 25_uzivatele_role WHERE uzivatel_id = u.id)
    OR rp.user_id = u.id
)
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava LIKE 'ORDER_%'
GROUP BY u.id, u.username, u.email
HAVING (
    -- READ_ALL + EDIT_SUBORDINATE (User 71 případ!)
    (SUM(p.kod_prava IN ('ORDER_READ_ALL', 'ORDER_VIEW_ALL')) > 0
     AND SUM(p.kod_prava IN ('ORDER_EDIT_SUBORDINATE', 'ORDER_APPROVE_SUBORDINATE', 'ORDER_DELETE_SUBORDINATE')) > 0
     AND SUM(p.kod_prava = 'ORDER_MANAGE') = 0)
)

ORDER BY issue_type, username;
```

---

## 💡 Implementační návrh

### Fáze 1: Detekce (✅ Okamžitě)

```bash
# Spustit audit script
mysql -h 10.3.172.11 -u erdms_user -p EEO-OSTRA-DEV < /tmp/permission_audit.sql > /tmp/permission_issues.txt

# Odeslat report adminům
```

### Fáze 2: Validace při přidělování práv (🔜 Budoucnost)

**UI validace v Admin panelu:**

```javascript
// frontend/src/components/UserPermissionsEditor.js

function validatePermissionCombination(selectedPermissions) {
  const issues = [];
  
  // Rule 1: MANAGE makes others redundant
  if (selectedPermissions.includes('CASH_BOOK_MANAGE')) {
    const otherCashbookPerms = selectedPermissions.filter(
      p => p.startsWith('CASH_BOOK_') && p !== 'CASH_BOOK_MANAGE'
    );
    if (otherCashbookPerms.length > 0) {
      issues.push({
        level: 'warning',
        message: `CASH_BOOK_MANAGE obsahuje všechna ostatní práva. Odebrat: ${otherCashbookPerms.join(', ')}`
      });
    }
  }
  
  // Rule 2: DELETE_ALL requires READ_ALL
  if (selectedPermissions.includes('CASH_BOOK_DELETE_ALL')) {
    if (!selectedPermissions.includes('CASH_BOOK_READ_ALL') &&
        !selectedPermissions.includes('CASH_BOOK_MANAGE')) {
      issues.push({
        level: 'error',
        message: 'CASH_BOOK_DELETE_ALL vyžaduje CASH_BOOK_READ_ALL (nelze mazat co nevidíš)'
      });
    }
  }
  
  // Rule 3: ORDER_READ_ALL + SUBORDINATE konflikt
  if (selectedPermissions.includes('ORDER_READ_ALL')) {
    const subordinatePerms = selectedPermissions.filter(
      p => p.includes('SUBORDINATE')
    );
    if (subordinatePerms.length > 0) {
      issues.push({
        level: 'warning',
        message: `ORDER_READ_ALL ignoruje filtry. Upgrade ${subordinatePerms.join(', ')} na *_ALL nebo odebrat READ_ALL`
      });
    }
  }
  
  return issues;
}
```

### Fáze 3: Backend validace (🔜 Budoucnost)

**API endpoint validace:**

```php
// middleware/PermissionValidator.php

class PermissionValidator {
    
    /**
     * Validace před přidělením práv
     */
    public static function validateBeforeAssign($userId, $newPermissions) {
        $issues = [];
        
        // Load existing permissions
        $existing = self::getUserPermissions($userId);
        $all = array_merge($existing, $newPermissions);
        
        // Rule: MANAGE supersedes all
        if (in_array('CASH_BOOK_MANAGE', $all)) {
            $redundant = array_filter($all, function($p) {
                return strpos($p, 'CASH_BOOK_') === 0 && $p !== 'CASH_BOOK_MANAGE';
            });
            if (!empty($redundant)) {
                $issues[] = [
                    'type' => 'redundancy',
                    'permissions' => $redundant,
                    'suggestion' => 'Remove redundant permissions, MANAGE covers all'
                ];
            }
        }
        
        // Rule: *_ALL requires READ_ALL
        $writeAll = array_filter($all, function($p) {
            return preg_match('/CASH_BOOK_(EDIT|DELETE)_ALL/', $p);
        });
        if (!empty($writeAll) && 
            !in_array('CASH_BOOK_READ_ALL', $all) &&
            !in_array('CASH_BOOK_MANAGE', $all)) {
            $issues[] = [
                'type' => 'conflict',
                'permissions' => $writeAll,
                'suggestion' => 'Add CASH_BOOK_READ_ALL - cannot edit/delete what you cannot see'
            ];
        }
        
        return $issues;
    }
}
```

### Fáze 4: Automatická náprava (⏰ Volitelné)

**Cleanup script pro existující konflikty:**

```php
// scripts/fix_permission_conflicts.php

// 1. Auto-upgrade: Pokud má EDIT_ALL, přidat READ_ALL
$stmt = $db->prepare("
    INSERT IGNORE INTO 25_role_prava (role_id, user_id, pravo_id, aktivni)
    SELECT rp.role_id, rp.user_id, p_read.id, 1
    FROM 25_role_prava rp
    JOIN 25_prava p_write ON rp.pravo_id = p_write.id
    CROSS JOIN 25_prava p_read
    WHERE p_write.kod_prava IN ('CASH_BOOK_EDIT_ALL', 'CASH_BOOK_DELETE_ALL')
    AND p_read.kod_prava = 'CASH_BOOK_READ_ALL'
    AND NOT EXISTS (
        SELECT 1 FROM 25_role_prava rp2 JOIN 25_prava p2 ON rp2.pravo_id = p2.id
        WHERE (rp2.role_id = rp.role_id OR rp2.user_id = rp.user_id)
        AND p2.kod_prava IN ('CASH_BOOK_READ_ALL', 'CASH_BOOK_MANAGE')
    )
");
$stmt->execute();

// 2. Remove redundant: MANAGE covers all
$stmt = $db->prepare("
    DELETE rp FROM 25_role_prava rp
    JOIN 25_prava p ON rp.pravo_id = p.id
    WHERE p.kod_prava LIKE 'CASH_BOOK_%'
    AND p.kod_prava != 'CASH_BOOK_MANAGE'
    AND EXISTS (
        SELECT 1 FROM 25_role_prava rp2 JOIN 25_prava p2 ON rp2.pravo_id = p2.id
        WHERE (rp2.role_id = rp.role_id OR rp2.user_id = rp.user_id)
        AND p2.kod_prava = 'CASH_BOOK_MANAGE'
    )
");
$stmt->execute();
```

---

## 📊 Reporting & Monitoring

### Weekly audit report:

```bash
#!/bin/bash
# /scripts/weekly_permission_audit.sh

# Run audit
mysql -h 10.3.172.11 -u erdms_user -p$DB_PASS EEO-OSTRA-DEV < audit_permissions.sql > /tmp/perm_audit_$(date +%Y%m%d).txt

# Email report if issues found
if [ $(wc -l < /tmp/perm_audit_$(date +%Y%m%d).txt) -gt 1 ]; then
    mail -s "⚠️ ERDMS Permission Conflicts Detected" admin@zachranka.cz < /tmp/perm_audit_$(date +%Y%m%d).txt
fi
```

### Dashboard widget (budoucnost):

```javascript
// Admin dashboard: Permission health indicator
{
  "conflictCount": 2,
  "redundancyCount": 5,
  "status": "warning",
  "details": [
    {
      "user": "u09658 (Zahrádková)",
      "issue": "ORDER_READ_ALL + ORDER_EDIT_SUBORDINATE",
      "impact": "Vidí 162 objednávek, filtr ignorován"
    },
    {
      "user": "u06818 (Kubíčková)",
      "issue": "CASH_BOOK_READ_OWN + CASH_BOOK_DELETE_ALL",
      "impact": "Může mazat pokladny které nevidí"
    }
  ]
}
```

---

## 🎓 Best Practices

### Pro administrátory:

1. ✅ **Používat role, ne user-specific permissions**
   - Role jsou konzistentní a auditovatelné
   - User-specific jsou výjimky (zdokumentovat proč!)

2. ✅ **Minimální práva (Principle of Least Privilege)**
   - Dát jen tolik práv, kolik uživatel OPRAVDU potřebuje
   - Radši *_OWN než *_ALL, pokud to stačí

3. ✅ **Konzistence v sadě práv**
   - Pokud *_OWN, tak READ + EDIT + DELETE + EXPORT všechny *_OWN
   - Pokud *_ALL, tak všechny operace *_ALL

4. ✅ **Pravidelný audit**
   - Měsíční kontrola konfliktů
   - Roční review všech práv

### Pro vývojáře:

1. ✅ **Priority-based filtering**
   ```php
   if (hasManage()) return ALL;
   if (hasReadAll()) return ALL;  // Skip subordinate filters!
   if (hasSubordinate()) return SUBORDINATE;
   return OWN;
   ```

2. ✅ **Explicitní logování**
   ```php
   error_log("User $userId: Has READ_ALL, skipping subordinate filter");
   ```

3. ✅ **Defensive programming**
   ```php
   // VŽDY kontrolovat READ před WRITE
   if (canEdit() && !canRead()) {
       throw new PermissionException("Cannot edit without read permission");
   }
   ```

---

## 📚 Reference

**Reálné případy:**

1. **User 53 (Kubíčková)** - CASH_BOOK_READ_OWN + CASH_BOOK_DELETE_ALL
   - Datum: 19.1.2026
   - Důsledek: Vidí jen 1 pokladnu, ale může mazat všech 28
   - Fix: Odebrání DELETE_ALL

2. **User 71 (Zahrádková)** - ORDER_READ_ALL + ORDER_EDIT_SUBORDINATE  
   - Datum: 19.1.2026
   - Důsledek: Viděla 30 objednávek místo 162
   - Fix: Department filtr se přeskakuje pro READ_ALL

**Související dokumenty:**

- `FIX_USER71_ORDER_READ_ALL_2026-01-19.md`
- `HIERARCHY_OR_LOGIC_FIX_2026-01-19.md`
- `orderV2Endpoints.php` (řádky 375, 405)
- `CashbookPermissions.php` (permission checking logic)

---

**Status:** ✅ **ACTIVE DOCUMENT**  
**Next Review:** Únor 2026  
**Owner:** System Admin Team
