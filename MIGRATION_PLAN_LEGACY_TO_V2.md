# 🚀 MIGRAČNÍ PLÁN: LEGACY API → V2 API

**Datum:** 19. prosince 2025  
**Priorita:** KRITICKÁ  
**Cíl:** Eliminovat všechna volání legacy API a používat pouze V2

---

## 📊 AKTUÁLNÍ STAV ANALÝZY

### ✅ CO UŽ FUNGUJE NA V2:
- **Order Attachments** → `order-v2/attachments` ✅
- **Invoice Attachments** → Částečně V2, ale volá se `invoices25/` ⚠️
- **Notifications** → `notifications/` (není legacy problém)

### ❌ CO JE STÁLE NA LEGACY:

#### 1. **ORDERS API - HLAVNÍ FORMULÁŘ** (OrderForm25.js)
```javascript
// LEGACY - TOTO MUSÍ PRYČ:
endpoint: 'orders25/partial-insert'    // Vytvoření objednávky
endpoint: 'orders25/partial-update'    // Aktualizace objednávky
```

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/forms/OrderForm25.js`  
**Řádek:** 11142  
**Service:** `/var/www/erdms-dev/apps/eeo-v2/client/src/services/api25orders.js`

**Používá se v:**
- `api25orders.partialInsertOrder()` - řádek 966
- `api25orders.partialUpdateOrder()` - řádek 1038
- `api25orders.updateOrder()` - řádek 523
- `api25orders.deleteOrder()` - řádek 629

#### 2. **INVOICES API** (OrderForm25.js + api25invoices.js)
```javascript
// LEGACY - TOTO MUSÍ PRYČ:
'invoices25/create'                    // Vytvoření faktury
'invoices25/update'                    // Aktualizace faktury
'invoices25/delete'                    // Smazání faktury
'invoices25/by-order'                  // Seznam faktur objednávky
'invoices25/list'                      // Seznam všech faktur
'invoices25/attachments/*'             // Přílohy faktur
```

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/services/api25invoices.js`  
**Používá se v:** `OrderForm25.js`, `Invoices.js`, `mobileDataService.js`

#### 3. **BACKEND HANDLERY**
**Legacy handlers (SMAZAT PO MIGRACI):**
- `lib/orderHandlers.php` - obsahuje `handle_orders25_*` funkce
- `lib/invoiceHandlers.php` - obsahuje `handle_invoices25_*` funkce
- `lib/invoiceAttachmentHandlers.php` - obsahuje `handle_invoices25_attachments_*`

**V2 handlers (POUŽÍVAT):**
- `lib/orderV2Endpoints.php` - `handle_order_v2_*` funkce ✅
- `lib/orderV2InvoiceHandlers.php` - `handle_order_v2_*_invoice` funkce ✅
- `lib/orderV2AttachmentHandlers.php` - přílohy objednávek ✅
- `lib/orderV2InvoiceAttachmentHandlers.php` - přílohy faktur ✅

---

## 🎯 AKČNÍ PLÁN - 3 FÁZE

### 📅 FÁZE 1: PŘÍPRAVA A MAPOVÁNÍ (2 hodiny)

#### 1.1 Verifikace V2 API endpointů
**Zkontroluj, že existují tyto V2 endpointy:**

```bash
# Zkontroluj backend:
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib
grep -n "function handle_order_v2" orderV2Endpoints.php | head -20
```

**Musí existovat:**
- ✅ `handle_order_v2_create()` - Vytvoření objednávky
- ✅ `handle_order_v2_update()` - Aktualizace objednávky
- ✅ `handle_order_v2_delete()` - Smazání objednávky
- ✅ `handle_order_v2_list()` - Seznam objednávek
- ✅ `handle_order_v2_get()` - Detail objednávky
- ⚠️ `handle_order_v2_create_invoice()` - Vytvoření faktury (zkontrolovat!)
- ⚠️ `handle_order_v2_update_invoice()` - Update faktury (zkontrolovat!)
- ⚠️ `handle_order_v2_delete_invoice()` - Smazání faktury (zkontrolovat!)

