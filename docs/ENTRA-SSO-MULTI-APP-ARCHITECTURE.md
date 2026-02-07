# Microsoft Entra ID - Multi-App SSO Architektura

**Datum:** 12. prosince 2025  
**Účel:** Rozšíření Entra autentizace pro více aplikací (local i remote servers)

---

## 📋 Obsah

1. [Koncept SSO pro ERDMS](#koncept-sso-pro-erdms)
2. [Scénář 1: Aplikace na stejném serveru](#scénář-1-aplikace-na-stejném-serveru)
3. [Scénář 2: Aplikace na jiných serverech/doménách](#scénář-2-aplikace-na-jiných-serverechdoménách)
4. [Centrální Auth API](#centrální-auth-api)
5. [Session sharing strategie](#session-sharing-strategie)
6. [Implementace pro nové aplikace](#implementace-pro-nové-aplikace)
7. [Security best practices](#security-best-practices)

---

## Koncept SSO pro ERDMS

### Co je ERDMS Dashboard?

**ERDMS** = **Elektronický Rozcestník pro Document Management System**

```
┌─────────────────────────────────────────────────────────────┐
│                  ERDMS DASHBOARD                             │
│           https://erdms.zachranka.cz                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1. Přihlášení přes Microsoft 365 (Entra ID)        │   │
│  │     → Uživatel se přihlásí JEDNOU                    │   │
│  │     → Vytvoří se centrální session                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  2. Rozcestník aplikací (podle oprávnění)           │   │
│  │                                                       │   │
│  │  📦 EEO - Evidence objednávek                        │   │
│  │  📄 Intranet - Interní portál                        │   │
│  │  🚗 Vozidla - Správa vozového parku                  │   │
│  │  🏥 SZM - Sklad zdravotnického materiálu             │   │
│  │  📊 KASA - Pokladní kniha                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ✅ Jeden login → přístup do všech povolených aplikací      │
└─────────────────────────────────────────────────────────────┘
```

### Výhody SSO

✅ **Uživatel se přihlásí JEDNOU** → přístup do všech aplikací  
✅ **Centrální správa oprávnění** v databázi  
✅ **Bezpečnější** - žádná lokální hesla  
✅ **Snadná integrace nových aplikací**  
✅ **Funguje i pro aplikace na jiných serverech**

---

## Scénář 1: Aplikace na stejném serveru

### Struktura aplikací na `erdms.zachranka.cz`

```
/var/www/erdms-dev/
├── apps/
│   ├── eeo-v2/              → https://erdms.zachranka.cz/eeo-v2
│   ├── intranet/            → https://erdms.zachranka.cz/intranet
│   ├── vozidla/             → https://erdms.zachranka.cz/vozidla
│   └── szm/                 → https://erdms.zachranka.cz/szm
├── dashboard/               → https://erdms.zachranka.cz/
└── auth-api/                → https://erdms.zachranka.cz/api/auth
```

### Shared Session Cookie

**Klíč:** Cookie s `domain=.zachranka.cz` je **sdílená mezi všemi subpath**

```javascript
// Auth API nastaví cookie po přihlášení
res.cookie('erdms_session', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  domain: '.zachranka.cz',  // ✅ Sdílená napříč všemi /path
  path: '/',
  maxAge: 24 * 60 * 60 * 1000
});
```

### Flow pro aplikaci na stejném serveru

#### Scénář A: Uživatel přichází z Dashboard (má platnou session)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UŽIVATEL KLIKNE NA "EEO" V DASHBOARD                     │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. REDIRECT na https://erdms.zachranka.cz/eeo-v2            │
│    → Browser automaticky pošle erdms_session cookie         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. EEO APP STARTUP                                           │
│    → useEffect: zkontroluj session                           │
│    → GET /api/auth/me (s cookie)                             │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. AUTH API OVĚŘÍ SESSION                                    │
│    → sessionMiddleware zkontroluje cookie                    │
│    → vrátí user detail                                       │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. UŽIVATEL JE PŘIHLÁŠEN V EEO                              │
│    → Žádné další přihlašování                                │
└─────────────────────────────────────────────────────────────┘
```

#### Scénář B: Uživatel zadá přímo URL (NEMÁ platnou session)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UŽIVATEL ZADÁ https://erdms.zachranka.cz/eeo-v2          │
│    → Bookmark, přímý link, nebo nová session                 │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. EEO APP STARTUP                                           │
│    → useEffect: zkontroluj session                           │
│    → GET /api/auth/me (bez cookie nebo expired)             │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. AUTH API VRÁTÍ 401 UNAUTHORIZED                          │
│    → sessionMiddleware: No session found                     │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. EEO APP REDIRECT NA ERDMS LOGIN                          │
│    → window.location.href = '/?return_to=eeo-v2'            │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. UŽIVATEL SE PŘIHLÁSÍ PŘES MS365                          │
│    → Klikne "Přihlásit přes Microsoft 365"                  │
│    → Provede OAuth flow                                      │
│    → Vytvoří se erdms_session cookie                        │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. REDIRECT ZPĚT NA PŮVODNÍ APLIKACI                        │
│    → https://erdms.zachranka.cz/eeo-v2                      │
│    → Nyní S PLATNOU SESSION                                  │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. UŽIVATEL JE PŘIHLÁŠEN V EEO                              │
│    → Session cookie je nyní platná                           │
└─────────────────────────────────────────────────────────────┘
```

### Implementace v nové aplikaci (stejný server)

**Krok 1: Axios konfigurace**

```javascript
// src/services/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',  // Relativní URL - použije stejnou doménu
  withCredentials: true,  // ✅ Pošle erdms_session cookie
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor pro 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expirovala → redirect na dashboard login
      window.location.href = '/?login=required';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

**Krok 2: Auth Context**

```javascript
// src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // ✅ Cookie se pošle automaticky díky withCredentials
        const response = await apiClient.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        console.log('Not authenticated');
        // Redirect na dashboard
        window.location.href = '/?login=required';
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
```

**Krok 3: Protected Routes**

```javascript
// src/App.js
import { AuthProvider, AuthContext } from './context/AuthContext';

function ProtectedApp() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Načítání...</div>;
  }

  if (!user) {
    return null; // Redirect v AuthContext
  }

  return (
    <Router>
      <Routes>
        <Route path="/vozidla" element={<VozidlaPage />} />
        {/* další routes */}
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
}
```

---

## Scénář 2: Aplikace na jiných serverech/doménách

### Příklad: Aplikace na různých serverech

```
📍 Hlavní ERDMS:      https://erdms.zachranka.cz/
📍 EEO:               https://erdms.zachranka.cz/eeo-v2
📍 Intranet:          https://intranet.zachranka.cz/      ← jiná subdoména
📍 SZM e-Shop:        https://szm.zachranka.cz/           ← jiná subdoména
📍 Legacy systém:     https://legacy.example.com/         ← úplně jiná doména
```

### Problém: Cookie nefunguje mezi doménami

**Cookie s `domain=.zachranka.cz` funguje jen pro:**
- ✅ `erdms.zachranka.cz`
- ✅ `intranet.zachranka.cz`
- ✅ `szm.zachranka.cz`
- ❌ `legacy.example.com` ← jiná doména!

### Řešení: Token-based authentication

#### Strategie A: JWT Token Exchange (DOPORUČENO)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UŽIVATEL KLIKNE NA "INTRANET" V DASHBOARD                │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. DASHBOARD vygeneruje jednorázový token                   │
│    POST /api/auth/generate-sso-token                         │
│    Request: { sessionId: "...", targetApp: "intranet" }     │
│    Response: { ssoToken: "eyJhbGc..." }                     │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. REDIRECT na cílovou aplikaci                             │
│    https://intranet.zachranka.cz/?sso_token=eyJhbGc...      │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. INTRANET APP ověří token                                 │
│    POST https://erdms.zachranka.cz/api/auth/verify-sso-token│
│    Request: { ssoToken: "..." }                             │
│    Response: { user: {...}, sessionId: "..." }              │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. INTRANET vytvoří lokální session                         │
│    → Uloží sessionId do vlastní cookie/localStorage         │
│    → Uživatel je přihlášen                                  │
└─────────────────────────────────────────────────────────────┘
```

#### Implementace: Centrální Auth API

**1. Endpoint pro generování SSO tokenu**

```javascript
// /var/www/erdms-dev/auth-api/src/routes/sso.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authService = require('../services/authService');
const sessionMiddleware = require('../middleware/sessionMiddleware');

/**
 * POST /api/auth/generate-sso-token
 * Vygeneruje jednorázový token pro přechod do jiné aplikace
 */
router.post('/generate-sso-token', sessionMiddleware, async (req, res) => {
  try {
    const { targetApp } = req.body;
    const user = req.user;

    // Zkontroluj oprávnění pro cílovou aplikaci
    const hasAccess = await authService.checkAppPermission(user.id, targetApp);
    
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Access denied to target application' 
      });
    }

    // Vygeneruj JWT token (krátká platnost - 2 minuty)
    const ssoToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        entraId: user.entra_id,
        email: user.email,
        targetApp: targetApp,
        sessionId: user.sessionId
      },
      process.env.SSO_TOKEN_SECRET,
      { 
        expiresIn: '2m',  // ✅ Krátká platnost pro bezpečnost
        issuer: 'erdms-auth',
        audience: targetApp
      }
    );

    // Log SSO event
    await authService.logSsoEvent(user.id, targetApp, 'token_generated');

    res.json({ ssoToken });
  } catch (error) {
    console.error('SSO token generation error:', error);
    res.status(500).json({ error: 'Failed to generate SSO token' });
  }
});

/**
 * POST /api/auth/verify-sso-token
 * Ověří SSO token a vrátí user data
 */
router.post('/verify-sso-token', async (req, res) => {
  try {
    const { ssoToken } = req.body;

    if (!ssoToken) {
      return res.status(400).json({ error: 'SSO token required' });
    }

    // Ověř JWT token
    const decoded = jwt.verify(
      ssoToken,
      process.env.SSO_TOKEN_SECRET,
      { 
        issuer: 'erdms-auth'
      }
    );

    // Zkontroluj že původní session stále existuje
    const session = await authService.findSession(decoded.sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        error: 'Original session expired or invalid' 
      });
    }

    // Načti aktuální user data
    const user = await authService.findUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Log úspěšného SSO
    await authService.logSsoEvent(user.id, decoded.targetApp, 'token_verified');

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        entraId: user.entra_id,
        jmeno: user.jmeno,
        prijmeni: user.prijmeni
      },
      sessionId: decoded.sessionId
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'SSO token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid SSO token' });
    }
    
    console.error('SSO token verification error:', error);
    res.status(500).json({ error: 'Failed to verify SSO token' });
  }
});

module.exports = router;
```

**2. Registrace SSO routes**

```javascript
// /var/www/erdms-dev/auth-api/src/index.js
const ssoRoutes = require('./routes/sso');

app.use('/api/auth', ssoRoutes);
```

**3. Dashboard: SSO Link generátor**

```javascript
// /var/www/erdms-dev/dashboard/src/components/AppLauncher.jsx
import React from 'react';
import apiClient from '../services/apiClient';

const AppLauncher = ({ appName, appUrl, icon, description }) => {
  const handleLaunch = async () => {
    try {
      // Vygeneruj SSO token
      const response = await apiClient.post('/api/auth/generate-sso-token', {
        targetApp: appName
      });

      const { ssoToken } = response.data;

      // Redirect na cílovou aplikaci s tokenem
      const targetUrl = `${appUrl}?sso_token=${ssoToken}`;
      window.location.href = targetUrl;
    } catch (error) {
      console.error('Failed to launch app:', error);
      
      if (error.response?.status === 403) {
        alert('Nemáte oprávnění k této aplikaci');
      } else {
        alert('Chyba při spouštění aplikace');
      }
    }
  };

  return (
    <div className="app-card" onClick={handleLaunch}>
      <div className="icon">{icon}</div>
      <h3>{appName}</h3>
      <p>{description}</p>
    </div>
  );
};

export default AppLauncher;
```

**4. Vzdálená aplikace: SSO token handler**

```javascript
// https://intranet.zachranka.cz/src/services/ssoAuthService.js
import axios from 'axios';

const AUTH_API_URL = 'https://erdms.zachranka.cz/api/auth';

/**
 * Ověří SSO token a vytvoří lokální session
 */
export const authenticateWithSsoToken = async (ssoToken) => {
  try {
    // Ověř token na centrálním Auth API
    const response = await axios.post(
      `${AUTH_API_URL}/verify-sso-token`,
      { ssoToken },
      { 
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const { user, sessionId } = response.data;

    // Ulož session lokálně (localStorage nebo vlastní cookie)
    localStorage.setItem('intranet_session', JSON.stringify({
      user,
      sessionId,
      timestamp: Date.now()
    }));

    return user;
  } catch (error) {
    console.error('SSO authentication failed:', error);
    
    if (error.response?.status === 401) {
      // Token vypršel nebo je neplatný
      throw new Error('SSO token expired or invalid');
    }
    
    throw error;
  }
};

/**
 * Zkontroluj lokální session
 */
export const checkLocalSession = () => {
  try {
    const sessionData = localStorage.getItem('intranet_session');
    
    if (!sessionData) {
      return null;
    }

    const { user, timestamp } = JSON.parse(sessionData);

    // Kontrola expirace (např. 24 hodin)
    const age = Date.now() - timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hodin

    if (age > maxAge) {
      localStorage.removeItem('intranet_session');
      return null;
    }

    return user;
  } catch (error) {
    console.error('Session check failed:', error);
    return null;
  }
};

/**
 * Logout - smaže lokální session a redirect na ERDMS
 */
export const logout = () => {
  localStorage.removeItem('intranet_session');
  window.location.href = 'https://erdms.zachranka.cz/?logout=true';
};
```

**5. Vzdálená aplikace: Auth Context s return_to support**

```javascript
// https://intranet.zachranka.cz/src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import { 
  authenticateWithSsoToken, 
  checkLocalSession,
  logout 
} from '../services/ssoAuthService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Zkontroluj URL pro SSO token
        const urlParams = new URLSearchParams(window.location.search);
        const ssoToken = urlParams.get('sso_token');

        if (ssoToken) {
          console.log('SSO token detected, authenticating...');
          
          // Vyčisti URL (odstraň token z historie)
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Ověř SSO token
          const user = await authenticateWithSsoToken(ssoToken);
          setUser(user);
          setLoading(false);
          return;
        }

        // 2. Zkontroluj existující lokální session
        const existingUser = checkLocalSession();
        
        if (existingUser) {
          console.log('Existing session found');
          setUser(existingUser);
        } else {
          console.log('No session found, redirecting to ERDMS...');
          
          // ✅ KLÍČOVÉ: Redirect na ERDMS s return_to parametrem
          // Po úspěšném přihlášení bude uživatel přesměrován zpět
          const currentHost = window.location.hostname; // 'intranet.zachranka.cz'
          const appName = currentHost.split('.')[0]; // 'intranet'
          
          window.location.href = `https://erdms.zachranka.cz/?return_to=${appName}`;
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        
        // Redirect na ERDMS s error parametrem
        window.location.href = 'https://erdms.zachranka.cz/?auth_error=true';
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
```

---

## Centrální Auth API

### Struktura Auth API serveru

```
/var/www/erdms-dev/auth-api/
├── src/
│   ├── index.js                    # Main server
│   ├── config/
│   │   ├── entraConfig.js          # MSAL konfigurace
│   │   └── database.js             # DB pool
│   ├── middleware/
│   │   ├── sessionMiddleware.js    # Session ověření
│   │   └── rateLimiter.js          # Rate limiting
│   ├── routes/
│   │   ├── auth.js                 # OAuth flow (/login, /callback)
│   │   ├── sso.js                  # SSO tokeny (/generate, /verify)
│   │   └── session.js              # Session management
│   ├── services/
│   │   ├── authService.js          # User & session logika
│   │   └── permissionService.js    # Oprávnění kontrola
│   └── db/
│       └── connection.js           # MariaDB pool
├── .env                             # Environment variables
└── package.json
```

### Databázové tabulky

**1. Sessions tabulka**

```sql
CREATE TABLE `erdms_sessions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` INT NOT NULL,
  `entra_access_token` TEXT,
  `entra_refresh_token` TEXT,
  `entra_id_token` TEXT,
  `token_expires_at` DATETIME,
  `ip_address` VARCHAR(45),
  `user_agent` VARCHAR(500),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_activity` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**2. App permissions tabulka**

```sql
CREATE TABLE `erdms_app_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `app_name` VARCHAR(50) NOT NULL,
  `granted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `granted_by` INT,
  UNIQUE KEY `unique_user_app` (`user_id`, `app_name`),
  INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**3. SSO log tabulka**

```sql
CREATE TABLE `erdms_sso_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `target_app` VARCHAR(50),
  `event_type` ENUM('token_generated', 'token_verified', 'access_denied'),
  `ip_address` VARCHAR(45),
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Permission Service

```javascript
// /var/www/erdms-dev/auth-api/src/services/permissionService.js
const db = require('../db/connection');

class PermissionService {
  /**
   * Zkontroluj zda má uživatel přístup k aplikaci
   */
  async checkAppPermission(userId, appName) {
    try {
      const [rows] = await db.query(
        `SELECT 1 FROM erdms_app_permissions 
         WHERE user_id = ? AND app_name = ?`,
        [userId, appName]
      );

      return rows.length > 0;
    } catch (error) {
      console.error('Permission check error:', error);
      throw error;
    }
  }

  /**
   * Získej seznam aplikací které má uživatel povolené
   */
  async getUserApps(userId) {
    try {
      const [rows] = await db.query(
        `SELECT app_name FROM erdms_app_permissions 
         WHERE user_id = ?`,
        [userId]
      );

      return rows.map(r => r.app_name);
    } catch (error) {
      console.error('Get user apps error:', error);
      throw error;
    }
  }

  /**
   * Přidej oprávnění k aplikaci
   */
  async grantAppPermission(userId, appName, grantedBy) {
    try {
      await db.query(
        `INSERT INTO erdms_app_permissions (user_id, app_name, granted_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE granted_at = NOW()`,
        [userId, appName, grantedBy]
      );
    } catch (error) {
      console.error('Grant permission error:', error);
      throw error;
    }
  }

  /**
   * Odeber oprávnění k aplikaci
   */
  async revokeAppPermission(userId, appName) {
    try {
      await db.query(
        `DELETE FROM erdms_app_permissions 
         WHERE user_id = ? AND app_name = ?`,
        [userId, appName]
      );
    } catch (error) {
      console.error('Revoke permission error:', error);
      throw error;
    }
  }
}

module.exports = new PermissionService();
```

---

## Session Sharing Strategie

### Srovnání metod

| Metoda | Pro | Proti | Použití |
|--------|-----|-------|---------|
| **Shared Cookie** | ✅ Jednoduchá<br>✅ Automatická | ❌ Jen stejná doména<br>❌ Nelze cross-domain | Same server apps |
| **JWT SSO Token** | ✅ Cross-domain<br>✅ Bezpečná<br>✅ Stateless | ❌ Složitější implementace | Remote servers |
| **OAuth Proxy** | ✅ Standardní<br>✅ Enterprise ready | ❌ Nejsložitější | Enterprise systémy |

### Doporučení

```
┌─────────────────────────────────────────────────────────────┐
│ STEJNÝ SERVER (erdms.zachranka.cz)                          │
│ → Použij SHARED COOKIE                                       │
│   - Nejjednodušší                                            │
│   - Žádná extra implementace                                 │
│   - Cookie se automaticky posílá                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ JINÁ SUBDOMÉNA (*.zachranka.cz)                             │
│ → Použij JWT SSO TOKEN                                       │
│   - Bezpečný cross-domain                                    │
│   - Centrální validace                                       │
│   - Krátká platnost tokenu                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ÚPLNĚ JINÁ DOMÉNA (external.com)                            │
│ → Použij OAUTH PROXY nebo API KEY                           │
│   - Pro legacy systémy                                       │
│   - Pro partnery/třetí strany                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementace pro nové aplikace

### Checklist pro novou aplikaci (stejný server)

```
□ 1. Přidat route v Apache/Nginx
      ProxyPass /nova-app http://localhost:XXXX

□ 2. Vytvořit React/Node.js app
      npx create-react-app nova-app

□ 3. Přidat AuthContext s checkAuth()
      → volá GET /api/auth/me s withCredentials

□ 4. Přidat do dashboard rozcestníku
      → odkaz na /nova-app

□ 5. Přidat oprávnění do DB
      INSERT INTO erdms_app_permissions (user_id, app_name)
      VALUES (1, 'nova-app');

✅ HOTOVO - SSO funguje automaticky
```

### Checklist pro novou aplikaci (jiný server)

```
□ 1. Implementovat SSO token handler
      → authenticateWithSsoToken()

□ 2. Vytvořit AuthContext s URL check
      → zkontroluj ?sso_token=...

□ 3. Uložit session lokálně
      → localStorage nebo vlastní cookie

□ 4. Přidat logout redirect
      → window.location.href = 'https://erdms.zachranka.cz'

□ 5. Přidat do dashboard jako AppLauncher
      → onClick generuje SSO token

□ 6. Přidat oprávnění do DB
      INSERT INTO erdms_app_permissions

✅ HOTOVO - Cross-domain SSO funguje
```

---

## Security Best Practices

### 1. SSO Token Security

```javascript
// ✅ SPRÁVNĚ: Krátká platnost
jwt.sign(payload, secret, { 
  expiresIn: '2m'  // Pouze 2 minuty
});

// ❌ ŠPATNĚ: Dlouhá platnost
jwt.sign(payload, secret, { 
  expiresIn: '1d'  // Příliš dlouhá doba
});
```

### 2. Token použití - One-time use

```javascript
// Implementace: Použitý token zneplatnit

const usedTokens = new Set(); // V produkci použij Redis

router.post('/verify-sso-token', async (req, res) => {
  const { ssoToken } = req.body;
  
  // Zkontroluj zda nebyl token již použitý
  if (usedTokens.has(ssoToken)) {
    return res.status(401).json({ error: 'Token already used' });
  }
  
  // Ověř token
  const decoded = jwt.verify(ssoToken, secret);
  
  // Označ jako použitý
  usedTokens.add(ssoToken);
  
  // Vyčisti po expiraci (2 minuty)
  setTimeout(() => usedTokens.delete(ssoToken), 2 * 60 * 1000);
  
  res.json({ user: decoded });
});
```

### 3. HTTPS Only

```javascript
// ✅ V produkci VŽDY HTTPS
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });
}
```

### 4. Rate Limiting

```javascript
// Limit na SSO token generation
const rateLimit = require('express-rate-limit');

const ssoTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 20, // Max 20 tokenů za 15 minut
  message: 'Too many SSO requests, please try again later'
});

router.post('/generate-sso-token', ssoTokenLimiter, sessionMiddleware, handler);
```

### 5. Audit Log

```javascript
// Loguj všechny SSO eventy
await db.query(
  `INSERT INTO erdms_sso_log (user_id, target_app, event_type, ip_address)
   VALUES (?, ?, ?, ?)`,
  [userId, targetApp, 'token_generated', req.ip]
);
```

---

## Příklady implementace

### Příklad 1: Dashboard Apps Seznam

```javascript
// /var/www/erdms-dev/dashboard/src/components/AppGrid.jsx
import React, { useState, useEffect } from 'react';
import AppLauncher from './AppLauncher';
import apiClient from '../services/apiClient';

const AppGrid = () => {
  const [apps, setApps] = useState([]);

  useEffect(() => {
    const loadApps = async () => {
      try {
        // Získej seznam povolených aplikací pro uživatele
        const response = await apiClient.get('/api/auth/my-apps');
        setApps(response.data.apps);
      } catch (error) {
        console.error('Failed to load apps:', error);
      }
    };

    loadApps();
  }, []);

  return (
    <div className="app-grid">
      <h2>Dostupné aplikace</h2>
      <div className="grid">
        {apps.map(app => (
          <AppLauncher
            key={app.name}
            appName={app.name}
            appUrl={app.url}
            icon={app.icon}
            description={app.description}
            isCrossDomain={app.cross_domain}
          />
        ))}
      </div>
    </div>
  );
};

export default AppGrid;
```

### Příklad 2: Backend endpoint pro apps list

```javascript
// /var/www/erdms-dev/auth-api/src/routes/apps.js
router.get('/my-apps', sessionMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Získej oprávnění
    const allowedApps = await permissionService.getUserApps(userId);
    
    // Definice všech aplikací
    const allApps = {
      'eeo': {
        name: 'eeo',
        title: 'EEO - Evidence objednávek',
        url: '/eeo-v2',
        icon: '📦',
        description: 'Evidence elektronických objednávek',
        cross_domain: false
      },
      'intranet': {
        name: 'intranet',
        title: 'Intranet ZZS',
        url: 'https://intranet.zachranka.cz',
        icon: '📄',
        description: 'Interní portál ZZS',
        cross_domain: true
      },
      'vozidla': {
        name: 'vozidla',
        title: 'Správa vozového parku',
        url: '/vozidla',
        icon: '🚗',
        description: 'Evidence a správa vozidel',
        cross_domain: false
      },
      'szm': {
        name: 'szm',
        title: 'SZM e-Shop',
        url: 'https://szm.zachranka.cz',
        icon: '🏥',
        description: 'Sklad zdravotnického materiálu',
        cross_domain: true
      }
    };
    
    // Filtruj jen povolené
    const apps = allowedApps
      .map(name => allApps[name])
      .filter(app => app !== undefined);
    
    res.json({ apps });
  } catch (error) {
    console.error('Get apps error:', error);
    res.status(500).json({ error: 'Failed to load apps' });
  }
});
```

---

## Migrace existujících aplikací

### Scénář: Legacy PHP aplikace

**Problém:** Stará PHP aplikace má vlastní login systém

**Řešení:** Wrapper s SSO

```php
<?php
// legacy-app/sso-wrapper.php

