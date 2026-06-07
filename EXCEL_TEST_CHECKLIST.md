# 🚀 KLÁRA - TESTUJ TO!

## Co se právě změnilo

### Backend změny:
1. ✅ **401 Auth Required** - Endpoint NOW REQUIRES authentication
   - Bez username/password → vracet 401 HNED
   - Bez čekání na načítání DB (rychleji)

2. ✅ **www-authenticate header** - Nový header pro Power Query
   ```
   www-authenticate: Basic realm="ERDMS API"
   ```
   - Excel by měl vidět dialog s tímto

3. ✅ **Query string support** - Fallback metoda
   - `?username=admin&password=test123` funguje
   - Testováno s curl - WORKS ✅

---

## 🎯 CO MÁŠ UDĚLAT

### Test 1 - Curl (command line) - OVĚŘENÍ ✅
```bash
curl -i -X GET "https://erdms.zachranka.cz/dev/api.eeo/order-v3/list?username=admin&password=test123"
```
**Výsledek:** Měl by vrátit JSON s objednávkami (status 200)

### Test 2 - Excel Power Query Wizard
1. Otevřít Excel
2. Data → Get Data → From Web
3. Zadat URL: `https://erdms.zachranka.cz/dev/api.eeo/order-v3/list`
4. **Měl by se ZOBRAZIT DIALOG s výzvou k autentizaci** ← TO JE DŮLEŽITÉ!
5. Zadat: username=admin, password=test123
6. Pokud klikneš "Připojit" → měl by se načíst JSON s objednávkami

### Test 3 - Excel M-Code (pokud Test 2 nefunguje)
1. V Power Query Editor: "Advanced Editor"
2. Zkopírovat do:
```m
let
  Source = Json.Document(
    Web.Contents(
      "https://erdms.zachranka.cz/dev/api.eeo/order-v3/list?username=admin&password=test123",
      [Headers = [#"Content-Type" = "application/json"]]
    )
  ),
  Orders = Source[data][orders]
in
  Orders
```
3. "Done" → měl by se načíst JSON

---

## 📋 REPORT - PAK MI NAPIŠ

```
EXCEL TEST REPORT
=================

Test 1 (curl):
- [ ] Vrátí 200 OK
- [ ] JSON obsahuje objednávky
- [ ] Počet: 1421 záznamů (dev DB)

Test 2 (Excel Dialog):
- [ ] DIALOG se ZOBRAZIL - YES / NO
- [ ] Po zadání hesla se načetl JSON - YES / NO
- [ ] Počet řádků: _____ 

Test 3 (M-Code):
- [ ] Code se spustil - YES / NO
- [ ] Načetl data - YES / NO
- [ ] Počet řádků: _____

POZNÁMKY:
[tvá poznámka tady]
```

---

## ⚠️ POKUD DIALOG NEFUNGUJE

### Příčina: Excel nevidí www-authenticate header
**Řešení:** Použij Test 3 (M-Code) s query string

---

## 🔑 Přihlašovací údaje TEST

- **Username:** admin
- **Password:** test123
- **URL:** https://erdms.zachranka.cz/dev/api.eeo/order-v3/list

> ⚠️ ZMĚNIT NA PRODUKČNÍ HESLO, než nasadíš do produkce!

---

**Deadline:** Až si to otestuj  
**Kontakt:** Dostupný pro debugging  
**Status:** READY FOR TESTING ✅
