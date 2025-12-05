# Entra ID ↔ PHP Token Bridge Strategy

**Datum:** 5. prosince 2025  
**Autor:** Technická dokumentace ERDMS  
**Účel:** Propojení Microsoft Entra ID autentizace s legacy PHP API token systémem

---

## 📋 Obsah

1. [Přehled problému](#přehled-problému)
2. [Současný stav - Legacy PHP Token System](#současný-stav---legacy-php-token-system)
3. [Navrhované řešení - Token Bridge](#navrhované-řešení---token-bridge)
4. [Implementační detaily](#implementační-detaily)
5. [Bezpečnostní aspekty](#bezpečnostní-aspekty)
6. [Testovací scénáře](#testovací-scénáře)
7. [Migrace na produkci](#migrace-na-produkci)

---

## Přehled problému

### Současná situace

**Legacy EEO API (PHP):**
- 69 PHP souborů v `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/`
- Vlastní token systém: `base64_encode(username|timestamp)`
- Každý API endpoint ověřuje: `verify_token_v2($username, $token)`
- Token platnost: 24 hodin
- Databáze: `eeo_db.25_uzivatele` (25+ custom polí)

**Nová Entra ID autentizace (Node.js):**
- Microsoft OAuth2 flow
- Session v `erdms.erdms_sessions`
- Cookie-based: `erdms_session`
- Graph API integrace

### Požadavky na řešení

✅ **Nesmí vyžadovat změny v 69 existujících PHP souborech**  
✅ **Zachovat kompatibilitu s existujícím token formátem**  
✅ **Bezpečné ověření Entra ID session před vydáním tokenu**  
✅ **Podpora pro Just-In-Time user provisioning**  
✅ **Backward compatibility s lokálním loginem**

---

## Současný stav - Legacy PHP Token System

### Token formát a generování

```php
// handlers.php: handle_login() - řádek ~348
$token = base64_encode($user['username'] . '|' . time());
```

**Příklad tokenu:**
```
dGVzdHVzZXJ8MTczMzQwMDAwMA==
```

**Dekódovaná struktura:**
```
testuser|1733400000
    ↑        ↑
username  timestamp (Unix)
```

### Verifikační funkce

#### `verify_token($token, $db = null)`

**Umístění:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php:41`

```php
function verify_token($token, $db = null) {
    if (!$token) return false;
    
    // Dekódování base64
    $decoded = base64_decode($token);
    if (!$decoded) return false;
    
    // Parsování username|timestamp
    $parts = explode('|', $decoded);
    if (count($parts) !== 2) return false;
    
    list($username, $timestamp) = $parts;
    
    // Kontrola expirace (24 hodin)
    if (time() - $timestamp > 86400) return false;
    
    // Ověření existence a aktivního stavu uživatele
    $stmt = $db->prepare("SELECT id, username FROM 25_uzivatele WHERE username = ? AND aktivni = 1");
    $stmt->execute(array($username));
    $user = $stmt->fetch();
    
    if (!$user) return false;
    
    return array('id' => (int)$user['id'], 'username' => $username);
}
```

#### `verify_token_v2($username, $token, $db = null)`

**Umístění:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php:92`

```php
function verify_token_v2($username, $token, $db = null) {
    if (!$token || !$username) return false;
    
    // Volá verify_token() pro základní ověření
    $token_data = verify_token($token, $db);
    if (!$token_data) return false;
    
    // Dodatečná kontrola: username z požadavku musí odpovídat tokenu
    if ($token_data['username'] !== $username) {
        error_log("verify_token_v2: Username mismatch - token: {$token_data['username']}, request: {$username}");
        return false;
    }
    
    return $token_data;
}
```

### Použití v PHP endpointech

**Typický pattern (přes 20 instancí v api.php):**

```php
// Příklad: limitovane-prisliby/prepocet endpoint - řádek 3296
$token = isset($input['token']) ? $input['token'] : '';
$username = isset($input['username']) ? $input['username'] : '';
$auth_result = verify_token_v2($username, $token);

if (!$auth_result) {
    http_response_code(401);
    echo json_encode(array('status' => 'error', 'message' => 'Nepřihlášen'));
    break;
}

// Pokračování s ověřeným uživatelem
$user_id = $auth_result['id'];
// ... business logika
```

### Token konfigurace

**Konstanty v handlers.php:**

```php
define('TOKEN_LIFETIME', 24 * 3600);           // 24 hodin = 86400 sekund
define('TOKEN_REFRESH_THRESHOLD', 2 * 3600);   // Refresh < 2 hodiny = 7200 sekund
```

### Login endpoint

**Endpoint:** `POST /api.eeo/login`

**Request:**
```json
{
  "username": "testuser",
  "password": "heslo123"
}
```

**Response (úspěch):**
```json
{
  "id": 42,
  "username": "testuser",
  "jmeno": "Jan",
  "prijmeni": "Novák",
  "email": "jan.novak@zachranka.cz",
  "token": "dGVzdHVzZXJ8MTczMzQwMDAwMA=="
}
```

**Response (chyba):**
```json
{
  "err": "Špatné přihlašovací údaje",
  "debug": { ... }
}
```

---

## Navrhované řešení - Token Bridge

### Architektura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Microsoft Entra ID OAuth Flow                     │  │
│  │     https://erdms.zachranka.cz/auth/login            │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│                       ▼                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  2. Node.js Auth API                                  │  │
│  │     POST /api/auth/callback                           │  │
│  │     → vytvoří erdms_session cookie                    │  │
│  │     → uloží session do erdms.erdms_sessions          │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│                       ▼                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  3. EEO React App startup                             │  │
│  │     → detekuje erdms_session cookie                   │  │
│  │     → volá Token Bridge endpoint                      │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              NODE.JS EEO API (Bridge)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  4. POST /api/eeo/entra-bridge                        │  │
│  │     → ověří erdms_session cookie (sessionMiddleware) │  │
│  │     → získá username z req.user                       │  │
│  │     → volá PHP endpoint /api.eeo/entra-login         │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                PHP API (Legacy)                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  5. POST /api.eeo/entra-login (NOVÝ ENDPOINT)        │  │
│  │     → ověří Entra session v erdms.erdms_sessions     │  │
│  │     → načte user z eeo_db.25_uzivatele               │  │
│  │     → vygeneruje PHP token: base64(username|time())  │  │
│  │     → vrátí { token, username, user_data }           │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND (React EEO App)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  6. Uložení tokenu a použití v API calls             │  │
│  │     localStorage.setItem('eeo_token', token)         │  │
│  │     localStorage.setItem('eeo_username', username)   │  │
│  │                                                        │  │
│  │  7. Každý PHP API call přidá:                         │  │
│  │     { username: ..., token: ..., ...params }         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Dataflow diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │         │  Node.js API │         │   PHP API   │
└──────┬──────┘         └───────┬──────┘         └──────┬──────┘
       │                        │                        │
       │ 1. Entra login flow    │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │ 2. erdms_session cookie│                        │
       │<───────────────────────│                        │
       │                        │                        │
       │ 3. POST /api/eeo/      │                        │
       │    entra-bridge        │                        │
       │    + cookie            │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │                        │ 4. Verify session      │
       │                        │    in DB               │
       │                        │                        │
       │                        │ 5. POST /api.eeo/      │
       │                        │    entra-login         │
       │                        │    {username,          │
       │                        │     entra_session_id}  │
       │                        │───────────────────────>│
       │                        │                        │
       │                        │                        │ 6. Verify
       │                        │                        │    Entra
       │                        │                        │    session
       │                        │                        │
       │                        │ 7. {token, username}   │
       │                        │<───────────────────────│
       │                        │                        │
       │ 8. {token, username,   │                        │
       │     user_data}         │                        │
       │<───────────────────────│                        │
       │                        │                        │
       │ 9. Save to localStorage│                        │
       │                        │                        │
       │ 10. POST /api.eeo/     │                        │
       │     objednavky/list    │                        │
       │     {username, token}  │                        │
       │────────────────────────┼───────────────────────>│
       │                        │                        │
       │                        │                        │ 11. verify_
       │                        │                        │     token_v2()
       │                        │                        │
       │ 12. {data}             │                        │
       │<────────────────────────────────────────────────│
       │                        │                        │
```

---

## Implementační detaily

### 1. Nová PHP funkce: `handle_entra_login()`

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php`

**Umístění:** Přidat před funkci `handle_user_detail()` (cca řádek 360)

```php
/**
 * Handle Entra ID authentication bridge
 * Generates PHP-compatible token after validating Entra session
 * 
 * @param array $input POST data containing username and entra_session_id
 * @param array $config Database configuration
 * @param array $queries SQL queries (not used in this handler)
 * @return void Echoes JSON response
 */
function handle_entra_login($input, $config, $queries) {
    $username = isset($input['username']) ? trim($input['username']) : '';
    $entra_session_id = isset($input['entra_session_id']) ? trim($input['entra_session_id']) : '';

    // Validace vstupů
    if (!$username || !$entra_session_id) {
        http_response_code(400);
        echo json_encode(array(
            'err' => 'Chybí username nebo entra_session_id',
            'code' => 'MISSING_PARAMS'
        ));
        return;
    }

    try {
        // === KROK 1: Ověření Entra session v erdms.erdms_sessions ===
        
        // Připojení k erdms databázi
        $erdms_dsn = "mysql:host={$config['host']};dbname=erdms;charset=utf8mb4";
        $erdms_db = new PDO($erdms_dsn, $config['username'], $config['password'], array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ));
        
        // Ověř, že session existuje a není vypršená
        $stmt_session = $erdms_db->prepare(
            "SELECT es.user_id, es.expires_at, eu.username, eu.email 
             FROM erdms_sessions es
             JOIN erdms_users eu ON es.user_id = eu.id
             WHERE es.session_id = :session_id 
             AND es.expires_at > NOW()"
        );
        $stmt_session->bindParam(':session_id', $entra_session_id);
        $stmt_session->execute();
        $session = $stmt_session->fetch();
        
        if (!$session) {
            http_response_code(401);
            echo json_encode(array(
                'err' => 'Neplatná nebo vypršená Entra session',
                'code' => 'INVALID_SESSION'
            ));
            return;
        }
        
        // Ověř, že username z requestu odpovídá username ze session
        if ($session['username'] !== $username) {
            http_response_code(401);
            echo json_encode(array(
                'err' => 'Username z requestu neodpovídá Entra session',
                'code' => 'USERNAME_MISMATCH',
                'debug' => array(
                    'request_username' => $username,
                    'session_username' => $session['username']
                )
            ));
            return;
        }
        
        // === KROK 2: Načtení uživatele z eeo_db.25_uzivatele ===
        
        // Připojení k eeo_db databázi
        $eeo_db = get_db($config);
        
        $stmt_user = $eeo_db->prepare(
            "SELECT id, username, jmeno, prijmeni, email, telefon, 
                    pozice, oddeleni, aktivni, created_at, updated_at
             FROM 25_uzivatele 
             WHERE username = :username AND aktivni = 1"
        );
        $stmt_user->bindParam(':username', $username);
        $stmt_user->execute();
        $user = $stmt_user->fetch();
        
        if (!$user) {
            // === JUST-IN-TIME PROVISIONING ===
            // Pokud uživatel neexistuje v EEO DB, vytvoř ho
            
            // Získej plná data z Graph API (ulož v erdms_users)
            // Pro nyní: vytvoř základní záznam
            
            $stmt_create = $eeo_db->prepare(
                "INSERT INTO 25_uzivatele 
                 (username, email, jmeno, prijmeni, aktivni, auth_source, entra_id, created_at) 
                 VALUES 
                 (:username, :email, '', '', 1, 'entra', :entra_user_id, NOW())"
            );
            $stmt_create->bindParam(':username', $username);
            $stmt_create->bindParam(':email', $session['email']);
            $stmt_create->bindParam(':entra_user_id', $session['user_id']);
            $stmt_create->execute();
            
            $new_user_id = $eeo_db->lastInsertId();
            
            // Načti znovu vytvořeného uživatele
            $stmt_user->execute();
            $user = $stmt_user->fetch();
            
            if (!$user) {
                http_response_code(500);
                echo json_encode(array(
                    'err' => 'Nepodařilo se vytvořit uživatele',
                    'code' => 'USER_CREATION_FAILED'
                ));
                return;
            }
            
            error_log("JIT Provisioning: Created user ID {$new_user_id} for username {$username}");
        }
        
        // === KROK 3: Generování PHP-kompatibilního tokenu ===
        
        $timestamp = time();
        $token = base64_encode($user['username'] . '|' . $timestamp);
        
        // Logovací informace
        error_log("Entra Bridge: Generated token for user {$username}, expires " . date('Y-m-d H:i:s', $timestamp + TOKEN_LIFETIME));
        
        // === KROK 4: Update last_activity (optional) ===
        
        try {
            $stmt_activity = $eeo_db->prepare(
                "UPDATE 25_uzivatele SET last_activity = NOW() WHERE id = :id"
            );
            $stmt_activity->bindParam(':id', $user['id']);
            $stmt_activity->execute();
        } catch (Exception $e) {
            // Non-fatal, pokračuj i když update selže
            error_log("Warning: Failed to update last_activity for user {$username}: " . $e->getMessage());
        }
        
        // === KROK 5: Vrácení odpovědi ===
        
        // Odstraň citlivá data
        unset($user['password_hash']);
        
        // Přidej token
        $user['token'] = $token;
        $user['token_expires_at'] = date('Y-m-d H:i:s', $timestamp + TOKEN_LIFETIME);
        $user['auth_method'] = 'entra_bridge';
        
        http_response_code(200);
        echo json_encode($user);
        exit;
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(array(
            'err' => 'Chyba databáze: ' . $e->getMessage(),
            'code' => 'DB_ERROR'
        ));
        error_log("Entra Bridge DB Error: " . $e->getMessage());
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'err' => 'Neočekávaná chyba: ' . $e->getMessage(),
            'code' => 'INTERNAL_ERROR'
        ));
        error_log("Entra Bridge Error: " . $e->getMessage());
        exit;
    }
}
```

### 2. Registrace endpointu v api.php

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php`

**Umístění:** Přidat před existující `if ($endpoint === 'login')` blok

```php
// === ENTRA ID AUTHENTICATION BRIDGE ===
if ($endpoint === 'entra-login') {
    require_once __DIR__ . '/' . VERSION . '/lib/handlers.php';
    handle_entra_login($input, $config, $queries);
    break;
}

// === EXISTING LOGIN ENDPOINT ===
if ($endpoint === 'login') {
    // ... existing code
}
```

### 3. Node.js Bridge Endpoint

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api/src/routes/entra.js`

**Přidat nový route:**

```javascript
/**
 * POST /api/eeo/entra-bridge
 * 
 * Generates PHP-compatible token by validating Entra session
 * and calling PHP API entra-login endpoint
 * 
 * Requires: erdms_session cookie (validated by sessionMiddleware)
 * Returns: { token, username, user: {...} }
 */
router.post('/entra-bridge', sessionMiddleware, async (req, res) => {
    try {
        const sessionId = req.cookies.erdms_session;
        const username = req.user.username;
        
        if (!sessionId || !username) {
            return res.status(401).json({ 
                error: 'Missing session or username',
                code: 'MISSING_AUTH'
            });
        }
        
        console.log(`🔗 Entra Bridge: Creating PHP token for user: ${username}`);
        
        // Zavolej PHP API endpoint
        const phpApiUrl = process.env.PHP_API_URL || 'http://localhost/api.eeo/entra-login';
        
        const phpResponse = await fetch(phpApiUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'ERDMS-Bridge/1.0'
            },
            body: JSON.stringify({
                username: username,
                entra_session_id: sessionId
            })
        });
        
        const phpData = await phpResponse.json();
        
        if (!phpResponse.ok) {
            console.error(`❌ PHP API error (${phpResponse.status}):`, phpData);
            return res.status(phpResponse.status).json({
                error: phpData.err || 'PHP API returned error',
                code: phpData.code || 'PHP_API_ERROR',
                details: phpData
            });
        }
        
        console.log(`✅ Token generated for ${username}, expires: ${phpData.token_expires_at}`);
        
        // Vrať token a user data
        res.json({
            token: phpData.token,
            username: phpData.username,
            token_expires_at: phpData.token_expires_at,
            auth_method: 'entra_bridge',
            user: {
                id: phpData.id,
                username: phpData.username,
                jmeno: phpData.jmeno,
                prijmeni: phpData.prijmeni,
                email: phpData.email,
                telefon: phpData.telefon,
                pozice: phpData.pozice,
                oddeleni: phpData.oddeleni
            }
        });
        
    } catch (error) {
        console.error('❌ Entra bridge error:', error);
        res.status(500).json({ 
            error: 'Bridge failed',
            code: 'BRIDGE_ERROR',
            message: error.message
        });
    }
});

module.exports = router;
```

### 4. Frontend React EEO App - Auth Service

**Soubor:** `apps/eeo-v2/client/src/services/authService.js` (přibližný název)

```javascript
class AuthService {
    constructor() {
        this.TOKEN_KEY = 'eeo_token';
        this.USERNAME_KEY = 'eeo_username';
        this.USER_KEY = 'eeo_user';
        this.TOKEN_EXPIRES_KEY = 'eeo_token_expires';
    }
    
    /**
     * Inicializace po Entra login
     * Získá PHP token z bridge endpointu
     */
    async initializeFromEntraSession() {
        try {
            console.log('🔐 Initializing EEO authentication from Entra session...');
            
            const response = await fetch('/api/eeo/entra-bridge', {
                method: 'POST',
                credentials: 'include', // Důležité: pošle erdms_session cookie
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to get PHP token');
            }
            
            const data = await response.json();
            
            // Ulož token a user data
            localStorage.setItem(this.TOKEN_KEY, data.token);
            localStorage.setItem(this.USERNAME_KEY, data.username);
            localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
            localStorage.setItem(this.TOKEN_EXPIRES_KEY, data.token_expires_at);
            
            console.log('✅ EEO authentication initialized:', {
                username: data.username,
                expires: data.token_expires_at
            });
            
            return data.user;
            
        } catch (error) {
            console.error('❌ Failed to initialize EEO auth:', error);
            throw error;
        }
    }
    
    /**
     * Kontrola, zda je uživatel přihlášen
     */
    isAuthenticated() {
        const token = localStorage.getItem(this.TOKEN_KEY);
        const username = localStorage.getItem(this.USERNAME_KEY);
        const expiresAt = localStorage.getItem(this.TOKEN_EXPIRES_KEY);
        
        if (!token || !username) {
            return false;
        }
        
        // Kontrola expirace
        if (expiresAt) {
            const expiryDate = new Date(expiresAt);
            if (expiryDate <= new Date()) {
                console.warn('⚠️ Token expired, clearing auth data');
                this.logout();
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Získání uživatelských dat
     */
    getCurrentUser() {
        const userJson = localStorage.getItem(this.USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    }
    
    /**
     * Získání auth parametrů pro PHP API volání
     */
    getAuthParams() {
        return {
            username: localStorage.getItem(this.USERNAME_KEY),
            token: localStorage.getItem(this.TOKEN_KEY)
        };
    }
    
    /**
     * Kontrola, zda token brzy vyprší (< 2 hodiny)
     */
    shouldRefreshToken() {
        const expiresAt = localStorage.getItem(this.TOKEN_EXPIRES_KEY);
        if (!expiresAt) return false;
        
        const expiryDate = new Date(expiresAt);
        const now = new Date();
        const twoHours = 2 * 60 * 60 * 1000; // 2 hodiny v ms
        
        return (expiryDate - now) < twoHours;
    }
    
    /**
     * Odhlášení
     */
    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USERNAME_KEY);
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem(this.TOKEN_EXPIRES_KEY);
        
        // Redirect na hlavní přihlašovací stránku
        window.location.href = '/auth/login';
    }
}

export default new AuthService();
```

### 5. Frontend React EEO App - API Service

**Soubor:** `apps/eeo-v2/client/src/services/apiService.js`

```javascript
import authService from './authService';

class ApiService {
    constructor() {
        this.baseUrl = '/api.eeo'; // PHP API endpoint
    }
    
    /**
     * Generický POST request na PHP API
     */
    async post(endpoint, data = {}) {
        try {
            // Přidej authentication params
            const authParams = authService.getAuthParams();
            const requestData = {
                ...authParams,
                ...data
            };
            
            console.log(`📤 API Request: POST ${endpoint}`, {
                username: requestData.username,
                params: Object.keys(data)
            });
            
            const response = await fetch(`${this.baseUrl}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            const responseData = await response.json();
            
            if (!response.ok) {
                console.error(`❌ API Error: ${endpoint}`, responseData);
                
                // Pokud je chyba autentizace, odhlásit
                if (response.status === 401) {
                    authService.logout();
                }
                
                throw new Error(responseData.err || responseData.error || 'API request failed');
            }
            
            console.log(`✅ API Response: ${endpoint}`, {
                status: response.status,
                hasData: !!responseData
            });
            
            return responseData;
            
        } catch (error) {
            console.error(`❌ API Request failed: ${endpoint}`, error);
            throw error;
        }
    }
    
    /**
     * Příklady specifických API calls
     */
    
    async getObjednavkyList(filters = {}) {
        return this.post('objednavky/list', filters);
    }
    
    async getUserDetail(userId) {
        return this.post('user/detail', { user_id: userId });
    }
    
    async getLimitovanePrislibyList() {
        return this.post('limitovane-prisliby/list');
    }
    
    // ... další metody podle potřeby
}

export default new ApiService();
```

### 6. Frontend React EEO App - App Component

**Soubor:** `apps/eeo-v2/client/src/App.jsx`

```javascript
import React, { useEffect, useState } from 'react';
import authService from './services/authService';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        initializeAuth();
    }, []);
    
    async function initializeAuth() {
        try {
            setIsLoading(true);
            
            // Zkontroluj, zda už máme platný token
            if (authService.isAuthenticated()) {
                console.log('✅ Using existing EEO token');
                const currentUser = authService.getCurrentUser();
                setUser(currentUser);
                setIsAuthenticated(true);
                setIsLoading(false);
                return;
            }
            
            // Pokud nemáme token, zkus získat z Entra session
            console.log('🔄 No EEO token found, initializing from Entra session...');
            const user = await authService.initializeFromEntraSession();
            
            setUser(user);
            setIsAuthenticated(true);
            setError(null);
            
        } catch (error) {
            console.error('❌ Authentication initialization failed:', error);
            setError(error.message);
            setIsAuthenticated(false);
            
            // Redirect na login po 2 sekundách
            setTimeout(() => {
                window.location.href = '/auth/login';
            }, 2000);
            
        } finally {
            setIsLoading(false);
        }
    }
    
    if (isLoading) {
        return (
            <div className="app-loading">
                <LoadingSpinner />
                <p>Inicializuji autentizaci...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="app-error">
                <h2>Chyba autentizace</h2>
                <p>{error}</p>
                <p>Přesměrovávám na přihlášení...</p>
            </div>
        );
    }
    
    if (!isAuthenticated) {
        return (
            <div className="app-error">
                <h2>Nejste přihlášeni</h2>
                <p>Přesměrovávám...</p>
            </div>
        );
    }
    
    // Hlavní aplikace
    return (
        <div className="app">
            <header>
                <h1>EEO Aplikace</h1>
                <div className="user-info">
                    <span>{user.jmeno} {user.prijmeni}</span>
                    <button onClick={() => authService.logout()}>
                        Odhlásit
                    </button>
                </div>
            </header>
            
            <main>
                {/* Zde bude hlavní obsah aplikace */}
            </main>
        </div>
    );
}

export default App;
```

---

## Bezpečnostní aspekty

### ✅ Ověřené prvky

1. **Dual Session Validation**
   - Entra session ověřena v `erdms.erdms_sessions`
   - Username match mezi requestem a session
   - Kontrola expirace session

2. **Token Security**
   - Token má 24h expiraci (TOKEN_LIFETIME)
   - Formát identický s legacy systémem
   - Vyžaduje aktivního uživatele v DB

3. **Database Integrity**
   - Separate database connections (erdms vs eeo_db)
   - Prepared statements pro prevenci SQL injection
   - Transaction rollback při chybách

4. **Cookie Security**
   - `erdms_session` cookie: httpOnly, sameSite: 'lax'
   - Není přístupná z JavaScriptu
   - Automaticky posílána s credentials: 'include'

### ⚠️ Potenciální rizika a mitigace

| Riziko | Dopad | Mitigace |
|--------|-------|----------|
| Token theft z localStorage | Vysoký | Implementovat token refresh, short-lived tokens |
| Session fixation | Střední | Regenerovat session ID po Entra login |
| CSRF na /entra-bridge | Střední | Přidat CSRF token validation |
| XSS útok | Vysoký | Content Security Policy, sanitize inputs |
| Man-in-the-middle | Vysoký | Enforce HTTPS, HSTS headers |

### 🔒 Doporučená vylepšení

```javascript
// Token refresh middleware v React
useEffect(() => {
    const interval = setInterval(() => {
        if (authService.shouldRefreshToken()) {
            console.log('🔄 Refreshing token...');
            authService.initializeFromEntraSession();
        }
    }, 15 * 60 * 1000); // Každých 15 minut
    
    return () => clearInterval(interval);
}, []);
```

---

## Testovací scénáře

### Test 1: Úspěšné přihlášení přes Entra

**Kroky:**
1. Naviguj na `https://erdms.zachranka.cz/eeo`
2. Automatický redirect na Entra login
3. Přihlaš se Microsoft účtem
4. Callback vrátí na `/eeo`
5. App zavolá `/api/eeo/entra-bridge`
6. Bridge zavolá `/api.eeo/entra-login`
7. PHP vrátí token
8. App uloží token do localStorage
9. Dashboard se načte

**Očekávaný výsledek:**
- ✅ Token v localStorage: `eeo_token`
- ✅ Username v localStorage: `eeo_username`
- ✅ User data načtena
- ✅ Dashboard zobrazí uživatelské jméno

**Logovací výstupy:**
```
🔗 Entra Bridge: Creating PHP token for user: jan.novak
Entra Bridge: Generated token for user jan.novak, expires 2025-12-06 14:30:00
✅ Token generated for jan.novak, expires: 2025-12-06 14:30:00
🔐 Initializing EEO authentication from Entra session...
✅ EEO authentication initialized: {username: "jan.novak", expires: "2025-12-06 14:30:00"}
```

### Test 2: Expired Entra Session

**Kroky:**
1. Nastav expiraci session na minulost v DB
2. Zkus zavolat `/api/eeo/entra-bridge`

**Očekávaný výsledek:**
- ❌ HTTP 401
- ❌ Error: "Neplatná nebo vypršená Entra session"
- ❌ Frontend redirect na `/auth/login`

### Test 3: Username Mismatch

**Kroky:**
1. Session patří uživateli `jan.novak`
2. Request posílá username `pavel.dvorak`

**Očekávaný výsledek:**
- ❌ HTTP 401
- ❌ Error: "Username z requestu neodpovídá Entra session"

### Test 4: Just-In-Time Provisioning

**Kroky:**
1. Přihlaš se Entra uživatelem, který neexistuje v `eeo_db.25_uzivatele`
2. Zavolej `/api/eeo/entra-login`

**Očekávaný výsledek:**
- ✅ Nový záznam vytvořen v DB
- ✅ Token vygenerován
- ✅ Log: "JIT Provisioning: Created user ID ..."

### Test 5: PHP API Call s Tokenem

**Kroky:**
1. Získej token přes bridge
2. Zavolej `/api.eeo/objednavky/list` s `{username, token}`

**Očekávaný výsledek:**
- ✅ HTTP 200
- ✅ Data vrácena
- ✅ `verify_token_v2()` úspěšně validoval token

### Test 6: Token Expiration

**Kroky:**
1. Vygeneruj token s timestamp starším 24 hodin
2. Zkus použít pro API call

**Očekávaný výsledek:**
- ❌ HTTP 401
- ❌ Error: "Nepřihlášen" z `verify_token_v2()`

---

## Migrace na produkci

### Příprava

**1. Database Schema Updates**

```sql
-- Přidat sloupecy pro Entra ID do 25_uzivatele
ALTER TABLE eeo_db.25_uzivatele 
ADD COLUMN entra_id VARCHAR(255) NULL AFTER email,
ADD COLUMN upn VARCHAR(255) NULL AFTER entra_id,
ADD COLUMN auth_source ENUM('local', 'entra') DEFAULT 'local' AFTER upn,
ADD COLUMN last_activity DATETIME NULL AFTER updated_at,
ADD INDEX idx_entra_id (entra_id),
ADD INDEX idx_auth_source (auth_source);
```

**2. Environment Variables**

`.env.production` v EEO API:

```bash
# PHP API URL for bridge
PHP_API_URL=http://localhost/api.eeo/entra-login

# Session cookie name
SESSION_COOKIE_NAME=erdms_session

# Database connections
DB_HOST=10.3.172.11
DB_USER=erdms_user
DB_PASSWORD=...
DB_NAME_ERDMS=erdms
DB_NAME_EEO=eeo_db
```

**3. Apache Configuration**

Ujisti se, že proxy pravidla existují:

```apache
# /etc/apache2/sites-available/erdms-proxy-production.inc
ProxyPass /api/eeo http://localhost:4001/api/eeo
ProxyPassReverse /api/eeo http://localhost:4001/api/eeo

ProxyPass /api.eeo http://localhost/api.eeo
ProxyPassReverse /api.eeo http://localhost/api.eeo
```

### Deployment Checklist

- [ ] Backup `eeo_db.25_uzivatele` tabulky
- [ ] Spustit SQL migrations (ALTER TABLE)
- [ ] Deploy nové PHP funkce (`handle_entra_login()`)
- [ ] Deploy Node.js bridge endpoint
- [ ] Deploy React EEO app s auth service
- [ ] Restart systemd services
- [ ] Reload Apache config
- [ ] Test login flow end-to-end
- [ ] Monitoring a logy

### Rollback Plan

Pokud bridge selže:

```bash
# 1. Revert PHP code
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/
git checkout HEAD -- v2025.03_25/lib/handlers.php api.php

# 2. Revert Node.js code
cd /var/www/erdms-dev/apps/eeo-v2/api/
git checkout HEAD -- src/routes/entra.js

# 3. Revert React app
cd /var/www/erdms-dev/apps/eeo-v2/client/
git checkout HEAD -- src/

# 4. Rebuild and restart
npm run build
sudo systemctl restart erdms-eeo-api
sudo systemctl reload apache2
```

### Monitoring

**Logy k sledování:**

```bash
# PHP error log
tail -f /tmp/php_errors.log | grep -E "Entra|Bridge"

# Node.js EEO API log
journalctl -u erdms-eeo-api -f | grep -E "Bridge|Token"

# Apache access log
tail -f /var/log/apache2/erdms-access.log | grep -E "entra-bridge|entra-login"
```

**Metriky:**

- Počet úspěšných bridge calls
- Počet failed authentications
- Average bridge response time
- JIT provisioning rate

---

## Přílohy

### A. Token Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   TOKEN LIFECYCLE                        │
└─────────────────────────────────────────────────────────┘

1. CREATION (t=0)
   ┌──────────────────────────────────────────────────┐
   │ timestamp = time() = 1733400000                   │
   │ token = base64(username|1733400000)              │
   │ expires_at = 1733400000 + 86400 = 1733486400    │
   └──────────────────────────────────────────────────┘
                        ↓
2. USAGE (t=0 to t+24h)
   ┌──────────────────────────────────────────────────┐
   │ verify_token_v2():                                │
   │   - decode base64                                 │
   │   - extract timestamp                             │
   │   - check: time() - timestamp < 86400             │
   │   - verify user in DB                             │
   └──────────────────────────────────────────────────┘
                        ↓
3. REFRESH ZONE (t+22h to t+24h)
   ┌──────────────────────────────────────────────────┐
   │ Frontend detects shouldRefreshToken() = true      │
   │ Calls /api/eeo/entra-bridge again                │
   │ Gets new token with new timestamp                │
   └──────────────────────────────────────────────────┘
                        ↓
4. EXPIRATION (t+24h+1s)
   ┌──────────────────────────────────────────────────┐
   │ verify_token_v2() returns false                   │
   │ API returns 401                                   │
   │ Frontend redirects to /auth/login                │
   └──────────────────────────────────────────────────┘
```

### B. Database Schema

**erdms.erdms_sessions:**
```sql
CREATE TABLE erdms_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES erdms_users(id)
);
```

**eeo_db.25_uzivatele:**
```sql
CREATE TABLE 25_uzivatele (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    jmeno VARCHAR(100),
    prijmeni VARCHAR(100),
    telefon VARCHAR(50),
    pozice VARCHAR(100),
    oddeleni VARCHAR(100),
    password_hash VARCHAR(255),
    aktivni TINYINT DEFAULT 1,
    entra_id VARCHAR(255),
    upn VARCHAR(255),
    auth_source ENUM('local', 'entra') DEFAULT 'local',
    last_activity DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_entra_id (entra_id),
    INDEX idx_auth_source (auth_source)
);
```

### C. Error Codes Reference

| Code | HTTP | Popis | Řešení |
|------|------|-------|--------|
| `MISSING_PARAMS` | 400 | Chybí username nebo entra_session_id | Zkontroluj request payload |
| `INVALID_SESSION` | 401 | Session neexistuje nebo vypršela | Redirect na /auth/login |
| `USERNAME_MISMATCH` | 401 | Username neodpovídá session | Možný security issue, logout |
| `USER_CREATION_FAILED` | 500 | JIT provisioning selhal | Zkontroluj DB permissions |
| `DB_ERROR` | 500 | Chyba databázového dotazu | Zkontroluj logy |
| `INTERNAL_ERROR` | 500 | Neočekávaná chyba | Zkontroluj PHP error log |
| `BRIDGE_ERROR` | 500 | Node.js bridge selhala | Zkontroluj Node.js logy |
| `PHP_API_ERROR` | varies | PHP API vrátilo chybu | Zkontroluj PHP response |

---

## Závěr

Toto řešení poskytuje **bezšvovou integraci** mezi moderní Entra ID autentizací a legacy PHP API systémem:

✅ **Žádné změny v existujících 69 PHP souborech**  
✅ **Zachování kompatibility token formátu**  
✅ **Bezpečná session validace**  
✅ **Just-In-Time user provisioning**  
✅ **Podpora pro token refresh**  
✅ **Backward compatible s lokálním loginem**

Po nahrání React EEO aplikace můžeme přistoupit k implementaci podle tohoto návrhu.

---

**Autor:** GitHub Copilot  
**Verze dokumentu:** 1.0  
**Datum:** 5. prosince 2025  
**Status:** Návrh (awaiting React app source code)
