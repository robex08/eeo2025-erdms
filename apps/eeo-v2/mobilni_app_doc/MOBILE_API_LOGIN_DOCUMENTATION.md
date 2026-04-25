# 📱 EEO API - LOGIN DOKUMENTACE PRO MOBILNÍ APLIKACI

## 🔐 1. LOGIN ENDPOINT

### **URL**
```
POST /api.eeo/login
nebo
POST /api.eeo/user/login
```

### **Request Body (JSON)**
```json
{
  "username": "jmeno.uzivatele",
  "password": "heslo123"
}
```

### **Response - ÚSPĚCH (HTTP 200)**
```json
{
  "id": 123,
  "username": "jmeno.uzivatele",
  "jmeno": "Jan",
  "prijmeni": "Novák",
  "email": "jan.novak@example.cz",
  "token": "am1lbm8udXppdmF0ZWxlfDE3MTQwNTYwMDA=",
  "auth_method": "local",
  "aktivni": 1,
  "organizace_id": 5,
  "dt_posledni_prihlaseni": "2026-04-25 10:30:00",
  "dt_posledni_aktivita": "2026-04-25 10:30:00"
}
```

**⚠️ DŮLEŽITÉ:** Pole `password_hash` **NENÍ** vráceno v response (odstraněno z bezpečnostních důvodů).

---

## 🎫 2. TOKEN STRUKTURA

Token je **Base64 encoded** string ve formátu:
```
username|timestamp
```

**Příklad dekódovaného tokenu:**
```
jmeno.uzivatele|1714056000
```

### **Životnost tokenu**
- **24 hodin** (86400 sekund) od vydání
- Po expiraci musíš token refreshnout nebo se znovu přihlásit

---

## 🔄 3. TOKEN REFRESH ENDPOINT

Když token vyprší nebo se blíží k expiraci, můžeš ho obnovit bez nutnosti zadávat heslo znovu.

### **URL**
```
POST /api.eeo/token-refresh
```

### **Request Body (JSON)**
```json
{
  "username": "jmeno.uzivatele",
  "old_token": "am1lbm8udXppdmF0ZWxlfDE3MTQwNTYwMDA="
}
```

### **Response - ÚSPĚCH (HTTP 200)**
```json
{
  "token": "am1lbm8udXppdmF0ZWxlfDE3MTQxNDI0MDA=",
  "expires_at": "2026-04-26 10:30:00",
  "message": "Token refreshed successfully",
  "lifetime_seconds": 86400
}
```

---

## 🔒 4. AUTENTIZACE V DALŠÍCH API CALLS

Všechny chráněné endpointy vyžadují **token** a **username** v POST body:

### **Příklad požadavku na chráněný endpoint**
```json
POST /api.eeo/user/detail

{
  "token": "am1lbm8udXppdmF0ZWxlfDE3MTQwNTYwMDA=",
  "username": "jmeno.uzivatele",
  ... další parametry ...
}
```

**⚠️ NIKDY nepoužívaj token v HTTP headers** - EEO API **VYŽADUJE** token v POST body!

---

## ✅ 5. VERIFY TOKEN V2 - ROZŠÍŘENÉ INFORMACE

API interně používá `verify_token_v2()` funkci, která kromě ověření tokenu vrací i:

- **ID uživatele** (`id`)
- **Username** (`username`)
- **Admin práva** (`is_admin`) - boolean, zda je SUPERADMIN nebo ADMINISTRATOR
- **Role** (`roles`) - pole kódů rolí (`['SUPERADMIN']`, `['SPRAVCE_UCETNICTVI']`, atd.)
- **Oprávnění** (`permissions`) - pole objektů s kódy práv a popisy

**Poznámka:** Tyto rozšířené informace dostaneš automaticky při autentizovaných požadavcích, nemusíš volat speciální endpoint.

---

## ❌ 6. ERROR RESPONSE CODES

### **400 - Chybějící parametry**
```json
{
  "err": "Chybí username nebo password"
}
```

### **401 - Špatné přihlašovací údaje**
```json
{
  "err": "Špatné přihlašovací údaje",
  "debug": { ... }
}
```

### **403 - Neaktivní uživatel**
```json
{
  "err": "Uživatel nemá oprávnění k přihlášení (neaktivní)",
  "code": "USER_INACTIVE"
}
```

### **403 - Vynucená změna hesla**
```json
{
  "err": "Musíte si změnit heslo",
  "code": "FORCE_PASSWORD_CHANGE",
  "force_password_change": true,
  "userId": 123,
  "username": "jmeno.uzivatele",
  "token": "dočasný_token_pro_změnu_hesla"
}
```

