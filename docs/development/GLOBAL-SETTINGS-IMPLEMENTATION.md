# 🛠️ GLOBÁLNÍ NASTAVENÍ APLIKACE EEO - Implementační Dokumentace

**Vytvořeno:** 13. prosince 2025  
**Status:** ✅ Frontend hotový | ⏳ Backend v přípravě

---

## 📋 PŘEHLED

Globální nastavení systému EEO umožňuje administrátorům řídit celoplošné chování aplikace včetně:
- **Notifikací** (zvoneček, e-maily)
- **Hierarchie workflow** (zapnutí/vypnutí, výběr profilu, logika oprávnění)
- **Údržby systému** (maintenance mode pro SUPERADMIN)

---

## 🎯 ANALÝZA SOUČASNÉHO STAVU

### Aktivní sekce v aplikaci (z `App.js` + `availableSections.js`):

| Sekce | Route | Oprávnění | Status |
|-------|-------|-----------|--------|
| **Objednávky (2025+)** | `/orders25-list` | `ORDER_MANAGE` \|\| `ORDER_2025` | ✅ |
| **Objednávky (před 2026)** | `/orders` | `ORDER_MANAGE` \|\| `ORDER_OLD` | ✅ |
| **Faktury** | `/invoices25-list` | `INVOICE_MANAGE` \|\| Admin | ✅ |
| **Evidence faktur** | `/invoice-evidence/:orderId?` | - | ✅ |
| **Formulář objednávky** | `/order-form-25` | `ORDER_CREATE` \|\| `ORDER_SAVE` | ✅ |
| **Uživatelé** | `/users` | `USER_VIEW` \|\| `USER_MANAGE` | ✅ |
| **Číselníky** | `/dictionaries` | `DICT_VIEW` \|\| `DICT_MANAGE` | ✅ |
| **Reporty** | `/reports` | Admin only | ✅ |
| **Statistiky** | `/statistics` | Admin only | ✅ |
| **Adresář** | `/address-book` | `CONTACT_READ` | ✅ |
| **Kontakty** | `/contacts` | `PHONEBOOK_VIEW` \|\| Admin | ✅ |
| **Notifikace** | `/notifications` | Všichni | ✅ |
| **Pokladna** | `/cash-book` | `CASH_BOOK_*` \|\| Admin | ✅ |
| **Hierarchie** | `/organization-hierarchy` | Admin only | ✅ |
| **Nastavení aplikace** | `/app-settings` | Admin only | ✅ |
| **Profil** | `/profile` | Všichni | ✅ |
| **O aplikaci** | `/about` | Všichni | ✅ |
| **Změna hesla** | `/change-password` | Všichni | ✅ |
| **Debug panel** | `/debug` | SUPERADMIN only | ✅ |

---

## 🔧 NÁVRH GLOBÁLNÍHO NASTAVENÍ

### 1. NOTIFIKACE (PRIORITA: VYSOKÁ)

#### 1.1 Globální vypínač notifikací
- **Klíč v DB:** `notifications_enabled`
- **Typ:** `boolean` (1/0)
- **Výchozí:** `1` (zapnuto)
- **Popis:** Hlavní vypínač pro celý notifikační systém
- **Hierarchie priorit:**
  ```
  GLOBÁLNÍ > Hierarchie > Uživatelské nastavení
  ```
- **Chování:**
  - `0` = Žádné notifikace (ani zvoneček, ani e-maily)
  - `1` = Notifikace povoleny (řídí se dalšími nastaveními)

#### 1.2 Zvoneček (in-app notifikace)
- **Klíč v DB:** `notifications_bell_enabled`
- **Typ:** `boolean` (1/0)
- **Výchozí:** `1`
- **Popis:** Zobrazování notifikací ve zvoničku v horní liště
- **Závislost:** Aktivní pouze pokud `notifications_enabled = 1`

#### 1.3 E-mailové notifikace
- **Klíč v DB:** `notifications_email_enabled`
- **Typ:** `boolean` (1/0)
- **Výchozí:** `1`
- **Popis:** Zasílání notifikací na e-maily uživatelů
- **Závislost:** Aktivní pouze pokud `notifications_enabled = 1`

