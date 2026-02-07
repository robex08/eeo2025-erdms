-- KONTROLA: Která kniha patří kterému uživateli?
SELECT 
    kb.id AS book_id,
    kb.uzivatel_id,
    kb.pokladna_id,
    p.cislo_pokladny,
    u.username,
    CONCAT(u.jmeno, ' ', u.prijmeni) AS cele_jmeno,
    kb.rok,
    kb.mesic,
    kb.pocet_zaznamu,
    kb.celkove_prijmy
FROM 25a_pokladni_knihy kb
JOIN 25a_pokladny p ON p.id = kb.pokladna_id
JOIN 25_uzivatele u ON u.id = kb.uzivatel_id
WHERE kb.pokladna_id = 13  -- Pokladna 999
  AND kb.rok = 2026
  AND kb.mesic = 1
ORDER BY kb.id;
