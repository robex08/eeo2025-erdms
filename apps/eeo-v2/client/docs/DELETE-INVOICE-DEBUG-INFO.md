# 🚨 KRITICKÝ PROBLÉM: Smazání Faktury Vrací 401/403 a Odhlásí Uživatele

## 📋 POPIS PROBLÉMU

**Co se děje:**
1. Uživatel otevře objednávku s fakturou
2. Klikne na "Smazat fakturu"
3. Místo smazání faktury dostane: **"Vaše přihlášení vypršelo"**
4. Aplikace ho automaticky odhlásí
5. Faktura zůstane NESMAZANÁ

**Pravděpodobná příčina:**
Backend vrací **401 Unauthorized** nebo **403 Forbidden** na endpoint `invoices25/delete`

---

## 🔧 TECHNICKÉ DETAILY

### Frontend Request
**Endpoint:** `POST /api.eeo/invoices25/delete`

**Payload:**
```json
{
  "token": "abcd1234...",
  "username": "jan.novak",
  "id": 123,
  "hard_delete": 1
}
```

**Axios Config:**
```javascript
const response = await api25invoices.post('invoices25/delete', payload, { 
  timeout: 10000 
});
```

### Očekávaná Response (SUCCESS)
```json
{
  "status": "ok",
  "message": "Faktura byla úspěšně smazána"
}
```

### Aktuální Response (ERROR)
```
HTTP Status: 401 Unauthorized nebo 403 Forbidden
```

**Následek:**
- Axios interceptor zachytí 401/403
- Spustí event `authError`
- AuthContext odhlásí uživatele
- Faktura zůstane v databázi

---

## ❓ OTÁZKY PRO BACKEND TÝM

### 1. Token Validace
**Q:** Kontroluje endpoint `invoices25/delete` platnost tokenu jiným způsobem než ostatní endpointy?

**Důvod:** Jiné endpointy fungují správně (list, download, upload attachments)

**Test:** Zkuste zavolat `invoices25/delete` se STEJNÝM tokenem, který funguje pro `invoices25/attachments` endpointy.

---

### 2. Timezone Issue
**Q:** Změnili jste nedávno timezone nastavení na BE?

**Souvislost:**
- Token expiration může být ovlivněn timezone
- Pokud server kontroluje čas tokenu v jiné timezone, může token vypadat jako expirovaný

**Test:**
```bash
# Co vrací server při smazání faktury?
curl -X POST https://eeo.zachranka.cz/api.eeo/invoices25/delete \
  -H "Content-Type: application/json" \
  -d '{
    "token": "VALIDNÍ_TOKEN",
    "username": "EXISTUJÍCÍ_USER",
    "id": 123,
    "hard_delete": 1
  }'
```

**Očekávaný výstup:**
- ✅ `{"status": "ok"}` - vše funguje
- ❌ `401` - token validation problem
- ❌ `403` - permission problem

---

### 3. Oprávnění (Permissions)
**Q:** Vyžaduje endpoint `invoices25/delete` speciální oprávnění?

**Kontrola:**
- Má uživatel právo mazat faktury?
- Je endpoint omezenej na určité role?
- Funguje smazání pro admina?

**Backend log:**
```
Najděte v logu řádek s: POST /invoices25/delete
Co je důvod 401/403?
- Token invalid?
- Token expired?
- Permission denied?
- User not found?
```

---

### 4. Request Format
**Q:** Očekává endpoint jiný formát payloadu?

**Možné problémy:**
```json
// ❌ Backend možná očekává:
{
  "token": "...",
  "username": "...",
  "faktura_id": 123,     // Místo "id"
  "hard_delete": true    // boolean místo 1
}

// ✅ Frontend posílá:
{
  "token": "...",
  "username": "...",
  "id": 123,             // Number
  "hard_delete": 1       // Number (int)
}
```

---

### 5. Content-Type Header
**Q:** Kontroluje endpoint Content-Type header?

**Frontend posílá:**
```
Content-Type: application/json
```

**BE možná očekává:**
```
Content-Type: application/x-www-form-urlencoded
```

---

## 🔍 DEBUGGING STEPS (Pro Backend)

### Krok 1: Zkontrolujte Backend Log
```bash
tail -f /var/log/apache2/error.log | grep "invoices25/delete"
# nebo
tail -f /var/log/nginx/error.log | grep "invoices25/delete"
```

**Hledejte:**
- Token validation errors
- Permission denied errors
- SQL errors
- Exception stack traces

---

### Krok 2: Porovnejte s Funkčním Endpointem
```bash
# Tento endpoint FUNGUJE:
POST /api.eeo/order-v2/invoices/{id}/attachments

# Tento endpoint NEFUNGUJE:
POST /api.eeo/invoices25/delete
```

**Otázka:** Jaký je rozdíl v token validaci mezi těmito endpointy?

---

### Krok 3: Timezone Check
```php
// V PHP kontrola:
echo date_default_timezone_get();
echo "\n";
echo date('Y-m-d H:i:s');
echo "\n";
echo gmdate('Y-m-d H:i:s');

// Pokud jsou rozdílné, může to způsobit token expiration issues
```

---

### Krok 4: Ruční Test s Platným Tokenem
```bash
# 1. Získej token z prohlížeče (DevTools -> Application -> localStorage)
TOKEN="..."
USERNAME="..."

# 2. Test funkčního endpointu (attachments list)
curl -X POST https://eeo.zachranka.cz/api.eeo/order-v2/invoices/123/attachments \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"username\": \"$USERNAME\", \"faktura_id\": 123}"

# 3. Stejný token na problémový endpoint
curl -X POST https://eeo.zachranka.cz/api.eeo/invoices25/delete \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"username\": \"$USERNAME\", \"id\": 123, \"hard_delete\": 1}"
```

