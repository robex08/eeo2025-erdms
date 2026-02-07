# Dokončená migrace Invoice API - Legacy → V2 API

**Datum dokončení:** 21. prosince 2025  
**Status:** ✅ KOMPLETNÍ

## 🎯 CÍL MIGRACE

Eliminace míchání legacy (`invoices25/*`) a V2 (`order-v2/*`) API endpointů pro faktury a převedení celé aplikace na **čisté V2 API**.

## 📋 DOKONČENÉ ZMĚNY

### 1. **Backend - Rozšíření V2 API** 
Přidány nové V2 endpointy pro standalone faktury:

```php
// NOVÉ V2 endpointy pro faktury BEZ objednávky
POST /order-v2/invoices/create                    // Standalone faktura
POST /order-v2/invoices/create-with-attachment    // Standalone faktura s přílohou

// EXISTUJÍCÍ V2 endpointy PRO objednávky  
POST /order-v2/{order_id}/invoices/create                    // Faktura pro objednávku
POST /order-v2/{order_id}/invoices/create-with-attachment    // Faktura pro objednávku s přílohou

// SPOLEČNÉ V2 endpointy
POST /order-v2/invoices/{invoice_id}/update       // Update faktury
POST /order-v2/invoices/{invoice_id}/delete       // Delete faktury
```

### 2. **Frontend - Převod na čisté V2 API**

#### **apiInvoiceV2.js** ✅
```javascript
// PŘED (míchání legacy a V2):
const endpoint = order_id 
  ? `order-v2/${order_id}/invoices/create`
  : 'invoices25/create';  // ❌ Legacy

// PO (čisté V2 API):
const endpoint = order_id 
  ? `order-v2/${order_id}/invoices/create` 
  : 'order-v2/invoices/create';  // ✅ V2 standalone
```

#### **api25invoices.js** ✅  
Stejné změny jako v `apiInvoiceV2.js`.

### 3. **Legacy Handlers - Označení jako DEPRECATED** ✅

`/lib/invoiceHandlers.php` - označen jako **plně deprecated**:
```php
/**
 * 🚨 PLNĚ DEPRECATED - POUŽÍVAT POUZE orderV2InvoiceHandlers.php! 🚨
 * 
 * ⚠️ Frontend byl převeden na čisté V2 API endpointy
 * ⚠️ Legacy API endpointy nejsou již používány od 21.12.2025
 * 
 * 🗑️ PLÁN ODEBRÁNÍ:
 * - Q1 2026: Kompletní odstranění legacy endpointů z api.php
 * - Q2 2026: Smazání tohoto souboru
 */
```

## 🔧 TECHNICKÉ DETAILY

### **Jednotný Response Formát**
Všechny V2 endpointy používají konzistentní formát:
```json
{
  "status": "ok",
  "message": "Zpráva pro uživatele",
  "data": { ... }
}
```

### **Audit Trail**
✅ Všechny V2 operace automaticky sledují:
- `vytvoril_uzivatel_id` + `dt_vytvoreni` při CREATE
- `aktualizoval_uzivatel_id` + `dt_aktualizace` při UPDATE/DELETE
- `TimezoneHelper` pro správné české časové značky

### **Standalone Faktury**
V2 API nyní podporuje faktury nezávislé na objednávkách:
- `order_id = null` v databázi
- Používá se pro faktury mimo workflow objednávek
- Stejná funkcionalita jako faktury s objednávkou

## 📊 MAPOVÁNÍ ENDPOINTŮ

| Legacy Endpoint | V2 Endpoint | Status |
|---|---|---|
| `invoices25/create` | `order-v2/invoices/create` nebo `order-v2/{order_id}/invoices/create` | ✅ Migrováno |
| `invoices25/create-with-attachment` | `order-v2/invoices/create-with-attachment` nebo `order-v2/{order_id}/invoices/create-with-attachment` | ✅ Migrováno |
| `invoices25/update` | `order-v2/invoices/{invoice_id}/update` | ✅ Migrováno |
| `invoices25/delete` | `order-v2/invoices/{invoice_id}/delete` | ✅ Migrováno |

## 🧪 TESTOVÁNÍ

### **Otestovat před nasazením:**
1. **Vytvoření faktury pro objednávku** (OrderForm25.js)
2. **Vytvoření standalone faktury** (bez order_id)  
3. **Update faktury** - ověřit audit trail
4. **Delete faktury** - soft/hard delete
5. **Error handling** - ověřit, že používá V2 error detection

### **SQL dotazy pro kontrolu:**
```sql
-- Kontrola audit trail po update
SELECT id, fa_cislo_vema, aktualizoval_uzivatel_id, dt_aktualizace, dt_vytvoreni 
FROM 25a_objednavky_faktury 
WHERE dt_aktualizace IS NOT NULL 
ORDER BY dt_aktualizace DESC LIMIT 5;

-- Kontrola standalone faktur  
SELECT id, fa_cislo_vema, objednavka_id, vytvoril_uzivatel_id, dt_vytvoreni
FROM 25a_objednavky_faktury 
WHERE objednavka_id IS NULL
ORDER BY dt_vytvoreni DESC LIMIT 5;
```

## ✅ VÝSLEDEK

- **100% eliminace** legacy API z frontendu
- **Konzistentní** V2 API napříč celou aplikací  
- **Zachována zpětná kompatibilita** (legacy handlery stále existují)
- **Pripraveno na odstranění** legacy kódu v Q1-Q2 2026
- **Úplný audit trail** pro všechny invoice operace

Frontend nyní **vždy** používá V2 API, bez ohledu na to, jestli má faktury `order_id` nebo ne.