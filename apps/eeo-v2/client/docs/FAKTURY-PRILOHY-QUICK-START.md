# 🚀 Invoice Attachments - Quick Start Guide

**Pro vývojáře:** Rychlý průvodce použitím Invoice Attachments v projektu

---

## 📦 Import

```javascript
// Hlavní komponenta
import InvoiceAttachmentsSection from '../components/invoices/InvoiceAttachmentsSection';

// Nebo všechny komponenty najednou
import { 
  InvoiceAttachmentsSection,
  InvoiceAttachmentItem,
  InvoiceAttachmentUploadButton,
  ISDOCDetectionBadge 
} from '../components/invoices';

// API funkce
import { 
  uploadInvoiceAttachment25,
  listInvoiceAttachments25,
  downloadInvoiceAttachment25,
  deleteInvoiceAttachment25
} from '../services/api25invoices';
```

---

## 🎯 Základní použití

### 1. Jednoduchá integrace

```javascript
function FakturaComponent({ faktura, objednavkaId }) {
  return (
    <div>
      {/* Ostatní pole faktury */}
      <input name="fa_datum_doruceni" ... />
      <input name="fa_cislo_vema" ... />
      <input name="fa_castka" ... />
      
      {/* NOVÁ SEKCE - Přílohy faktury */}
      <InvoiceAttachmentsSection
        fakturaId={faktura.id}
        objednavkaId={objednavkaId}
      />
    </div>
  );
}
```

### 2. S callback a read-only

```javascript
<InvoiceAttachmentsSection
  fakturaId={faktura.id}
  objednavkaId={objednavkaId}
  readOnly={formLocked}
  defaultCollapsed={false}
  onAttachmentsChange={(attachments) => {
    console.log('Aktuální přílohy:', attachments);
    setFakturaAttachments(attachments);
  }}
/>
```

---

## 🔧 API Funkce

### Upload přílohy

```javascript
import { uploadInvoiceAttachment25 } from '../services/api25invoices';

const handleUpload = async (file) => {
  try {
    const result = await uploadInvoiceAttachment25({
      token: user.token,
      username: user.username,
      faktura_id: 123,
      objednavka_id: 456,
      typ_prilohy: 'FAKTURA', // nebo 'ISDOC', 'DOPLNEK_FA'
      file: file
    });
    
    console.log('Upload úspěšný:', result);
    // result obsahuje: priloha_id, guid, je_isdoc, ...
  } catch (error) {
    console.error('Chyba uploadu:', error.message);
  }
};
```

### Načtení příloh

```javascript
import { listInvoiceAttachments25 } from '../services/api25invoices';

const loadAttachments = async () => {
  try {
    const result = await listInvoiceAttachments25({
      token: user.token,
      username: user.username,
      faktura_id: 123
    });
    
    const attachments = result.prilohy || [];
    console.log('Načteno příloh:', attachments.length);
  } catch (error) {
    console.error('Chyba načítání:', error.message);
  }
};
```

### Download přílohy

```javascript
import { downloadInvoiceAttachment25 } from '../services/api25invoices';

const handleDownload = async (attachment) => {
  try {
    const blob = await downloadInvoiceAttachment25({
      token: user.token,
      username: user.username,
      priloha_id: attachment.id
    });
    
    // Vytvoř download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.originalni_nazev_souboru;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Chyba stahování:', error.message);
  }
};
```

### Smazání přílohy

```javascript
import { deleteInvoiceAttachment25 } from '../services/api25invoices';

const handleDelete = async (attachmentId) => {
  if (!window.confirm('Opravdu smazat?')) return;
  
  try {
    await deleteInvoiceAttachment25({
      token: user.token,
      username: user.username,
      priloha_id: attachmentId
    });
    
    console.log('Příloha smazána');
  } catch (error) {
    console.error('Chyba mazání:', error.message);
  }
};
```

---

## 🎨 Samostatné komponenty

### Upload Button

```javascript
import InvoiceAttachmentUploadButton from '../components/invoices/InvoiceAttachmentUploadButton';

<InvoiceAttachmentUploadButton
  onUpload={async (file, isISDOC) => {
    console.log('Nahrávám soubor:', file.name);
    console.log('Je ISDOC?', isISDOC);
    // Zde volej API
  }}
  disabled={uploading}
  maxFileSize={10 * 1024 * 1024} // 10 MB
  acceptedTypes={['pdf', 'isdoc', 'jpg', 'jpeg', 'png']}
/>
```

### Attachment Item

```javascript
import InvoiceAttachmentItem from '../components/invoices/InvoiceAttachmentItem';

<InvoiceAttachmentItem
  attachment={attachment}
  onDownload={handleDownload}
  onDelete={handleDelete}
  readOnly={false}
  showUploader={true}
/>
```

### ISDOC Badge

```javascript
import ISDOCDetectionBadge from '../components/invoices/ISDOCDetectionBadge';

<ISDOCDetectionBadge
  detected={attachment.je_isdoc === 1}
  parsed={attachment.isdoc_parsed === 1}
  showTooltip={true}
/>
```

---

## 🛠️ Utility funkce

