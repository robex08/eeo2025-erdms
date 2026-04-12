# 🔍 ANALÝZA INTEGRACE ZASTUPOVÁNÍ DO API - Rozšíření práv a viditelnosti

> **Datum:** 12. dubna 2026
> **Priorita:** ⚠️ KRITICKÁ - Systém oprávnění  
> **Status:** 🔬 ANALÝZA
> **Cíl:** Bezpečně rozšířit viditelnost dat o zastupované uživatele

---

## 🎯 PROBLÉM

**Současný stav:**
- ✅ Systém zastupování má DB tabulky (`25_uzivatele_zastupovani`)
- ✅ Systém má CRUD endpointy pro správu zastupování
- ✅ UI zobrazuje zastupování v dashboardu (ikony, tooltips)
- ❌ **API NEROZŠIŘUJE VIDITELNOST** - zástupce NEVIDÍ data zastupovaného

**Očekávané chování:**
Pokud uživatel A (zástupce) zastupuje uživatele B (zastupovaný) s oprávněními `{view: 1, approve: 1}`:
- ✅ Uživatel A by měl **VIDĚT** objednávky uživatele B
- ✅ Uživatel A by měl **SCHVALOVAT** objednávky jménem B (pokud má oprávnění approve)
- ⚠️ Akce musí být **LOGOVÁNYY** do audit trail (`25_zastupovani_akce_log`)
- ⚠️ **NESMÍ** to rozbít org hierarchii viditelnosti!

---

## 📋 KLÍČOVÁ MÍSTA V KÓDU

### 1. Centrální filtrovací funkce (Dashboard)

#### `_dashboard_build_order_v3_where($user_id, $is_admin, $permissions)`
**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dashboardHandlers.php`
**Řádky:** cca 2995-3028

**Současná logika:**
```php
// ADMIN → vidí všechny objednávky
if ($is_admin || $hasAdminPermissions) {
    return ['where' => '', ' => []];
}

// Běžný user → vidí JEN objednávky kde má některou z 12 rolí
$where = " AND (
    o.uzivatel_id = :v3_user_id
    OR o.objednatel_id = :v3_user_id
    OR o.garant_uzivatel_id = :v3_user_id
    OR o.schvalovatel_id = :v3_user_id
    OR o.prikazce_id = :v3_user_id
    OR o.uzivatel_akt_id = :v3_user_id
    OR o.odesilatel_id = :v3_user_id
    OR o.dodavatel_potvrdil_id = :v3_user_id
    OR o.zverejnil_id = :v3_user_id
    OR o.fakturant_id = :v3_user_id
    OR o.dokoncil_id = :v3_user_id
    OR o.potvrdil_vecnou_spravnost_id = :v3_user_id
)";

return [
    'where' => $where,
    'params' => [':v3_user_id' => (int)$user_id]
];
```

**🔧 CO ZMĚNIT:**
- Přidat kontrolu aktivního zastupování
- Rozšířit `$user_id` na pole všech user_id (vlastní + zastupovaní)
- Změnit `= :v3_user_id` na `IN (:v3_user_ids)`

---

#### `_dashboard_build_invoice_v3_where($db, $user_id, $is_admin, $permissions, $usek_id)`
**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dashboardHandlers.php`
**Řádky:** cca 3044-3122

**Současná logika:**
```php
// Faktury k objednávkám kde má user 12-role
$stmt_orders = $db->prepare("
    SELECT DISTINCT o.id
    FROM " . TBL_OBJEDNAVKY . " o
    WHERE (
        o.uzivatel_id = ?
        OR o.objednatel_id = ?
        OR o.garant_uzivatel_id = ?
        ...12 parametrů = stejný user_id
    )
");
$stmt_orders->execute(array_fill(0, 12, $user_id));

// Přímé role na faktuře
$conditions[] = 'f.fa_predana_zam_id = :v3_inv_user_1';
$conditions[] = 'f.potvrdil_vecnou_spravnost_id = :v3_inv_user_2';
$conditions[] = 'f.vytvoril_uzivatel_id = :v3_inv_user_3';
```

