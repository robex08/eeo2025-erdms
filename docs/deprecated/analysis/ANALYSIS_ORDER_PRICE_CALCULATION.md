# 🔍 ANALÝZA: Logika počítání celkové ceny objednávek

**Datum**: 19. prosince 2025  
**Požadavek**: Unifikovat logiku počítání celkové ceny objednávek mezi mobilní a desktop verzí  
**Pravidlo**: Celková cena = faktury (pokud existují) > položky (pokud existují) > max_cena_s_dph (fallback)

---

## 📊 Současný stav

### ✅ Desktop verze (Orders25List.js) - **SPRÁVNĚ**

```javascript
// /var/www/erdms-dev/apps/eeo-v2/client/src/pages/Orders25List.js (řádek 6249)
const getOrderTotalPriceWithDPH = useCallback((order) => {
  // 1. Zkus vrácené pole z BE (polozky_celkova_cena_s_dph je již součet)
  if (order.polozky_celkova_cena_s_dph != null && order.polozky_celkova_cena_s_dph !== '') {
    const value = parseFloat(order.polozky_celkova_cena_s_dph);
    if (!isNaN(value)) return value;
  }

  // 2. Spočítej z položek (Order V2 API vrací polozky přímo v order objektu)
  if (order.polozky && Array.isArray(order.polozky) && order.polozky.length > 0) {
    const total = order.polozky.reduce((sum, item) => {
      const cena = parseFloat(item.cena_s_dph || 0);
      return sum + (isNaN(cena) ? 0 : cena);
    }, 0);
    return total;
  }

  // 3. Pokud nejsou položky, vrať 0 (NE max_cena_s_dph!)
  return 0;
}, [orders]);
```

**Problém**: Nezohledňuje faktury! Chybí logika pro sčítání faktur.

---

### ❌ Mobilní verze (OrderApprovalCard.jsx) - **ŠPATNĚ**

```javascript
// /var/www/erdms-dev/apps/eeo-v2/client/src/components/mobile/OrderApprovalCard.jsx (řádek 32)
const maxCena = parseFloat(order.max_cena_s_dph || 0);

// ... později zobrazí pouze max_cena_s_dph
<span className="mobile-approval-value">{formatCurrency(maxCena)}</span>
```

**Problém**: 
- ❌ Používá pouze `max_cena_s_dph` (limit, ne skutečná cena)
- ❌ Ignoruje faktury
- ❌ Ignoruje položky

---

### ✅ Backend (orderHandlers.php) - **ČÁSTEČNĚ SPRÁVNĚ**

```php
// /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php

// Řádek 343: Počítání celkové ceny s DPH z položek
$order['polozky_count'] = count($order['polozky']);
$celkova_cena_s_dph = 0.0;

foreach ($order['polozky'] as $polozka) {
    if (isset($polozka['cena_s_dph']) && is_numeric($polozka['cena_s_dph'])) {
        $celkova_cena_s_dph += (float)$polozka['cena_s_dph'];
    }
}

$order['polozky_celkova_cena_s_dph'] = $celkova_cena_s_dph;

// Řádek 493: Počítání celkové částky faktur s DPH
$celkova_castka_faktur_s_dph = 0.0;
foreach ($order['faktury'] as $faktura) {
    $castka = null;
    if (isset($faktura['castka_s_dph']) && is_numeric($faktura['castka_s_dph'])) {
        $castka = (float)$faktura['castka_s_dph'];
    } elseif (isset($faktura['fa_castka']) && is_numeric($faktura['fa_castka'])) {
        $castka = (float)$faktura['fa_castka'];
    }
    
    if ($castka !== null) {
        $celkova_castka_faktur_s_dph += $castka;
    }
}
$order['faktury_celkova_castka_s_dph'] = $celkova_castka_faktur_s_dph;
```

**Stav**: Backend správně počítá obě hodnoty, ale nevrací **finální celkovou cenu** podle priority.

---

## 🎯 Požadovaná logika

```
POKUD má objednávka faktury:
  celkova_cena = SOUČET(faktury.castka_s_dph)
  
JINAK POKUD má objednávka položky:
  celkova_cena = SOUČET(polozky.cena_s_dph)
  
JINAK:
  celkova_cena = max_cena_s_dph (schválený limit)
```

---

## 🔧 Plán opravy

### 1️⃣ Backend (PHP) - Přidat výpočet `celkova_cena_s_dph`

**Soubor**: `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php`

