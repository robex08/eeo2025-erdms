# 📱 EEO API - USER DETAIL DOKUMENTACE

## 👤 1. USER DETAIL ENDPOINT

Endpoint pro načtení detailních informací o uživateli včetně rolí, oprávnění, organizace, pozice a statistik objednávek.

### **URL**
```
POST /api.eeo/user/detail
```

### **Request Body (JSON)**
```json
{
  "token": "am1lbm8udXppdmF0ZWxlfDE3MTQwNTYwMDA=",
  "username": "jmeno.uzivatele",
  "user_id": 123
}
```

**⚠️ DŮLEŽITÉ:**
- Pokud **nepošleš `user_id`**, vrátí se detail uživatele z tokenu (vlastní profil)
- Pokud **pošleš `user_id`**, vrátí se detail zadaného uživatele (pokud máš oprávnění)

---

## ✅ 2. RESPONSE - ÚSPĚCH (HTTP 200)

### **Kompletní struktura response:**

```json
{
  "id": 123,
  "username": "jan.novak",
  "jmeno": "Jan",
  "prijmeni": "Novák",
  "email": "jan.novak@zachranka.cz",
  "telefon": "+420123456789",
  "mobilni_telefon": "+420987654321",
  "aktivni": 1,
  "dt_posledni_prihlaseni": "2026-04-25 10:30:00",
  "dt_posledni_aktivita": "2026-04-25 14:15:00",
  "dt_vytvoreni": "2024-01-15 08:00:00",
  "dt_updated": "2026-04-20 12:00:00",
  "auth_method": "local",
  
  "organizace_id": 5,
  "organizace": {
    "id": 5,
    "nazev": "Zdravotnická záchranná služba Středočeského kraje",
    "ico": "12345678"
  },
  
  "pozice_id": 12,
  "pozice": {
    "id": 12,
    "nazev": "Vedoucí oddělení",
    "parent_id": 3
  },
  
  "lokalita_id": 8,
  "lokalita": {
    "id": 8,
    "nazev": "Praha 4",
    "typ": "lokalita",
    "parent_id": 1
  },
  
  "usek_id": 7,
  "usek_zkr": "IT",
  "usek": {
    "id": 7,
    "nazev": "Informační technologie",
    "zkratka": "IT"
  },
  
  "nadrizeny_id": 45,
  "podpis_graficky": "/data/eeo-v2/podpisy/123_podpis.png",
  "dt_nastup": "2024-01-15",
  "dt_ukonceni": null,
  "poznamka": "Administrátor systému",
  "vynucena_zmena_hesla": 0,
  "sms_notifikace": 1,
  "email_notifikace": 1,
  
  "roles": [
    {
      "id": 1,
      "kod_role": "ADMINISTRATOR",
      "nazev": "Administrátor",
      "popis": "Plný přístup do systému",
      "aktivni": 1,
      "rights": [
        {
          "id": 10,
          "kod_prava": "ADMIN_USERS",
          "popis": "Správa uživatelů",
          "modul": "USERS",
          "aktivni": 1
        },
        {
          "id": 11,
          "kod_prava": "ADMIN_ROLES",
          "popis": "Správa rolí",
          "modul": "ROLES",
          "aktivni": 1
        }
      ]
    }
  ],
  
  "direct_rights": [
    {
      "id": 25,
      "kod_prava": "VIEW_REPORTS",
      "popis": "Zobrazení reportů",
      "modul": "REPORTS",
      "aktivni": 1
    }
  ],
  
  "statistiky_objednavek": {
    "celkem": 150,
    "aktivni": 145,
    "zruseno_storno": 5,
    "stavy": {
      "nova": 10,
      "ke_schvaleni": 5,
      "schvalena": 20,
      "zamitnuta": 2,
      "rozpracovana": 15,
      "odeslana": 30,
      "potvrzena": 25,
      "uverejnena": 18,
      "ceka_potvrzeni": 8,
      "dokoncena": 12,
      "zrusena": 3,
      "smazana": 1,
      "archivovano": 1,
      "vecna_spravnost": 0,
      "zkontrolovana": 0
    }
  }
}
```

