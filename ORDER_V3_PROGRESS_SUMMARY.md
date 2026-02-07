# 📊 Order V3 API - Souhrn Implementace

**Datum:** 23. ledna 2026  
**Branch:** `feature/generic-recipient-system`  
**Commit:** `8033a8a`

---

## ✅ CO JSME DOKONČILI

### 1. **Backend - orderV3Handlers.php**

#### Základní struktura
- ✅ Endpoint: `POST /api.eeo/order-v3/list`
- ✅ Server-side pagination (page, per_page)
- ✅ Filtering (cislo_objednavky, dodavatel_nazev, predmet, objednatel_jmeno, stav_objednavky)
- ✅ Sorting (multi-column)
- ✅ Statistiky (total, nove, ke_schvaleni, atd.)

#### SQL SELECT - Kompletní sloupce
```sql
SELECT 
    o.id, o.cislo_objednavky, o.predmet, o.poznamka,
    o.dt_objednavky, o.dt_vytvoreni, o.dt_aktualizace,
    o.financovani, o.max_cena_s_dph,
    o.stav_objednavky, o.stav_workflow_kod,
    o.zverejnit, o.dt_zverejneni, o.registr_iddt, o.zverejnil_id,
    
    -- Dodavatel (COALESCE - priorita přímé sloupce z objednávky)
    o.dodavatel_id,
    COALESCE(o.dodavatel_nazev, d.nazev) as dodavatel_nazev,
    COALESCE(o.dodavatel_ico, d.ico) as dodavatel_ico,
    o.dodavatel_adresa,
    o.dodavatel_kontakt_jmeno,
    o.dodavatel_kontakt_email,
    
    -- Uživatelé (objednatel, garant, příkazce, schvalovatel)
    -- Počet položek, faktur
FROM 25a_objednavky o
LEFT JOIN 25_dodavatele d ON o.dodavatel_id = d.id
LEFT JOIN 25_uzivatele u1 ON o.objednatel_id = u1.id
...
```

#### Enrichment Funkce

**1. enrichFinancovaniV3()**
- ✅ Manuální mapování typů financování:
  - `LP` → "Limitovaný příslib"
  - `SMLOUVA` → "Smlouva"
  - `INDIVIDUALNI_SCHVALENI` → "Individuální schválení"
  - `FINKP` → "Finanční kontrola"
- ✅ Načítání LP názvů z tabulky `25_limitovane_prisliby`
- ✅ Struktura: `lp_nazvy: [{id, cislo_lp, kod, nazev}]`

**2. enrichDodavatelV3()**
- ✅ Načítání kompletních info dodavatele z `25_dodavatele` (pokud je dodavatel_id)
- ✅ Ukládá do `_enriched.dodavatel`

**3. enrichRegistrZverejneniV3()**
- ✅ Sestavuje `registr_smluv` objekt PŘÍMO z dat objednávky (ne z modulu smluv!)
- ✅ Pole: `zverejnit`, `dt_zverejneni`, `registr_iddt`
- ✅ Načítá uživatele `zverejnil` z `25_uzivatele` (celé jméno s tituly)

#### Post-processing
```php
foreach ($orders as &$order) {
    // 1. Parsování JSON polí
    $order['financovani'] = parseFinancovani($order['financovani']);
    $order['stav_workflow_kod'] = safeJsonDecode($order['stav_workflow_kod'], array());
    
    // 2. ENRICHMENT
    enrichFinancovaniV3($db, $order);
    enrichDodavatelV3($db, $order);
    enrichRegistrZverejneniV3($db, $order);
}
```

---

### 2. **Frontend - OrdersTableV3.js**

#### Zobrazení financování
- ✅ **Typ financování:** Zkrácené české názvy (getFinancovaniText)
  - "Limitovaný příslib" → "Limitovaný p."
  - "Individuální schválení" → "Individuální s."
- ✅ **Detail:** Jen LP kódy (bez názvů) - např. "FINKP, LPE2"
- ✅ Tooltip s plným názvem typu

#### Zobrazení dodavatele
- ✅ **Název** - tučně zvýrazněný (fontWeight: 600)
- ✅ **Adresa** - nový řádek v šedé barvě
- ✅ **IČO** - zvýrazněné (fontWeight: 500)
- ✅ Šířka sloupce: 280px

#### Zobrazení stavu
- ✅ Používá `order.stav_objednavky` (české názvy přímo z DB)
- ✅ Mapování na systémové kódy pro ikony/barvy (mapUserStatusToSystemCode)

#### Podbarvení řádků podle stavu ✅ NOVÉ
- ✅ Toggle tlačítko v hlavičce stránky (ikona palety) pro zapnutí/vypnutí
- ✅ Implementováno stejně jako v OrderV2 (Orders25List)
- ✅ Světlé odstíny barev podle stavu objednávky
- ✅ Používá `getRowBackgroundColor()` a `mapUserStatusToSystemCode()`
- ✅ Kontroluje `stav_objednavky` → mapuje na systémový kód → aplikuje barvu
- ✅ Fallback na `stav_workflow_kod` (poslední stav z array)
- ✅ Responsive hover efekt (ztmavení)

---

## ⚠️ CO JEŠTĚ CHYBÍ / POTENCIÁLNÍ PROBLÉMY

### 1. **Registr smluv - OPRAVENO ✅**
- ✅ Sloupec "Stav registru" nyní správně zobrazuje "Má být zveřejněno"
- ✅ Kontroluje workflow stav `UVEREJNIT` (poslední prvek v `stav_workflow_kod` array)
- ✅ Kontroluje také `registr_smluv.zverejnit === 'ANO'` jako fallback
- ✅ Zobrazuje "Zveřejněno" pokud existuje `dt_zverejneni` A `registr_iddt`

