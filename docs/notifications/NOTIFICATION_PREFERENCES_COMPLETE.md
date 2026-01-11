# ✅ Kompletní systém uživatelských preferencí notifikací

## 📋 Přehled

Systém notifikací nyní podporuje **3-úrovňové řízení**:

1. **Global Settings** (Admin panel) - Systémová úroveň
2. **User Preferences** (Profil uživatele) - Uživatelská úroveň  
3. **Hierarchy Configuration** (Template NODEs) - Hierarchická úroveň

---

## 🎨 Frontend UI

### Admin Panel (`AppSettings.js`)

**Cesta:** `/settings`  
**Oprávnění:** ADMINISTRATOR nebo SUPERADMIN

**Globální vypínače:**
- ✅ `notifications_enabled` - Hlavní vypínač (má nejvyšší prioritu)
- ✅ `notifications_bell_enabled` - In-app notifikace (zvoneček)
- ✅ `notifications_email_enabled` - Emailové notifikace

**Logika:**
- Pokud je `notifications_enabled = OFF`, žádné notifikace se neodesílají
- Sub-vypínače (bell, email) jsou disabled, pokud je hlavní vypínač OFF

---

### User Profile (`ProfilePage.js`)

**Cesta:** `/profile` → záložka "Nastavení"  
**Oprávnění:** Každý přihlášený uživatel

**Struktura UI:**

```javascript
notifikace: {
  povoleny: true,              // Hlavní vypínač
  email_povoleny: true,         // Email kanál
  inapp_povoleny: true,         // In-app kanál (zvoneček)
  kategorie: {                  // Granularita na úrovni modulů
    objednavky: true,
    faktury: true,
    smlouvy: true,
    pokladna: true
  }
}
```

**Vizuální hierarchie:**
1. **Hlavní vypínač** (velký, šedý box s border)
   - "Povolit notifikace"
   - Když je OFF, všechny ostatní kontroly jsou disabled a opacity 0.5
   
2. **Kanály** (2 sloupce grid)
   - "Zobrazovat notifikace v aplikaci" (inapp_povoleny)
   - "Zasílat notifikace emailem" (email_povoleny)
   
3. **Kategorie** (2 sloupce grid pod oddělovací čárou)
   - Objednávky (změny stavů, schvalování, komentáře)
   - Faktury (nové faktury, schválení, zamítnutí)
   - Smlouvy (nové smlouvy, změny, komentáře)
   - Pokladna (nové doklady, kontroly, schvalování)

**UX detaily:**
- Disabled state pro kanály a kategorie když je hlavní vypínač OFF
- Email uživatele zobrazen u emailové notifikace
- Popisky vysvětlují, jaké události se v kategorii sledují

---

## 🔧 Backend implementace

### Databáze

**Tabulka: `25a_nastaveni_globalni`**

```sql
klic                           | hodnota | popis
-------------------------------|---------|--------------------------------------
notifications_enabled          | 1       | Hlavní vypínač pro celý systém
notifications_email_enabled    | 1       | Povolit email notifikace
notifications_inapp_enabled    | 1       | Povolit in-app notifikace (zvoneček)
```

**Tabulka: `25_uzivatel_nastaveni`**

```json
{
  "notifikace_povoleny": true,
  "notifikace_email_povoleny": true,
  "notifikace_inapp_povoleny": true,
  "notifikace_kategorie": {
    "objednavky": true,
    "faktury": true,
    "smlouvy": true,
    "pokladna": true
  }
}
```

*Poznámka: V DB jsou české klíče, frontend používá anglické pro UI.*

---

### API Endpointy

#### Global Settings

**Endpoint:** `POST /api.eeo/global-settings`

```json
{
  "token": "...",
  "username": "...",
  "operation": "get"  // nebo "save"
}
```

**Response (GET):**
```json
{
  "status": "ok",
  "data": {
    "notifications_enabled": true,
    "notifications_bell_enabled": true,
    "notifications_email_enabled": true,
    "hierarchy_enabled": false,
    "maintenance_mode": false
  }
}
```

**Handler:** `globalSettingsHandlers.php :: handle_global_settings()`

---

#### User Settings

**Endpoint:** `POST /api.eeo/user/settings`

```json
{
  "token": "...",
  "username": "...",
  "userId": 123,
  "operation": "get",  // nebo "save"
  "nastaveni": { ... }  // pouze při save
}
```

**Response (GET):**
```json
{
  "status": "ok",
  "data": {
    "notifikace": {
      "povoleny": true,
      "email_povoleny": true,
      "inapp_povoleny": true,
      "kategorie": {
        "objednavky": true,
        "faktury": true,
        "smlouvy": true,
        "pokladna": true
      }
    }
  }
}
```

**Handler:** `userSettingsHandlers.php :: handle_user_settings_get/save()`

---

### Logika kontroly preferencí

**Funkce:** `getUserNotificationPreferences($db, $userId)`  
**Soubor:** `notificationHandlers.php`

**Postup:**

