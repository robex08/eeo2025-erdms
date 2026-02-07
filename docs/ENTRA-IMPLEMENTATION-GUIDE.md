# Microsoft Entra ID - Implementační průvodce pro aplikaci

**Datum:** 12. prosince 2025  
**Účel:** Kompletní postup jak připravit aplikaci pro MS365/EntraID autentizaci

---

## 📋 Obsah

1. [Přehled a architektura](#přehled-a-architektura)
2. [Server-side implementace (Node.js)](#server-side-implementace-nodejs)
3. [Client-side implementace (React)](#client-side-implementace-react)
4. [Bezpečnostní opatření](#bezpečnostní-opatření)
5. [Testování](#testování)
6. [Deployment](#deployment)

---

## Přehled a architektura

### Co už máš připraveno ✅

1. **Azure Entra ID konfigurace**
   - Application ID: `92eaadde-7e3e-4ad1-8c45-3b875ff5c76b`
   - Tenant ID: `2bd7827b-4550-48ad-bd15-62f9a17990f1`
   - Client Secret: nakonfigurován v `.env`
   - Redirect URIs: připravené pro dev/prod

2. **Backend infrastruktura**
   - Node.js API server v `/var/www/erdms-dev/apps/eeo-v2/api/`
   - MSAL node balíček (`@azure/msal-node`)
   - Auth routes: `/api/auth/login`, `/api/auth/callback`
   - Session management v DB tabulce `erdms_sessions`
   - Middleware pro ověření session

3. **Databázová struktura**
   - Tabulka `erdms_users` s poli:
     - `entra_id` - Object ID z Entra
     - `upn` - User Principal Name (email)
     - `username` - lokální username (u{osobni_cislo})
     - `auth_source` - zdroj autentizace (entra/local)
   - Tabulka `erdms_sessions` pro session storage

### Jak to funguje - Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. UŽIVATEL KLIKNE NA "PŘIHLÁSIT PŘES MS365"                 │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. FRONTEND volá GET /api/auth/login                         │
│    → Backend vrátí { authUrl: "https://login.microsoft..." } │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. REDIRECT na Microsoft login stránku                       │
│    → Uživatel zadá MS365 credentials                         │
│    → Microsoft ověří a vrátí authorization code              │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. MICROSOFT REDIRECT zpět na /api/auth/callback             │
│    → Backend vymění code za tokeny                           │
│    → Vytvoří session v DB                                    │
│    → Nastaví erdms_session cookie                            │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. REDIRECT na frontend /eeo-v2                              │
│    → Frontend detekuje session cookie                        │
│    → Načte user detail                                       │
│    → Uživatel je přihlášen                                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Server-side implementace (Node.js)

### 1. Konfigurace prostředí

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api/.env`

```env
# Microsoft Entra ID
ENTRA_CLIENT_ID=92eaadde-7e3e-4ad1-8c45-3b875ff5c76b
ENTRA_TENANT_ID=2bd7827b-4550-48ad-bd15-62f9a17990f1
ENTRA_AUTHORITY=https://login.microsoftonline.com/2bd7827b-4550-48ad-bd15-62f9a17990f1
ENTRA_CLIENT_SECRET=your-secret-here
ENTRA_REDIRECT_URI=https://erdms-dev.zachranka.cz/api/auth/callback

# URLs
CLIENT_URL=https://erdms-dev.zachranka.cz/eeo-v2
API_BASE_URL=https://erdms-dev.zachranka.cz/api

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=erdms
DB_NAME_EEO=eeo_db

# Session
SESSION_SECRET=your-session-secret
NODE_ENV=development
```

### 2. MSAL Konfigurace

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api/src/config/entraConfig.js`

```javascript
const msalConfig = {
  auth: {
    clientId: process.env.ENTRA_CLIENT_ID,
    authority: process.env.ENTRA_AUTHORITY,
    clientSecret: process.env.ENTRA_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        if (process.env.NODE_ENV === 'development') {
          console.log(message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: process.env.NODE_ENV === 'development' ? 3 : 1,
    }
  }
};

const REDIRECT_URI = process.env.ENTRA_REDIRECT_URI;
const SCOPES = ['User.Read', 'email', 'openid', 'profile'];

module.exports = {
  msalConfig,
  REDIRECT_URI,
  SCOPES
};
```

### 3. Auth Routes - už implementované ✅

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api/src/routes/auth.js`

Obsahuje:
- `GET /auth/login` - inicializace OAuth flow
- `GET /auth/callback` - zpracování MS odpovědi
- `POST /auth/logout` - odhlášení
- `GET /auth/me` - info o přihlášeném uživateli

### 4. Auth Service - už implementovaný ✅

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api/src/services/authService.js`

Obsahuje metody:
- `findUserByEntraId(entraId)` - najde uživatele podle Entra ID
- `findUserByUsername(username)` - najde podle username
- `syncUserWithEntra(userId, entraData)` - synchronizace dat
- `createSession(userId, tokens, ip, userAgent)` - vytvoří session
- `findSession(sessionId)` - najde session
- `logAuthEvent(userId, username, event, method, ip, userAgent)` - logování

### 5. Session Middleware

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api/src/middleware/sessionMiddleware.js`

```javascript
const authService = require('../services/authService');

/**
 * Middleware pro ověření session z cookie
 */
const sessionMiddleware = async (req, res, next) => {
  try {
    const sessionId = req.cookies.erdms_session;

    if (!sessionId) {
      return res.status(401).json({ 
        error: 'No session found. Please login.' 
      });
    }

    // Najdi session v DB
    const session = await authService.findSession(sessionId);

    if (!session) {
      res.clearCookie('erdms_session');
      return res.status(401).json({ 
        error: 'Invalid or expired session. Please login again.' 
      });
    }

    // Přidej user info do request
    req.user = {
      id: session.user_id,
      username: session.username,
      entra_id: session.entra_id,
      email: session.email,
      sessionId: sessionId
    };

    // Update last activity
    await authService.updateSessionActivity(sessionId);

    next();
  } catch (error) {
    console.error('Session middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error during session validation.' 
    });
  }
};

module.exports = sessionMiddleware;
```

### 6. Registrace routes v hlavním serveru

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api/src/index.js`

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const sessionMiddleware = require('./middleware/sessionMiddleware');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

// Auth routes (veřejné - bez session middleware)
app.use('/api/auth', authRoutes);

// Chráněné routes (vyžadují session)
app.get('/api/protected-endpoint', sessionMiddleware, (req, res) => {
  res.json({ 
    message: 'Protected data',
    user: req.user 
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## Client-side implementace (React)

### 1. Vytvoření auth service

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/services/entraAuthService.js`

```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://erdms-dev.zachranka.cz/api';

/**
 * Iniciuje MS365 login
 */
export const initiateEntraLogin = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/login`, {
      withCredentials: true
    });
    
    const { authUrl } = response.data;
    
    // Redirect na Microsoft login
    window.location.href = authUrl;
  } catch (error) {
    console.error('Error initiating Entra login:', error);
    throw error;
  }
};

/**
 * Získá info o přihlášeném uživateli
 */
export const getCurrentUser = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      withCredentials: true
    });
    
    return response.data.user;
  } catch (error) {
    if (error.response?.status === 401) {
      return null; // Není přihlášen
    }
    throw error;
  }
};

/**
 * Odhlášení
 */
export const logout = async () => {
  try {
    await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
      withCredentials: true
    });
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

/**
 * Kontrola zda je uživatel přihlášen
 */
export const checkAuthStatus = async () => {
  try {
    const user = await getCurrentUser();
    return user !== null;
  } catch (error) {
    return false;
  }
};
```

### 2. Úprava Login komponenty

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/Login.js`

Přidej tlačítko pro MS365 login:

```javascript
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { initiateEntraLogin } from '../services/entraAuthService';
import styled from '@emotion/styled';
import { User, Lock, LogIn, AlertCircle } from 'lucide-react';

// ... stávající styled komponenty ...

// Nový styled komponent pro MS365 tlačítko
const MicrosoftButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #00a4ef 0%, #0078d4 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 120, 212, 0.2);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #0078d4 0%, #005a9e 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 120, 212, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e5e7eb;
  }
  
  span {
    color: #9ca3af;
    font-size: 0.85rem;
    font-weight: 500;
  }
`;

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entraLoading, setEntraLoading] = useState(false);
  const { login, error } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEntraLogin = async () => {
    setEntraLoading(true);
    try {
      await initiateEntraLogin();
      // Redirect na Microsoft nastane automaticky
    } catch (err) {
      console.error('Entra login failed:', err);
      setEntraLoading(false);
    }
  };

  return (
    <Wrapper>
      <Container>
        <CardHeader>
          <Title>ERDMS</Title>
          <Subtitle>Přihlášení do systému</Subtitle>
        </CardHeader>
        
        <CardBody>
          {/* MS365 Přihlášení - PRIMÁRNÍ */}
          <MicrosoftButton 
            type="button" 
            onClick={handleEntraLogin}
            disabled={entraLoading || loading}
          >
            <svg viewBox="0 0 23 23" fill="currentColor">
              <path d="M0 0h10.93v10.93H0zm12.07 0H23v10.93H12.07zM0 12.07h10.93V23H0zm12.07 0H23V23H12.07z"/>
            </svg>
            {entraLoading ? 'Přesměrování...' : 'Přihlásit přes Microsoft 365'}
          </MicrosoftButton>

          <Divider>
            <span>nebo použijte lokální účet</span>
          </Divider>

          {/* Lokální přihlášení - SEKUNDÁRNÍ */}
          <Form onSubmit={handleSubmit}>
            {error && (
              <ErrorMessage>
                <AlertCircle size={18} />
                <span>{error}</span>
              </ErrorMessage>
            )}

            <InputGroup>
              <InputLabel htmlFor="username">Uživatelské jméno</InputLabel>
              <InputWrapper>
                <InputIcon>
                  <User size={18} />
                </InputIcon>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Zadejte uživatelské jméno"
                  disabled={loading || entraLoading}
                  autoComplete="username"
                />
              </InputWrapper>
            </InputGroup>

            <InputGroup>
              <InputLabel htmlFor="password">Heslo</InputLabel>
              <InputWrapper>
                <InputIcon>
                  <Lock size={18} />
                </InputIcon>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Zadejte heslo"
                  disabled={loading || entraLoading}
                  autoComplete="current-password"
                />
                <PasswordToggle
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || entraLoading}
                  aria-label={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </PasswordToggle>
              </InputWrapper>
            </InputGroup>

            <LoginButton type="submit" disabled={loading || entraLoading}>
              {loading ? (
                <>
                  <Spinner />
                  Přihlašování...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Přihlásit se
                </>
              )}
            </LoginButton>
          </Form>
        </CardBody>
      </Container>
    </Wrapper>
  );
};

export default Login;
```

### 3. Úprava AuthContext

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/context/AuthContext.js`

Přidej podporu pro Entra session check:

```javascript
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, logout as entraLogout } from '../services/entraAuthService';
import { loginApi2, getUserDetailApi2 } from '../services/api2auth';
import {
  saveAuthData,
  loadAuthData,
  clearAuthData,
} from '../utils/authStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [user_id, setUserId] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [authSource, setAuthSource] = useState(null); // 'entra' nebo 'local'

  // Inicializace - zkontroluj Entra session NEBO lokální token
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Zkus Entra session (priorita)
        const entraUser = await getCurrentUser();
        
        if (entraUser) {
          console.log('✅ Nalezena Entra session:', entraUser);
          setUser(entraUser);
          setUserId(entraUser.id);
          setIsLoggedIn(true);
          setAuthSource('entra');
          
          // Načti detail uživatele
          // TODO: Implementuj endpoint pro získání detailu přes Entra session
          
          setLoading(false);
          return;
        }

        // 2. Fallback na lokální token
        const storedAuth = await loadAuthData();
        
        if (storedAuth.user && storedAuth.token) {
          console.log('✅ Nalezen lokální token');
          setUser(storedAuth.user);
          setToken(storedAuth.token);
          setUserId(storedAuth.user.id);
          setUserDetail(storedAuth.userDetail);
          setIsLoggedIn(true);
          setAuthSource('local');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Lokální login
  const login = async (username, password) => {
    try {
      const loginData = await loginApi2(username, password);
      
      setUser({ id: loginData.id, username: loginData.username });
      setToken(loginData.token);
      setUserId(loginData.id);
      setAuthSource('local');
      
      await saveAuthData.user({ id: loginData.id, username: loginData.username });
      await saveAuthData.token(loginData.token);
      
      const userDetail = await getUserDetailApi2(
        loginData.username, 
        loginData.token, 
        loginData.id
      );
      
      setUserDetail(userDetail);
      await saveAuthData.userDetail(userDetail);
      
      setIsLoggedIn(true);
      setError('');
    } catch (err) {
      console.error('Login error:', err);
      setError('Chyba při přihlášení');
      throw err;
    }
  };

  // Logout - podporuje obě metody
  const logout = async () => {
    try {
      if (authSource === 'entra') {
        await entraLogout();
      }
      
      // Clear local state
      setUser(null);
      setToken(null);
      setUserId(null);
      setUserDetail(null);
      setIsLoggedIn(false);
      setAuthSource(null);
      
      await clearAuthData.all();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn,
        error,
        loading,
        user_id,
        userDetail,
        authSource,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
```

### 4. Axios interceptor pro API calls

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/services/apiClient.js`

```javascript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'https://erdms-dev.zachranka.cz/api',
  withCredentials: true, // DŮLEŽITÉ: posílá cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor pro handling 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expirovala
      window.dispatchEvent(new CustomEvent('authError', {
        detail: { message: 'Vaše přihlášení vypršelo. Přihlaste se prosím znovu.' }
      }));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## Bezpečnostní opatření

### 1. Ověření session na backendu

Každý chráněný endpoint MUSÍ používat `sessionMiddleware`:

```javascript
// ✅ SPRÁVNĚ
router.get('/protected-data', sessionMiddleware, async (req, res) => {
  // req.user obsahuje ověřené user info
  res.json({ data: 'sensitive data', user: req.user });
});

// ❌ ŠPATNĚ - bez middleware
router.get('/unprotected-data', async (req, res) => {
  // Tento endpoint je zranitelný!
  res.json({ data: 'anyone can access this' });
});
```

### 2. Token details z MS

Co dostaneš z Microsoft tokenu:

```javascript
{
  account: {
    homeAccountId: "00000000-0000-0000-0000-000000000000.2bd7827b-4550-48ad-bd15-62f9a17990f1",
    localAccountId: "00000000-0000-0000-0000-000000000000",
    username: "u03924@zachranka.cz", // UPN
    name: "Jan Novák"
  },
  accessToken: "eyJ0eXAiOiJKV1QiLCJub25jZSI6...",
  idToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs...",
  expiresOn: Date
}
```

**Extrakce dat:**

```javascript
// EntraID (Object ID)
const entraId = account.homeAccountId.split('.')[0];

// Username (před @)
const username = account.username.split('@')[0]; // 'u03924'

// Email
const email = account.username; // 'u03924@zachranka.cz'

// UPN (User Principal Name)
const upn = account.username;
```

### 3. Ochrana proti session hijacking

**V session middleware:**

```javascript
const sessionMiddleware = async (req, res, next) => {
  try {
    const sessionId = req.cookies.erdms_session;
    const session = await authService.findSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // ✅ Kontrola expirace
    if (new Date(session.token_expires_at) < new Date()) {
      await authService.deleteSession(sessionId);
      res.clearCookie('erdms_session');
      return res.status(401).json({ error: 'Session expired' });
    }

    // ✅ Kontrola IP adresy (volitelné, ale doporučené)
    if (session.ip_address !== req.ip) {
      console.warn(`Session IP mismatch: ${session.ip_address} vs ${req.ip}`);
      // Můžeš buď zneplatnit session nebo jen logovat
    }

    // ✅ Update last activity
    await authService.updateSessionActivity(sessionId);
    
    req.user = {
      id: session.user_id,
      username: session.username,
      sessionId: sessionId
    };

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
};
```

### 4. CORS konfigurace

**V Node.js serveru:**

```javascript
app.use(cors({
  origin: process.env.CLIENT_URL, // 'https://erdms-dev.zachranka.cz/eeo-v2'
  credentials: true, // MUSÍ být true pro cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 5. Cookie nastavení

```javascript
res.cookie('erdms_session', sessionId, {
  httpOnly: true,           // ✅ Není přístupné z JavaScriptu
  secure: process.env.NODE_ENV === 'production', // ✅ Pouze HTTPS v produkci
  sameSite: 'lax',          // ✅ Ochrana proti CSRF
  maxAge: 24 * 60 * 60 * 1000, // 24 hodin
  domain: '.zachranka.cz',  // ✅ Sdílené přes subdomény
  path: '/'
});
```

---

## Testování

### 1. Lokální testování

**Krok 1: Nastartuj backend**

```bash
cd /var/www/erdms-dev/apps/eeo-v2/api
npm start
```

**Krok 2: Nastartuj frontend**

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm start
```

**Krok 3: Test MS365 login**

1. Otevři `http://localhost:3000/login`
2. Klikni "Přihlásit přes Microsoft 365"
3. Přihlas se MS365 účtem
4. Měl by se objevit redirect zpět na aplikaci
5. Zkontroluj v dev tools:
   - Cookie `erdms_session` je nastavena
   - Network tab ukazuje úspěšné API calls
   - Console neobsahuje errory

### 2. Test session persistence

```javascript
// V browser console
console.log(document.cookie); // Měl by obsahovat erdms_session

// Refresh stránky - měl by zůstat přihlášen
location.reload();

// Test logout
// Klikni logout tlačítko
// Cookie by měla být smazána
console.log(document.cookie);
```

### 3. Test API endpoints

**Curl test:**

```bash
# 1. Login přes curl
curl -c cookies.txt -X GET 'https://erdms-dev.zachranka.cz/api/auth/login'

# 2. Test protected endpoint
curl -b cookies.txt -X GET 'https://erdms-dev.zachranka.cz/api/auth/me'

# Měl by vrátit user info nebo 401
```

### 4. Test databázových záznamů

```sql
-- Zkontroluj sessions
SELECT * FROM erdms.erdms_sessions 
WHERE created_at > NOW() - INTERVAL 1 HOUR;

-- Zkontroluj user sync
SELECT id, username, entra_id, upn, auth_source, entra_sync_at 
FROM erdms.erdms_users 
WHERE entra_id IS NOT NULL;

-- Zkontroluj auth logy
SELECT * FROM erdms.erdms_auth_log 
WHERE event_time > NOW() - INTERVAL 1 HOUR
ORDER BY event_time DESC;
```

---

## Deployment

### 1. Production checklist

- [ ] `.env` má správné production hodnoty
- [ ] `NODE_ENV=production`
- [ ] HTTPS je nakonfigurováno
- [ ] Azure Redirect URI obsahuje production URL
- [ ] Cookie `secure: true` v produkci
- [ ] Database connection pool správně nakonfigurován
- [ ] Error logging (winston, sentry)
- [ ] Rate limiting zapnutý
- [ ] CORS nastavené jen pro production domain

### 2. Apache/Nginx konfigurace

**Příklad pro Apache (reverse proxy):**

```apache
<VirtualHost *:443>
    ServerName erdms.zachranka.cz
    
    # SSL certifikáty
    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem
    
    # Frontend (React build)
    DocumentRoot /var/www/erdms-dev/apps/eeo-v2/client/build
    
    # API proxy
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api
    
    # Povolit cookies přes proxy
    ProxyPreserveHost On
    
    <Directory /var/www/erdms-dev/apps/eeo-v2/client/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### 3. PM2 pro Node.js

```bash
# Install PM2
npm install -g pm2

# Start API server
cd /var/www/erdms-dev/apps/eeo-v2/api
pm2 start src/index.js --name erdms-api --env production

# Auto-restart on system reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
pm2 logs erdms-api
```

### 4. Build React app

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client

# Production build
npm run build

# Output bude v ./build/ složce
ls -la build/
```

---

## FAQ & Troubleshooting

### Q: Redirect loop po přihlášení

**Problém:** Po MS login neustále redirectuje zpět na login.

**Řešení:**
1. Zkontroluj že Azure Redirect URI je PŘESNĚ stejná jako v `.env`
2. Zkontroluj že cookie je správně nastavena:
   ```javascript
   // V Chrome DevTools → Application → Cookies
   // Měl by být erdms_session s httpOnly=true
   ```
3. Zkontroluj CORS nastavení - `credentials: true` musí být na obou stranách

### Q: "AADSTS50011: The reply URL specified in the request does not match"

**Problém:** Azure Entra odmítá redirect URL.

**Řešení:**
1. Jdi do Azure Portal → Entra ID → App registrations → [Tvoje app]
2. Authentication → Platform configurations → Web
3. Přidej PŘESNOU URL (včetně protokolu a lomítka)
4. Počkej 5-10 minut než se změní propagují

### Q: Session cookie není nastavena

**Problém:** Po úspěšném login se cookie neobjeví.

**Řešení:**
1. Zkontroluj že backend je na HTTPS v produkci
2. Zkontroluj `secure` flag:
   ```javascript
   res.cookie('erdms_session', sessionId, {
     secure: process.env.NODE_ENV === 'production' // false pro dev
   });
   ```
3. Zkontroluj `sameSite` nastavení
4. Zkontroluj že `domain` odpovídá (např. `.zachranka.cz`)

### Q: "User not found in database" error

**Problém:** MS365 login je úspěšný, ale user není v DB.

**Řešení:**
1. Zkontroluj mapování username:
   ```javascript
   // MS UPN: u03924@zachranka.cz
   // DB username: u03924
   const username = account.username.split('@')[0];
   ```
2. Vytvoř uživatele v DB:
   ```sql
   INSERT INTO erdms.erdms_users (username, auth_source, aktivni)
   VALUES ('u03924', 'entra', 1);
   ```
3. Nebo implementuj Just-In-Time provisioning

### Q: Token expirace

**Problém:** Access token vyprší za hodinu.

**Řešení:**
1. Implementuj refresh token flow:
   ```javascript
   const refreshToken = async (sessionId) => {
     const session = await findSession(sessionId);
     
     const tokenRequest = {
       refreshToken: session.entra_refresh_token,
       scopes: SCOPES
     };
     
     const response = await msalClient.acquireTokenByRefreshToken(tokenRequest);
     
     await updateSessionTokens(sessionId, {
       accessToken: response.accessToken,
       refreshToken: response.refreshToken,
       expiresAt: response.expiresOn
     });
   };
   ```

2. Automatická refresh v middleware:
   ```javascript
   // Pokud token vyprší za < 5 minut, refresh
   if (session.token_expires_at - Date.now() < 5 * 60 * 1000) {
     await refreshToken(sessionId);
   }
   ```

---

## Dodatečné zdroje

### Dokumentace Microsoft
- [MSAL Node.js dokumentace](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/overview)
- [OAuth 2.0 Authorization Code Flow](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)

### Interní dokumentace
- `/var/www/erdms-dev/docs/AZURE_ENTRA_CONFIG.md` - Azure konfigurace
- `/var/www/erdms-dev/docs/ENTRA_GRAPH_API_SETUP.md` - Graph API setup
- `/var/www/erdms-dev/docs/development/ENTRA-PHP-TOKEN-BRIDGE.md` - Token bridge design
- `/var/www/erdms-dev/docs/development/ENTRA-USER-SYNC-DESIGN.md` - User sync strategie

---

## Shrnutí kroků

### Backend (Node.js)
1. ✅ Nakonfiguruj `.env` s Entra credentials
2. ✅ Implementuj auth routes (`/auth/login`, `/auth/callback`)
3. ✅ Vytvoř session middleware
4. ✅ Zaregistruj routes v hlavním serveru
5. ✅ Nastav CORS s `credentials: true`

### Frontend (React)
1. ✅ Vytvoř `entraAuthService.js`
2. ✅ Upravit Login komponentu (přidat MS365 button)
3. ✅ Rozšířit AuthContext o Entra support
4. ✅ Nakonfiguruj axios s `withCredentials: true`
5. ✅ Testuj login flow

### Azure Portal
1. ✅ Registruj aplikaci (už hotovo)
2. ✅ Nastav Redirect URIs (typ: Web)
3. ✅ Přidej API permissions (User.Read, email, openid, profile)
4. ✅ Grant admin consent
5. ✅ Vytvoř Client Secret

### Databáze
1. ✅ Tabulka `erdms_users` s poli `entra_id`, `upn`
2. ✅ Tabulka `erdms_sessions`
3. ✅ Tabulka `erdms_auth_log` (volitelně)

---

**Aktualizováno:** 12. prosince 2025  
**Verze:** 1.0  
**Autor:** ERDMS Dev Team
