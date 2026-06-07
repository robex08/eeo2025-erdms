# 📊 Excel Power Query - Objednávky z ERDMS

## ✅ HOTOVO A OVĚŘENO

Backend je nyní nastavený pro Excel Power Query s autentizací přes:
- **Metoda 1:** Basic Auth dialog (doporučeno)
- **Metoda 2:** Query string v URL (fallback)

---

## 🎯 VARIANTA 1 - EXCEL POWER QUERY WIZARD (DOPORUČENO)

### Krok 1: Otevřete Excel
- Nový workbook nebo existující

### Krok 2: Otevřete Power Query
```
Excel 2016/365:
- Ribbon "Data"
- Tlačítko "Get Data" (nebo "Nový dotaz")
- "From Other Sources" → "From Web" (Z webu)

Excel 2013:
- Ribbon "Power Query"
- "From Web"
```

### Krok 3: Zadejte URL
```
https://erdms.zachranka.cz/dev/api.eeo/order-v3/list
```

### Krok 4: Autentizace
Když se otevře dialog "Web content":
- **Vyberte:** "Basic"
- **Username:** admin (nebo jiný uživatel)
- **Password:** vaše heslo
- Klikněte: "Připojit" (Connect)

> ℹ️ Excel pošle 401 bezpečnostní požadavek → system vám nabídne dialog → zadáte heslo

### Krok 5: Power Query Editor
Excel načte JSON a otevře Query Editor:
1. Vyberte `data` → dvojklik na rozšíření
2. Vyberte `orders` → dvojklik na rozšíření
3. Klikněte "To Table"
4. Excel vytvoří tabulku ze všech order záznamů

### Krok 6: Formátování
- Odstraňte zbytečné sloupce
- Naformátujte čísla (ceny)
- Naformátujte data (dt_objednavky, atd.)

### Krok 7: Načtěte do listu
- Ribbon "Home"
- Tlačítko "Close & Load" (Zavřít a načíst)
- Vyberte "Load To..." a umístěte tabulku

---

## 🎯 VARIANTA 2 - CUSTOM M-CODE (POKUD DIALOG NEFUNGUJE)

### Řešení: Upravte query přímou URL s query string

1. **Otevřete Power Query Editor**
   - Data → Get Data → From Web
   - Zadejte URL: `https://erdms.zachranka.cz/dev/api.eeo/order-v3/list`
   - Výsledek: 401 Basic Auth required

2. **Upravte v M-Code editoru**
   - Ribbon "Home" → "Advanced Editor"
   - Nahraďte celý obsah:

```m
let
  // Krok 1: Fetch JSON s query string credentials
  Source = Json.Document(
    Web.Contents(
      "https://erdms.zachranka.cz/dev/api.eeo/order-v3/list?username=admin&password=test123",
      [
        Headers = [#"Content-Type" = "application/json"],
        Timeout = #duration(0, 0, 30, 0)
      ]
    )
  ),
  
  // Krok 2: Extrahuj data.orders pole
  Data = Source[data],
  Orders = Data[orders],
  
  // Krok 3: Převeď na tabulku
  OrderTable = Table.FromList(
    Orders,
    Splitter.SplitByNothing(),
    null,
    null,
    ExtraValues.Error
  ),
  
  // Krok 4: Rozbaľ záznam na sloupce
  Expanded = Table.ExpandRecordColumn(
    OrderTable,
    "Column1",
    Table.ColumnNames(OrderTable[Column1]{0})
  )
in
  Expanded
```

3. **Vyměňte credentials**
   ```
   ?username=admin&password=test123
   ```
   Změní se vaše heslo!

---

## 📊 Response JSON struktura

