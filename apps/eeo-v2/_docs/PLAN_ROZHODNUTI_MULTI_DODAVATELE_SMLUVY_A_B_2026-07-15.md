## Plan: Rozhodnutí A/B pro dodavatele ve smlouvách

Cíl je připravit rozhodovací podklad bez implementace: jestli jít cestou izolované smluvní vazby (A), nebo sjednotit přes 25_dodavatele s typovým markerem (B).

## Rozhodovací tabulka

| Kritérium | Varianta A (oddělená smluvní tabulka) | Varianta B (25_dodavatele + typ) | Dopad |
|---|---|---|---|
| Regresní riziko pro objednávky | Nízké | Střední až vysoké | B zasahuje aktivně používané dodavatelské endpointy |
| Rozsah změn v backendu | Střední | Vysoký | B vyžaduje plošné filtrování typ=OBJ |
| Datová konzistence modelu dodavatele | Střední | Vysoká | B má jednotnou strukturu dodavatele |
| Izolace změn na modul smluv | Vysoká | Nízká | B je cross-module změna |
| Náročnost | cca 24-40 h | cca 32-52 h | B je větší změna oproti původnímu plánu |
| Pravděpodobnost skrytých regresí | Nižší | Vyšší | B vyžaduje audit všech seznamů dodavatelů |

## Přesný seznam endpointů pro variantu B (musí mít OBJ filtr)

### A) API2 dodavatelé (router dodavatele/*)

1. `POST dodavatele/list`
- Router: /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php (case dodavatele/list)
- Handler: handle_dodavatele_list
- Aktuální stav: bere queries['dodavatele_select_all'] bez typového omezení
- Nutná změna pro B: default `typ='OBJ'` (volitelně parametr typ, ale bezpečný default OBJ)

2. `POST dodavatele/search`
- Router: /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php (case dodavatele/search)
- Handler: handle_dodavatele_search
- Aktuální stav: dynamické WHERE na `nazev/ico`, bez typového omezení
- Nutná změna pro B: do WHERE přidat `typ='OBJ'` jako default

3. `POST dodavatele/search-nazev`
- Router: /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php (case dodavatele/search-nazev)
- Handler: handle_dodavatele_search_nazev
- Aktuální stav: queries['dodavatele_search_nazev'] bez typu
- Nutná změna pro B: default `typ='OBJ'`

4. `POST dodavatele/search-ico`
- Router: /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php (case dodavatele/search-ico)
- Handler: handle_dodavatele_search_ico
- Aktuální stav: queries['dodavatele_select_by_ico'] bez typu
- Nutná změna pro B: filtrovat na `typ='OBJ'` (jinak kolize u stejného IČO mezi OBJ/SML)

5. `POST dodavatele/contacts`
- Router: /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php (case dodavatele/contacts)
- Handler: handle_dodavatele_contacts
- Aktuální stav: vrací kontakty z TBL_DODAVATELE podle user/usek logiky, bez typového omezení
- Nutná změna pro B: default `typ='OBJ'`

### B) Číselníky dodavatelů (router ciselniky/dodavatele/*)

6. `POST ciselniky/dodavatele/list`
- Router: /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php (case ciselniky/dodavatele/list)
- Handler: handle_ciselniky_dodavatele_list
- Aktuální stav: filtruje aktivni + oprávnění, ale neřeší typ
- Nutná změna pro B: default `typ='OBJ'`, explicitní režim pro SML pouze pro smluvní modul

7. `POST ciselniky/dodavatele/by-id`
- Router: /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php (case ciselniky/dodavatele/by-id)
- Handler: handle_ciselniky_dodavatele_by_id
- Aktuální stav: vrací dle ID bez typu
- Nutná změna pro B: validace kontextu (OBJ endpoint nesmí vracet SML záznam)

8. `POST ciselniky/dodavatele/insert`
- Router: /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php (case ciselniky/dodavatele/insert)
- Handler: handle_ciselniky_dodavatele_insert
- Aktuální stav: typ neexistuje
- Nutná změna pro B: default `typ='OBJ'`; zapis SML pouze přes smluvní flow

9. `POST ciselniky/dodavatele/update`
- Router: /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php (case ciselniky/dodavatele/update)
- Handler: handle_ciselniky_dodavatele_update
- Aktuální stav: typ neexistuje
- Nutná změna pro B: hlídat, aby běžný update nepřepínal OBJ/SML nekontrolovaně

10. `POST ciselniky/dodavatele/delete`
- Router: /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php (case ciselniky/dodavatele/delete)
- Handler: handle_ciselniky_dodavatele_delete
- Aktuální stav: bez rozlišení typu
- Nutná změna pro B: bezpečnostní kontrola proti mazání SML záznamů z OBJ workflow

### C) Obecné číselníky pro formulář (kritické)

11. `POST ciselniky`
- Router: /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php (case ciselniky)
- Handler: handle_ciselniky
- Aktuální stav: vrací `queries['ciselniky_pro_formular']`, kde položka dodavatele je `SELECT ... FROM TBL_DODAVATELE WHERE aktivni=1 ORDER BY nazev`
- Nutná změna pro B: v `queries['ciselniky_pro_formular']['dodavatele']` přidat default `typ='OBJ'`

## SQL definice, které ve variantě B musí být upraveny

1. /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php
- `dodavatele_select_all`
- `dodavatele_select_by_ico`
- `dodavatele_search_nazev`
- `dodavatele_search_combined`
- `dodavatele_filtered`
- `ciselniky_pro_formular['dodavatele']`

2. /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php
- `handle_dodavatele_search` má vlastní SQL (dynamicky), musí explicitně přidat typ filtr
- `handle_dodavatele_contacts` má vlastní SQL (viditelnost user/usek), musí explicitně přidat typ filtr

3. /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/ciselnikyHandlers.php
- list/by-id/insert/update/delete dodavatelů musí respektovat nový typový model

## Praktické doporučení k variantě B

1. Bezpečný default pro všechny existující dodavatelské endpointy: `typ='OBJ'`.
2. Smluvní dodavatele (typ SML) vystavit jen přes nové smluvní endpointy nebo explicitní parametr s kontrolou oprávnění.
3. Zavést guardrail: nepovolit měnit typ mezi OBJ/SML běžným update endpointem.
4. Před rolloutem udělat endpoint audit test: že žádný objednávkový endpoint nevrátí typ SML.

## Dílčí závěr

Varianta B je proveditelná, ale je to větší změna proti původnímu návrhu. Pokud je priorita minimalizace regresí a rychlejší dodání, je bezpečnější varianta A. Pokud je priorita sjednocený datový model dodavatelů, varianta B je vhodná, ale musí se udělat důsledný endpoint+SQL audit podle tohoto seznamu.
