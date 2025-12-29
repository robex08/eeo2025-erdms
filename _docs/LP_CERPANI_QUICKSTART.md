# LP Čerpání na Fakturách - QUICKSTART

## 🎯 Co to je?

Nový systém pro sledování skutečného čerpání Limitovaných příslibů (LP) na úrovni faktur.

**Před:** LP měly pouze plánované čerpání na položkách objednávky  
**Teď:** Při potvrzení věcné správnosti faktury se rozdělí částka mezi LP kódy

---

## 🚀 Rychlý Start (5 min)

### 1. Kontrola DB změn

```sql
-- Kontrola tabulky
SHOW CREATE TABLE 25a_faktury_lp_cerpani;

-- Kontrola stored procedure
SHOW CREATE PROCEDURE sp_prepocet_lp_cerpani_faktury;

-- Testovací dotaz
SELECT * FROM 25a_faktury_lp_cerpani LIMIT 5;
```

### 2. Test API (Postman / curl)

**Uložení LP čerpání:**
```bash
curl -X POST http://localhost/api/faktury/lp-cerpani/save \
  -H "X-Auth-Token: YOUR_TOKEN" \
  -H "X-Username: testuser" \
  -H "Content-Type: application/json" \
  -d '{
    "faktura_id": 182,
    "lp_cerpani": [
      {"lp_cislo": "6", "castka": 15000, "poznamka": "Test"}
    ]
  }'
```

**Načtení LP čerpání:**
```bash
curl -X POST http://localhost/api/faktury/lp-cerpani/get \
  -H "X-Auth-Token: YOUR_TOKEN" \
  -H "X-Username: testuser" \
  -H "Content-Type: application/json" \
  -d '{"faktura_id": 182}'
```

### 3. Test UI (Frontend)

1. Vytvoř objednávku s financováním: `{"typ":"LP","lp_kody":["6"]}`
2. Přidej fakturu k objednávce (částka např. 50000 Kč)
3. Otevři formulář faktury → **LP editor se zobrazí automaticky**
4. Pokud je pouze 1 LP kód → **auto-fill s plnou částkou**
5. Potvrď věcnou správnost → **LP čerpání se uloží**

---

## 📋 Klíčové Body

### **Kdy se LP editor zobrazuje?**
- ✅ Objednávka má `financovani.typ = "LP"`
- ✅ V sekci "Věcná správnost faktury"
- ✅ Před checkboxem "Potvrzuji věcnou správnost"

### **Auto-fill pravidla:**
- Jediný LP kód → **automaticky vyplní s fa_castka**
- Více LP kódů → **prázdný editor, uživatel rozděluje**

### **Validace:**
- ❌ **BLOKUJE:** Suma > fa_castka
- ❌ **BLOKUJE:** Prázdné LP pro LP financování
- ℹ️ **INFO:** Suma < fa_castka (uživatel má svobodu)

### **Kdy se ukládá:**
1. Potvrzení věcné správnosti (UPDATE)
2. Vytvoření nové faktury (CREATE)
3. Úprava faktury (UPDATE)

### **Přepočet skutečného čerpání:**
```sql
-- Automaticky po save, nebo manuálně:
CALL sp_prepocet_lp_cerpani_faktury('6');

-- Kontrola výsledku:
SELECT lp.lp_cislo, lpc.skutecne_cerpano 
FROM 25_limitovane_prisliby lp
INNER JOIN 25_limitovane_prisliby_cerpani lpc ON lpc.lp_id = lp.id
WHERE lp.lp_cislo = '6';
```

---

## 🔍 Debugging

### **LP editor se nezobrazuje:**
1. Kontrola financování: `SELECT financovani FROM 25a_objednavky WHERE id = X;`
   - Musí obsahovat `{"typ":"LP","lp_kody":["6"]}`
2. Kontrola console: `financovani.typ === 'LP'`
3. Kontrola import: `LPCerpaniEditor` musí být importován

### **LP čerpání se neuloží:**
1. Kontrola API response (Network tab):
   - Status 200? 
   - Error message?
2. Kontrola backend log:
   ```bash
   tail -f /var/log/apache2/error.log | grep "LP"
   ```
