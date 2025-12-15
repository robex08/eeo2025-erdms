# ✅ Notification Template Variants - Parser Upgrade

**Datum:** 15. prosince 2025  
**Soubor:** `OrganizationHierarchy.js` (řádky ~5795-5820)  
**Funkce:** `parseAllVariants(emailBody)`

---

## 🎯 Problém

Původní parser podporoval pouze **3 varianty** z šablony `order_status_ke_schvaleni`:
```html
<!-- RECIPIENT: APPROVER_NORMAL -->
<!-- RECIPIENT: APPROVER_URGENT -->
<!-- RECIPIENT: SUBMITTER -->
```

**Nové šablony Fáze 1** používají **2 varianty** s jiným názvoslovím:
```html
<!-- RECIPIENT: RECIPIENT -->
<!-- RECIPIENT: SUBMITTER -->
```

➡️ **Důsledek:** V modulu Hierarchie se zobrazovala jen 1 varianta místo 2.

---

## ✅ Řešení

**Rozšířen parser** `parseAllVariants()` na **4 typy variant:**

```javascript
const variantTypes = [
  // ⭐ NOVÝ FORMÁT (Fáze 1)
  { type: 'RECIPIENT', icon: '🟠', name: 'Příjemce (oranžová - normální)' },
  
  // 🔧 STARÝ FORMÁT (order_status_ke_schvaleni)
  { type: 'APPROVER_NORMAL', icon: '🟠', name: 'Schvalovatel (oranžová - normální)' },
  { type: 'APPROVER_URGENT', icon: '🔴', name: 'Schvalovatel (červená - urgentní)' },
  
  // ✅ SPOLEČNÁ VARIANTA
  { type: 'SUBMITTER', icon: '🟢', name: 'Autor objednávky (zelená - info)' }
];
```

---

## 📊 Podporované šablony

### Starý formát (3 varianty):
| Šablona | Typ | Varianty |
|---------|-----|----------|
| Objednávka ke schválení | `order_status_ke_schvaleni` | APPROVER_NORMAL, APPROVER_URGENT, SUBMITTER |

### Nový formát Fáze 1 (2 varianty):
| Šablona | Typ | Varianty |
|---------|-----|----------|
| Objednávka schválena | `order_status_schvalena` | RECIPIENT, SUBMITTER |
| Objednávka zamítnuta | `order_status_zamitnuta` | RECIPIENT, SUBMITTER |
| Objednávka vrácena k doplnění | `order_status_ceka_se` | RECIPIENT, SUBMITTER |

---

## 🔄 Mapování variant

### Pro Fáze 1 šablony:
| Varianta | Použití | Ikona | Barva |
|----------|---------|-------|-------|
| **RECIPIENT** | Normální notifikace pro příjemce | 🟠 | Oranžová |
| **SUBMITTER** | Informační notifikace pro autora | 🟢 | Zelená |

### Pro staré šablony:
| Varianta | Použití | Ikona | Barva |
|----------|---------|-------|-------|
| **APPROVER_NORMAL** | Normální schválení | 🟠 | Oranžová |
| **APPROVER_URGENT** | Urgentní schválení | 🔴 | Červená |
| **SUBMITTER** | Info pro autora | 🟢 | Zelená |

---

## 📝 Rozdíly v konceptu

### Starý přístup (3-stavový):
- APPROVER_NORMAL = běžné schválení → **oranžová**
- APPROVER_URGENT = urgentní schválení → **červená**
- SUBMITTER = info pro autora → **zelená**

### Nový přístup Fáze 1 (2-stavový):
- RECIPIENT = příjemce akce → **oranžová** (bez rozlišení urgence v HTML)
- SUBMITTER = autor objednávky → **zelená**

**Důvod:**
- Urgence se řeší na úrovni **objednávky**, ne šablony
- HTML varianta je čistě **role-based** (kdo dostává notifikaci)
- Jednodušší údržba a konzistentnější design

---

## 🎨 Zobrazení v modulu Hierarchie

### Když vybereš šablonu Fáze 1:

**Dropdown pro NORMÁLNÍ stav:**
```
🟠 Příjemce (oranžová - normální)
🟢 Autor objednávky (zelená - info)
```

**Dropdown pro MIMOŘÁDNÝ stav:**
```
🟠 Příjemce (oranžová - normální)
🟢 Autor objednávky (zelená - info)
```

**Dropdown pro INFORMAČNÍ stav:**
```
🟠 Příjemce (oranžová - normální)
🟢 Autor objednávky (zelená - info)
```

