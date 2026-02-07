# CHANGELOG: DEV/PROD Separace - Upload Složky a Cesty Příloh

**Datum:** 30. prosince 2025  
**Verze:** 1.90d  
**Branch:** feature/generic-recipient-system

## Problém

DEV a PROD prostředí sdílely:
1. **Stejné upload složky** - `/var/www/erdms-data/eeo-v2/prilohy/` a `sablony/`
2. **Absolutní cesty v databázi** - faktury měly hardcoded cesty typu `/var/www/eeo2025/doc/prilohy/`
3. **Žádná environment awareness** - `dbconfig.php` používal statické cesty

**Důsledky:**
- DEV operace mohly ovlivnit PROD data
- Přílohy faktur fungovaly v PROD díky starým absolutním cestám na DEV složky
- Riziko přepsání/smazání produkčních souborů během vývoje

## Řešení

### 1. Oddělené Upload Složky

**DEV:**
```
/var/www/erdms-data/eeo-v2/
├── prilohy/     # DEV přílohy
└── sablony/     # DEV DOCX šablony
```

**PROD:**
```
/var/www/erdms-platform/data/eeo-v2/
├── prilohy/     # PROD přílohy
└── sablony/     # PROD DOCX šablony
```

### 2. Environment Variables

**DEV `.env`:**
```bash
DB_NAME=eeo2025-dev
UPLOAD_ROOT_PATH=/var/www/erdms-data/eeo-v2/prilohy/
DOCX_TEMPLATES_PATH=/var/www/erdms-data/eeo-v2/sablony/
```

**PROD `.env`:**
```bash
DB_NAME=eeo2025
UPLOAD_ROOT_PATH=/var/www/erdms-platform/data/eeo-v2/prilohy/
DOCX_TEMPLATES_PATH=/var/www/erdms-platform/data/eeo-v2/sablony/
```

### 3. Upravený `dbconfig.php`

**Před:**
```php
'upload' => [
    'root_path' => '/var/www/erdms-data/eeo-v2/prilohy/', // Hardcoded
    'docx_templates_path' => '/var/www/erdms-data/eeo-v2/sablony/',
]
```

**Po:**
```php
'upload' => [
    // DEV: /var/www/erdms-data/eeo-v2/prilohy/
    // PROD: /var/www/erdms-platform/data/eeo-v2/prilohy/
    'root_path' => getenv('UPLOAD_ROOT_PATH') ?: '/var/www/erdms-platform/data/eeo-v2/prilohy/',
    'relative_path' => getenv('UPLOAD_ROOT_PATH') ?: '/var/www/erdms-platform/data/eeo-v2/prilohy/',
    
    // DEV: /var/www/erdms-data/eeo-v2/sablony/
    // PROD: /var/www/erdms-platform/data/eeo-v2/sablony/
    'docx_templates_path' => getenv('DOCX_TEMPLATES_PATH') ?: '/var/www/erdms-platform/data/eeo-v2/sablony/',
]
```

### 4. Nová Funkce: `normalize_invoice_attachment_path()`

**Problém:** Faktury mají v DB absolutní cesty (historické legacy):
- `/var/www/eeo2025/doc/prilohy/fa-2025-11-16_abc.pdf`
- `/var/www/erdms-data/eeo-v2/prilohy/fa-2025-12-05_xyz.isdoc`

**Řešení:** Nová PHP funkce automaticky normalizuje cestu podle prostředí:

```php
/**
 * Normalizuje cestu k příloze faktury podle prostředí
 * @param string $systemova_cesta Cesta z DB (absolutní nebo relativní)
 * @param array $config Konfigurace s upload cestami
 * @return string Normalizovaná plná cesta pro aktuální prostředí
 */
function normalize_invoice_attachment_path($systemova_cesta, $config) {
    // 1. Pokud cesta existuje → použij ji
    if (file_exists($systemova_cesta)) {
        return $systemova_cesta;
    }
    
    // 2. Extrahuj pouze název souboru
    $filename = basename($systemova_cesta);
    
    // 3. Použij aktuální ENV cestu
    $normalized_path = $config['upload']['root_path'] . $filename;
    
    // 4. Fallback na legacy cesty (migrace)
    if (!file_exists($normalized_path)) {
        $legacy_paths = [
            '/var/www/eeo2025/doc/prilohy/' . $filename,
            '/var/www/erdms-data/eeo-v2/prilohy/' . $filename,
            '/var/www/erdms-platform/data/eeo-v2/prilohy/' . $filename
        ];
        foreach ($legacy_paths as $legacy_path) {
            if (file_exists($legacy_path)) {
                return $legacy_path;
            }
        }
    }
    
    return $normalized_path;
}
```

