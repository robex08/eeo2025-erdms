# 📋 PLÁN IMPLEMENTACE - MODUL ROČNÍ POPLATKY

**Datum:** 27.1.2026  
**Databáze DEV:** EEO-OSTRA-DEV  
**Databáze PROD:** eeo2025  
**Vzorový modul:** Order V3  

---

## 🎯 CÍL IMPLEMENTACE

Vytvořit modul pro správu **ročních poplatků** spojených se smlouvami:
- Rozepsání pravidelných poplatků pod vybranou smlouvu
- Sledování stavů jednotlivých plateb
- Integrace s moduly: Smlouvy, Faktury
- **ŽÁDNÉ hardcode hodnoty** - vše v číselníku stavů
- Flexibilní struktura s JSON rozšiřujícími poli

---

## 📊 STRUKTURA DATABÁZE

### ⚠️ DŮLEŽITÉ: ŽÁDNÉ NOVÉ TABULKY PRO ČÍSELNÍKY!
Všechny číselníky (stavy, druhy, typy plateb) jdou do **existující tabulky** `25_ciselnik_stavy` s různými `typ_objektu`.

---

## 🏷️ ČÍSELNÍKY - VLOŽENÍ DO `25_ciselnik_stavy`

### 1️⃣ Stavy ročního poplatku (`typ_objektu = 'ROCNI_POPLATEK'`)

```sql
-- Přidání stavů do EXISTUJÍCÍ tabulky 25_ciselnik_stavy
INSERT INTO `25_ciselnik_stavy` 
  (`typ_objektu`, `kod_stavu`, `nadrazeny_kod_stavu`, `nazev_stavu`, `popis`, `platnost_do`, `aktivni`, `atribut_objektu`) 
VALUES
  -- Stavy pro roční poplatek (hlavička i položky)
  ('ROCNI_POPLATEK', 'ZAPLACENO', '', 'Zaplaceno', 'Poplatek byl zaplacen', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK', 'NEZAPLACENO', '', 'Nezaplaceno', 'Poplatek čeká na zaplacení', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK', 'V_RESENI', '', 'V řešení', 'Problém s platbou, vyžaduje pozornost', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK', 'JINE', '', 'Jiné', 'Jiný stav poplatku', '2100-12-21', 1, 0);
```

### 2️⃣ Druh ročního poplatku (`typ_objektu = 'ROCNI_POPLATEK_DRUH'`)

```sql
INSERT INTO `25_ciselnik_stavy` 
  (`typ_objektu`, `kod_stavu`, `nadrazeny_kod_stavu`, `nazev_stavu`, `popis`, `platnost_do`, `aktivni`, `atribut_objektu`) 
VALUES
  -- Druh poplatku
  ('ROCNI_POPLATEK_DRUH', 'NAJEMNI', '', 'Nájemní', 'Nájemné prostor, zařízení', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_DRUH', 'ENERGIE', '', 'Energie', 'Energie (elektřina, plyn, voda)', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_DRUH', 'POPLATKY', '', 'Poplatky', 'Různé poplatky a služby', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_DRUH', 'JINE', '', 'Jiné', 'Jiný druh poplatku', '2100-12-21', 1, 0);
```

### 3️⃣ Typ platby / Frekvence (`typ_objektu = 'ROCNI_POPLATEK_PLATBA'`)

```sql
INSERT INTO `25_ciselnik_stavy` 
  (`typ_objektu`, `kod_stavu`, `nadrazeny_kod_stavu`, `nazev_stavu`, `popis`, `platnost_do`, `aktivni`, `atribut_objektu`) 
VALUES
  -- Typ platby (frekvence) - podle toho se automaticky generují položky!
  ('ROCNI_POPLATEK_PLATBA', 'MESICNI', '', 'Měsíční', 'Měsíční platba - automaticky vytvoří 12 položek', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_PLATBA', 'KVARTALNI', '', 'Kvartální', 'Čtvrtletní platba - automaticky vytvoří 4 položky', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_PLATBA', 'ROCNI', '', 'Roční', 'Roční platba - vytvoří 1 položku', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_PLATBA', 'JINA', '', 'Jiná', 'Jiná frekvence - umožní dynamické přidávání položek', '2100-12-21', 1, 0);
```

---

## 📋 NOVÉ DATABÁZOVÉ TABULKY (pouze 2!)

### 🆕 Tabulka 1: `25a_rocni_poplatky` (hlavní řádek)

**💡 Tento řádek se zobrazí v seznamu a dá se ROZBALIT (dropdown) → zobrazí položky**

