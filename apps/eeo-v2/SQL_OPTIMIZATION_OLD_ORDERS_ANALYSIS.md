# SQL OPTIMALIZACE - Staré objednávky (< 2026)

**Datum analýzy:** 20.04.2026  
**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/old/queries.php`  
**Endpoint:** `old_endpoints.php` → action: `react-get-year-orders`

---

## 📊 SOUČASNÝ STAV DOTAZU

### Aktuální SQL dotaz (řádek 55-56 queries.php):
```sql
SELECT 
    obj.id, obj.evidencni_c, DATE_FORMAT(obj.datum_u, '%d.%m.%Y') as datum_p, 
    obj.dodatek_sml_id, obj.vypovedni_lhuta,
    
    -- ❌ SUBQUERY 1: Garant
    (SELECT garant FROM garant WHERE garant.id = obj.garant_id) as garant,
    
    -- ❌ SUBQUERY 2: User surname
    (SELECT surname FROM users WHERE users.id = obj.user_id) as uName,
    
    -- ❌ SUBQUERY 3: Okres
    (SELECT okres FROM okresy WHERE okresy.id = obj.okres_id) as okres,
    
    -- ❌ SUBQUERY 4: Umístění
    (SELECT umisteni FROM umisteni WHERE umisteni.id = obj.umisteni_id) as umisteni,
    
    -- ❌ SUBQUERY 5: Druh smlouvy
    (SELECT druh FROM druh_smlouvy WHERE druh_smlouvy.id = obj.druh_sml_id) as druh_sml,
    
    obj.tt_vyrc, obj.tt_dinfo, obj.faktura, obj.pokladni_dok,
    DATE_FORMAT(obj.dt_pridani, '%d.%m.%Y %H:%i:%s') as dt_pridani,
    
    -- ❌ SUBQUERY 6: User creator (duplicitní s uName!)
    (SELECT TRIM(CONCAT(surname,' ', name)) FROM users WHERE users.id = obj.user_id) as userCreator,
    
    DATE_FORMAT(obj.dt_modifikace, '%d.%m.%Y %H:%i:%s') as dt_modifikace,
    
    -- ❌ SUBQUERY 7: User updater
    (SELECT TRIM(CONCAT(surname,' ', name)) FROM users WHERE users.id = obj.upd_user_id) as userUpdater,
    
    obj.partner_nazev, obj.partner_ic, obj.partner_adresa, obj.obsah, 
    obj.cena, obj.cena_rok, obj.platnost_do, obj.ukonceno,
    DATE_FORMAT(obj.dt_zverejneni, '%d.%m.%Y') as dt_zverejneni, 
    obj.zverejnit, obj.idds,
    
    -- ❌ SUBQUERY 8: COUNT příloh (nejdražší!)
    (SELECT COUNT(opriloh.id_smlouvy) FROM :tbl_oprilohy opriloh WHERE opriloh.id_smlouvy = obj.id) as prilohy,
    
    obj.poznamka, obj.poznamka_garant,
    
    -- ❌ SUBQUERY 9: Metadata
    (SELECT metadata FROM :tbl_objMD objmd WHERE objmd.objednavka_id = obj.id) as objMetaData
    
