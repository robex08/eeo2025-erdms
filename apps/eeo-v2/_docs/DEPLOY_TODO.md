# DEPLOY TODO – ruční kroky na PROD DB (eeo2025)

Změny v DB objektech (procedury, indexy) se **nenasazují s kódem**. Při příštím deployi je nutné je ručně provést i na ostré PROD DB – vždy až po potvrzení a se zálohou.
Po provedení položku odškrtni / přesuň do sekce „Hotovo“ s datem.

## Čeká na deploy

### 0. Tabulka `25_opravy_navrhy` – modul Opravy (BETA) (DEV 2026-09-25)

Sdílené koncepty spárování SML-FA → OBJ-SML-FA a historie uložených oprav (Undo). Bez ní modul Opravy na PROD spadne (list i akce ji čtou).
Nasazuje se společně s kódem: `opravyHandlers.php`, routy `opravy/*` + konstanta `TBL_OPRAVY_NAVRHY` v `api.php`, FE `OpravyPage.js`, `apiOpravy.js`, menu BETA v `Layout.js`, routa `/opravy` v `App.js`.

```sql
SOURCE _sql/25_opravy_navrhy_20260925.sql;
```

- Jen nová tabulka, na existující data nesahá. Rollback: `DROP TABLE 25_opravy_navrhy;` (jen pokud v ní nejsou uložené opravy, jinak se ztratí historie pro Undo).

### 1. Procedura `sp_prepocet_cerpani_smluv` v2 – čerpání smluv (DEV 2026-09-25)

Sjednocení uloženého čerpání (`25_smlouvy.cerpano_*`, `zbyva`, `procento_*`) s progressem Dokončeno / V procesu v modulu smluv:
- OBJ skutečně dokončená (Dokončená/Archivovaná + aspoň 1 FA + všechny FA ZAPLACENO/DOKONCENA) → její faktury
- ostatní OBJ (vč. Dokončené s nedokončenou FA) → částka OBJ (položky s DPH, fallback MAX cena), její FA se nepočítají
- FA přímo na smlouvě → vždy (bez STORNO)

Nasazuje se společně s kódem: `smlouvyHandlers.php` (`_smlouvy_calc_progress`), `orderV2InvoiceHandlers.php`, `orderV2Endpoints.php` (spouštění přepočtu) a FE modulu smluv.

```sql
-- 1) záloha aktuální definice na PROD (SHOW CREATE PROCEDURE sp_prepocet_cerpani_smluv)
-- 2) nová verze:
SOURCE _sql/sp_prepocet_cerpani_smluv_v2_20260925.sql;
-- 3) přepočet všech smluv:
CALL sp_prepocet_cerpani_smluv(NULL, NULL);
```

- Rollback: `_sql/sp_prepocet_cerpani_smluv_v1_ROLLBACK_20260925.sql` + znovu `CALL sp_prepocet_cerpani_smluv(NULL, NULL);`
- Na DEV se po přepočtu změnilo čerpání cca 20 smluv (hlavně nahoru – nedokončené OBJ s částečnou fakturací; dolů tam, kde FA dokončené OBJ převyšovala částku OBJ).
- Pokud se procedura do deploye ještě upraví, nasadit **poslední verzi** z `_sql/`.

### 2. Index `25a_objednavky.cislo_objednavky` – VEMA vs EEO (DEV 2026-09-24)

Pro Kontrolu OBJ v modulu VEMA vs EEO (bez indexu full table scan).

```sql
ALTER TABLE `25a_objednavky` ADD INDEX idx_obj_cislo_objednavky (cislo_objednavky);
```

### 3. Konflikt verzí objednávky (optimistic locking) – POŘADÍ NASAZENÍ (DEV 2026-09-25)

**Žádná změna struktury DB** – `expected_dt_aktualizace` NENÍ sloupec, je to jen kontrolní parametr requestu
(verze objednávky, ze které formulář vychází). Používají se existující sloupce `dt_aktualizace` a `uzivatel_akt_id`.

⚠️ **Backend nasadit současně s frontendem (nebo dřív)!** Nový FE (`OrderForm25.js`) posílá při uložení
`expected_dt_aktualizace`. Starý backend ho vloží do `UPDATE ... SET` → uložení objednávky spadne na
`SQLSTATE[42S22]: Unknown column 'expected_dt_aktualizace'`.

Soubory, které musí jít spolu:
- `api-legacy/.../lib/orderV2Endpoints.php` – kontrola verze (HTTP 409) + `unset($input['expected_dt_aktualizace'])`
- `api-legacy/.../lib/handlers_orders_v3.php` – schválení ze seznamu nastavuje `dt_aktualizace` + `uzivatel_akt_id`
- `api-legacy/.../lib/orderWorkflowHelpers.php` – změny workflow nastavují `dt_aktualizace`
- `client/src/forms/OrderForm25.js`, `client/src/services/apiOrderV2.js` (FE build)

## Hotovo

_(zatím nic)_