---

## 📊 3. POPIS POLÍ V RESPONSE

### **Základní informace o uživateli:**
| Pole | Typ | Popis |
|------|-----|-------|
| `id` | int | ID uživatele |
| `username` | string | Přihlašovací jméno |
| `jmeno` | string | Křestní jméno |
| `prijmeni` | string | Příjmení |
| `email` | string | E-mail |
| `telefon` | string | Pevná linka |
| `mobilni_telefon` | string | Mobilní telefon |
| `aktivni` | int | Aktivní uživatel (1 = ano, 0 = ne) |

### **Časové údaje:**
| Pole | Typ | Popis |
|------|-----|-------|
| `dt_posledni_prihlaseni` | datetime | Poslední přihlášení |
| `dt_posledni_aktivita` | datetime | Poslední aktivita v systému |
| `dt_vytvoreni` | datetime | Datum vytvoření účtu |
| `dt_updated` | datetime | Datum poslední změny |
| `dt_nastup` | date | Datum nástupu do zaměstnání |
| `dt_ukonceni` | date/null | Datum ukončení (null = stále aktivní) |

### **Organizační struktura:**
| Pole | Typ | Popis |
|------|-----|-------|
| `organizace_id` | int | ID organizace |
| `organizace` | object | Detail organizace (id, nazev, ico) |
| `pozice_id` | int | ID pozice |
| `pozice` | object | Detail pozice (id, nazev, parent_id) |
| `lokalita_id` | int | ID lokality |
| `lokalita` | object | Detail lokality (id, nazev, typ, parent_id) |
| `usek_id` | int | ID úseku |
| `usek` | object | Detail úseku (id, nazev, zkratka) |
| `usek_zkr` | string | Zkratka úseku |
| `nadrizeny_id` | int | ID nadřízeného |

### **Oprávnění a role:**
| Pole | Typ | Popis |
|------|-----|-------|
| `roles` | array | Pole přiřazených rolí s právy |
| `direct_rights` | array | Pole přímo přiřazených práv |
| `auth_method` | string | Metoda autentizace ('local' / 'entraid') |

### **Notifikace a nastavení:**
| Pole | Typ | Popis |
|------|-----|-------|
| `sms_notifikace` | int | SMS notifikace zapnuty (1 = ano) |
| `email_notifikace` | int | E-mail notifikace zapnuty (1 = ano) |
| `vynucena_zmena_hesla` | int | Vynucená změna hesla (1 = ano) |
| `podpis_graficky` | string/null | Cesta k grafickému podpisu |
| `poznamka` | string/null | Interní poznámka k uživateli |

### **Statistiky objednávek:**
| Pole | Typ | Popis |
|------|-----|-------|
| `statistiky_objednavek.celkem` | int | Celkový počet objednávek |
| `statistiky_objednavek.aktivni` | int | Aktivní objednávky (nezrušené) |
| `statistiky_objednavek.zruseno_storno` | int | Zrušené/smazané/archivované |
| `statistiky_objednavek.stavy` | object | Počty objednávek podle stavů |

---

## ❌ 4. ERROR RESPONSE CODES

### **400 - Chybějící parametry**
```json
{
  "err": "Chybí nebo neplatné user_id"
}
```

### **401 - Neplatný token**
```json
{
  "err": "Neplatný nebo chybějící token",
  "debug": {
    "token": "...",
    "token_decoded": "...",
    "token_parts": [...]
  }
}
```

### **401 - Nesouhlasí username**
```json
{
  "err": "Username z tokenu neodpovídá username z požadavku"
}
```

### **404 - Uživatel nenalezen**
```json
{
  "err": "Uživatel nenalezen"
}
```

### **500 - Chyba serveru**
```json
{
  "err": "Chyba databáze: ..."
}
```