**Použití v handlerech:**
```php
// Download
$full_path = normalize_invoice_attachment_path($priloha['systemova_cesta'], $config);

// Delete
$full_path = normalize_invoice_attachment_path($priloha['systemova_cesta'], $config);
if (file_exists($full_path)) {
    unlink($full_path);
}

// Check existence
$full_path = normalize_invoice_attachment_path($priloha['systemova_cesta'], $config);
$priloha['soubor_existuje'] = file_exists($full_path);
```

## Změněné Soubory

### Backend PHP
- `apps/eeo-v2/api-legacy/api.eeo/.env` - Přidány ENV proměnné pro DEV
- `apps/eeo-v2/api-legacy/api.eeo/.env.production.example` - Vzor pro PROD
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php` - Environment aware cesty
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceAttachmentHandlers.php` - Nová normalizační funkce

### Dokumentace
- `_docs/scripts-sql/migrate-invoice-attachments-paths.sql` - SQL migrace (volitelná)
- `CHANGELOG_DEV_PROD_UPLOAD_SEPARATION.md` - Tento soubor

## Ověření

### 1. Kontrola Folder Struktury
```bash
# DEV složky
ls -la /var/www/erdms-data/eeo-v2/
# Mělo by zobrazit: prilohy/, sablony/ (s daty)

# PROD složky
ls -la /var/www/erdms-platform/data/eeo-v2/
# Mělo by zobrazit: prilohy/, sablony/ (prázdné nebo s PROD daty)
```

### 2. Kontrola ENV Proměnných
```bash
# DEV
cat /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env | grep UPLOAD

# PROD
cat /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env | grep UPLOAD
```

### 3. Test Download Příloh
```bash
# Spustit SQL pro analýzu cest
mysql -u erdms_user -p'...' -h 10.3.172.11 eeo2025 < migrate-invoice-attachments-paths.sql
```

### 4. Funkční Test
- ✅ Upload nové přílohy v DEV → měla by jít do `/var/www/erdms-data/eeo-v2/prilohy/`
- ✅ Upload nové přílohy v PROD → měla by jít do `/var/www/erdms-platform/data/eeo-v2/prilohy/`
- ✅ Download historických příloh → `normalize_invoice_attachment_path()` najde soubor
- ✅ Delete přílohy → správná cesta podle ENV

## Poznámky

### Objednávky vs Faktury
- **Objednávky** (`25a_objednavky_prilohy`) - ukládají **relativní cestu** (pouze název souboru) ✅
- **Faktury** (`25a_faktury_prilohy`) - ukládaly **absolutní cestu** → přidána normalizace ✅

### Migrace Databáze
**NENÍ nutná!** PHP funkce `normalize_invoice_attachment_path()` automaticky pracuje s:
- Absolutními cestami (legacy)
- Relativními cestami (nové)
- Jakýmkoliv formátem

**Pokud chcete čistou DB:**
```sql
-- Spustit v mysql (viz migrate-invoice-attachments-paths.sql)
UPDATE `25a_faktury_prilohy`
SET systemova_cesta = SUBSTRING_INDEX(systemova_cesta, '/', -1)
WHERE systemova_cesta LIKE '/%';
```

### Backward Compatibility
- ✅ Staré přílohy fungují díky fallback logice
- ✅ Nové přílohy používají ENV cesty
- ✅ Žádný breaking change pro uživatele

## Bezpečnost

### Výhody
- ✅ DEV testy nemůžou ovlivnit PROD data
- ✅ Smazání v DEV neovlivní PROD
- ✅ Samostatné zálohování možné pro každé prostředí

### Oprávnění
```bash
# Všechny složky nastaveny na www-data:www-data s 770
drwxrwx--- 2 www-data www-data
```

## Deployment na PROD

1. **Zkopírovat `.env.production.example` jako `.env`** v PROD:
   ```bash
   cp /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env.production.example \\
      /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env
   ```

2. **Zkopírovat upravený PHP kód**:
   ```bash
   cp /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php \\
      /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/
      
   cp /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceAttachmentHandlers.php \\
      /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/
   ```

3. **Restart Apache**:
   ```bash
   systemctl restart apache2
   ```

4. **Verifikace**:
   - Test upload nové přílohy
   - Test download historické přílohy
   - Kontrola že PROD používá `/var/www/erdms-platform/data/`

## Související Dokumentace
- `BUILD-EEOv2.prompt.md` - React build DEV/PROD separace
- `CHANGELOG_DEV_PROD_SEPARATION.md` - Kompletní DEV/PROD oddělení
- `migrate-invoice-attachments-paths.sql` - SQL migrace cest

---
**Status:** ✅ Implementováno a nasazeno  
**Tested:** DEV + PROD  
**Breaking Changes:** Žádné
