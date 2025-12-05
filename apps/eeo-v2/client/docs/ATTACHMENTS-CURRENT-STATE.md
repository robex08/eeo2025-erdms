# 📎 Současný stav příloh - Mapování před Order V2 API

**Datum:** 30. října 2025  
**Status:** ⏳ Čekáme na nové BE API pro Order V2

---

## 🎯 Přehled současného stavu

### 1. **PŘÍLOHY OBJEDNÁVKY** (OrderForm25.js)

#### Workflow uploadu:
```
1. Výběr souboru → handleFileUpload() [řádek 9566]
2. Validace (typ, velikost)
3. Status: 'pending_classification' - čeká na výběr klasifikace
4. Uživatel vybere klasifikace z <select>
5. Automatický upload → uploadFileToServer25() [řádek ~9766]
6. Status: 'uploaded' + serverId
```

#### Klíčové funkce:
- **handleFileUpload()** - Line 9566
  - Přidá soubory do lokálního state
  - Status: `'pending_classification'`
  - Validace: `isAllowedFileType25()`, `isAllowedFileSize25()`
  - Duplicita: `checkDuplicateFileName()`

- **updateFileKlasifikace()** - Line ~9660
  - Uživatel vybere klasifikaci
  - Pokud má soubor `serverId` → UPDATE v DB
  - Pokud nemá `serverId` → UPLOAD na server

- **uploadFileToServer25()** - Line ~9766
  - Volá API: `uploadAttachment25()`
  - Parametry: `objednavka_id`, `typ_prilohy`, `file`, `systemovy_nazev`
  - Vrací: `attachment_id`, `guid`

- **loadAttachmentsSmartly()** - Line 10092
  - Sloučí DB přílohy + lokální neuložené
  - Volá se po otevření sekce příloh
  - Automatická sync kontrola

- **fetchAttachmentsFromAPI()** - Line 10357
  - Volá API: `listAttachments25()`
  - Parametry: `objednavka_id`
  - Vrací: pole `attachments[]`

#### API funkce (api25orders.js):
```javascript
// Upload přílohy
uploadAttachment25({
  token,
  username,
  objednavka_id,      // ✅ ID objednávky
  typ_prilohy,        // ✅ Klasifikace
  file,               // ✅ File object
  systemovy_nazev     // ✅ GUID název
})
// Endpoint: orders25/attachments/upload
// Response: { status: 'ok', attachment_id, guid, ... }

// Seznam příloh
listAttachments25({
  token,
  username,
  objednavka_id       // ✅ ID objednávky
})
// Endpoint: orders25/attachments/list
// Response: { status: 'ok', attachments: [...] }

// Smazání přílohy
deleteAttachment25({
  token,
  username,
  attachment_id       // ✅ ID přílohy
})
// Endpoint: orders25/attachments/delete
```

#### Struktura attachmentu v FE:
```javascript
{
  id: "client_guid_123",           // Lokální ID
  serverId: 456,                    // DB ID (po uploadu)
  guid: "server_guid_789",          // Server GUID
  name: "faktura.pdf",              // Originální název
  systemovy_nazev: "uuid.pdf",      // GUID název na serveru
  size: 123456,                     // Velikost v B
  type: "application/pdf",          // MIME type
  klasifikace: "FAKTURA",           // Typ přílohy
  status: "uploaded",               // 'pending_classification' | 'uploading' | 'uploaded'
  uploadDate: "2025-10-30...",      // Datum
  file: File,                       // File object (před uploadem)
  serverId: null,                   // Až po uploadu
  fromServer: false                 // Flag
}
```

---

### 2. **PŘÍLOHY FAKTUR** (InvoiceAttachmentsCompact.js)

#### Workflow uploadu:
```
1. Výběr souboru → handleFileUpload() [řádek ~515]
2. Validace (typ, velikost)
3. ISDOC detekce → dialog pro parsing
4. Status: 'pending_classification'
5. Automatický upload při změně fakturaId
6. Status: 'uploaded' + serverId
```

#### Klíčové funkce:
- **handleFileUpload()** - Line ~515
  - ISDOC detekce + parsing dialog
  - Status: `'pending_classification'`
  - Validace: `isAllowedInvoiceFileType()`, `isAllowedInvoiceFileSize()`

- **useEffect auto-upload** - Line ~450
  - Sleduje změnu `fakturaId`
  - Pokud se změní z `temp-XXX` na reálné ID → upload pending příloh
  - Volá `uploadInvoiceAttachment25()`

- **loadAttachmentsFromServer()** - Line ~460
  - Volá API: `listInvoiceAttachments25()`
  - Parametry: `faktura_id`