```php
1. NAČÍST GLOBAL SETTINGS (25a_nastaveni_globalni)
   - notifications_enabled
   - notifications_email_enabled
   - notifications_inapp_enabled
   
   ⚠️ Pokud notifications_enabled = '0' → STOP, žádné notifikace

2. NAČÍST USER SETTINGS (25_uzivatel_nastaveni)
   - notifikace_povoleny
   - notifikace_email_povoleny
   - notifikace_inapp_povoleny
   - notifikace_kategorie.*
   
   Aplikovat AND logiku:
   - preferences['enabled'] = global_enabled AND user_povoleny
   - preferences['email_enabled'] = global_email_enabled AND user_email_povoleny
   - preferences['inapp_enabled'] = global_inapp_enabled AND user_inapp_povoleny
   
3. VRÁTIT PREFERENCES
   {
     'enabled': true/false,
     'email_enabled': true/false,
     'inapp_enabled': true/false,
     'categories': {
       'orders': true/false,
       'invoices': true/false,
       'contracts': true/false,
       'cashbook': true/false
     }
   }
```

**Použití:**

```php
// V findNotificationRecipients() - před přidáním uživatele do seznamu příjemců
$prefs = getUserNotificationPreferences($db, $userId);

if (!$prefs['enabled']) {
    continue; // Skip uživatele - má notifikace globálně vypnuté
}

$eventCategory = getObjectTypeFromEvent($eventType);  // 'orders', 'invoices', ...

if (!$prefs['categories'][$eventCategory]) {
    continue; // Skip - uživatel nemá zapnutou tuto kategorii
}

// Přidat příjemce podle kanálů
if ($prefs['email_enabled']) {
    $emailRecipients[] = $userId;
}

if ($prefs['inapp_enabled']) {
    $inappRecipients[] = $userId;
}
```

---

## 📊 Testovací scénáře

### Test 1: Globální vypnutí notifikací

**Setup:**
- Admin panel → notifications_enabled = OFF

**Očekávaný výsledek:**
- ❌ Žádné notifikace se neodesílají (ani email, ani in-app)
- ❌ Uživatelé NEMOHOU obdržet notifikace, i když mají zapnuto v profilu
- ✅ `getUserNotificationPreferences()` vrací `enabled: false` pro všechny uživatele

---

### Test 2: Uživatel vypne email notifikace

**Setup:**
- Admin panel → notifications_enabled = ON, notifications_email_enabled = ON
- User Profile → povoleny = ON, email_povoleny = OFF, inapp_povoleny = ON

**Očekávaný výsledek:**
- ✅ Uživatel dostává in-app notifikace (zvoneček)
- ❌ Uživatel NEDOSTÁVÁ email notifikace
- ✅ `getUserNotificationPreferences()` vrací `email_enabled: false`, `inapp_enabled: true`

---

### Test 3: Uživatel vypne kategorii "Objednávky"

**Setup:**
- Admin panel → všechno ON
- User Profile → povoleny = ON, kanály = ON, kategorie.objednavky = OFF

**Očekávaný výsledek:**
- ❌ Uživatel NEDOSTÁVÁ notifikace o objednávkách (ORDER_*)
- ✅ Uživatel DOSTÁVÁ notifikace o fakturách (INVOICE_*)
- ✅ Uživatel DOSTÁVÁ notifikace o smlouvách (CONTRACT_*)
- ✅ Uživatel DOSTÁVÁ notifikace o pokladně (CASHBOOK_*)

**Testování v kódu:**
```php
// Simulace události ORDER_PENDING_APPROVAL
$eventType = 'ORDER_PENDING_APPROVAL';
$eventCategory = getObjectTypeFromEvent($eventType);  // 'orders'
$prefs = getUserNotificationPreferences($db, $userId);

// VÝSLEDEK:
$prefs['categories']['orders'] === false  → Skip uživatele
```

---

### Test 4: Admin vypne email globálně

**Setup:**
- Admin panel → notifications_enabled = ON, notifications_email_enabled = OFF
- User Profile → všechno ON

**Očekávaný výsledek:**
- ❌ Nikdo NEDOSTÁVÁ email notifikace (i když má zapnuto v profilu)
- ✅ Všichni DOSTÁVAJÍ in-app notifikace
- ✅ `getUserNotificationPreferences()` vrací `email_enabled: false` pro všechny

---

### Test 5: Kombinovaný test - hierarchie Template NODEs

**Setup:**
- Admin panel → všechno ON
- User Profile → všechno ON
- Template NODE → eventTypes obsahuje ORDER_PENDING_APPROVAL
- Recipient není v NODE.roleUsers

**Očekávaný výsledek:**
- ❌ Uživatel NEDOSTÁVÁ notifikaci (není v hierarchii)
- ✅ Pouze uživatelé v NODE.roleUsers s odpovídající rolí dostanou notifikaci
- ✅ Preference kontrola proběhne až POTÉ, co projde hierarchií

**Flow:**
```
1. findNotificationRecipients() najde uživatele v hierarchii
2. Pro každého uživatele zavolá getUserNotificationPreferences()
3. Kontrola preferences (global + user + category)
4. Přidá do seznamu příjemců podle kanálu (email/inapp)
```

---

## 🎯 Implementační checklist

