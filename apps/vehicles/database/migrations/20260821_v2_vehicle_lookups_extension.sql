-- DEV-only V2 lookup extension for vehicle card modules.
-- Adds missing lookup categories referenced by service records, insurance,
-- funding, attachments and card header. Uses category + code as business
-- reference; ids remain purely technical.

INSERT INTO vehicles_lookups_v2 (category, code, item_name, sort_order, is_active)
VALUES
    -- ZZS typ vozidla (pro hlavičku karty)
    ('vehicle_type', 'rlp', 'RLP - Rychlá lékařská pomoc', 10, 1),
    ('vehicle_type', 'rv', 'RV - Rendez-vous', 20, 1),
    ('vehicle_type', 'rzp', 'RZP - Rychlá zdravotnická pomoc', 30, 1),
    ('vehicle_type', 'san', 'SAN - Sanitní vůz', 40, 1),
    ('vehicle_type', 'drnr', 'DRNR - Doprava raněných, nemocných a rodiček', 50, 1),
    ('vehicle_type', 'tech', 'Technické vozidlo', 60, 1),
    ('vehicle_type', 'admin', 'Administrativní vozidlo', 70, 1),
    ('vehicle_type', 'jine', 'Jiné', 90, 1),

    -- Servisní stanice / dodavatelé oprav
    ('service_station', 'vlastni_dilna', 'Vlastní autodílna', 10, 1),
    ('service_station', 'autorizovany_servis', 'Autorizovaný servis', 20, 1),
    ('service_station', 'neautorizovany_servis', 'Neautorizovaný servis', 30, 1),
    ('service_station', 'pneuservis', 'Pneuservis', 40, 1),
    ('service_station', 'karosarna', 'Karosárna / lakovna', 50, 1),
    ('service_station', 'jine', 'Jiné', 90, 1),

    -- Pojišťovny
    ('insurance_company', 'kooperativa', 'Kooperativa pojišťovna', 10, 1),
    ('insurance_company', 'ceska_pojistovna', 'Česká pojišťovna / Generali', 20, 1),
    ('insurance_company', 'allianz', 'Allianz pojišťovna', 30, 1),
    ('insurance_company', 'uniqa', 'UNIQA pojišťovna', 40, 1),
    ('insurance_company', 'csob', 'ČSOB pojišťovna', 50, 1),
    ('insurance_company', 'pvzp', 'Pojišťovna VZP', 60, 1),
    ('insurance_company', 'slavia', 'Slavia pojišťovna', 70, 1),
    ('insurance_company', 'direct', 'Direct pojišťovna', 80, 1),
    ('insurance_company', 'jine', 'Jiná pojišťovna', 90, 1),

    -- Dotační tituly
    ('grant_title', 'irop', 'IROP - Integrovaný regionální operační program', 10, 1),
    ('grant_title', 'sfdi', 'SFDI - Státní fond dopravní infrastruktury', 20, 1),
    ('grant_title', 'nnpz', 'Národní plán obnovy', 30, 1),
    ('grant_title', 'kraj', 'Krajská dotace', 40, 1),
    ('grant_title', 'mzcr', 'Ministerstvo zdravotnictví ČR', 50, 1),
    ('grant_title', 'mvcr', 'Ministerstvo vnitra ČR', 60, 1),
    ('grant_title', 'jine', 'Jiný dotační titul', 90, 1),

    -- Typy dokumentů (přílohy karty)
    ('document_type', 'tech_specifikace', 'Technická specifikace', 10, 1),
    ('document_type', 'ptk', 'PTK - Podklady pro technický kontrolu', 20, 1),
    ('document_type', 'phvz', 'PHVZ - Podklady k VZ', 30, 1),
    ('document_type', 'zadavaci_dokumentace', 'Zadávací dokumentace VZ', 40, 1),
    ('document_type', 'smlouva', 'Smlouva o dílo', 50, 1),
    ('document_type', 'predavaci_protokol', 'Předávací protokol', 60, 1),
    ('document_type', 'coc_list', 'COC list', 70, 1),
    ('document_type', 'faktura', 'Faktura', 80, 1),
    ('document_type', 'tp', 'Technický průkaz', 90, 1),
    ('document_type', 'orv', 'ORV - Osvědčení o registraci vozidla', 100, 1),
    ('document_type', 'povinne_ruceni', 'Povinné ručení', 110, 1),
    ('document_type', 'havarijni_pojisteni', 'Havarijní pojištění', 120, 1),
    ('document_type', 'stk', 'STK protokol', 130, 1),
    ('document_type', 'emise', 'Emisní protokol', 140, 1),
    ('document_type', 'servisni_protokol', 'Servisní protokol', 150, 1),
    ('document_type', 'skodni_udalost', 'Škodní událost', 160, 1),
    ('document_type', 'dohoda_rsd', 'Dohoda s ŘSD', 170, 1),
    ('document_type', 'sfdi_smlouva', 'Smlouva SFDI', 180, 1),
    ('document_type', 'vyrazeni', 'Vyřazovací dokumentace', 190, 1),
    ('document_type', 'foto', 'Fotodokumentace', 200, 1),
    ('document_type', 'jine', 'Jiný dokument', 900, 1),

    -- Technický stav vozidla
    ('technical_condition', 'excellent', 'Výborný', 10, 1),
    ('technical_condition', 'good', 'Dobrý', 20, 1),
    ('technical_condition', 'acceptable', 'Přijatelný', 30, 1),
    ('technical_condition', 'poor', 'Zhoršený', 40, 1),
    ('technical_condition', 'critical', 'Kritický - k opravě', 50, 1),
    ('technical_condition', 'retired', 'K vyřazení', 60, 1),

    -- Stav baterie (startovací akumulátor)
    ('battery_condition', 'new', 'Nová', 10, 1),
    ('battery_condition', 'good', 'V pořádku', 20, 1),
    ('battery_condition', 'weak', 'Slabá', 30, 1),
    ('battery_condition', 'replace', 'Nutná výměna', 40, 1)
ON DUPLICATE KEY UPDATE
    item_name = VALUES(item_name),
    sort_order = VALUES(sort_order),
    is_active = VALUES(is_active),
    updated_at = CURRENT_TIMESTAMP;
