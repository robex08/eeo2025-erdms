# CHANGELOG: Oprávnění pro přehled LP v pokladně

**Datum:** 2. ledna 2026  
**Autor:** Jan Černohorský  
**Verze:** 1.93-DEV  
**Typ změny:** Backend - oprávnění pro LP v pokladně

---

## 📋 PROBLÉM

Přestal fungovat výpis LP kódů v sekci "Přehled čerpání z pokladny". Původní implementace měla hardcodovaný filtr na `user_id`, což znamenalo, že uživatelé viděli jen své LP kódy, i když měli být oprávněni vidět víc.

---

## 🎯 POŽADOVANÉ CHOVÁNÍ

### 1️⃣ ADMIN + Práva CASH_BOOK_MANAGE, CASH_BOOK_READ_ALL
- **Požadavek:** Vidí čerpání LP ze VŠECH pokladen všech uživatelů
- **Režim:** `all`
- **SQL:** Všechny knihy v daném roce

### 2️⃣ Příkazce (PRIKAZCE_OPERACE)
- **Požadavek:** Vidí čerpání všech LP kódů v rámci všech knih svého úseku
- **Režim:** `department`
- **SQL:** WHERE `u.usek_id = ?` (uživatelé knihy patří do stejného úseku)

### 3️⃣ Běžný uživatel
- **Požadavek:** Vidí pouze své knihy (kde je vlastníkem) a všechny LP kódy které v nich využil
- **Režim:** `own`
- **SQL:** WHERE `k.uzivatel_id = ?`

---

## 🔧 PROVEDENÉ ZMĚNY