**Databázová struktura:**
- `zverejnit` (tinytext) - hodnoty: `NULL` nebo `'0'` (NE `'ANO'`!)
- `stav_workflow_kod` (text/JSON) - obsahuje array např. `["SCHVALENA","ODESLANA","POTVRZENA","UVEREJNIT"]`
- Logika: Kontroluje poslední prvek workflow array, pokud je `'UVEREJNIT'` → "Má být zveřejněno"

### 2. **Dodavatel - kontaktní údaje ✅**
- ✅ Kontaktní údaje už jsou implementované a zobrazované
- ✅ Backend SQL načítá: `dodavatel_kontakt_jmeno`, `dodavatel_kontakt_email`, `dodavatel_kontakt_telefon`
- ✅ Frontend zobrazuje kontakt v zelené barvě pod IČO (s ikonami ✉ a ☎)

### 3. **Dodavatel - enrichment možná duplicitní**
- ⚠️ SQL už má `COALESCE(o.dodavatel_nazev, d.nazev)`
- ⚠️ Funkce `enrichDodavatelV3()` znovu načítá dodavatele do `_enriched.dodavatel`
- 🔍 **TODO:** Ověřit, zda je enrichment funkce potřeba nebo redundantní

### 3. **Stavy workflow - validace mapování**
- ✅ Frontend: `mapUserStatusToSystemCode()` mapuje české názvy na kódy
- ❓ Není ověřeno, zda všechny možné hodnoty `stav_objednavky` jsou pokryté
- 🔍 **TODO:** Porovnat s OrderV2 a ověřit všechny možné stavy

### 4. **Chybějící enrichment z OrderV2**
Z původního OrderV2 se volaly tyto enrichment funkce, které **NEJSOU** v V3:
- ❌ `enrichOrderWithItems()` - položky objednávky
- ❌ `enrichOrderWithInvoices()` - faktury
- ❌ `enrichOrderWithCodebooks()` - číselníky (střediska, pravidla)
- ❌ `enrichOrderWithWorkflowUsers()` - workflow uživatelé
- ❓ **Není jasné, zda jsou potřeba** - možná se načítají lazy load

### 5. **Testování**
- ⚠️ Nebylo otestováno s reálnými daty
- ⚠️ Nebylo ověřeno, zda všechny filtry fungují
- ⚠️ Nebylo ověřeno sorting
- ⚠️ Nebylo ověřeno načítání statistik

---

## 🎯 PROMPT PRO DALŠÍ POKRAČOVÁNÍ

```
Pokračujeme s Order V3 API:

KONTEXT:
- Backend: /apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV3Handlers.php
- Frontend: /apps/eeo-v2/client/src/components/ordersV3/OrdersTableV3.js
- Databáze: EEO-OSTRA-DEV (development)
- Git commit: 8033a8a

DOKONČENO:
✅ Enrichment financování (LP názvy, české typy)
✅ Enrichment dodavatele (adresa, IČO)
✅ Enrichment registru zveřejnění
✅ Frontend zobrazení všech základních sloupců

CO KONTROLOVAT/DOKONČIT:
1. Sloupec "Stav registru" v tabulce - ověř, že správně čte registr_smluv
2. Zkontroluj, zda enrichDodavatelV3() není redundantní (SQL už má COALESCE)
3. Otestuj všechny filtry a sorting
4. Porovnej s OrderV2 - ověř, že všechny potřebné enrichment funkce jsou
5. Zkontroluj, zda lazy load položek/faktur funguje (nebo zda je potřeba přidat)

REFERENCE:
- Order V2 endpoint: /apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2Endpoints.php
- Order V2 handlers: /apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php
- Original Orders25List: /apps/eeo-v2/client/src/components/Orders25List.js

PRAVIDLA:
- Vždy porovnávat s OrderV2 logiku
- Používat DEBUG_LOGGING_README.md pro sledování logů
- Git commit po každé větší změně
- Testovat s reálnými daty před dokončením
```

---

## 📝 POZNÁMKY

### Struktura financování v DB
Sloupec `financovani` v tabulce `25a_objednavky` je TEXT/JSON:
```json
{
  "typ": "LP",
  "lp_kody": [123, 456],
  "cislo_smlouvy": null,
  "id_individualni_schvaleni": null
}
```

Backend parsuje a obohacuje na:
```json
{
  "typ": "LP",
  "typ_nazev": "Limitovaný příslib",
  "lp_kody": [123, 456],
  "lp_nazvy": [
    {"id": 123, "cislo_lp": "FINKP", "kod": "FINKP", "nazev": "Finanční kontrola"},
    {"id": 456, "cislo_lp": "LPE2", "kod": "LPE2", "nazev": "Ostatní služby"}
  ]
}
```

### Klíčové konstanty
```php
TBL_OBJEDNAVKY = '25a_objednavky'
TBL_DODAVATELE = '25_dodavatele'
TBL_UZIVATELE = '25_uzivatele'
TBL_LIMITOVANE_PRISLIBY = '25_limitovane_prisliby'
```

### Důležité soubory
- `/var/www/erdms-dev/logs/php-debug.log` - PHP debug log
- `/var/www/erdms-dev/DEBUG_LOGGING_README.md` - Návod na logování
- `/var/www/erdms-dev/.env` - Databázové připojení (EEO-OSTRA-DEV)

---

**Další kroky:** Zkontrolovat stav registru, otestovat všechny funkce, porovnat s OrderV2 pro kompletnost.
