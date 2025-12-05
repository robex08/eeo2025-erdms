# Import Starých Objednávek - Implementace

**Datum:** 2025-10-16  
**Verze:** 1.0  
**PHP:** 5.6  
**MySQL:** 5.5.43

---

## 📋 SHRNUTÍ

Byl vytvořen kompletní systém pro import starých objednávek z DEMO tabulek do nové struktury `25a_objednavky`.

---

## 📂 VYTVOŘENÉ SOUBORY

### 1. **Import Handlers** (`v2025.03_25/lib/importHandlers.php`)
Obsahuje všechny funkce pro import:
- ✅ `extractLPKod()` - Extrakce LP kódu z poznámky (regex)
- ✅ `mapDruhSmlouvyKod()` - Mapování druhů smluv
- ✅ `checkUserExists()` - Kontrola existence uživatele
- ✅ `checkOrderExists()` - Kontrola duplicit
- ✅ `loadOldOrder()` - Načtení staré objednávky (SELECT only)
- ✅ `loadOldAttachments()` - Načtení příloh (SELECT only)
- ✅ `insertImportedOrder()` - Vložení objednávky do 25a_objednavky
- ✅ `insertImportedOrderItem()` - Vložení položky
- ✅ `insertImportedAttachments()` - Vložení příloh
- ✅ `handle_orders25_import_oldies()` - Hlavní handler

### 2. **API Endpoint** (`api.php`)
- ✅ Přidán endpoint: `POST /orders25/import-oldies`
- ✅ Přidán require pro `importHandlers.php`

### 3. **Dokumentace** (`IMPORT_OLDIES_API_DOCUMENTATION.md`)
Kompletní dokumentace včetně:
- Popis endpointu
- Input/Output formáty
- Mapování dat
- Error handling
- Příklady použití

### 4. **Test Script** (`testy/test_import_oldies.php`)
Testovací skript pro:
- Test API volání
- Test extrakce LP kódů
- Test mapování druhů smluv

---

## 🔄 WORKFLOW IMPORTU

```
1. Frontend pošle JSON s parametry:
   - old_order_ids: [1, 25, 33]
   - uzivatel_id: 5
   - tabulka_obj: "DEMO_objednavky_2025"
   - tabulka_opriloh: "DEMO_pripojene_odokumenty"

2. Backend pro každé ID:
   a) Načte objednávku ze staré DB (SELECT)
   b) Zkontroluje duplicitu
   c) BEGIN TRANSACTION
   d) Vloží do 25a_objednavky
   e) Vloží položku do 25a_objednavky_polozky
   f) Načte a vloží přílohy
   g) COMMIT
   
3. Vrátí JSON s detailem pro každou objednávku
```

---

## 📊 MAPOVÁNÍ DAT

### **Hlavní transformace:**

| Co | Jak |
|----|-----|
| `predmet` | "Importovaná obj. ev.č. " + evidencni_c |
| `financovani` | extractLPKod(poznamka) - regex LP kód |
| `druh_objednavky_kod` | Mapování dle druh_sml_id (1→AUTA, 2→DAROVACI, ...) |
| `stav_workflow_kod` | '["SCHVALENA","ODESLANA","POTVRZENA"]' (fixní) |
| `stav_objednavky` | 'ARCHIVOVANO' (fixní) |
| Všechna `*_id` uživatelů | uzivatel_id z API parametru |
| `dt_vytvoreni` | Zachováno z dt_pridani (původní datum) |
| `dt_aktualizace` | NOW() (čas importu) |
| `cesta_souboru` příloh | '/var/www/eeo/evidence_smluv/prilohy/' + soubor |

### **Položka:**
- Ze starého `obsah` (TEXT) a `cena` (DOUBLE) se vytvoří jedna položka
- Automatický výpočet DPH (předpokládá se cena s DPH, sazba 21%)

### **Přílohy:**
- Zachován původní `dt_pridani`
- `uzivatel_id` = z API parametru
- Fyzické soubory se **nekopírují**, jen se vytvoří záznam

---

## 🚨 BEZPEČNOST A VALIDACE

✅ **Co endpoint dělá:**
- Kontrola existence uživatele
- Kontrola duplicit (dle cislo_objednavky)
- Prepared statements (ochrana SQL injection)
- Transakce pro každou objednávku (ROLLBACK při chybě)

