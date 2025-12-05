# ✅ Oprava: Dodatečné dokumenty - dropzone s prefixem dd-

**Datum:** 1. listopadu 2025  
**Status:** ✅ KOMPLETNÍ

## 🎯 Problém

Nová dropzona pro dodatečné dokumenty nefungovala správně:
- Po přetažení souborů se nezobrazovaly v sekci dodatečných dokumentů
- Soubory se ukládaly do databáze s prefixem `obj-` místo `dd-`
- Filtrace podle `file_prefix === 'dd-'` nefungovala, protože prefix nebyl nastaven při vytváření souboru

## 🔧 Řešení

### 1. **Nastavení prefixu při vytváření souboru**

**Soubor:** `src/forms/OrderForm25.js`  
**Funkce:** `handleDodatecneDokladyUpload`

```javascript
return {
  id: metadata.id,
  guid: metadata.guid,
  name: file.name,
  originalName: metadata.originalName,
  generatedName: metadata.generatedName,
  systemovy_nazev: metadata.systemovy_nazev,
  size: file.size,
  type: file.type,
  klasifikace: 'JINE', // ✅ Automatická klasifikace jako "JINE"
  file_prefix: 'dd-', // ✅ OPRAVA: Nastavit prefix hned při vytváření
  uploadDate: metadata.createdAt,
  status: 'pending_upload',
  file: file,
  uploadError: null,
  serverId: null,
  serverGuid: null,
  isDuplicate: !!duplicate,
  duplicateOf: duplicate?.id || null
};
```

**Co to řeší:**
- Soubor má `file_prefix: 'dd-'` hned od začátku
- Filtrování `attachments.filter(a => a.file_prefix === 'dd-')` nyní funguje správně

### 2. **Zlepšené mapování z API**

**Soubor:** `src/forms/OrderForm25.js`  
**Funkce:** `mapApiAttachmentToLocal`

```javascript
// ✅ OPRAVA: Preferuj file_prefix z API, pokud existuje
let filePrefix = attachment.file_prefix || 'obj-'; // Backend by měl vracet file_prefix

// Fallback: Extrahuj file_prefix ze systemového názvu (obj-xxx nebo dd-xxx)
if (!attachment.file_prefix) {
  const systemPath = attachment.system_path || attachment.systemovy_nazev || attachment.final_filename || '';
  const fileName = systemPath.split('/').pop() || systemPath;
  filePrefix = fileName.startsWith('dd-') ? 'dd-' : 'obj-';
}

console.log('🔍 [mapApiAttachmentToLocal] Detekce prefixu:', {
  attachmentId: attachment.id,
  apiPrefix: attachment.file_prefix,
  systemPath: attachment.system_path,
  finalFilename: attachment.final_filename,
  detectedPrefix: filePrefix
});
```

**Co to řeší:**
- Primárně se používá `file_prefix` přímo z API (pokud backend ho posílá)
- Fallback detekce ze systemového názvu souboru
- Podpora pro více variant názvů polí z API (`system_path`, `final_filename`)
- Konzolový výpis pro debugging

### 3. **Backend API - požadavky**

**Endpoint:** `POST /orders/{orderId}/attachments`

**Request parameters:**
```javascript
{
  file: [File],
  username: "...",
  token: "...",
  typ_prilohy: "JINE",
  file_prefix: "dd-"  // ✅ Klíčový parametr pro rozlišení
}
```

**Expected Response:**
```javascript
{
  "status": "ok",
  "data": {
    "attachment_id": 123,
    "order_id": 11256,
    "original_name": "faktura.pdf",
    "system_guid": "2025-11-01_abc123def",
    "file_prefix": "dd-",  // ✅ Backend by měl vracet file_prefix
    "final_filename": "dd-2025-11-01_abc123def.pdf",
    "file_size": 51200,
    "type": "JINE",
    "upload_path": "dd-2025-11-01_abc123def.pdf"
  }
}
```

**Co backend musí dělat:**
1. Přijmout parametr `file_prefix` v requestu
2. Použít tento prefix při generování `final_filename`
3. Vrátit `file_prefix` v response
4. Uložit prefix do databáze (pokud je v DB sloupec pro to)

## 📊 Jak to funguje

### Workflow uploadu dodatečného dokumentu:

1. **Uživatel přetáhne soubor do dropzony dodatečných dokumentů**
   ```javascript
   handleDodatecneDokladyDrop(e)
   ```

2. **Vytvoří se objekt souboru s `file_prefix: 'dd-'`**
   ```javascript
   handleDodatecneDokladyUpload(files)
   ```

3. **Soubor se přidá do state `attachments` a `formData.prilohy_dokumenty`**
   ```javascript
   setAttachments(prev => [...prev, ...newFiles]);
   ```