```sql
CREATE TABLE `25a_rocni_poplatky` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primární klíč',
  
  -- VAZBY NA EXISTUJÍCÍ ENTITY
  `smlouva_id` INT(11) NOT NULL COMMENT 'Vazba na 25_smlouvy.id',
  `dodavatel_id` INT(11) NULL COMMENT 'Vazba na 25_dodavatele.id (zkopírováno ze smlouvy)',
  
  -- ZÁKLADNÍ ÚDAJE
  `nazev` VARCHAR(255) NOT NULL COMMENT 'Název ročního poplatku (např. "Roční poplatky 2026 - Nájem")',
  `popis` TEXT NULL COMMENT 'Popis poplatku',
  `rok` YEAR NOT NULL COMMENT 'Rok poplatků (2026, 2027...)',
  
  -- ČÍSELNÍKOVÉ KATEGORIE (FK na 25_ciselnik_stavy)
  `druh` VARCHAR(50) NOT NULL DEFAULT 'JINE' COMMENT 'FK na 25_ciselnik_stavy WHERE typ_objektu=ROCNI_POPLATEK_DRUH',
  `platba` VARCHAR(50) NOT NULL DEFAULT 'MESICNI' COMMENT 'FK na 25_ciselnik_stavy WHERE typ_objektu=ROCNI_POPLATEK_PLATBA (určuje kolik položek se vytvoří!)',
  
  -- FINANČNÍ ÚDAJE (COMPUTED - automaticky počítané z položek)
  `celkova_castka` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Celková roční částka (součet položek)',
  `zaplaceno_celkem` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Již zaplaceno (součet zaplacených položek)',
  `zbyva_zaplatit` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Zbývá zaplatit (celkova_castka - zaplaceno_celkem)',
  
  -- STAV (číselník)
  `stav` VARCHAR(50) NOT NULL DEFAULT 'NEZAPLACENO' COMMENT 'FK na 25_ciselnik_stavy WHERE typ_objektu=ROCNI_POPLATEK',
  
  -- ROZŠIŘUJÍCÍ JSON POLE (flexibilita pro budoucnost)
  `rozsirujici_data` JSON NULL COMMENT 'Flexibilní JSON pro budoucí rozšíření (metadata, konfigurace, custom fieldy)',
  
  -- AUDIT TRAIL
  `vytvoril_uzivatel_id` INT(10) NOT NULL COMMENT 'FK na 25_uzivatele.id',
  `aktualizoval_uzivatel_id` INT(10) UNSIGNED NULL COMMENT 'FK na 25_uzivatele.id',
  `dt_vytvoreni` DATETIME NOT NULL COMMENT 'Datum vytvoření (česká timezone)',
  `dt_aktualizace` DATETIME NULL COMMENT 'Datum poslední aktualizace',
  `aktivni` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Aktivní záznam (soft delete)',
  
  PRIMARY KEY (`id`),
  INDEX `idx_smlouva` (`smlouva_id`),
  INDEX `idx_dodavatel` (`dodavatel_id`),
  INDEX `idx_rok` (`rok`),
  INDEX `idx_druh` (`druh`),
  INDEX `idx_platba` (`platba`),
  INDEX `idx_stav` (`stav`),
  INDEX `idx_aktivni` (`aktivni`),
  INDEX `idx_vytvoril` (`vytvoril_uzivatel_id`),
  INDEX `idx_dt_vytvoreni` (`dt_vytvoreni`),
  
  CONSTRAINT `fk_rocni_poplatky_smlouva` 
    FOREIGN KEY (`smlouva_id`) REFERENCES `25_smlouvy` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rocni_poplatky_dodavatel` 
    FOREIGN KEY (`dodavatel_id`) REFERENCES `25_dodavatele` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_rocni_poplatky_vytvoril` 
    FOREIGN KEY (`vytvoril_uzivatel_id`) REFERENCES `25_uzivatele` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Roční poplatky - hlavní řádky (rozbalitelné na položky)';
```

---

### 🆕 Tabulka 2: `25a_rocni_poplatky_polozky` (rozbalené položky)

**💡 Tyto položky se zobrazí po ROZBALENÍ hlavního řádku**  
**🔄 Automaticky generované podle `platba` z hlavičky:**
- `MESICNI` → 12 položek (Leden - Prosinec)
- `KVARTALNI` → 4 položky (Q1 - Q4)
- `ROCNI` → 1 položka
- `JINA` → manuální přidávání

