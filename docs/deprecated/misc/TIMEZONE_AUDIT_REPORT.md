# Kompletní audit časového pásma (Timezone) - eRDMS v2025.03_25

**Datum auditu:** 9. ledna 2026  
**Účel:** Kompletní přehled timezone handling napříč FE a PHP API v modulech: objednávky, faktury, pokladny, OrderForm25

---

## 🎯 Executive Summary

### Kritické nálezy:
1. ✅ **OPRAVENO**: `Orders25List.js` - calculateDateRange() používal UTC místo lokálního času
2. ⚠️ **ČÁSTEČNĚ KONZISTENTNÍ**: OrderV2Handler.php používá TimezoneHelper, ale logika může být přehnaná
3. ⚠️ **NEKONZISTENTNÍ**: Faktury a pokladny nemají jednotný timezone handling
4. ⚠️ **CHYBÍ STANDARDIZACE**: Frontend používá mix `toISOString()`, `toLocaleDateString()`, `formatDateForPicker()`

---

## 📊 Struktura auditu

### 1. OBJEDNÁVKY (Orders25)

#### 1.1 Frontend - Orders25List.js

**Status:** ✅ Opraveno (9.1.2026)

**Původní problém:**
```javascript
// ❌ ŠPATNĚ - používalo UTC čas
datum_do: today.toISOString().split('T')[0]  
// V 00:30 CET (9.1.2026) to vrátilo "2026-01-08" protože UTC je stále 23:30 8.1.
```

**Oprava:**
```javascript
// ✅ DOBŘE - používá lokální české datum
const formatDateLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

**Dotčené funkce:**
- `calculateDateRange()` (řádky 9784-9870)
- Používáno v: last-month, last-quarter, last-half, last-year

**Další datetime operace v Orders25List.js:**
| Řádek | Operace | Účel | Status |
|-------|---------|------|--------|
| 5313, 5331 | `new Date().toISOString()` | Request/response timestamp logging | ⚠️ OK pro debugging |
| 5482, 5483 | `new Date().toISOString()` | dt_vytvoreni, temp_datum_objednavky | ⚠️ **KONTROLOVAT** |
| 5839 | `new Date().toISOString()` | Draft timestamp | ⚠️ OK pro localStorage |
| 6748, 6749 | `new Date(dateA).getTime()` | Porovnání datumů pro řazení | ✅ OK |
| 17333 | `new Date().toISOString()` | datum_schvaleni | ⚠️ **KONTROLOVAT** |

#### 1.2 Backend - OrderV2Handler.php

**Status:** ⚠️ Možná přehnaná konverze

**Aktuální logika:**
```php
// Řádky 428-478: convertStandardDataToDbFormat()
foreach ($datetimeFields as $field) {
    if (isset($standardData[$field])) {
        // ✅ POUŽITÍ TimezoneHelper::convertUtcToCzech()
        $converted = TimezoneHelper::convertUtcToCzech($standardData[$field]);
```

**PROBLÉM:**
- TimezoneHelper::convertUtcToCzech() předpokládá, že frontend posílá UTC
- ALE! Frontend může posílat už české časy (z formatDateLocal)
- TimezoneHelper detekuje timezone offset (+01:00/+02:00) a NEKONVERTUJE, pokud už je české

**Datumová pole v Orders25:**
```php
$datetimeFields = array(
    'dt_objednavky',      // ⚠️ Hlavní datum objednávky
    'dt_vytvoreni',       // ✅ Nastavuje se PHP backendem
    'dt_aktualizace',     // ✅ Nastavuje se PHP backendem
    'dt_schvaleni',       // ⚠️ Může přijít z FE
    'dt_zverejneni',
    'dt_potvrzeni_vecne_spravnosti'
);
```

#### 1.3 Backend - orderV2Endpoints.php

**Status:** ✅ Používá TimezoneHelper konzistentně

**Klíčové operace:**
```php
// Řádek 58-59: Vytvoření objednávky
'dt_vytvoreni' => TimezoneHelper::getCzechDateTime(),
'dt_aktualizace' => TimezoneHelper::getCzechDateTime(),

// Řádek 993: dt_objednavky fallback
if (!isset($dbData['dt_objednavky']) || empty($dbData['dt_objednavky'])) {
    $dbData['dt_objednavky'] = TimezoneHelper::getCzechDateTime();
}

// Řádek 1142, 1155: Aktualizace
$dbData['dt_aktualizace'] = TimezoneHelper::getCzechDateTime();
$dbData['dt_schvaleni'] = TimezoneHelper::getCzechDateTime();
```

**Filtrace podle datumu:**
```php
// Řádky 488-523: Používá DATE() funkci MySQL
$whereConditions[] = "DATE(o.dt_objednavky) >= :datum_od";
$whereConditions[] = "DATE(o.dt_objednavky) <= :datum_do";
```
✅ **SPRÁVNĚ** - DATE() extrahuje pouze datum, ignoruje čas a timezone

---

### 2. FAKTURY (Invoices25)

#### 2.1 Frontend - InvoiceEvidencePage.js

**Status:** ⚠️ Nekonzistentní timezone handling

**formatDateForPicker():**
```javascript
// Řádek 79-81
const formatDateForPicker = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];  // ❌ POUŽÍVÁ UTC!
};
```

**PROBLÉM:**
- Stejný problém jako měl Orders25List před opravou
- `toISOString()` vrací UTC datum
- Může způsobit off-by-one error v časných ranních hodinách

**Použití:**
```javascript
// Řádek 1624, 4385, 6309
fa_datum_doruceni: formatDateForPicker(new Date()),
```

**Další datetime operace:**
```javascript
// Řádek 3500 - getCurrentTimestamp()
return new Date().toISOString().slice(0, 19).replace('T', ' ');
// ❌ UTC timestamp místo českého!