**Pokud krok 2 funguje a krok 3 vrací 401:**
→ Problém je v `invoices25/delete` endpointu, ne v tokenu!

---

## 🎯 CO OČEKÁVÁME OD BE

### Odpověď na tyto otázky:

1. **HTTP Status Code:**
   - Jaký přesně status vrací `invoices25/delete`? (401, 403, 500, jiný?)

2. **Error Message:**
   - Jakou error message vrací server? (JSON response body)

3. **Backend Log:**
   ```
   Co je v logu při pokusu o smazání faktury?
   - Token validation error?
   - Permission denied?
   - SQL error?
   - Exception?
   ```

4. **Token Validation:**
   ```
   Kontroluje invoices25/delete token stejně jako ostatní endpointy?
   - Stejná funkce/metoda?
   - Stejný timezone?
   - Stejný expiration check?
   ```

5. **Permissions:**
   ```
   Vyžaduje invoices25/delete speciální oprávnění?
   - Role check?
   - Feature flag?
   - User status check?
   ```

6. **Timezone:**
   ```
   Změnili jste timezone na serveru?
   - date_default_timezone_get() = ?
   - Kdy byla změna?
   - Ovlivňuje token expiration?
   ```

---

## 🔧 MOŽNÁ ŘEŠENÍ (Pro Backend)

### Řešení #1: Unified Token Validation
```php
// Použít STEJNOU funkci pro validaci tokenu jako ostatní endpointy
function validateToken($token, $username) {
    // Stejná logika jako v order-v2/* endpointech
    // DŮLEŽITÉ: Stejný timezone!
}
```

### Řešení #2: Fix Timezone
```php
// Na začátku každého endpointu
date_default_timezone_set('Europe/Prague');
// nebo
date_default_timezone_set('UTC');
```

### Řešení #3: Debug Response
```php
// Dočasně v invoices25/delete - přidat debug info
if (!isTokenValid($token)) {
    error_log("DELETE_INVOICE: Token invalid");
    error_log("DELETE_INVOICE: Current time: " . date('Y-m-d H:i:s'));
    error_log("DELETE_INVOICE: Token expiry: " . $tokenExpiry);
    error_log("DELETE_INVOICE: Timezone: " . date_default_timezone_get());
    
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'message' => 'Token expired',
        'debug' => [
            'server_time' => date('Y-m-d H:i:s'),
            'timezone' => date_default_timezone_get(),
            'token_expiry' => $tokenExpiry
        ]
    ]);
    exit;
}
```

---

## 📊 SROVNÁNÍ ENDPOINTŮ

| Endpoint | Status | Token Check | Response |
|----------|--------|-------------|----------|
| `order-v2/invoices/{id}/attachments` | ✅ FUNGUJE | ✅ OK | 200 + data |
| `order-v2/invoices/{id}/attachments/upload` | ✅ FUNGUJE | ✅ OK | 200 + data |
| `order-v2/invoices/{id}/attachments/{att_id}` (DELETE) | ✅ FUNGUJE | ✅ OK | 200 + data |
| **`invoices25/delete`** | ❌ **NEFUNGUJE** | ❌ **401/403** | **Unauthorized** |

**Závěr:** Problém je POUZE v `invoices25/delete`, všechny ostatní endpointy fungují se stejným tokenem!

---

## 🚀 TEMPORARY WORKAROUND (Frontend)

Než BE opravi, můžeme dočasně:

### Option 1: Disable Auto-Logout for Delete Invoice
```javascript
// V api25invoices.js - upravit interceptor
api25invoices.interceptors.response.use(
  (response) => response,
  (error) => {
    // POUZE pro delete endpoint NEPROVÁDĚT auto-logout
    if (error.config?.url?.includes('invoices25/delete')) {
      console.warn('⚠️ Delete invoice failed, but NOT triggering auto-logout');
      // Vrátit error, ale NEspustit authError event
      return Promise.reject(error);
    }
    
    // Pro ostatní endpointy zachovat původní chování
    if (error.response?.status === 401 || error.response?.status === 403) {
      window.dispatchEvent(new CustomEvent('authError', { 
        detail: { message: 'Vaše přihlášení vypršelo.' }
      }));
    }
    return Promise.reject(error);
  }
);
```

### Option 2: Retry s Refresh Token
```javascript
// Pokud 401, zkus refresh token a opakuj request
```

---

## 📞 KONTAKT

**Frontend Developer:** Jan Holovský  
**Urgence:** 🔴 KRITICKÁ - blokuje mazání faktur  
**Datum hlášení:** 31. října 2025

**Prosím o odpověď do 24 hodin** - uživatelé nemohou mazat faktury!

---

## ✅ CHECKLIST PRO BE

- [ ] Zkontrolovat backend log pro `invoices25/delete` requesty
- [ ] Porovnat token validation s `order-v2/*` endpointy
- [ ] Ověřit timezone nastavení serveru
- [ ] Zkontrolovat permissions pro delete operation
- [ ] Zalogovat HTTP status a error message
- [ ] Poslat debug info FE týmu
- [ ] Opravit token validation (pokud je problém tam)
- [ ] Otestovat fix s platným tokenem

---

**Připravil:** GitHub Copilot  
**Datum:** 31. října 2025  
**Priorita:** 🔴 CRITICAL