```sql
CREATE TABLE `25a_rocni_poplatky_polozky` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primární klíč',
  
  -- VAZBA NA ROČNÍ POPLATEK (hlavní řádek)
  `rocni_poplatek_id` INT(10) UNSIGNED NOT NULL COMMENT 'FK na 25a_rocni_poplatky.id',
  
  -- VAZBY NA FAKTURY (volitelné - pokud existuje faktura)
  `faktura_id` INT(10) NULL COMMENT 'FK na 25a_objednavky_faktury.id (pokud je položka spojena s fakturou)',
  
  -- ÚDAJE O PLATBĚ
  `poradi` INT(3) NOT NULL COMMENT 'Pořadí položky (1-12 pro měsíce, 1-4 pro kvartály, atd.)',
  `nazev_polozky` VARCHAR(255) NOT NULL COMMENT 'Název položky (např. "Leden 2026", "Q1 2026", automaticky generované)',
  `castka` DECIMAL(15,2) NOT NULL COMMENT 'Částka k zaplacení',
  `datum_splatnosti` DATE NOT NULL COMMENT 'Datum splatnosti',
  `datum_zaplaceni` DATE NULL COMMENT 'Skutečné datum zaplacení (pokud zaplaceno)',
  
  -- STAV POLOŽKY (STEJNÝ číselník jako hlavička!)
  `stav` VARCHAR(50) NOT NULL DEFAULT 'NEZAPLACENO' COMMENT 'FK na 25_ciselnik_stavy WHERE typ_objektu=ROCNI_POPLATEK',
  
  -- POZNÁMKY
  `poznamka` TEXT NULL COMMENT 'Poznámka k položce',
  
  -- ROZŠIŘUJÍCÍ JSON POLE
  `rozsirujici_data` JSON NULL COMMENT 'Flexibilní JSON pro budoucí rozšíření',
  
  -- AUDIT TRAIL
  `vytvoril_uzivatel_id` INT(10) NOT NULL COMMENT 'FK na 25_uzivatele.id',
  `aktualizoval_uzivatel_id` INT(10) UNSIGNED NULL COMMENT 'FK na 25_uzivatele.id',
  `dt_vytvoreni` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  `dt_aktualizace` DATETIME NULL COMMENT 'Datum poslední aktualizace',
  `aktivni` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Aktivní záznam',
  
  PRIMARY KEY (`id`),
  INDEX `idx_rocni_poplatek` (`rocni_poplatek_id`),
  INDEX `idx_faktura` (`faktura_id`),
  INDEX `idx_stav` (`stav`),
  INDEX `idx_datum_splatnosti` (`datum_splatnosti`),
  INDEX `idx_datum_zaplaceni` (`datum_zaplaceni`),
  INDEX `idx_aktivni` (`aktivni`),
  INDEX `idx_poradi` (`poradi`),
  
  CONSTRAINT `fk_polozky_rocni_poplatek` 
    FOREIGN KEY (`rocni_poplatek_id`) REFERENCES `25a_rocni_poplatky` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_polozky_faktura` 
    FOREIGN KEY (`faktura_id`) REFERENCES `25a_objednavky_faktury` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_polozky_vytvoril` 
    FOREIGN KEY (`vytvoril_uzivatel_id`) REFERENCES `25_uzivatele` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Položky ročních poplatků (jednotlivé splátky) - automaticky generované podle typu platby';
```

```sql
CREATE TABLE `25a_rocni_poplatky` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primární klíč',
  
  -- VAZBY NA EXISTUJÍCÍ ENTITY
  `smlouva_id` INT(11) NOT NULL COMMENT 'Vazba na 25_smlouvy.id',
  `dodavatel_id` INT(11) NULL COMMENT 'Vazba na 25_dodavatele.id (zkopírováno ze smlouvy)',
  
  -- ZÁKLADNÍ ÚDAJE
  `nazev` VARCHAR(255) NOT NULL COMMENT 'Název ročního poplatku (např. "Roční poplatky 2026")',
  `popis` TEXT NULL COMMENT 'Popis poplatku',
  `rok` YEAR NOT NULL COMMENT 'Rok poplatků (2026, 2027...)',
  
  -- ČÍSELNÍKOVÉ KATEGORIE
  `druh` VARCHAR(50) NOT NULL DEFAULT 'JINE' COMMENT 'FK na 25_ciselnik_stavy (typ_objektu=ROCNI_POPLATEK_DRUH) - Nájemní/Energie/Poplatky/Jiné',
  `platba` VARCHAR(50) NOT NULL DEFAULT 'MESICNI' COMMENT 'FK na 25_ciselnik_stavy (typ_objektu=ROCNI_POPLATEK_PLATBA) - měsíční/kvartální/roční/jiná',
  
  -- FINANČNÍ ÚDAJE
  `celkova_castka` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Celková roční částka',
  `zaplaceno_celkem` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Již zaplaceno',
  `zbyva_zaplatit` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Zbývá zaplatit (computed)',
  
  -- STAV (číselník)
  `stav` VARCHAR(50) NOT NULL DEFAULT 'NEZAPLACENO' COMMENT 'FK na 25_ciselnik_stavy (typ_objektu=ROCNI_POPLATEK) - zaplaceno/nezaplaceno/v řešení/jiné',
  
  -- ROZŠIŘUJÍCÍ JSON POLE (flexibilita pro budoucnost)
  `rozsirujici_data` JSON NULL COMMENT 'Flexibilní JSON pro budoucí rozšíření (metadata, konfigurace, custom fieldy)',
  
  -- AUDIT TRAIL
  `vytvoril_uzivatel_id` INT(10) NOT NULL COMMENT 'FK na 25_uzivatele.id',
  `aktualizoval_uzivatel_id` INT(10) UNSIGNED NULL COMMENT 'FK na 25_uzivatele.id',
  `dt_vytvoreni` DATETIME NOT NULL COMMENT 'Datum vytvoření (česká timezone)',
  `dt_aktualizace` DATETIME NULL COMMENT 'Datum poslední aktualizace',
  `aktivni` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Aktivní záznam (soft delete)',
  
  PRIMARY KEY (`id`),
  INDEX `idx_smlouva` (`smlouva_id`),
  INDEX `idx_dodavatel` (`dodavatel_id`),
  INDEX `idx_rok` (`rok`),
  INDEX `idx_druh` (`druh`),
  INDEX `idx_platba` (`platba`),
  INDEX `idx_stav` (`stav`),
  INDEX `idx_aktivni` (`aktivni`),
  INDEX `idx_vytvoril` (`vytvoril_uzivatel_id`),
  INDEX `idx_dt_vytvoreni` (`dt_vytvoreni`),
  
  CONSTRAINT `fk_rocni_poplatky_smlouva` 
    FOREIGN KEY (`smlouva_id`) REFERENCES `25_smlouvy` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rocni_poplatky_dodavatel` 
    FOREIGN KEY (`dodavatel_id`) REFERENCES `25_dodavatele` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_rocni_poplatky_vytvoril` 
    FOREIGN KEY (`vytvoril_uzivatel_id`) REFERENCES `25_uzivatele` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Roční poplatky spojené se smlouvami - hlavní záznamy';
```