**Přidat novou funkci** (po řádku 509):

```php
/**
 * Vypočítá celkovou cenu objednávky s DPH podle priority:
 * 1. Faktury (pokud existují)
 * 2. Položky (pokud existují)
 * 3. Max cena s DPH (fallback)
 * 
 * @param array $order - Objednávka s načtenými fakturami a položkami
 * @return float - Celková cena s DPH
 */
function calculateOrderTotalPrice(&$order) {
    // 1. Priorita: Faktury
    if (isset($order['faktury_celkova_castka_s_dph']) && $order['faktury_celkova_castka_s_dph'] > 0) {
        return (float)$order['faktury_celkova_castka_s_dph'];
    }
    
    // 2. Priorita: Položky
    if (isset($order['polozky_celkova_cena_s_dph']) && $order['polozky_celkova_cena_s_dph'] > 0) {
        return (float)$order['polozky_celkova_cena_s_dph'];
    }
    
    // 3. Fallback: Max cena s DPH (schválený limit)
    if (isset($order['max_cena_s_dph']) && is_numeric($order['max_cena_s_dph'])) {
        return (float)$order['max_cena_s_dph'];
    }
    
    return 0.0;
}
```

**Volat funkci** po enrichment (řádek ~515):

```php
function enrichOrderWithInvoices($db, &$order) {
    // ... existing code ...
    $order['faktury_celkova_castka_s_dph'] = $celkova_castka_faktur_s_dph;
    
    // 🆕 Vypočítat celkovou cenu objednávky podle priority
    $order['celkova_cena_s_dph'] = calculateOrderTotalPrice($order);
}
```

---

### 2️⃣ Frontend Desktop (Orders25List.js) - Opravit logiku

**Soubor**: `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/Orders25List.js`

**Opravit funkci** (řádek 6249):

```javascript
const getOrderTotalPriceWithDPH = useCallback((order) => {
  // 🆕 1. PRIORITA: Faktury (pokud existují)
  if (order.faktury_celkova_castka_s_dph != null && order.faktury_celkova_castka_s_dph !== '') {
    const value = parseFloat(order.faktury_celkova_castka_s_dph);
    if (!isNaN(value) && value > 0) return value;
  }
  
  // 2. PRIORITA: Položky (pokud existují)
  if (order.polozky_celkova_cena_s_dph != null && order.polozky_celkova_cena_s_dph !== '') {
    const value = parseFloat(order.polozky_celkova_cena_s_dph);
    if (!isNaN(value) && value > 0) return value;
  }

  // 🔄 Spočítej z pole položek jako fallback
  if (order.polozky && Array.isArray(order.polozky) && order.polozky.length > 0) {
    const total = order.polozky.reduce((sum, item) => {
      const cena = parseFloat(item.cena_s_dph || 0);
      return sum + (isNaN(cena) ? 0 : cena);
    }, 0);
    if (total > 0) return total;
  }

  // 3. FALLBACK: Max cena s DPH (schválený limit) - pouze pokud objednávka nemá faktury ani položky
  if (order.max_cena_s_dph != null && order.max_cena_s_dph !== '') {
    const value = parseFloat(order.max_cena_s_dph);
    if (!isNaN(value)) return value;
  }

  return 0;
}, [orders]);
```

---

### 3️⃣ Frontend Mobile (OrderApprovalCard.jsx) - Nová logika

**Soubor**: `/var/www/erdms-dev/apps/eeo-v2/client/src/components/mobile/OrderApprovalCard.jsx`

**Přidat funkci** (řádek 32):

```javascript
// 🆕 NOVÁ LOGIKA: Celková cena podle priority faktury > položky > max cena
const getCelkovaCena = (order) => {
  // 1. PRIORITA: Faktury (pokud existují)
  if (order.faktury_celkova_castka_s_dph != null && order.faktury_celkova_castka_s_dph !== '') {
    const value = parseFloat(order.faktury_celkova_castka_s_dph);
    if (!isNaN(value) && value > 0) return value;
  }
  
  // 2. PRIORITA: Položky (pokud existují)
  if (order.polozky_celkova_cena_s_dph != null && order.polozky_celkova_cena_s_dph !== '') {
    const value = parseFloat(order.polozky_celkova_cena_s_dph);
    if (!isNaN(value) && value > 0) return value;
  }

  // Fallback: Spočítej z pole položek
  if (order.polozky && Array.isArray(order.polozky) && order.polozky.length > 0) {
    const total = order.polozky.reduce((sum, item) => {
      const cena = parseFloat(item.cena_s_dph || 0);
      return sum + (isNaN(cena) ? 0 : cena);
    }, 0);
    if (total > 0) return total;
  }

  // 3. FALLBACK: Max cena s DPH (schválený limit)
  if (order.max_cena_s_dph != null && order.max_cena_s_dph !== '') {
    const value = parseFloat(order.max_cena_s_dph);
    if (!isNaN(value)) return value;
  }

  return 0;
};

const celkovaCena = getCelkovaCena(order);
```

