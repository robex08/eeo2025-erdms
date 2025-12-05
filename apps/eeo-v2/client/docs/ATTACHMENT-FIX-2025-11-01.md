# 🔧 Oprava příloh - 1. listopadu 2025

## 🐛 Problémy

1. **Stahování příloh** - Odhlašuje uživatele → Backend nedostává `token` a `username`
2. **Změna klasifikace** - Zobrazuje "name ID prilohy" → Neodesílá se `objednavka_id` a `typ_prilohy`

## ✅ Provedené opravy

### 1. Download přílohy - Změna z GET na POST

**Soubor:** `src/services/apiOrderV2.js`

**Problém:**
```javascript
// ❌ ŠPATNĚ - GET s query params
const response = await apiOrderV2.get(
  `/order-v2/${orderId}/attachments/${attachmentId}`,
  { params: { username, token } }
);
```

**Oprava:**
```javascript
// ✅ SPRÁVNĚ - POST s body
const response = await apiOrderV2.post(
  `/order-v2/${orderId}/attachments/${attachmentId}/download`,
  { username, token }, // token a username v body
  { responseType: 'blob' }
);
```

### 2. Download přílohy - Analogická oprava v api25orders.js

**Soubor:** `src/services/api25orders.js`

**Změna:**
- Změněno z `GET` na `POST`
- Token a username přesunuty z query params do body
- URL změněno z `.../attachments/{id}` na `.../attachments/{id}/download`

### 3. Update klasifikace přílohy - Přidán parametr `typ_prilohy`

**Soubor:** `src/services/api25orders.js`

**Problém:**
```javascript
// ❌ ŠPATNĚ - Funkce nepřijímá typ_prilohy
export async function updateAttachment25({ 
  token, username, attachment_id, description, original_filename 
}) {
  const payload = { token, username };
  if (description !== undefined) payload.description = description;
  // ... žádný kód pro typ_prilohy
}
```

**Oprava:**
```javascript
// ✅ SPRÁVNĚ - Funkce přijímá typ_prilohy
export async function updateAttachment25({ 
  token, username, objednavka_id, attachment_id, typ_prilohy, description, original_filename 
}) {
  const payload = { token, username };
  
  if (typ_prilohy !== undefined) {
    payload.type = typ_prilohy; // Backend očekává 'type'
  }
  
  if (description !== undefined) {
    payload.description = description;
  }
  
  if (original_filename !== undefined) {
    payload.original_name = original_filename; // Backend očekává 'original_name'
  }
}
```

### 4. Volání update v OrderForm25.js - Přidán objednavka_id

**Soubor:** `src/forms/OrderForm25.js`

**Problém:**
```javascript
// ❌ ŠPATNĚ - Chybí objednavka_id
const result = await updateAttachment25({
  token,
  username,
  attachment_id: file.serverId,
  typ_prilohy: klasifikace
});
```

**Oprava:**
```javascript
// ✅ SPRÁVNĚ - Přidán objednavka_id
const result = await updateAttachment25({
  token,
  username,
  objednavka_id: savedOrderId, // ✅ OPRAVENO
  attachment_id: file.serverId,
  typ_prilohy: klasifikace
});

// ✅ OPRAVENO: Backend může vracet 'success' i 'ok'
if (result.status === 'ok' || result.status === 'success') {
  // ...
}
```

## 🧪 Co testovat

### Test 1: Stažení přílohy
1. Otevři objednávku s přílohami
2. Klikni na tlačítko stažení přílohy
3. ✅ **Očekávaný výsledek:** Příloha se stáhne bez odhlášení

### Test 2: Změna klasifikace existující přílohy
1. Otevři objednávku s přílohami
2. Změň klasifikaci přílohy v selectu
3. ✅ **Očekávaný výsledek:** Zobrazí se "✅ Klasifikace aktualizována v databázi"

### Test 3: Nahrání nové přílohy s klasifikací
1. Přidej nový soubor
2. Vyber klasifikaci
3. ✅ **Očekávaný výsledek:** Soubor se nahraje na server

## 🔍 Backend - Co musí podporovat

### Endpoint pro download (POST)
```
POST /order-v2/{order_id}/attachments/{attachment_id}/download
Body: { "token": "...", "username": "..." }
Response: Binary blob (soubor)
```

### Endpoint pro update (PUT)
```
PUT /order-v2/{order_id}/attachments/{attachment_id}
Body: { 
  "token": "...", 
  "username": "...",
  "type": "SMLOUVA"  // nebo jiný typ přílohy
}
Response: { 
  "status": "ok",
  "data": {
    "attachment_id": 73006,
    "order_id": 11253,
    "guid": "a1b2c3d4-...",
    "original_name": "new_name.pdf",
    "type": "smlouva",
    "file_size": 123456,
    "updated_at": "2025-11-01 23:45:30"
  },
  "message": "Metadata přílohy byla úspěšně aktualizována",
  "meta": { ... }
}
```

## 📝 Poznámky

- Backend pravděpodobně vrací chybu "name ID prilohy" když chybí `objednavka_id` nebo `attachment_id`
- Všechny endpointy Order V2 API vyžadují `token` a `username` v **body**, ne v query params
- Backend může vracet status `"success"` nebo `"ok"` - obojí je validní
