# DOKUMENTACE: Tři typy čerpání smluv (podle vzoru LP)

**Datum:** 28. prosince 2025  
**Verze:** v2025.03_25  
**Typ:** Database Schema + Business Logic  

---

## 🎯 Přehled

Systém rozlišuje **TŘI TYPY ČERPÁNÍ** smluv podle vzoru limitovaných příslíbů:

1. **POŽADOVÁNO** (`cerpano_pozadovano`) - maximální částka z `max_cena_s_dph` objednávek
2. **PLÁNOVÁNO** (`cerpano_planovano`) - reálný odhad z položek objednávek (TODO: implementace)
3. **SKUTEČNĚ ČERPÁNO** (`cerpano_skutecne`) - finální čerpání z faktur

---

## 📊 Rozlišení smluv podle `pouzit_v_obj_formu`

### Typ 1: Smlouvy dostupné v OrderForm (`pouzit_v_obj_formu = 1`)

**Kde se nabízí:**
- ✅ **OrderForm25** - uživatel vybírá smlouvu při vytváření objednávky
- ✅ **Modul faktur** - uživatel mapuje fakturu na smlouvu nebo objednávku

**Čerpání:**
```
┌─────────────────┐
│  OBJEDNÁVKA     │
│  (schválená)    │
└────────┬────────┘
         │
         ├─► POŽADOVÁNO: max_cena_s_dph
         │   (pesimistický odhad)
         │
         ├─► PLÁNOVÁNO: Σ položek
         │   (reálný odhad)
         │
         └─► [volitelně] → FAKTURA → SKUTEČNĚ ČERPÁNO
                                      (finální čerpání)
```

**Příklad:**
- Objednávka: `max_cena_s_dph = 100 000 Kč` → POŽADOVÁNO
- Položky: `15 000 + 25 000 + 30 000 = 70 000 Kč` → PLÁNOVÁNO
- Faktura: `fa_castka = 68 500 Kč` → SKUTEČNĚ ČERPÁNO

### Typ 2: Smlouvy pouze v modulu smluv a faktur (`pouzit_v_obj_formu = 0`)

**Kde se nabízí:**
- ❌ **OrderForm25** - smlouva se nenabízí
- ✅ **Modul faktur** - uživatel mapuje fakturu přímo na smlouvu

**Čerpání:**
```
┌─────────────────┐
│  FAKTURA        │
│  (přímo na SML) │
└────────┬────────┘
         │
         └─► SKUTEČNĚ ČERPÁNO
             (jediný zdroj čerpání)
```

**Příklad:**
- POŽADOVÁNO: `0 Kč` (nejsou objednávky)
- PLÁNOVÁNO: `0 Kč` (nejsou objednávky)
- Faktura: `fa_castka = 150 000 Kč` → SKUTEČNĚ ČERPÁNO

---

## 🗄️ Struktura databáze

### Nové sloupce v tabulce `25_smlouvy`

```sql
-- TŘI TYPY ČERPÁNÍ
cerpano_pozadovano    DECIMAL(15,2)  -- max_cena_s_dph z objednávek
cerpano_planovano     DECIMAL(15,2)  -- suma položek objednávek
cerpano_skutecne      DECIMAL(15,2)  -- suma faktur

-- ZBÝVAJÍCÍ ČÁSTKY
zbyva_pozadovano      DECIMAL(15,2)  -- hodnota - požadováno
zbyva_planovano       DECIMAL(15,2)  -- hodnota - plánováno
zbyva_skutecne        DECIMAL(15,2)  -- hodnota - skutečně

-- PROCENTA ČERPÁNÍ
procento_pozadovano   DECIMAL(5,2)   -- % požadovaného
procento_planovano    DECIMAL(5,2)   -- % plánovaného
procento_skutecne     DECIMAL(5,2)   -- % skutečného

-- ZPĚTNÁ KOMPATIBILITA
cerpano_celkem        DECIMAL(15,2)  -- = cerpano_skutecne
zbyva                 DECIMAL(15,2)  -- = zbyva_skutecne
procento_cerpani      DECIMAL(5,2)   -- = procento_skutecne
```

---

## ⚙️ Logika přepočtu

### Stored Procedure: `sp_prepocet_cerpani_smluv`

```sql
CALL sp_prepocet_cerpani_smluv(NULL, NULL);  -- všechny smlouvy
CALL sp_prepocet_cerpani_smluv('S-147/750309/26/23', NULL);  -- jedna smlouva
```

### Pro smlouvy s `pouzit_v_obj_formu = 1`

**1. POŽADOVÁNO** (max_cena_s_dph):
```sql
SELECT COALESCE(SUM(max_cena_s_dph), 0)
FROM 25a_objednavky
WHERE JSON_UNQUOTE(JSON_EXTRACT(financovani, '$.cislo_smlouvy')) = 'S-xxx'
  AND stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA');
```

**2. PLÁNOVÁNO** (položky):
```sql
-- TODO: Implementovat po vytvoření vazby položek na objednávky
-- Zatím: cerpano_planovano = cerpano_pozadovano
```

**3. SKUTEČNĚ ČERPÁNO** (faktury):
```sql
-- Dvě možnosti propojení:
-- A) Faktura → objednávka → smlouva (přes JSON)
-- B) Faktura → smlouva (přímo)

SELECT COALESCE(SUM(fa_castka), 0)
FROM 25a_objednavky_faktury f
LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
WHERE (
  (f.objednavka_id IS NOT NULL AND 
   JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.cislo_smlouvy')) = 'S-xxx')
  OR
  (f.smlouva_id = <id_smlouvy> AND f.objednavka_id IS NULL)
)
AND f.stav != 'STORNO';
```