FROM :tab_obj obj
WHERE obj.datum_u >= :yearFrom AND obj.datum_u < DATE_ADD(:yearTo, INTERVAL 1 DAY);
```

---

## 🔴 IDENTIFIKOVANÉ PROBLÉMY

### 1. **9 Correlated Subqueries = N+1 problém**
- Každý řádek výsledku (např. 100 objednávek) triggeruje **9× samostatný SQL dotaz**
- Celkem: **100 objednávek × 9 subqueries = 900 dodatečných dotazů!**
- MySQL nemůže použít bulk fetch nebo index join

### 2. **COUNT Subquery pro přílohy**
```sql
(SELECT COUNT(opriloh.id_smlouvy) FROM :tbl_oprilohy opriloh WHERE opriloh.id_smlouvy = obj.id)
```
- **Nejdražší operace** - COUNT na každý řádek
- Pokud tabulka příloh je velká (10k+ řádků), velmi pomalé

### 3. **Duplicitní data**
- `uName` (surname) vs `userCreator` (surname + name) - **2× dotaz na stejného usera!**

### 4. **DATE_FORMAT v SELECT**
- 3× volání DATE_FORMAT na každý řádek
- Lepší formátovat na frontend

### 5. **Chybějící indexy** (pravděpodobně)
- Foreign keys (`garant_id`, `user_id`, `okres_id`, `umisteni_id`, `druh_sml_id`, `upd_user_id`)
- `datum_u` pro WHERE podmínku
- `id_smlouvy` v tabulce příloh pro COUNT

---

## ✅ NÁVRH OPTIMALIZACE (bez změny architektury)

### VERZE 1: Převést subqueries na LEFT JOIN

```sql
SELECT 
    obj.id, 
    obj.evidencni_c, 
    DATE_FORMAT(obj.datum_u, '%d.%m.%Y') as datum_p,
    obj.dodatek_sml_id, 
    obj.vypovedni_lhuta,
    
    -- ✅ JOIN místo subquery
    g.garant,
    u.surname as uName,
    o.okres,
    um.umisteni,
    ds.druh as druh_sml,
    
    obj.tt_vyrc, obj.tt_dinfo, obj.faktura, obj.pokladni_dok,
    DATE_FORMAT(obj.dt_pridani, '%d.%m.%Y %H:%i:%s') as dt_pridani,
    
    -- ✅ Použít stejný JOIN jako pro uName
    TRIM(CONCAT(u.surname, ' ', u.name)) as userCreator,
    
    DATE_FORMAT(obj.dt_modifikace, '%d.%m.%Y %H:%i:%s') as dt_modifikace,
    
    -- ✅ Druhý user pro updatera
    TRIM(CONCAT(upd.surname, ' ', upd.name)) as userUpdater,
    
    obj.partner_nazev, obj.partner_ic, obj.partner_adresa, 
    obj.obsah, obj.cena, obj.cena_rok, obj.platnost_do, obj.ukonceno,
    DATE_FORMAT(obj.dt_zverejneni, '%d.%m.%Y') as dt_zverejneni,
    obj.zverejnit, obj.idds,
    
    -- ✅ LEFT JOIN místo COUNT subquery
    COALESCE(prilohy_count.cnt, 0) as prilohy,
    
    obj.poznamka, obj.poznamka_garant,
    
    -- ✅ LEFT JOIN pro metadata
    objmd.metadata as objMetaData

FROM :tab_obj obj

-- ✅ JOINs pro reference tabulky
LEFT JOIN garant g ON g.id = obj.garant_id
LEFT JOIN users u ON u.id = obj.user_id
LEFT JOIN okresy o ON o.id = obj.okres_id
LEFT JOIN umisteni um ON um.id = obj.umisteni_id
LEFT JOIN druh_smlouvy ds ON ds.id = obj.druh_sml_id
LEFT JOIN users upd ON upd.id = obj.upd_user_id

-- ✅ Agregovaný subquery pro přílohy (rychlejší než correlated)
LEFT JOIN (
    SELECT id_smlouvy, COUNT(*) as cnt
    FROM :tbl_oprilohy
    GROUP BY id_smlouvy
) prilohy_count ON prilohy_count.id_smlouvy = obj.id

-- ✅ Metadata jako jednoduchý JOIN
LEFT JOIN :tbl_objMD objmd ON objmd.objednavka_id = obj.id

WHERE obj.datum_u >= :yearFrom 
  AND obj.datum_u < DATE_ADD(:yearTo, INTERVAL 1 DAY);
