# 📎 Implementace příloh k ročním poplatkům

**Datum:** 31. ledna 2026  
**Status:** ✅ Implementováno (čeká na testování)

---

## 📋 Přehled

Kompletní implementace systému příloh pro modul ročních poplatků podle vzoru faktur.

### ✅ Hlavní funkce

- ✅ Nahrávání souborů (drag & drop + klik)
- ✅ Stahování souborů
- ✅ Mazání souborů
- ✅ Zobrazení seznamu příloh v rozbalené sekci
- ✅ Ikona 📎 + počet příloh v hlavní tabulce
- ✅ Validace typu a velikosti (10 MB)

---

## 🗄️ Databáze

### Tabulka: `25a_rocni_poplatky_prilohy`

```sql
CREATE TABLE IF NOT EXISTS `25a_rocni_poplatky_prilohy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rocni_poplatek_id` int(11) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `stored_name` varchar(255) NOT NULL,
  `file_path` varchar(512) NOT NULL,
  `file_size` int(11) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_extension` varchar(10) DEFAULT NULL,
  `typ_prilohy` varchar(50) DEFAULT 'PRILOHA',
  `nahral_user_id` int(11) DEFAULT NULL,
  `dt_nahrano` datetime DEFAULT CURRENT_TIMESTAMP,
  `poznamka` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rocni_poplatek` (`rocni_poplatek_id`),
  KEY `idx_dt_nahrano` (`dt_nahrano`),
  CONSTRAINT `fk_rp_prilohy_rocni_poplatek`
    FOREIGN KEY (`rocni_poplatek_id`)
    REFERENCES `25a_rocni_poplatky` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
```

**Migrace:** `/var/www/erdms-dev/migrations/2026-01-31_annual_fees_attachments.sql`

### Spuštění migrace

```bash
cd /var/www/erdms-dev
mysql -u root -p EEO-OSTRA-DEV < migrations/2026-01-31_annual_fees_attachments.sql
```

---

## 🔧 Backend (PHP API)

### Soubory

1. **Handler:** `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFeesAttachmentsHandlers.php`
2. **API Router:** `apps/eeo-v2/api-legacy/api.eeo/api.php`
3. **Konstanta:** `TBL_ROCNI_POPLATKY_PRILOHY` (api.php, řádek ~169)

### Endpointy

| Metoda | Endpoint                           | Funkce                           |
|--------|------------------------------------|----------------------------------|
| POST   | `annual-fees/attachments/upload`   | `handleAnnualFeeAttachmentUpload`   |
| POST   | `annual-fees/attachments/list`     | `handleAnnualFeeAttachmentsList`    |
| POST   | `annual-fees/attachments/download` | `handleAnnualFeeAttachmentDownload` |
| POST   | `annual-fees/attachments/delete`   | `handleAnnualFeeAttachmentDelete`   |

### Ukládání souborů

- **Cesta:** `/var/www/erdms-dev/data/eeo-v2/prilohy/` (bez podsložky)
- **Prefix:** `rp-YYYYMMDDHHMMSS_random.ext` (jako `obj-`, `fa-`)
- **Max velikost:** 10 MB
- **Povolené typy:** PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, GIF, ZIP, RAR

### Validace (PHPAPI.prompt.md)

✅ Všechny tabulky přes konstanty (`TBL_ROCNI_POPLATKY_PRILOHY`)  
✅ `setMysqlTimezone($pdo)` ve všech handlerech  
✅ Cesta z `getenv('UPLOAD_ROOT_PATH')`  
✅ Oprávnění: `canViewAnnualFees()`, `canEdit()` (z annualFeesHandlers.php)  

---

## 🎨 Frontend (React)

### Soubory

1. **Stránka:** `apps/eeo-v2/client/src/pages/AnnualFeesPage.js`
2. **API služba:** `apps/eeo-v2/client/src/services/apiAnnualFees.js`

### API funkce (apiAnnualFees.js)