### **500 - Chyba serveru**
```json
{
  "err": "Chyba databáze: ..."
}
```

---

## 📝 7. DOPORUČENÝ WORKFLOW PRO MOBILNÍ APLIKACI

### **A) První přihlášení**
```
1. Uživatel zadá username + password
2. Odešleš POST na /api.eeo/login
3. Uložíš token + username do secure storage (Keychain/KeyStore)
4. Token použiješ pro všechny další API volání
```

### **B) Ověření tokenu při spuštění aplikace**
```
1. Načteš token + username z úložiště
2. Zkusíš zavolat jakýkoliv endpoint (např. /user/detail)
3. Pokud HTTP 401 → token vypršel → přesměruj na login
4. Pokud HTTP 200 → token je OK → pokračuj
```

### **C) Refresh tokenu před expirací**
```
1. Sleduj čas vydání tokenu (timestamp v tokenu)
2. Když zbývá < 1 hodina do expiraci → zavolej /token-refresh
3. Ulož nový token
```

### **D) Automatické odhlášení**
```
1. Pokud dostaneš HTTP 401 z jakéhokoliv endpointu
2. Smaž token z úložiště
3. Přesměruj uživatele na login screen
```

---

## 🔧 8. TESTOVÁNÍ

### **DEV prostředí**
```
Base URL: http://localhost:3001/api.eeo/
nebo
Base URL: https://erdms.zachranka.cz/dev/api.eeo/
```

### **PRODUCTION prostředí**
```
Base URL: https://erdms.zachranka.cz/api.eeo/
```

---

## 💡 9. TIPY A BEST PRACTICES

1. **Vždy používej HTTPS** v produkci
2. **Ukládej token bezpečně** (Keychain/Android KeyStore, NIKDY plaintext)
3. **Loguj POUZE debug info**, nikdy plaintext hesla
4. **Implementuj token refresh** aby uživatel nemusel každých 24h zadávat heslo
5. **Ošetři všechny error kódy** (401, 403, 500)
6. **Timeout requests** - nastav rozumný timeout (např. 30s)

---

## 🔍 10. PŘÍKLAD KÓDU

### **Swift (iOS)**
```swift
func login(username: String, password: String) async throws -> LoginResponse {
    let url = URL(string: "https://erdms.zachranka.cz/api.eeo/login")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = [
        "username": username,
        "password": password
    ]
    request.httpBody = try JSONEncoder().encode(body)
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse else {
        throw LoginError.invalidResponse
    }
    
    guard httpResponse.statusCode == 200 else {
        throw LoginError.authenticationFailed
    }
    
    let loginResponse = try JSONDecoder().decode(LoginResponse.self, from: data)
    
    // Ulož token do Keychain
    try saveToKeychain(token: loginResponse.token, username: username)
    
    return loginResponse
}
```

### **Kotlin (Android)**
```kotlin
suspend fun login(username: String, password: String): LoginResponse {
    val client = OkHttpClient()
    val json = JSONObject()
        .put("username", username)
        .put("password", password)
    
    val body = json.toString()
        .toRequestBody("application/json".toMediaType())
    
    val request = Request.Builder()
        .url("https://erdms.zachranka.cz/api.eeo/login")
        .post(body)
        .build()
    
    return withContext(Dispatchers.IO) {
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw IOException("Login failed: ${response.code}")
            }
            
            val responseBody = response.body?.string()
            val gson = Gson()
            val loginResponse = gson.fromJson(responseBody, LoginResponse::class.java)
            
            // Ulož token do EncryptedSharedPreferences
            saveToken(loginResponse.token, username)
            
            loginResponse
        }
    }
}
```

### **JavaScript (React Native / Expo)**
```javascript
async function login(username, password) {
  try {
    const response = await fetch('https://erdms.zachranka.cz/api.eeo/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Ulož token do SecureStore (Expo) nebo AsyncStorage (React Native)
    await SecureStore.setItemAsync('userToken', data.token);
    await SecureStore.setItemAsync('username', data.username);
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
```

---

## 📞 KONTAKT A PODPORA

Pokud narazíš na problém nebo potřebuješ help s integrací:
- Dokumentace: `/var/www/erdms-dev/apps/eeo-v2/`
- API verze: `v2025.03_25`
- Support: Kontaktuj vývojový tým

---

**Vytvořeno:** 25. dubna 2026  
**Verze dokumentace:** 1.0  
**API Verze:** 2.40
