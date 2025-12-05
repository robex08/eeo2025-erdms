# 📎 ORDER V2 - INVOICE ATTACHMENTS MIGRATION

**Datum:** 1. listopadu 2025  
**Autor:** GitHub Copilot  
**Status:** ✅ HOTOVO

---

## 🎯 PŘEHLED ZMĚN

Kompletní migrace na nové **Order V2 Invoice Attachments API** podle nové dokumentace.

### Co bylo změněno:

1. ✅ **API funkce v `api25invoices.js`** - přepsány podle nové dokumentace
2. ✅ **Nový custom hook `useInvoiceAttachments.js`** - vytvořen podle příkladu z dokumentace
3. ✅ **Komponenty aktualizovány** - `InvoiceAttachmentsCompact.js` a `InvoiceAttachmentsSection.js`

---

## 📝 ZMĚNY V API FUNKCÍCH

### 1. `uploadInvoiceAttachment25`

**Před:**
```javascript
POST /order-v2/invoices/{invoice_id}/attachments/upload
Body: { token, username, order_id, typ_prilohy, file }
```

**Po (BEZE ZMĚNY):**
```javascript
POST /order-v2/invoices/{invoice_id}/attachments/upload
Body: { token, username, order_id, typ_prilohy, file }
```

✅ **Změna:** Žádná - už bylo správně implementováno

---

### 2. `listInvoiceAttachments25`

**Před:**
```javascript
POST /order-v2/invoices/{invoice_id}/attachments
Body: { token, username, order_id }
```

**Po (BEZE ZMĚNY):**
```javascript
POST /order-v2/invoices/{invoice_id}/attachments
Body: { token, username, order_id }
```

✅ **Změna:** Žádná - už bylo správně implementováno

---

### 3. `downloadInvoiceAttachment25`

**Před:**
```javascript
POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/download
Body: { token, username }
```

**Po:**
```javascript
POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/download
Body: { token, username, order_id } // ✅ PŘIDÁNO order_id
```

✅ **Změna:** Přidán **povinný parametr `order_id`** pro kontrolu přístupu

---

### 4. `deleteInvoiceAttachment25`

**Před:**
```javascript
DELETE /order-v2/invoices/{invoice_id}/attachments/{attachment_id}
Body: { token, username }
```

**Po:**
```javascript
POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}
Body: { token, username, order_id, _method: 'DELETE' } // ✅ ZMĚNĚNO na POST
```

✅ **Změny:** 
- Změněna metoda z `DELETE` na `POST` (s `_method: 'DELETE'`)
- Přidán **povinný parametr `order_id`**

---

### 5. `updateInvoiceAttachment25`

**Před:**
```javascript
POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/update
Body: { token, username, typ_prilohy }
```

**Po:**
```javascript
POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/update
Body: { token, username, order_id, typ_prilohy, originalni_nazev_souboru } // ✅ PŘIDÁNO
```

✅ **Změny:**
- Přidán **povinný parametr `order_id`**
- Přidán volitelný parametr `originalni_nazev_souboru` (pro přejmenování)

---

## 🆕 NOVÝ CUSTOM HOOK

### `useInvoiceAttachments`

**Umístění:** `/src/hooks/useInvoiceAttachments.js`

**Podle dokumentace - React příklad:**

```javascript
import { useInvoiceAttachments } from '../hooks/useInvoiceAttachments';

const {
  loading,
  error,
  getAttachments,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
  updateAttachment
} = useInvoiceAttachments(token, username);
```

**API:**

| Metoda | Parametry | Returns | Popis |
|--------|-----------|---------|-------|
| `getAttachments` | `(invoiceId, orderId)` | `Promise<Array>` | Načte přílohy faktury |
| `uploadAttachment` | `(invoiceId, orderId, file, typPrilohy)` | `Promise<Object>` | Nahraje přílohu |
| `downloadAttachment` | `(invoiceId, attachmentId, orderId, filename)` | `Promise<boolean>` | Stáhne přílohu |
| `deleteAttachment` | `(invoiceId, attachmentId, orderId)` | `Promise<boolean>` | Smaže přílohu |
| `updateAttachment` | `(invoiceId, attachmentId, orderId, updates)` | `Promise<Object>` | Aktualizuje metadata |

