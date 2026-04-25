# 📱 EEO API - STATISTIKY OBJEDNÁVEK DOKUMENTACE

## 📊 1. ORDER STATS ENDPOINT

Endpoint pro načtení statistik objednávek s podporou oprávnění a filtrování podle období. Endpoint respektuje uživatelská práva - administrátoři vidí všechny objednávky, běžní uživatelé pouze své vlastní.

### **URL**
```
POST /api.eeo/order-v3/stats
```

### **Request Body (JSON)**
```json
{
  "token": "am1lbm8udXppdmF0ZWxlfDE3MTQwNTYwMDA=",
  "username": "jmeno.uzivatele",
  "period": "current-year"
}
```

**⚠️ DŮLEŽITÉ:**
- `token` a `username` jsou **POVINNÉ**
- `period` je **VOLITELNÝ** (default: `"all"` = všechny objednávky bez časového omezení)

---

## ⏰ 2. PODPOROVANÁ OBDOBÍ (PERIOD)

| Hodnota | Popis | Datum od | Datum do |
|---------|-------|----------|----------|
| `"all"` | Všechny objednávky (default) | - | - |
| `"current-year"` | Aktuální rok | 1.1.2026 | 31.12.2026 |
| `"all-months"` | Alias pro aktuální rok | 1.1.2026 | 31.12.2026 |
| `"current-month"` | Aktuální měsíc | 1. den měsíce | Dnes |
| `"last-month"` | Posledních 30 dní | Dnes - 30 dní | Dnes |
| `"last-quarter"` | Poslední kvartál (90 dní) | Dnes - 90 dní | Dnes |

**Příklady:**
```json
// Všechny objednávky
{"token": "...", "username": "...", "period": "all"}

// Jen letošní rok
{"token": "...", "username": "...", "period": "current-year"}

// Posledních 30 dní
{"token": "...", "username": "...", "period": "last-month"}
```

---

## ✅ 3. RESPONSE - ÚSPĚCH (HTTP 200)

### **Kompletní struktura response:**

```json
{
  "status": "success",
  "data": {
    "total": 150,
    "totalAmount": 2500000.50,
    "total_amount": 2500000.50,
    "filteredTotalAmount": 2500000.50,
    "rozpracovaneAmount": 1800000.00,
    "dokoncenaAmount": 700000.50,
    
    "nove": 10,
    "ke_schvaleni": 5,
    "schvalena": 20,
    "zamitnuta": 2,
    "rozpracovana": 15,
    "odeslana": 30,
    "potvrzena": 25,
    "k_uverejneni_do_registru": 8,
    "uverejnena": 18,
    "fakturace": 12,
    "vecna_spravnost": 3,
    "fakturace_prodleni": 5,
    "zkontrolovana": 4,
    "dokoncena": 12,
    "zrusena": 3,
    "smazana": 1,
    
    "withInvoices": 45,
    "withAttachments": 120,
    "withoutObjAttachments": 30,
    "mimoradneUdalosti": 8,
    "mojeObjednavky": 85,
    "withComments": 67,
    "withMyComments": 23
  },
  "message": "Statistiky načteny úspěšně"
}
```

---

## 📊 4. POPIS POLÍ V RESPONSE

### **Základní statistiky:**

| Pole | Typ | Popis |
|------|-----|-------|
| `total` | int | **Celkový počet VŠECH objednávek** (součet všech stavů) |
| `totalAmount` | float | **Celková částka VŠECH objednávek** (Kč s DPH) |
| `total_amount` | float | Alias pro totalAmount (kompatibilita) |
| `filteredTotalAmount` | float | Částka po aplikaci filtrů (stejná jako totalAmount) |
| `rozpracovaneAmount` | float | **Částka rozpracovaných objednávek** - agregát stavů: SCHVALENA, ROZPRACOVANA, ODESLANA, POTVRZENA, UVEREJNIT, UVEREJNENA, FAKTURACE, VECNA_SPRAVNOST, ZKONTROLOVANA (Kč s DPH) |
| `dokoncenaAmount` | float | **Částka dokončených objednávek** - jen stav DOKONCENA (Kč s DPH) |