---

### 🆕 Tabulka: `25a_rocni_poplatky_polozky` (jednotlivé splátky)

```sql
CREATE TABLE `25a_rocni_poplatky_polozky` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primární klíč',
  
  -- VAZBA NA ROČNÍ POPLATEK
  `rocni_poplatek_id` INT(10) UNSIGNED NOT NULL COMMENT 'FK na 25a_rocni_poplatky.id',
  
  -- VAZBY NA FAKTURY (volitelné - pokud existuje faktura)
  `faktura_id` INT(10) NULL COMMENT 'FK na 25a_objednavky_faktury.id (pokud existuje)',
  
  -- ÚDAJE O PLATBĚ
  `poradi` INT(3) NOT NULL COMMENT 'Pořadí položky (1, 2, 3... pro měsíce)',
  `nazev_polozky` VARCHAR(255) NOT NULL COMMENT 'Název položky (např. "Leden 2026", "1. čtvrtletí")',
  `castka` DECIMAL(15,2) NOT NULL COMMENT 'Částka k zaplacení',
  `datum_splatnosti` DATE NOT NULL COMMENT 'Datum splatnosti',
  `datum_zaplaceni` DATE NULL COMMENT 'Skutečné datum zaplacení (pokud zaplaceno)',
  
  -- STAV POLOŽKY (číselník) - STEJNÉ STAVY JAKO HLAVIČKA
  `stav` VARCHAR(50) NOT NULL DEFAULT 'NEZAPLACENO' COMMENT 'FK na 25_ciselnik_stavy (typ_objektu=ROCNI_POPLATEK) - zaplaceno/nezaplaceno/v řešení/jiné',
  
  -- POZNÁMKY
  `poznamka` TEXT NULL COMMENT 'Poznámka k položce',
  
  -- ROZŠIŘUJÍCÍ JSON POLE
  `rozsirujici_data` JSON NULL COMMENT 'Flexibilní JSON pro budoucí rozšíření',
  
  -- AUDIT TRAIL
  `vytvoril_uzivatel_id` INT(10) NOT NULL COMMENT 'FK na 25_uzivatele.id',
  `aktualizoval_uzivatel_id` INT(10) UNSIGNED NULL COMMENT 'FK na 25_uzivatele.id',
  `dt_vytvoreni` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  `dt_aktualizace` DATETIME NULL COMMENT 'Datum poslední aktualizace',
  `aktivni` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Aktivní záznam',
  
  PRIMARY KEY (`id`),
  INDEX `idx_rocni_poplatek` (`rocni_poplatek_id`),
  INDEX `idx_faktura` (`faktura_id`),
  INDEX `idx_stav` (`stav`),
  INDEX `idx_datum_splatnosti` (`datum_splatnosti`),
  INDEX `idx_datum_zaplaceni` (`datum_zaplaceni`),
  INDEX `idx_aktivni` (`aktivni`),
  
  CONSTRAINT `fk_polozky_rocni_poplatek` 
    FOREIGN KEY (`rocni_poplatek_id`) REFERENCES `25a_rocni_poplatky` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_polozky_faktura` 
    FOREIGN KEY (`faktura_id`) REFERENCES `25a_objednavky_faktury` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_polozky_vytvoril` 
    FOREIGN KEY (`vytvoril_uzivatel_id`) REFERENCES `25_uzivatele` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Jednotlivé položky (splátky) ročních poplatků';
```

---

## 🏷️ ČÍSELNÍK STAVŮ - NOVÉ ZÁZNAMY

### 1️⃣ Stavy ročního poplatku (`ROCNI_POPLATEK`)

```sql
-- Přidání stavů do 25_ciselnik_stavy
INSERT INTO `25_ciselnik_stavy` 
  (`typ_objektu`, `kod_stavu`, `nadrazeny_kod_stavu`, `nazev_stavu`, `popis`, `platnost_do`, `aktivni`, `atribut_objektu`) 
VALUES
  -- Roční poplatek - stavy
  ('ROCNI_POPLATEK', 'ZAPLACENO', '', 'Zaplaceno', 'Poplatek byl zaplacen', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK', 'NEZAPLACENO', '', 'Nezaplaceno', 'Poplatek čeká na zaplacení', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK', 'V_RESENI', '', 'V řešení', 'Problém s platbou, vyžaduje pozornost', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK', 'JINE', '', 'Jiné', 'Jiný stav poplatku', '2100-12-21', 1, 0);
```

### 2️⃣ Druh ročního poplatku (`ROCNI_POPLATEK_DRUH`)

