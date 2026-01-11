-- ================================================
-- ALTER: Přidání spisovka_priloha_id do tracking tabulky
-- ================================================
-- Důvod: Párování podle názvu souboru je nespolehlivé
-- Řešení: Ukládat file_id přílohy ze Spisovky
-- Použití: Při drag&drop uložit file_id pro přesné propojení
-- ================================================

USE eeo2025;

-- Přidat sloupec pro ID přílohy ze Spisovky
ALTER TABLE 25_spisovka_zpracovani_log
ADD COLUMN spisovka_priloha_id INT(11) UNSIGNED DEFAULT NULL
    COMMENT 'ID přílohy ze Spisovka (file_id z dokument_priloha, pro přesné propojení)'
    AFTER dokument_id;

-- Přidat index pro rychlé vyhledávání podle spisovka_priloha_id
ALTER TABLE 25_spisovka_zpracovani_log
ADD INDEX idx_spisovka_priloha (spisovka_priloha_id);

-- ✅ HOTOVO
-- Nyní můžeme přesně propojit zpracovaný dokument s konkrétní přílohou
