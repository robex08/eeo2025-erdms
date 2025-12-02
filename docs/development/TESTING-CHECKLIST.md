# Testing Checklist - MS Entra Login

## 🚀 Před testováním

### 1. Zkontroluj Azure Portal nastavení
- [ ] Aplikace je typu **Web** (ne SPA)
- [ ] Redirect URIs jsou registrované jako **Web**:
  - [ ] `http://localhost:5000/auth/callback`
- [ ] **Allow public client flows**: No ❌
- [ ] API Permissions granted (User.Read, email, openid, profile)
- [ ] Client Secret je platný (není expirovaný)
-
### 2. Zkontroluj Server ENV
```bash
cd /var/www/eeo2025/server
cat .env | grep ENTRA
```

Očekávané hodnoty:
- [ ] `ENTRA_TENANT_ID` - vyplněno
- [ ] `ENTRA_CLIENT_ID` - vyplněno
- [ ] `ENTRA_CLIENT_SECRET` - vyplněno
- [ ] `ENTRA_AUTHORITY` - obsahuje tenant ID
- [ ] `ENTRA_REDIRECT_URI=http://localhost:5000/auth/callback`
- [ ] `CLIENT_URL=http://localhost:5173`

### 3. Zkontroluj Client ENV
```bash
cd /var/www/eeo2025/client
cat .env
```

Očekávané hodnoty:
- [ ] `VITE_API_URL=http://localhost:5000`

### 4. Zkontroluj databázi
```bash
mysql -h 10.3.172.11 -u erdms_user -p erdms
```

```sql
-- Zkontroluj že tabulky existují
SHOW TABLES LIKE 'erdms_%';

-- Měly by být: erdms_users, erdms_sessions, erdms_auth_log

-- Zkontroluj testovacího uživatele
SELECT id, username, email, auth_source, aktivni FROM erdms_users WHERE username = 'admin';
```

---

## 🧪 Testovací scénáře

### Test 1: Spuštění serverů

#### Backend
```bash
cd /var/www/eeo2025/server
npm run dev
```

**Očekávaný výstup:**
```
╔═══════════════════════════════════════════╗
║  EEO2025 API Server                       ║
║  Environment: development                 ║
║  Port: 5000                               ║
║  URL: http://localhost:5000               ║
╚═══════════════════════════════════════════╝
```

- [ ] Server běží bez chyb
- [ ] Připojení k databázi úspěšné

#### Frontend
```bash
cd /var/www/eeo2025/client
npm run dev
```

**Očekávaný výstup:**
```
VITE ready in XXX ms
Local: http://localhost:5173/
```

- [ ] Frontend běží
- [ ] Otevře se na http://localhost:5173

---

### Test 2: Health Check

```bash
curl http://localhost:5000/api/health
```

**Očekávaná odpověď:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-02T...",
  "environment": "development"
}
```

- [ ] Endpoint odpovídá
- [ ] Status je "ok"

---

### Test 3: Login Flow - Happy Path

1. **Otevři prohlížeč:** http://localhost:5173

   **Očekáváno:**
   - [ ] Zobrazí se LoginPage
   - [ ] Vidím logo ZZS
   - [ ] Vidím tlačítko "Přihlásit se přes Microsoft"
   - [ ] Není žádná chybová hláška

2. **Klikni na "Přihlásit se přes Microsoft"**

   **Očekáváno:**
   - [ ] Redirect na Microsoft login stránku (login.microsoftonline.com)
   - [ ] V URL vidím váš tenant ID
   - [ ] V URL vidím `redirect_uri=http://localhost:5000/auth/callback`

3. **Přihlaš se Microsoft účtem**

   **Použij účet:** (email uživatele z vaší organizace)
   
   **Očekáváno:**
   - [ ] Microsoft přijme přihlášení
   - [ ] Redirect zpět na `http://localhost:5000/auth/callback?code=...`
   - [ ] Backend zpracuje callback
   - [ ] Redirect na `http://localhost:5173/dashboard`

4. **Dashboard zobrazení**

   **Očekáváno:**
   - [ ] Zobrazí se Dashboard
   - [ ] Vidím jméno přihlášeného uživatele
   - [ ] Vidím email
   - [ ] Vidím tlačítko "Odhlásit se"
   - [ ] Žádné chyby v console

5. **Zkontroluj session v prohlížeči**

   - Otevři DevTools (F12) → Application → Cookies → http://localhost:5173
   
   **Očekáváno:**
   - [ ] Cookie `erdms_session` existuje
   - [ ] HttpOnly: true
   - [ ] SameSite: Lax

6. **Zkontroluj session v databázi**

   ```sql
   SELECT * FROM erdms_sessions ORDER BY created_at DESC LIMIT 1;
   ```
   
   **Očekáváno:**
   - [ ] Nový záznam v tabulce
   - [ ] `user_id` odpovídá přihlášenému uživateli
   - [ ] `entra_access_token` je vyplněný
   - [ ] `ip_address` je vyplněná

7. **Zkontroluj auth log**

   ```sql
   SELECT * FROM erdms_auth_log ORDER BY created_at DESC LIMIT 3;
   ```
   
   **Očekáváno:**
   - [ ] Záznam s `event_type = 'login_success'`
   - [ ] `auth_method = 'entra_id'`
   - [ ] Správný username a user_id