### 1. CashbookPermissions.php

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/middleware/CashbookPermissions.php`

**Změna A:** Přidána metoda `hasRole()` (řádek ~66)
```php
public function hasRole($roleCode) {
    if (!isset($this->user['id'])) {
        return false;
    }
    
    $stmt = $this->db->prepare("
        SELECT COUNT(*) as count
        FROM 25_uzivatele_role ur
        JOIN 25_role r ON ur.role_id = r.id
        WHERE ur.uzivatel_id = ? AND r.kod_role = ?
    ");
    $stmt->execute(array($this->user['id'], $roleCode));
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return $result['count'] > 0;
}
```

**Změna B:** Metoda `hasPermission()` změněna z `private` na `public` (řádek ~31)

---

### 2. cashbookHandlers.php

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/cashbookHandlers.php`

**Funkce:** `handle_cashbook_lp_summary_post()` (řádek ~1066)

**PŘED:** Jednoduchá kontrola oprávnění, hardcodovaný `$userId`
```php
$userId = isset($input['user_id']) ? intval($input['user_id']) : $userData['id'];
$summary = $lpService->getLPSummaryWithLimits($userId, $year);
```

**PO:** Inteligentní rozhodování podle oprávnění
```php
// Určit režim zobrazení podle oprávnění
$viewMode = 'own'; // Default: jen vlastní knihy
$filterUserId = $userData['id'];
$filterUsekId = null;

// 1. ADMIN nebo CASH_BOOK_MANAGE nebo CASH_BOOK_READ_ALL - vidí VŠE
$isSuperAdmin = isset($userData['super_admin']) && $userData['super_admin'] == 1;
$hasManage = $permissions->hasPermission('CASH_BOOK_MANAGE');
$hasReadAll = $permissions->hasPermission('CASH_BOOK_READ_ALL');

if ($isSuperAdmin || $hasManage || $hasReadAll) {
    $viewMode = 'all';
    $filterUserId = null; // Null = všichni uživatelé
}
// 2. Příkazce (PRIKAZCE_OPERACE) - vidí všechny LP kódy v rámci svého úseku
else if ($permissions->hasRole('PRIKAZCE_OPERACE')) {
    $viewMode = 'department';
    $filterUsekId = isset($userData['usek_id']) ? $userData['usek_id'] : null;
    $filterUserId = null;
}
// 3. Běžný uživatel - vidí jen své knihy
else {
    $viewMode = 'own';
    $filterUserId = $userData['id'];
}

$summary = $lpService->getLPSummaryWithLimits($filterUserId, $year, $viewMode, $filterUsekId);
```

---

### 3. LPCalculationService.php

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/services/LPCalculationService.php`

**Funkce:** `getLPSummaryWithLimits()` (řádek ~210)

**PŘED:** Hardcodovaný filtr na `user_id`
```php
public function getLPSummaryWithLimits(int $userId, int $year): array {
    $cerpani = $this->recalculateLPForUserYear($userId, $year);
    
    $sql = "... WHERE c.rok = ? AND c.user_id = ?";
    $stmt->execute([$year, $userId]);
}
```

**PO:** Podmíněná logika podle režimu
```php
public function getLPSummaryWithLimits($userId, int $year, $viewMode = 'own', $usekId = null): array {
    // 1. Získat čerpání podle režimu
    if ($viewMode === 'all') {
        $cerpani = $this->recalculateLPForAllUsersYear($year);
    } else if ($viewMode === 'department' && $usekId) {
        $cerpani = $this->recalculateLPForDepartmentYear($usekId, $year);
    } else {
        $cerpani = $this->recalculateLPForUserYear($userId, $year);
    }
    
    // 2. Získat limity podle režimu
    if ($viewMode === 'all') {
        $sql = "... WHERE c.rok = ?";
    } else if ($viewMode === 'department' && $usekId) {
        $sql = "... WHERE c.rok = ? AND c.usek_id = ?";
    } else {
        $sql = "... WHERE c.rok = ? AND c.user_id = ?";
    }
}
```

**Nové metody:**

1. **`recalculateLPForAllUsersYear(int $year)`** - Agreguje čerpání ze všech knih všech uživatelů
2. **`recalculateLPForDepartmentYear(int $usekId, int $year)`** - Agreguje čerpání ze všech knih v rámci úseku

---

## 📊 SQL LOGIKA

### Režim "all" (ADMIN)
```sql
-- Čerpání: všechny knihy
WHERE k.rok = ?

-- Limity: všechny LP kódy
WHERE c.rok = ?
```

### Režim "department" (Příkazce)
```sql
-- Čerpání: knihy uživatelů z úseku
WHERE k.rok = ? AND u.usek_id = ?

-- Limity: LP kódy úseku
WHERE c.rok = ? AND c.usek_id = ?
```

### Režim "own" (Běžný uživatel)
```sql
-- Čerpání: pouze uživatelovy knihy
WHERE k.rok = ? AND k.uzivatel_id = ?

-- Limity: LP kódy uživatele
WHERE c.rok = ? AND c.user_id = ?
```

---

## ✅ TESTOVÁNÍ

### Test 1: Super admin vidí vše
**Scénář:** Super admin otevře přehled LP v pokladně  
**Očekávaný výsledek:** Vidí čerpání ze všech knih všech uživatelů  
**SQL test:**
```sql
SELECT COUNT(*) FROM 25a_pokladni_knihy WHERE rok = 2026;
-- Měl by vidět LP ze všech knih
```

### Test 2: Příkazce vidí úsek
**Scénář:** Příkazce úseku 4 otevře přehled LP  
**Očekávaný výsledek:** Vidí čerpání ze všech knih uživatelů úseku 4  
**SQL test:**
```sql
SELECT k.uzivatel_id, u.jmeno, u.prijmeni, p.lp_kod
FROM 25a_pokladni_polozky p
JOIN 25a_pokladni_knihy k ON k.id = p.pokladni_kniha_id
JOIN 25_uzivatele u ON k.uzivatel_id = u.id
WHERE k.rok = 2026 AND u.usek_id = 4;
```

### Test 3: Běžný uživatel vidí jen své knihy
**Scénář:** Uživatel 85 otevře přehled LP  
**Očekávaný výsledek:** Vidí jen LP ze svých vlastních knih  
**SQL test:**
```sql
SELECT p.lp_kod, SUM(COALESCE(p.castka_vydaj, p.castka_celkem))
FROM 25a_pokladni_polozky p
JOIN 25a_pokladni_knihy k ON k.id = p.pokladni_kniha_id
WHERE k.rok = 2026 AND k.uzivatel_id = 85
GROUP BY p.lp_kod;
```

---

## 🎯 PŘÍKLADY POUŽITÍ

### Příklad 1: Admin vidí vše
**Uživatel:** RH ADMIN (super_admin = 1)  
**Request:** `{year: 2026}`  
**Response:**
```json
{
  "view_mode": "all",
  "filter_user_id": null,
  "lp_summary": [
    {"lp_kod": "LPIT1", "cerpano_pokladna": 2500, "spravce_prijmeni": "Černohorský"}
  ]
}
```

### Příklad 2: Příkazce vidí úsek
**Uživatel:** Jan Novák (role PRIKAZCE_OPERACE, úsek 4)  
**Request:** `{year: 2026}`  
**Response:**
```json
{
  "view_mode": "department",
  "filter_usek_id": 4,
  "lp_summary": [
    {"lp_kod": "LPIT1", "cerpano_pokladna": 2500}
  ]
}
```

### Příklad 3: Běžný uživatel vidí jen své knihy
**Uživatel:** Petr Svoboda (žádná speciální role, user_id 85)  
**Request:** `{year: 2026}`  
**Response:**
```json
{
  "view_mode": "own",
  "filter_user_id": 85,
  "lp_summary": []
}
```

---

## 📝 POZNÁMKY

### Výkonnost:
- Režim "all" může být pomalejší na velkých datech
- Doporučeno přidat indexy:
  - `25a_pokladni_knihy (rok, uzivatel_id)`
  - `25_uzivatele (usek_id)`

### Bezpečnost:
- Všechny parametry ošetřeny PDO prepared statements
- Oprávnění kontrolována na úrovni middleware
- Žádný parametr od klienta neovlivňuje režim (určuje se na serveru)

### Zpětná kompatibilita:
- Frontend nepotřebuje změny (stále volá stejný endpoint)
- Backend automaticky určí režim podle přihlášeného uživatele

---

## 🔄 ROZDÍL PŘED/PO

### PŘED změnou:
| Uživatel | Co viděl |
|----------|----------|
| Admin | ❌ Jen své LP (filtr na user_id) |
| Příkazce | ❌ Jen své LP (filtr na user_id) |
| Běžný | ✅ Jen své LP |

### PO změně:
| Uživatel | Co vidí |
|----------|---------|
| Admin (+ CASH_BOOK_MANAGE, CASH_BOOK_READ_ALL) | ✅ Všechny LP ze všech knih |
| Příkazce (PRIKAZCE_OPERACE) | ✅ Všechny LP knih svého úseku |
| Běžný | ✅ Jen LP ze svých vlastních knih |

---

## 🎯 ZÁVĚR

✅ Oprávnění pro přehled LP v pokladně správně implementována  
✅ 3 režimy: `all` (admin), `department` (příkazce), `own` (běžný)  
✅ Backend automaticky určuje režim podle role/oprávnění  
✅ Frontend nepotřebuje změny  
✅ SQL optimalizováno pro různé režimy  
✅ Zpětně kompatibilní

**Status:** ✅ HOTOVO  
**Testováno:** 2. ledna 2026  
**Nasazení:** DEV prostředí (/var/www/erdms-dev/)
