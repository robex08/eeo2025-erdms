# 📱 MOBILNÍ APLIKACE - Microsoft 365 / EntraID Single Sign-On

> **📱 Pro mobilní vývojáře (iOS/Android)** - Kompletní implementace Microsoft 365 přihlášení v mobilní aplikaci

> **Verze:** 1.0  
> **Poslední aktualizace:** 25. 04. 2026  
> **Status:** ✅ **MOŽNÉ - Backend částečně připraven**

---

## 🎯 PŘEHLED

### **Co máme dnes (Web aplikace):**
✅ **Backend má EntraID integraci** - endpoint `/api.eeo/auth/entra-callback`  
✅ **Auto-provisioning** - Uživatel se skupinou `eeoUser` se automaticky vytvoří  
✅ **Načítání rolí a oprávnění** - Z databáze `25_role`, `25_uzivatele_role`, `25_opravneni`  
✅ **Token systém** - Simple base64 token s expirací 24 hodin  

### **Co potřebujeme pro mobilní:**
🔨 **OAuth 2.0 PKCE flow** - Pro bezpečné mobilní přihlášení  
🔨 **JWT tokeny** - Místo simple base64 (lepší bezpečnost)  
🔨 **Refresh token mechanizmus** - Pro automatické obnovení tokenů  
🔨 **MSAL knihovny** - Microsoft Authentication Library pro iOS/Android  
🔨 **Backend rozšíření** - Nový endpoint pro mobilní token exchange  

---

## 📊 MOŽNOSTI IMPLEMENTACE

### **🏆 MOŽNOST 1: Doporučená - OAuth 2.0 s PKCE (Production-ready)**

**Popis:**  
Standardní OAuth 2.0 Authorization Code Flow s PKCE rozšířením, které je **výslovně doporučené pro mobilní aplikace**.

**✅ Výhody:**
- ✅ **Bezpečné** - PKCE chrání proti interceptu authorization code
- ✅ **Standardní** - Podporováno všemi OAuth 2.0 providery včetně Microsoft
- ✅ **Refresh tokeny** - Automatické obnovení bez nutnosti opětovného přihlášení
- ✅ **Native UX** - Přihlášení přes systémový browser (ASWebAuthenticationSession/Chrome Custom Tabs)
- ✅ **SSO** - Pokud je uživatel už přihlášený v MS365, přihlásí se automaticky

**❌ Nevýhody:**
- ⚠️ Vyžaduje backend rozšíření (nový endpoint pro token exchange)
- ⚠️ Složitější implementace než simple username/password

**🔧 Potřebné změny:**
1. **Backend:** Nový endpoint `/api.eeo/auth/mobile-token-exchange`
2. **Frontend:** MSAL knihovna (React Native/Native iOS/Android)
3. **Azure AD:** Registrace mobile app (redirect URI: `msauth://com.yourapp/callback`)

---

### **⚡ MOŽNOST 2: Web View s Cookie Sharing (Quick & Dirty)**

**Popis:**  
Otevřít web login stránku v WebView, po úspěšném přihlášení vytáhnout token z localStorage/cookie.

**✅ Výhody:**
- ✅ **Rychlé řešení** - Žádné backend změny
- ✅ **Nulová konfigurace** - Použije se stávající web flow

**❌ Nevýhody:**
- ❌ **Špatná UX** - Uživatel vidí web stránku místo native UI
- ❌ **Bezpečnostní rizika** - WebView může přistupovat k localStorage
- ❌ **Nestandardní** - Porušuje OAuth 2.0 best practices
- ❌ **Apple rejection risk** - App Store guidelines doporučují použít ASWebAuthenticationSession

**🚫 NEDOPORUČUJEME PRO PRODUKCI**

---

### **🔐 MOŽNOST 3: Hybrid - Username + MS365 Validace (Kompromis)**

**Popis:**  
Uživatel zadá username (u03924), mobilní app zavolá backend, který ověří u MS365 Graph API.

**✅ Výhody:**
- ✅ **Jednodušší UX** - Jen zadání usernames (bez hesla)
- ✅ **Žádný redirect** - Vše v rámci aplikace

