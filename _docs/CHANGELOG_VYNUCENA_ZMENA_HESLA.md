# Vynucená změna hesla - Implementace

**Datum:** 28. prosince 2025  
**Autor:** GitHub Copilot  
**Branch:** feature/generic-recipient-system

## 📋 Přehled

Implementována funkcionalita pro vynucení změny hesla při dočasných heslech nebo admin reset.

## 🔧 Databázové změny

### Nový sloupec v tabulce `25_uzivatele`

```sql
ALTER TABLE 25_uzivatele 
ADD COLUMN vynucena_zmena_hesla TINYINT(1) NOT NULL DEFAULT 0 
COMMENT 'Vynucená změna hesla při příštím přihlášení (1=ano, 0=ne)' 
AFTER aktivni;
```

**Vlastnosti:**
- `TINYINT(1)` - Boolean hodnota (0/1)
- `NOT NULL DEFAULT 0` - Výchozí stav = nevynuceno
- Index pro rychlé vyhledávání

## 🛠️ API Changes

### 1. Rozšířené User API

**Soubor:** `/lib/userHandlers.php`
- Přidána validace pole `vynucena_zmena_hesla` 
- Přidáno do allowed fields při update

### 2. Aktualizované SQL dotazy  

**Soubor:** `/lib/queries.php`
- `uzivatele_detail` - přidán sloupec `vynucena_zmena_hesla`
- `uzivatele_detail_by_username` - přidán sloupec
- `uzivatele_login` - **KRITICKY DŮLEŽITÉ** - přidán pro kontrolu při přihlášení

### 3. Nový Password Management API

**Soubor:** `/password-management.php`

#### Endpointy:

##### 1. Reset hesla (admin)
```http
POST /password-management.php
Content-Type: application/json

{
  "action": "reset-password",
  "token": "...",
  "username": "admin_username", 
  "target_user_id": 123
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Heslo bylo resetováno",
  "data": {
    "temporary_password": "U04726",
    "user_id": 123,
    "username": "user.novak",
    "forced_change": true
  }
}
```

##### 2. Změna hesla (uživatel)
```http
POST /password-management.php
Content-Type: application/json

{
  "action": "change-password",
  "token": "...",
  "username": "user.novak",
  "old_password": "U04726",
  "new_password": "noveheslo123"
}
```

##### 3. Vynucení změny hesla (admin)
```http
POST /password-management.php
Content-Type: application/json

{
  "action": "force-password-change",
  "token": "...", 
  "username": "admin_username",
  "target_user_id": 123,
  "force": true
}
```

## 🎯 Login Flow Implementation

### Aktuální stav
Rozšířený `uzivatele_login` query nyní vrací `vynucena_zmena_hesla`.

### Potřebné úpravy v login procesu:

```javascript
// Frontend login handler
const loginResponse = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

const data = await loginResponse.json();

if (data.status === 'success') {
  if (data.user.vynucena_zmena_hesla === 1) {
    // Přesměruj na formulář změny hesla
    // UŽIVATEL NESMÍ POKRAČOVAT DO APLIKACE
    window.location.href = '/change-password';
  } else {
    // Normální přihlášení
    window.location.href = '/dashboard';
  }
}
```

### Backend login handler úprava:

```php
// V login handleru po ověření hesla
if ($user['vynucena_zmena_hesla'] == 1) {
    // Vrátit speciální status
    echo json_encode([
        'status' => 'password_change_required',
        'message' => 'Musíte si změnit heslo',
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'vynucena_zmena_hesla' => 1
        ]
    ]);
    return;
}
```

## 🔐 Bezpečnostní aspekty

### 1. Dočasné heslo format
- Format: `U + 5 číslic` (např. U04726)
- Jednoznačně identifikovatelné jako dočasné
- 100,000 možných kombinací (dostatečné pro krátkou dobu)

### 2. Automatické nastavení vynucené změny
- Při `reset-password` se automaticky nastaví `vynucena_zmena_hesla = 1`
- Při úspěšné `change-password` se automaticky resetuje na `0`

### 3. Kontrola při přihlášení
- Login dotaz nyní vrací `vynucena_zmena_hesla`
- Frontend/Backend musí kontrolovat tuto hodnotu
- Pokud je `1`, uživatel NEMŮŽE pokračovat bez změny hesla

## 📄 SQL příklady

### Nastavení vynucené změny hesla manuálně:
```sql
UPDATE 25_uzivatele 
SET vynucena_zmena_hesla = 1 
WHERE username = 'user.novak';
```

### Kontrola uživatelů s vynucenou změnou:
```sql
SELECT id, username, jmeno, prijmeni, email, vynucena_zmena_hesla
FROM 25_uzivatele 
WHERE vynucena_zmena_hesla = 1 AND aktivni = 1;
```

### Reset vynucené změny po změně hesla:
```sql
UPDATE 25_uzivatele 
SET vynucena_zmena_hesla = 0 
WHERE id = 123;
```

## 🚧 TODO - Další kroky

### 1. Frontend implementace
- [ ] Úprava login page pro detekci `vynucena_zmena_hesla`
- [ ] Vytvoření formuláře pro změnu hesla
- [ ] Přesměrování při vynucené změně
- [ ] Blokování přístupu do aplikace bez změny

### 2. Admin funkcionalita  
- [ ] Tlačítko "Reset hesla" v admin panelu
- [ ] Zobrazení stavu vynucené změny hesla
- [ ] Bulk operace pro více uživatelů

### 3. Email notifikace
- [ ] Odeslání uvítacího emailu s dočasným heslem
- [ ] Použití HTML šablony z debug panelu
- [ ] Placeholder `{docasne_heslo}` integration

## 🧪 Testování

### Test scenarios:
1. **Admin reset hesla**
   - Reset hesla přes API
   - Ověření vygenerování dočasného hesla
   - Kontrola nastavení `vynucena_zmena_hesla = 1`

2. **Uživatel mění heslo**
   - Přihlášení s dočasným heslem  
   - Změna hesla přes API
   - Ověření reset `vynucena_zmena_hesla = 0`

3. **Login flow s vynucenou změnou**
   - Přihlášení s `vynucena_zmena_hesla = 1`
   - Ověření blokování přístupu
   - Test přesměrování na change password

## 📁 Soubory
- `_docs/database-migrations/ALTER_25_UZIVATELE_ADD_VYNUCENA_ZMENA_HESLA.sql` - Migrace DB
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/password-management.php` - Nové API
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/userHandlers.php` - Rozšířená validace
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php` - Aktualizované dotazy

## ⚡ Rychlý test

```bash
# Test reset hesla
curl -X POST http://localhost/password-management.php \
-H "Content-Type: application/json" \
-d '{"action":"reset-password","token":"...","username":"admin","target_user_id":123}'

# Test změny hesla  
curl -X POST http://localhost/password-management.php \
-H "Content-Type: application/json" \
-d '{"action":"change-password","token":"...","username":"user.novak","old_password":"U04726","new_password":"noveheslo123"}'
```