**⚠️ DŮLEŽITÉ - Částky podle stavů:**
- API vrací **POUZE 3 částky**: `totalAmount`, `rozpracovaneAmount`, `dokoncenaAmount`
- **NEEXISTUJÍ** samostatné částky pro jednotlivé stavy jako "nové", "ke schválení", "odeslané", atd.
- Pokud potřebuješ částku pro konkrétní stav (např. "ke_schvaleni"), musíš použít endpoint `/api.eeo/order-v3/list` s filtrem a částky si spočítat ze seznamu objednávek

**⚠️ Poznámka k výpočtu částek:**
Částka objednávky se určuje v prioritě: **faktury** > **položky** > **max_cena_s_dph**

**📊 Příklad výpočtu:**
```javascript
// Celková částka VŠECH objednávek
const totalAmount = stats.data.totalAmount; // 2 500 000 Kč

// Částka rozpracovaných (SCHVALENA + ROZPRACOVANA + ODESLANA + ...)
const rozpracovaneAmount = stats.data.rozpracovaneAmount; // 1 800 000 Kč

// Částka dokončených (jen DOKONCENA)
const dokoncenaAmount = stats.data.dokoncenaAmount; // 700 000 Kč

// Poznámka: totalAmount = rozpracovaneAmount + dokoncenaAmount + částky ostatních stavů (nové, zrušené, atd.)
```

---

### **Stavy workflow (POUZE počty objednávek, BEZ částek!):**

| Pole | Stav | Popis | Částka? |
|------|------|-------|---------|
| `nove` | NOVÁ | Nově vytvořené objednávky | ❌ Není |
| `ke_schvaleni` | KE SCHVÁLENÍ | Čekají na schválení | ❌ Není |
| `schvalena` | SCHVÁLENÁ | Schválené, připravené k odeslání | ❌ Není |
| `zamitnuta` | ZAMÍTNUTA | Zamítnuté objednávky | ❌ Není |
| `rozpracovana` | ROZPRACOVANÁ | Ve stavu zpracování | ❌ Není |
| `odeslana` | ODESLANÁ | Odeslané dodavateli | ❌ Není |
| `potvrzena` | POTVRZENÁ | Potvrzené dodavatelem | ❌ Není |
| `k_uverejneni_do_registru` | K UVEŘEJNĚNÍ | Čekají na publikaci do registru smluv | ❌ Není |
| `uverejnena` | UVEŘEJNĚNÁ | Zveřejněné v registru smluv | ❌ Není |
| `fakturace` | FAKTURACE | Ve fázi fakturace | ❌ Není |
| `vecna_spravnost` | VĚCNÁ SPRÁVNOST | Kontrola věcné správnosti | ❌ Není |
| `fakturace_prodleni` | FAKTURACE V PRODLENÍ | >7 dní ve stavech POTVRZENA/FAKTURACE/VECNA_SPRAVNOST | ❌ Není |
| `zkontrolovana` | ZKONTROLOVANÁ | Zkontrolované objednávky | ❌ Není |
| `dokoncena` | DOKONČENÁ | Dokončené objednávky | ✅ `dokoncenaAmount` |
| `zrusena` | ZRUŠENÁ | Zrušené objednávky | ❌ Není |
| `smazana` | SMAZANÁ | Smazané objednávky | ❌ Není |

**⚠️ KRITICKÉ:** 
- Všechna pole výše vrací **POUZE POČET** objednávek v daném stavu
- Samostatné částky pro tyto stavy **NEEXISTUJÍ** (kromě `dokoncena` → `dokoncenaAmount`)
- Pokud potřebuješ částku pro stav "ke_schvaleni", musíš načíst seznam objednávek přes `/api.eeo/order-v3/list` a částky si sečíst

---

### **Dodatečné filtry (počty):**

| Pole | Popis |
|------|-------|
| `withInvoices` | Objednávky s fakturami |
| `withAttachments` | Objednávky s přílohami |
| `withoutObjAttachments` | Objednávky BEZ příloh |
| `mimoradneUdalosti` | Mimořádné události |
| `mojeObjednavky` | Moje objednávky (kde jsem objednatel/garant/příkazce/schvalovatel) |
| `withComments` | Objednávky s komentáři (všemi) |
| `withMyComments` | Objednávky s mými komentáři |

---

## 🔒 5. OPRÁVNĚNÍ A BEZPEČNOST

### **Kdo vidí jaké objednávky?**