// 1. Zkontroluj SSO token v URL
if (isset($_GET['sso_token'])) {
    $ssoToken = $_GET['sso_token'];
    
    // 2. Ověř token na Auth API
    $authApiUrl = 'https://erdms.zachranka.cz/api/auth/verify-sso-token';
    
    $ch = curl_init($authApiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['ssoToken' => $ssoToken]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        $user = $data['user'];
        
        // 3. Vytvoř PHP session
        session_start();
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['authenticated'] = true;
        
        // 4. Redirect bez tokenu v URL
        header('Location: index.php');
        exit;
    } else {
        die('SSO authentication failed');
    }
}

// 5. Zkontroluj existující PHP session
session_start();
if (!isset($_SESSION['authenticated']) || !$_SESSION['authenticated']) {
    // Redirect na ERDMS pro přihlášení
    header('Location: https://erdms.zachranka.cz/?return_to=legacy-app');
    exit;
}

// Uživatel je přihlášen - načti aplikaci
require_once 'index.php';
?>
```

---

## Monitoring & Debugging

### 1. SSO Event Log

```sql
-- Přehled SSO aktivit
SELECT 
  u.username,
  sl.target_app,
  sl.event_type,
  sl.ip_address,
  sl.timestamp
FROM erdms_sso_log sl
JOIN erdms_users u ON sl.user_id = u.id
WHERE sl.timestamp > NOW() - INTERVAL 1 HOUR
ORDER BY sl.timestamp DESC;
```

### 2. Failed SSO Attempts

```sql
-- Selhané pokusy o SSO
SELECT 
  user_id,
  target_app,
  COUNT(*) as failed_attempts,
  MAX(timestamp) as last_attempt