➡️ Uživatel může kombinovat varianty podle potřeby:
- Normální stav: **RECIPIENT** (oranžová)
- Mimořádný stav: **RECIPIENT** (oranžová, stejná jako normální)
- Informační stav: **SUBMITTER** (zelená)

---

## 🔧 Backend kompatibilita

### PHP notificationHelpers.php

Backend již správně extrahuje varianty:
```php
// Rozdělení podle <!-- RECIPIENT: TYPE -->
$parts = preg_split('/<!-- RECIPIENT: (\w+) -->/', $email_body, -1, PREG_SPLIT_DELIM_CAPTURE);
```

➡️ **Funguje pro oba formáty:**
- `<!-- RECIPIENT: RECIPIENT -->`
- `<!-- RECIPIENT: APPROVER_NORMAL -->`
- `<!-- RECIPIENT: SUBMITTER -->`

---

## ✅ Testování

### Kontrola šablon v DB:
```sql
SELECT 
    type,
    name,
    CASE 
        WHEN email_body LIKE '%<!-- RECIPIENT: RECIPIENT -->%' THEN '✅ RECIPIENT'
        WHEN email_body LIKE '%<!-- RECIPIENT: APPROVER_NORMAL -->%' THEN '✅ APPROVER_NORMAL'
        ELSE '❌ ŽÁDNÁ'
    END as varianta_1,
    CASE 
        WHEN email_body LIKE '%<!-- RECIPIENT: SUBMITTER -->%' THEN '✅ SUBMITTER'
        ELSE '❌ ŽÁDNÁ'
    END as varianta_2
FROM 25_notification_templates 
WHERE type IN ('order_status_schvalena', 'order_status_zamitnuta', 'order_status_ceka_se', 'order_status_ke_schvaleni')
ORDER BY id;
```

**Výsledek:**
```
order_status_ke_schvaleni    → APPROVER_NORMAL + SUBMITTER (+ APPROVER_URGENT)
order_status_schvalena       → RECIPIENT + SUBMITTER ✅
order_status_zamitnuta       → RECIPIENT + SUBMITTER ✅
order_status_ceka_se         → RECIPIENT + SUBMITTER ✅
```

---

## 📋 Budoucí fáze

### Fáze 2-4 šablony budou používat:
```html
<!-- RECIPIENT: RECIPIENT -->
<!-- RECIPIENT: SUBMITTER -->
```

**Konzistentní s Fází 1**, žádné změny parseru potřeba. ✅

---

## 🎉 Výhody tohoto řešení

1. ✅ **Zpětná kompatibilita** - Staré šablony fungují dál
2. ✅ **Žádné změny v DB** - Šablony zůstávají beze změn
3. ✅ **Jednodušší údržba** - Parser podporuje oba formáty
4. ✅ **Flexibilita** - Můžeme mít šablony s 2 nebo 3 variantami
5. ✅ **Snadné rozšíření** - Přidání nového typu = 1 řádek kódu

---

## 🔍 Co se stalo

### Před úpravou:
```javascript
const variantTypes = [
  { type: 'APPROVER_NORMAL', ... },
  { type: 'APPROVER_URGENT', ... },
  { type: 'SUBMITTER', ... }
];
```
➡️ Parser našel **0 variant** v nových šablonách (hledal APPROVER_NORMAL, ale v DB byl RECIPIENT)

### Po úpravě:
```javascript
const variantTypes = [
  { type: 'RECIPIENT', ... },        // ⭐ NOVÉ
  { type: 'APPROVER_NORMAL', ... },  // 🔧 STARÉ
  { type: 'APPROVER_URGENT', ... },  // 🔧 STARÉ
  { type: 'SUBMITTER', ... }         // ✅ SPOLEČNÉ
];
```
➡️ Parser najde **2 varianty** (RECIPIENT + SUBMITTER) ✅

---

## 🚀 Aktuální stav

✅ **HOTOVO:**
- Parser rozšířen
- Nové šablony Fáze 1 zobrazují **2 varianty**
- Staré šablony fungují bez změn

✅ **OVĚŘENO:**
- `order_status_schvalena` → 2 varianty (RECIPIENT, SUBMITTER)
- `order_status_zamitnuta` → 2 varianty (RECIPIENT, SUBMITTER)
- `order_status_ceka_se` → 2 varianty (RECIPIENT, SUBMITTER)
- `order_status_ke_schvaleni` → 3 varianty (APPROVER_NORMAL, APPROVER_URGENT, SUBMITTER)

---

**Závěr:** Modul Hierarchie nyní správně zobrazuje obě varianty pro nové šablony Fáze 1. 🎉