### Pro smlouvy s `pouzit_v_obj_formu = 0`

```sql
-- Pouze faktury
SELECT COALESCE(SUM(fa_castka), 0)
FROM 25a_objednavky_faktury f
WHERE f.smlouva_id = <id_smlouvy>
  AND f.stav != 'STORNO';
```

---

## 📋 Pracovní workflow

### 1. Vytvoření objednávky (OrderForm25)

```
Uživatel vybere smlouvu (pouzit_v_obj_formu = 1)
   ↓
Zadá položky a max_cena_s_dph
   ↓
Objednávka uložena s JSON:
{
  "typ": "SMLOUVA",
  "cislo_smlouvy": "S-269/75030926/2025"
}
   ↓
Automatický přepočet smlouvy:
- POŽADOVÁNO += max_cena_s_dph
- PLÁNOVÁNO += suma položek (TODO)
```

### 2. Schválení objednávky

```
Objednávka → stav "SCHVÁLENA"
   ↓
Přepočet smlouvy (již zahrnuto v požadováno/plánováno)
```

### 3. Vytvoření faktury k objednávce

```
Faktura → objednavka_id = <id>
   ↓
Automatický přepočet smlouvy:
- SKUTEČNĚ ČERPÁNO += fa_castka
```

### 4. Vytvoření faktury přímo na smlouvu

```
Faktura → smlouva_id = <id>, objednavka_id = NULL
   ↓
Automatický přepočet smlouvy:
- SKUTEČNĚ ČERPÁNO += fa_castka
```

---

## 🎨 Zobrazení v UI

### Dashboard / Tabulka smluv

| Smlouva | Hodnota | Požadováno | Plánováno | Skutečně | Zbývá | Status |
|---------|---------|------------|-----------|----------|-------|--------|
| S-147/750309/26/23 | 88 814 | 0 | 0 | **25 000** | 63 814 | 🟢 28% |
| S-134/75030926/2025 | 655 953 | 68 000 | 68 000 | **360 768** | 295 185 | 🟡 55% |
| S-096/75030926/22 | 357 555 | 0 | 0 | **180 000** | 177 555 | 🟡 50% |

**Legenda:**
- **Požadováno** - oranžová barva (pesimistický odhad)
- **Plánováno** - modrá barva (reálný odhad)
- **Skutečně** - zelená barva (finální čerpání) - **PRIMÁRNÍ**

### Detail smlouvy

```
╔══════════════════════════════════════════╗
║  SMLOUVA S-134/75030926/2025            ║
╠══════════════════════════════════════════╣
║  Hodnota smlouvy:        655 952,75 Kč  ║
║                                          ║
║  📊 ČERPÁNÍ:                             ║
║  ┌────────────────────────────────────┐ ║
║  │ Požadováno:    68 000,00 Kč (10%)  │ ║
║  │ Plánováno:     68 000,00 Kč (10%)  │ ║
║  │ ✅ Skutečně:  360 768,26 Kč (55%)  │ ║
║  └────────────────────────────────────┘ ║
║                                          ║
║  💰 ZBÝVÁ: 295 184,49 Kč (45%)          ║
╚══════════════════════════════════════════╝
```

---

## 🔄 Automatický přepočet

### Kdy se spouští přepočet

1. **Po uložení objednávky** se smlouvou
   - `prepocetCerpaniSmlouvyAuto($cislo_smlouvy)`
   
2. **Po vytvoření faktury** k objednávce nebo smlouvě
   - `prepocetCerpaniSmlouvyAuto($cislo_smlouvy)`
   
3. **Manuálně** přes API endpoint
   - `POST /smlouvy-v2/prepocet-cerpani`

### PHP funkce

```php
function prepocetCerpaniSmlouvyAuto($cislo_smlouvy) {
    try {
        $config = require __DIR__ . '/dbconfig.php';
        $db = get_db($config['mysql']);
        
        $sql = "CALL sp_prepocet_cerpani_smluv(?, NULL)";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(1, $cislo_smlouvy, PDO::PARAM_STR);
        $stmt->execute();
        
        error_log("AUTO PREPOCET: Smlouva $cislo_smlouvy prepoctena (3 typy)");
        
    } catch (Exception $e) {
        error_log("AUTO PREPOCET ERROR: " . $e->getMessage());
    }
}
```

---

## ⚠️ TODO - Plánované čerpání z položek

**Aktuální stav:** `cerpano_planovano = cerpano_pozadovano` (fallback)

**Potřebné:**
1. Vytvořit vazbu položek objednávek na smlouvy
2. Upravit stored proceduru:

```sql
-- Místo fallbacku:
SELECT COALESCE(SUM(pol.cena_s_dph), 0) INTO v_cerpano_planovano
FROM 25a_objednavky_polozky pol
INNER JOIN 25a_objednavky o ON pol.objednavka_id = o.id
WHERE JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.cislo_smlouvy')) = v_cislo_smlouvy
  AND o.stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA');
```

---

## 📚 Reference

**Vzor:** Limitované příslíby (`25_limitovane_prisliby_cerpani`)
- Handler: `/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_pdo.php`
- Stejná logika třech typů čerpání

**Soubory:**
- Migrace: `_docs/database-migrations/ALTER_SMLOUVY_ADD_TRI_TYPY_CERPANI.sql`
- Procedura: `_docs/database-migrations/CREATE_SP_PREPOCET_CERPANI_SMLUV.sql`
- Handler: `/v2025.03_25/lib/smlouvyHandlers.php`

---

**Autor:** GitHub Copilot  
**Revize:** v1.0 - 28.12.2025
