-- =============================================================================
-- PŘIDÁNÍ SLOUPCE "vyuziti" DO TABULKY 25_limitovane_prisliby
-- =============================================================================
-- Datum: 22. května 2026
-- Databáze: EEO-OSTRA-DEV
-- Účel: Přidat podrobný popis využití pro každý limitovaný příslib
-- =============================================================================

-- KROK 1: Přidání sloupce
-- -----------------------------------------------------------------------------
ALTER TABLE `25_limitovane_prisliby` 
ADD COLUMN `vyuziti` VARCHAR(500) NULL DEFAULT NULL AFTER `nazev_uctu`;

-- KROK 2: Naplnění dat podle přiloženého obrázku
-- -----------------------------------------------------------------------------

-- LPE2
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Ostatní služby'
WHERE `cislo_lp` = 'LPE2';

-- FINKP
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'FINKP'
WHERE `cislo_lp` = 'FINKP';

-- LPIA1
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Spotřeba materiálu: Tiskopisy, Publikace aj.'
WHERE `cislo_lp` = 'LPIA1';

-- LPIA2
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Ostatní služby: Semináře, Členské příspěvky aj.'
WHERE `cislo_lp` = 'LPIA2';

-- LPR1
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Spotřeba materiálu: Klíče, vizitky, razítka aj.'
WHERE `cislo_lp` = 'LPR1';

-- LPR2
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Cestovné, Ubytování aj.'
WHERE `cislo_lp` = 'LPR2';

-- LPR3
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Náklady na reprezentaci'
WHERE `cislo_lp` = 'LPR3';

-- LPR4
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Ostatní služby: Poštovné, Ověření dokumentů aj.'
WHERE `cislo_lp` = 'LPR4';

-- LPT1
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Spotřeba materiálu: Reklamní a propagační materiály aj.'
WHERE `cislo_lp` = 'LPT1';

-- LPT2
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Ostatní služby: Tisk a kopírování letáků aj.'
WHERE `cislo_lp` = 'LPT2';

-- LPIT1
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Spotřeba materiálu: Tonery, Baterie, SD karty, Kabely, Montážní materiál, Klávesnice aj.'
WHERE `cislo_lp` = 'LPIT1';

-- LPIT2
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Opravy a udržování'
WHERE `cislo_lp` = 'LPIT2';

-- LPIT3
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Ostatní služby: Protokoly, Licence, Antispamová služba aj.'
WHERE `cislo_lp` = 'LPIT3';

-- LPIT5
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Náklady z drobného dlouhodobého majetku: Vozidlová GPS, Nabíjecka baterií, Vozidlový mikrofon, Kamery aj.'
WHERE `cislo_lp` = 'LPIT5';

-- LPL1
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Spotřeba materiálu: Objednávky léků, infuzí, opiátů aj.'
WHERE `cislo_lp` = 'LPL1';

-- LPL3
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Vzdělávání, Školení, Kurzy, Dny urgentní medicíny aj.'
WHERE `cislo_lp` = 'LPL3';

-- LPN1
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Spotřeba materiálu: Defibrilační a stimulační elektrody, Dýchací technika, Endotracheální kanyly, Injekční technika, Masky, Močové katétry, SpO2, Sterilní rukavice aj.'
WHERE `cislo_lp` = 'LPN1';

-- LPN2
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Opravy a udržování'
WHERE `cislo_lp` = 'LPN2';

-- LPN3
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'BTK'
WHERE `cislo_lp` = 'LPN3';

-- LPN4
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Náklady z drobného dlouhodobého majetku: Fixátor hlavy, Transportní plachty, Resuscitátor, Vakuová dlaha, Držáky na ventilátor aj.'
WHERE `cislo_lp` = 'LPN4';

-- LPP1
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Spotřeba materiálu: Tiskopisy, Publikace aj.'
WHERE `cislo_lp` = 'LPP1';

-- LPP2
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Ostatní služby: Inzerce aj.'
WHERE `cislo_lp` = 'LPP2';

-- LPP3
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Vzdělávání, Školení, Kurzy aj.'
WHERE `cislo_lp` = 'LPP3';

-- LPP4
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Zákonné sociální náklady - odbory'
WHERE `cislo_lp` = 'LPP4';

-- LPPT1
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Spotřeba materiálu: Náhradní díly, Stojan na odpad, Autobaterie, Ovladače, Oleje aj.'
WHERE `cislo_lp` = 'LPPT1';

-- LPPT2
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Opravy a udržování'
WHERE `cislo_lp` = 'LPPT2';

-- LPPT3
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Ostatní služby: Čištění vozidel, Roční kontroly a revize, STK, Zajištění odvozu a likvidace odpadních vod aj.'
WHERE `cislo_lp` = 'LPPT3';

-- LPPT4
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Zákonné sociální náklady: Výpisy ze zdrav. dokumentace, Vstupní prohlídky aj.'
WHERE `cislo_lp` = 'LPPT4';

-- LPPT5
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Náklady z drobného dlouhodobého majetku: Nástěnné držáky na kyslíkové lahve, Ventilátory, Umyvadla, Vysavače, Skříně aj.'
WHERE `cislo_lp` = 'LPPT5';

-- LPZOS1
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Spotřeba materiálu: Tiskopisy, Publikace aj.'
WHERE `cislo_lp` = 'LPZOS1';

-- LPZOS3
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Ostatní služby: Licence a poplatky, Implementace softwaru, Telefonní poplatky - vedení databáze, Zdravotní péče - subjekty aj.'
WHERE `cislo_lp` = 'LPZOS3';

-- LPZOS5
UPDATE `25_limitovane_prisliby` 
SET `vyuziti` = 'Náklady z drobného dlouhodobého majetku'
WHERE `cislo_lp` = 'LPZOS5';

-- =============================================================================
-- VERIFIKACE
-- =============================================================================
-- Kontrola po provedení:
-- SELECT cislo_lp, nazev_uctu, vyuziti FROM `25_limitovane_prisliby` ORDER BY cislo_lp;