**🔧 CO ZMĚNIT:**
- Použít pole user_id (vlastní + zastupovaní) místo jediného ID
- Změnit array_fill na array se všemi user_id
- Přidat IN (...) podmínky pro přímé role faktury

---

### 2. Další místa kde se filtruje podle user_id

#### OrderHandlers.php
**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php`

Klíčová místa:
- **Řádek 2099:** `WHERE aktivni = 1 AND (objednatel_id = :uzivatel_id OR garant_uzivatel_id = :uzivatel_id)`
- **handle_orders25_list()** - načítá seznam objednávek (NEFILTRUJE podle user!)
- **handle_orders25_by_id()** - načítá detail objednávky (validace přístupu?)

⚠️ **Pozor:** `handle_orders25_list()` vrací **VŠECHNY** objednávky bez filtru podle user! Filtrování probíhá až na FE nebo v dashboardu.

---

#### InvoiceHandlers.php
**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`

- **handle_invoices25_list()** - načítá faktury (kontrola filtru?)

---

#### DashboardHandlers.php
**Použití filtrovacích funkcí** v těchto funkcích:

```
_dashboard_get_invoices_pending_check()  → používá _dashboard_build_invoice_v3_where()
_dashboard_get_orders_for_approval()     → používá _dashboard_build_order_v3_where()
_dashboard_get_invoices_overdue()        → používá _dashboard_build_invoice_v3_where()
_dashboard_get_invoices_due_soon()       → používá _dashboard_build_invoice_v3_where()
_dashboard_get_orders_for_registry()     → používá _dashboard_build_order_v3_where()
_dashboard_get_orders_published()        → používá _dashboard_build_order_v3_where()
_dashboard_get_orders_timeline()         → používá _dashboard_build_order_v3_where()
_dashboard_get_orders_overview()         → používá _dashboard_build_order_v3_where()
```

---

## 🛠️ NÁVRH ŘEŠENÍ

### Fáze 1: Helper funkce pro detekci zastupování

Vytvořit novou funkci v `hierarchyHandlers.php`:

