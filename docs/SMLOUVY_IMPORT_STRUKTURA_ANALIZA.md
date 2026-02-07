# 🔍 ANALÝZA IMPORTU ČÍSELNÍKŮ SMLUV - STRUKTURA

**Datum analýzy:** 28. prosince 2025  
**Soubor:** Číselník smluv Excel (screenshot)  
**Backend:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/smlouvyHandlers.php`  
**Endpoint:** `POST /api.eeo/ciselniky/smlouvy/bulk-import`

---

## ⚠️ ZJIŠTĚNÉ PROBLÉMY

### 1. **KRITICKÉ: Chybějící povinné pole `druh_smlouvy`**

**Problém:**  
Excel neobsahuje sloupec pro druh smlouvy, ale backend **I DATABÁZE** ho vyžadují jako **POVINNÉ**.

**DB struktura** (`/docs/setup/database-schema-25.sql`):
```sql
`druh_smlouvy` varchar(100) NOT NULL COMMENT 'Typ smlouvy: SLUŽBY, KUPNÍ, RÁMCOVÁ, atd.',
```

**Backend validace** (`smlouvyHandlers.php` řádek 81-85):
```php
if ($is_insert || isset($data['druh_smlouvy'])) {
    if (empty($data['druh_smlouvy'])) {
        $errors[] = 'Druh smlouvy je povinny';
    }
}
```

**⚠️ DŮLEŽITÉ:** Pole `druh_smlouvy` **EXISTUJE v DB** a **JE POVINNÉ**!  
Bez tohoto pole import selže na úrovni MySQL (NOT NULL constraint).

**Řešení:**
- **VARIANTA A (DOPORUČENO):** Přidat sloupec `M: DRUH SMLOUVY` do Excelu
  - Možné hodnoty: "DODAVATELSKA", "NAJEMNI", "RAMCOVA", "POSKYTOVANI_SLUZEB", "KUPNI", atd.
- **VARIANTA B:** Nastavit pevnou default hodnotu v PHP (např. "OBECNA")
  - ⚠️ Riziko: Všechny smlouvy budou mít stejný druh
- **VARIANTA C:** Odvodit z jiného pole (např. z `PŘEDMĚT SML` nebo `NÁZEV SML`)
  - Vyžaduje složitou logiku mapování

---

### 2. **Nepoužité sloupce z Excelu**

#### `G: PŘEDMĚT SML`
- **Status:** ❓ Není v DB struktuře podle INSERT příkazu
- **Možné řešení:** 
  - Ukládat do `popis_smlouvy` (pokud je `POPIS SML` prázdný)
  - Ukládat do `poznamka`
  - Ignorovat (data se ztratí)

#### `H: DATUM UZAVŘENÍ`
- **Status:** ❓ Není mapováno na žádné DB pole
- **Možné řešení:**
  - Přidat sloupec `dt_uzavreni` do tabulky `25_smlouvy`
  - Ignorovat (ekonomové často neuvádějí)
  - Ukládat do poznámky

#### `L: UKONČENÍ`
- **Status:** ❓ Nejasný účel
- **Možné řešení:**
  - Pokud je boolean → `aktivni` (0/1)
  - Pokud je datum → ignorovat (stav se počítá automaticky)

---

## 📊 POROVNÁNÍ STRUKTURY

### Excel → Backend mapping

| Excel sloupec | Backend pole | Status | Poznámka |
|--------------|--------------|--------|----------|
| `A: ČÍSLO SML - ZZS` | `cislo_smlouvy` | ✅ OK | POVINNÉ |
| `B: ÚSEK` | `usek_zkr` → `usek_id` | ✅ OK | Převádí se přes lookup |
| `C: Partner` | `nazev_firmy` | ✅ OK | POVINNÉ |
| `D: IČO` | `ico` | ✅ OK | Volitelné, validace 8 číslic |
| `E: NÁZEV SML` | `nazev_smlouvy` | ✅ OK | POVINNÉ |
| `F: POPIS SML` | `popis_smlouvy` | ✅ OK | Volitelné |
| `G: PŘEDMĚT SML` | ❌ **CHYBÍ** | ⚠️ PROBLÉM | Není v DB struktuře |
| `H: DATUM UZAVŘENÍ` | ❌ **CHYBÍ** | ⚠️ PROBLÉM | Není mapováno |
| `I: DATUM OD` | `platnost_od` | ✅ OK | Volitelné |
| `J: DATUM DO` | `platnost_do` | ✅ OK | POVINNÉ |
| `K: HODNOTA` | `hodnota_s_dph` | ✅ OK | POVINNÉ, >0 |
| `L: UKONČENÍ` | ❓ **NEJASNÉ** | ⚠️ PROBLÉM | Neznámý účel |
| ❌ **CHYBÍ V EXCELU** | `druh_smlouvy` | 🔴 **KRITICKÉ** | POVINNÉ POLE! DB: NOT NULL |
| *Pouze pro obj. formulář* | `pouzit_v_obj_formu` | ℹ️ INFO | Default: 0 (migrace 2025-12-08) |

---

## ✅ SKUTEČNÁ DATABÁZOVÁ STRUKTURA

Podle `/docs/setup/database-schema-25.sql` (skutečná produkční struktura):

```sql
CREATE TABLE `25_smlouvy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cislo_smlouvy` varchar(100) NOT NULL,           -- ✅ POVINNÉ
  `usek_id` int(11) NOT NULL,                      -- ✅ POVINNÉ
  `usek_zkr` varchar(50) DEFAULT NULL,
  `druh_smlouvy` varchar(100) NOT NULL,            -- ✅ POVINNÉ ⚠️ CHYBÍ V EXCELU!
  `nazev_firmy` varchar(255) NOT NULL,             -- ✅ POVINNÉ
  `ico` varchar(20) DEFAULT NULL,
  `dic` varchar(20) DEFAULT NULL,
  `nazev_smlouvy` varchar(500) NOT NULL,           -- ✅ POVINNÉ
  `popis_smlouvy` text DEFAULT NULL,
  `platnost_od` date DEFAULT NULL,                 -- Volitelné (ekonomové často neuvádějí)
  `platnost_do` date NOT NULL,                     -- ✅ POVINNÉ
  `hodnota_bez_dph` decimal(15,2) DEFAULT 0.00,
  `hodnota_s_dph` decimal(15,2) NOT NULL,          -- ✅ POVINNÉ
  `sazba_dph` decimal(5,2) DEFAULT 21.00,
  `cerpano_celkem` decimal(15,2) DEFAULT 0.00,     -- Počítáno automaticky
  `zbyva` decimal(15,2) DEFAULT 0.00,              -- Počítáno automaticky
  `procento_cerpani` decimal(5,2) DEFAULT 0.00,    -- Počítáno automaticky
  `aktivni` tinyint(1) DEFAULT 1,
  `pouzit_v_obj_formu` tinyint(1) DEFAULT 0,       -- Přidáno migrací 2025-12-08
  `stav` enum(...) DEFAULT 'AKTIVNI',              -- Počítáno automaticky
  `dt_vytvoreni` datetime DEFAULT NULL,
  `dt_aktualizace` timestamp DEFAULT CURRENT_TIMESTAMP,
  `vytvoril_user_id` int(11) DEFAULT NULL,
  `upravil_user_id` int(11) DEFAULT NULL,
  `posledni_prepocet` datetime DEFAULT NULL,
  `poznamka` text DEFAULT NULL,
  `cislo_dms` varchar(100) DEFAULT NULL,
  `kategorie` varchar(50) DEFAULT NULL,
  `hodnota_plneni_bez_dph` decimal(15,2) DEFAULT NULL,
  `hodnota_plneni_s_dph` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cislo_smlouvy` (`cislo_smlouvy`)
) ENGINE=InnoDB;
```