#### API funkce (api25invoices.js):
```javascript
// Upload přílohy faktury
uploadInvoiceAttachment25({
  token,
  username,
  faktura_id,         // ✅ ID faktury
  objednavka_id,      // ✅ ID objednávky
  typ_prilohy,        // ✅ Typ (FAKTURA, DOKLAD, ...)
  file                // ✅ File object
})
// Endpoint: invoices25/attachments/upload
// Response: { status: 'ok', priloha: { id, ... } }

// Seznam příloh faktury
listInvoiceAttachments25({
  token,
  username,
  faktura_id          // ✅ ID faktury
})
// Endpoint: invoices25/attachments/by-invoice
// Response: { status: 'ok', prilohy: [...] }

// Smazání přílohy faktury
deleteInvoiceAttachment25({
  token,
  username,
  priloha_id          // ✅ ID přílohy
})
// Endpoint: invoices25/attachments/delete
```

#### Struktura attachment faktury:
```javascript
{
  id: "client_guid_123",           // Lokální ID
  serverId: 789,                    // DB ID (po uploadu)
  name: "faktura.pdf",              // Originální název
  size: 123456,                     // Velikost v B
  type: "application/pdf",          // MIME type
  klasifikace: "FAKTURA",           // Typ přílohy
  faktura_typ_nazev: "Faktura",     // Název typu pro zobrazení
  status: "uploaded",               // 'pending_classification' | 'uploading' | 'uploaded'
  uploadDate: "2025-10-30...",      // Datum
  je_isdoc: false,                  // ISDOC flag
  file: File                        // File object (před uploadem)
}
```

---

## 🔄 Rozdíly mezi Objednávkou a Fakturou

| Vlastnost | Objednávka | Faktura |
|-----------|-----------|---------|
| **Klasifikace** | Manuální výběr před uploadem | Automatická (FAKTURA) |
| **ISDOC** | ❌ Není | ✅ Auto-detekce + parsing |
| **Auto-upload** | Po výběru klasifikace | Po změně fakturaId z temp→real |
| **GUID název** | `systemovy_nazev` (předgenerovaný) | ❌ Není (generuje BE) |
| **API endpoint** | `orders25/attachments/*` | `invoices25/attachments/*` |
| **Temp ID faktury** | ❌ Není | ✅ Temp ID → real ID workflow |

---

## ⚠️ Co čeká na nové Order V2 API

### Předpokládané změny:

1. **Sjednocení endpointů**
   - `orderV2/attachments/upload`
   - `orderV2/attachments/list`
   - `orderV2/attachments/delete`
   - `orderV2/invoices/attachments/upload`
   - `orderV2/invoices/attachments/list`

2. **Nová struktura požadavků**
   ```javascript
   // Pravděpodobně:
   {
     token,
     username,
     order_id,          // Místo objednavka_id
     attachment_type,   // Místo typ_prilohy
     file
   }
   ```

3. **Nová struktura odpovědí**
   ```javascript
   // Možná:
   {
     status: 'success',  // Místo 'ok'
     data: {
       attachment: {
         id,
         guid,
         // ...
       }
     }
   }
   ```

---

## 📋 Checklist pro migraci na Order V2 API

### Frontend:
- [ ] Aktualizovat API funkce v `apiOrderV2.js`
- [ ] Změnit parametry: `objednavka_id` → `order_id` (?)
- [ ] Změnit status check: `status === 'ok'` → `status === 'success'` (?)
- [ ] Aktualizovat strukturu response handlingu
- [ ] Otestovat upload objednávky příloh
- [ ] Otestovat upload faktur příloh
- [ ] Otestovat načítání příloh
- [ ] Otestovat mazání příloh
- [ ] Otestovat ISDOC parsing workflow

### Backend:
- [ ] Potvrdit endpoint paths
- [ ] Potvrdit strukturu request body
- [ ] Potvrdit strukturu response
- [ ] Potvrdit error handling
- [ ] Potvrdit file size limits
- [ ] Potvrdit MIME type validation

---

## 🔍 Klíčové soubory k úpravě

1. **src/services/apiOrderV2.js** - Nové API funkce pro V2
2. **src/forms/OrderForm25.js** - Úprava volání API (řádky ~9566, ~9766, ~10092)
3. **src/components/invoices/InvoiceAttachmentsCompact.js** - Úprava API calls (~410, ~465)
4. **src/services/api25orders.js** - Možná deprecated po V2 migraci
5. **src/services/api25invoices.js** - Možná deprecated po V2 migraci

---

## 📝 Poznámky

- ✅ Současný systém funguje s Orders25 API
- ⏳ Čekáme na specifikaci Order V2 API od BE týmu
- 🎯 Cíl: Zachovat funkcionalitu, modernizovat API calls
- 🔧 Refactoring bude lokalizovaný (hlavně API layer)
- 🧪 Kritické je testování ISDOC workflow pro faktury

---

**Next Steps:**
1. Počkat na BE specifikaci Order V2 API
2. Vytvořit nové funkce v `apiOrderV2.js`
3. Postupně migrovat jeden endpoint po druhém
4. Testovat každou změnu izolovaně