```sql
INSERT INTO `25_ciselnik_stavy` 
  (`typ_objektu`, `kod_stavu`, `nadrazeny_kod_stavu`, `nazev_stavu`, `popis`, `platnost_do`, `aktivni`, `atribut_objektu`) 
VALUES
  -- Druh poplatku
  ('ROCNI_POPLATEK_DRUH', 'NAJEMNI', '', 'Nájemní', 'Nájemné prostor, zařízení', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_DRUH', 'ENERGIE', '', 'Energie', 'Energie (elektřina, plyn, voda)', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_DRUH', 'POPLATKY', '', 'Poplatky', 'Různé poplatky a služby', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_DRUH', 'JINE', '', 'Jiné', 'Jiný druh poplatku', '2100-12-21', 1, 0);
```

### 3️⃣ Typ platby (`ROCNI_POPLATEK_PLATBA`)

```sql
INSERT INTO `25_ciselnik_stavy` 
  (`typ_objektu`, `kod_stavu`, `nadrazeny_kod_stavu`, `nazev_stavu`, `popis`, `platnost_do`, `aktivni`, `atribut_objektu`) 
VALUES
  -- Typ platby (frekvence)
  ('ROCNI_POPLATEK_PLATBA', 'MESICNI', '', 'Měsíční', 'Měsíční platba', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_PLATBA', 'KVARTALNI', '', 'Kvartální', 'Čtvrtletní platba', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_PLATBA', 'ROCNI', '', 'Roční', 'Roční platba', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_PLATBA', 'JINA', '', 'Jiná', 'Jiná frekvence platby', '2100-12-21', 1, 0);
```

---

## 🔌 BACKEND API - ENDPOINTY (Order V3 Standard)

### Struktura souborů:

```
/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/
  ├── annualFeesHandlers.php      (handlery pro API endpointy)
  ├── annualFeesQueries.php       (SQL queries - separace logiky)
  └── TimezoneHelper.php          (existující - použití pro timezone)
```

### API Endpointy:

#### 1. **POST annual-fees/list** - Seznam ročních poplatků
```
Input:
{
  "token": "...",
  "username": "...",
  "filters": {
    "smlouva_id": 123,        // Volitelné - filtr podle smlouvy
    "rok": 2026,               // Volitelné - filtr podle roku
    "druh": "NAJEMNI",         // Volitelné - filtr podle druhu (z číselníku)
    "platba": "MESICNI",       // Volitelné - filtr podle typu platby (z číselníku)
    "stav": "NEZAPLACENO"      // Volitelné - filtr podle stavu (z číselníku)
  },
  "page": 1,
  "limit": 20,
  "sort": {
    "field": "rok",
    "direction": "DESC"
  }
}

Response:
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "smlouva_id": 123,
      "smlouva_cislo": "12548",
      "dodavatel_nazev": "XY s.r.o.",
      "nazev": "Roční poplatky 2026 - Nájem",
      "rok": 2026,
      "druh": "NAJEMNI",
      "druh_nazev": "Nájemní",
      "platba": "MESICNI",
      "platba_nazev": "Měsíční",
      "celkova_castka": 12000.00,
      "zaplaceno_celkem": 1000.00,
      "zbyva_zaplatit": 11000.00,
      "stav": "NEZAPLACENO",
      "stav_nazev": "Nezaplaceno",
      "pocet_polozek": 12,
      "pocet_zaplaceno": 1,
      "dt_vytvoreni": "2026-01-15 10:30:00",
      "vytvoril_jmeno": "Jan Novák"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "pages": 3
  },
  "stats": {
    "celkem_poplatku": 45,
    "celkem_zaplaceno": 10,
    "celkem_nezaplaceno": 30,
    "celkem_castka": 540000.00
  }
}
```

#### 2. **POST annual-fees/detail** - Detail ročního poplatku + položky
```
Input:
{
  "token": "...",
  "username": "...",
  "id": 1
}

Response:
{
  "status": "success", - Nájem",
      "popis": "Měsíční nájemné kancelářských prostor",
      "rok": 2026,
      "druh": "NAJEMNI",
      "druh_nazev": "Nájemní",
      "platba": "MESICNI",
      "platba_nazev": "Měsíční",
      "celkova_castka": 12000.00,
      "zaplaceno_celkem": 1000.00,
      "zbyva_zaplatit": 11000.00,
      "stav": "NEZAPLACENO",
      "stav_nazev": "Nezaplaceno": "XY s.r.o.",
      "nazev": "Roční poplatky 2026",
      "popis": "Měsíční nájemné",
      "rok": 2026,
      "celkova_castka": 12000.00,
      "zaplaceno_celkem": 1000.00,
      "zbyva_zaplatit": 11000.00,
      "stav": "AKTIVNI",
      "rozsirujici_data": {...}
    },
    "polozky": [
      {
        "id": 1,
        "poradi": 1,
        "nazev_polozky": "Leden 2026",
        "castka": 1000.00,
        "datum_splatnosti": "2026-01-20",
        "datum_zaplaceni": "2026-01-20",
        "stav": "ZAPLACENO",
        "stav_nazev": "Zaplaceno",
        "faktura_id": 567,
        "faktura_cislo": "FA123456",
        "poznamka": null
      },
      {
        "id": 2,
        "poradi": 2,
        "nazev_polozky": "Únor 2026",
        "castka": 1000.00,
        "datum_splatnosti": "2026-02-20",
        "datum_zaplaceni": null,
        "stav": "NEZAPLACENO",
        "stav_nazev": "Nezaplaceno",
        "faktura_id": null,
        "faktura_cislo": null,
        "poznamka": null
      }
    ]
  }
}
```

