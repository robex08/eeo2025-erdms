# FULLTEXT_SEARCH_COMPLETE_ANALYSIS_ORDER_V2.md

## 🎯 CÍLE - ORDER V2 SYSTEM - ORDER25LISTV3 KOMPLETNÍ FULLTEXT SEARCH

### TÝKÁ SE ORDER V2 - ORDER25LISTV3 SOUBOR A PŘIDRUŽENÉ:

**HLAVNÍ KOMPONENTY:**
- `Order25ListV3.jsx` - hlavní komponenta
- `OrdersTableV3.jsx` - tabulka s řádky
- `VirtualizedOrdersTable.jsx` - virtualizovaná tabulka
- Všechny hookusy: `useOrdersV3.js`, `useOrderFiltersV3.js`
- Backend: `orderV3Handlers.php`

---

## 📋 KROK 1: ANALÝZA FRONTEND UI - ORDER25LISTV3 A PŘIDRUŽENÉ

### 🔍 MÍSTA K PROHLEDÁNÍ:
```
/var/www/erdms-dev/apps/eeo-v2/client/src/components/orders/
/var/www/erdms-dev/apps/eeo-v2/client/src/hooks/
/var/www/erdms-dev/apps/eeo-v2/client/src/pages/orders/
```

### 🎯 HLEDAT TYTO KOMPONENTY:
- [ ] **Order25ListV3.jsx** - hlavní seznam 
- [ ] **OrdersTableV3.jsx** - tabulka s daty
- [ ] **OrderDetail komponenty** - modal/stránka s detailem
- [ ] **OrderV3Detail** nebo podobné názvy
- [ ] **Modaly pro faktury, přílohy, LP kódy**
- [ ] **Taby v detailu objednávky**

### 🔍 CO HLEDAT V UI KOMPONENTÁCH:
```javascript
// V Order25ListV3.jsx a souvisejících:
- Columns definice v TanStack Table
- DetailRow komponenty
- Modal komponenty pro:
  * Faktury (invoice)
  * Přílohy (attachments) 
  * LP kódy (limitovane_prisliby)
  * Klasifikace (classification)
  * Dodavatel info (supplier details)
```

### 🎯 MAPOVAT VŠECHNA UI POLE:

**ZÁKLADNÍ INFO:**
- [ ] Číslo objednávky
- [ ] Předmět/název
- [ ] Poznámka
- [ ] Dodavatel + ico/dic/adresa
- [ ] Uživatelé (zadavatel, schvalovatel, atd.)
- [ ] Stavy, datumy

**FAKTURY TAB:**
- [ ] Číslo VEMA
- [ ] Poznámka faktury
- [ ] Věcná správnost
- [ ] Finanční kontrola
- [ ] Další textová pole

**PŘÍLOHY TAB:**
- [ ] Název souboru
- [ ] Typ přílohy
- [ ] Popis/poznámka k příloze
- [ ] Klasifikace přílohy

**POLOŽKY TAB:**
- [ ] Popis položky
- [ ] Poznámka k položce
- [ ] Kódy (úsek, budova, místnost)
- [ ] Katalogové číslo
- [ ] Dodavatelské číslo

**LP KÓDY TAB:**
- [ ] Číslo LP
- [ ] Název účtu
- [ ] Popis/poznámka
- [ ] Klasifikace

**SMLOUVY:**
- [ ] Číslo smlouvy
- [ ] Název smlouvy
- [ ] Poznámka ke smlouvě

---

## 📋 KROK 2: ANALÝZA BACKEND ENRICH - orderV3Handlers.php

### 🔍 NAJÍT TYTO FUNKCE:
```php
// V orderV3Handlers.php:
- getOrdersV3() - hlavní SELECT
- enrichOrdersDataV3() - obohacení dat
- loadOrderDetailV3() - detail objednávky
- Všechny LEFT JOIN tabulky
```