// Řádek 2491 - fa_datum_uhrazeni
fa_datum_uhrazeni: newStatus ? new Date().toISOString().split('T')[0] : null
// ❌ UTC datum!
```

#### 2.2 Backend - invoiceHandlers.php

**Status:** ⚠️ NEPOUŽÍVÁ TimezoneHelper vůbec!

**Aktuální implementace:**
```php
// Řádek 147: Nastavuje MySQL timezone
TimezoneHelper::setMysqlTimezone($db);

// ALE pak se TimezoneHelper nepoužívá pro data processing!
```

**Datumová pole v fakturách:**
```php
- fa_datum_vystaveni       // Datum vystavení faktury
- fa_datum_splatnosti      // Datum splatnosti
- fa_datum_doruceni        // Datum doručení
- fa_datum_zdanitelneho_plneni
- fa_datum_predani_zam     // Datum předání zaměstnanci
- fa_datum_vraceni_zam     // Datum vrácení od zaměstnance
- fa_datum_uhrazeni        // Datum uhrazení faktury
- fa_datum_platby
- fa_datum_zuctovani
- dt_vytvoreni            // ⚠️ Timestamp vytvoření
- dt_aktualizace          // ⚠️ Timestamp aktualizace
```

**CHYBÍ:**
- Konverze datetime polí přes TimezoneHelper
- Konzistentní nastavení dt_vytvoreni, dt_aktualizace

---

### 3. POKLADNY (Cashbooks)

#### 3.1 Backend - cashbookHandlers.php

**Status:** ⚠️ NEPOUŽÍVÁ TimezoneHelper

**Datumové operace:**
```php
// Řádek 166 - Výpočet konce měsíce
$requestedMonthEnd = date('Y-m-t', strtotime(sprintf('%04d-%02d-01', $book['rok'], $book['mesic'])));

// Řádek 171, 319 - Formátování datumu pro error message
date('j.n.Y', strtotime($assignment['platne_od']))

