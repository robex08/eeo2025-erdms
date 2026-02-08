# 🔍 KONTROLA SPRÁVNÉHO UKLÁDÁNÍ A STAHOVÁNÍ PŘÍLOH (PROD/DEV)

**Datum kontroly:** 10. února 2026  
**Účel:** Ověřit, že všechny upload/download handlery správně pracují s cestami pro PROD a DEV prostředí

---

## 📋 CHECKLIST PRO AI ASISTENTA

### 1️⃣ PHP BACKEND - Upload Handlery

**Najdi všechny soubory s upload funkcemi:**
```bash
grep -r "move_uploaded_file" /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/*.php
```

**Pro každý handler zkontroluj:**
- ✅ Používá `environment-utils.php` nebo `get_env_path()` pro získání cesty?
- ✅ **Do DB ukládá JEN název souboru** (basename), ne plnou cestu?
- ✅ Nemá hardcoded `/var/www/erdms-dev/` ani `/var/www/erdms-platform/`?
- ✅ Správně používá `getenv('UPLOAD_ROOT_PATH')` s fallbackem?

**Klíčové handlery k prověření:**
- `invoiceAttachmentHandlers.php` (upload faktur z modulu Faktury)
- `orderV2InvoiceAttachmentHandlers.php` (upload faktur z OrderForm25)
- `annualFeesAttachmentsHandlers.php` (roční poplatky)
- `handlers_orders_v3.php` (kontrola existence příloh)
- Všechny ostatní `*Handlers.php` s upload funkcionalitou

---

### 2️⃣ PHP BACKEND - Download Handlery

**Najdi všechny download funkce:**
```bash
grep -rn "Content-Type.*application" /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/*.php
grep -rn "readfile\|file_get_contents.*prilohy" /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/*.php
```

**Pro každý handler zkontroluj:**
- ✅ Při načítání z DB používá `basename($row['systemova_cesta'])` pro kompatibilitu se starými full-path záznamy?
- ✅ Sestavuje cestu dynamicky: `$upload_root . basename($filename)`?
- ✅ Nepoužívá přímo hodnotu z DB jako cestu k souboru?
- ✅ Kontroluje `file_exists()` před stažením?

---

### 3️⃣ DATABÁZOVÁ KONTROLA

**Zkontroluj tabulky s přílohami:**
```sql
-- Najdi tabulky s sloupcem systemova_cesta
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'eeo2025-dev' 
  AND COLUMN_NAME = 'systemova_cesta';

-- Zkontroluj, jestli se ještě ukládají plné cesty (NE starých záznamů)
SELECT id, originalni_nazev_souboru, systemova_cesta, dt_vytvoreni
FROM 25a_faktury_prilohy
WHERE systemova_cesta LIKE '/var/www/%'
  AND dt_vytvoreni > '2026-02-09 18:00:00'  -- Po dnešních opravách
ORDER BY dt_vytvoreni DESC
LIMIT 10;
```

**Co hledat:**
- ❌ NOVÉ záznamy (po 9.2.2026 18:00) s full path `/var/www/...` = CHYBA!
- ✅ Nové záznamy by měly obsahovat jen `fa-2026-02-10_xxx.pdf`

---

### 4️⃣ FRONTEND - API Volání

**Najdi všechny komponenty pracující s přílohami:**
```bash
grep -rn "download.*attachment\|prilohy\|invoice.*attachment" /var/www/erdms-dev/apps/eeo-v2/client/src/components/
```

**Zkontroluj:**
- ✅ API endpointy používají `process.env.REACT_APP_API2_BASE_URL`?
- ✅ Nemají hardcoded `http://localhost:3001` ani `https://erdms.zachranka.cz`?
- ✅ Chybové stavy zobrazují toast, ne `alert()`?
- ✅ URL pro download se správně sestavuje z env variables?

**Klíčové komponenty:**
- `OrderExpandedRowV3.js` (přílohy objednávek V3)
- `OrderForm25.js` (upload faktur z formuláře)
- `InvoiceModule*.js` (modul faktur)
- `AnnualFeesComponent*.js` (roční poplatky)