**❌ Nevýhody:**
- ❌ **Není Single Sign-On** - Uživatel musí zadat username
- ❌ **Vyžaduje backend API** - Nový endpoint pro validaci přes Graph API
- ❌ **Nutná service účet** - Backend potřebuje MS365 app credentials

---

## 🏆 DOPORUČENÉ ŘEŠENÍ: OAuth 2.0 s PKCE

**Proč?**
- ✅ Standardní řešení používané všemi velkými aplikacemi (Gmail, Outlook, Teams)
- ✅ Nejlepší bezpečnost a UX
- ✅ Podporováno Microsoft oficiálně (MSAL knihovny)
- ✅ Apple App Store guidelines kompatibilní

---

## 📐 ARCHITEKTURA ŘEŠENÍ

### **🔄 OAuth 2.0 PKCE Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                    OAUTH 2.0 PKCE FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1️⃣ USER ACTION
   └─> Uživatel klikne "Přihlásit přes MS365"
       
2️⃣ MOBILE APP (MSAL)
   ├─> Vygeneruje code_verifier (random 43-128 znaků)
   ├─> Vytvoří code_challenge = SHA256(code_verifier)
   └─> Otevře systémový browser:
       https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
       ?client_id=xxx
       &response_type=code
       &redirect_uri=msauth://com.yourapp/callback
       &scope=openid profile email User.Read
       &code_challenge=xxx
       &code_challenge_method=S256
       
3️⃣ AZURE AD (login.microsoftonline.com)
   ├─> Uživatel se přihlásí (username + heslo + MFA)
   ├─> Azure AD vrátí authorization code
   └─> Redirect na: msauth://com.yourapp/callback?code=AUTH_CODE
       
4️⃣ MOBILE APP (MSAL)
   ├─> Zachytí callback (Deep Link / Universal Link)
   ├─> Pošle request na Azure AD token endpoint:
   │   POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
   │   {
   │     code: AUTH_CODE,
   │     client_id: xxx,
   │     code_verifier: xxx,  ← PKCE proof
   │     redirect_uri: msauth://com.yourapp/callback,
   │     grant_type: authorization_code
   │   }
   └─> Azure AD vrátí:
       {
         access_token: "eyJ...",   // Pro MS Graph API
         id_token: "eyJ...",        // JWT s user info
         refresh_token: "xxx"       // Pro obnovení
       }
       
5️⃣ MOBILE APP → BACKEND EEO
   ├─> Pošle id_token na backend:
   │   POST /api.eeo/auth/mobile-token-exchange
   │   {
   │     id_token: "eyJ...",
   │     refresh_token: "xxx"
   │   }
   └─> Backend:
       ├─> Ověří id_token signaturu (Azure AD public key)
       ├─> Extrahuje username z UPN (upn claim)
       ├─> Zkontroluje/vytvoří uživatele v DB
       ├─> Načte role a oprávnění
       ├─> Vytvoří EEO session token (JWT nebo simple)
       └─> Vrátí:
           {
             token: "EEO_SESSION_TOKEN",
             user: {...},
             roles: [...],
             permissions: [...]
           }
           
6️⃣ MOBILE APP
   └─> Uloží token do secure storage (Keychain/Keystore)
       └─> Všechny API requesty posílají:
           Authorization: Bearer EEO_SESSION_TOKEN
```

---

## 🔧 IMPLEMENTACE - KROK ZA KROKEM

### **1️⃣ AZURE AD KONFIGURACE**

#### **A) Registrace mobilní aplikace**

1. **Přejdi na Azure Portal:**
   - https://portal.azure.com
   - Azure Active Directory → App registrations

2. **Vytvoř novou registraci:**
   - Name: `EEO Mobile App`
   - Supported account types: `Accounts in this organizational directory only`
   - Redirect URI:
     - Platform: **Mobile and desktop applications**
     - URI: `msauth://com.zachranka.eeo/callback` (nahraď svým app ID)