3. Kontrola DB:
   ```sql
   SELECT * FROM 25a_faktury_lp_cerpani WHERE faktura_id = X;
   ```

### **skutecne_cerpano se neaktualizuje:**
1. Zkontroluj, že stored procedure existuje:
   ```sql
   SHOW PROCEDURE STATUS WHERE Db = 'eeo2025-dev';
   ```
2. Spusť manuálně:
   ```sql
   CALL sp_prepocet_lp_cerpani_faktury('[lp_cislo]');
   ```
3. Kontrola FK:
   ```sql
   SELECT * FROM 25_limitovane_prisliby WHERE lp_cislo = '6';
   SELECT * FROM 25_limitovane_prisliby_cerpani WHERE lp_id = [id_z_predchozi];
   ```

---

## 📂 Důležité Soubory

### **Backend:**
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/fakturyLpCerpaniHandlers.php`
- `apps/eeo-v2/api-legacy/api.eeo/api.php` (endpointy)

### **Frontend:**
- `apps/eeo-v2/client/src/components/invoices/LPCerpaniEditor.js` (editor)
- `apps/eeo-v2/client/src/services/apiFakturyLPCerpani.js` (API calls)
- `apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js` (integrace)

### **Database:**
- `_docs/database-migrations/2025-12-29_create_faktury_lp_cerpani.sql`
- `_docs/database-migrations/2025-12-29_create_sp_prepocet_lp_cerpani_faktury.sql`

### **Dokumentace:**
- `_docs/PLAN_LP_CERPANI_NA_FAKTURACH.md` (kompletní spec)
- `_docs/CHANGELOG_LP_CERPANI_NA_FAKTURACH.md` (changelog)

---

## 🎨 UI Komponenty

### **LPCerpaniEditor Props:**
```javascript
<LPCerpaniEditor
  faktura={formData}           // Objekt faktury s fa_castka
  orderData={orderData}        // Objekt objednávky s financovani
  lpCerpani={lpCerpani}        // Array LP čerpání [{lp_cislo, castka, poznamka}]
  onChange={setLpCerpani}      // Callback pro změny
  disabled={isDisabled}        // Boolean pro read-only režim
/>
```

### **Styled Components:**
- `EditorContainer` - wrapper s border
- `EditorHeader` - nadpis s ikonou
- `ValidationMessage` - chybové/info zprávy
- `RowContainer` - řádek pro 1 LP
- `AddButton` - tlačítko + Add
- `Summary` - souhrn částek

---

## 🧪 Test Cases

### **1. Auto-fill pro 1 LP**
- Financování: `{"typ":"LP","lp_kody":["6"]}`
- fa_castka: 50000
- **Očekáváno:** Editor předvyplní LP-6 s částkou 50000

### **2. Ruční distribuce pro více LP**
- Financování: `{"typ":"LP","lp_kody":["6","7"]}`
- fa_castka: 75000
- **Očekáváno:** Editor prázdný, uživatel přidává řádky

### **3. Validace překročení**
- fa_castka: 50000
- LP čerpání: 60000
- **Očekáváno:** CHYBA, blokuje save

### **4. Info o neúplnosti**
- fa_castka: 50000
- LP čerpání: 30000
- **Očekáváno:** INFO zpráva (modrá), povoluje save

### **5. Mandatory check**
- LP financování, prázdné čerpání
- **Očekáváno:** CHYBA při potvrzení věcné správnosti

---

## 🔗 Git Commits

- **f7cf798** - Fáze 1+2 (DB + Backend)
- **cdec5cc** - Fáze 3+4 (Frontend + Integrace)

---

## 🆘 Support

**Problémy?** Kontroluj:
1. `_docs/PLAN_LP_CERPANI_NA_FAKTURACH.md` - kompletní spec
2. `_docs/CHANGELOG_LP_CERPANI_NA_FAKTURACH.md` - implementační detaily
3. Console log (Frontend): `💰 Ukládám LP čerpání`
4. Backend log: `/var/log/apache2/error.log`

---

**Happy coding! 🚀**
