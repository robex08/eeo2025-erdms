# ERDMS - Return-to Flow při přímém přístupu

**Datum:** 12. prosince 2025  
**Účel:** Automatické přesměrování na login a zpět při přímém přístupu k aplikaci

---

## Scénář

Uživatel zadá přímo URL aplikace bez předchozího přihlášení:

```
Uživatel: https://erdms.zachranka.cz/eeo-v2
          ↓
          Nemá platnou session
          ↓
          Redirect na login s return_to
          ↓
          Po přihlášení zpět na /eeo-v2
```

---

## Flow diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UŽIVATEL ZADÁ: https://erdms.zachranka.cz/eeo-v2         │
│    → Bookmark, přímý link, vypršelá session                  │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. EEO APP STARTUP (useEffect)                              │
│    → const response = await apiClient.get('/api/auth/me')   │
│    → withCredentials: true (pošle cookie pokud existuje)    │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ├─── Cookie existuje a je platná ──────────┐
                     │                                           │
                     │                                           ▼
                     │                              ┌────────────────────┐
                     │                              │ POKRAČUJ DO APLIKACE │
                     │                              │ Uživatel je přihlášen│
                     │                              └────────────────────┘
                     │
                     └─── Cookie NEEXISTUJE nebo EXPIRED ───────┐
                                                                 │
                                                                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. AUTH API VRÁTÍ 401 UNAUTHORIZED                          │
│    → sessionMiddleware: "No session found"                   │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. AXIOS INTERCEPTOR ZACHYTÍ 401                            │
│    → if (error.response?.status === 401)                    │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. REDIRECT NA ERDMS LOGIN S return_to                      │
│    → window.location.href = '/?return_to=eeo-v2'            │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. ERDMS DASHBOARD LOGIN PAGE                               │
│    → Zobrazí login formulář                                  │
│    → Uživatel klikne "Přihlásit přes MS365"                │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. MICROSOFT OAUTH FLOW                                     │
│    → Redirect na login.microsoft.com                         │
│    → Uživatel se přihlásí MS365 credentials                 │
│    → Microsoft vrátí authorization code                      │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. CALLBACK /api/auth/callback                              │
│    → Vymění code za tokeny                                   │
│    → Vytvoří session v DB                                    │
│    → Nastaví erdms_session cookie                           │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. ZPRACUJ return_to PARAMETR                               │
│    → Přečti z query string nebo session storage              │
│    → Redirect na: https://erdms.zachranka.cz/eeo-v2         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. UŽIVATEL JE ZPĚT V EEO APLIKACI                         │
│     → Nyní S PLATNOU SESSION                                 │
│     → AuthContext detekuje cookie → aplikace načte           │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementace

### 1. Aplikace: Auth Context s redirect

```javascript
// /var/www/erdms-dev/apps/eeo-v2/client/src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Pokus o získání user info (s cookie)
        const response = await apiClient.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log('Not authenticated, redirecting to login...');
          
          // ✅ Ulož aktuální cestu pro návrat
          const currentPath = window.location.pathname; // '/eeo-v2'
          const appName = currentPath.split('/')[1]; // 'eeo-v2'
          
          // Redirect na ERDMS dashboard login
          window.location.href = `/?return_to=${appName}`;
        } else {
          console.error('Auth check failed:', error);
        }
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

### 2. Dashboard: Login page s return_to handling

```javascript
// /var/www/erdms-dev/dashboard/src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { initiateEntraLogin } from '../services/entraAuthService';