3. **API Permissions:**
   - Add permission → Microsoft Graph → Delegated permissions:
     - ✅ `openid`
     - ✅ `profile`
     - ✅ `email`
     - ✅ `User.Read`
     - ✅ `Group.Read.All` (pokud chceš načítat skupiny)
   - **Grant admin consent** (klikni "Grant admin consent for...")

4. **Authentication settings:**
   - Enable: ✅ **Allow public client flows** (YES)
   - Supported account types: **Single tenant**

5. **Poznamenej si:**
   ```
   Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Directory (tenant) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

---

### **2️⃣ BACKEND ROZŠÍŘENÍ**

#### **A) Nový endpoint: `/api.eeo/auth/mobile-token-exchange`**

**Soubor:** `/api-legacy/api.eeo/v2025.03_25/lib/mobileAuthHandlers.php`

```php
<?php
/**
 * Mobile Authentication Handler
 * OAuth 2.0 PKCE flow support for iOS/Android
 * 
 * @version 2026-04-25
 */

require_once __DIR__ . '/entraAuthHandlers.php';
require_once __DIR__ . '/../vendor/autoload.php'; // JWT library

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * POST /api.eeo/auth/mobile-token-exchange
 * 
 * Exchanges Azure AD id_token for EEO session token
 * 
 * Flow:
 * 1. Validate id_token signature using Azure AD public keys
 * 2. Extract user info (UPN, email, name, groups)
 * 3. Check/create user in database (same as entra-callback)
 * 4. Generate EEO session token (JWT or simple)
 * 5. Return token + user data
 * 
 * @param array $input POST data {id_token, refresh_token?}
 * @param array $config Database configuration
 */