4. **Automaticky se spustí upload na server**
   ```javascript
   uploadFileToServer25(file.id, 'JINE', 'dd-')
   ```

5. **V2 API odešle request s parametrem `file_prefix: 'dd-'`**
   ```javascript
   uploadOrderAttachment(orderId, file, username, token, 'JINE', 'dd-')
   ```

6. **Backend uloží soubor s prefixem `dd-` a vrátí odpověď**

7. **Frontend aktualizuje state s `serverId` a `status: 'uploaded'`**
   - Prefix `file_prefix: 'dd-'` se zachovává díky spread operátoru

8. **UI zobrazuje soubory filtrované podle prefixu**
   ```javascript
   attachments.filter(a => a.file_prefix === 'dd-')
   ```

### Workflow načtení dodatečných dokumentů z API:

1. **Při načtení objednávky se zavolá `fetchAttachmentsFromAPI()`**

2. **Raw attachments se mapují pomocí `mapApiAttachmentToLocal()`**
   - Funkce detekuje prefix z `attachment.file_prefix` nebo ze systemového názvu

3. **Attachments se přidají do state s nastaveným prefixem**

4. **UI filtruje a zobrazuje správnou sekci podle prefixu**

## 🎨 UI - Zobrazení

### Sekce "Přílohy objednávky" (obj- prefix)
```javascript
{attachments && attachments.filter(a => !a.file_prefix || a.file_prefix === 'obj-').length > 0 && (
  // ... zobrazení obj- příloh
)}
```

### Sekce "Dodatečné dokumenty" (dd- prefix)
```javascript
{attachments && attachments.filter(a => a.file_prefix === 'dd-').length > 0 && (
  // ... zobrazení dd- příloh
)}
```

## ✅ Git commits

1. **BEFORE:** Záloha před opravou
   ```
   git commit -m "BEFORE: Fix dodatečné dokumenty dropzone dd- prefix"
   ```

2. **FIX:** Hlavní oprava
   ```
   git commit -m "FIX: Dodatečné dokumenty dropzone - nastavení dd- prefix při vytváření a mapování z API"
   ```

3. **COMPLETE:** Dokončení (žádné další změny)
   ```
   git commit -m "COMPLETE: Oprava dodatečných dokumentů - dd- prefix funguje od uploadu až po zobrazení"
   ```

## 🧪 Testování

### Scénář 1: Upload nového dodatečného dokumentu
1. Otevři existující objednávku (uloženou s ID)
2. Najdi sekci "Dodatečné dokumenty"
3. Přetáhni PDF soubor do dropzony
4. ✅ Soubor se zobrazí v sekci "Přidané dodatečné dokumenty"
5. ✅ Status: "Nahrávám..." → "✓ Nahráno"
6. ✅ Klasifikace: "Jiné" (lze změnit)

### Scénář 2: Reload objednávky s dodatečnými dokumenty
1. Otevři objednávku, která má dodatečné dokumenty
2. ✅ Dokumenty s `dd-` prefixem se zobrazí v sekci "Dodatečné dokumenty"
3. ✅ Dokumenty s `obj-` prefixem se zobrazí v sekci "Přílohy objednávky"

### Scénář 3: Změna klasifikace dodatečného dokumentu
1. V sekci "Dodatečné dokumenty" změň klasifikaci z "Jiné" na "Faktura"
2. ✅ Klasifikace se uloží
3. ✅ Soubor zůstane v sekci "Dodatečné dokumenty" (prefix `dd-` se nemění)

## 📝 Poznámky

### Backend requirements:
- ✅ Endpoint musí přijímat parametr `file_prefix`
- ✅ Endpoint by měl vracet `file_prefix` v response
- ✅ Backend musí generovat `final_filename` s prefixem (např. `dd-2025-11-01_abc.pdf`)

### Frontend změny:
- ✅ `handleDodatecneDokladyUpload` - nastavení prefixu při vytváření
- ✅ `mapApiAttachmentToLocal` - detekce prefixu z API nebo systemového názvu
- ✅ UI filtrace podle `file_prefix`

### Kompatibilita:
- ✅ Zachována zpětná kompatibilita s existujícími přílohami bez prefixu (fallback na `obj-`)
- ✅ Staré přílohy se automaticky označí jako `obj-` při načtení z API

## 🚀 Další možná vylepšení

1. **Backend DB:** Přidat sloupec `file_prefix` do tabulky příloh (pokud ještě není)
2. **API:** Vrátit `file_prefix` explicitně v response místo spoléhání se na detekci ze systemového názvu
3. **UI:** Přidat filtraci/vyhledávání příloh podle prefixu
4. **Validace:** Kontrola, že `dd-` přílohy mají správnou klasifikaci

---

**Status:** ✅ HOTOVO - Dodatečné dokumenty nyní fungují správně s prefixem `dd-`
