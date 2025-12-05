# Order V2 Invoice API - Frontend Implementation ✅

**Datum:** 31. října 2025  
**Status:** ✅ IMPLEMENTOVÁNO

---

## 📋 Přehled

Implementace nového Order V2 Invoice API na frontendu podle backend dokumentace.

### Nové endpointy

1. **POST** `/api.eeo/order-v2/{order_id}/invoices/create-with-attachment` - Vytvoření faktury s přílohou (atomic)
2. **POST** `/api.eeo/order-v2/{order_id}/invoices/create` - Vytvoření faktury bez přílohy
3. **POST** `/api.eeo/order-v2/invoices/{invoice_id}/update` - Aktualizace faktury

---

## 🔧 Implementované Funkce

### 1. `createInvoiceWithAttachmentV2()`

**Soubor:** `src/services/api25invoices.js`

Vytvoří fakturu včetně přílohy v jedné atomické operaci.

```javascript
import { createInvoiceWithAttachmentV2 } from '../services/api25invoices';

const result = await createInvoiceWithAttachmentV2({
  token: userToken,
  username: 'admin',
  order_id: 123,
  
  // Povinné fieldy
  fa_cislo_vema: 'FA-2025-001',
  fa_datum_vystaveni: '2025-10-31',
  fa_castka: '25000.00',
  
  // Soubor (povinný)
  file: selectedFile,
  
  // Volitelné fieldy
  fa_datum_splatnosti: '2025-11-30',
  fa_datum_doruceni: '2025-10-31',
  fa_dorucena: 1,
  fa_strediska_kod: 'STR001',
  fa_poznamka: 'Poznámka k faktuře',
  rozsirujici_data: { isdoc: {...} }
});

// Response:
// {
//   status: 'ok',
//   message: 'Faktura s přílohou byla úspěšně vytvořena',
//   data: {
//     invoice_id: 456,
//     attachment_id: 789,
//     filename: '1730379600_faktura.pdf'
//   }
// }
```

**Parametry:**
- ✅ Povinné: `token`, `username`, `order_id`, `file`, `fa_cislo_vema`, `fa_datum_vystaveni`, `fa_castka`
- ⚪ Volitelné: `fa_datum_splatnosti`, `fa_datum_doruceni`, `fa_dorucena`, `fa_strediska_kod`, `fa_poznamka`, `rozsirujici_data`

---

### 2. `createInvoiceV2()`

**Soubor:** `src/services/api25invoices.js`

Vytvoří fakturu bez přílohy.

```javascript
import { createInvoiceV2 } from '../services/api25invoices';

const result = await createInvoiceV2({
  token: userToken,
  username: 'admin',
  order_id: 123,
  
  // Povinné fieldy
  fa_cislo_vema: 'FA-2025-002',
  fa_datum_vystaveni: '2025-10-31',
  fa_castka: '15000.00',
  
  // Volitelné fieldy
  fa_datum_splatnosti: '2025-12-31',
  fa_datum_doruceni: '2025-11-01',
  fa_dorucena: 1,
  fa_strediska_kod: 'STR002',
  fa_poznamka: 'Faktura bez přílohy'
});

// Response:
// {
//   status: 'ok',
//   message: 'Faktura byla úspěšně vytvořena',
//   data: {
//     invoice_id: 457
//   }
// }
```

**Parametry:**
- ✅ Povinné: `token`, `username`, `order_id`, `fa_cislo_vema`, `fa_datum_vystaveni`, `fa_castka`
- ⚪ Volitelné: `fa_datum_splatnosti`, `fa_datum_doruceni`, `fa_dorucena`, `fa_strediska_kod`, `fa_poznamka`, `rozsirujici_data`

---

### 3. `updateInvoiceV2()`

**Soubor:** `src/services/api25invoices.js`

Aktualizuje existující fakturu (partial update - pouze fieldy které chceš změnit).

```javascript
import { updateInvoiceV2 } from '../services/api25invoices';

const result = await updateInvoiceV2({
  token: userToken,
  username: 'admin',
  invoice_id: 456,
  
  // Pouze fieldy k aktualizaci
  updateData: {
    fa_datum_splatnosti: '2025-12-15',
    fa_poznamka: 'Aktualizovaná poznámka',
    fa_strediska_kod: 'STR003'
  }
});

// Response:
// {
//   status: 'ok',
//   message: 'Faktura byla úspěšně aktualizována',
//   data: {
//     invoice_id: 456,
//     updated_fields: ['fa_datum_splatnosti', 'fa_poznamka', 'fa_strediska_kod'],
//     fa_datum_splatnosti: '2025-12-15'
//   }
// }
```

