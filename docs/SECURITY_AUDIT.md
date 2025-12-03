# 🔒 Bezpečnostní analýza - ERDMS aplikace

**Datum audit:** 3. prosince 2025  
**Verze:** 1.0  
**Status:** ✅ Bezpečné po opravách

---

## 📊 Shrnutí

✅ **VYŘEŠENO:** Všechny kritické bezpečnostní problémy opraveny  
✅ **STAV:** Aplikace je bezpečná pro produkční nasazení  
⚠️ **DOPORUČENÍ:** Pravidelné security audity a aktualizace dependencies

---

## 🔴 Opravené kritické problémy

### 1. ✅ Authorization Bypass (VYŘEŠENO)

**Původní problém:**
```javascript
// ❌ PŘED: Každý uživatel mohl vidět data ostatních
router.get('/user/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;  // Žádná kontrola!
  const user = await entraService.getUserById(userId);
```

**Oprava:**
```javascript
// ✅ PO: Uživatel může vidět jen svá data (nebo admin všechna)
router.get('/user/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  // SECURITY: Validace GUID formátu
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!guidRegex.test(userId)) {
    return res.status(400).json({ error: 'Invalid userId format' });
  }
  
  // SECURITY: Ověř přístupová práva
  if (req.user.id !== userId && !req.user.roles.includes('Admin')) {
    return res.status(403).json({ error: 'Access denied' });
  }
```

**Dopad:** Kritický - umožňovalo přístup k cizím datům  
**Status:** ✅ Opraveno ve všech endpointech

---

### 2. ✅ Rate Limiting (VYŘEŠENO)

**Původní problém:**
- Žádné rate limiting
- Možnost DoS útoku spamováním requestů
- Možnost brute-force útoků

**Oprava:**
```javascript
// Přidán rate limiting middleware
const { readLimiter } = require('../middleware/rateLimitMiddleware');
router.use(readLimiter);  // Max 300 req/15min pro read operace
```

**Limity:**
- **Auth endpoints:** 10 req/15min (login pokusy)
- **API endpoints:** 100 req/15min (obecné API)
- **Read endpoints:** 300 req/15min (Entra data)

**Status:** ✅ Implementováno

---

### 3. ✅ Input validace (VYŘEŠENO)

**Původní problém:**
- Žádná validace GUID formátu
- Možnost injection útoků

**Oprava:**
```javascript
// Validace všech GUID parametrů
const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!guidRegex.test(userId)) {
  return res.status(400).json({ error: 'Invalid userId format' });
}

// Validace a limitování číselných parametrů
let limit = parseInt(req.query.limit) || 50;
if (isNaN(limit) || limit < 1 || limit > 100) {
  limit = 50;
}
```

**Status:** ✅ Implementováno

---

## ✅ Bezpečné komponenty

### 1. Autentizace

**✅ Microsoft Entra ID OAuth2/OIDC:**
- JWT token validation pomocí Microsoft JWKS
- Token signature ověřování pomocí veřejných klíčů
- Token expiraci kontrola
- Tenant ID validace

```javascript
jwt.verify(token, getKey, {
  audience: process.env.AZURE_CLIENT_ID,
  issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
  algorithms: ['RS256']
})
```

**✅ Session management:**
- HttpOnly cookies (ochrana proti XSS)
- Secure flag v production (HTTPS only)
- SameSite: 'lax' (ochrana proti CSRF)
- 24h expiraci
- Session tracking v databázi

---

### 2. Autorizace

**✅ Role-based Access Control (RBAC):**
```javascript
// Uživatel může vidět jen svoje data
if (req.user.id !== userId && !req.user.roles.includes('Admin')) {
  return res.status(403).json({ error: 'Access denied' });
}
```

**✅ Hierarchie přístupů:**
- **Běžný uživatel:** Jen svoje data
- **Admin:** Všechna data
- **Endpoint `/users`:** Všichni vidí seznam kolegů (OK pro organizaci)

---

### 3. Data Encryption

**✅ Transport Layer Security:**
- HTTPS v production (Nginx reverse proxy)
- TLS 1.2+ only
- Strong cipher suites

**✅ Client Secret:**
- Uložen v `.env` (ne v git)
- `.gitignore` obsahuje `.env*`
- GitHub Secret Scanning aktivní

---

### 4. API Security

**✅ Graph API přístup:**
- Application permissions (server-to-server)
- Client Secret Credential
- Tokeny se automaticky refreshují
- Oprávnění: READ ONLY (User.Read.All, Group.Read.All)