✅ **Co endpoint NEDĚLÁ:**
- **NIKDY** nezapisuje do starých tabulek (pouze SELECT)
- **NEKOPÍRUJE** fyzické soubory příloh
- Nezapisuje při chybě validace

---

## 📝 DŮLEŽITÉ KONSTANTY

```php
// Výchozí hodnoty pro import
strediska_kod = '[]'
stav_workflow_kod = '["SCHVALENA","ODESLANA","POTVRZENA"]'
stav_objednavky = 'ARCHIVOVANO'
dt_zamek = '1970-01-01 00:00:00'
aktivni = 1
sazba_dph = 21  (při vytváření položky)
```

---

## 🧪 TESTOVÁNÍ

### Spustit test:
```bash
php testy/test_import_oldies.php
```

### Nebo přes cURL:
```bash
curl -X POST http://localhost/api.eeo/orders25/import-oldies \
  -H "Content-Type: application/json" \
  -d '{
    "old_order_ids": [1, 2, 3],
    "uzivatel_id": 1,
    "tabulka_obj": "DEMO_objednavky_2025",
    "tabulka_opriloh": "DEMO_pripojene_odokumenty"
  }'
```

---

## 📖 PŘÍKLADY VÝSTUPU

### Úspěšný import:
```json
{
  "success": true,
  "imported_count": 3,
  "failed_count": 0,
  "results": [
    {
      "old_id": 1,
      "new_id": 156,
      "cislo_objednavky": "O-2024/001",
      "polozky_count": 1,
      "prilohy_count": 2,
      "status": "OK",
      "error": null
    }
  ]
}
```

### S chybami:
```json
{
  "success": true,
  "imported_count": 2,
  "failed_count": 1,
  "results": [
    {
      "old_id": 25,
      "new_id": null,
      "cislo_objednavky": "O-2024/025",
      "status": "ERROR",
      "error": "Objednávka s číslem O-2024/025 již existuje"
    }
  ]
}
```

---

## 🔗 SOUVISEJÍCÍ SOUBORY

- `v2025.03_25/lib/importHandlers.php` - Import funkce
- `api.php` - API routing
- `IMPORT_OLDIES_API_DOCUMENTATION.md` - Kompletní dokumentace
- `testy/test_import_oldies.php` - Testovací script

---

## ✅ KONTROLNÍ SEZNAM

- [x] Import handlers vytvořeny (PHP 5.6 compatible)
- [x] Endpoint přidán do api.php
- [x] Dokumentace vytvořena
- [x] Testovací script vytvořen
- [x] Mapování druhů smluv (29 typů)
- [x] Extrakce LP kódu (regex)
- [x] Kontrola duplicit
- [x] Transakce pro každou objednávku
- [x] Pouze SELECT ze starých tabulek
- [x] Error handling
- [x] Validace vstupů

---

## 🎯 JAK TO POUŽÍT Z FRONTENDU

```javascript
// Example React/JS
const importOldOrders = async (orderIds, userId) => {
  try {
    const response = await fetch('http://localhost/api.eeo/orders25/import-oldies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        old_order_ids: orderIds,
        uzivatel_id: userId,
        tabulka_obj: 'DEMO_objednavky_2025',
        tabulka_opriloh: 'DEMO_pripojene_odokumenty'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Importováno: ${result.imported_count}`);
      console.log(`❌ Selhalo: ${result.failed_count}`);
      
      // Zpracování výsledků
      result.results.forEach(item => {
        if (item.status === 'OK') {
          console.log(`✅ ${item.cislo_objednavky} → ID ${item.new_id}`);
        } else {
          console.error(`❌ ${item.cislo_objednavky}: ${item.error}`);
        }
      });
    }
  } catch (error) {
    console.error('Chyba při importu:', error);
  }
};

// Použití
importOldOrders([1, 25, 33], 5);
```

---

## 💡 POZNÁMKY PRO FRONTEND DEVELOPERA

1. **Parametry jsou povinné:** Všechny parametry kromě `database` musí být vyplněny
2. **Pole ID:** `old_order_ids` musí být array čísel
3. **Duplicity:** Pokud objednávka s daným číslem už existuje, přeskočí se
4. **Transakce:** Každá objednávka je v separátní transakci - jedna chyba nerozbije ostatní
5. **Uživatel:** Musí existovat v tabulce `25_uzivatele`, jinak celý import selže

---

**🎉 Import API je připraveno k použití!**