```json
{
  "status": "success",
  "data": {
    "orders": [
      {
        "id": 1532,
        "cislo_objednavky": "O-1520/75030926/2026/PTN",
        "status": "rozpracovana",
        "cast_cena": 1234567.89,
        "vytvorena_dat": "2026-04-15T10:30:00",
        ...20+ sloupců...
      },
      ... (50 per stránku, 1421 celkem v dev DB)
    ],
    "pagination": {
      "page": 1,
      "per_page": 50,
      "total": 1421,
      "total_pages": 29
    },
    "stats": {
      "total": 1421,
      "nove": 0,
      "rozpracovane": 1000,
      "dokoncena": 421
    }
  }
}
```

---

## 🔧 Parametry API - Query String

```
?page=2&per_page=100&filters=status:rozpracovana&sort=-cast_cena
```

### Dostupné parametry:
- `page` - stránka (default: 1)
- `per_page` - záznamů na stránku (default: 50, max: 500)
- `filters` - filtrování (JSON string)
- `sort` - řazení (pole; `-` = DESC)

---

## 🔐 Bezpečnost

### ✅ Implementace:
- bcrypt hesla (PASSWORD_BCRYPT cost=10)
- Token-based auth s timestampem
- SQL injection prevence (prepared statements)
- HTTPS only (self-signed dev cert)

### ⚠️ Query string rizika:
- Heslo viditelné v:
  - Browser historii
  - Server logů
  - Proxy logů
- **Řešení:** Pokud je to problem, návrh custom endpoint bez query string (ale vyžaduje vývoj)

---

## 🧪 Testování - Příkazová řádka

### curl - Query String
```bash
curl -i -X GET \
  "https://erdms.zachranka.cz/dev/api.eeo/order-v3/list?username=admin&password=test123"
```

### curl - Body JSON
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"test123"}' \
  "https://erdms.zachranka.cz/dev/api.eeo/order-v3/list"
```

### PowerShell
```powershell
$uri = "https://erdms.zachranka.cz/dev/api.eeo/order-v3/list"
$body = @{
    username = "admin"
    password = "test123"
} | ConvertTo-Json

$response = Invoke-WebRequest `
    -Uri $uri `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -SkipCertificateCheck

$orders = $response.Content | ConvertFrom-Json | Select -ExpandProperty data | Select -ExpandProperty orders
$orders | Format-Table
```

---

## ✅ Checklist

- [x] Endpoint `/order-v3/list` funguje
- [x] Autentizace (verify_basic_auth) ověřena
- [x] Token generování funguje
- [x] 401 + WWW-Authenticate header se vrací
- [x] Query string auth funguje (test s curl)
- [ ] **Excel Power Query test (V POKROKU)** ← VAŠE ÚLOHA
- [ ] Produkční hesla nastavena
- [ ] Git commit

---

## 📝 Technické detaily

### Endpoint:
- **URL:** https://erdms.zachranka.cz/dev/api.eeo/order-v3/list
- **Metoda:** POST nebo GET
- **Autentizace:** Basic Auth (username:password)
- **Timeout:** 30 sekund (kvůli DB queries)

### Database:
- **Host:** 10.3.172.11 (MariaDB 11.8.3)
- **DB:** EEO-OSTRA-DEV
- **Tabulka:** 25_uzivatele
- **Hash:** password_hash (bcrypt)

### Test uživatel:
- **Username:** admin
- **Password:** test123 (nastaven pro dev testování)

---

## 🚀 Následující kroky

1. **Klára testuje v Excelu**
   - Otevře Excel
   - Data → From Web
   - Zadá URL
   - Otestuje autentizaci (měl by vidět dialog)

2. **Hlášení výsledků**
   - ✅ Pokud se zobrazil dialog → SUPER!
   - ❌ Pokud se neobjevil dialog → zkusíme Varianta 2 (M-code)

3. **Finalizace**
   - Nastavení produkčních hesel
   - Dokumentace pro uživatele
   - Nasazení do produkce

---

**Vytvořeno:** 2026-06-07 11:35 UTC  
**Status:** ✅ Backend HOTOV, čeká se na Excel test  
**Kontakt:** Dostupný pro debugging