```

### OČEKÁVANÝ VÝKON:
- **Před optimalizací:** 1 hlavní dotaz + 900 subquery dotazů = **901 dotazů**
- **Po optimalizaci:** **1 dotaz s JOINy** = **~50-80% rychlejší**

---

## 🔧 DOPORUČENÉ INDEXY

Ověř a případně přidej tyto indexy:

```sql
-- Hlavní tabulka objednávek
ALTER TABLE objednavky0123 ADD INDEX idx_datum_u (datum_u);
ALTER TABLE objednavky0123 ADD INDEX idx_garant_id (garant_id);
ALTER TABLE objednavky0123 ADD INDEX idx_user_id (user_id);
ALTER TABLE objednavky0123 ADD INDEX idx_upd_user_id (upd_user_id);
ALTER TABLE objednavky0123 ADD INDEX idx_okres_id (okres_id);
ALTER TABLE objednavky0123 ADD INDEX idx_umisteni_id (umisteni_id);
ALTER TABLE objednavky0123 ADD INDEX idx_druh_sml_id (druh_sml_id);

-- Tabulka příloh (KRITICKÝ pro COUNT!)
ALTER TABLE pripojene_odokumenty0123 ADD INDEX idx_id_smlouvy (id_smlouvy);

-- Metadata tabulka
ALTER TABLE r_objMetaData ADD INDEX idx_objednavka_id (objednavka_id);
```

**Zkontroluj existující indexy:**
```sql
SHOW INDEX FROM objednavky0123;
SHOW INDEX FROM pripojene_odokumenty0123;
SHOW INDEX FROM r_objMetaData;
```

---

## 📈 MĚŘENÍ VÝKONU

**Před implementací změř čas:**
```sql
SET @start_time = NOW(6);
-- ... původní dotaz ...
SELECT TIMESTAMPDIFF(MICROSECOND, @start_time, NOW(6)) / 1000 as execution_time_ms;
```

**Po implementaci změř znovu a porovnej.**

---

## 🚀 IMPLEMENTACE

### Krok 1: Záloha
```bash
cp /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/old/queries.php \
   /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/old/queries.php.backup
```

### Krok 2: Upravit queries.php
- Nahradit dotaz na řádku 55-56 optimalizovanou verzí

### Krok 3: Testovat
```bash
# Otestovat endpoint
curl -X POST http://localhost/dev/api.eeo/old_endpoints.php \
  -H "Content-Type: application/json" \
  -d '{
    "action": "react-get-year-orders",
    "yearFrom": "2020-01-01",
    "yearTo": "2025-12-31",
    "tabulka_obj": "objednavky0123",
    "tabulka_opriloh": "pripojene_odokumenty0123",
    "tabulka_objMD": "r_objMetaData",
    "token": "...",
    "username": "..."
  }'
```

### Krok 4: Porovnat výsledky
- Stejný počet řádků?
- Stejná data?
- Rychlejší načítání?

---

## 🎯 OČEKÁVANÉ ZLEPŠENÍ

| Metrika | Před | Po | Zlepšení |
|---------|------|-----|----------|
| Počet dotazů | 901 | 1 | **-99.9%** |
| Doba načítání (100 záznamů) | ~2-3s | ~200-500ms | **~80%** |
| Zátěž DB | Vysoká | Nízká | **Výrazně nižší** |
| Škálovatelnost | Špatná (lineární růst) | Dobrá (konstantní) | **Výrazně lepší** |

---

## ⚠️ POZNÁMKY

1. **Testuj nejdřív na DEV** (databáze `EEO-OSTRA-DEV`)
2. **Záloha je klíčová** - starý dotaz funguje, nový musí vracet stejná data
3. **Indexy jsou kritické** - bez nich JOIN může být dokonce pomalejší než subqueries
4. **Frontend formátování** - zvažte přesunout DATE_FORMAT na frontend (menší zátěž DB)
5. **NECHCI paging/delta** - tato optimalizace respektuje požadavek "vše najednou"

---

## 🤝 ALTERNATIVNÍ ŘEŠENÍ (pokud JOIN nestačí)

Pokud by i optimalizovaný dotaz byl pomalý:

1. **Materializovaný view** (MySQL 8.0+) nebo periodický CRON update cache tabulky
2. **Redis cache** s TTL 5 minut
3. **Elasticsearch** pro fulltext search + rychlé dotazy
4. **Rozdělení na 2 dotazy:** 
   - První: Základní data objednávek (rychlé)
   - Druhý: Metadata + přílohy (lazy load)

**Ale myslím, že JOIN optimalizace by měla stačit pro 100-500 objednávek.**