### 🎯 ANALYZOVAT VŠECHNY JOIN TABULKY:
```sql
-- SOUČASNÉ JOINS (ověřit):
LEFT JOIN 25_uzivatele u1 ON o.zadavatel_id = u1.id
LEFT JOIN 25_uzivatele u2 ON o.schvalovatel_id = u2.id  
LEFT JOIN 25_uzivatele u3 ON o.kontrolni_osoba_id = u3.id
LEFT JOIN 25_uzivatele u4 ON o.prijemce_id = u4.id

-- MOŽNÉ DALŠÍ JOINS (prozkoumat):
LEFT JOIN 25_dodavatele d ON o.dodavatel_id = d.id
LEFT JOIN 25_smlouvy s ON o.smlouva_id = s.id
LEFT JOIN 25_limitovane_prisliby lp ON ...
LEFT JOIN 25a_objednavky_klasifikace kl ON ...
-- ATD.
```

---

## 📋 KROK 3: DATABÁZOVÁ ANALÝZA - DESCRIBE VŠECHNY TABULKY

### 🗄️ TABULKY K PROVĚŘENÍ:

**HLAVNÍ:**
- [ ] `DESCRIBE 25a_objednavky;` - hlavní tabulka

**UŽIVATELÉ:**
- [ ] `DESCRIBE 25_uzivatele;` - jmeno, prijmeni, email, telefon, atd.

**DODAVATELÉ:**
- [ ] `DESCRIBE 25_dodavatele;` - nazev, ico, dic, adresa, kontakty

**FAKTURY:**
- [x] `DESCRIBE 25a_objednavky_faktury;` - HOTOVO

**PŘÍLOHY:**
- [x] `DESCRIBE 25a_objednavky_prilohy;` - HOTOVO

**POLOŽKY:**
- [x] `DESCRIBE 25a_objednavky_polozky;` - HOTOVO

**LP SYSTÉM:**
- [ ] `DESCRIBE 25_limitovane_prisliby;` - cislo_lp, nazev_uctu, popis
- [ ] `DESCRIBE 25a_objednavky_lp_prirazeni;` - propojovací tabulka

**SMLOUVY:**
- [ ] `DESCRIBE 25_smlouvy;` - cislo, nazev, poznamka

**KLASIFIKACE:**
- [ ] `DESCRIBE 25a_objednavky_klasifikace;` - klasifikační údaje

**ORGANIZACE:**
- [ ] `DESCRIBE 25_organizace_vizitka;` - názvy organizací

---

## 📋 KROK 4: MAPOVÁNÍ UI → DATABASE

### 📊 VYTVOŘIT TABULKU:

| UI POLE | DB TABULKA | DB SLOUPEC | PRIORITA | POZNÁMKA |
|---------|------------|------------|----------|----------|
| Číslo objednávky | 25a_objednavky | cislo_objednavky | HIGH | ✅ HOTOVO |
| Předmět | 25a_objednavky | predmet | HIGH | ✅ HOTOVO |
| Poznámka | 25a_objednavky | poznamka | HIGH | ✅ HOTOVO |
| Dodavatel název | 25a_objednavky | dodavatel_nazev | HIGH | ✅ HOTOVO |
| | | | | |
| **FAKTURY** | | | | |
| Číslo VEMA | 25a_objednavky_faktury | fa_cislo_vema | HIGH | ✅ HOTOVO |
| Poznámka faktury | 25a_objednavky_faktury | fa_poznamka | HIGH | ✅ HOTOVO |
| | | | | |
| **PŘÍLOHY** | | | | |
| Název souboru | 25a_objednavky_prilohy | originalni_nazev_souboru | HIGH | ✅ HOTOVO |
| | | | | |
| **POLOŽKY** | | | | |
| Popis položky | 25a_objednavky_polozky | popis | HIGH | ✅ HOTOVO |
| | | | | |
| **DODAVATELÉ** | | | | |
| ICO | 25_dodavatele | ico | MEDIUM | ❌ CHYBÍ |
| DIC | 25_dodavatele | dic | MEDIUM | ❌ CHYBÍ |
| Adresa | 25_dodavatele | adresa | LOW | ❌ CHYBÍ |
| | | | | |
| **UŽIVATELÉ** | | | | |
| Jméno/příjmení | 25_uzivatele | jmeno, prijmeni | HIGH | ✅ HOTOVO |
| Email | 25_uzivatele | email | MEDIUM | ❌ CHYBÍ |
| | | | | |
| **LP KÓDY** | | | | |
| Číslo LP | 25_limitovane_prisliby | cislo_lp | HIGH | ❌ CHYBÍ |
| Název účtu | 25_limitovane_prisliby | nazev_uctu | HIGH | ❌ CHYBÍ |
| | | | | |
| **SMLOUVY** | | | | |
| Číslo smlouvy | 25_smlouvy | cislo | MEDIUM | ❌ CHYBÍ |
| Název smlouvy | 25_smlouvy | nazev | MEDIUM | ❌ CHYBÍ |