// Řádek 1199, 1282 - Default rok
$year = isset($input['year']) ? intval($input['year']) : intval(date('Y'));
```

**Klíčová pole:**
```php
- datum_zapisu    // Datum zápisu do pokladny
- platne_od       // Platnost přiřazení od
- platne_do       // Platnost přiřazení do
```

**CHYBÍ:**
- TimezoneHelper pro konzistentní české datum
- date() používá PHP timezone (může být UTC!)

#### 3.2 Frontend - Cashbook komponenty

**Status:** Nenalezen hlavní cashbook listing komponent

**Zjištěno:**
- `CashbookTab.js` existuje, ale je to dictionary tab (správa pokladen v nastavení)
- Potřeba najít hlavní komponent pro práci s pokladními knihami

---

### 4. ORDERFORM25

#### 4.1 Frontend - OrderForm25.js

**Status:** ⚠️ KONTROLA POTŘEBNÁ

**Zjištěné datetime operace:**
(Potřeba detailnější analýza - soubor je velký)

**Pravděpodobné dotčené oblasti:**
- Pole `dt_objednavky` v create/edit formuláři
- Pole `temp_datum_objednavky` pro draft
- Práce s datum poli ve formuláři

---

## 🔧 TimezoneHelper.php - Aktuální implementace

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/TimezoneHelper.php`

**Hlavní funkce:**

### getCzechDateTime($format = 'Y-m-d H:i:s')
```php
// Nastaví PHP timezone na Europe/Prague
// Vrátí aktuální čas v české zóně
// ✅ Používá se správně v orderV2Endpoints.php
```

### convertUtcToCzech($datetime_value)
```php
// Konvertuje UTC datetime na české
// Detekuje formáty: ISO 8601, MySQL datetime, pouze datum
// ⚠️ KRITICKÁ LOGIKA na řádku 125-130:
if ($timezone_offset === '+01:00' || $timezone_offset === '+02:00') {
    // Už je v evropské/české timezone - pouze vrátit jako MySQL formát
    return $dt->format('Y-m-d H:i:s');
}
```

**PROBLÉM:**
- Tato logika předpokládá správnou detekci timezone offsetu
- Pokud frontend pošle datum bez timezone info, předpokládá se UTC
- Může způsobit problémy, pokud frontend pošle lokální čas bez offsetu

### setMysqlTimezone($db)
```php
// Nastaví MySQL session timezone na české (+01:00 nebo +02:00)
// ✅ Volá se správně v orderV2Endpoints, invoiceHandlers
```

---

## 🚨 Kritické problémy

### 1. InvoiceEvidencePage.js - formatDateForPicker()
**Problém:** Používá UTC místo lokálního času  
**Dopad:** Datum může být o den zpět v časných ranních hodinách  
**Fix:** Stejná logika jako v Orders25List.js

### 2. Faktury - Backend nepoužívá TimezoneHelper konzistentně
**Problém:** dt_vytvoreni, dt_aktualizace nejsou nastaveny přes TimezoneHelper  
**Dopad:** Může být časový posun v timestamp polích  
**Fix:** Přidat TimezoneHelper::getCzechDateTime() pro dt_ pole

### 3. Pokladny - Vůbec nepoužívají TimezoneHelper
**Problém:** date() může vracet UTC čas  
**Dopad:** Nekonzistence s ostatními moduly  
**Fix:** Implementovat TimezoneHelper do cashbookHandlers.php

### 4. OrderV2Handler - Možná zbytečná konverze
**Problém:** convertUtcToCzech() se volá i když FE už posílá české časy  
**Dopad:** Možné duplikované konverze (ale detekce by to měla zachytit)  
**Fix:** Revize logiky - možná stačí zachovat hodnoty jak jsou

### 5. Frontend mix UTC a lokálních časů
**Problém:** Různé komponenty používají různé způsoby formátování datumů  
**Dopad:** Nekonzistence, těžko se debuguje  
**Fix:** Vytvořit utility funkci pro unified date formatting

---

## ✅ Doporučené akce

### HIGH PRIORITY:

1. **Opravit InvoiceEvidencePage.js formatDateForPicker()**
   ```javascript
   const formatDateForPicker = (date) => {
     const d = new Date(date);
     const year = d.getFullYear();
     const month = String(d.getMonth() + 1).padStart(2, '0');
     const day = String(d.getDate()).padStart(2, '0');
     return `${year}-${month}-${day}`;
   };
   ```