```javascript
import { 
  isAllowedInvoiceFileType,
  isAllowedInvoiceFileSize,
  isISDOCFile,
  formatFileSize 
} from '../services/api25invoices';

// Validace typu
if (!isAllowedInvoiceFileType('faktura.pdf')) {
  alert('Nepodporovaný formát!');
}

// Validace velikosti
if (!isAllowedInvoiceFileSize(file.size)) {
  alert('Soubor je příliš velký!');
}

// ISDOC detekce
if (isISDOCFile('faktura.isdoc')) {
  console.log('Je to ISDOC formát');
}

// Formátování velikosti
console.log(formatFileSize(1234567)); // "1.18 MB"
```

---

## 📋 Response struktury

### Upload Response

```json
{
  "status": "ok",
  "message": "Příloha úspěšně nahrána",
  "priloha_id": 789,
  "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "je_isdoc": false,
  "originalni_nazev_souboru": "FA-2025-001.pdf",
  "systemova_cesta": "/var/www/.../fa-2025-10-27_guid.pdf",
  "velikost_souboru_b": 1234567,
  "dt_vytvoreni": "2025-10-27 14:35:22"
}
```

### List Response

```json
{
  "status": "ok",
  "prilohy": [
    {
      "id": 789,
      "guid": "a1b2c3d4-...",
      "faktura_id": 5678,
      "objednavka_id": 1234,
      "typ_prilohy": "FAKTURA",
      "originalni_nazev_souboru": "FA-2025-001.pdf",
      "systemova_cesta": "/var/www/.../fa-2025-10-27_guid.pdf",
      "velikost_souboru_b": 1234567,
      "je_isdoc": false,
      "isdoc_parsed": false,
      "isdoc_data_json": null,
      "nahrano_uzivatel_id": 42,
      "nahrano_uzivatel": {
        "id": 42,
        "jmeno": "Jan",
        "prijmeni": "Novák"
      },
      "dt_vytvoreni": "2025-10-27 14:35:22",
      "dt_aktualizace": null
    }
  ],
  "pocet_priloh": 1,
  "celkova_velikost": 1234567
}
```

---

## 🚨 Error Handling

```javascript
try {
  await uploadInvoiceAttachment25({...});
} catch (error) {
  // Error message je již normalizovaný
  console.error(error.message);
  
  // Možné chyby:
  // - "Chybí přístupový token nebo uživatelské jméno"
  // - "Chybí ID faktury"
  // - "Chybí soubor k nahrání"
  // - "Soubor je příliš velký"
  // - "Nepodporovaný formát souboru"
  // - atd.
}
```

---

## 🎯 Props Reference

### InvoiceAttachmentsSection

| Prop | Type | Required | Default | Popis |
|------|------|----------|---------|-------|
| `fakturaId` | number/string | ✅ Yes | - | ID faktury |
| `objednavkaId` | number/string | ✅ Yes | - | ID objednávky |
| `readOnly` | boolean | No | false | Jen pro čtení? |
| `defaultCollapsed` | boolean | No | false | Výchozí stav (sbaleno?) |
| `onAttachmentsChange` | function | No | - | Callback při změně |

### InvoiceAttachmentUploadButton

| Prop | Type | Required | Default | Popis |
|------|------|----------|---------|-------|
| `onUpload` | function | ✅ Yes | - | Callback při uploadu |
| `disabled` | boolean | No | false | Zakázat? |
| `maxFileSize` | number | No | 10MB | Max velikost |
| `acceptedTypes` | array | No | [...] | Povolené typy |

### InvoiceAttachmentItem

| Prop | Type | Required | Default | Popis |
|------|------|----------|---------|-------|
| `attachment` | object | ✅ Yes | - | Data přílohy |
| `onDownload` | function | ✅ Yes | - | Download callback |
| `onDelete` | function | ✅ Yes | - | Delete callback |
| `readOnly` | boolean | No | false | Jen pro čtení? |
| `showUploader` | boolean | No | true | Zobrazit uživatele? |

---

## 💡 Tips & Tricks

### 1. Cached přílohy

```javascript
// InvoiceAttachmentsSection automaticky cachuje přílohy
// Nemusíš ručně spravovat state
```

### 2. ISDOC auto-detekce

```javascript
// ISDOC se detekuje automaticky podle přípony
// Typ "ISDOC" se nastaví automaticky pokud file.name končí na .isdoc
```

### 3. Read-only režim

```javascript
// V read-only režimu:
// - Není upload button
// - Není delete button
// - Download funguje normálně
<InvoiceAttachmentsSection
  fakturaId={faktura.id}
  objednavkaId={objednavkaId}
  readOnly={currentPhase >= 7} // Dokončené objednávky
/>
```

### 4. Multiple faktury

```javascript
// Každá faktura má své přílohy
{faktury.map(faktura => (
  <div key={faktura.id}>
    <h3>Faktura {faktura.fa_cislo_vema}</h3>
    <InvoiceAttachmentsSection
      fakturaId={faktura.id}
      objednavkaId={objednavkaId}
    />
  </div>
))}
```

---

## 📞 Support

- **Dokumentace:** `docs/FAKTURY-PRILOHY-FRONTEND-IMPLEMENTATION.md`
- **Backend API:** `docs/FAKTURY-PRILOHY-BACKEND-API.md`
- **UI/UX Design:** `docs/FAKTURY-PRILOHY-UI-UX-DESIGN.md`

---

**Vytvořeno:** 27. října 2025  
**Verze:** 1.0  
**Status:** Production Ready