#### **ADMINISTRÁTOŘI** (role: `SUPERADMIN` nebo `ADMINISTRATOR`)
- ✅ Vidí **VŠECHNY** objednávky v systému
- ✅ Statistiky zahrnují kompletní přehled

#### **BĚŽNÍ UŽIVATELÉ**
- ✅ Vidí **POUZE VLASTNÍ** objednávky, kde jsou:
  - **Objednatel** (`objednatel_id`)
  - **Garant** (`garant_uzivatel_id`)
  - **Příkazce** (`prikazce_id`)
  - **Schvalovatel** (`schvalovatel_id`)
- ⚠️ Statistiky obsahují pouze jejich objednávky

### **Automatická kontrola oprávnění:**
API automaticky aplikuje oprávnění pomocí funkce `applyOrderV3UserPermissions()` - není potřeba nic speciálního posílat v requestu.

---

## ❌ 6. ERROR RESPONSE CODES

### **400 - Chybějící parametry**
```json
{
  "status": "error",
  "message": "Chybí token nebo username"
}
```

### **401 - Neplatný token**
```json
{
  "status": "error",
  "message": "Neplatný token"
}
```

### **500 - Chyba serveru**
```json
{
  "status": "error",
  "message": "Chyba při načítání statistik: ..."
}
```

---

## 📝 7. PŘÍKLADY POUŽITÍ

### **A) Všechny objednávky (bez omezení)**
```json
POST /api.eeo/order-v3/stats

{
  "token": "am1lbm8udXppdmF0ZWxlfDE3MTQwNTYwMDA=",
  "username": "jan.novak",
  "period": "all"
}
```

---

### **B) Jen letošní rok**
```json
POST /api.eeo/order-v3/stats

{
  "token": "am1lbm8udXppdmF0ZWxlfDE3MTQwNTYwMDA=",
  "username": "jan.novak",
  "period": "current-year"
}
```

---

### **C) Poslední měsíc (30 dní)**
```json
POST /api.eeo/order-v3/stats

{
  "token": "am1lbm8udXppdmF0ZWxlfDE3MTQwNTYwMDA=",
  "username": "jan.novak",
  "period": "last-month"
}
```

---

## 🔍 8. PŘÍKLADY KÓDU PRO MOBILNÍ APLIKACI

### **Swift (iOS)**
```swift
struct OrderStatsRequest: Codable {
    let token: String
    let username: String
    let period: String?
}

struct OrderStatsResponse: Codable {
    let status: String
    let data: OrderStats
    let message: String
    
    struct OrderStats: Codable {
        let total: Int
        let totalAmount: Double
        let rozpracovaneAmount: Double
        let dokoncenaAmount: Double
        
        let nove: Int
        let ke_schvaleni: Int
        let schvalena: Int
        let zamitnuta: Int
        let rozpracovana: Int
        let odeslana: Int
        let potvrzena: Int
        let k_uverejneni_do_registru: Int
        let uverejnena: Int
        let fakturace: Int
        let vecna_spravnost: Int
        let fakturace_prodleni: Int
        let zkontrolovana: Int
        let dokoncena: Int
        let zrusena: Int
        let smazana: Int
        
        let withInvoices: Int
        let withAttachments: Int
        let withoutObjAttachments: Int
        let mimoradneUdalosti: Int
        let mojeObjednavky: Int
        let withComments: Int
        let withMyComments: Int
    }
}

func getOrderStats(token: String, username: String, period: String = "all") async throws -> OrderStatsResponse {
    let url = URL(string: "https://erdms.zachranka.cz/api.eeo/order-v3/stats")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = OrderStatsRequest(token: token, username: username, period: period)
    request.httpBody = try JSONEncoder().encode(body)
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse else {
        throw APIError.invalidResponse
    }
    
    guard httpResponse.statusCode == 200 else {
        throw APIError.requestFailed(statusCode: httpResponse.statusCode)
    }
    
    return try JSONDecoder().decode(OrderStatsResponse.self, from: data)
}

// Použití:
let stats = try await getOrderStats(token: savedToken, username: savedUsername, period: "current-year")
print("Celkem objednávek: \(stats.data.total)")
print("Celková částka: \(stats.data.totalAmount.formatted(.currency(code: "CZK")))")
print("Nové: \(stats.data.nove), Ke schválení: \(stats.data.ke_schvaleni)")
print("Moje objednávky: \(stats.data.mojeObjednavky)")
```

---