**Důležité poznámky:**
1. ✅ `druh_smlouvy` **EXISTUJE v DB** a je **NOT NULL** (POVINNÉ)
2. ✅ `pouzit_v_obj_formu` byl **přidán migrací** dne 2025-12-08
3. ⚠️ `platnost_od` je **volitelné** (ekonomové často neuvádějí datum začátku)
4. ℹ️ Sloupce `cerpano_celkem`, `zbyva`, `procento_cerpani` se **počítají automaticky**

---

## 🔧 DOPORUČENÉ ÚPRAVY

### VARIANTA 1: Úprava Excelu (DOPORUČENO)

Přidat následující sloupce:

```
M: DRUH SMLOUVY    (POVINNÉ)
   - Příklady: "DODAVATELSKA", "NAJEMNI", "RAMCOVA", "POSKYTOVANI_SLUZEB"
   
N: DIC             (Volitelné, pokud ekonomové mají)

O: KATEGORIE       (Volitelné)
   - Příklady: "IT", "STAVEBNI", "SERVIS"
```

**Upravený Excel:**
```
A: ČÍSLO SML - ZZS
B: ÚSEK
C: Partner (název firmy)
D: IČO
E: NÁZEV SML
F: POPIS SML
G: PŘEDMĚT SML      → uložit do POZNAMKA
H: DATUM UZAVŘENÍ   → ignorovat nebo přidat DB sloupec
I: DATUM OD
J: DATUM DO
K: HODNOTA (s DPH)
L: UKONČENÍ         → ignorovat
M: DRUH SMLOUVY     ← NOVÝ POVINNÝ SLOUPEC
N: DIC              ← NOVÝ VOLITELNÝ SLOUPEC
O: KATEGORIE        ← NOVÝ VOLITELNÝ SLOUPEC
```