```php
/**
 * Zjistí všechna user_id která má uživatel vidět (vlastní + zastupovaní).
 * 
 * @param object $pdo PDO instance
 * @param int $user_id ID přihlášeného uživatele
 * @param array $required_permissions Jaká oprávnění musí být v zastupování (např. ['view'])
 * @return array Pole user_id (vždy obsahuje minimálně vlastní ID)
 */
function get_user_ids_with_substitution($pdo, $user_id, $required_permissions = ['view']) {
    $user_ids = [(int)$user_id]; // Vždy включаем vlastní ID
    
    try {
        // Kontrola aktivního zastupování (dnes platné)
        $stmt = $pdo->prepare("
            SELECT DISTINCT z.zastupovany_id, z.opravneni
            FROM " . TBL_UZIVATELE_ZASTUPOVANI . " z
            WHERE z.zastupce_id = :user_id
              AND z.aktivni = 1
              AND z.dt_od <= CURDATE()
              AND z.dt_do >= CURDATE()
        ");
        $stmt->execute([':user_id' => $user_id]);
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Dekódování oprávnění z JSON
            $opravneni = json_decode($row['opravneni'], true);
            if (!is_array($opravneni)) {
                continue; // Pokud JSON je neplatný, přeskočit
            }
            
            // Kontrola požadovaných oprávnění
            $has_all_required = true;
            foreach ($required_permissions as $perm) {
                if (empty($opravneni[$perm])) {
                    $has_all_required = false;
                    break;
                }
            }
            
            // Pokud má všechna požadovaná oprávnění → přidat ID
            if ($has_all_required) {
                $user_ids[] = (int)$row['zastupovany_id'];
            }
        }
        
        return array_unique($user_ids);
        
    } catch (PDOException $e) {
        error_log("Chyba při načítání zastupování: " . $e->getMessage());
        // V případě chyby vrátit pouze vlastní ID (fail-safe)
        return [(int)$user_id];
    }
}

/**
 * Zjistí zda uživatel někoho aktivně zastupuje (s konkrétním oprávněním).
 * Vrací info o zastupování včetně oprávnění.
 * 
 * @param object $pdo PDO instance
 * @param int $zastupce_id ID zástupce (přihlášený user)
 * @param string $required_permission Požadované oprávnění (view, approve, confirm...)
 * @return array|null Pole s info [zastupovani_id, zastupovany_id, opravneni] nebo null
 */
function get_active_substitution_for_action($pdo, $zastupce_id, $required_permission = 'approve') {
    try {
        $stmt = $pdo->prepare("
            SELECT z.id, z.zastupovany_id, z.opravneni
            FROM " . TBL_UZIVATELE_ZASTUPOVANI . " z
            WHERE z.zastupce_id = :zastupce_id
              AND z.aktivni = 1
              AND z.dt_od <= CURDATE()
              AND z.dt_do >= CURDATE()
            LIMIT 1
        ");
        $stmt->execute([':zastupce_id' => $zastupce_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row) {
            return null; // Neexistuje aktivní zastupování
        }
        
        $opravneni = json_decode($row['opravneni'], true);
        if (!is_array($opravneni) || empty($opravneni[$required_permission])) {
            return null; // Nemá požadované oprávnění
        }
        
        return [
            'zastupovani_id' => (int)$row['id'],
            'zastupovany_id' => (int)$row['zastupovany_id'],
            'opravneni' => $opravneni
        ];
        
    } catch (PDOException $e) {
        error_log("Chyba při kontrole aktivního zastupování: " . $e->getMessage());
        return null;
    }
}
```

---

### Fáze 2: Úprava filtrovacích funkcí

#### Upravit `_dashboard_build_order_v3_where()`

```php
function _dashboard_build_order_v3_where($user_id, $is_admin, $permissions = [], $pdo = null) {
    // ADMIN nebo má ORDER_*_ALL permissions → vidí VŠECHNY objednávky
    $hasAdminPermissions = in_array('ORDER_MANAGE', $permissions) ||
                          in_array('ORDER_READ_ALL', $permissions) ||
                          in_array('ORDER_VIEW_ALL', $permissions) ||
                          in_array('ORDER_EDIT_ALL', $permissions) ||
                          in_array('ORDER_DELETE_ALL', $permissions);
    
    if ($is_admin || $hasAdminPermissions) {
        return ['where' => '', 'params' => []];
    }
    
    // ✅ NOVĚ: Zjistit všechna user_id (vlastní + zastupovaní s oprávněním 'view')
    $user_ids = [(int)$user_id]; // Fallback pokud PDO není k dispozici
    if ($pdo !== null) {
        $user_ids = get_user_ids_with_substitution($pdo, $user_id, ['view']);
    }
    
    // ✅ NOVĚ: Připravit placeholders pro IN klauzuli
    $placeholders = [];
    $params = [];
    foreach ($user_ids as $idx => $uid) {
        $key = ':v3_uid_' . $idx;
        $placeholders[] = $key;
        $params[$key] = (int)$uid;
    }
    $in_clause = implode(', ', $placeholders);
    
    // ✅ ZMĚNA: Místo = použít IN
    $where = " AND (
        o.uzivatel_id IN ($in_clause)
        OR o.objednatel_id IN ($in_clause)
        OR o.garant_uzivatel_id IN ($in_clause)
        OR o.schvalovatel_id IN ($in_clause)
        OR o.prikazce_id IN ($in_clause)
        OR o.uzivatel_akt_id IN ($in_clause)
        OR o.odesilatel_id IN ($in_clause)
        OR o.dodavatel_potvrdil_id IN ($in_clause)
        OR o.zverejnil_id IN ($in_clause)
        OR o.fakturant_id IN ($in_clause)
        OR o.dokoncil_id IN ($in_clause)
        OR o.potvrdil_vecnou_spravnost_id IN ($in_clause)
    )";
    
    return [
        'where' => $where,
        'params' => $params
    ];
}
```

