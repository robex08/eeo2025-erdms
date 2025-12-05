# 🚀 Migrace na Order V2 API - Dokončeno

**Datum:** 30. října 2025  
**Verze:** 1.0  
**Status:** ✅ Implementováno

---

## 📋 Přehled změn

Frontend aplikace byl úspěšně migrován z původního `orders25` API na nové standardizované **Order V2 API**.

### ✅ Provedené změny

#### 1. **Nové endpointy v `apiOrderV2.js`**

Přidány funkce pro práci s evidenčními čísly:

```typescript
// 🔢 Generování dalšího evidenčního čísla
export async function getNextOrderNumberV2(token, username)

// ✅ Kontrola dostupnosti evidenčního čísla
export async function checkOrderNumberV2(orderNumber, token, username, suggest = false)
```

**Response struktury:**

```typescript
// getNextOrderNumberV2 response
{
  last_used_number: number,
  next_number: number,
  formatted_next: string,              // "0002"
  next_order_string: string,           // "O-0002/12345678/2025/IT"
  order_number_string: string,         // Alias
  ico: string,
  usek_zkr: string,
  current_year: string
}

// checkOrderNumberV2 response
{
  orderNumber: string,
  exists: boolean,
  canUse: boolean,
  existing_order?: { id, objednatel_id },
  suggestion?: string                   // Pokud suggest=true
}
```

#### 2. **Aktualizace `OrderForm25.js`**

##### Importy
```javascript
// ✅ Přidáno
import { 
  getOrderV2,
  createOrderV2,
  updateOrderV2,
  deleteOrderV2,
  getNextOrderNumberV2,      // ⭐ NOVÉ
  checkOrderNumberV2,        // ⭐ NOVÉ
  prepareDataForAPI,
  normalizeError
} from '../services/apiOrderV2';

// ❌ Odstraněno
// getNextOrderNumber25, createPartialOrder25, updatePartialOrder25, api25orders
```

##### Funkce `loadNextOrderNumber()`
```javascript
// ❌ BEFORE
const orderNumberData = await getNextOrderNumber25({ token, username });

// ✅ AFTER
const orderNumberData = await getNextOrderNumberV2(token, username);
```

##### Funkce `handleReloadStatus()`
```javascript
// ❌ BEFORE
const response = await api25orders.post('orders25/by-id', {
  token, username, id: parseInt(formData.id),
  uzivatel_id: parseInt(formData.objednatel_id)
});
const statusData = response.data.data;

// ✅ AFTER
const orderData = await getOrderV2(parseInt(formData.id), token, username, false);
// Přímý přístup k datům, není potřeba response.data.data
```

---

## 🎯 Výhody V2 API

### 1. **Standardizované datové typy**
```typescript
// ✅ Střediska jako array stringů
strediska_kod: ["KLADNO", "PRAHA"]  // Místo JSON stringu

// ✅ Peníze jako STRING (přesnost)
max_cena_s_dph: "25000.00"  // Místo number

// ✅ Financování jako objekt
financovani: {
  typ: "LP",
  nazev: "Limitovaný příslib",
  lp_kody: [1, 5, 8]
}  // Místo JSON stringu
```

### 2. **Konzistentní response formát**
```typescript
{
  status: 'ok',
  data: OrderV2,
  meta: {
    version: 'v2',
    standardized: true,
    timestamp: '2025-10-30T...'
  }
}
```

### 3. **Automatická transformace dat**
- `prepareDataForAPI()` - FE → BE transformace
- Validace datových typů
- Partial update support (posíláme jen změněná pole)

### 4. **Lepší error handling**
```typescript
// Detailní error info z BE
{
  status: 'error',
  error_code: 'VALIDATION_ERROR',
  validation_errors: [...],
  received_fields: [...],
  details: {...}
}
```

---

## 📊 API Endpoint Mapping

| Původní API | Nové V2 API | Status |
|-------------|-------------|--------|
| `orders25/by-id` | `GET /order-v2/{id}` | ✅ Migrováno |
| `orders25/partial-insert` | `POST /order-v2/create` | ✅ Migrováno |
| `orders25/partial-update` | `POST /order-v2/{id}/update` | ✅ Migrováno |
| `orders25/delete` | `POST /order-v2/{id}/delete` | ✅ Připraveno |
| `orders25/list` | `POST /order-v2/list` | ✅ Připraveno |
| `orders25/next-number` | `POST /order-v2/next-number` | ⭐ Nové |
| - | `POST /order-v2/check-number` | ⭐ Nové |

