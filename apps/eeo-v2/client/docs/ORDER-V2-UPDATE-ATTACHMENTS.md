# Order V2 Attachment Update - Frontend Implementace

## 📋 PŘEHLED

Dokumentace pro frontend implementaci **UPDATE** endpointů pro přílohy objednávek a faktur v Order V2 API.

**Implementováno:** 31. října 2025  
**Verze API:** v2  
**Status:** ✅ Production Ready

---

## 🎯 IMPLEMENTOVANÉ ENDPOINTY

### 1. Update Order Attachment
```
PUT /api.eeo/order-v2/{order_id}/attachments/{attachment_id}
```

### 2. Update Invoice Attachment
```
PUT /api.eeo/order-v2/invoices/{invoice_id}/attachments/{attachment_id}/update
```

---

## 💻 FRONTEND IMPLEMENTACE

### API Client Functions

#### `updateOrderAttachment()`

**Umístění:** `/src/services/apiOrderV2.js`

```javascript
import { updateOrderAttachment } from '../services/apiOrderV2';

/**
 * Aktualizace metadat přílohy objednávky
 * 
 * @param {number|string} orderId - ID objednávky (číselné nebo draft_*)
 * @param {number} attachmentId - ID přílohy objednávky
 * @param {string} username - Uživatelské jméno
 * @param {string} token - Autentizační token
 * @param {Object} updates - Objekt s aktualizacemi
 * @param {string} [updates.type] - Nový typ přílohy
 * @param {string} [updates.original_name] - Nový název souboru
 * 
 * @returns {Promise<Object>} Response s aktualizovanými daty přílohy
 */

// Příklad 1: Aktualizace typu přílohy
try {
  const result = await updateOrderAttachment(
    11252,        // orderId
    123,          // attachmentId
    'admin',      // username
    token,        // token
    {
      type: 'SMLOUVA'
    }
  );
  
  console.log('✅ Updated:', result.data);
  // Response obsahuje: attachment_id, order_id, guid, original_name, type, 
  //                    file_size, uploaded_by, created_at, updated_at
} catch (error) {
  console.error('❌ Error:', error.message);
}

// Příklad 2: Aktualizace názvu souboru
try {
  const result = await updateOrderAttachment(
    11252,
    123,
    'admin',
    token,
    {
      original_name: 'nova_smlouva.pdf'
    }
  );
} catch (error) {
  console.error('Error:', error.message);
}

// Příklad 3: Aktualizace obou hodnot
try {
  const result = await updateOrderAttachment(
    11252,
    123,
    'admin',
    token,
    {
      type: 'SMLOUVA',
      original_name: 'smlouva_final.pdf'
    }
  );
} catch (error) {
  console.error('Error:', error.message);
}
```

#### `updateInvoiceAttachment()`

**Umístění:** `/src/services/apiOrderV2.js`

```javascript
import { updateInvoiceAttachment } from '../services/apiOrderV2';

/**
 * Aktualizace metadat přílohy faktury
 * 
 * @param {number|string} invoiceId - ID faktury (číselné nebo draft_*)
 * @param {number} attachmentId - ID přílohy faktury
 * @param {string} username - Uživatelské jméno
 * @param {string} token - Autentizační token
 * @param {Object} updates - Objekt s aktualizacemi
 * @param {string} [updates.type] - Nový typ přílohy (např. 'FAKTURA_VYUCTOVANI')
 * @param {string} [updates.original_name] - Nový název souboru
 * 
 * @returns {Promise<Object>} Response s aktualizovanými daty přílohy
 */

// Příklad 1: Aktualizace typu přílohy faktury
try {
  const result = await updateInvoiceAttachment(
    456,          // invoiceId
    789,          // attachmentId
    'admin',      // username
    token,        // token
    {
      type: 'FAKTURA_VYUCTOVANI'
    }
  );
  
  console.log('✅ Updated:', result.data);
  // Response obsahuje: attachment_id, invoice_id, invoice_number, order_id, 
  //                    guid, original_name, type, file_size, uploaded_by,
  //                    created_at, updated_at
} catch (error) {
  console.error('❌ Error:', error.message);
}

// Příklad 2: Aktualizace názvu souboru faktury
try {
  const result = await updateInvoiceAttachment(
    456,
    789,
    'admin',
    token,
    {
      original_name: 'faktura_opravena.pdf'
    }
  );
} catch (error) {
  console.error('Error:', error.message);
}

// Příklad 3: Aktualizace obou hodnot
try {
  const result = await updateInvoiceAttachment(
    456,
    789,
    'admin',
    token,
    {
      type: 'FAKTURA_FINAL',
      original_name: 'faktura_final_2025.pdf'
    }
  );
} catch (error) {
  console.error('Error:', error.message);
}
```