function handle_mobile_token_exchange($input, $config) {
    global $pdo;
    
    try {
        // ===== STEP 1: Validate input =====
        $id_token = $input['id_token'] ?? '';
        $refresh_token = $input['refresh_token'] ?? null;
        
        if (!$id_token) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'code' => 'MISSING_ID_TOKEN',
                'message' => 'Chybí id_token z Azure AD'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // ===== STEP 2: Validate id_token signature =====
        // Azure AD používá RS256 (RSA Signature with SHA-256)
        // Public keys: https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys
        
        $tenant_id = $_ENV['AZURE_TENANT_ID'] ?? 'YOUR_TENANT_ID';
        $jwks_uri = "https://login.microsoftonline.com/{$tenant_id}/discovery/v2.0/keys";
        
        // Fetch JWKS (JSON Web Key Set) - cache pro performance
        $cache_file = sys_get_temp_dir() . '/azure_jwks_cache.json';
        $cache_ttl = 3600; // 1 hodina
        
        if (file_exists($cache_file) && (time() - filemtime($cache_file)) < $cache_ttl) {
            $jwks_data = json_decode(file_get_contents($cache_file), true);
        } else {
            $jwks_response = file_get_contents($jwks_uri);
            $jwks_data = json_decode($jwks_response, true);
            file_put_contents($cache_file, $jwks_response);
        }
        
        // Decode token header to get kid (key ID)
        $token_parts = explode('.', $id_token);
        if (count($token_parts) !== 3) {
            throw new Exception('Neplatný formát JWT tokenu');
        }
        
        $header = json_decode(base64_decode(strtr($token_parts[0], '-_', '+/')), true);
        $kid = $header['kid'] ?? null;
        
        if (!$kid) {
            throw new Exception('JWT token neobsahuje kid v hlavičce');
        }
        
        // Find matching public key
        $public_key = null;
        foreach ($jwks_data['keys'] as $key) {
            if ($key['kid'] === $kid) {
                // Convert JWK to PEM format
                $public_key = jwk_to_pem($key);
                break;
            }
        }
        
        if (!$public_key) {
            throw new Exception('Nepodařilo se najít veřejný klíč pro ověření tokenu');
        }
        
        // Verify token signature
        try {
            $decoded = JWT::decode($id_token, new Key($public_key, 'RS256'));
        } catch (Exception $e) {
            http_response_code(401);
            echo json_encode([
                'status' => 'error',
                'code' => 'INVALID_TOKEN_SIGNATURE',
                'message' => 'Neplatný podpis tokenu',
                'debug' => IS_DEV_ENV ? $e->getMessage() : null
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // ===== STEP 3: Validate token claims =====
        $now = time();
        
        // Check expiration
        if (isset($decoded->exp) && $decoded->exp < $now) {
            http_response_code(401);
            echo json_encode([
                'status' => 'error',
                'code' => 'TOKEN_EXPIRED',
                'message' => 'Token již vypršel'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // Check issuer
        $expected_issuer = "https://login.microsoftonline.com/{$tenant_id}/v2.0";
        if (!isset($decoded->iss) || $decoded->iss !== $expected_issuer) {
            http_response_code(401);
            echo json_encode([
                'status' => 'error',
                'code' => 'INVALID_ISSUER',
                'message' => 'Neplatný vydavatel tokenu'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // ===== STEP 4: Extract user info =====
        $upn = $decoded->upn ?? $decoded->preferred_username ?? null;
        $email = $decoded->email ?? $upn;
        $name = $decoded->name ?? '';
        $entra_id = $decoded->oid ?? $decoded->sub ?? null; // Object ID
        $groups = $decoded->groups ?? []; // Pokud byl vyžádán scope Group.Read.All
        
        if (!$upn || !$entra_id) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'code' => 'MISSING_USER_INFO',
                'message' => 'Token neobsahuje UPN nebo ID uživatele'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // Extract username from UPN (u03924@zachranka.cz -> u03924)
        $username_parts = explode('@', $upn);
        $username = $username_parts[0];
        
        // ===== STEP 5: Check/create user (same logic as entra-callback) =====
        $session_data = [
            'upn' => $upn,
            'id' => $entra_id,
            'entra_id' => $entra_id,
            'email' => $email,
            'displayName' => $name,
            'name' => $name,
            'groups' => $groups
        ];
        
        // Reuse existing entra-callback logic
        // Vytvoř mock input pro handle_entra_callback
        $callback_input = [
            'session_data' => $session_data
        ];
        
        // ===== VOLAT STÁVAJÍCÍ LOGIKU (DRY principle) =====
        // Toto je hack - ideálně extrahovat logiku do shared funkce
        // Pro POC použijeme duplicitní kód (viz níže)
        
        // ... (kopíruj logiku z handle_entra_callback) ...
        
        // ===== STEP 6: Generate EEO session token =====
        // OPTION A: Simple token (kompatibilní s current system)
        $eeo_token = base64_encode($username . '|' . time());
        
        // OPTION B: JWT token (doporučeno pro production)
        /*
        $jwt_payload = [
            'sub' => $username,
            'user_id' => $user_id,
            'iat' => $now,
            'exp' => $now + 86400, // 24 hodin
            'iss' => 'eeo-mobile-api'
        ];
        $jwt_secret = $_ENV['JWT_SECRET'] ?? 'YOUR_SECRET_KEY';
        $eeo_token = JWT::encode($jwt_payload, $jwt_secret, 'HS256');
        */
        
        // ===== STEP 7: Return response =====
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'token' => $eeo_token,
            'refresh_token' => $refresh_token, // Pro obnovení (pass-through)
            'user' => [
                'id' => $user_id,
                'username' => $username,
                'email' => $email,
                'jmeno' => $name
            ],
            'roles' => $roles,
            'permissions' => $permissions,
            'auth_method' => 'entra_id_mobile'
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        error_log("Mobile token exchange error: " . $e->getMessage());
        
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'code' => 'SERVER_ERROR',
            'message' => 'Nepodařilo se vyměnit token',
            'debug' => IS_DEV_ENV ? $e->getMessage() : null
        ], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * Convert JWK (JSON Web Key) to PEM format
 */
function jwk_to_pem($jwk) {
    // Implementation depends on key type (RSA, EC)
    // Pro RSA:
    if ($jwk['kty'] !== 'RSA') {
        throw new Exception('Pouze RSA klíče jsou podporovány');
    }
    
    $n = base64url_decode($jwk['n']);
    $e = base64url_decode($jwk['e']);
    
    // Construct RSA public key in DER format
    // ... (komplikovaná matematika, použij knihovnu nebo hotovou funkci)
    
    // ALTERNATIVA: Použij phpseclib knihovnu
    // composer require phpseclib/phpseclib
    
    require_once 'vendor/autoload.php';
    use phpseclib3\Crypt\RSA;
    
    $rsa = RSA::loadFormat('JWK', json_encode($jwk));
    return $rsa->toString('PKCS1');
}

function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}
```

#### **B) Registrace endpointu v `api.php`**

```php
// V souboru: /api-legacy/api.eeo/api.php

// Přidat require
require_once __DIR__ . '/v2025.03_25/lib/mobileAuthHandlers.php';

// Přidat case
case 'auth/mobile-token-exchange':
case 'v2.0/auth/mobile-token-exchange':
    if ($request_method === 'POST') {
        handle_mobile_token_exchange($input, $config);
    } else {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
    }
    break;
```

#### **C) Instalace PHP dependencies**

```bash
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo
composer require firebase/php-jwt
composer require phpseclib/phpseclib
```

---

### **3️⃣ MOBILNÍ APLIKACE (React Native)**

#### **A) Instalace MSAL knihovny**

```bash
npm install @azure/msal-react-native
npx pod-install # iOS only
```

#### **B) Konfigurace MSAL**

**Soubor:** `src/config/msalConfig.js`

```javascript
import { PublicClientApplication } from '@azure/msal-react-native';

export const msalConfig = {
  auth: {
    clientId: 'YOUR_CLIENT_ID', // Z Azure Portal
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
    redirectUri: 'msauth://com.zachranka.eeo/callback',
  },
  cache: {
    cacheLocation: 'keychain', // iOS: Keychain, Android: SharedPreferences
  },
};

// Scopes pro MS Graph API
export const loginScopes = [
  'openid',
  'profile',
  'email',
  'User.Read',
];

// Initialize MSAL
export const msalInstance = new PublicClientApplication(msalConfig);
```

#### **C) Login komponenta**

**Soubor:** `src/screens/LoginScreen.js`

```javascript
import React, { useState } from 'react';
import { View, Button, Text, ActivityIndicator } from 'react-native';
import { msalInstance, loginScopes } from '../config/msalConfig';
import { exchangeTokenWithBackend } from '../services/authService';

function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleMS365Login = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1️⃣ Inicializuj MSAL
      await msalInstance.init();

      // 2️⃣ Zahaj OAuth 2.0 flow (otevře systémový browser)
      const result = await msalInstance.acquireTokenInteractive({
        scopes: loginScopes,
        prompt: 'select_account', // Zobrazí account picker
      });

      console.log('✅ MS365 login successful:', {
        username: result.account.username,
        name: result.account.name,
      });

      // 3️⃣ Vyměň Azure AD token za EEO session token
      const eeoSession = await exchangeTokenWithBackend({
        id_token: result.idToken,
        refresh_token: result.refreshToken,
      });

      // 4️⃣ Ulož session do secure storage
      await SecureStore.setItemAsync('eeo_token', eeoSession.token);
      await SecureStore.setItemAsync('eeo_user', JSON.stringify(eeoSession.user));
      await SecureStore.setItemAsync('azure_refresh_token', result.refreshToken);

      // 5️⃣ Přesměruj na home screen
      navigation.replace('Home', { user: eeoSession.user });

    } catch (err) {
      console.error('❌ MS365 login failed:', err);

      if (err.errorCode === 'user_cancelled') {
        setError('Přihlášení bylo zrušeno');
      } else {
        setError('Přihlášení selhalo: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EEO Mobile</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0078d4" />
      ) : (
        <>
          <Button
            title="🔐 Přihlásit přes Microsoft 365"
            onPress={handleMS365Login}
            color="#0078d4"
          />

          {error && <Text style={styles.error}>{error}</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#0078d4',
  },
  error: {
    marginTop: 20,
    color: '#d32f2f',
    textAlign: 'center',
  },
});

export default LoginScreen;
```

#### **D) Auth Service**

**Soubor:** `src/services/authService.js`

```javascript
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';

/**
 * Vyměň Azure AD id_token za EEO session token
 */
export async function exchangeTokenWithBackend({ id_token, refresh_token }) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/mobile-token-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_token,
        refresh_token,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Token exchange failed');
    }

    const data = await response.json();

    return {
      token: data.token,
      user: data.user,
      roles: data.roles,
      permissions: data.permissions,
    };
  } catch (error) {
    console.error('❌ Token exchange error:', error);
    throw error;
  }
}

/**
 * Refresh EEO session token pomocí Azure AD refresh token
 */
export async function refreshEEOToken() {
  try {
    const azureRefreshToken = await SecureStore.getItemAsync('azure_refresh_token');

    if (!azureRefreshToken) {
      throw new Error('No refresh token available');
    }

    // 1️⃣ Získej nový Azure AD token
    const msalInstance = await getMSALInstance();
    const accounts = await msalInstance.getAccounts();

    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const result = await msalInstance.acquireTokenSilent({
      scopes: loginScopes,
      account: accounts[0],
    });

    // 2️⃣ Vyměň za nový EEO token
    const eeoSession = await exchangeTokenWithBackend({
      id_token: result.idToken,
      refresh_token: result.refreshToken,
    });

    // 3️⃣ Ulož nový token
    await SecureStore.setItemAsync('eeo_token', eeoSession.token);

    return eeoSession.token;

  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    throw error;
  }
}

/**
 * Logout - smaž všechny tokeny
 */
export async function logout() {
  try {
    // Smaž EEO tokeny
    await SecureStore.deleteItemAsync('eeo_token');
    await SecureStore.deleteItemAsync('eeo_user');
    await SecureStore.deleteItemAsync('azure_refresh_token');

    // Logout z MSAL (smaže Azure AD cache)
    const msalInstance = await getMSALInstance();
    const accounts = await msalInstance.getAccounts();

    if (accounts.length > 0) {
      await msalInstance.removeAccount(accounts[0]);
    }

    console.log('✅ Logout successful');
  } catch (error) {
    console.error('❌ Logout error:', error);
    throw error;
  }
}
```

#### **E) API Service s auto-refresh**

**Soubor:** `src/services/apiService.js`

```javascript
import * as SecureStore from 'expo-secure-store';
import { refreshEEOToken } from './authService';

const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';

/**
 * Universal API call s automatickým refresh tokenem
 */
export async function apiCall(endpoint, options = {}) {
  let token = await SecureStore.getItemAsync('eeo_token');
  const user = JSON.parse(await SecureStore.getItemAsync('eeo_user') || '{}');

  // První pokus
  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify({
      token,
      username: user.username,
      ...options.body,
    }),
  });

  // Pokud 401 (Unauthorized) → refresh token a zkus znovu
  if (response.status === 401) {
    console.log('🔄 Token expired, refreshing...');

    try {
      token = await refreshEEOToken();

      // Druhý pokus s novým tokenem
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify({
          token,
          username: user.username,
          ...options.body,
        }),
      });
    } catch (refreshError) {
      console.error('❌ Token refresh failed:', refreshError);
      // Přesměruj na login
      throw new Error('SESSION_EXPIRED');
    }
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'API call failed');
  }

  return response.json();
}

// Příklad použití:
export async function getOrders(filters = {}) {
  return apiCall('/order-v3/list', {
    body: {
      page: 1,
      per_page: 20,
      filters,
    },
  });
}
```

---

### **4️⃣ iOS KONFIGURACE**

#### **A) Info.plist**

Přidej do `ios/YourApp/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>msauth</string>
    </array>
    <key>CFBundleURLName</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  </dict>
</array>

<key>LSApplicationQueriesSchemes</key>
<array>
  <string>msauthv2</string>
  <string>msauthv3</string>
</array>
```

#### **B) AppDelegate.m**

Přidej import a handler:

```objective-c
#import <MSAL/MSAL.h>

// V @implementation AppDelegate

- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [MSALPublicClientApplication handleMSALResponse:url sourceApplication:options[UIApplicationOpenURLOptionsSourceApplicationKey]];
}
```

---

### **5️⃣ ANDROID KONFIGURACE**

#### **A) AndroidManifest.xml**

Přidej do `android/app/src/main/AndroidManifest.xml`:

```xml
<activity android:name="com.microsoft.identity.client.BrowserTabActivity">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
      android:scheme="msauth"
      android:host="com.zachranka.eeo"
      android:path="/callback" />
  </intent-filter>