---

## 📝 5. PŘÍKLADY POUŽITÍ

### **A) Načtení vlastního profilu**
```json
POST /api.eeo/user/detail

{
  "token": "am1lbm8udXppdmF0ZWxlfDE3MTQwNTYwMDA=",
  "username": "jan.novak"
}
```
*Neposíláš `user_id` → vrátí se detail uživatele z tokenu*

---

### **B) Načtení jiného uživatele**
```json
POST /api.eeo/user/detail

{
  "token": "am1lbm8udXppdmF0ZWxlfDE3MTQwNTYwMDA=",
  "username": "jan.novak",
  "user_id": 456
}
```
*Posíláš `user_id` → vrátí se detail uživatele ID 456*

---

## 🔒 6. BEZPEČNOST A OPRÁVNĚNÍ

### **Kdo může číst detail jiného uživatele?**
- API **nefiltruje** přístup na základě rolí v této verzi
- Každý přihlášený uživatel může číst detail jakéhokoliv jiného uživatele
- **Doporučení:** Implementuj kontrolu oprávnění na straně mobilní aplikace

### **Citlivá data:**
- Pole `password_hash` **NENÍ** vráceno (z bezpečnostních důvodů)
- Detail obsahuje strukturu organizace a oprávnění

---

## 🔍 7. PŘÍKLADY KÓDU PRO MOBILNÍ APLIKACI

### **Swift (iOS)**
```swift
struct UserDetailRequest: Codable {
    let token: String
    let username: String
    let user_id: Int?
}

struct UserDetailResponse: Codable {
    let id: Int
    let username: String
    let jmeno: String
    let prijmeni: String
    let email: String
    let organizace: Organization?
    let pozice: Position?
    let roles: [Role]
    let direct_rights: [Right]
    let statistiky_objednavek: OrderStatistics
    
    struct Organization: Codable {
        let id: Int
        let nazev: String
        let ico: String
    }
    
    struct Position: Codable {
        let id: Int
        let nazev: String
        let parent_id: Int?
    }
    
    struct Role: Codable {
        let id: Int
        let kod_role: String
        let nazev: String
        let rights: [Right]
    }
    
    struct Right: Codable {
        let id: Int
        let kod_prava: String
        let popis: String
        let modul: String
    }
    
    struct OrderStatistics: Codable {
        let celkem: Int
        let aktivni: Int
        let zruseno_storno: Int
    }
}

func getUserDetail(token: String, username: String, userId: Int? = nil) async throws -> UserDetailResponse {
    let url = URL(string: "https://erdms.zachranka.cz/api.eeo/user/detail")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = UserDetailRequest(token: token, username: username, user_id: userId)
    request.httpBody = try JSONEncoder().encode(body)
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse else {
        throw APIError.invalidResponse
    }
    
    guard httpResponse.statusCode == 200 else {
        throw APIError.requestFailed(statusCode: httpResponse.statusCode)
    }
    
    return try JSONDecoder().decode(UserDetailResponse.self, from: data)
}

// Použití:
let userDetail = try await getUserDetail(token: savedToken, username: savedUsername)
print("Uživatel: \(userDetail.jmeno) \(userDetail.prijmeni)")
print("Organizace: \(userDetail.organizace?.nazev ?? "N/A")")
print("Celkem objednávek: \(userDetail.statistiky_objednavek.celkem)")
```

---