---

## 🎨 UI KOMPONENTY

### React Hook Example

```javascript
import { useState } from 'react';
import { updateOrderAttachment, updateInvoiceAttachment } from '../services/apiOrderV2';

function useAttachmentUpdate(type = 'order') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const updateAttachment = async (id, attachmentId, username, token, updates) => {
    setLoading(true);
    setError(null);
    
    try {
      const updateFn = type === 'order' ? updateOrderAttachment : updateInvoiceAttachment;
      const result = await updateFn(id, attachmentId, username, token, updates);
      
      if (result.status === 'ok') {
        setData(result.data);
        return result.data;
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (err) {
      const errorMsg = err.message || 'Neznámá chyba';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateAttachment, loading, error, data };
}

// Použití v komponentě
function AttachmentEditor({ orderId, attachmentId, currentType, currentName }) {
  const { username, token } = useContext(AuthContext);
  const { updateAttachment, loading, error } = useAttachmentUpdate('order');
  const [type, setType] = useState(currentType);
  const [name, setName] = useState(currentName);

  const handleUpdate = async () => {
    try {
      const updates = {};
      if (type !== currentType) updates.type = type;
      if (name !== currentName) updates.original_name = name;
      
      if (Object.keys(updates).length === 0) {
        alert('Žádné změny k uložení');
        return;
      }

      await updateAttachment(orderId, attachmentId, username, token, updates);
      alert('✅ Příloha aktualizována');
    } catch (err) {
      alert(`❌ Chyba: ${err.message}`);
    }
  };

  return (
    <div>
      <input 
        value={type} 
        onChange={(e) => setType(e.target.value)} 
        placeholder="Typ přílohy"
      />
      <input 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        placeholder="Název souboru"
      />
      <button onClick={handleUpdate} disabled={loading}>
        {loading ? 'Ukládám...' : 'Aktualizovat'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### Inline Edit Pattern

```javascript
function AttachmentListItem({ attachment, orderId, onUpdate }) {
  const { username, token } = useContext(AuthContext);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(attachment.original_name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (newName === attachment.original_name) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await updateOrderAttachment(
        orderId,
        attachment.serverId || attachment.id,
        username,
        token,
        { original_name: newName }
      );
      
      onUpdate({ ...attachment, original_name: newName });
      setEditing(false);
      showToast('✅ Název aktualizován', 'success');
    } catch (error) {
      showToast(`❌ Chyba: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="attachment-item">
      {editing ? (
        <input 
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleSave}
          onKeyPress={(e) => e.key === 'Enter' && handleSave()}
          disabled={saving}
          autoFocus
        />
      ) : (
        <span onClick={() => setEditing(true)}>
          {attachment.original_name}
        </span>
      )}
      {saving && <span>💾 Ukládám...</span>}
    </div>
  );
}
```

---

## 🧪 TESTOVÁNÍ

### Test Panel

**Umístění:** DEBUG menu → Order V2 Test Panel

#### Test Order Attachment Update
1. Zadej Order ID (např. `11252`)
2. Zadej Attachment ID (např. `123`)
3. Klikni na **"✏️ UPDATE Order Attachment"**
4. Backend aktualizuje typ na `SMLOUVA` a název na `updated_file_[timestamp].pdf`

#### Test Invoice Attachment Update
1. Zadej Invoice ID (např. `456`)
2. Zadej Attachment ID (např. `789`)
3. Klikni na **"✏️ UPDATE Invoice Attachment"**
4. Backend aktualizuje typ na `FAKTURA_VYUCTOVANI` a název na `updated_invoice_[timestamp].pdf`

### Console Testing

```javascript
// V browser console:

// Test 1: Update order attachment type
const token = localStorage.getItem('api_token');
const username = localStorage.getItem('username');

const { updateOrderAttachment } = await import('./services/apiOrderV2');

const result = await updateOrderAttachment(
  11252,  // orderId
  123,    // attachmentId
  username,
  token,
  { type: 'SMLOUVA' }
);

console.log('Result:', result);

// Test 2: Update invoice attachment name
const { updateInvoiceAttachment } = await import('./services/apiOrderV2');

const result2 = await updateInvoiceAttachment(
  456,    // invoiceId
  789,    // attachmentId
  username,
  token,
  { original_name: 'test_faktura.pdf' }
);

console.log('Result:', result2);
```

---

## 📤 RESPONSE FORMÁT

### Success Response (Order Attachment)

```json
{
  "status": "ok",
  "data": {
    "attachment_id": 123,
    "order_id": 11252,
    "guid": "abc123-def456-ghi789",
    "original_name": "nova_smlouva.pdf",
    "type": "SMLOUVA",
    "file_size": 123456,
    "uploaded_by": 1,
    "created_at": "2025-10-30 14:30:00",
    "updated_at": "2025-10-31 10:15:00"
  },
  "message": "Metadata přílohy byla úspěšně aktualizována",
  "meta": {
    "version": "v2",
    "endpoint": "update-order-attachment",
    "timestamp": "2025-10-31T10:15:00+01:00"
  }
}
```

### Success Response (Invoice Attachment)

```json
{
  "status": "ok",
  "data": {
    "attachment_id": 789,
    "invoice_id": 456,
    "invoice_number": "FA2025001",
    "order_id": 11252,
    "guid": "xyz789-abc123-def456",
    "original_name": "faktura_opravena.pdf",
    "type": "FAKTURA_VYUCTOVANI",
    "file_size": 245678,
    "uploaded_by": 1,
    "created_at": "2025-10-30 14:30:00",
    "updated_at": "2025-10-31 10:15:00"
  },
  "message": "Metadata přílohy faktury byla úspěšně aktualizována",
  "meta": {
    "version": "v2",
    "endpoint": "update-invoice-attachment",
    "timestamp": "2025-10-31T10:15:00+01:00"
  }
}
```

### Error Responses

```json
// 400 - Bad Request
{
  "status": "error",
  "message": "Žádná data k aktualizaci"
}

// 401 - Unauthorized
{
  "status": "error",
  "message": "Neplatný nebo chybějící token"
}

// 404 - Not Found
{
  "status": "error",
  "message": "Příloha nebyla nalezena"
}
```

---

## 🔄 MIGRACE Z UPDATEATTACHMENT25

### Před (Orders25 API)

```javascript
// Starý endpoint
await fetch('/api.eeo/updateAttachment25', {
  method: 'POST',
  body: JSON.stringify({
    token: token,
    username: username,
    id: attachmentId,        // attachment ID
    klasifikace: 'FAKTURA'   // klasifikace
  })
});
```

### Po (Order V2 API)

```javascript
// Nový endpoint - ORDER attachment
await updateOrderAttachment(
  orderId,
  attachmentId,
  username,
  token,
  { type: 'SMLOUVA' }  // type (dříve klasifikace)
);

// Nový endpoint - INVOICE attachment
await updateInvoiceAttachment(
  invoiceId,
  attachmentId,
  username,
  token,
  { type: 'FAKTURA' }  // type (dříve klasifikace)
);
```

### Klíčové rozdíly

1. **Rozdělení endpointů:** Samostatné funkce pro order/invoice attachments
2. **URL struktura:** RESTful (`/order-v2/{id}/attachments/{id}`)
3. **Metoda:** `PUT` místo `POST`
4. **Parametr:** `type` místo `klasifikace`
5. **Response:** Bohatší struktura s meta informacemi
6. **Validace:** Kontrola vazby přílohy na objednávku/fakturu

---

## ⚙️ IMPLEMENTAČNÍ DETAILY

### Validace

**Frontend validace:**
- ✅ Kontrola povinných parametrů (orderId/invoiceId, attachmentId, username, token)
- ✅ Kontrola, že je zadána alespoň jedna aktualizace (type nebo original_name)
- ✅ Throw error při chybějících parametrech

**Backend validace:**
- ✅ Existence přílohy v databázi
- ✅ Vazba přílohy na správnou objednávku/fakturu
- ✅ Autentizace tokenu
- ✅ SQL injection ochrana

### Error Handling

```javascript
try {
  const result = await updateOrderAttachment(orderId, attachmentId, username, token, updates);
  
  if (result.status === 'ok') {
    // Success - aktualizuj UI
    showToast('✅ Příloha aktualizována', 'success');
    refreshAttachmentsList();
  } else {
    // Backend vrátil error status
    showToast(`❌ ${result.message}`, 'error');
  }
} catch (error) {
  // Network error nebo exception
  console.error('Update failed:', error);
  showToast(`❌ Chyba: ${error.message}`, 'error');
}
```

### Co se aktualizuje

- ✅ `original_name` - název souboru (pouze metadata, ne fyzický soubor)
- ✅ `type` - typ/klasifikace přílohy
- ✅ `updated_at` - automaticky nastaveno na NOW()

### Co se NEAKTUALIZUJE

- ❌ Fyzický soubor na disku
- ❌ `guid` - unikátní identifikátor
- ❌ `file_size` - velikost souboru
- ❌ `created_at` - datum vytvoření
- ❌ `uploaded_by` - původní nahrávač
- ❌ `order_id` / `invoice_id` - nelze přesunout přílohu

---

## ✅ CHECKLIST

### Implementace
- [x] `updateOrderAttachment()` funkce v apiOrderV2.js
- [x] `updateInvoiceAttachment()` funkce v apiOrderV2.js
- [x] Validace parametrů
- [x] Error handling
- [x] JSDoc dokumentace

### Testování
- [x] Test panel: Order Attachment Update button
- [x] Test panel: Invoice Attachment Update button
- [x] Console testing
- [x] Error scenarios testing

### Dokumentace
- [x] Příklady použití
- [x] Response formáty
- [x] Migrace z Orders25 API
- [x] UI komponenty examples

### TODO (Volitelné)
- [ ] Inline edit v AttachmentManager komponentě
- [ ] Bulk update funkcionalita
- [ ] History/audit log zobrazení
- [ ] Optimistic UI updates

---

## 📝 POZNÁMKY

### Bezpečnost
- Token autentizace povinná
- Validace vazby přílohy na správnou objednávku/fakturu
- Nesmí aktualizovat cizí přílohy

### Performance
- Aktualizuje pouze metadata (rychlé)
- Nezasahuje do fyzických souborů
- Optimalizováno pro jednotlivé updaty

### Kompatibilita
- PHP 5.6+ kompatibilní
- MySQL 5.5.43+ kompatibilní
- RESTful API design
- Konzistentní s ostatními Order V2 endpointy

---

## 📞 KONTAKT

Pro technické dotazy nebo problémy kontaktujte backend tým nebo RH.

**Frontend implementace:** 31. října 2025  
**Backend endpoint:** Již dostupný  
**Status:** ✅ Production Ready