- [x] SQL migrace (ALTER_ADD_NOTIFICATION_SETTINGS.sql)
- [x] Backend preference checker (getUserNotificationPreferences)
- [x] Admin panel UI (AppSettings.js)
- [x] User profile UI (ProfilePage.js)
- [x] API integrace (globalSettingsHandlers.php, userSettingsHandlers.php)
- [x] Recipient filtering v notificationHandlers.php
- [x] Git commit a dokumentace
- [ ] Manuální testování (viz scénáře výše)
- [ ] Code review s týmem

---

## 📝 Poznámky

### Rozdíly v názvech klíčů

**Frontend (UI):**
- `povoleny`, `email_povoleny`, `inapp_povoleny`
- `kategorie: { objednavky, faktury, smlouvy, pokladna }`

**Backend (DB - user settings):**
- `notifikace_povoleny`, `notifikace_email_povoleny`, `notifikace_inapp_povoleny`
- `notifikace_kategorie: { objednavky, faktury, smlouvy, pokladna }`

**Backend (DB - global settings):**
- `notifications_enabled`, `notifications_email_enabled`, `notifications_inapp_enabled`

**Backend (PHP internal):**
- `enabled`, `email_enabled`, `inapp_enabled`
- `categories: { orders, invoices, contracts, cashbook }`

Mapování mezi těmito úrovněmi probíhá v:
- `getUserNotificationPreferences()` - mapuje DB → PHP internal
- `userSettingsHandlers.php` - transparentně čte/píše JSON
- `ProfilePage.js` - ukládá celý objekt `notifikace` do DB

---

## 🚀 Jak otestovat

### 1. Zkontrolovat DB

```sql
-- Globální nastavení
SELECT klic, hodnota FROM 25a_nastaveni_globalni 
WHERE klic LIKE 'notification%';

-- Uživatelská nastavení (user_id = 1)
SELECT uzivatel_id, nastaveni_data 
FROM 25_uzivatel_nastaveni 
WHERE uzivatel_id = 1;
```

### 2. Zkontrolovat Admin Panel

1. Přihlásit se jako ADMINISTRATOR nebo SUPERADMIN
2. Jít na `/settings`
3. Sekce "Notifikace" - zkontrolovat 3 toggles:
   - Povolit notifikace
   - Zvoneček (in-app notifikace)
   - E-mailové notifikace
4. Zkusit vypnout hlavní toggle → sub-toggles by měly být disabled
5. Uložit změny

### 3. Zkontrolovat User Profile

1. Přihlásit se jako běžný uživatel
2. Jít na `/profile` → záložka "Nastavení"
3. Sekce "Nastavení notifikací" - zkontrolovat:
   - Hlavní vypínač (šedý box)
   - 2 kanály (in-app, email) v gridu
   - 4 kategorie pod oddělovací čárou
4. Zkusit vypnout hlavní vypínač → všechno by mělo být disabled
5. Zapnout zpět, vypnout jednotlivé kategorie
6. Kliknout "Uložit a aplikovat" (dole na stránce)
7. Reload stránky → zkontrolovat, že nastavení zůstalo

### 4. Zkontrolovat backend response

```javascript
// V browser console (po přihlášení)
const token = localStorage.getItem('auth_token');
const username = localStorage.getItem('auth_username');

// Test Global Settings
fetch('/api.eeo/global-settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, username, operation: 'get' })
})
.then(r => r.json())
.then(data => console.log('Global Settings:', data));

// Test User Settings
fetch('/api.eeo/user/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, username, userId: 1, operation: 'get' })
})
.then(r => r.json())
.then(data => console.log('User Settings:', data));
```

### 5. Simulovat notifikaci

```php
// V backendu - přidat do notificationHandlers.php (dočasně pro test)
function test_user_preferences() {
    global $db;
    $userId = 1;  // Testovaný uživatel
    
    $prefs = getUserNotificationPreferences($db, $userId);
    
    error_log("TEST PREFERENCES for user $userId:");
    error_log(json_encode($prefs, JSON_PRETTY_PRINT));
    
    // Test kategorie
    $eventType = 'ORDER_PENDING_APPROVAL';
    $category = getObjectTypeFromEvent($eventType);
    error_log("Event: $eventType → Category: $category");
    error_log("Category enabled? " . ($prefs['categories'][$category] ? 'YES' : 'NO'));
}

// Zavolat někde v routeru
test_user_preferences();
```

---

## ✅ Výsledek

Systém nyní plně podporuje **3-úrovňové řízení notifikací**:

1. ✅ **Admin** může globálně vypnout notifikace pro celý systém
2. ✅ **Uživatel** může řídit, zda chce notifikace a jaké kanály (email/in-app)
3. ✅ **Uživatel** může řídit, ze kterých modulů chce notifikace (objednávky/faktury/smlouvy/pokladna)
4. ✅ **Backend** respektuje všechny úrovně při rozhodování o odeslání notifikace
5. ✅ **UI** poskytuje intuitivní ovládání s vizuální hierarchií a disabled states

**Priorita kaskády:** Global Settings > User Preferences > Hierarchy Configuration