### **Kotlin (Android)**
```kotlin
data class UserDetailRequest(
    val token: String,
    val username: String,
    val user_id: Int? = null
)

data class UserDetailResponse(
    val id: Int,
    val username: String,
    val jmeno: String,
    val prijmeni: String,
    val email: String,
    val organizace: Organization?,
    val pozice: Position?,
    val roles: List<Role>,
    val direct_rights: List<Right>,
    val statistiky_objednavek: OrderStatistics
) {
    data class Organization(
        val id: Int,
        val nazev: String,
        val ico: String
    )
    
    data class Position(
        val id: Int,
        val nazev: String,
        val parent_id: Int?
    )
    
    data class Role(
        val id: Int,
        val kod_role: String,
        val nazev: String,
        val rights: List<Right>
    )
    
    data class Right(
        val id: Int,
        val kod_prava: String,
        val popis: String,
        val modul: String
    )
    
    data class OrderStatistics(
        val celkem: Int,
        val aktivni: Int,
        val zruseno_storno: Int
    )
}

suspend fun getUserDetail(token: String, username: String, userId: Int? = null): UserDetailResponse {
    val client = OkHttpClient()
    val gson = Gson()
    
    val requestBody = UserDetailRequest(token, username, userId)
    val json = gson.toJson(requestBody)
    
    val body = json.toRequestBody("application/json".toMediaType())
    
    val request = Request.Builder()
        .url("https://erdms.zachranka.cz/api.eeo/user/detail")
        .post(body)
        .build()
    
    return withContext(Dispatchers.IO) {
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw IOException("Request failed: ${response.code}")
            }
            
            val responseBody = response.body?.string() ?: throw IOException("Empty response")
            gson.fromJson(responseBody, UserDetailResponse::class.java)
        }
    }
}

// Použití:
val userDetail = getUserDetail(savedToken, savedUsername)
Log.d("UserDetail", "Uživatel: ${userDetail.jmeno} ${userDetail.prijmeni}")
Log.d("UserDetail", "Organizace: ${userDetail.organizace?.nazev}")
Log.d("UserDetail", "Celkem objednávek: ${userDetail.statistiky_objednavek.celkem}")
```

---

### **JavaScript (React Native / Expo)**
```javascript
async function getUserDetail(token, username, userId = null) {
  try {
    const requestBody = {
      token,
      username,
    };
    
    // Přidej user_id pouze pokud je zadán
    if (userId !== null) {
      requestBody.user_id = userId;
    }
    
    const response = await fetch('https://erdms.zachranka.cz/api.eeo/user/detail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.err || `Request failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('getUserDetail error:', error);
    throw error;
  }
}

// Použití - vlastní profil:
const myProfile = await getUserDetail(savedToken, savedUsername);
console.log(`Uživatel: ${myProfile.jmeno} ${myProfile.prijmeni}`);
console.log(`Organizace: ${myProfile.organizace?.nazev}`);
console.log(`Celkem objednávek: ${myProfile.statistiky_objednavek.celkem}`);

// Použití - detail jiného uživatele:
const otherUser = await getUserDetail(savedToken, savedUsername, 456);
console.log(`Detail uživatele ID 456: ${otherUser.jmeno} ${otherUser.prijmeni}`);
```

---

## 💡 8. TIPY A BEST PRACTICES

1. **Cache profil uživatele** - načti ho jednou při startu a pak refresh jen když je potřeba
2. **Kontroluj aktivitu** - pole `dt_posledni_aktivita` se aktualizuje při každém volání
3. **Používej statistiky** - `statistiky_objednavek` můžeš zobrazit na dashboardu
4. **Ověřuj role** - pole `roles` použij pro podmíněné zobrazení funkcí v UI
5. **Strukturované objekty** - organizace, pozice, lokalita jsou vnořené objekty s ID i názvem
6. **NULL hodnoty** - některá pole mohou být `null` (dt_ukonceni, nadrizeny_id, atd.)
7. **Error handling** - vždy ošetři HTTP 401 (expirovaný token) a 404 (uživatel neexistuje)

---

## 🔗 SOUVISEJÍCÍ ENDPOINTY

- **Login:** `/api.eeo/login` - viz [MOBILE_API_LOGIN_DOCUMENTATION.md](MOBILE_API_LOGIN_DOCUMENTATION.md)
- **Token Refresh:** `/api.eeo/token-refresh`
- **User Profile Update:** `/api.eeo/user/profile` (pokud potřebuješ update)

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