2. **Přidat TimezoneHelper do invoiceHandlers.php**
   - dt_vytvoreni, dt_aktualizace pomocí TimezoneHelper::getCzechDateTime()

3. **Implementovat TimezoneHelper do cashbookHandlers.php**
   - Nahradit date() za TimezoneHelper::getCzechDateTime()

### MEDIUM PRIORITY:

4. **Audit OrderForm25.js datetime handling**
   - Zkontrolovat jak se posílá dt_objednavky
   - Ověřit temp_datum_objednavky

5. **Vytvořit unified date formatting utility**
   ```javascript
   // utils/dateUtils.js
   export const formatLocalDate = (date) => { ... };
   export const getCurrentLocalDateTime = () => { ... };
   ```

6. **Revidovat OrderV2Handler timezone logiku**
   - Může být zbytečně složitá
   - Zvážit zjednodušení

### LOW PRIORITY:

7. **Dokumentace timezone best practices**
   - Aktualizovat PHP_api.prompt.md
   - Přidat React date handling guide

8. **Unit testy pro timezone logiku**
   - Test časných ranních hodin (00:00-02:00 CET)
   - Test přechodu letní/zimní čas

---

## 📝 Poznámky k MySQL DATE() funkci

**Správné použití:**
```sql
-- ✅ DOBŘE - DATE() extrahuje pouze datum, ignoruje timezone
WHERE DATE(dt_objednavky) >= '2026-01-01'

-- ⚠️ POZOR - Bez DATE() by timezone záleželo
WHERE dt_objednavky >= '2026-01-01 00:00:00'
```

**V orderV2Endpoints.php:**
```php
// Řádek 488-489
$whereConditions[] = "DATE(o.dt_objednavky) >= :datum_od";
$whereConditions[] = "DATE(o.dt_objednavky) <= :datum_do";
```
✅ **SPRÁVNĚ IMPLEMENTOVÁNO**

---

## 📊 Shrnutí podle modulů

| Modul | Frontend Status | Backend Status | Priorita |
|-------|----------------|----------------|----------|
| **Objednávky (Orders25)** | ✅ Opraveno | ✅ Dobré | ✅ OK |
| **Faktury (Invoices25)** | ❌ formatDateForPicker UTC | ⚠️ Chybí TimezoneHelper | 🔴 HIGH |
| **Pokladny (Cashbooks)** | ❓ Nenalezen listing | ❌ Nepoužívá TimezoneHelper | 🟡 MEDIUM |
| **OrderForm25** | ❓ Potřeba audit | ✅ Sdílí OrderV2Handler | 🟡 MEDIUM |

---

## 🎓 Timezone Best Practices

### Frontend (React):

**✅ SPRÁVNĚ:**
```javascript
// Pro datum v lokálním čase
const date = new Date();
const localDateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

// Pro ISO timestamp s timezone info
const isoWithTz = date.toISOString(); // Obsahuje Z (UTC marker)
```

**❌ ŠPATNĚ:**
```javascript
// UTC datum místo lokálního
const date = new Date().toISOString().split('T')[0]; // ❌ V ranních hodinách vrátí včerejší datum!
```

### Backend (PHP):

**✅ SPRÁVNĚ:**
```php
// Pro české časy
$czech_time = TimezoneHelper::getCzechDateTime();

// Pro konverzi UTC -> Czech
$czech_dt = TimezoneHelper::convertUtcToCzech($utc_datetime);

// Pro nastavení MySQL timezone
TimezoneHelper::setMysqlTimezone($db);
```

**❌ ŠPATNĚ:**
```php
// date() může vrátit UTC v závislosti na PHP config
$timestamp = date('Y-m-d H:i:s'); // ❌ Timezone závisí na php.ini!
```

---

**Konec auditu**  
**Další kroky:** Implementovat HIGH PRIORITY opravy