**Změnit zobrazení** (řádek 158):

```javascript
<span className="mobile-approval-label">Celková cena s DPH:</span>
<span className="mobile-approval-value">{formatCurrency(celkovaCena)}</span>
```

---

## 📝 API Endpoint upgrade na V2 standard

### Současný stav endpointu

**Soubor**: `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/index.php`

Endpoint `/orders25/list` používá:
- ✅ PDO pro databázové dotazy
- ⚠️ Starý handler s nedostatečnou kontrolou chyb
- ⚠️ Není plně kompatibilní s V2 API standardem

### Upgrade plan

1. **Error handling**: Přidat try-catch bloky s logováním
2. **Validace vstupů**: Zajistit bezpečnost parametrů
3. **Konzistentní response**: Standardizovat formát odpovědí
4. **Dokumentace**: Přidat PHPDoc komentáře

---

## ✅ Testovací scénáře

### Test 1: Objednávka s fakturami

**Vstup**:
```json
{
  "max_cena_s_dph": 100000,
  "polozky_celkova_cena_s_dph": 80000,
  "faktury_celkova_castka_s_dph": 85000
}
```

**Očekávaný výstup**: `85 000 Kč` (z faktur)

---

### Test 2: Objednávka bez faktur, s položkami

**Vstup**:
```json
{
  "max_cena_s_dph": 100000,
  "polozky_celkova_cena_s_dph": 80000,
  "faktury_celkova_castka_s_dph": 0
}
```

**Očekávaný výstup**: `80 000 Kč` (z položek)

---

### Test 3: Objednávka bez faktur a položek

**Vstup**:
```json
{
  "max_cena_s_dph": 100000,
  "polozky_celkova_cena_s_dph": 0,
  "faktury_celkova_castka_s_dph": 0
}
```

**Očekávaný výstup**: `100 000 Kč` (z max_cena_s_dph)

---

### Test 4: Nová objednávka (žádná data)

**Vstup**:
```json
{
  "max_cena_s_dph": 100000
}
```

**Očekávaný výstup**: `100 000 Kč` (z max_cena_s_dph)

---

## 🚀 Implementační kroky

1. ✅ Analýza dokončena
2. ⏭️ Backup vytvořen (git commit)
3. ⏭️ Backend: Přidat `calculateOrderTotalPrice()` funkci
4. ⏭️ Backend: Volat funkci v `enrichOrderWithInvoices()`
5. ⏭️ Frontend Desktop: Opravit `getOrderTotalPriceWithDPH()`
6. ⏭️ Frontend Mobile: Přidat `getCelkovaCena()` funkci
7. ⏭️ Testování na development prostředí
8. ⏭️ Git commit a push
9. ⏭️ Dokumentace do `/var/www/erdms-dev/_docs/`

---

## 📊 Dopad změn

### Soubory k úpravě

1. **Backend** (1 soubor):
   - `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php`

2. **Frontend Desktop** (1 soubor):
   - `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/Orders25List.js`

3. **Frontend Mobile** (1 soubor):
   - `/var/www/erdms-dev/apps/eeo-v2/client/src/components/mobile/OrderApprovalCard.jsx`

4. **Také použít v** (2 soubory - volitelné):
   - `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/ReportsPage.js`
   - `/var/www/erdms-dev/apps/eeo-v2/client/src/services/api25reports.js`

### Rizika

- **Nízké**: Změny jsou izolované v helper funkcích
- **Backward compatible**: Fallback na starší logiku zachován
- **Testovatelné**: Jasné testovací scénáře

---

## 📚 Reference

- Desktop logika: `Orders25List.js:6249`
- Mobile komponenta: `OrderApprovalCard.jsx:32`
- Backend handler: `orderHandlers.php:343,493`
- Database config: `dbconfig.php` (host: 10.3.172.11, db: eeo2025)

---

**Status**: ✅ ANALÝZA DOKONČENA - Připraveno k implementaci