#### 3. **POST annual-fees/create** - Vytvoření nového ročního poplatku
```
Input: - Nájem",
  "popis": "Měsíční nájemné kancelářských prostor",
  "rok": 2026,
  "druh": "NAJEMNI",          // Z číselníku: NAJEMNI/ENERGIE/POPLATKY/JINE
  "platba": "MESICNI",         // Z číselníku: MESICNI/KVARTALNI/ROCNI/JINA.",
  "username": "...",
  "smlouva_id": 123,
  "nazev": "Roční poplatky 2026",
  "popis": "Měsíční nájemné",
  "rok": 2026,
  "celkova_castka": 12000.00,
  "polozky": [
    {
      "poradi": 1,
      "nazev_polozky": "Leden 2026",
      "castka": 1000.00,
      "datum_splatnosti": "2026-01-20"
    },
    // ... další 11 měsíců
  ],
  "rozsirujici_data": {
    "custom_field": "value"
  }
}

Response:
{
  "status": "success",
  "data": {
    "id": 1,
    "message": "Roční poplatek byl úspěšně vytvořen"
  }
}
```

#### 4. **POST annual-fees/update** - Aktualizace ročního poplatku
```
Input:
{
  "token": "...",
  "username": "...",
  "druh": "ENERGIE",           // Změna druhu
  "platba": "KVARTALNI",       // Změna typu platby
  "stav": "ZAPLACENO",         // Změna stavu
  "nazev": "Nový název",
  "stav": "AKTIVNI",
  "rozsirujici_data": {...}
}
```

#### 5. **POST annual-fees/update-item** - Aktualizace položky (splátky)
```
Input:
{
  "token": "...",
  "username": "...",
  "id": 2,
  "stav": "ZAPLACENO",
  "datum_zaplaceni": "2026-02-15",
  "faktura_id": 568,
  "poznamka": "Zaplaceno předčasně"
}
```

#### 6. **POST annual-fees/delete** - Soft delete ročního poplatku
```
Input:
{
  "token": "...",
  "username": "...",
  "id": 1
}
```

#### 7. **POST annual-fees/stats** - Statistiky pro dashboard
```
Input:
{
  "token": "...",
  "username": "...",
  "rok": 2026
}

Response:
{
  "status": "success",
  "dazaplaceno": 10,
    "nezaplaceno": 30,
    "v_reseni": 5,
    "celkova_castka": 540000.00,
    "zaplaceno_castka": 320000.00,
    "zbyva_castka": 220000.00,
    "podle_druhu": {
      "NAJEMNI": 20,
      "ENERGIE": 15,
      "POPLATKY": 8,
      "JINE": 2
    },
    "podle_platby": {
      "MESICNI": 35,
      "KVARTALNI": 8,
      "ROCNI": 2
    }
    "zbyva": 220000.00,
    "po_splatnosti_polozek": 8
  }
}
```

---

## 🔗 INTEGRACE S EXISTUJÍCÍMI MODULY

### 1. **Modul Smlouvy** (`25_smlouvy`)
- Roční poplatky jsou vázány na smlouvu přes `smlouva_id`
- V detailu smlouvy přidat záložku "Roční poplatky"
- Zobrazit přehled všech ročních poplatků pro danou smlouvu

### 2. **Modul Faktury** (`25a_objednavky_faktury`)
- Položky poplatků mohou být propojeny s fakturami (`faktura_id`)
- V detailu faktury zobrazit, pokud je propojena s položkou poplatku
- Při zaplacení faktury automaticky aktualizovat stav položky

### 3. **Modul Dodavatelé** (`25_dodavatele`)
- Zkopírování `dodavatel_id` ze smlouvy při vytváření poplatku
- Filtrování poplatků podle dodavatele

---

## 📋 KONSTANTY V `api.php`

Přidat do `/apps/eeo-v2/api-legacy/api.eeo/api.php`:

```php
// DATABASE TABLE NAMES - ROČNÍ POPLATKY
define('TBL_ROCNI_POPLATKY', '25a_rocni_poplatky');
define('TBL_ROCNI_POPLATKY_POLOZKY', '25a_rocni_poplatky_polozky');
```

---

## 🔐 BEZPEČNOST A VALIDACE

### Autentizace:
- ✅ Všechny endpointy: POST metoda
- ✅ Validace `token` a `username` v BODY (ne x-headers)
- ✅ Použití `verify_token()` z existujících handlerů

### SQL Injection prevence:
- ✅ PDO prepared statements pro VŠECHNY queries
- ✅ Použití konstant tabulek (TBL_*)
- ✅ Validace vstupů před použitím v SQL

### Timezone handling:
- ✅ Použití `TimezoneHelper::setMysqlTimezone($db)` při každém připojení
- ✅ Všechna datetime pole v české timezone

---

## 📦 JSON ROZŠIŘUJÍCÍ POLE - PŘÍKLADY POUŽITÍ

### `rozsirujici_data` v hlavičce (`25a_rocni_poplatky`):
```json
{
  "metadata": {
    "smlouva_typ": "najem",
    "custom_kategorie": "reality"
  },
  "konfigurace": {
    "auto_reminder": true,
    "reminder_days_before": 7
  },
  "external_ids": {
    "erp_system_id": "ERP-2026-123"
  }
}
```