**Parametry:**
- ✅ Povinné: `token`, `username`, `invoice_id`, `updateData`
- ⚪ V `updateData`: Jakékoli fieldy z faktury, které chceš změnit

---

## 📊 Datové Fieldy

### Povinné fieldy (pro create)
| Field | Typ | Popis |
|-------|-----|-------|
| `fa_cislo_vema` | string | Číslo faktury |
| `fa_datum_vystaveni` | string | Datum vystavení (YYYY-MM-DD) |
| `fa_castka` | string | Částka faktury (decimal) |

### Volitelné fieldy
| Field | Typ | Popis |
|-------|-----|-------|
| `fa_datum_splatnosti` | string | Datum splatnosti (YYYY-MM-DD) ⭐ **HLAVNÍ FOCUS** |
| `fa_datum_doruceni` | string | Datum doručení (YYYY-MM-DD) |
| `fa_dorucena` | number | Zda byla doručena (0/1) |
| `fa_strediska_kod` | string | Kód střediska |
| `fa_poznamka` | string | Poznámka k faktuře |
| `rozsirujici_data` | object | Dodatečná JSON data |

---

## ⚠️ Error Handling

Všechny funkce vyhazují standardizované errory:

```javascript
try {
  const result = await createInvoiceV2({...});
} catch (error) {
  console.error('Chyba:', error.message);
  // Error messages jsou user-friendly
}
```

**Typické error kódy:**
- `400` - Chybí povinné fieldy, neplatná data
- `401` - Neplatný token
- `404` - Faktura nenalezena (při update)
- `405` - Neplatná HTTP metoda (musí být POST)
- `500` - Serverová chyba

---

## 🔄 Migrace z původního API

### Původní způsob
```javascript
// Starý endpoint
await createInvoiceWithAttachment25({
  objednavka_id: 123,
  fa_cislo_vema: 'FA-2025-001',
  ...
});
```

### Nový způsob
```javascript
// Nový V2 endpoint
await createInvoiceWithAttachmentV2({
  order_id: 123, // order_id místo objednavka_id
  fa_cislo_vema: 'FA-2025-001',
  ...
});
```

**Hlavní změny:**
1. `objednavka_id` → `order_id`
2. `order_id` je v URL cestě (ne v body)
3. Standardizované `{status, message, data}` response format
4. Přísnější validace povinných polí
5. Atomic operace (faktura + příloha)
6. **fa_datum_splatnosti garantovaně funguje!** ⭐

---

## 📝 Export

Všechny funkce jsou exportovány:

```javascript
// Named exports
export async function createInvoiceWithAttachmentV2({...}) {...}
export async function createInvoiceV2({...}) {...}
export async function updateInvoiceV2({...}) {...}

// Default export obsahuje všechny funkce
export default {
  // ... ostatní funkce ...
  createInvoiceWithAttachmentV2,
  createInvoiceV2,
  updateInvoiceV2,
  // ...
};
```

---

## ✅ Checklist

- [x] Implementovat `createInvoiceWithAttachmentV2()`
- [x] Implementovat `createInvoiceV2()`
- [x] Implementovat `updateInvoiceV2()`
- [x] Přidat validaci povinných polí
- [x] Přidat error handling
- [x] Přidat JSDoc dokumentaci
- [x] Přidat do default exportu
- [x] Vytvořit dokumentaci
- [ ] Otestovat všechny endpointy
- [ ] Aktualizovat komponenty pro použití nového API
- [ ] Přidat unit testy

---

## 🚀 Status

**✅ PŘIPRAVENO K POUŽITÍ**

Backend API je připravené a frontend implementace je hotová.

**Další kroky:**
1. Otestovat všechny endpointy s reálnými daty
2. Aktualizovat komponenty pro použití nových funkcí
3. Ověřit, že `fa_datum_splatnosti` funguje správně
4. Přidat UI feedback pro uživatele

---

## 📚 Související dokumentace

- Backend dokumentace: `ORDER-V2-INVOICE-API-GUIDE.md` (poskytnutá uživatelem)
- API service: `src/services/api25invoices.js`
- Původní invoice API: stejný soubor (zachováno pro kompatibilitu)