#### Upravit `_dashboard_build_invoice_v3_where()`

Podobná logika - použít `get_user_ids_with_substitution()` a rozšířit WHERE podmínky.

---

### Fáze 3: Integrace do akcí (schvalování, potvrzování)

Když uživatel **schvaluje objednávku**, musí se:

1. Zjistit zda jedná jako zástupce pomocí `get_active_substitution_for_action($pdo, $user_id, 'approve')`
2. Pokud ANO → **ZLOGOVAT do audit trail:**

```php
// V handle_orders_approve() nebo podobné funkci:
$substitution = get_active_substitution_for_action($db, $token_data['id'], 'approve');

// Provést schválení (UPDATE objednávky)
$stmt = $db->prepare("UPDATE " . TBL_OBJEDNAVKY . " SET 
    stav_objednavky = 'SCHVALENA',
    schvalovatel_id = :schvalovatel_id,
    datum_schvaleni = NOW()
    WHERE id = :order_id
");
$stmt->execute([
    ':schvalovatel_id' => $token_data['id'], // Fyzická osoba (zástupce)
    ':order_id' => $order_id
]);

// Pokud jednal jako zástupce → zlogovat do audit trail
if ($substitution) {
   log_zastupovani_akce(
        $db,
        zastupovani_id: $substitution['zastupovani_id'],
        zastupce_id: $token_data['id'],
        zastupovany_id: $substitution['zastupovany_id'],
        akce_typ: 'SCHVALENI_OBJEDNAVKY',
        objekt_typ: 'objednavka',
        objekt_id: $order_id,
        popis_akce: "Objednávka #{$order_number} schválena zástupcem"
    );
}
```

---

## ⚠️ BEZPEČNOSTNÍ KONTROLY

### 1. Oprávnění musí být validována

```php
// ❌ ŠPATNĚ - přijmout oprávnění z FE
if ($input['can_approve']) {
    // approve order
}

// ✅ SPRÁVNĚ - ověřit v DB
$substitution = get_active_substitution_for_action($db, $user_id, 'approve');
if ($substitution) {
    // approve order jménem zastupovaného
}
```

---

### 2. Kontrola časové platnosti

Každý dotaz musí kontrolovat `dt_od <= CURDATE() AND dt_do >= CURDATE()`.
**NIKDY** nepoužívat pouze `aktivni = 1` (může být aktivní ale budoucí!).

---

### 3. Org hierarchie nesmí být rozbita

Pokud existuje org hierarchie (např. nadřízený vidí podřízené), **NESMÍ** se to změnit.
Zastupování pouze **PŘIDÁVÁ** viditelnost, **NEODEBÍRÁ** ji.

```php
// Správná logika:
// 1. Zjisti objednávky kde je user přímo (12-role)
// 2. PŘIDEJ objednávky zastupovaných uživatelů (pokud má 'view')
// 3. NEODEBÍREJ žádné objednávky které by viděl kvůli org hierarchii
```

---

## 📊 DOPAD NA EXISTUJÍCÍ FUNKCE

### Funkce které budou změněny:

| Funkce | Soubor | Změna |
|---|---|---|
| `_dashboard_build_order_v3_where()` | dashboardHandlers.php | ➕ Přidat podporu zastupování |
| `_dashboard_build_invoice_v3_where()` | dashboardHandlers.php | ➕ Přidat podporu zastupování |
| `handle_orders_approve()` | orderHandlers.php | ➕ Audit log při schvalování |
| `handle_orders_confirm()` | orderHandlers.php | ➕ Audit log při potvrzování |
| `handle_invoice_approve()` | invoiceHandlers.php | ➕ Audit log při schvalování |