---

### Test 4: Logout

1. **Na Dashboard klikni "Odhlásit se"**

   **Očekáváno:**
   - [ ] Redirect na Microsoft logout
   - [ ] Redirect zpět na `http://localhost:5173`
   - [ ] Zobrazí se LoginPage

2. **Zkontroluj session**

   ```sql
   SELECT * FROM erdms_sessions WHERE user_id = [tvoje_user_id];
   ```
   
   **Očekáváno:**
   - [ ] Session je smazaná (žádný výsledek)

3. **Zkontroluj auth log**

   ```sql
   SELECT * FROM erdms_auth_log ORDER BY created_at DESC LIMIT 1;
   ```
   
   **Očekáváno:**
   - [ ] Záznam s `event_type = 'logout'`

---

### Test 5: Protected Route - Bez přihlášení

1. **V inkognito okně otevři:** http://localhost:5173/dashboard

   **Očekáváno:**
   - [ ] Redirect na `/login`
   - [ ] Zobrazí se LoginPage

2. **Zkus volat API přímo:**
   ```bash
   curl http://localhost:5000/auth/me
   ```
   
   **Očekáváno:**
   ```json
   {
     "error": "Not authenticated"
   }
   ```
   - [ ] Status: 401

---

### Test 6: Error Handling - Uživatel neexistuje v DB

1. **Přihlaš se účtem, který NENÍ v `erdms_users` tabulce**

   **Očekáváno:**
   - [ ] Microsoft přihlášení proběhne OK
   - [ ] Backend zjistí, že user není v DB
   - [ ] Redirect na `/login?error=user_not_found`
   - [ ] Zobrazí se chybová hláška: "Uživatel nebyl nalezen v databázi. Kontaktujte administrátora."

2. **Zkontroluj auth log**

   ```sql
   SELECT * FROM erdms_auth_log WHERE event_type = 'login_failed' ORDER BY created_at DESC LIMIT 1;
   ```
   
   **Očekáváno:**
   - [ ] Záznam existuje
   - [ ] `error_message = 'User not found in database'`

---

### Test 7: Refresh po přihlášení

1. **Po úspěšném přihlášení na Dashboard stiskni F5 (refresh)**

   **Očekáváno:**
   - [ ] Dashboard se obnoví
   - [ ] Uživatel zůstane přihlášený
   - [ ] Data se znovu načtou z `/auth/me`

---

## 🐛 Ladění chyb

### Chyba: "Redirect URI mismatch"

**Příčina:** URI v Azure Portal neseděkdí s tím, co posílá backend

**Řešení:**
1. Zkontroluj Azure Portal → Authentication → Web → Redirect URIs
2. Zkontroluj `ENTRA_REDIRECT_URI` v server/.env
3. Musí být PŘESNĚ stejné (včetně http vs https, portu, cesty)

### Chyba: "invalid_client"

**Příčina:** Špatný Client Secret nebo aplikace není typu Web

**Řešení:**
1. Zkontroluj `ENTRA_CLIENT_SECRET` v server/.env
2. Zkontroluj Azure Portal → Authentication → Allow public client flows: **No**
3. Vygeneruj nový secret pokud je potřeba

### Chyba: Backend nepřipojuje k databázi

**Řešení:**
```bash
mysql -h 10.3.172.11 -u erdms_user -p
# Zadej heslo: AhchohTahnoh7eim
```

Pokud nefunguje:
- Zkontroluj DB_HOST, DB_USER, DB_PASSWORD v server/.env
- Zkontroluj síťové připojení

### Chyba: CORS

**Symptom:** Frontend vidí v console "CORS error" nebo "blocked by CORS policy"

**Řešení:**
1. Zkontroluj `CLIENT_URL` v server/.env
2. Musí být `http://localhost:5173` (ne 3000)
3. Restart backend serveru

---

## ✅ Kompletní test passed

Pokud všechny testy prošly:
- [ ] Login funguje
- [ ] Logout funguje
- [ ] Session management funguje
- [ ] Protected routes fungují
- [ ] Error handling funguje
- [ ] Auth log se píše správně

**🎉 Aplikace je připravená na další vývoj!**

---

## 📊 Browser Console - Co sledovat

### Při načtení LoginPage:
```
GET http://localhost:5173/ - 200
GET http://localhost:5173/assets/... - 200
```
- Žádné 404 nebo 500 errors

### Při kliku na "Přihlásit":
```
Navigation: http://localhost:5000/auth/login
Navigation: https://login.microsoftonline.com/...
```

### Po Microsoft login:
```
Navigation: http://localhost:5000/auth/callback?code=...
Navigation: http://localhost:5173/dashboard
GET http://localhost:5000/auth/me - 200
```

### Network tab - /auth/me response:
```json
{
  "id": 1,
  "username": "admin",
  "email": "robert.holovsky@zachranka.cz",
  "jmeno": "RH",
  "prijmeni": "ADMIN",
  "role": "admin",
  "auth_source": "entra_id"
}
```

---

**Poznámka:** Tento checklist používej při každém nasazení nebo po změnách v konfiguraci!