#### Implementace:
```php
// Backend kontrola před odesláním notifikace
function canSendNotification($type = 'bell') {
    $globalSettings = GlobalSettingsModel::getInstance();
    
    // Zkontroluj globální vypínač
    if (!$globalSettings->getSetting('notifications_enabled')) {
        return false;
    }
    
    // Zkontroluj konkrétní typ
    if ($type === 'bell' && !$globalSettings->getSetting('notifications_bell_enabled')) {
        return false;
    }
    
    if ($type === 'email' && !$globalSettings->getSetting('notifications_email_enabled')) {
        return false;
    }
    
    // TODO: Zkontroluj nastavení hierarchie
    // TODO: Zkontroluj uživatelské nastavení
    
    return true;
}
```

---

### 2. HIERARCHIE WORKFLOW (PRIORITA: VYSOKÁ)

#### 2.1 Hlavní vypínač hierarchie
- **Klíč v DB:** `hierarchy_enabled`
- **Typ:** `boolean` (1/0)
- **Výchozí:** `0` (vypnuto)
- **Popis:** Zapnutí/vypnutí celého systému hierarchie
- **Chování:**
  - `0` = Hierarchie vypnuta, používají se pouze role a práva
  - `1` = Hierarchie aktivní, aplikuje se vybraný profil

#### 2.2 Aktivní profil hierarchie
- **Klíč v DB:** `hierarchy_profile_id`
- **Typ:** `INT` (NULL pokud vypnuto)
- **Výchozí:** `NULL`
- **Popis:** ID aktivního hierarchického profilu z tabulky `25_hierarchie_vztahy`
- **Logika:**
  - `NULL` = Hierarchie vypnuta
  - `ID` = Aplikuje se vybraný profil na celou aplikaci

#### 2.3 Logika oprávnění (OR vs AND)
- **Klíč v DB:** `hierarchy_logic`
- **Typ:** `ENUM('OR', 'AND')`
- **Výchozí:** `'OR'`
- **Popis:** Určuje, jak se kombinují hierarchie a práva

**OR logika (doporučeno):**
```php
if (hasHierarchyAccess() || hasPermission('ORDER_MANAGE')) {
    // Uživatel má přístup
}
```

**AND logika (restriktivní):**
```php
if (hasHierarchyAccess() && hasPermission('ORDER_MANAGE')) {
    // Uživatel má přístup pouze když splňuje OBĚ podmínky
}
```

#### 2.4 Kontextové použití hierarchie

**Objednávky:**
- Použít pouze vztahy typu `ORDER_*` z hierarchie
- Necpat sem faktury, pokladnu, atd.

**Faktury:**
- Použít pouze vztahy typu `INVOICE_*`

**Pokladna:**
- Použít pouze vztahy typu `CASHBOOK_*`

```php
function getHierarchyContextForSection($section) {
    $contexts = [
        'orders' => ['ORDER_CREATE', 'ORDER_APPROVE', 'ORDER_EDIT'],
        'invoices' => ['INVOICE_CREATE', 'INVOICE_APPROVE', 'INVOICE_VIEW'],
        'cashbook' => ['CASHBOOK_READ', 'CASHBOOK_WRITE']
    ];
    
    return $contexts[$section] ?? [];
}

function hasContextualHierarchyAccess($section, $userId) {
    $globalSettings = GlobalSettingsModel::getInstance();
    
    if (!$globalSettings->getSetting('hierarchy_enabled')) {
        return false;
    }
    
    $profileId = $globalSettings->getSetting('hierarchy_profile_id');
    if (!$profileId) {
        return false;
    }
    
    $allowedContexts = getHierarchyContextForSection($section);
    
    // Zkontroluj přístup v hierarchii pouze pro relevantní kontext
    return HierarchyModel::checkUserAccess($userId, $profileId, $allowedContexts);
}
```

---

### 3. ÚDRŽBA SYSTÉMU (PRIORITA: STŘEDNÍ)

#### 3.1 Maintenance mode
- **Klíč v DB:** `maintenance_mode`
- **Typ:** `boolean` (1/0)
- **Výchozí:** `0`
- **Popis:** Aktivuje údržbový režim aplikace
- **Chování:**
  - `0` = Normální provoz
  - `1` = Přístup pouze pro SUPERADMIN

#### 3.2 Údržbová stránka

**Frontend (`MaintenancePage.js`):**
```jsx
const MaintenancePage = () => {
  return (
    <Container>
      <Icon>🔧</Icon>
      <Title>Systém je v údržbě</Title>
      <Message>
        Aplikace je momentálně nedostupná z důvodu plánované údržby.
        Děkujeme za pochopení.
      </Message>
      <LoginButton to="/login">
        <FontAwesomeIcon icon={faKey} />
        Přihlášení pro administrátory
      </LoginButton>
    </Container>
  );
};
```