---

### 5️⃣ ENVIRONMENT VARIABLES

**Zkontroluj .env soubory:**
```bash
# DEV
cat /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env | grep "UPLOAD_ROOT_PATH\|APP_ENV"

# PROD
cat /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env | grep "UPLOAD_ROOT_PATH\|APP_ENV"

# Frontend DEV
cat /var/www/erdms-dev/apps/eeo-v2/client/.env | grep "REACT_APP"
```

**Ověř hodnoty:**
- DEV: `UPLOAD_ROOT_PATH=/var/www/erdms-dev/data/eeo-v2/prilohy/`
- PROD: `UPLOAD_ROOT_PATH=/var/www/erdms-platform/data/eeo-v2/prilohy/`
- DEV: `APP_ENV=development`
- PROD: `APP_ENV=production`

---

### 6️⃣ FYZICKÁ KONTROLA SOUBORŮ

**Zkontroluj, že nové uploady jdou do správné lokace:**
```bash
# Posledních 10 nahraných souborů v DEV
ls -lt /var/www/erdms-dev/data/eeo-v2/prilohy/ | head -20

# Posledních 10 nahraných souborů v PROD
ls -lt /var/www/erdms-platform/data/eeo-v2/prilohy/ | head -20
```

**Po test uploadu zkontroluj:**
- ✅ Soubor je fyzicky na správném místě (DEV vs PROD)?
- ✅ V DB je uložen jen název souboru, ne celá cesta?
- ✅ Download funguje z obou prostředí?

---

## 🚨 ČERVENÉ VLAJKY (Co hledat jako chyby)

1. ❌ **Upload handler ukládá do DB celou cestu:**
   ```php
   $stmt->execute([..., $full_path, ...]);  // ŠPATNĚ!
   ```

2. ❌ **Hardcoded cesty v fallbacku:**
   ```php
   $uploadPath = getenv('UPLOAD_ROOT_PATH') ?: '/var/www/erdms-dev/data/...'; // ŠPATNĚ!
   ```

3. ❌ **Download handler nepoužívá basename():**
   ```php
   $file_path = $upload_root . $row['systemova_cesta']; // ŠPATNĚ pokud systemova_cesta obsahuje full path
   ```

4. ❌ **Frontend má hardcoded URL:**
   ```javascript
   const API_BASE = '/api.eeo/';  // ŠPATNĚ! Použij process.env.REACT_APP_API2_BASE_URL
   ```

5. ❌ **Nové záznamy v DB s full path po 9.2.2026 18:00**

---

## ✅ VÝSTUP KONTROLY

Po dokončení vytvoř stručný report:

**SUMMARY:**
- Počet PHP upload handlerů: X
- Počet PHP download handlerů: Y
- Počet FE komponent s přílohami: Z

**NALEZENÉ PROBLÉMY:**
- [ ] Seznam konkrétních souborů a řádků s chybami

**DOPORUČENÍ:**
- [ ] Co je třeba opravit
- [ ] Které soubory nasadit do produkce

---

## 📝 TEST SCENARIO

**Manuální test (po kontrole kódu):**

1. **DEV prostředí:**
   - Upload fakturu přes OrderForm25
   - Upload fakturu přes modul Faktury
   - Zkontroluj DB: `SELECT systemova_cesta FROM 25a_faktury_prilohy ORDER BY id DESC LIMIT 1;`
   - Zkontroluj disk: `ls -lh /var/www/erdms-dev/data/eeo-v2/prilohy/fa-2026-02-10*`
   - Download obě faktury

2. **PROD prostředí:**
   - Opakuj kroky 1-5 v produkci
   - Ověř, že soubory jsou v `/var/www/erdms-platform/data/`

**Očekávaný výsledek:**
- ✅ DB obsahuje JEN názvy souborů (ne full path)
- ✅ Soubory jsou fyzicky na správném místě (DEV/PROD)
- ✅ Download funguje z obou prostředí
- ✅ Žádné hardcoded cesty v kódu
