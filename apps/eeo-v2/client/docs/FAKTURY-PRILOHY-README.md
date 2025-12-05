# 📎 Feature: Přílohy k fakturám s detekcí ISDOC

**Datum:** 2025-10-27  
**Status:** 🟡 V přípravě  
**Implementace:** FÁZE 1 - Základní funkcionalita  

---

## 📋 OBSAH

1. [Přehled](#přehled)
2. [Struktura souborů](#struktura-souborů)
3. [Dokumentace](#dokumentace)
4. [Implementační plán](#implementační-plán)
5. [Quick Start](#quick-start)

---

## 🎯 PŘEHLED

### Co řešíme?
Umožnit uživatelům nahrávat soubory (PDF, ISDOC) přímo k fakturám v rámci objednávky. Automaticky detekovat ISDOC formát a připravit systém na budoucí extrakci dat.

### Klíčové vlastnosti:
- ✅ Upload souborů přímo u každé faktury
- ✅ Automatická detekce ISDOC formátu (.isdoc)
- ✅ Jasná vazba soubor ↔ faktura
- ✅ Validace typu a velikosti souborů
- ✅ Podpora více souborů na fakturu
- ⏳ Budoucí: Extrakce dat z ISDOC

---

## 📁 STRUKTURA SOUBORŮ

```
r-app-zzs-eeo-25/
│
├── 📄 create_faktury_prilohy_table.sql
│   └── SQL migrace + CRUD operace
│
├── docs/
│   ├── 📘 FAKTURY-PRILOHY-UI-UX-DESIGN.md
│   │   └── Kompletní UI/UX návrh pro Frontend
│   │
│   ├── 📗 FAKTURY-PRILOHY-BACKEND-API.md
│   │   └── API specifikace pro Backend
│   │
│   └── 📙 FAKTURY-PRILOHY-README.md  (tento soubor)
│       └── Přehled a Quick Start
│
└── src/
    └── (připraveno k implementaci Frontend komponent)
```

---

## 📚 DOKUMENTACE

### 1️⃣ **SQL Databáze** 
📄 `create_faktury_prilohy_table.sql`

**Co obsahuje:**
- ✅ CREATE TABLE pro `25a_faktury_prilohy`
- ✅ CRUD SQL dotazy (komentované, připravené pro Backend)
- ✅ Statistiky a verify dotazy
- ✅ FIX pro MySQL 5.5.43 errno 150

**Jak použít:**
```bash
# 1. Otevřít phpMyAdmin nebo MySQL konzoli
# 2. Vybrat databázi `evidence_smluv`
# 3. Spustit SQL (pouze CREATE TABLE část, řádky 1-72)
# 4. CRUD dotazy jsou pro Backend (jsou jako komentáře)
```

**Schema:**
```sql
25a_faktury_prilohy
├── id (PK)
├── faktura_id (FK → 25a_faktury_objednavek)
├── objednavka_id (FK → 25a_objednavky)
├── guid (unique identifier)
├── typ_prilohy (FAKTURA, ISDOC, DOPLNEK_FA)
├── originalni_nazev_souboru
├── systemova_cesta
├── velikost_souboru_b
├── je_isdoc (boolean flag)
├── isdoc_parsed (boolean flag - budoucí)
├── isdoc_data_json (JSON - budoucí)
├── nahrano_uzivatel_id (FK → 25_uzivatele)
├── dt_vytvoreni
└── dt_aktualizace
```

---

### 2️⃣ **Frontend UI/UX Design**
📘 `docs/FAKTURY-PRILOHY-UI-UX-DESIGN.md`

**Co obsahuje:**
- 🎨 Kompletní UI design s mockupy
- 🔄 Interakční flow (upload, ISDOC detekce, delete)
- 📱 Responsive design
- ♿ Accessibility (A11Y)
- 🎭 Animace & transitions
- 🧪 Testovací scénáře
- 📦 Seznam komponent k vytvoření

**Klíčové komponenty:**
```
FakturaAttachmentsSection      ← Hlavní wrapper
├── FakturaAttachmentUploadButton  ← Tlačítko upload
├── FakturaAttachmentItem          ← Položka v seznamu
├── ISDOCDetectionDialog           ← Dialog pro ISDOC
├── AttachmentProgressBar          ← Progress bar
└── AttachmentErrorMessage         ← Error zobrazení
```

**UI Preview:**
```
┌─────────────────────────────────────┐
│ FAKTURA 1 *                     [+] │
├─────────────────────────────────────┤
│ Datum doručení: [2025-10-27]        │
│ Číslo FA/VPD:   [FA-2025-001]       │
│ Částka:         [25000.00] Kč       │
│ ...                                 │
│                                     │
│ ┌───────────────────────────────┐   │
│ │ 📎 Přílohy faktury (2)        │   │
│ ├───────────────────────────────┤   │
│ │ [+] Přidat soubor             │   │
│ ├───────────────────────────────┤   │
│ │ 📄 FA-2025-001.pdf  [🗑️] [⬇️] │   │
│ │ 📄 FA-2025-001.isdoc [🗑️] [⬇️] │   │
│ │    ✅ ISDOC formát detekován   │   │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

### 3️⃣ **Backend API Specifikace**
📗 `docs/FAKTURY-PRILOHY-BACKEND-API.md`

**Co obsahuje:**
- 🌐 Kompletní API endpointy
- 🔒 Security guidelines
- 📊 Response formáty
- 🚨 Error handling
- 🧪 Testovací příklady (cURL)
- 📝 Logging specifikace

**Endpointy:**
```
POST   /api25/faktury/prilohy/upload
GET    /api25/faktury/prilohy/list/{faktura_id}
GET    /api25/faktury/prilohy/list-by-order/{objednavka_id}
GET    /api25/faktury/prilohy/download/{priloha_id}
DELETE /api25/faktury/prilohy/delete/{priloha_id}
POST   /api25/faktury/prilohy/verify/{objednavka_id}
PATCH  /api25/faktury/prilohy/update-classification/{priloha_id}
```

**Upload Request Example:**
```bash
curl -X POST "https://api.example.com/api25/faktury/prilohy/upload" \
  -H "Authorization: Bearer abc123token" \
  -H "X-Username: jan.novak" \
  -F "objednavka_id=1234" \
  -F "faktura_id=5678" \
  -F "file=@FA-2025-001.pdf" \
  -F "typ_prilohy=FAKTURA"
```

---

## 🚀 IMPLEMENTAČNÍ PLÁN

### **FÁZE 1: Databáze & Backend (TEĎKA)** ⏳

**Backend tým:**
- [ ] Opravit errno 150 v SQL (kontrola FK datových typů)
- [ ] Spustit CREATE TABLE migrace
- [ ] Implementovat `/upload` endpoint
- [ ] Implementovat `/list/{faktura_id}` endpoint
- [ ] Implementovat `/download/{priloha_id}` endpoint
- [ ] Implementovat `/delete/{priloha_id}` endpoint
- [ ] ISDOC auto-detekce (.isdoc → `je_isdoc=1`)
- [ ] Validace (file type, size)
- [ ] Security (auth, authz)
- [ ] Testy (unit + integration)

**Časový odhad:** 2-3 dny

---

### **FÁZE 2: Frontend UI (PO BACKEND)** ⏳

**Frontend tým:**
- [ ] Vytvořit `FakturaAttachmentsSection` komponentu
- [ ] Upload button + file picker
- [ ] ISDOC detekce dialog
- [ ] Seznam příloh u faktury
- [ ] Progress bar během uploadu
- [ ] Error handling & validace
- [ ] Download funkce
- [ ] Delete funkce (s confirm)
- [ ] Responsive design
- [ ] Accessibility (ARIA)
- [ ] Animace (slideIn/slideOut)
- [ ] Integrace s auto-save
- [ ] Toast notifikace
- [ ] Testy (unit + E2E)

**Časový odhad:** 2-3 dny

---

### **FÁZE 3: ISDOC Parsing (BUDOUCNOST)** 🔮

**Backend + Frontend:**
- [ ] XML parser pro ISDOC
- [ ] Mapování polí (podobně jako DOCX šablony)
- [ ] Auto-vyplnění faktury z ISDOC
- [ ] UI pro review extrahovaných dat
- [ ] Validace ISDOC dat
- [ ] Konfigurační rozhraní pro mapování

**Časový odhad:** 5-7 dní (samostatný sprint)

---

## ⚡ QUICK START

### Pro Backend vývojáře:

#### 1. Spuštění DB migrace:
```bash
# Připojit se k MySQL
mysql -u root -p evidence_smluv

# Zkontrolovat datové typy referenčních tabulek
SHOW CREATE TABLE `25a_faktury_objednavek`;
SHOW CREATE TABLE `25a_objednavky`;
SHOW CREATE TABLE `25_uzivatele`;

# Spustit CREATE TABLE (řádky 1-72 z SQL souboru)
source create_faktury_prilohy_table.sql;
```

#### 2. Test upload:
```bash
# Vytvořit testovací soubor
echo "Test PDF content" > test.pdf

# Upload pomocí cURL
curl -X POST "http://localhost/api25/faktury/prilohy/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Username: test.user" \
  -F "objednavka_id=1" \
  -F "faktura_id=1" \
  -F "file=@test.pdf" \
  -F "typ_prilohy=FAKTURA"
```

#### 3. Ověření:
```sql
-- Zkontrolovat záznam v DB
SELECT * FROM 25a_faktury_prilohy ORDER BY id DESC LIMIT 1;

-- Zkontrolovat soubor na disku
ls -la /var/www/uploads/orders25/faktury/1/1/
```

---

### Pro Frontend vývojáře:

#### 1. Struktura komponenty:
```jsx
// V OrderForm25.js, uvnitř map loop faktur
{formData.faktury?.map((faktura, index) => (
  <div key={faktura.id}>
    {/* Existující pole faktury */}
    <FormRow>...</FormRow>
    
    {/* 🆕 NOVÁ SEKCE - Přílohy faktury */}
    <FakturaAttachmentsSection
      faktura={faktura}
      onUpload={handleFakturaAttachmentUpload}
      onDelete={handleFakturaAttachmentDelete}
      onDownload={handleFakturaAttachmentDownload}
    />
  </div>
))}
```

#### 2. Hook pro upload:
```javascript
const useFakturaAttachmentUpload = (fakturaId) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const upload = async (file) => {
    // 1. Detekce ISDOC
    const isISDOC = file.name.endsWith('.isdoc');
    
    if (isISDOC) {
      const confirmed = await showISDOCDialog(file);
      if (!confirmed) return;
    }
    
    // 2. Upload
    setUploading(true);
    const result = await uploadFakturaAttachment25({
      faktura_id: fakturaId,
      file,
      onProgress: setProgress
    });
    setUploading(false);
    
    return result;
  };
  
  return { upload, uploading, progress };
};
```

#### 3. Test v DEV:
```javascript
// Mock data pro testování bez Backend
const MOCK_ATTACHMENTS = [
  {
    id: 'mock-1',
    name: 'FA-2025-001.pdf',
    size: 1234567,
    je_isdoc: false,
    status: 'uploaded'
  },
  {
    id: 'mock-2',
    name: 'FA-2025-001.isdoc',
    size: 245000,
    je_isdoc: true,
    status: 'uploaded'
  }
];
```

---

## 🔧 KONFIGURACE

### Backend:
```php
// config/faktury_prilohy.php
return [
    'upload_path' => '/var/www/uploads/orders25/faktury/',
    'allowed_types' => ['pdf', 'isdoc', 'jpg', 'jpeg', 'png'],
    'max_size' => [
        'pdf' => 10 * 1024 * 1024,   // 10 MB
        'isdoc' => 5 * 1024 * 1024,  // 5 MB
        'image' => 5 * 1024 * 1024   // 5 MB
    ],
    'auto_classify_isdoc' => true,
    'enable_isdoc_parsing' => false  // FÁZE 3
];
```

### Frontend:
```javascript
// src/config/attachments.js
export const FAKTURA_ATTACHMENT_CONFIG = {
  allowedTypes: ['.pdf', '.isdoc', '.jpg', '.jpeg', '.png'],
  maxSize: {
    pdf: 10 * 1024 * 1024,
    isdoc: 5 * 1024 * 1024,
    image: 5 * 1024 * 1024
  },
  showISDOCDialog: true,
  enableISDOCParsing: false  // FÁZE 3
};
```

---

## 🐛 TROUBLESHOOTING

### Problém: errno 150 při CREATE TABLE

**Řešení:**
```sql
-- Zkontrolovat datové typy v ref. tabulkách
SHOW CREATE TABLE `25a_faktury_objednavek`;
SHOW CREATE TABLE `25a_objednavky`;
SHOW CREATE TABLE `25_uzivatele`;

-- Upravit typ id v 25a_faktury_prilohy podle toho co najdete výše
-- Pokud INT(10) UNSIGNED, změnit z INT(10) na INT(10) UNSIGNED
-- Pokud INT(10), nechat INT(10)
```

### Problém: Soubor se nenahraje (403/500)

**Kontrola:**
```bash
# 1. Práva na složku
ls -la /var/www/uploads/orders25/faktury/
chmod 755 /var/www/uploads/orders25/faktury/

# 2. PHP limits
php -i | grep upload_max_filesize
php -i | grep post_max_size

# 3. Backend logs
tail -f /var/log/apache2/error.log
```

### Problém: ISDOC není detekován

**Frontend kontrola:**
```javascript
const file = event.target.files[0];
console.log('File name:', file.name);
console.log('Extension:', file.name.split('.').pop());
console.log('Is ISDOC:', file.name.endsWith('.isdoc'));
```

**Backend kontrola:**
```php
$extension = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
error_log("File extension: " . $extension);
error_log("Is ISDOC: " . (strtolower($extension) === 'isdoc' ? 'YES' : 'NO'));
```

---

## 📞 KONTAKTY

**Backend tým:** [Jméno Backend vývojáře]  
**Frontend tým:** [Jméno Frontend vývojáře]  
**PM:** [Jméno Project Managera]  

---

## 📝 CHANGELOG

### 2025-10-27 - Inicializace projektu
- ✅ Vytvoření SQL migrace
- ✅ UI/UX design dokument
- ✅ Backend API specifikace
- ✅ README a Quick Start
- ⏳ Čeká na implementaci

---

## 📚 DALŠÍ ZDROJE

- [MySQL 5.5 Documentation](https://dev.mysql.com/doc/refman/5.5/en/)
- [ISDOC Standard](https://www.isdoc.cz/)
- [React File Upload Best Practices](https://react.dev/)
- [PHP File Upload Security](https://www.php.net/manual/en/features.file-upload.php)

---

**Status:** 🟡 V přípravě  
**Poslední aktualizace:** 2025-10-27  
**Verze dokumentu:** 1.0  