</activity>
```

#### **B) Signature Hash**

Vygeneruj signature hash pro Azure AD:

```bash
keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64
```

Přidej tento hash do Azure Portal → App Registration → Authentication → Mobile and desktop applications

---

## 🔒 BEZPEČNOST

### **✅ SECURITY BEST PRACTICES**

1. **PKCE (Proof Key for Code Exchange)**
   - ✅ Chrání proti interceptu authorization code
   - ✅ Povinné pro public clients (mobilní aplikace)

2. **Token Storage**
   - ✅ iOS: Keychain (šifrované úložiště)
   - ✅ Android: Keystore (hardware-backed encryption)
   - ❌ NIKDY AsyncStorage/SharedPreferences bez šifrování!

3. **Token Expiration**
   - ✅ ID Token: 1 hodina (Azure AD default)
   - ✅ Refresh Token: 90 dní (Azure AD default, obnovuje se)
   - ✅ EEO Session Token: 24 hodin (možno nastavit)

4. **Certificate Pinning** (doporučeno pro produkci)
   ```javascript
   // React Native SSL Pinning
   import { fetch } from 'react-native-ssl-pinning';
   
   await fetch('https://erdms.zachranka.cz/api.eeo/', {
     method: 'POST',
     sslPinning: {
       certs: ['cert-pin-1', 'cert-pin-2'],
     },
   });
   ```

5. **Biometric Authentication** (doporučeno)
   ```javascript
   import * as LocalAuthentication from 'expo-local-authentication';
   
   // Před zobrazením citlivých dat
   const result = await LocalAuthentication.authenticateAsync({
     promptMessage: 'Ověřte svou identitu',
     fallbackLabel: 'Zadejte PIN',
   });
   ```

---

## 📊 TIMELINE IMPLEMENTACE

### **FÁZE 1: PŘÍPRAVA (1-2 dny)**
- [ ] Registrace mobile app v Azure Portal
- [ ] Konfigurace redirect URI a permissions
- [ ] Grant admin consent
- [ ] Instalace PHP dependencies (jwt, phpseclib)

### **FÁZE 2: BACKEND (3-5 dní)**
- [ ] Vytvoř `mobileAuthHandlers.php`
- [ ] Implementuj `/auth/mobile-token-exchange` endpoint
- [ ] Přidej JWT token validaci
- [ ] Testování s Postman/curl
- [ ] Deploy na DEV server

### **FÁZE 3: MOBILE APP (5-7 dní)**
- [ ] Instalace MSAL React Native
- [ ] Konfigurace msalConfig.js
- [ ] Implementace LoginScreen
- [ ] Implementace authService
- [ ] iOS: Info.plist + AppDelegate.m
- [ ] Android: AndroidManifest.xml + signature hash
- [ ] Testování na iOS/Android emulátor

### **FÁZE 4: TESTOVÁNÍ (2-3 dny)**
- [ ] Testování login flow
- [ ] Testování token refresh
- [ ] Testování logout
- [ ] Testování error stavů (neplatný token, vypršelý token)
- [ ] Security audit (token storage, certificate pinning)

### **FÁZE 5: PRODUKCE (1 den)**
- [ ] Deploy backendu do produkce
- [ ] Update Azure AD app registration (production redirect URI)
- [ ] Build iOS/Android release
- [ ] Submit do App Store / Google Play

**CELKOVÝ ČAS: 12-18 dní (2-3 týdny)**

---

## ❓ FAQ

### **❓ Musíme použít OAuth 2.0 PKCE nebo lze jednodušší řešení?**

**Odpověď:** OAuth 2.0 PKCE je **doporučené a standardní řešení** pro mobilní aplikace:
- ✅ Nejbezpečnější metoda (PKCE chrání proti interceptu)
- ✅ Apple App Store guidelines kompatibilní
- ✅ Podporováno Microsoft oficiálně (MSAL knihovny)
- ✅ Umožňuje SSO (Single Sign-On)

**Alternativy jsou méně bezpečné:**
- ❌ WebView + Cookie: Porušuje best practices, možný App Store reject
- ❌ Username/Password: Nepodporuje MFA, SSO, neb bezpečné

---

### **❓ Jak dlouho platí tokeny?**

**Odpověď:**
- **Azure AD ID Token:** 1 hodina (automaticky refresh)
- **Azure AD Refresh Token:** 90 dní (obnovuje se při použití)
- **EEO Session Token:** 24 hodin (možno nastavit)

**Auto-refresh:**
- MSAL automaticky refreshuje Azure AD tokeny na pozadí
- Backend endpoint `/auth/mobile-token-exchange` vytvoří nový EEO token

---

### **❓ Co když uživatel nemá MS365 účet?**

**Odpověď:**  
**Tento systém funguje POUZE pro uživatele s MS365 účtem** v organizaci zachranka.cz.

Pokud potřebujete podporovat externí uživatele:
1. **Guest Accounts** - Pozvěte je jako hosty do Azure AD
2. **Lokální přihlášení** - Implementujte fallback s username/password

---

### **❓ Podporuje to MFA (Multi-Factor Authentication)?**

**Odpověď:** **ANO!** Azure AD automaticky vynucuje MFA podle Conditional Access policies nastavených v organizaci.

Mobilní aplikace nemusí řešit MFA logiku - vše obsluhuje Azure AD při přihlášení.

---

### **❓ Funguje to offline?**

**Odpověď:**
- ❌ **První přihlášení:** Vyžaduje internet (OAuth flow)
- ✅ **Po přihlášení:** Token uložený v Keychain/Keystore funguje offline
- ⚠️ **API requesty:** Vyžadují internet (backend volání)

Pro offline režim:
- Cachuj data lokálně (SQLite, AsyncStorage)
- Po obnovení připojení synchronizuj změny

---

### **❓ Co když se změní heslo uživatele v MS365?**

**Odpověď:**  
Refresh token automaticky přestane fungovat → uživatel musí znovu projít login flow.

MSAL detekuje expired refresh token a zobrazí login prompt.

---

### **❓ Je potřeba platit za Azure AD?**

**Odpověď:**  
**NE!** Basic OAuth 2.0 funkcionalita je **zdarma** v Azure AD Free tier.

Premium features (které nepotřebujete):
- Conditional Access (Premium P1)
- Identity Protection (Premium P2)

---

## 📚 REFERENCE

### **Dokumentace:**
- [Microsoft MSAL React Native](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react-native)
- [Azure AD OAuth 2.0 PKCE](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [iOS ASWebAuthenticationSession](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession)
- [Android Custom Tabs](https://developer.chrome.com/docs/android/custom-tabs/)

### **Knihovny:**
- **React Native:** `@azure/msal-react-native`
- **PHP:** `firebase/php-jwt`, `phpseclib/phpseclib`
- **iOS Native:** `MSAL.framework`
- **Android Native:** `com.microsoft.identity.client:msal`

---

## ✅ ZÁVĚR

**Je to možné?** → **✅ ANO!**

**Je to složité?** → **⚠️ Středně náročné** (12-18 dní implementace)

**Je to bezpečné?** → **✅ ANO!** (Standardní OAuth 2.0 PKCE flow)

**Doporučujeme?** → **✅ ANO!** (Nejlepší UX a bezpečnost pro mobilní app)

---

**🚀 Připraveno k implementaci!**

Pro další dotazy kontaktuj Backend Development Team.