**Backend middleware (`maintenanceMiddleware.php`):**
```php
function checkMaintenanceMode($userId, $userRoles) {
    $globalSettings = GlobalSettingsModel::getInstance();
    
    if ($globalSettings->getSetting('maintenance_mode')) {
        // Zkontroluj, zda je uživatel SUPERADMIN
        $isSuperAdmin = false;
        foreach ($userRoles as $role) {
            if ($role['kod_role'] === 'SUPERADMIN') {
                $isSuperAdmin = true;
                break;
            }
        }
        
        if (!$isSuperAdmin) {
            http_response_code(503);
            echo json_encode([
                'error' => 'maintenance_mode',
                'message' => 'Systém je v údržbě. Přístup pouze pro SUPERADMIN.'
            ]);
            exit;
        }
    }
}
```

---

## 💾 DATABÁZOVÁ STRUKTURA

### Tabulka `25a_nastaveni_globalni`

```sql
CREATE TABLE IF NOT EXISTS `25a_nastaveni_globalni` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `klic` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Klíč nastavení',
  `hodnota` TEXT NOT NULL COMMENT 'Hodnota nastavení (JSON pro složité struktury)',
  `typ` ENUM('boolean', 'integer', 'string', 'json') DEFAULT 'string' COMMENT 'Typ hodnoty',
  `popis` TEXT COMMENT 'Popis nastavení',
  `kategorie` VARCHAR(50) DEFAULT 'general' COMMENT 'Kategorie: notifications, hierarchy, maintenance',
  `vytvoreno` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `aktualizovano` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_klic` (`klic`),
  KEY `idx_kategorie` (`kategorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Výchozí data
INSERT INTO `25a_nastaveni_globalni` (`klic`, `hodnota`, `typ`, `popis`, `kategorie`) VALUES
('notifications_enabled', '1', 'boolean', 'Hlavní vypínač notifikací', 'notifications'),
('notifications_bell_enabled', '1', 'boolean', 'Zvoneček (in-app notifikace)', 'notifications'),
('notifications_email_enabled', '1', 'boolean', 'E-mailové notifikace', 'notifications'),
('hierarchy_enabled', '0', 'boolean', 'Zapnutí systému hierarchie', 'hierarchy'),
('hierarchy_profile_id', 'NULL', 'integer', 'ID aktivního hierarchického profilu', 'hierarchy'),
('hierarchy_logic', 'OR', 'string', 'Logika oprávnění (OR/AND)', 'hierarchy'),
('maintenance_mode', '0', 'boolean', 'Režim údržby systému', 'maintenance');
```

---

## 🔌 BACKEND API ENDPOINTY

### 1. Získání všech globálních nastavení
```
GET /api/v2025.03_25/global-settings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications_enabled": true,
    "notifications_bell_enabled": true,
    "notifications_email_enabled": true,
    "hierarchy_enabled": false,
    "hierarchy_profile_id": null,
    "hierarchy_logic": "OR",
    "maintenance_mode": false
  }
}
```

### 2. Uložení globálních nastavení
```
POST /api/v2025.03_25/global-settings
```

**Request:**
```json
{
  "notifications_enabled": true,
  "notifications_bell_enabled": false,
  "notifications_email_enabled": true,
  "hierarchy_enabled": true,
  "hierarchy_profile_id": 4,
  "hierarchy_logic": "OR",
  "maintenance_mode": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Globální nastavení bylo úspěšně uloženo"
}
```

### 3. Získání jednotlivého nastavení
```
GET /api/v2025.03_25/global-settings/:key
```

**Response:**
```json
{
  "success": true,
  "key": "notifications_enabled",
  "value": true,
  "type": "boolean"
}
```

---

## 📁 SOUBORY K VYTVOŘENÍ/ÚPRAVĚ

### Backend (PHP):

1. **`/api-legacy/api.eeo/v2025.03_25/lib/globalSettingsHandlers.php`** (NOVÝ)
   - `handle_global_settings_get()` - Načtení všech nastavení
   - `handle_global_settings_save()` - Uložení nastavení
   - `handle_global_settings_get_single()` - Načtení jednoho klíče

2. **`/api-legacy/api.eeo/v2025.03_25/models/GlobalSettingsModel.php`** (✅ EXISTUJE)
   - Přidat metody: `getSettingsByCategory()`, `getTypedValue()`

3. **`/api-legacy/api.eeo/v2025.03_25/middleware/maintenanceMiddleware.php`** (NOVÝ)
   - Kontrola maintenance mode před každým requestem

4. **`/api-legacy/api.eeo/v2025.03_25/router.php`** (UPRAVIT)
   - Přidat routy pro global-settings

### Frontend (React):

1. **`/client/src/pages/AppSettings.js`** (✅ HOTOVO)
   - Kompletní UI s kartami pro všechny kategorie
   - Toggle buttony, selecty, warning boxy
   - Ukládání, reset, loading states

2. **`/client/src/pages/MaintenancePage.js`** (NOVÝ)
   - Stránka zobrazená během údržby
   - Login form pro SUPERADMIN

3. **`/client/src/services/globalSettingsApi.js`** (NOVÝ)
   - `getGlobalSettings()`
   - `saveGlobalSettings(settings)`
   - `getSingleSetting(key)`

4. **`/client/src/context/GlobalSettingsContext.js`** (NOVÝ)
   - Context provider pro globální nastavení
   - Automatické načítání při startu aplikace
   - Reaktivní aktualizace při změnách

5. **`/client/src/App.js`** (UPRAVIT)
   - Přidat kontrolu maintenance mode
   - Redirect na MaintenancePage pokud aktivní a není SUPERADMIN

---

## 🎯 IMPLEMENTAČNÍ PLÁN

### FÁZE 1: Backend API (2-3 hodiny)
- [ ] Vytvořit `globalSettingsHandlers.php`
- [ ] Rozšířit `GlobalSettingsModel.php` o nové metody
- [ ] Přidat routy do `router.php`
- [ ] Otestovat API endpointy (Postman/curl)

### FÁZE 2: Frontend integrace (1-2 hodiny)
- [x] ✅ UI hotové (`AppSettings.js`)
- [ ] Vytvořit `globalSettingsApi.js`
- [ ] Vytvořit `GlobalSettingsContext.js`
- [ ] Propojit UI s API
- [ ] Testování ukládání/načítání

### FÁZE 3: Maintenance mode (1 hodina)
- [ ] Vytvořit `MaintenancePage.js`
- [ ] Vytvořit `maintenanceMiddleware.php`
- [ ] Integrace do `App.js`
- [ ] Testování přepnutí režimů

### FÁZE 4: Hierarchie integrace (3-4 hodiny)
- [ ] Načtení dostupných profilů z DB
- [ ] Implementace kontextové logiky (orders/invoices/cashbook)
- [ ] Integrace do permissions checks
- [ ] Testování OR vs AND logiky

### FÁZE 5: Notifikace integrace (2-3 hodiny)
- [ ] Rozšíření notifikačního systému o globální kontroly
- [ ] Hierarchie priorit (global > hierarchy > user)
- [ ] Testování vypínačů

---

## 🔒 BEZPEČNOSTNÍ POZNÁMKY

1. **Maintenance mode:**
   - Pouze SUPERADMIN může aktivovat
   - Backend middleware kontroluje při každém requestu
   - Frontend chrání přihlášení

2. **Oprávnění:**
   - Přístup k `/app-settings` pouze pro Admin
   - API endpointy vyžadují `ADMIN` nebo `SUPERADMIN` roli
   - Změny se logují do audit logu

3. **Validace:**
   - Backend validuje typ hodnot před uložením
   - Frontend kontroluje závislosti (např. bell_enabled vyžaduje notifications_enabled)

---

## 📊 PRIORITY IMPLEMENTACE

| Prvek | Priorita | Odhadovaný čas | Status |
|-------|----------|----------------|--------|
| Frontend UI | 🔴 Vysoká | 2h | ✅ Hotovo |
| Backend API | 🔴 Vysoká | 3h | ⏳ Čeká |
| Notifikace vypínače | 🔴 Vysoká | 2h | ⏳ Čeká |
| Hierarchie výběr profilu | 🟡 Střední | 3h | ⏳ Čeká |
| Hierarchie logika (OR/AND) | 🟡 Střední | 2h | ⏳ Čeká |
| Maintenance mode | 🟢 Nízká | 2h | ⏳ Čeká |

---

## ✅ HOTOVO

- ✅ Analýza současného stavu aplikace
- ✅ Návrh databázové struktury
- ✅ Návrh API endpointů
- ✅ Kompletní frontend UI (`AppSettings.js`)
- ✅ Dokumentace implementace

## ⏳ DALŠÍ KROKY

1. Vytvořit backend API handlers
2. Propojit frontend s API
3. Implementovat maintenance mode
4. Integrovat hierarchii
5. Rozšířit notifikační systém

---

**Vytvořeno:** 13. prosince 2025  
**Autor:** GitHub Copilot  
**Verze:** 1.0
