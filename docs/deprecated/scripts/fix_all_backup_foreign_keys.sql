-- =============================================================================
-- FIX: Oprava všech foreign key constraints odkazujících na BACKUP tabulku
-- =============================================================================
-- Datum: 2026-01-04
-- Problém: Po swapu tabulek zůstaly FK constraints odkazující na BACKUP místo
--          na aktivní tabulku 25_uzivatele
-- Řešení: Drop všech FK na BACKUP a vytvoření nových na 25_uzivatele
-- =============================================================================

USE eeo2025-dev;

-- 1. 25a_faktury_lp_cerpani
ALTER TABLE 25a_faktury_lp_cerpani
    DROP FOREIGN KEY fk_faktury_lp_pridal,
    DROP FOREIGN KEY fk_faktury_lp_upravil;

ALTER TABLE 25a_faktury_lp_cerpani
    ADD CONSTRAINT fk_faktury_lp_pridal 
        FOREIGN KEY (pridal_user_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_faktury_lp_upravil 
        FOREIGN KEY (upravil_user_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL;

-- 2. 25a_faktury_prilohy
ALTER TABLE 25a_faktury_prilohy
    DROP FOREIGN KEY fk_faktury_prilohy_uzivatel;

ALTER TABLE 25a_faktury_prilohy
    ADD CONSTRAINT fk_faktury_prilohy_uzivatel 
        FOREIGN KEY (nahrano_uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL;

-- 3. 25a_objednavky (10 FK!)
ALTER TABLE 25a_objednavky
    DROP FOREIGN KEY `25a_objednavky_ibfk_1`,
    DROP FOREIGN KEY `25a_objednavky_ibfk_2`,
    DROP FOREIGN KEY `25a_objednavky_ibfk_3`,
    DROP FOREIGN KEY `25a_objednavky_ibfk_4`,
    DROP FOREIGN KEY fk_dodavatel_potvrdil,
    DROP FOREIGN KEY fk_dokoncil,
    DROP FOREIGN KEY fk_fakturant,
    DROP FOREIGN KEY fk_odesilatel,
    DROP FOREIGN KEY fk_potvrdil_vecnou_spravnost,
    DROP FOREIGN KEY fk_zverejnil;

ALTER TABLE 25a_objednavky
    ADD CONSTRAINT `25a_objednavky_ibfk_1` 
        FOREIGN KEY (uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL,
    ADD CONSTRAINT `25a_objednavky_ibfk_2` 
        FOREIGN KEY (uzivatel_akt_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL,
    ADD CONSTRAINT `25a_objednavky_ibfk_3` 
        FOREIGN KEY (garant_uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL,
    ADD CONSTRAINT `25a_objednavky_ibfk_4` 
        FOREIGN KEY (objednatel_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_dodavatel_potvrdil 
        FOREIGN KEY (dodavatel_potvrdil_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_dokoncil 
        FOREIGN KEY (dokoncil_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_fakturant 
        FOREIGN KEY (fakturant_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_odesilatel 
        FOREIGN KEY (odesilatel_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_potvrdil_vecnou_spravnost 
        FOREIGN KEY (potvrdil_vecnou_spravnost_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_zverejnil 
        FOREIGN KEY (zverejnil_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL;

-- 4. 25a_objednavky_faktury
ALTER TABLE 25a_objednavky_faktury
    DROP FOREIGN KEY fk_faktury_aktualizoval_uzivatel,
    DROP FOREIGN KEY fk_faktury_predana_zam;

ALTER TABLE 25a_objednavky_faktury
    ADD CONSTRAINT fk_faktury_aktualizoval_uzivatel 
        FOREIGN KEY (aktualizoval_uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_faktury_predana_zam 
        FOREIGN KEY (fa_predana_zam_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL;

-- 5. 25a_objednavky_prilohy
ALTER TABLE 25a_objednavky_prilohy
    DROP FOREIGN KEY `25a_objednavky_prilohy_ibfk_2`;

ALTER TABLE 25a_objednavky_prilohy
    ADD CONSTRAINT `25a_objednavky_prilohy_ibfk_2` 
        FOREIGN KEY (nahrano_uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL;

-- 6. 25a_pokladni_audit
ALTER TABLE 25a_pokladni_audit
    DROP FOREIGN KEY fk_audit_uzivatel;

ALTER TABLE 25a_pokladni_audit
    ADD CONSTRAINT fk_audit_uzivatel 
        FOREIGN KEY (uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL;

-- 7. 25a_pokladni_knihy
ALTER TABLE 25a_pokladni_knihy
    DROP FOREIGN KEY fk_knihy_spravce,
    DROP FOREIGN KEY fk_knihy_uzivatel;

ALTER TABLE 25a_pokladni_knihy
    ADD CONSTRAINT fk_knihy_spravce 
        FOREIGN KEY (zamknuta_spravcem_kym) REFERENCES 25_uzivatele(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_knihy_uzivatel 
        FOREIGN KEY (uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL;

-- 8. 25a_pokladni_polozky
ALTER TABLE 25a_pokladni_polozky
    DROP FOREIGN KEY fk_polozky_smazal,
    DROP FOREIGN KEY fk_polozky_vytvoril;

ALTER TABLE 25a_pokladni_polozky
    ADD CONSTRAINT fk_polozky_smazal 
        FOREIGN KEY (smazano_kym) REFERENCES 25_uzivatele(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_polozky_vytvoril 
        FOREIGN KEY (vytvoril) REFERENCES 25_uzivatele(id) ON DELETE SET NULL;

-- 9. 25_auditni_zaznamy
ALTER TABLE 25_auditni_zaznamy
    DROP FOREIGN KEY `25_auditni_zaznamy_ibfk_1`;

ALTER TABLE 25_auditni_zaznamy
    ADD CONSTRAINT `25_auditni_zaznamy_ibfk_1` 
        FOREIGN KEY (uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL;

-- 10. 25_hierarchie_profily
ALTER TABLE 25_hierarchie_profily
    DROP FOREIGN KEY fk_profil_vytvoril;

ALTER TABLE 25_hierarchie_profily
    ADD CONSTRAINT fk_profil_vytvoril 
        FOREIGN KEY (vytvoril_user_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL;

-- 11. 25_sablony_objednavek
ALTER TABLE 25_sablony_objednavek
    DROP FOREIGN KEY fk_sablony_uzivatel;

ALTER TABLE 25_sablony_objednavek
    ADD CONSTRAINT fk_sablony_uzivatel 
        FOREIGN KEY (user_id) REFERENCES 25_uzivatele(id) ON DELETE SET NULL;

-- =============================================================================
-- OVĚŘENÍ: Zkontroluj, že všechny FK nyní odkazují na správnou tabulku
-- =============================================================================
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM 
    information_schema.KEY_COLUMN_USAGE
WHERE 
    REFERENCED_TABLE_SCHEMA = 'eeo2025-dev'
    AND REFERENCED_TABLE_NAME LIKE '%uzivatel%'
    AND TABLE_SCHEMA = 'eeo2025-dev'
ORDER BY 
    TABLE_NAME, CONSTRAINT_NAME;
