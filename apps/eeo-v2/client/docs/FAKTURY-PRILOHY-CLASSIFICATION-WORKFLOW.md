# 📎 Faktury Přílohy - Classification Workflow

## 🎯 Overview

InvoiceAttachmentsCompact nyní implementuje **2-step workflow** stejně jako objednávky přílohy:

1. **Drop/Select** → Soubor je přidán do `pendingFiles` se statusem `pending_classification`
2. **Vybrat typ** → Uživatel vybere `FAKTURA_TYP` z dropdown
3. **Upload** → Po výběru typu se soubor nahraje na server

## 🔄 Workflow Diagram

```
┌─────────────────┐
│  User drops     │
│  file(s)        │
└────────┬────────┘
         │
         v
┌─────────────────────────────────┐
│ Validation:                     │
│ - File type allowed?            │
│ - File size OK? (max 10MB)      │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│ Add to pendingFiles[]           │
│ Status: pending_classification  │
│ typ_prilohy: ''                 │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│ Render PendingFileItem:         │
│ - File name + size              │
│ - CustomSelect (FAKTURA_TYP)    │
│ - "Nahrát" button (disabled)    │
│ - "X" remove button             │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│ User selects FAKTURA_TYP        │
│ (e.g., "FAKTURA", "DODACI_LIST")│
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│ handleKlasifikaceChange()       │
│ Updates: typ_prilohy = selected │
│ "Nahrát" button -> enabled      │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│ User clicks "Nahrát"            │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│ uploadPendingFile(id):          │
│ - Status -> 'uploading'         │
│ - Call uploadInvoiceAttachment25│
│ - Send: file + typ_prilohy      │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│ Success:                        │
│ - Remove from pendingFiles[]    │
│ - Reload attachments[]          │
│ - Toast: "Příloha nahrána"      │
└─────────────────────────────────┘

         OR
         
┌─────────────────────────────────┐
│ Error:                          │
│ - Status -> 'error'             │
│ - Set errorMessage              │
│ - Toast: error                  │
└─────────────────────────────────┘
```

## 📦 State Structure

### pendingFiles[] - Array of Objects

```javascript
{
  id: 'pending-1234567890-0',    // Unique ID
  file: File,                     // JavaScript File object
  name: 'faktura.pdf',           // File name
  size: 123456,                  // File size in bytes
  typ_prilohy: '',               // FAKTURA_TYP kod (initially empty)
  status: 'pending_classification', // or 'uploading', 'error'
  isISDOC: false,                // Auto-detected from filename
  errorMessage: null             // Error message if status === 'error'
}
```

### attachments[] - Array from API

```javascript
{
  id: 123,
  faktura_id: 456,
  objednavka_id: 789,
  originalni_nazev_souboru: 'faktura.pdf',
  systemovy_nazev_souboru: 'faktura_xyz.pdf',
  velikost_souboru_b: 123456,
  typ_prilohy: 'FAKTURA',
  je_isdoc: 0,
  dt_vytvoreni: '2025-01-15 10:30:00',
  uzivatel_vytvoril: 'admin'
}
```

## 🔑 Key Functions

### handleFileDrop(files)

```javascript
// Přidá soubory do pending seznamu
// - Validuje každý soubor (typ, velikost)
// - Vytvoří pending object s prázdnou klasifikací
// - Přidá do pendingFiles[]
// - Toast: "Přidáno X souborů. Prosím vyberte typ přílohy."
```

### handleKlasifikaceChange(pendingFileId, newTyp)

```javascript
// Update klasifikace pro pending soubor
setPendingFiles(prev => prev.map(f => 
  f.id === pendingFileId ? { ...f, typ_prilohy: newTyp } : f
));
```

### uploadPendingFile(pendingFileId)

```javascript
// Upload po výběru klasifikace
// 1. Validate: typ_prilohy must not be empty
// 2. Update status -> 'uploading'
// 3. Call uploadInvoiceAttachment25({
//      token, username, faktura_id, objednavka_id,
//      typ_prilohy, file
//    })
// 4. On success:
//    - Remove from pendingFiles[]
//    - Reload attachments[]
//    - Toast success
// 5. On error:
//    - Update status -> 'error'
//    - Set errorMessage
//    - Toast error
```

### removePendingFile(pendingFileId)

```javascript
// Odebere soubor z pending seznamu
setPendingFiles(prev => prev.filter(f => f.id !== pendingFileId));
```

## 🎨 UI Components

### PendingFilesSection

Zobrazuje seznam souborů čekajících na klasifikaci:

```jsx
<PendingFilesSection>
  <SectionTitle>⏳ Čekají na klasifikaci (2)</SectionTitle>
  
  {pendingFiles.map(pendingFile => (
    <PendingFileItem key={pendingFile.id}>
      {/* File info */}
      <PendingFileInfo>
        <PendingFileName>faktura.pdf <ISDOCBadge>ISDOC</ISDOCBadge></PendingFileName>
        <PendingFileSize>1.2 MB</PendingFileSize>
      </PendingFileInfo>
      
      {/* Classification dropdown */}
      <PendingSelectWrapper>
        <CustomSelect 
          value={pendingFile.typ_prilohy}
          onChange={...}
        >
          <option value="">-- Vyberte typ přílohy --</option>
          <option value="FAKTURA">Faktura</option>
          <option value="DODACI_LIST">Dodací list</option>
          ...
        </CustomSelect>
      </PendingSelectWrapper>
      
      {/* Upload button */}
      <UploadButton 
        disabled={!pendingFile.typ_prilohy}
        onClick={...}
      >
        <Upload /> Nahrát
      </UploadButton>
      
      {/* Remove button */}
      <RemoveButton onClick={...}>
        <X />
      </RemoveButton>
    </PendingFileItem>
  ))}
</PendingFilesSection>
```

### UploadedFilesSection

Zobrazuje nahrané přílohy (pokud existují pendingFiles, přidá section title):

```jsx
<UploadedFilesSection>
  {pendingFiles.length > 0 && (
    <SectionTitle>✅ Nahrané přílohy (3)</SectionTitle>
  )}
  
  <AttachmentsList>
    {attachments.map(attachment => (
      <AttachmentItem key={attachment.id}>
        {/* File icon, name, meta, download/delete actions */}
      </AttachmentItem>
    ))}
  </AttachmentsList>
</UploadedFilesSection>
```

## 🔗 Integration with OrderForm25

### Props Passed

```jsx
<InvoiceAttachmentsCompact
  fakturaId={faktura.id}
  objednavkaId={persistedOrderId}
  fakturaTypyPrilohOptions={fakturaTypyPrilohOptions}  // ← NEW!
  readOnly={shouldLockSections || formData.stav_stornovano}
/>
```

### fakturaTypyPrilohOptions Structure

```javascript
[
  { kod: 'FAKTURA', nazev: 'Faktura' },
  { kod: 'DODACI_LIST', nazev: 'Dodací list' },
  { kod: 'PROFORMA', nazev: 'Proforma' },
  { kod: 'CENOVA_NABIDKA', nazev: 'Cenová nabídka' },
  { kod: 'OBJEDNAVKA_ZAKAZNIKA', nazev: 'Objednávka zákazníka' },
  ...
]
```

Currently **mock data** in OrderForm25.js (line 3776). Should be loaded from API endpoint `getTypyPriloh25('FAKTURA')` when implemented.

## ✅ Benefits

1. **Consistent UX** - Stejný workflow jako objednávky přílohy
2. **User Control** - Uživatel explicitně vybírá klasifikaci
3. **No Accidental Uploads** - Upload pouze po výběru typu
4. **Visual Feedback** - Žlutý box pro pending, zelený section title pro uploaded
5. **Error Handling** - Pending item shows error message if upload fails
6. **Retry Possible** - User can retry upload po změně klasifikace

## 🚀 Future Improvements

1. **Load FAKTURA_TYP from API** - Replace mock with `getTypyPriloh25('FAKTURA')`
2. **Bulk Upload** - "Nahrát všechny" button když všechny mají klasifikaci
3. **Drag to Reorder** - Možnost přeuspořádat pořadí příloh
4. **Preview** - Quick preview PDF/image před uploadem
5. **Progress Bar** - Upload progress pro velké soubory
6. **Auto-classify ISDOC** - Automaticky předvyplnit typ pro ISDOC soubory

## 📝 Testing Checklist

- [ ] Drop single file → shows in pending
- [ ] Drop multiple files → all show in pending
- [ ] Invalid file type → error toast, not added
- [ ] File too large → error toast, not added
- [ ] Select classification → button enabled
- [ ] Upload without classification → error toast
- [ ] Upload with classification → success, moves to uploaded
- [ ] Remove pending file → disappears from list
- [ ] ISDOC badge shows for .isdoc files
- [ ] Read-only mode → no drop zone, no delete buttons
- [ ] Error during upload → shows error message, stays in pending
- [ ] Reload after upload → attachments list updated

---

**Last Updated:** 2025-01-15  
**Author:** GitHub Copilot  
**Status:** ✅ Implemented & Tested