### **Kotlin (Android)**
```kotlin
data class OrderStatsRequest(
    val token: String,
    val username: String,
    val period: String = "all"
)

data class OrderStatsResponse(
    val status: String,
    val data: OrderStats,
    val message: String
)

data class OrderStats(
    val total: Int,
    val totalAmount: Double,
    val rozpracovaneAmount: Double,
    val dokoncenaAmount: Double,
    
    val nove: Int,
    val ke_schvaleni: Int,
    val schvalena: Int,
    val zamitnuta: Int,
    val rozpracovana: Int,
    val odeslana: Int,
    val potvrzena: Int,
    val k_uverejneni_do_registru: Int,
    val uverejnena: Int,
    val fakturace: Int,
    val vecna_spravnost: Int,
    val fakturace_prodleni: Int,
    val zkontrolovana: Int,
    val dokoncena: Int,
    val zrusena: Int,
    val smazana: Int,
    
    val withInvoices: Int,
    val withAttachments: Int,
    val withoutObjAttachments: Int,
    val mimoradneUdalosti: Int,
    val mojeObjednavky: Int,
    val withComments: Int,
    val withMyComments: Int
)

suspend fun getOrderStats(token: String, username: String, period: String = "all"): OrderStatsResponse {
    val client = OkHttpClient()
    val gson = Gson()
    
    val requestBody = OrderStatsRequest(token, username, period)
    val json = gson.toJson(requestBody)
    
    val body = json.toRequestBody("application/json".toMediaType())
    
    val request = Request.Builder()
        .url("https://erdms.zachranka.cz/api.eeo/order-v3/stats")
        .post(body)
        .build()
    
    return withContext(Dispatchers.IO) {
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw IOException("Request failed: ${response.code}")
            }
            
            val responseBody = response.body?.string() ?: throw IOException("Empty response")
            gson.fromJson(responseBody, OrderStatsResponse::class.java)
        }
    }
}

// Použití:
val stats = getOrderStats(savedToken, savedUsername, "current-year")
Log.d("OrderStats", "Celkem objednávek: ${stats.data.total}")
Log.d("OrderStats", "Celková částka: ${stats.data.totalAmount} Kč")
Log.d("OrderStats", "Nové: ${stats.data.nove}, Ke schválení: ${stats.data.ke_schvaleni}")
Log.d("OrderStats", "Moje objednávky: ${stats.data.mojeObjednavky}")
```

---

### **JavaScript (React Native / Expo)**
```javascript
async function getOrderStats(token, username, period = 'all') {
  try {
    const requestBody = {
      token,
      username,
      period,
    };
    
    const response = await fetch('https://erdms.zachranka.cz/api.eeo/order-v3/stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('getOrderStats error:', error);
    throw error;
  }
}

// Použití:
const stats = await getOrderStats(savedToken, savedUsername, 'current-year');
console.log(`Celkem objednávek: ${stats.data.total}`);
console.log(`Celková částka: ${stats.data.totalAmount.toLocaleString('cs-CZ')} Kč`);
console.log(`Nové: ${stats.data.nove}, Ke schválení: ${stats.data.ke_schvaleni}`);
console.log(`Moje objednávky: ${stats.data.mojeObjednavky}`);

// Zobrazení na dashboardu:
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    loadStats();
  }, []);
  
  const loadStats = async () => {
    try {
      const data = await getOrderStats(savedToken, savedUsername, 'current-year');
      setStats(data.data);
    } catch (error) {
      console.error('Chyba při načítání statistik:', error);
    }
  };
  
  if (!stats) return <Text>Načítání...</Text>;
  
  return (
    <View>
      <Text>Celkem: {stats.total}</Text>
      <Text>Částka: {stats.totalAmount.toLocaleString('cs-CZ')} Kč</Text>
      <Text>Nové: {stats.nove}</Text>
      <Text>Ke schválení: {stats.ke_schvaleni}</Text>
      <Text>Moje objednávky: {stats.mojeObjednavky}</Text>
    </View>
  );
};❓ 9. ČASTO KLADENÉ OTÁZKY (FAQ)

### **Q1: Jak zjistím částku objednávek ve stavu "Ke schválení"?**
**A:** API endpoint `/api.eeo/order-v3/stats` nevrací částky pro jednotlivé stavy (kromě `dokoncenaAmount`). Máš 2 možnosti:

**Možnost 1 - Načíst seznam objednávek:**
```javascript
// Načti seznam objednávek s filtrem na stav "ke_schvaleni"
const response = await fetch('https://erdms.zachranka.cz/api.eeo/order-v3/list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: savedToken,
    username: savedUsername,
    filters: {
      stav: 'ke_schvaleni'  // nebo jiný stav
    }
  })
});
const orders = await response.json();