### `rozsirujici_data` v položce (`25a_rocni_poplatky_polozky`):
```json
{
  "payment_method": "bank_transfer",
  "variabilni_symbol": "12548012026",
  "bank_account": "123456789/0800",
  "email_reminder_sent": "2026-01-10 10:30:00"
}
```

---
## 🔄 AUTOMATICKÉ GENEROVÁNÍ POLOŽEK PODLE TYPU PLATBY

### Backend logika při vytváření ročního poplatku:

```php
// Podle hodnoty `platba` automaticky vytvoří položky:

switch ($platba) {
    case 'MESICNI':
        // Vytvoř 12 položek (Leden - Prosinec)
        $polozky = [
            ['poradi' => 1, 'nazev' => 'Leden 2026', 'datum_splatnosti' => '2026-01-20'],
            ['poradi' => 2, 'nazev' => 'Únor 2026', 'datum_splatnosti' => '2026-02-20'],
            // ... až do prosince
        ];
        break;
        
    case 'KVARTALNI':
        // Vytvoř 4 položky (Q1-Q4)
        $polozky = [
            ['poradi' => 1, 'nazev' => 'Q1 2026', 'datum_splatnosti' => '2026-03-31'],
            ['poradi' => 2, 'nazev' => 'Q2 2026', 'datum_splatnosti' => '2026-06-30'],
            ['poradi' => 3, 'nazev' => 'Q3 2026', 'datum_splatnosti' => '2026-09-30'],
            ['poradi' => 4, 'nazev' => 'Q4 2026', 'datum_splatnosti' => '2026-12-31'],
        ];
        break;
        
    case 'ROCNI':
        // Vytvoř 1 položku
        $polozky = [
            ['poradi' => 1, 'nazev' => 'Roční poplatek 2026', 'datum_splatnosti' => '2026-12-31']
        ];
        break;
        
    case 'JINA':
        // Uživatel přidává položky manuálně (dynamicky)
        // API endpoint: annual-fees/add-item
        break;
}
```

---

## 🎯 UI/UX KONCEPT (Frontend)

### Zobrazení v seznamu:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ▶ Roční poplatky 2026 - Nájem | Smlouva: 12548 | Měsíční | 12000 Kč │
│                                                  ↑ dropdown button    │
└─────────────────────────────────────────────────────────────────────┘
```

### Po rozbalení (klik na ▶):

```
┌─────────────────────────────────────────────────────────────────────┐
│ ▼ Roční poplatky 2026 - Nájem | Smlouva: 12548 | Měsíční | 12000 Kč │
│   ├─ ✅ Leden 2026: 1000 Kč (splatnost 20.1.) [ZAPLACENO]           │
│   ├─ ⏳ Únor 2026: 1000 Kč (splatnost 20.2.) [NEZAPLACENO]          │
│   ├─ ⏳ Březen 2026: 1000 Kč (splatnost 20.3.) [NEZAPLACENO]        │
│   ├─ ... (dalších 9 měsíců)                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---## 📝 FINÁLNÍ UPŘESNĚNÍ (podle diskuze):

### ✅ CO JE JASNÉ:
1. **ŽÁDNÉ nové tabulky pro číselníky** - vše jde do `25_ciselnik_stavy` se 3 různými `typ_objektu`:
   - `ROCNI_POPLATEK` - stavy (zaplaceno/nezaplaceno/v řešení/jiné)
   - `ROCNI_POPLATEK_DRUH` - druhy (nájemní/energie/poplatky/jiné)
   - `ROCNI_POPLATEK_PLATBA` - typy plateb (měsíční/kvartální/roční/jiná)

2. **DVĚ nové tabulky:**
   - `25a_rocni_poplatky` - hlavní řádek (zobrazuje se v seznamu)
   - `25a_rocni_poplatky_polozky` - jednotlivé položky (zobrazí se po rozbalení dropdown)

3. **Automatické generování položek podle typu platby:**
   - `MESICNI` → automaticky vytvoří 12 položek (Leden - Prosinec)
   - `KVARTALNI` → automaticky vytvoří 4 položky (Q1 - Q4)
   - `ROCNI` → automaticky vytvoří 1 položku
   - `JINA` → umožní uživateli přidávat položky dynamicky (API endpoint pro add-item)

4. **UI koncept:**
   - Seznam zobrazuje hlavní řádky
   - Kliknutí na ▶ rozbalí dropdown → zobrazí položky
   - Každá položka má svůj stav (zaplaceno/nezaplaceno/...)

### 🎯 VÝHODY TOHOTO ŘEŠENÍ:
- ✅ Jednoduchá struktura - žádné duplikace číselníků
- ✅ Flexibilní - všechny číselníky v jedné tabulce
- ✅ Automatizace - podle typu platby se vytvoří správný počet položek
- ✅ Přehledné UI - rozbalování jako u Order V3
- ✅ Dynamické přidávání pro nestandardní případy (typ platby: JINÁ)

---
## � ZMĚNY OPROTI PŮVODNÍMU NÁVRHU:

### ✅ ZJEDNODUŠENO (podle screenu a diskuze):
1. **Všechny číselníky v `25_ciselnik_stavy`** - žádné nové tabulky pro číselníky
2. **Stavy pouze v jednom číselníku** - `typ_objektu='ROCNI_POPLATEK'` (hlavička i položky používají stejné stavy)
3. **Přidán číselník DRUH** - `typ_objektu='ROCNI_POPLATEK_DRUH'` (Nájemní/Energie/Poplatky/Jiné)
4. **Přidán číselník PLATBA** - `typ_objektu='ROCNI_POPLATEK_PLATBA'` (měsíční/kvartální/roční/jiná)
5. **Automatické generování položek** - podle typu `platba` se vytvoří příslušný počet položek
6. **Dropdown UI** - hlavní řádek rozbalitelný na položky (jako Order V3)
7. **Dynamické přidávání** - pro typ platby "JINÁ" možnost přidat libovolný počet položek

### 🎯 VÝHODY:
- ✅ Jednodušší struktura číselníků (všechno v `25_ciselnik_stavy`)
- ✅ Více flexibility pro kategorizaci (druh + typ platby)
- ✅ Jednotné stavy pro hlavičku i položky
- ✅ Snadnější filtrování a statistiky
- ✅ Automatizace vytváření položek podle frekvence platby
- ✅ Přehledné UI s rozbalováním řádků

---

## �📅 HARMONOGRAM IMPLEMENTACE

### Fáze 1: Příprava DB (30 min)
1. ✅ Vytvoření SQL skriptů pro DEV i PROD
2. ✅ Spuštění v DEV databázi (EEO-OSTRA-DEV)
3. ✅ Testování integritních omezení

### Fáze 2: Backend API (2-3 hodiny)
1. ✅ `annualFeesHandlers.php` - všechny endpointy
2. ✅ `annualFeesQueries.php` - separace SQL dotazů
3. ✅ Integrace do `api.php` routeru
4. ✅ Testování všech endpointů

### Fáze 3: GIT & Dokumentace (30 min)
1. ✅ Commit do feature/annual-fees-module
2. ✅ Vytvoření DEPLOYMENT_GUIDE_ANNUAL_FEES.md
3. ✅ Přehled SQL skriptů pro PROD

### Fáze 4: Frontend (budoucí - mimo tento task)
- React komponenty pro zobrazení poplatků
- Formuláře pro vytváření/editaci
- Integrace do modulu Smlouvy

---

## ✅ CHECKLIST PŘED NASAZENÍM DO PRODUKCE

### DEV testování:
- [ ] Všechny tabulky vytvořeny v EEO-OSTRA-DEV
- [ ] Všechny číselníkové stavy vloženy
- [ ] Konstanty přidány do api.php
- [ ] Endpointy fungují a vracejí správný JSON
- [ ] Timezone handling funguje správně
- [ ] Prepared statements proti SQL injection

### PROD příprava:
- [ ] SQL skripty připraveny pro eeo2025
- [ ] Backup databáze eeo2025 proveden
- [ ] Deployment guide zkontrolován
- [ ] Testovací data připravena pro verifikaci

---

## 🚨 KRITICKÁ UPOZORNĚNÍ

### ⛔ PŘED NASAZENÍM DO PRODUKCE:
1. **VŽDY požádat o potvrzení před spuštěním SQL v eeo2025**
2. **NIKDY nepoužívat DROP TABLE bez zálohy**
3. **Testovat nejdřív v DEV (EEO-OSTRA-DEV)**
4. **Ověřit foreign key constraints (smlouvy, uživatelé musí existovat)**

### ✅ POVOLENO V DEV (bez potvrzení):
- Všechny změny v EEO-OSTRA-DEV
- Testování API endpointů
- Experimentování s JSON poli
- Git commity

---

## 📊 PŘÍKLAD DAT - ROČNÍ POPLATEK

### Hlavička (25a_rocni_poplatky):
```
id: 1
smlouva_id: 12548
dodavatel_id: 456
nazev: "Roční poplatky 2026 - Nájem prostor"
popis: "Měsíční nájemné za kancelářské prostory"
rok: 2026
druh: NAJEMNI (z číselníku: Nájemní/Energie/Poplatky/Jiné)
platba: MESICNI (z číselníku: měsíční/kvartální/roční/jiná)
celkova_castka: 12000.00
zaplaceno_celkem: 1000.00 (automaticky počítáno)
zbyva_zaplatit: 11000.00 (automaticky počítáno)
stav: NEZAPLACENO (z číselníku: zaplaceno/nezaplaceno/v řešení/jiné)
```

### Položky (25a_rocni_poplatky_polozky):
```
12 položek (měsíčních splátek):
- Leden 2026: 1000 Kč, splatnost 20.1.2026, stav: ZAPLACENO
- Únor 2026: 1000 Kč, splatnost 20.2.2026, stav: NEZAPLACENO
- ... atd. pro všech 12 měsíců (všechny používají stejný číselník stavů)
```

---

## 🎯 ZÁVĚR

Tento plán poskytuje **kompletní** strukturu pro implementaci modulu Roční poplatky:
- ✅ Flexibilní databázová struktura s JSON rozšířeními
- ✅ Konzistentní s Order V3 standardy
- ✅ Bezpečné API s autentizací a validací
- ✅ Integrace s existujícími moduly
- ✅ Připraveno pro budoucí rozšíření
- ✅ Kompletní dokumentace pro PROD deployment

**Ready for diskuze a implementaci! 🚀**
