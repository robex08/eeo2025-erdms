-- =============================================================================
-- PROD UPDATE pro v2.67 — doplneni enum hodnoty RUCNI_VAZBA
-- =============================================================================
-- Duvod: commit 4657a946 (17.9.2026) pridal do vemaKontrolaHandlers.php zapis
-- udalosti typu 'RUCNI_VAZBA' do tabulky 25v_kontrola_metadata_historie
-- (rucni vyber spravne VEMA/EEO faktury operatorem). V PROD databazi (eeo2025)
-- enum sloupce `typ` tuto hodnotu jeste neobsahuje -> po deployi FE/BE by
-- INSERT s touto hodnotou skoncil chybou "Data truncated for column 'typ'".
--
-- Overeno porovnanim DESCRIBE 25v_kontrola_metadata_historie DEV (EEO-OSTRA-DEV)
-- vs PROD (eeo2025) dne 2026-09-17.
--
-- DEV enum:  enum('KOMENTAR','ZMENA_STAVU','ZMENA_PRIORITY','AUTO_SYSTEM','RUCNI_VAZBA')
-- PROD enum: enum('KOMENTAR','ZMENA_STAVU','ZMENA_PRIORITY','AUTO_SYSTEM')
--
-- Spustit na PROD (eeo2025) AZ PO potvrzeni uzivatele, idealne tesne pred
-- nebo souvisle s deployem FE/BE verze 2.67 (pred prvnim pouzitim funkce
-- rucniho vyberu vazby VEMA<->EEO faktury).
-- =============================================================================

ALTER TABLE `25v_kontrola_metadata_historie`
  MODIFY COLUMN `typ` enum('KOMENTAR','ZMENA_STAVU','ZMENA_PRIORITY','AUTO_SYSTEM','RUCNI_VAZBA')
  NOT NULL DEFAULT 'KOMENTAR';

-- Overeni po spusteni:
-- DESCRIBE 25v_kontrola_metadata_historie;
-- -> sloupec `typ` musi obsahovat i 'RUCNI_VAZBA'