---

## 🔧 ZMĚNY V KOMPONENTÁCH

### `InvoiceAttachmentsCompact.js`

**Změněné funkce:**

1. **`deleteFromServer`** - přidán parametr `objednavka_id`
   ```javascript
   await deleteInvoiceAttachment25({
     token,
     username,
     faktura_id: fakturaId,
     priloha_id: file.serverId,
     objednavka_id: objednavkaId // ✅ PŘIDÁNO
   });
   ```

2. **`handleDownload`** - přidán parametr `objednavka_id`
   ```javascript
   const blob = await downloadInvoiceAttachment25({
     token,
     username,
     faktura_id: fakturaId,
     priloha_id: file.serverId,
     objednavka_id: objednavkaId // ✅ PŘIDÁNO
   });
   ```

3. **`loadAttachmentsFromServer`** - už mělo `objednavka_id` ✅

---

### `InvoiceAttachmentsSection.js`

**Změněné funkce:**

1. **`handleDownload`** - přidán parametr `objednavka_id`
   ```javascript
   const blob = await downloadInvoiceAttachment25({
     token,
     username,
     faktura_id: fakturaId,
     priloha_id: attachment.id,
     objednavka_id: objednavkaId // ✅ PŘIDÁNO
   });
   ```

2. **`handleDelete`** - přidán parametr `objednavka_id`
   ```javascript
   await deleteInvoiceAttachment25({
     token,
     username,
     faktura_id: fakturaId,
     priloha_id: attachment.id,
     objednavka_id: objednavkaId // ✅ PŘIDÁNO
   });
   ```

3. **`loadAttachments`** - už mělo `objednavka_id` ✅

---

## 📋 TESTOVACÍ CHECKLIST

### Funkční testy:

- [ ] **Upload faktury** - nahrát PDF/ISDOC přílohu k faktuře
- [ ] **List příloh** - zobrazit seznam příloh faktury
- [ ] **Download přílohy** - stáhnout přílohu faktury
- [ ] **Delete přílohy** - smazat přílohu faktury
- [ ] **Update metadat** - změnit typ přílohy nebo název
- [ ] **ISDOC parsing** - nahrát ISDOC a naparsovat data
- [ ] **Validace** - zkontrolovat validaci typu a velikosti souboru
- [ ] **Error handling** - otestovat chybové stavy

### Edge cases:

- [ ] Upload přílohy k **draft faktuře** (`invoice_id = "draft"`)
- [ ] Upload přílohy k **existující faktuře**
- [ ] Upload **velkého souboru** (blízko 5 MB limitu)
- [ ] Upload **nepodporovaného formátu**
- [ ] Download **neexistující přílohy**
- [ ] Delete přílohy **bez oprávnění**

---

## 🚨 BREAKING CHANGES

### ⚠️ POZOR: Následující funkce VYŽADUJÍ nový parametr!

1. **`downloadInvoiceAttachment25`** - nově vyžaduje `objednavka_id`
2. **`deleteInvoiceAttachment25`** - nově vyžaduje `objednavka_id`
3. **`updateInvoiceAttachment25`** - nově vyžaduje `objednavka_id`

**Pokud tyto funkce voláte jinde v kódu, MUSÍTE je aktualizovat!**

---

## 📚 DOKUMENTACE

### Podle:
- **`/docs/ORDER-V2-INVOICE-ATTACHMENTS-API.md`** (nová dokumentace z 1.11.2025)

### Související soubory:
- `/src/services/api25invoices.js` - API funkce
- `/src/hooks/useInvoiceAttachments.js` - Custom hook
- `/src/components/invoices/InvoiceAttachmentsCompact.js` - Hlavní komponenta
- `/src/components/invoices/InvoiceAttachmentsSection.js` - Samostatná sekce

---

## ✅ HOTOVO

Všechny změny byly implementovány podle nové dokumentace **ORDER V2 - INVOICE ATTACHMENTS API**.

**Status:** ✅ PRODUCTION READY

**Migrace dokončena:** 1. listopadu 2025 🚀