#### 1.2 Testování V2 API manuálně
```bash
# Test vytvoření objednávky přes V2:
curl -X POST http://localhost/api.eeo/order-v2/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "token": "YOUR_TOKEN",
    "predmet": "Test objednávka V2",
    "strediska_kod": "TEST"
  }'

# Pokud vrátí chybu → OPRAVIT PŘED MIGRACÍ!
```

---

### 🔧 FÁZE 2: MIGRACE ORDERS API (4-6 hodin)

#### 2.1 Vytvořit nový service wrapper pro V2
**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/services/apiOrderV2Service.js`

```javascript
/**
 * ORDER V2 API Service - Unified wrapper
 * Nahrazuje api25orders.js
 */
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || '';

// Vytvoření axios instance
const orderV2API = axios.create({
  baseURL: `${API_BASE}/order-v2`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Vytvoření nové objednávky (NAHRAZUJE orders25/partial-insert)
 */
export async function createOrderV2(orderData, username, token) {
  try {
    const payload = {
      username,
      token,
      ...orderData,
    };
    
    const response = await orderV2API.post('/create', payload);
    
    if (response.data.status === 'ok') {
      return {
        success: true,
        data: response.data.data,
        order_id: response.data.data.id,
      };
    } else {
      throw new Error(response.data.message || 'Chyba při vytváření objednávky');
    }
  } catch (error) {
    console.error('[OrderV2] Create error:', error);
    throw error;
  }
}

/**
 * Aktualizace objednávky (NAHRAZUJE orders25/partial-update)
 */
export async function updateOrderV2(orderId, orderData, username, token) {
  try {
    const payload = {
      username,
      token,
      id: orderId,
      ...orderData,
    };
    
    const response = await orderV2API.post('/update', payload);
    
    if (response.data.status === 'ok') {
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      throw new Error(response.data.message || 'Chyba při aktualizaci objednávky');
    }
  } catch (error) {
    console.error('[OrderV2] Update error:', error);
    throw error;
  }
}

/**
 * Smazání objednávky (NAHRAZUJE orders25/delete)
 */
export async function deleteOrderV2(orderId, username, token) {
  try {
    const payload = {
      username,
      token,
      id: orderId,
    };
    
    const response = await orderV2API.post('/delete', payload);
    
    if (response.data.status === 'ok') {
      return { success: true };
    } else {
      throw new Error(response.data.message || 'Chyba při mazání objednávky');
    }
  } catch (error) {
    console.error('[OrderV2] Delete error:', error);
    throw error;
  }
}

// Export all functions
export default {
  createOrderV2,
  updateOrderV2,
  deleteOrderV2,
};
```

#### 2.2 Upravit OrderForm25.js
**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/forms/OrderForm25.js`

**ZMĚNIT:**
```javascript
// PŘED (řádek ~66):
import { 
  partialInsertOrder, 
  partialUpdateOrder, 
  deleteOrder 
} from '../services/api25orders';

// PO:
import { 
  createOrderV2, 
  updateOrderV2, 
  deleteOrderV2 
} from '../services/apiOrderV2Service';
```

**ZMĚNIT (řádek ~11142):**
```javascript
// PŘED:
const endpoint = (!isOrderSavedToDB || !formData.id) 
  ? 'orders25/partial-insert' 
  : 'orders25/partial-update';

// PO:
const isCreate = !isOrderSavedToDB || !formData.id;

try {
  let result;
  if (isCreate) {
    // CREATE - V2 API
    result = await createOrderV2(orderPayload, username, token);
  } else {
    // UPDATE - V2 API
    result = await updateOrderV2(formData.id, orderPayload, username, token);
  }
  
  // Zpracovat výsledek...
  if (result.success) {
    // Success handling...
  }
} catch (error) {
  // Error handling...
}
```

#### 2.3 Test po migraci
- ✅ Vytvoření nové objednávky
- ✅ Uložení rozpracované objednávky (autosave)
- ✅ Editace existující objednávky
- ✅ Smazání objednávky
- ✅ Zamykání/odemykání objednávky

---

### 💰 FÁZE 3: MIGRACE INVOICES API (4-6 hodin)

#### 3.1 Zkontrolovat V2 Invoice endpointy
```bash
# Backend kontrola:
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib
grep -n "function handle_order_v2.*invoice" orderV2InvoiceHandlers.php

# Musí existovat:
# - handle_order_v2_create_invoice()
# - handle_order_v2_update_invoice()
# - handle_order_v2_delete_invoice()
```

#### 3.2 Vytvořit Invoice V2 service
**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/services/apiInvoiceV2Service.js`

```javascript
/**
 * INVOICE V2 API Service
 * Nahrazuje api25invoices.js
 */
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || '';

const invoiceV2API = axios.create({
  baseURL: `${API_BASE}/order-v2`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Vytvoření faktury (NAHRAZUJE invoices25/create)
 */
export async function createInvoiceV2(invoiceData, username, token) {
  try {
    const payload = {
      username,
      token,
      ...invoiceData,
    };
    
    const response = await invoiceV2API.post('/invoices/create', payload);
    
    if (response.data.status === 'ok') {
      return {
        success: true,
        data: response.data.data,
        invoice_id: response.data.data.id,
      };
    } else {
      throw new Error(response.data.message || 'Chyba při vytváření faktury');
    }
  } catch (error) {
    console.error('[InvoiceV2] Create error:', error);
    throw error;
  }
}

/**
 * Aktualizace faktury (NAHRAZUJE invoices25/update)
 */
export async function updateInvoiceV2(invoiceId, invoiceData, username, token) {
  try {
    const payload = {
      username,
      token,
      id: invoiceId,
      ...invoiceData,
    };
    
    const response = await invoiceV2API.post('/invoices/update', payload);
    
    if (response.data.status === 'ok') {
      return { success: true, data: response.data.data };
    } else {
      throw new Error(response.data.message || 'Chyba při aktualizaci faktury');
    }
  } catch (error) {
    console.error('[InvoiceV2] Update error:', error);
    throw error;
  }
}

/**
 * Smazání faktury (NAHRAZUJE invoices25/delete)
 */
export async function deleteInvoiceV2(invoiceId, username, token) {
  try {
    const payload = {
      username,
      token,
      id: invoiceId,
    };
    
    const response = await invoiceV2API.post('/invoices/delete', payload);
    
    if (response.data.status === 'ok') {
      return { success: true };
    } else {
      throw new Error(response.data.message || 'Chyba při mazání faktury');
    }
  } catch (error) {
    console.error('[InvoiceV2] Delete error:', error);
    throw error;
  }
}

export default {
  createInvoiceV2,
  updateInvoiceV2,
  deleteInvoiceV2,
};
```

#### 3.3 Upravit OrderForm25.js (invoice sekce)
**ZMĚNIT import (řádek ~66):**
```javascript
// PŘED:
import { deleteInvoiceV2, createInvoiceV2, updateInvoiceV2 } from '../services/api25invoices';

// PO:
import { deleteInvoiceV2, createInvoiceV2, updateInvoiceV2 } from '../services/apiInvoiceV2Service';
```

**Kód by neměl vyžadovat velké změny, protože už voláš funkce s názvem V2!**

#### 3.4 Ověřit DB sloupce (KRITICKÉ!)
```sql
-- Zkontroluj, že všechny sloupce existují:
DESCRIBE 25a_objednavky_faktury;
DESCRIBE 25a_faktury_prilohy;

-- Testovací INSERT:
INSERT INTO 25a_objednavky_faktury (
  objednavka_id,
  fa_castka,
  fa_cislo_vema,
  fa_typ,
  vytvoril_uzivatel_id,
  dt_vytvoreni,
  aktivni
) VALUES (
  1,
  1000.50,
  'TEST-2025-001',
  'BEZNA',
  1,
  NOW(),
  1
);

-- Pokud chyba → OPRAVIT BACKEND HANDLER!
```

---

## ⚠️ ZNÁMÉ PROBLÉMY A ŘEŠENÍ

### 🔴 PROBLÉM 1: Chybějící sloupce v DB
**Symptom:** Backend vrací chybu "Unknown column 'xxx' in field list"

**Řešení:**
```sql
-- Přidat chybějící sloupec:
ALTER TABLE 25a_objednavky_faktury 
ADD COLUMN xxx VARCHAR(255) NULL AFTER yyy;
```

### 🔴 PROBLÉM 2: Nekompatibilní datové typy
**Symptom:** Backend vrací chybu "Incorrect decimal value"

**Řešení:**
```javascript
// V klientovi - vždy posílej jako STRING:
fa_castka: String(parseFloat(faktura.fa_castka) || 0)

// NIKDY NE:
fa_castka: parseFloat(faktura.fa_castka)  // ❌ Špatně!
```

### 🔴 PROBLÉM 3: V2 endpoint neexistuje
**Symptom:** 404 Not Found na `/order-v2/invoices/create`

**Řešení:**
```bash
# Zkontroluj routing v backend:
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25
grep -r "invoices/create" .

# Pokud neexistuje → VYTVOŘIT HANDLER!
```

---

## ✅ TESTING CHECKLIST

### Orders Testing
- [ ] Vytvoření nové objednávky
- [ ] Autosave během vyplňování
- [ ] Úprava existující objednávky
- [ ] Smazání objednávky (soft delete)
- [ ] Obnovení smazané objednávky
- [ ] Zamykání objednávky
- [ ] Odemykání objednávky
- [ ] Přidání položky objednávky
- [ ] Přidání přílohy k objednávce
- [ ] Změna workflow stavu

### Invoices Testing
- [ ] Vytvoření faktury
- [ ] Úprava faktury (částka, číslo, datum)
- [ ] Označení faktury jako zaplacené
- [ ] Přidání přílohy k faktuře
- [ ] Smazání faktury
- [ ] Zobrazení všech faktur objednávky
- [ ] Filtrování faktur (zaplacené/nezaplacené)

### Integration Testing
- [ ] Vytvoření objednávky → přidání faktury → přidání přílohy
- [ ] Multi-user test (zamykání)
- [ ] Offline → online sync
- [ ] Mobile app compatibility

---

## 📊 PROGRESS TRACKING

### Fáze 1: Příprava ⏱️ 2h
- [ ] Verifikace V2 endpointů (30min)
- [ ] Manual API testing (1h)
- [ ] DB schema check (30min)

### Fáze 2: Orders Migration ⏱️ 4-6h
- [ ] Vytvoření apiOrderV2Service.js (1h)
- [ ] Úprava OrderForm25.js imports (30min)
- [ ] Úprava save funkce (2h)
- [ ] Testing (1-2h)
- [ ] Bug fixing (1h)

### Fáze 3: Invoices Migration ⏱️ 4-6h
- [ ] Vytvoření apiInvoiceV2Service.js (1h)
- [ ] Úprava OrderForm25.js invoice handlers (2h)
- [ ] Migrace Invoices.js (pokud existuje) (1h)
- [ ] Testing (1-2h)
- [ ] Bug fixing (1h)

### Fáze 4: Cleanup ⏱️ 2h
- [ ] Smazání api25orders.js (po ověření)
- [ ] Smazání api25invoices.js (po ověření)
- [ ] Smazání legacy backend handlers (OPTIONAL)
- [ ] Update dokumentace
- [ ] Git commit + push

---

## 🚀 QUICK START - CO UDĚLAT TEĎ

```bash
# 1. Zkontroluj V2 endpointy:
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib
grep -n "function handle_order_v2" orderV2Endpoints.php orderV2InvoiceHandlers.php

# 2. Vytvoř nový branch:
cd /var/www/erdms-dev
git checkout -b feature/migrate-to-v2-api

# 3. Začni s Orders migrací:
cd apps/eeo-v2/client/src/services
touch apiOrderV2Service.js

# 4. Postupuj podle FÁZE 2 výše
```

---

## 📞 SUPPORT

**Problémy během migrace?**
1. Zkontroluj tento dokument: `MIGRATION_PLAN_LEGACY_TO_V2.md`
2. Zkontroluj backend logy: `/var/log/apache2/error.log`
3. Zkontroluj browser console pro frontend chyby
4. Zkontroluj DB audit report: `DB_API_AUDIT_REPORT_PRODUCTION_READY.md`

**Časový odhad celkem:** 10-14 hodin práce

---

**Status:** 🔴 NOT STARTED  
**Next Action:** Fáze 1 - Verifikace V2 endpointů  
**Owner:** Development Team  
**Deadline:** Před produkcí (priorita 1)
