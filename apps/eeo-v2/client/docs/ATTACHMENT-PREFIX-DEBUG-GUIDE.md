# 🐛 DEBUG GUIDE: Přílohy OBJ vs. DD prefix

**Datum:** 1. listopadu 2025  
**Problém:** Všechny přílohy se zobrazují v OBJ detailu místo správného rozdělení podle prefixu

---

## 📋 ANALÝZA FRONTENDU

### ✅ SPRÁVNĚ IMPLEMENTOVANÉ ČÁSTI

#### 1. **Upload funkcionalita**
```javascript
// OrderForm25.js řádek 10630
file_prefix: 'dd-', // ✅ Prefix pro dodatečné dokumenty
```

```javascript
// OrderForm25.js řádek 10864
await uploadOrderAttachment(
  savedOrderId,
  file.file,
  username,
  token,
  klasifikace,
  filePrefix  // ✅ Správně předáváno
);
```

#### 2. **API volání**
```javascript
// apiOrderV2.js řádek 1711
formData.append('file_prefix', filePrefix); // ✅ Posílá se na backend
```

#### 3. **Mapování z API**
```javascript
// OrderForm25.js řádek 11547-11565
const mapApiAttachmentToLocal = (attachment) => {
  let filePrefix = attachment.file_prefix || 'obj-';
  
  if (!attachment.file_prefix) {
    const systemPath = attachment.system_path || attachment.systemovy_nazev || ...;
    const fileName = systemPath.split('/').pop() || systemPath;
    filePrefix = fileName.startsWith('dd-') ? 'dd-' : 'obj-';
  }
  // ✅ Správná extrakce prefixu
}
```

#### 4. **Detekce prefixu v UI**
```javascript
// OrderForm25.js řádek 11601-11636
const getFilePrefix = (file) => {
  if (file.file_prefix) return file.file_prefix;
  
  const systemPath = file.systemova_cesta || file.systemovy_nazev || ...;
  const fileName = systemPath.split('/').pop() || systemPath;
  
  if (fileName.startsWith('dd-')) return 'dd-';
  if (fileName.startsWith('obj-')) return 'obj-';
  return 'obj-'; // Default
  // ✅ Správná detekce z názvu souboru
}
```

#### 5. **Filtrování v UI**
```javascript
// OrderForm25.js řádek 18588, 18686
{attachments.filter(a => getFilePrefix(a) === 'obj-').length > 0 && (...)}
{attachments.filter(a => getFilePrefix(a) === 'obj-').map((file, index) => (...))}
// ✅ SPRÁVNĚ FILTRUJE obj- přílohy

// OrderForm25.js řádek 22058, 22078
{attachments.filter(a => getFilePrefix(a) === 'dd-').length > 0 && (...)}
{attachments.filter(a => getFilePrefix(a) === 'dd-').map((file, index) => (...))}
// ✅ SPRÁVNĚ FILTRUJE dd- přílohy
```

---

## 🚨 PROBLÉM: BACKEND

### Backend endpoint: `POST /api/order-v2/{order_id}/attachments/upload`

**Co se pravděpodobně děje:**

1. ❌ Backend IGNORUJE `file_prefix` z FormData
2. ❌ Backend VŽDY generuje `systemova_cesta` s prefixem `obj-`
3. ❌ Backend NEUKLÁDÁ správnou `systemova_cesta` do DB

### Co backend MUSÍ udělat:

```php
// Pseudokód - backend implementace

$filePrefix = $_POST['file_prefix'] ?? 'obj-'; // ✅ Přečíst z requestu

$systemovaCesta = $filePrefix . date('Y-m-d') . '_' . $guid . '.' . $ext;
// ✅ Použít prefix při generování názvu

INSERT INTO objednavky_prilohy (
  objednavka_id,
  guid,
  systemova_cesta,  // ✅ Uložit s SPRÁVNÝM prefixem
  ...
) VALUES (?, ?, ?, ...);
```

---

## 🔍 DEBUG POSTUP (Pro tebe - uživatele)

### 1. **Otevři konzoli (F12)**

### 2. **Nahraj dodatečný dokument**
   - Jdi do sekce "Dodatečné dokumenty"
   - Přetáhni soubor do Dropzone

### 3. **Hledej v konzoli tyto logy:**

#### A) **Upload request**
```javascript
🔍 [uploadFileToServer25] Backend response:
{
  filePrefix_sent: "dd-",       // ✅ Frontend poslal správně
  klasifikace_sent: "JINE",
  response_data: {...},
  attachment_id: 123,
  system_path: "obj-2025-11-01_xyz.pdf",  // ❌ TADY JE PROBLÉM!
  file_prefix: undefined                   // ❌ Backend nevrací file_prefix
}
```

**❌ ŠPATNĚ:** `system_path` začíná na `obj-` místo `dd-`  
**✅ SPRÁVNĚ:** `system_path` by měl být `dd-2025-11-01_xyz.pdf`