// Spočítej částku
const totalAmountKeSchvaleni = orders.data.orders.reduce((sum, order) => {
  return sum + (order.totalAmount || 0);
}, 0);
```

**Možnost 2 - Odhadnout z celkové částky:**
Víš, že:
- `totalAmount` = celková částka všech objednávek
- `rozpracovaneAmount` = částka stavů SCHVALENA, ROZPRACOVANA, ODESLANA, POTVRZENA, atd.
- `dokoncenaAmount` = částka dokončených

Můžeš odhadnout, že objednávky "ke_schvaleni" jsou zahrnuty v rozdílu.

---

### **Q2: Proč `total` neodpovídá součtu všech stavů?**
**A:** `total` je celkový počet objednávek a **MĚLO BY** odpovídat součtu všech stavů:
```javascript
const sum = stats.data.nove + stats.data.ke_schvaleni + stats.data.schvalena + 
            stats.data.rozpracovana + stats.data.odeslana + stats.data.potvrzena +
            stats.data.dokoncena + stats.data.zrusena + stats.data.smazana + ...;

// sum by mělo být rovno stats.data.total
```
Pokud neodpovídá, může to být kvůli:
- Objednávkám v jiných stavech (které nejsou v seznamu)
- Chybě v SQL query (kontaktuj support)

---

### **Q3: Co znamená `rozpracovaneAmount`?**
**A:** `rozpracovaneAmount` je **agregovaná částka** objednávek v těchto stavech:
- SCHVALENA
- ROZPRACOVANA
- ODESLANA
- POTVRZENA
- UVEREJNIT
- UVEREJNENA
- FAKTURACE
- VECNA_SPRAVNOST
- ZKONTROLOVANA
- CEKA_SE
- NEUVEREJNIT

**NENÍ to jen stav "ROZPRACOVANA"**, ale skupina více stavů!

---

### **Q4: Jak zobrazit celkovou částku objednávek na dashboardu?**
**A:** Použij `totalAmount`:
```javascript
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  
  // ... načtení dat ...
  
  return (
    <View>
      <Text style={styles.heading}>Přehled objednávek</Text>
      
      {/* CELKOVÝ POČET */}
      <Text>Celkem objednávek: {stats.total}</Text>
      
      {/* CELKOVÁ ČÁSTKA VŠECH OBJEDNÁVEK */}
      <Text>
       1. PŘÍKLAD DASHBOARD LAYOUT

### **Card Layout s částkami:**
```
┌──────────────────────────────────────────────┐
│ 📊 Přehled objednávek (Letošní rok)          │
├──────────────────────────────────────────────┤
│                                              │
│  📈 CELKEM                                   │
│  ├─ Počet: 150 objednávek                   │
│  └─ Částka: 2 500 000,50 Kč                 │
│                                              │
│  🔄 ROZPRACOVANÉ                             │
│  ├─ Počet: 120 objednávek                   │
│  └─ Částka: 1 800 000,00 Kč                 │
│                                              │
│  ✔️  DOKONČENÉ                               │
│  ├─ Počet: 12 objednávek                    │
│  └─ Částka: 700 000,50 Kč                   │
│                                              │
│  📊 DETAIL STAVŮ (pouze počty!)              │
│  ├─ 🆕 Nové: 10                              │
│  ├─ ✅ Ke schválení: 5                       │
│  ├─ 📤 Odeslané: 30                          │
│  ├─ ⚠️  V prodlení: 5                        │
│  └─ 👤 Moje objednávky: 85                   │
│                                              │
└──────────────────────────────────────────────┘
```

**⚠️ PO2NÁMKA:** Částky máš pouze pro `total`, `rozpracovane` a `dokoncena`. Pro ostatní stavy zobrazuj jen počty!šechny objednávky (nebo podle období)
- S automatickým filtrováním podle oprávnění (admin vidí vše, běžný uživatel jen své)

Pokud potřebuješ filtrovat podle dodavatele, použij `/api.eeo/order-v3/list` s filtry.

---

## 💡 10
```

---

## 💡 9. TIPY A BEST PRACTICES

### **1. Cachování:**
```javascript
// Cache statistiky na 5 minut
const CACHE_DURATION = 5 * 60 * 1000; // 5 minut
let cachedStats = null;
let cacheTime = 0;

async function getOrderStatsWithCache(token, username, period = 'all') {
  const now = Date.now();
  if (cachedStats && (now - cacheTime) < CACHE_DURATION) {
    return cachedStats;
  }
  
  const stats = await getOrderStats(token, username, period);
  cachedStats = stats;
  cacheTime = now;
  return stats;
}
```

### **2. Zobrazení na dashboardu:**
- Použij **pie chart** pro rozdělení stavů (nove, ke_schvaleni, dokoncena, atd.)
- Použij **bar chart** pro částky (totalAmount, rozpracovaneAmount, dokoncenaAmount)
- Zvýrazni **fakturace_prodleni** (objednávky v prodlení) červenou barvou
- Zobraz počet **mojeObjednavky** jako první metriku

### **3. Filtrování podle období:**
```javascript
// Vytvoř picker pro výběr období
const periods = [
  { label: 'Vše', value: 'all' },
  { label: 'Letošní rok', value: 'current-year' },
  { label: 'Aktuální měsíc', value: 'current-month' },
  { label: 'Posledních 30 dní', value: 'last-month' },
  { label: 'Poslední kvartál', value: 'last-quarter' },
];
```

### **4. Formátování částek:**
```javascript
// Vždy formátuj částky s měnou
const formattedAmount = stats.data.totalAmount.toLocaleString('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
// Výstup: "2 500 000,50 Kč"
```

### **5. Error handling:**
```javascript
try {
  const stats = await getOrderStats(token, username, period);
  setStats(stats.data);
} catch (error) {
  if (error.message.includes('401')) {
    // Token expiroval - redirect na login
    navigation.navigate('Login');
  } else {
    // Zobraz error message
    Alert.alert('Chyba', 'Nepodařilo se načíst statistiky');
  }
}
```

### **6. Pull-to-refresh:**
```javascript
const [refreshing, setRefreshing] = useState(false);

const onRefresh = async () => {
  setRefreshing(true);
  try {
    const stats = await getOrderStats(token, username, period);
    setStats(stats.data);
  } catch (error) {
    console.error(error);
  } finally {
    setRefreshing(false);
  }
};
```

---

## 📊 10. PŘÍKLAD DASHBOARD LAYOUT

### **Card Layout:**
```
┌─────────────────────────────────────┐
│ 📊 Přehled objednávek (Letošní rok) │
├─────────────────────────────────────┤
│                                     │
│  Celkem: 150                        │
│  Částka: 2 500 000,50 Kč            │
│                                     │
│  🆕 Nové: 10                        │
│  ✅ Ke schválení: 5                 │
│  🔄 Rozpracované: 15                │
│  📤 Odeslané: 30                    │
│  ✔️  Dokončené: 12                  │
│                                     │
│  👤 Moje objednávky: 85             │
│  ⚠️  V prodlení: 5                  │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔗 13. 11. SOUVISEJÍCÍ ENDPOINTY

- **Login:** `/api.eeo/login` - viz [MOBILE_API_LOGIN_DOCUMENTATION.md](MOBILE_API_LOGIN_DOCUMENTATION.md)
- **User Detail:** `/api.eeo/user/detail` - viz [MOBILE_API_USER_DETAIL_DOCUMENTATION.md](MOBILE_API_USER_DETAIL_DOCUMENTATION.md)
- **Order List:** `/api.eeo/order-v3/list` - Seznam objednávek s detaily
- **Order Items:** `/api.eeo/order-v3/items` - Detail položek objednávky

---

## 📞 KONTAKT A PODPORA

Pokud narazíš na problém nebo potřebuješ help s integrací:
- Dokumentace: `/var/www/erdms-dev/apps/eeo-v2/mobilni_app_doc/`
- API verze: `v2025.03_25`
- Support: Kontaktuj vývojový tým

---

**Vytvořeno:** 25. dubna 2026  
**Verze dokumentace:** 1.0  
**API Verze:** 2.40  
**Endpoint:** `/api.eeo/order-v3/stats`
