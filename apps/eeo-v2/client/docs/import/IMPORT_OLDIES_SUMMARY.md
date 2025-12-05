# ✅ IMPORT STARÝCH OBJEDNÁVEK - DOKONČENO

**Datum:** 2025-10-16  
**Status:** ✅ PŘIPRAVENO K POUŽITÍ

---

## 🎯 CO BYLO VYTVOŘENO

### 1️⃣ **Backend API** (`v2025.03_25/lib/importHandlers.php`)
✅ Kompletní PHP 5.6 kompatibilní handler pro import  
✅ 10 funkcí pro celý proces importu  
✅ Bezpečnost: Prepared statements, validace, transakce  
✅ Pouze SELECT ze starých tabulek (ŽÁDNÉ INSERT/UPDATE/DELETE)

### 2️⃣ **API Endpoint** (`api.php`)
✅ `POST /orders25/import-oldies`  
✅ Připojeno k routing systému  
✅ Error handling s HTTP status kódy

### 3️⃣ **Dokumentace**
✅ `IMPORT_OLDIES_API_DOCUMENTATION.md` - Kompletní API dokumentace  
✅ `IMPORT_OLDIES_README.md` - Implementační průvodce  
✅ Mapovací tabulky pro všechna pole

### 4️⃣ **Testování**
✅ `testy/test_import_oldies.php` - Test script  
✅ Test extrakce LP kódů  
✅ Test mapování druhů smluv

---

## 📡 JAK TO POUŽÍT

### **Frontend Request:**
```javascript
const response = await fetch('/api.eeo/orders25/import-oldies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    old_order_ids: [1, 25, 33, 34],
    uzivatel_id: 5,
    tabulka_obj: 'DEMO_objednavky_2025',
    tabulka_opriloh: 'DEMO_pripojene_odokumenty'
  })
});

const result = await response.json();
console.log(`Imported: ${result.imported_count}, Failed: ${result.failed_count}`);
```

### **Response:**
```json
{
  "success": true,
  "imported_count": 3,
  "failed_count": 1,
  "results": [
    {
      "old_id": 1,
      "new_id": 156,
      "cislo_objednavky": "O-2024/001",
      "polozky_count": 1,
      "prilohy_count": 2,
      "status": "OK"
    }
  ]
}
```

---

## 🔄 CO SE DĚJE PŘI IMPORTU

```
Pro každou objednávku:
  1. Načte data ze staré DB (SELECT) ✅
  2. Zkontroluje duplicity ✅
  3. BEGIN TRANSACTION ✅
  4. Vloží do 25a_objednavky ✅
     - predmet = "Importovaná obj. ev.č. O-xxx/xxx"
     - financovani = LP kód z poznámky (regex)
     - druh_objednavky_kod = mapování (AUTA, ENERGIE, ...)
     - všechny user_id = z parametru API
  5. Vloží položku do 25a_objednavky_polozky ✅
     - popis = původní obsah
     - cena = s výpočtem DPH
  6. Vloží přílohy do 25a_objednavky_prilohy ✅
     - guid = automaticky vygenerován
     - systemova_cesta = /var/www/eeo/evidence_smluv/prilohy/...
  7. COMMIT ✅
```

---

## 📊 MAPOVÁNÍ - KLÍČOVÉ BODY

| Pole | Hodnota |
|------|---------|
| `predmet` | "Importovaná obj. ev.č. " + evidencni_c |
| `financovani` | LP kód extrahovaný z poznámky (např. "LPPT02") |
| `druh_objednavky_kod` | Mapováno (1→AUTA, 5→KUPNI, 10→O_DILO, ...) |
| `stav_workflow_kod` | `'["SCHVALENA","ODESLANA","POTVRZENA"]'` |
| `stav_objednavky` | `'ARCHIVOVANO'` |
| `uzivatel_id` | Z parametru API |
| `objednatel_id` | Z parametru API |
| `garant_uzivatel_id` | Z parametru API |
| `dt_vytvoreni` | **Zachováno z dt_pridani** (původní datum) |
| `dt_aktualizace` | **NOW()** (čas importu) |

---

## 🛡️ BEZPEČNOST

✅ **Prepared Statements** - ochrana proti SQL injection  
✅ **Transakce** - ROLLBACK při chybě, COMMIT při úspěchu  
✅ **Validace** - kontrola existence uživatele, duplicit  
✅ **Read-only ze staré DB** - pouze SELECT, žádné zápisy  
✅ **Error Handling** - každá objednávka v separátní transakci

---

## 📝 DŮLEŽITÉ POZNÁMKY

1. ⚠️ **Staré tabulky:** API **NIKDY** nezapisuje do starých tabulek
2. 📁 **Soubory:** Fyzické soubory se **NEKOPÍRUJÍ**, jen cesta do DB
3. 🔄 **Duplicity:** Kontroluje se `cislo_objednavky` - duplikáty se přeskočí
4. 👤 **Uživatelé:** Všechna `*_id` uživatelů = `uzivatel_id` z API
5. 📅 **Datum:** `dt_vytvoreni` zachováno, `dt_aktualizace` = NOW()

---

## 🧪 TESTOVÁNÍ

```bash
# Spuštění testu
php testy/test_import_oldies.php

# Nebo cURL
curl -X POST http://localhost/api.eeo/orders25/import-oldies \
  -H "Content-Type: application/json" \
  -d '{"old_order_ids":[1,2,3],"uzivatel_id":1,"tabulka_obj":"DEMO_objednavky_2025","tabulka_opriloh":"DEMO_pripojene_odokumenty"}'
```

---

## 📚 DOKUMENTACE

| Soubor | Popis |
|--------|-------|
| `IMPORT_OLDIES_API_DOCUMENTATION.md` | Kompletní API dokumentace |
| `IMPORT_OLDIES_README.md` | Implementační průvodce |
| `IMPORT_OLDIES_SUMMARY.md` | Tento soubor (shrnutí) |

---

## 🎉 READY TO USE!

Vše je připraveno k použití. Frontend může začít posílat požadavky na import.

**Kontakt při problémech:** Zkontroluj error logy v response JSON.

---

**Verze:** 1.0  
**Kompatibilita:** PHP 5.6, MySQL 5.5.43  
**Autor:** AI Assistant  
**Datum:** 16. října 2025