---

## 📋 KROK 5: IMPLEMENTACE ROZŠÍŘENÉHO SEARCH

### 🔧 ÚPRAVA WHERE PODMÍNKY:

```php
// SOUČASNÝ STAV - 16 parametrů:
$where_conditions[] = "(
    // 8 původních podmínek ✅
    // 4 faktury ✅  
    // 2 přílohy ✅
    // 2 položky ✅
)";

// ROZŠÍŘENÍ O:
// + DODAVATELÉ (ico, dic, adresa)
// + UŽIVATELÉ (email, telefon)
// + LP KÓDY (cislo_lp, nazev_uctu)
// + SMLOUVY (cislo, nazev, poznamka)
// + KLASIFIKACE (textová pole)
```

### 🎯 NOVÉ EXISTS SUBQUERY:

```sql
-- DODAVATELÉ:
EXISTS (SELECT 1 FROM 25_dodavatele d WHERE d.id = o.dodavatel_id AND (
    LOWER(d.ico) LIKE LOWER(?) OR
    LOWER(d.dic) LIKE LOWER(?) OR
    LOWER(REPLACE(...d.adresa...)) LIKE LOWER(?)
))

-- LP KÓDY:
EXISTS (SELECT 1 FROM 25a_objednavky_lp_prirazeni lpr 
    JOIN 25_limitovane_prisliby lp ON lpr.lp_id = lp.id
    WHERE lpr.objednavka_id = o.id AND (
        LOWER(lp.cislo_lp) LIKE LOWER(?) OR
        LOWER(REPLACE(...lp.nazev_uctu...)) LIKE LOWER(?)
    )
)

-- ATD.
```

---

## 📋 KROK 6: TESTOVÁNÍ

### 🧪 TEST CASES:
- [ ] Hledat ICO dodavatele
- [ ] Hledat DIC dodavatele  
- [ ] Hledat číslo LP kódu
- [ ] Hledat název účtu LP
- [ ] Hledat číslo smlouvy
- [ ] Hledat email uživatele
- [ ] Kombinované hledání

### 📊 MONITORING:
- [ ] PHP error log kontrola
- [ ] Performance test s rozšířeným dotazem
- [ ] Počet výsledků před/po rozšíření

---

## 🚨 KRITICKÉ PŘIPOMENUTÍ:

### ❌ ZAKÁZÁNO:
- Hádání názvů sloupců
- Předpokládání existence tabulek
- Implementace bez ověření DESCRIBE

### ✅ POVINNÉ:
- DESCRIBE každé tabulky před použitím
- Ověření existence sloupců v current enrichment
- Správný počet parametrů v SQL
- Test po každé změně

---

## 📝 PROGRESS TRACKING:

### ✅ HOTOVO:
- Faktury: fa_cislo_vema, fa_poznamka, vecna_spravnost_poznamka, vecna_spravnost_umisteni_majetku
- Přílohy: originalni_nazev_souboru, typ_prilohy
- Položky: popis, poznamka
- Uživatelé: jmeno, prijmeni (všichni 4 typy)

### 🔄 TODO:
- [ ] Analýza UI komponent Order25ListV3
- [ ] DESCRIBE všech related tabulek
- [ ] Mapování UI → DB polí
- [ ] Rozšíření fulltext search o všechna pole
- [ ] Kompletní testování

**ZAČÍNAT: Najít Order25ListV3.jsx a analyzovat všechny zobrazované informace.**