**✅ Co Graph API MŮŽE:**
- ✅ Číst uživatele a skupiny
- ✅ Číst organizační strukturu

**✅ Co Graph API NEMŮŽE:**
- ❌ Zapisovat nebo měnit data
- ❌ Mazat uživatele
- ❌ Měnit hesla
- ❌ Měnit členství ve skupinách

---

### 5. Database Security

**✅ SQL Injection ochrana:**
- Prepared statements (parameterized queries)
- MySQL2 library s automatickým escapováním

```javascript
const [rows] = await pool.execute(
  'SELECT * FROM users WHERE id = ?',
  [userId]  // ✅ Automaticky escapováno
);
```

**✅ Credentials:**
- `.env` file (ne v kódu)
- Environment-specific config
- Connection pooling s limity

---

## 🟡 Známá omezení (akceptovatelná)

### 1. Seznam zaměstnanců je veřejný

**Status:** 🟡 Akceptovatelné  
**Důvod:** V rámci organizace je normální vidět seznam kolegů  
**Limit:** Max 100 uživatelů najednou

```javascript
// Endpoint /api/entra/users je přístupný všem přihlášeným
router.get('/users', authenticateToken, async (req, res) => {
  // Každý může vidět seznam kolegů - to je OK
```

---

### 2. Group membership je viditelné

**Status:** 🟡 Akceptovatelné  
**Důvod:** Členství ve skupinách není citlivá informace  
**Bezpečnost:** Jen přihlášení uživatelé, pouze svoje skupiny

---

## 🔵 Doporučení pro budoucnost

### 1. Audit logging (Medium priority)

```javascript
// TODO: Přidat detailed audit log pro přístup k datům
await auditLog.log({
  userId: req.user.id,
  action: 'read_user_profile',
  targetUserId: userId,
  ip: req.ip,
  timestamp: new Date()
});
```

### 2. Content Security Policy (Low priority)

```javascript
// TODO: Přidat CSP headers v production
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://login.microsoftonline.com"],
      // ...
    }
  }
}));
```

### 3. Request body size limit (Low priority)

```javascript
// TODO: Limitovat velikost request body
app.use(express.json({ limit: '10kb' }));
```

---

## 📋 Security Checklist

### Autentizace & Autorizace
- [x] JWT token validace
- [x] Token signature verification
- [x] Token expiraci kontrola
- [x] Session management
- [x] HttpOnly cookies
- [x] RBAC implementace
- [x] Access control na všech endpointech

### Input Validation
- [x] GUID formát validace
- [x] Číselné parametry validace
- [x] Request parameter sanitizace
- [x] SQL injection ochrana (prepared statements)

### Rate Limiting & DoS
- [x] API rate limiting (300 req/15min)
- [x] Auth rate limiting (10 req/15min)
- [x] Request limit enforcement
- [x] IP-based tracking

### Data Protection
- [x] HTTPS v production
- [x] Secure cookies
- [x] SameSite cookies
- [x] Client secret v .env
- [x] .env v .gitignore
- [x] GitHub Secret Scanning

### API Security
- [x] Read-only oprávnění (Graph API)
- [x] Application permissions
- [x] Token refresh automaticky
- [x] Error handling bez leak info

### Monitoring
- [x] Auth event logging
- [x] Error logging
- [x] Security warning logs
- [ ] Audit log (TODO)

---

## 🚨 Security Incident Response

### Jak postupovat při bezpečnostním incidentu:

1. **Okamžitě:**
   - Zaloguj incident
   - Identifikuj scope (kolik uživatelů postiženo)
   - Invaliduj všechny sessions: `DELETE FROM sessions`

2. **Do 1 hodiny:**
   - Rotuj Client Secret v Azure Portal
   - Update `.env` na serveru
   - Restart aplikace

3. **Do 24 hodin:**
   - Notifikuj postižené uživatele
   - Proveď forensic analýzu logů
   - Připrav incident report

4. **Preventivní opatření:**
   - Security audit každé 3 měsíce
   - Dependency update každý měsíc
   - Log review každý týden

---

## 📞 Kontakt

**Security issues:**
- Email: u03924@zachranka.cz
- V případě kritického problému: OKAMŽITĚ kontaktovat IT

---

## 📚 Reference

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Microsoft Graph API Security](https://docs.microsoft.com/graph/security-authorization)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Status:** ✅ **APLIKACE JE BEZPEČNÁ**  
**Poslední audit:** 3. prosince 2025  
**Další audit:** 3. března 2026