### Nové funkce:

| Funkce | Soubor | Účel |
|---|---|---|
| `get_user_ids_with_substitution()` | hierarchyHandlers.php | Rozšíření user_id o zastupované |
| `get_active_substitution_for_action()` | hierarchyHandlers.php | Detekce zastupování pro akci |

---

## 🧪 TESTOVACÍ SCÉNÁŘE

### Test 1: Viditelnost objednávek

**Setup:**
- User A (ID 10) vytvoří objednávku
- User B (ID 20) zastupuje User A s oprávněním `{view: 1}`

**Očekávaný výsledek:**
- User B vidí objednávku User A v dashboardu
- User B vidí objednávku v seznamu objednávek

---

### Test 2: Schvalování objednávek

**Setup:**
- User A (ID 10) vytvoří objednávku
- User C (ID 30, příkazce) zastupuje User A s oprávněním `{view: 1, approve: 1}`

**Očekávaný výsledek:**
- User C může schválit objednávku
- Do audit logu se zapíše: `zastupce_id=30, zastupovany_id=10, akce_typ=SCHVALENI_OBJEDNAVKY`
- V objednávce je `schvalovatel_id=30` (fyzická osoba)

---

### Test 3: Bez oprávnění

**Setup:**
- User A (ID 10) vytvoří objednávku
- User D (ID 40) zastupuje User E (ID 50) s oprávněním `{view: 1}`

**Očekávaný výsledek:**
- User D **NEVIDÍ** objednávku User A (zastupuje jiného uživatele)
- User D vidí pouze objednávky User E

---

### Test 4: Org hierarchie není rozbita

**Setup:**
- User A (ID 10) je nadřízený User B (ID 20) v org struktuře
- User A vidí objednávky User B kvůli hierarchii
- User C (ID 30) zastupuje User D (ID 40) s oprávněním `{view: 1}`

**Očekávaný výsledek:**
- User A stále vidí objednávky User B (hierarchie funguje)
- User C vidí objednávky User D (zastupování funguje)
- User C **NEVIDÍ** objednávky User A nebo B (nemá k nim přístup)

---

## ✅ KONTROLNÍ SEZNAM PŘED IMPLEMENTACÍ

- [ ] Přečíst ZASTUPOVANI_SYSTEM_BRIEFING.md
- [ ] Ověřit jaké endpointy používají `_dashboard_build_order_v3_where()`
- [ ] Navrhnout změny v hierarchyHandlers.php (nové funkce)
- [ ] Navrhnout změny v dashboardHandlers.php (úprava filtrů)
- [ ] Navrhnout změny v orderHandlers.php (audit log)
- [ ] Navrhnout změny v invoiceHandlers.php (audit log)
- [ ] Připravit SQL testovací queries pro ověření funkčnosti
- [ ] Konzultovat s týmem před implementací
- [ ] Testovat na DEV databázi (`eeo2025-dev`)
- [ ] **NIKDY netestovat na PROD!**

---

## 🚫 CO URČITĚ NEDĚLAT

❌ **Neměnit logiku oprávnění bez důkladné analýzy**
❌ **Nepřidávat "zkratky" které obejdou bezpečnostní kontroly**
❌ **Neschvalovat akce bez kontroly oprávnění v DB**
❌ **Nezapomínat logovat do audit trail**
❌ **Nerozbíjet org hierarchii**
❌ **Neměnit produkční .env nebo DB**

---

## 📝 POZNÁMKY

- Všechny změny musí být **PLNĚ ZPĚTNĚ KOMPATIBILNÍ**
- Pokud `$pdo` není předáno do funkce, vrátit fail-safe (pouze vlastní user_id)
- Audit log je **POVINNÝ** pro všechny akce zástupce
- ENV variables musí být z .env, **ŽÁDNÝ HARDCODE**

---

**Další krok:** Konzultace s týmem → Implementace → Testování → Deploy