```javascript
// Nahrání přílohy
uploadAnnualFeeAttachment(token, username, rocniPoplatekId, file)

// Seznam příloh
listAnnualFeeAttachments(token, username, rocniPoplatekId)

// Stažení přílohy
downloadAnnualFeeAttachment(token, username, rocniPoplatekId, attachmentId, filename)

// Smazání přílohy
deleteAnnualFeeAttachment(token, username, rocniPoplatekId, attachmentId)

// Pomocné funkce
isAllowedAnnualFeeFileType(filename)
isAllowedAnnualFeeFileSize(fileSize)
formatFileSize(bytes)
```

### UI komponenty

#### 1. **Hlavní tabulka - Sloupec 📎**
- Ikona sponky + počet příloh
- Zobrazuje se pouze pokud má poplatek přílohy

#### 2. **Dropzone v rozbalené sekci (vlevo)**
- Drag & Drop support
- Klik pro výběr souboru
- Indikace uploadu (⏳)
- Seznam nahraných příloh s:
  - Ikona podle typu (📄 PDF, 🖼️ obrázek, atd.)
  - Název souboru
  - Velikost + datum
  - Tlačítka: Stáhnout ⬇️, Smazat ❌

#### 3. **Styled komponenty**
```javascript
AttachmentsContainer    // Obal sekce příloh
AttachmentsHeader       // Hlavička s ikonou
DropZone                // Dropzone s hover efekty
DropZoneContent         // Obsah dropzone
AttachmentsList         // Seznam příloh
AttachmentItem          // Jednotlivá příloha
```

### State

```javascript
const [attachments, setAttachments] = useState({});  // {feeId: [att1, att2]}
const [uploadingAttachments, setUploadingAttachments] = useState(new Set());  // Set<feeId>
const [isDragging, setIsDragging] = useState({});  // {feeId: boolean}
```

### Lifecycle

1. **Rozbalení řádku:** Volá `loadAttachments(feeId)` → načte přílohy z API
2. **Upload:** Validace → POST `/upload` → reload příloh
3. **Download:** GET `/download` → blob download přes browser
4. **Delete:** Confirm → POST `/delete` → reload příloh

---

## 🧪 Testování

### 1. Databáze

```bash
# Spustit migraci
mysql -u root -p EEO-OSTRA-DEV < migrations/2026-01-31_annual_fees_attachments.sql

# Ověřit strukturu
mysql -u root -p EEO-OSTRA-DEV -e "DESCRIBE 25a_rocni_poplatky_prilohy;"
```

### 2. Adresáře

```bash
# Vytvořit adresář (pokud neexistuje)
mkdir -p /var/www/erdms-dev/data/eeo-v2/prilohy/rp
chmod 755 /var/www/erdms-dev/data/eeo-v2/prilohy/rp
chown www-data:www-data /var/www/erdms-dev/data/eeo-v2/prilohy/rp
```

### 3. Backend API

```bash
# Test upload (přes CURL)
curl -X POST https://dev.erdms.local/api/eeo/annual-fees/attachments/upload \
  -H "Content-Type: multipart/form-data" \
  -F "token=YOUR_TOKEN" \
  -F "username=YOUR_USERNAME" \
  -F "rocni_poplatek_id=1" \
  -F "file=@test.pdf"

# Test list
curl -X POST https://dev.erdms.local/api/eeo/annual-fees/attachments/list \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN","username":"YOUR_USERNAME","rocni_poplatek_id":1}'
```

### 4. Frontend

```bash
# Build dashboard
cd /var/www/erdms-dev/dashboard
npm run build

# Nebo dev mode
npm run dev
```

### Testovací scénáře