---

### VARIANTA 2: Úprava PHP handleru (fallback)

Pokud nelze upravit Excel, upravit `smlouvyHandlers.php`:

```php
// Před validací přidat default hodnoty
if (empty($row['druh_smlouvy'])) {
    // Odvození z PŘEDMĚT SML nebo default
    if (!empty($row['predmet_smlouvy'])) {
        // Logika odvození druhu z předmětu
        $row['druh_smlouvy'] = odvodDruhSmlouvy($row['predmet_smlouvy']);
    } else {
        $row['druh_smlouvy'] = 'NEZADANO';
    }
}

// Mapování PŘEDMĚT SML do poznámky
if (!empty($row['predmet_smlouvy'])) {
    if (!empty($row['poznamka'])) {
        $row['poznamka'] .= "\nPředmět: " . $row['predmet_smlouvy'];
    } else {
        $row['poznamka'] = "Předmět: " . $row['predmet_smlouvy'];
    }
}
```

---

## 📝 OČEKÁVANÝ FORMÁT IMPORTU (CSV/Excel)

### CSV hlavička:
```csv
cislo_smlouvy,usek_zkr,druh_smlouvy,nazev_firmy,ico,dic,nazev_smlouvy,popis_smlouvy,platnost_od,platnost_do,hodnota_s_dph,hodnota_bez_dph,sazba_dph,poznamka,kategorie,pouzit_v_obj_formu
```

### Příklad řádku:
```csv
"2024-001","ZZS-HK","RAMCOVA","ABC s.r.o.","12345678","CZ12345678","Dodávka IT služeb","Správa infrastruktury","2024-01-01","2025-12-31","1000000","826446.28","21.00","Předmět: IT infrastruktura","IT","1"
```

### Možné hodnoty pro `druh_smlouvy`:
- **DODAVATELSKA** - běžná dodavatelská smlouva
- **RAMCOVA** - rámcová smlouva (opakované plnění)
- **NAJEMNI** - smlouva o nájmu (prostory, zařízení)
- **POSKYTOVANI_SLUZEB** - smlouva o poskytování služeb
- **KUPNI** - kupní smlouva (jednorázový nákup)
- **SERVISNI** - servisní smlouva (údržba, opravy)
- **LICENCNI** - licenční smlouva (SW, práva)
- **MANDATNI** - mandátní smlouva
- **PODNAJEMNI** - podnájemní smlouva
- **JINA** - jiný typ smlouvy (specifikovat v poznámce)

