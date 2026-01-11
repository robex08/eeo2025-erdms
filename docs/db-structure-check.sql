-- Kontrola struktury klíčových tabulek pro refaktoring
-- Databáze: eeo2025
-- Datum: 20.12.2025

-- NASTAVENÍ
SELECT 'TBL_NASTAVENI_GLOBALNI (25a_nastaveni_globalni)' as tabulka;
DESCRIBE 25a_nastaveni_globalni;

SELECT 'TBL_UZIVATEL_NASTAVENI (25_uzivatel_nastaveni)' as tabulka;
DESCRIBE 25_uzivatel_nastaveni;

-- POKLADNY
SELECT 'TBL_POKLADNY (25a_pokladny)' as tabulka;
DESCRIBE 25a_pokladny;

SELECT 'TBL_POKLADNY_UZIVATELE (25a_pokladny_uzivatele)' as tabulka;
DESCRIBE 25a_pokladny_uzivatele;

SELECT 'TBL_POKLADNI_KNIHY (25a_pokladni_knihy)' as tabulka;
DESCRIBE 25a_pokladni_knihy;

SELECT 'TBL_POKLADNI_POLOZKY (25a_pokladni_polozky)' as tabulka;
DESCRIBE 25a_pokladni_polozky;

SELECT 'TBL_POKLADNI_POLOZKY_DETAIL (25a_pokladni_polozky_detail)' as tabulka;
DESCRIBE 25a_pokladni_polozky_detail;

SELECT 'TBL_POKLADNI_AUDIT (25a_pokladni_audit)' as tabulka;
DESCRIBE 25a_pokladni_audit;

-- OBJEDNÁVKY
SELECT 'TBL_OBJEDNAVKY (25a_objednavky)' as tabulka;
DESCRIBE 25a_objednavky;

SELECT 'TBL_OBJEDNAVKY_POLOZKY (25a_objednavky_polozky)' as tabulka;
DESCRIBE 25a_objednavky_polozky;

SELECT 'TBL_OBJEDNAVKY_PRILOHY (25a_objednavky_prilohy)' as tabulka;
DESCRIBE 25a_objednavky_prilohy;

-- FAKTURY
SELECT 'TBL_FAKTURY (25a_objednavky_faktury)' as tabulka;
DESCRIBE 25a_objednavky_faktury;

SELECT 'TBL_FAKTURY_PRILOHY (25a_faktury_prilohy)' as tabulka;
DESCRIBE 25a_faktury_prilohy;

-- HIERARCHIE
SELECT 'TBL_HIERARCHIE_PROFILY (25_hierarchie_profily)' as tabulka;
DESCRIBE 25_hierarchie_profily;

SELECT 'TBL_UZIVATELE_HIERARCHIE (25_uzivatele_hierarchie)' as tabulka;
DESCRIBE 25_uzivatele_hierarchie;

-- ROLE & PRÁVA
SELECT 'TBL_ROLE (25_role)' as tabulka;
DESCRIBE 25_role;

SELECT 'TBL_PRAVA (25_prava)' as tabulka;
DESCRIBE 25_prava;

SELECT 'TBL_ROLE_PRAVA (25_role_prava)' as tabulka;
DESCRIBE 25_role_prava;

SELECT 'TBL_UZIVATELE_ROLE (25_uzivatele_role)' as tabulka;
DESCRIBE 25_uzivatele_role;