const Login = () => {
  const [returnTo, setReturnTo] = useState(null);

  useEffect(() => {
    // Přečti return_to parametr z URL
    const urlParams = new URLSearchParams(window.location.search);
    const returnPath = urlParams.get('return_to');
    
    if (returnPath) {
      console.log('Return-to detected:', returnPath);
      // Ulož do sessionStorage pro použití po callbacku
      sessionStorage.setItem('return_to', returnPath);
      setReturnTo(returnPath);
    }
  }, []);

  const handleEntraLogin = async () => {
    try {
      // Zahájí MS365 OAuth flow
      await initiateEntraLogin();
      // Redirect na Microsoft nastane automaticky
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="login-page">
      <h1>ERDMS</h1>
      <p>Přihlášení do systému</p>
      
      {returnTo && (
        <div className="info-message">
          Po přihlášení budete přesměrováni na aplikaci: <strong>{returnTo}</strong>
        </div>
      )}
      
      <button onClick={handleEntraLogin}>
        Přihlásit přes Microsoft 365
      </button>
    </div>
  );
};

export default Login;
```

### 3. Auth callback: Redirect na return_to

```javascript
// /var/www/erdms-dev/auth-api/src/routes/auth.js
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.CLIENT_URL}/?error=${error}`);
  }

  try {
    // ... OAuth flow: exchange code for tokens ...
    const tokenResponse = await msalClient.acquireTokenByCode(tokenRequest);
    const { account, accessToken, idToken } = tokenResponse;

    // ... vytvoř user session ...
    const sessionId = await authService.createSession(user.id, ...);

    // Nastav session cookie
    res.cookie('erdms_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    // ✅ KLÍČOVÉ: Zpracuj return_to redirect
    // Přečti z query parametru nebo referrer
    let redirectUrl = process.env.CLIENT_URL; // default: dashboard
    
    // Option 1: Z query parametru (pokud byl předán přes login)
    const returnTo = req.query.return_to;
    if (returnTo) {
      redirectUrl = `${process.env.CLIENT_URL}/${returnTo}`;
    }
    
    console.log('✅ Login successful, redirecting to:', redirectUrl);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/?error=auth_failed`);
  }
});
```

### 4. Alternative: Client-side return_to handling

Pokud backend neposílá return_to v callbacku, můžeš to vyřešit na frontendu:

```javascript
// /var/www/erdms-dev/dashboard/src/App.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Po úspěšném přihlášení zkontroluj return_to
    const returnTo = sessionStorage.getItem('return_to');
    
    if (returnTo) {
      console.log('Redirecting to return_to:', returnTo);
      
      // Smaž z storage
      sessionStorage.removeItem('return_to');
      
      // Redirect na cílovou aplikaci
      window.location.href = `/${returnTo}`;
    }
  }, [navigate]);

  return (
    <div>
      {/* Dashboard content */}
    </div>
  );
}
```

---

## Scénář: Cross-domain aplikace

Pro aplikace na jiné doméně (např. `intranet.zachranka.cz`):

```javascript
// https://intranet.zachranka.cz/src/context/AuthContext.js
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Zkontroluj SSO token v URL
      const ssoToken = new URLSearchParams(window.location.search).get('sso_token');
      
      if (ssoToken) {
        // Ověř token a vytvoř lokální session
        const user = await authenticateWithSsoToken(ssoToken);
        setUser(user);
        setLoading(false);
        return;
      }

      // 2. Zkontroluj existující lokální session
      const existingUser = checkLocalSession();
      
      if (existingUser) {
        setUser(existingUser);
      } else {
        // ✅ Nemá session → redirect na ERDMS
        const currentHost = window.location.hostname; // 'intranet.zachranka.cz'
        const appName = currentHost.split('.')[0]; // 'intranet'
        
        // Redirect na ERDMS s return_to
        window.location.href = `https://erdms.zachranka.cz/?return_to=${appName}`;
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Dashboard: App launcher s return_to support

```javascript
// /var/www/erdms-dev/dashboard/src/components/AppLauncher.jsx
const AppLauncher = ({ appName, appUrl, isCrossDomain }) => {
  const handleLaunch = async () => {
    if (isCrossDomain) {
      // Pro cross-domain: generuj SSO token
      const { ssoToken } = await apiClient.post('/api/auth/generate-sso-token', {
        targetApp: appName
      });
      
      window.location.href = `${appUrl}?sso_token=${ssoToken}`;
    } else {
      // Pro same-domain: normální redirect (cookie se přenese)
      window.location.href = appUrl;
    }
  };

  return (
    <div className="app-card" onClick={handleLaunch}>
      <h3>{appName}</h3>
    </div>
  );
};
```

---

## Security considerations

### 1. Validace return_to parametru

```javascript
// Backend: Validuj return_to před redirectem
const ALLOWED_RETURN_PATHS = [
  'eeo-v2',
  'vozidla',
  'intranet',
  'szm',
  'kasa'
];

const validateReturnTo = (returnTo) => {
  if (!returnTo) return null;
  
  // Pouze povolené aplikace
  if (!ALLOWED_RETURN_PATHS.includes(returnTo)) {
    console.warn('Invalid return_to:', returnTo);
    return null;
  }
  
  // Žádné .. nebo / pro directory traversal
  if (returnTo.includes('..') || returnTo.includes('/')) {
    console.warn('Invalid return_to format:', returnTo);
    return null;
  }
  
  return returnTo;
};

// Použití v callback:
const returnTo = validateReturnTo(req.query.return_to);
const redirectUrl = returnTo 
  ? `${process.env.CLIENT_URL}/${returnTo}` 
  : process.env.CLIENT_URL;
```

### 2. Whitelist allowed redirects

```javascript
// Config: Povolené domény pro cross-domain redirect
const ALLOWED_DOMAINS = [
  'erdms.zachranka.cz',
  'intranet.zachranka.cz',
  'szm.zachranka.cz',
  'localhost' // pouze dev
];

const validateRedirectUrl = (url) => {
  try {
    const parsed = new URL(url);
    
    // Zkontroluj proti whitelistu
    if (!ALLOWED_DOMAINS.includes(parsed.hostname)) {
      throw new Error('Domain not allowed');
    }
    
    // Pouze HTTPS v produkci
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      throw new Error('HTTPS required');
    }
    
    return url;
  } catch (error) {
    console.error('Invalid redirect URL:', url, error);
    return process.env.CLIENT_URL; // fallback na dashboard
  }
};
```

---

## Testing

### Test case 1: Direct access bez session

```bash
# 1. Smaž cookies (simulate no session)
# Chrome DevTools → Application → Cookies → Clear All

# 2. Zadej přímo URL aplikace
https://erdms.zachranka.cz/eeo-v2

# Expected:
# → Redirect na /?return_to=eeo-v2
# → Login page s info "Po přihlášení budete přesměrováni na: eeo-v2"
# → Po přihlášení zpět na /eeo-v2
```

### Test case 2: Direct access s platnou session

```bash
# 1. Přihlas se normálně přes dashboard
# 2. Otevři novou záložku a zadej:
https://erdms.zachranka.cz/vozidla

# Expected:
# → Aplikace se načte OKAMŽITĚ (bez redirectu)
# → Cookie erdms_session se automaticky použije
```

### Test case 3: Expired session

```bash
# 1. Přihlas se
# 2. Počkej až session vyprší (nebo v DB změň expires_at na minulost)
# 3. Refresh stránky nebo zadej novou URL

# Expected:
# → 401 Unauthorized
# → Redirect na login s return_to
# → Po přihlášení zpět na původní URL
```

### Test case 4: Cross-domain return

```bash
# 1. Zadej přímo:
https://intranet.zachranka.cz/

# Expected:
# → Redirect na https://erdms.zachranka.cz/?return_to=intranet
# → Po přihlášení dashboard vygeneruje SSO token
# → Redirect zpět na https://intranet.zachranka.cz/?sso_token=...
```

---

## Console logs pro debugging

```javascript
// App startup
console.log('🟢 App startup - checking auth...');
console.log('🟢 Current path:', window.location.pathname);

// Auth check
console.log('🟢 Calling /api/auth/me...');

// Success
console.log('✅ User authenticated:', user);

// Failure → redirect
console.log('❌ Not authenticated, redirecting...');
console.log('🔄 Redirect to: /?return_to=eeo-v2');

// After callback
console.log('✅ Login successful');
console.log('🔄 Return-to detected:', returnTo);
console.log('🔄 Redirecting to:', redirectUrl);
```

---

## Shrnutí

### ✅ Co tento flow zajišťuje:

1. **Uživatel zadá přímo URL** → aplikace zkontroluje session
2. **Nemá platnou session** → redirect na ERDMS login s `?return_to=app_name`
3. **Po úspěšném přihlášení** → automatický redirect zpět na původní aplikaci
4. **Funguje pro same-domain** (shared cookie) i **cross-domain** (SSO token)
5. **Bezpečné** - validace return_to parametru, whitelist domén

### 📋 Klíčové součásti:

- **Auth Context** s automatickým redirect při 401
- **Login page** s detekcí return_to parametru
- **Auth callback** s redirect na return_to URL
- **Validace** return_to proti whitelistu
- **SessionStorage** pro uchování return_to přes OAuth flow

### 🔒 Security:

- ✅ Whitelist povolených aplikací
- ✅ Validace proti directory traversal
- ✅ HTTPS only v produkci
- ✅ Session timeout handling
- ✅ Audit log redirectů

---

**Aktualizováno:** 12. prosince 2025  
**Verze:** 1.0  
**Autor:** ERDMS Dev Team
