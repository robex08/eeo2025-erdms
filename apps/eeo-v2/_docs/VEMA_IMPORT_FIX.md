# VEMA Import - Oprava duplicit

## Problém
Import používal prostý `INSERT` místo `INSERT ... ON DUPLICATE KEY UPDATE`, což způsobovalo:
- Duplik áty při opakovaném importu
- Neaktualizování existujících záznamů 
- Neoznačování smazaných záznamů

## Řešení

### 1. Přidány UNIQUE KEY indexy
```sql
ALTER TABLE 25v_firmyupl ADD UNIQUE KEY unique_firma (firma);
ALTER TABLE 25v_fpazahl ADD UNIQUE KEY unique_faktura (cfak, firma, celkem);
ALTER TABLE 25v_smla ADD UNIQUE KEY unique_smlouva (csml);
```

### 2. Import logika změněna na INSERT ... ON DUPLICATE KEY UPDATE

#### Pro každou tabulku:
1. `INSERT ... ON DUPLICATE KEY UPDATE` - vložení nebo aktualizace
2. Při UPDATE: nastavit `stav_zaznamu='aktivni'`, `dt_posledni_aktualizace=NOW()`
3. Po importu: označit záznamy co nejsou v aktuálním batch_id jako `stav_zaznamu='smazano'`

#### SELECT dotazy filtrují jen `stav_zaznamu='aktivni'`

### 3. Metadata vazba
- Metadata tabulka `25v_kontrola_metadata` je vázána na:
  - `vema_id` (číslo z VEMA: firma, cfak, csml)
  - NOT na auto_increment `id`
- Při smazání a novém importu se metadata zachovají

## SQL Skripty pro opravu

Viz soubor: `/var/www/erdms-dev/apps/eeo-v2/_sql/vema_import_fix_duplicates.sql`
