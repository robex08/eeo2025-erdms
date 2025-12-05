# 📄 Invoice API - Kompletní dokumentace pro Frontend

**Datum:** 30. listopadu 2025  
**Verze:** v1.0  
**API Base URL:** `/api.eeo/`  
**Kompatibilita:** PHP 5.6, MySQL 5.5.43

---

## 📋 Obsah

1. [Přehled API](#přehled-api)
2. [Autentizace](#autentizace)
3. [Response formáty](#response-formáty)
4. [Faktury - CRUD Endpointy](#faktury---crud-endpointy)
5. [Přílohy faktur - CRUD Endpointy](#přílohy-faktur---crud-endpointy)
6. [Frontend integrace](#frontend-integrace)
7. [Error handling](#error-handling)

---

## 🔐 Přehled API

Systém nabízí **13 endpointů** pro práci s fakturami a jejich přílohami:

### Faktury (6 endpointů)
- ✅ `POST invoices25/by-order` - Načtení faktur podle objednávky
- ✅ `POST invoices25/by-id` - Načtení konkrétní faktury
- ✅ `POST invoices25/create` - Vytvoření faktury (bez přílohy)
- ✅ `POST invoices25/create-with-attachment` - Vytvoření faktury + nahrání přílohy
- ✅ `POST invoices25/update` - Aktualizace faktury
- ✅ `POST invoices25/delete` - Smazání faktury (soft/hard)

### Přílohy faktur (7 endpointů)
- ✅ `POST invoices25/attachments/by-invoice` - Načtení příloh faktury
- ✅ `POST invoices25/attachments/by-order` - Načtení příloh všech faktur objednávky
- ✅ `POST invoices25/attachments/by-id` - Načtení konkrétní přílohy
- ✅ `POST invoices25/attachments/upload` - Nahrání nové přílohy k faktuře
- ✅ `POST invoices25/attachments/download` - Stažení přílohy
- ✅ `POST invoices25/attachments/update` - Aktualizace metadat přílohy
- ✅ `POST invoices25/attachments/delete` - Smazání přílohy

---

## 🔐 Autentizace

**Všechny endpointy vyžadují:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "novak.jan"
}
```

### Získání tokenu
```javascript
// Login endpoint (příklad)
const response = await axios.post('/api.eeo/login', {
  username: 'novak.jan',
  password: 'heslo123'
});

const token = response.data.token; // Použít ve všech dalších požadavcích
```

---

## 📦 Response formáty

### Úspěšná odpověď
```json
{
  "status": "ok",
  "message": "Operace byla úspěšná",
  "data": { ... }
}
```

### Chybová odpověď
```json
{
  "err": "Popis chyby",
  "debug": { ... }  // Volitelné debug info
}
```

### HTTP status kódy
- `200` - OK (GET/LIST)
- `201` - Created (CREATE)
- `400` - Bad Request (chybí parametry)
- `401` - Unauthorized (neplatný token)
- `403` - Forbidden (nemáte oprávnění)
- `404` - Not Found (záznam neexistuje)
- `405` - Method Not Allowed (použit GET místo POST)
- `500` - Internal Server Error (chyba serveru)

---

## 📄 FAKTURY - CRUD Endpointy

### 1. 📥 Načtení faktur objednávky

**Endpoint:** `POST /api.eeo/invoices25/by-order`

**Parametry:**
```json
{
  "token": "string (povinné)",
  "username": "string (povinné)",
  "objednavka_id": 12345
}
```

**Response:**
```json
{
  "faktury": [
    {
      "id": 501,
      "objednavka_id": 12345,
      "fa_dorucena": 1,
      "fa_castka": 125000.50,
      "fa_cislo_vema": "2025001234",
      "fa_datum_vystaveni": "2025-11-15",
      "fa_datum_splatnosti": "2025-12-15",
      "fa_datum_doruceni": "2025-11-20",
      "fa_strediska_kod": "[\"01234\",\"56789\"]",
      "fa_poznamka": "Faktura za IT vybavení",
      "rozsirujici_data": null,
      "vytvoril_uzivatel_id": 42,
      "dt_vytvoreni": "2025-11-15 10:30:00",
      "dt_aktualizace": "2025-11-20 14:22:00",
      "aktivni": 1
    }
  ],
  "count": 1,
  "objednavka_id": 12345
}
```

**Frontend použití:**
```javascript
async function loadInvoices(orderId) {
  const response = await axios.post('/api.eeo/invoices25/by-order', {
    token: user.token,
    username: user.username,
    objednavka_id: orderId
  });
  
  return response.data.faktury;
}
```

---

### 2. 📥 Načtení konkrétní faktury

**Endpoint:** `POST /api.eeo/invoices25/by-id`

**Parametry:**
```json
{
  "token": "string (povinné)",
  "username": "string (povinné)",
  "id": 501
}
```

**Response:**
```json
{
  "id": 501,
  "objednavka_id": 12345,
  "fa_dorucena": 1,
  "fa_castka": 125000.50,
  "fa_cislo_vema": "2025001234",
  "fa_datum_vystaveni": "2025-11-15",
  "fa_datum_splatnosti": "2025-12-15",
  "fa_datum_doruceni": "2025-11-20",
  "fa_strediska_kod": "[\"01234\",\"56789\"]",
  "fa_poznamka": "Faktura za IT vybavení",
  "rozsirujici_data": null,
  "vytvoril_uzivatel_id": 42,
  "dt_vytvoreni": "2025-11-15 10:30:00",
  "dt_aktualizace": "2025-11-20 14:22:00",
  "aktivni": 1
}
```

**Frontend použití:**
```javascript
async function loadInvoice(invoiceId) {
  const response = await axios.post('/api.eeo/invoices25/by-id', {
    token: user.token,
    username: user.username,
    id: invoiceId
  });
  
  return response.data;
}
```

---

### 3. ➕ Vytvoření faktury (bez přílohy)

**Endpoint:** `POST /api.eeo/invoices25/create`

**Parametry:**
```json
{
  "token": "string (povinné)",
  "username": "string (povinné)",
  "objednavka_id": 12345,
  "fa_castka": 125000.50,
  "fa_cislo_vema": "2025001234",
  "fa_dorucena": 1,
  "fa_datum_vystaveni": "2025-11-15",
  "fa_datum_splatnosti": "2025-12-15",
  "fa_datum_doruceni": "2025-11-20",
  "fa_strediska_kod": ["01234", "56789"],
  "fa_poznamka": "Volitelná poznámka",
  "rozsirujici_data": {
    "custom_field": "custom_value"
  }
}
```

**Povinné pole:**
- `objednavka_id` (int)
- `fa_castka` (decimal)
- `fa_cislo_vema` (string)

**Volitelné pole:**
- `fa_dorucena` (0/1, default: 0)
- `fa_datum_vystaveni` (date YYYY-MM-DD)
- `fa_datum_splatnosti` (date YYYY-MM-DD)
- `fa_datum_doruceni` (date YYYY-MM-DD)
- `fa_strediska_kod` (array nebo JSON string, UPPERCASE normalizace)
- `fa_poznamka` (text)
- `rozsirujici_data` (object, uloží se jako JSON)

**Response:**
```json
{
  "status": "ok",
  "message": "Faktura byla úspěšně vytvořena",
  "id": 501
}
```

**Frontend použití:**
```javascript
async function createInvoice(orderId, invoiceData) {
  const response = await axios.post('/api.eeo/invoices25/create', {
    token: user.token,
    username: user.username,
    objednavka_id: orderId,
    ...invoiceData
  });
  
  return response.data.id; // ID nové faktury
}

// Příklad volání
const newInvoiceId = await createInvoice(12345, {
  fa_castka: 125000.50,
  fa_cislo_vema: "2025001234",
  fa_datum_vystaveni: "2025-11-15",
  fa_datum_splatnosti: "2025-12-15",
  fa_strediska_kod: ["01234", "56789"],
  fa_poznamka: "IT vybavení Q4 2025"
});
```

---

### 4. ➕ Vytvoření faktury + nahrání přílohy

**Endpoint:** `POST /api.eeo/invoices25/create-with-attachment`

⚠️ **Používá `multipart/form-data` místo JSON!**

**Parametry (FormData):**
```javascript
const formData = new FormData();
formData.append('token', user.token);
formData.append('username', user.username);
formData.append('objednavka_id', 12345);
formData.append('fa_castka', 125000.50);
formData.append('fa_cislo_vema', '2025001234');
formData.append('fa_datum_vystaveni', '2025-11-15');
formData.append('fa_datum_splatnosti', '2025-12-15');
formData.append('fa_strediska_kod', JSON.stringify(['01234', '56789']));
formData.append('typ_prilohy', 'ISDOC'); // nebo 'PDF', 'IMAGE', ...
formData.append('file', fileBlob); // File objekt
```

**Povolené typy souborů:**
- `pdf` - PDF dokumenty
- `isdoc` - ISDOC XML formát
- `xml` - XML soubory
- `jpg`, `jpeg` - Obrázky
- `png` - Obrázky

**Max. velikost:** 20 MB (konfigurovatelné)

**Response:**
```json
{
  "status": "ok",
  "message": "Faktura včetně přílohy byla úspěšně vytvořena",
  "faktura_id": 501,
  "priloha_id": 1001,
  "faktura": {
    "id": 501,
    "objednavka_id": 12345,
    "fa_castka": 125000.50,
    "fa_cislo_vema": "2025001234",
    ...
  },
  "priloha": {
    "id": 1001,
    "faktura_id": 501,
    "guid": "fa-2025-11-15_a1b2c3d4",
    "originalni_nazev_souboru": "faktura_2025001234.pdf",
    "velikost_souboru_b": 245678,
    "velikost_kb": 239.92,
    "velikost_mb": 0.23,
    "je_isdoc": false,
    "typ_prilohy": "PDF",
    "nahrano_uzivatel": "Novák Jan",
    "dt_vytvoreni": "2025-11-15 10:30:00"
  }
}
```

**Frontend použití:**
```javascript
async function createInvoiceWithFile(orderId, invoiceData, file) {
  const formData = new FormData();
  
  // Autentizace
  formData.append('token', user.token);
  formData.append('username', user.username);
  
  // Povinná data
  formData.append('objednavka_id', orderId);
  formData.append('fa_castka', invoiceData.fa_castka);
  formData.append('fa_cislo_vema', invoiceData.fa_cislo_vema);
  
  // Volitelná data
  if (invoiceData.fa_datum_vystaveni) {
    formData.append('fa_datum_vystaveni', invoiceData.fa_datum_vystaveni);
  }
  if (invoiceData.fa_datum_splatnosti) {
    formData.append('fa_datum_splatnosti', invoiceData.fa_datum_splatnosti);
  }
  if (invoiceData.fa_strediska_kod) {
    formData.append('fa_strediska_kod', JSON.stringify(invoiceData.fa_strediska_kod));
  }
  
  // Příloha
  formData.append('typ_prilohy', 'ISDOC');
  formData.append('file', file);
  
  const response = await axios.post('/api.eeo/invoices25/create-with-attachment', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return response.data;
}

// Použití v komponentě
const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  
  const result = await createInvoiceWithFile(12345, {
    fa_castka: 125000.50,
    fa_cislo_vema: "2025001234",
    fa_datum_vystaveni: "2025-11-15",
    fa_datum_splatnosti: "2025-12-15",
    fa_strediska_kod: ["01234"]
  }, file);
  
  console.log('Vytvořeno:', result.faktura_id, result.priloha_id);
};
```

---

### 5. ✏️ Aktualizace faktury

**Endpoint:** `POST /api.eeo/invoices25/update`

**Parametry:**
```json
{
  "token": "string (povinné)",
  "username": "string (povinné)",
  "id": 501,
  "fa_castka": 135000.00,
  "fa_dorucena": 1,
  "fa_datum_doruceni": "2025-11-20",
  "fa_poznamka": "Aktualizovaná poznámka"
}
```

**Povinné pole:**
- `id` (int) - ID faktury

**Volitelné pole** (aktualizují se pouze zaslaná):
- `fa_dorucena` (0/1)
- `fa_castka` (decimal)
- `fa_cislo_vema` (string)
- `fa_datum_vystaveni` (date)
- `fa_datum_splatnosti` (date)
- `fa_datum_doruceni` (date)
- `fa_strediska_kod` (array/JSON)
- `fa_poznamka` (text)
- `rozsirujici_data` (object)

**Response:**
```json
{
  "status": "ok",
  "message": "Faktura byla úspěšně aktualizována"
}
```

**Frontend použití:**
```javascript
async function updateInvoice(invoiceId, updates) {
  const response = await axios.post('/api.eeo/invoices25/update', {
    token: user.token,
    username: user.username,
    id: invoiceId,
    ...updates
  });
  
  return response.data;
}

// Příklad - označit fakturu jako doručenou
await updateInvoice(501, {
  fa_dorucena: 1,
  fa_datum_doruceni: new Date().toISOString().split('T')[0]
});
```

---

### 6. 🗑️ Smazání faktury

**Endpoint:** `POST /api.eeo/invoices25/delete`

**Parametry:**
```json
{
  "token": "string (povinné)",
  "username": "string (povinné)",
  "id": 501,
  "hard_delete": 0
}
```

**Typy smazání:**

#### Soft Delete (default, `hard_delete: 0`)
- Faktura se označí jako `aktivni = 0`
- **Přílohy ZŮSTÁVAJÍ v databázi**
- **Soubory ZŮSTÁVAJÍ na disku**
- Lze obnovit změnou `aktivni = 1`

#### Hard Delete (`hard_delete: 1`)
- Faktura se **TRVALE SMAŽE** z databáze
- **Přílohy se SMAŽOU z databáze**
- **Soubory se SMAŽOU z disku**
- ⚠️ **NELZE OBNOVIT!**

**Response:**
```json
{
  "status": "ok",
  "message": "Faktura byla označena jako neaktivní (přílohy zůstaly v DB)",
  "hard_delete": false
}
```

**Frontend použití:**
```javascript
async function deleteInvoice(invoiceId, permanent = false) {
  const confirmed = permanent 
    ? confirm('VAROVÁNÍ: Faktura bude trvale smazána včetně příloh! Pokračovat?')
    : confirm('Smazat fakturu?');
  
  if (!confirmed) return;
  
  const response = await axios.post('/api.eeo/invoices25/delete', {
    token: user.token,
    username: user.username,
    id: invoiceId,
    hard_delete: permanent ? 1 : 0
  });
  
  return response.data;
}

// Soft delete
await deleteInvoice(501, false);

// Hard delete (trvalé)
await deleteInvoice(501, true);
```

---

## 📎 PŘÍLOHY FAKTUR - CRUD Endpointy

### 7. 📥 Načtení příloh faktury

**Endpoint:** `POST /api.eeo/invoices25/attachments/by-invoice`

**Parametry:**
```json
{
  "token": "string (povinné)",
  "username": "string (povinné)",
  "faktura_id": 501
}
```

**Response:**
```json
{
  "status": "ok",
  "prilohy": [
    {
      "id": 1001,
      "faktura_id": 501,
      "objednavka_id": 12345,
      "guid": "fa-2025-11-15_a1b2c3d4",
      "typ_prilohy": "ISDOC",
      "originalni_nazev_souboru": "faktura_2025001234.isdoc",
      "systemova_cesta": "/uploads/orders25/12345/fa-2025-11-15_a1b2c3d4.isdoc",
      "velikost_souboru_b": 245678,
      "velikost_kb": 239.92,
      "velikost_mb": 0.23,
      "je_isdoc": true,
      "isdoc_parsed": true,
      "nahrano_uzivatel_id": 42,
      "nahrano_uzivatel": "Novák Jan",
      "dt_vytvoreni": "2025-11-15 10:30:00",
      "dt_aktualizace": "2025-11-15 10:30:00"
    }
  ],
  "count": 1,
  "faktura_id": 501
}
```

**Frontend použití:**
```javascript
async function loadInvoiceAttachments(invoiceId) {
  const response = await axios.post('/api.eeo/invoices25/attachments/by-invoice', {
    token: user.token,
    username: user.username,
    faktura_id: invoiceId
  });
  
  return response.data.prilohy;
}
```

---

### 8. 📥 Načtení příloh všech faktur objednávky

**Endpoint:** `POST /api.eeo/invoices25/attachments/by-order`

**Parametry:**
```json
{
  "token": "string (povinné)",
  "username": "string (povinné)",
  "objednavka_id": 12345
}
```

**Response:**
```json
{
  "status": "ok",
  "prilohy": [
    {
      "id": 1001,
      "faktura_id": 501,
      "objednavka_id": 12345,
      "fa_cislo_vema": "2025001234",
      "fa_castka": 125000.50,
      "guid": "fa-2025-11-15_a1b2c3d4",
      "originalni_nazev_souboru": "faktura_2025001234.pdf",
      "velikost_mb": 0.23,
      "je_isdoc": false,
      "nahrano_uzivatel": "Novák Jan",
      "dt_vytvoreni": "2025-11-15 10:30:00"
    },
    {
      "id": 1002,
      "faktura_id": 502,
      "objednavka_id": 12345,
      "fa_cislo_vema": "2025001235",
      "fa_castka": 50000.00,
      "originalni_nazev_souboru": "faktura_2025001235.isdoc",
      "velikost_mb": 0.15,
      "je_isdoc": true,
      "nahrano_uzivatel": "Svobodová Eva",
      "dt_vytvoreni": "2025-11-18 14:22:00"
    }
  ],
  "count": 2,
  "objednavka_id": 12345,
  "statistiky": {
    "pocet_faktur_s_prilohami": 2,
    "celkem_priloh": 2,
    "celkova_velikost_b": 491356,
    "celkova_velikost_mb": 0.47,
    "pocet_isdoc": 1,
    "posledni_priloha_dt": "2025-11-18 14:22:00"
  }
}
```

**Frontend použití:**
```javascript
async function loadOrderInvoiceAttachments(orderId) {
  const response = await axios.post('/api.eeo/invoices25/attachments/by-order', {
    token: user.token,
    username: user.username,
    objednavka_id: orderId
  });
  
  return {
    attachments: response.data.prilohy,
    stats: response.data.statistiky
  };
}

// Zobrazení statistik
const { attachments, stats } = await loadOrderInvoiceAttachments(12345);
console.log(`Celkem ${stats.pocet_faktur_s_prilohami} faktur má ${stats.celkem_priloh} příloh (${stats.celkova_velikost_mb} MB)`);
```

---

### Další endpointy (9-13)

Viz kompletní dokumentace výše pro:
- Načtení konkrétní přílohy
- Nahrání nové přílohy
- Stažení přílohy
- Aktualizace metadat
- Smazání přílohy

---

## 🎯 Quick Reference

| Akce | Endpoint | Parametry |
|------|----------|-----------|
| **Načíst faktury objednávky** | `invoices25/by-order` | `objednavka_id` |
| **Načíst fakturu** | `invoices25/by-id` | `id` |
| **Vytvořit fakturu** | `invoices25/create` | `objednavka_id`, `fa_castka`, `fa_cislo_vema` |
| **Vytvořit + příloha** | `invoices25/create-with-attachment` | + `file` (FormData) |
| **Aktualizovat** | `invoices25/update` | `id` + změny |
| **Smazat** | `invoices25/delete` | `id`, `hard_delete` |
| **Přílohy faktury** | `invoices25/attachments/by-invoice` | `faktura_id` |
| **Přílohy objednávky** | `invoices25/attachments/by-order` | `objednavka_id` |
| **Nahrát přílohu** | `invoices25/attachments/upload` | `faktura_id`, `file` |
| **Stáhnout přílohu** | `invoices25/attachments/download` | `id` |
| **Smazat přílohu** | `invoices25/attachments/delete` | `id` |

---

**✅ Dokumentace kompletní!** 🎉

**⚠️ POZOR:** API je připraveno, zatím používáme dummy data v `Invoices25List.js` pro vývoj UI.
Integrace API bude následovat v další fázi.