---

## 🔧 Workflow pro evidenční čísla

### 1. Generování nového čísla (při otevření formuláře)
```javascript
const result = await getNextOrderNumberV2(token, username);
setFormData(prev => ({
  ...prev,
  ev_cislo: result.next_order_string  // "O-0002/12345678/2025/IT"
}));
```

### 2. Validace čísla (při změně uživatelem)
```javascript
const check = await checkOrderNumberV2(orderNumber, token, username, true);
if (!check.canUse) {
  showError(`Číslo ${orderNumber} je obsazené!`);
  if (check.suggestion) {
    showSuggestion(`Navrhujeme: ${check.suggestion}`);
  }
}
```

---

## 🧪 Testování

### Checklist pro testování:
- [ ] ✅ Vytvoření nové objednávky (CREATE)
- [ ] ✅ Načtení existující objednávky (GET)
- [ ] ✅ Aktualizace objednávky (UPDATE)
- [ ] ✅ Generování evidenčního čísla (next-number)
- [ ] ⏳ Kontrola evidenčního čísla (check-number)
- [ ] ⏳ Reload stavu objednávky (handleReloadStatus)
- [ ] ⏳ Práce se střediskami (standardizovaný formát)
- [ ] ⏳ Práce s financováním (standardizovaný formát)

### Testovací scénáře:

#### 1. Nová objednávka
```javascript
// 1. Otevřít formulář pro novou objednávku
// 2. Zkontrolovat že se načetlo ev_cislo (O-XXXX/ICO/ROK/USEK)
// 3. Vyplnit povinná pole
// 4. Uložit jako koncept
// 5. Ověřit že data jsou správně transformována (strediska jako array, cena jako string)
```

#### 2. Editace objednávky
```javascript
// 1. Otevřít existující objednávku
// 2. Zkontrolovat že data jsou správně načtena (strediska, financovani, cena)
// 3. Upravit některá pole
// 4. Uložit
// 5. Zkontrolovat že partial update funguje (posílají se jen změněná pole)
```

#### 3. Reload stavu
```javascript
// 1. Otevřít objednávku v edit režimu
// 2. V druhém okně změnit workflow stav
// 3. V prvním okně kliknout na reload (🔄)
// 4. Ověřit že se aktualizoval stav_workflow_kod a stav_objednavky
```

---

## 📝 Důležité poznámky

### ⚠️ Breaking Changes
Žádné! Migrace je zpětně kompatibilní:
- Původní `orders25` API endpointy zůstávají funkční
- Postupná migrace na V2 bez výpadku služby

### 🔒 Data Integrity
- Peníze VŽDY jako STRING → žádná ztráta přesnosti
- Validace datových typů na FE i BE
- Automatická transformace před odesláním

### 🚀 Performance
- Enriched endpoint (`/enriched`) pro načtení kompletních dat
- Základní endpoint pro rychlé operace
- Partial update snižuje datový tok

### 🔧 Údržba
- Centralizovaná logika v `apiOrderV2.js`
- Type-safe interface (připraveno pro TypeScript)
- Konzistentní error handling

---

## 📚 Odkazy na dokumentaci

- [ORDER-V2-API-FRONTEND-DOCS.md](./ORDER-V2-API-FRONTEND-DOCS.md) - Kompletní API dokumentace
- [API-DATA-TYPES-STANDARDIZATION.md](./docs/API-DATA-TYPES-STANDARDIZATION.md) - Standardizace datových typů
- [apiOrderV2.js](./src/services/apiOrderV2.js) - Frontend implementace

---

## ✅ Status

**Migrace kompletní:**
- ✅ Nové endpointy implementovány
- ✅ Frontend aktualizován
- ✅ Importy vyčištěny
- ✅ Žádné TypeScript/ESLint chyby
- ⏳ Čeká na testování v produkci

**Připraveno pro:**
- Postupné doplňování dalších V2 endpointů backend týmem
- Rozšíření funkcí (list-enriched, delete, atd.)
- Migrace dalších komponent na V2 API

---

**Kontakt:** Backend tým pro dotazy k API  
**Datum dokončení:** 30. října 2025