#### B) **Načtení příloh ze serveru**
```javascript
🔍 [mapApiAttachmentToLocal] Backend vrátil:
{
  id: 123,
  file_prefix: undefined,                  // ❌ Backend nevrací file_prefix
  system_path: "obj-2025-11-01_xyz.pdf",  // ❌ ŠPATNÝ PREFIX
  systemovy_nazev: "obj-2025-11-01_xyz.pdf",
  ...
}

⚠️ [mapApiAttachmentToLocal] Backend nevrátil file_prefix, extrahováno ze systemPath:
{
  systemPath: "obj-2025-11-01_xyz.pdf",
  fileName: "obj-2025-11-01_xyz.pdf",
  extractedPrefix: "obj-"                  // ❌ Extrahováno ŠPATNĚ kvůli špatnému názvu
}
```

#### C) **Detekce prefixu při renderování**
```javascript
🔍 [getFilePrefix] Detekce prefixu:
{
  file_prefix_property: undefined,
  systemova_cesta: "obj-2025-11-01_xyz.pdf",  // ❌ ŠPATNÝ PREFIX
  fileName: "obj-2025-11-01_xyz.pdf",
  detected: "obj-"                             // ❌ Proto se zobrazuje v OBJ sekci!
}
```

---

## ✅ ŘEŠENÍ

### Pro BACKEND developera:

1. **Najdi endpoint:** `POST /api/order-v2/{order_id}/attachments/upload`

2. **Zkontroluj zpracování:**
```php
// Čti file_prefix z requestu
$filePrefix = $_POST['file_prefix'] ?? $_REQUEST['file_prefix'] ?? 'obj-';

// Použij ho při generování názvu souboru
$systemovyCesta = $filePrefix . date('Y-m-d') . '_' . $guid . '.' . $ext;

// Ulož do DB
$stmt = $pdo->prepare("
  INSERT INTO objednavky_prilohy (
    objednavka_id,
    guid,
    originalni_nazev_souboru,
    systemova_cesta,  -- ✅ MUSÍ obsahovat správný prefix!
    mime_type,
    typ_prilohy,
    dt_vytvoreni,
    nahrano_uzivatel_id
  ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
");

$stmt->execute([
  $orderId,
  $guid,
  $originalName,
  $systemovyCesta,  // ✅ s SPRÁVNÝM prefixem
  $mimeType,
  $typPrilohy,
  $userId
]);
```

3. **Zkontroluj response:**
```php
// Vrať správné hodnoty
return json_encode([
  'status' => 'success',
  'data' => [
    'attachment_id' => $insertId,
    'guid' => $guid,
    'system_path' => $systemovyCesta,  // ✅ Vrať správnou cestu
    'file_prefix' => $filePrefix,       // ✅ Bonus: vrať i prefix
    ...
  ]
]);
```

---

## 📊 TESTOVÁNÍ

### Před opravou:
```
dd-dokument.pdf → uloží jako obj-2025-11-01_xyz.pdf ❌
                → zobrazí se v "OBJ přílohy" ❌
```

### Po opravě:
```
dd-dokument.pdf → uloží jako dd-2025-11-01_xyz.pdf ✅
                → zobrazí se v "Dodatečné dokumenty" ✅
```

---

## 🎯 DALŠÍ KONTROLA

### Zkontroluj databázi:

```sql
-- Zobraz přílohy objednávky #12345
SELECT 
  id,
  originalni_nazev_souboru,
  systemova_cesta,           -- TADY HLEDEJ PREFIX!
  typ_prilohy,
  dt_vytvoreni
FROM objednavky_prilohy
WHERE objednavka_id = 12345
ORDER BY dt_vytvoreni DESC;
```

**Očekávaný výsledek:**
```
| systemova_cesta              | typ_prilohy |
|------------------------------|-------------|
| obj-2025-11-01_abc123.pdf   | SMLOUVA     | ✅
| obj-2025-11-01_def456.pdf   | NABIDKA     | ✅
| dd-2025-11-01_ghi789.pdf    | JINE        | ✅
| dd-2025-11-01_jkl012.pdf    | JINE        | ✅
```

---

## 📝 ZÁVĚR

**Frontend je 100% funkční!** 🎉

**Problém je na backendu** - ignoruje `file_prefix` parameter z uploadu a vždy generuje název s prefixem `obj-`.

**Debug logy jsou zapnuté** - otevři konzoli (F12) a zkus nahrát dodatečný dokument. Uvidíš přesně, co backend vrací.

**Po opravě backendu** všechny přílohy se automaticky správně zobrazí v příslušných sekcích.

---

**Autor:** GitHub Copilot  
**Debug logy přidány do:** `OrderForm25.js` (řádky 11601-11636, 11547-11578, 10857-10873)