FROM erdms_sso_log
WHERE event_type = 'access_denied'
  AND timestamp > NOW() - INTERVAL 24 HOUR
GROUP BY user_id, target_app
HAVING failed_attempts > 5;
```

### 3. Active Sessions

```sql
-- Aktivní sessions
SELECT 
  u.username,
  s.ip_address,
  s.user_agent,
  s.created_at,
  s.last_activity,
  TIMESTAMPDIFF(MINUTE, s.last_activity, NOW()) as minutes_idle
FROM erdms_sessions s
JOIN erdms_users u ON s.user_id = u.id
WHERE s.token_expires_at > NOW()
ORDER BY s.last_activity DESC;
```

### 4. Debug endpoint

```javascript
// /var/www/erdms-dev/auth-api/src/routes/debug.js
router.get('/debug/session/:sessionId', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Debug endpoints disabled in production' });
  }

  const session = await authService.findSession(req.params.sessionId);
  
  res.json({
    session: session ? {
      id: session.id,
      userId: session.user_id,
      username: session.username,
      createdAt: session.created_at,
      lastActivity: session.last_activity,
      expiresAt: session.token_expires_at,
      isExpired: new Date(session.token_expires_at) < new Date()
    } : null
  });
});
```

---

## Shrnutí

### ✅ Co umožňuje tato architektura:

1. **Centrální přihlášení** přes Microsoft 365
2. **SSO napříč aplikacemi** na stejném i jiných serverech
3. **Bezpečná session** s krátkou platností tokenů
4. **Centrální správa oprávnění** v databázi
5. **Snadná integrace nových aplikací**
6. **Audit log** všech SSO událostí
7. **Škálovatelnost** - podporuje neomezený počet aplikací

### 🎯 Typické use cases:

- ✅ Aplikace na `/eeo-v2`, `/vozidla` → **Shared Cookie**
- ✅ Aplikace na `intranet.zachranka.cz` → **JWT SSO Token**
- ✅ Legacy PHP systém → **SSO Wrapper**
- ✅ Externí partneri → **API Key + OAuth**

### 📚 Související dokumentace:

- [ENTRA-IMPLEMENTATION-GUIDE.md](./ENTRA-IMPLEMENTATION-GUIDE.md) - Základní implementace
- [AZURE_ENTRA_CONFIG.md](./AZURE_ENTRA_CONFIG.md) - Azure konfigurace
- [ENTRA-PHP-TOKEN-BRIDGE.md](./development/ENTRA-PHP-TOKEN-BRIDGE.md) - PHP integrace

---

**Aktualizováno:** 12. prosince 2025  
**Verze:** 1.0  
**Autor:** ERDMS Dev Team