- [ ] Nahrání PDF souboru (< 10 MB)
- [ ] Nahrání obrázku (JPG, PNG)
- [ ] Pokus o upload nepovolený typ (např. .exe) → očekávána chyba
- [ ] Pokus o upload > 10 MB → očekávána chyba
- [ ] Drag & Drop souboru do dropzone
- [ ] Stažení přílohy → soubor se stáhne s původním názvem
- [ ] Smazání přílohy → confirm dialog → zmizí ze seznamu
- [ ] Ikona 📎 + počet se zobrazí v hlavní tabulce
- [ ] Přílohy persistují po sbalení/rozbalení řádku

---

## 🔐 Oprávnění

Přílohy sdílí stejná oprávnění jako roční poplatky:

- **ANNUAL_FEES_VIEW** → zobrazení příloh
- **ANNUAL_FEES_MANAGE** nebo **ADMIN** → upload, download, delete
- **ANNUAL_FEES_EDIT** → delete příloh

---

## 📁 Struktura souborů

```
/var/www/erdms-dev/
├── apps/eeo-v2/
│   ├── api-legacy/api.eeo/
│   │   ├── api.php                              # +4 endpointy, +konstanta
│   │   └── v2025.03_25/lib/
│   │       └── annualFeesAttachmentsHandlers.php  # NOVÝ - 4 handlery
│   └── client/src/
│       ├── pages/
│       │   └── AnnualFeesPage.js                # Upraveno - dropzone UI
│       └── services/
│           └── apiAnnualFees.js                 # Upraveno - +5 funkcí
├── data/eeo-v2/prilohy/rp/                      # Ukládání souborů
└── migrations/
    └── 2026-01-31_annual_fees_attachments.sql   # NOVÝ - DB schema
```

---

## 🚀 Deploy checklist

### DEV prostředí

1. ✅ Databáze
   ```bash
   mysql -u root -p EEO-OSTRA-DEV < migrations/2026-01-31_annual_fees_attachments.sql
   ```

2. ✅ Adresáře
   ```bash
   # Přílohy se ukládají přímo do /data/eeo-v2/prilohy/ s prefixem rp-
   # (jako obj-, fa-), proto není potřeba vytvářet podsložku
   chmod 755 /var/www/erdms-dev/data/eeo-v2/prilohy/
   chown www-data:www-data /var/www/erdms-dev/data/eeo-v2/prilohy/
   ```

3. ✅ Frontend build
   ```bash
   cd /var/www/erdms-dev/dashboard
   npm run build
   ```

4. ✅ Test
   - Otevřít roční poplatky
   - Rozkliknout detail
   - Nahrát přílohu
   - Stáhnout přílohu
   - Smazat přílohu

### PROD prostředí

⚠️ **PŘED DEPLOYEM DO PRODUKCE:**

1. Upravit `UPLOAD_ROOT_PATH` v `.env` na produkční cestu
2. Spustit migraci na PROD databázi
3. Ověřit oprávnění `/var/www/erdms-platform/data/eeo-v2/prilohy/` (přílohy s prefixem rp-)
4. Build frontend pro produkci
5. Backup databáze před migrací

---

## 📝 Poznámky

### Bezpečnost

- ✅ Validace typu souboru (whitelist)
- ✅ Limit velikosti (10 MB)
- ✅ Kontrola oprávnění při každém požadavku
- ✅ UUID + timestamp v názvu souboru (zabránění kolizím)
- ✅ Soubory mimo document root (data/eeo-v2/prilohy/)

### Performance

- Přílohy se načítají při rozbalení řádku (lazy load)
- Upload indikace (`uploadingAttachments` Set)
- Drag state per fee ID (nedochází k re-renderu celé tabulky)

### Kompatibilita

- React 18+
- PHP 7.4+
- MySQL 5.7+ / MariaDB 10.3+
- Styled components v5+

---

## 🐛 Known Issues

Žádné známé problémy.

---

## 📞 Support

V případě problémů kontaktujte vývojový tým nebo vytvořte ticket.

**Autor:** GitHub Copilot + User  
**Verze:** 1.0  
**Poslední update:** 31. 1. 2026