---

## 🧪 TESTOVACÍ SCÉNÁŘE

### 1. Test kompletního záznamu
```json
{
  "data": [{
    "cislo_smlouvy": "2024-001",
    "usek_zkr": "ZZS-HK",
    "druh_smlouvy": "RAMCOVA",
    "nazev_firmy": "ABC s.r.o.",
    "ico": "12345678",
    "dic": "CZ12345678",
    "nazev_smlouvy": "Dodávka IT služeb",
    "popis_smlouvy": "Správa infrastruktury",
    "platnost_od": "2024-01-01",
    "platnost_do": "2025-12-31",
    "hodnota_s_dph": 1000000,
    "hodnota_bez_dph": 826446.28,
    "sazba_dph": 21.00
  }]
}
```

### 2. Test minimálního záznamu (pouze povinná pole)
```json
{
  "data": [{
    "cislo_smlouvy": "2024-002",
    "usek_zkr": "ZZS-PHA",
    "druh_smlouvy": "OBECNA",
    "nazev_firmy": "XYZ a.s.",
    "nazev_smlouvy": "Testovací smlouva",
    "platnost_do": "2025-12-31",
    "hodnota_s_dph": 50000
  }]
}
```

### 3. Test chybějícího povinného pole
```json
{
  "data": [{
    "cislo_smlouvy": "2024-003",
    "usek_zkr": "ZZS-HK"
    // CHYBÍ: druh_smlouvy, nazev_firmy, nazev_smlouvy, hodnota_s_dph
  }]
}
```

**Očekávaný výsledek:**
```json
{
  "status": "ok",
  "data": {
    "celkem_radku": 1,
    "uspesne_importovano": 0,
    "chyb": 1,
    "chybove_zaznamy": [{
      "row": 1,
      "cislo_smlouvy": "2024-003",
      "error": "Druh smlouvy je povinny, Nazev firmy je povinny, Nazev smlouvy je povinny, Hodnota s DPH je povinna a musi byt kladne cislo"
    }]
  }
}
```

---

## 🚀 AKČNÍ PLÁN

### Pro ekonomy / zpracovatele dat:
1. ✅ Přidat sloupec `M: DRUH SMLOUVY` (POVINNÉ)
2. ✅ Vyplnit druh smlouvy pro všechny záznamy
3. ✅ Zkontrolovat IČO (8 číslic)
4. ✅ Zkontrolovat platnost_do (POVINNÉ)
5. ✅ Zkontrolovat hodnotu (musí být >0)

### Pro vývojáře:
1. ✅ Vytvořit mapping script pro Excel → JSON
2. ✅ Přidat frontend pro bulk import
3. ⚠️ Rozhodnout o `PŘEDMĚT SML` (do poznámky? nové pole?)
4. ⚠️ Rozhodnout o `DATUM UZAVŘENÍ` (přidat do DB?)
5. ✅ Vytvořit testovací sadu dat

---

## 📞 KONTAKT PRO DOTAZY

Pokud není jasné:
- Jaký druh smlouvy použít?
- Co dělat s `PŘEDMĚT SML`?
- Je potřeba `DATUM UZAVŘENÍ`?

→ Konzultujte s ekonomy / vedoucím oddělením

---

## 📚 REFERENCE

- **Backend handler:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/smlouvyHandlers.php`
- **Endpoint:** `POST /api.eeo/ciselniky/smlouvy/bulk-import`
- **Tabulka:** `25_smlouvy`
- **Import log:** `25_smlouvy_import_log`

---

**Vytvořeno:** 28. prosince 2025  
**Autor:** AI Assistant (GitHub Copilot)  
**Verze dokumentu:** 1.0
