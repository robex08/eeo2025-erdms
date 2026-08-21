# V2 evidencni karta vozidla - field matrix

Prvni analyza podkladu `cars_detail.ods` a `Karta vozidla.docx` pro DEV implementaci V2.
Produkce neni soucasti teto etapy.

## Identita a parovani

| Navrh | V2 cil | Zdroj | Ulozeni | Historie |
|---|---|---|---|---|
| Evidencni cislo ZZS | nove manualni/organizacni pole | rucni | `vehicles_detail_cards` | ano |
| SPZ | `vehicles_cars_list_v2.spz` | WebDispecink + rucni korekce podle pravidel | hlavni vozidlo + `vehicles_identity_aliases_v2` | ano |
| VIN | nove pole | rucni/import | `vehicles_detail_cards` | ano |
| `wcar_id` / `legacy_carid` | `vehicles_cars_list_v2.legacy_carid` | WebDispecink | hlavni vozidlo | ano pri zmene |
| Interni `vehicle_id` | `vehicles_cars_list_v2.id` | V2 | hlavni klic | nemenit |
| Typ vozu | nove/rozsirene pole, navazat na ciselnik | rucni + WD podle dostupnosti | sloupec nebo ciselnik | ano |
| Stanoviste | V2 stanoviste | WD/rucni | sloupec nebo vazba na stanoviste | ano |
| Oblastni stredisko | nova vazba | rucni/ciselnik | samostatna vazba nebo ciselnik | ano |

SPZ neni primarni klic. Vsechny nove V2 vazby maji pouzivat `vehicle_id` nebo
`legacy_carid`; historicka SPZ je pouze alias/pomocny importni klic.

## Ciselniky V2

V2 runtime pocita s tabulkou `vehicles_lookups_v2`, ktera v DEV pred touto
migraci chybela. Tabulka je nyni zalozena samostatnou DEV migraci a obsahuje
`category`, `code`, `item_name` a `item_description`.

Pravidla pro vsechny nove ciselnikove vazby:

- aplikace uklada a prenasi `category + code`, nikoli ciselnikove `id`
- `id` je pouze technicky surrogate key tabulky
- kombinace `category + code` je unikatni
- `code` je stabilni ASCII identifikator pro API, import a historii
- zobrazovany text je `item_name` a muze se menit bez rozbiti vazeb
- deaktivace se resi `is_active`, ne mazanim kodu
- doplnkova konfigurace patri do `metadata_json`, ne do ciziho klice na `id`

Aktualne jsou v DEV zasety pouze kody, ktere jiz pouziva V2:

- `service_cancel_reason`: `service_finished`, `auto_false_positive`
- `vehicle_status_reason`: `technicka_zavada`, `planovana_odstavka`,
  `administrativni_blokace`, `k_vyrazeni`, `jine`
- `service_type`: `external`, `internal`
- `service_status`: `planned`, `in_progress`, `completed`, `cancelled`
- `service_kind`: `repair`, `maintenance`, `inspection`

Budouci kategorie pro kartu (typ vozu, typ dokumentu, typ vybavy, sezona
pneumatik, typ servisu, typ pojisteni a dalsi) se doplni az po potvrzeni
konkretnich hodnot z field matrix. V2 kod nebude navazovat nove karty pres
číselnikove `id`.

## Zakladni a majetkove udaje

| Pole z podkladu | Navrh ulozeni | Typ | Poznamka |
|---|---|---|---|
| Rok porizeni | `vehicles_detail_cards.acquisition_year` | SMALLINT | validace 1900-2100 |
| Dodavatel | `vehicles_detail_cards.acquisition_supplier` nebo vazba | VARCHAR / FK | pokud bude potreba historie dodavatelu, samostatna tabulka |
| Zaruka do / informace o zaruce | `vehicles_detail_cards.warranty_*` | datum + text | datum samostatne, text jen doplnek |
| Porizovaci cena | `vehicles_detail_cards.acquisition_price` | DECIMAL(14,2) | neukladat jako text |
| Datum zarazeni do provozu | `vehicles_detail_cards.in_service_from` | DATE | nahradi legacy `cars_detail.w_datod` |
| Datum uvedeni do provozu | `vehicles_detail_cards.in_service_from` | DATE | sjednotit terminologii |
| Technicka specifikace | JSON nebo text | JSON pouze pokud neni dotazovana | dotazovane parametry jako sloupce |

## Dokumenty a procesni soubory

ODS obsahuje procesni dokumenty od pripravy VZ po zprovozneni a vyradeni.
Nejde o JSON vlastnosti karty; jde o opakovane dokumenty s metadaty.

Navrh cilove tabulky: `vehicles_card_attachments_v2`.

Klasifikace dokumentu:

- priprava: technicka specifikace, PTK, PHVZ, material do rady kraje, usneseni
- verejna zakazka: zadavaci dokumentace, prubeh VZ, hodnoceni, vyber dodavatele, smlouva, termin dodani
- predani: predavaci protokol, COC list, faktura, datova tabulka, povinna dokumentace
- zprovozneni: MTP, havarijni pojisteni, povinne ruceni, SFDI, dohoda RSD, pojistovny, WD zalozeni, karta vozidla
- provoz: EEO data, dopravni nehody, servis
- vyrazeni: navrh na vyrazeni, skodni/likvidacni komise, vyrazeni vozidla

Kazda prilohova polozka musi mit minimalne typ dokumentu, nazev, storage key,
MIME, velikost, hash, datum nahrani, autora, platnost a audit zmeny/smazani.

## Dotace a financovani

| Pole | Navrh ulozeni | Poznamka |
|---|---|---|
| Dotace ano/ne | `vehicles_vehicle_funding_v2` | boolean/status, ne text |
| Dotační titul | `vehicles_vehicle_funding_v2.title` | samostatny zaznam |
| Výzva | `vehicles_vehicle_funding_v2.call_name` | vazba nebo text podle ciselniku |
| Udrzitelnost od/do | `vehicles_vehicle_funding_v2.sustainability_*` | datumy |
| SFDI | prilohova klasifikace + pripadne financni zaznam | rozlisit dokument a atribut |

Dotace patri do opakovane struktury, protoze vozidlo muze mit vice zdroju
financovani nebo vice obdobi udrzitelnosti.

## Provoz a technicky stav

| Pole | Navrh ulozeni | Zdroj |
|---|---|---|
| Aktualni stav | `vehicles_cars_list_v2.status` + stavova udalost | V2/WD/rucni |
| Technicky stav | `vehicles_detail_cards.technical_condition` | rucni/ciselnik |
| Datum posledni technicke kontroly | `vehicles_detail_cards.last_technical_check_at` | rucni/import |
| Datum emisi | `vehicles_detail_cards.emission_valid_to` | rucni |
| Servisni interval | `vehicles_detail_cards.service_interval_*` | rucni/ciselnik |
| Stav tachometru | WD cache + V2 snapshot | WD |
| Baterie | sloupec nebo samostatny servisni zaznam | podle detailu navrhu |
| Zivotnost vozidla | odvozena/metrika | ne jako volny text |
| Pneumatiky | `vehicles_vehicle_tires_v2` | opakovana sada/obdobi |

Stavy `Provoz`, `Servis`, `Odstaveno`, `Zalozni` maji byt ciselnikem a kazda
zmena musi vytvorit audit i domenní stavovou udalost.

## Pneumatiky

Navrh `vehicles_vehicle_tires_v2`:

- `vehicle_id`
- sezona: zimni/letni
- stav nebo sada
- rozmer
- pocet
- datum porizeni
- datum nasazeni
- dodavatel
- poznamka
- audit autora a casu

Pneumatiky nejsou vhodne do `equipment_json`, protoze se meni a mohou byt
vyhledavane nebo historicky porovnavane.

## Servis

Navrh sjednotit servisni workflow do `vehicles_service_records_v2` a navazat
na existujici `vehicles_manual_events_v2` jako timeline udalosti.

| Pole | Navrh |
|---|---|
| Servis externi / vlastni autodilna | `service_type` ciselnik |
| Datum opravy | `service_date` |
| Typ opravy | `service_kind` ciselnik/text |
| Dodavatel servisu | `supplier_id` nebo text pri importu |
| Dily | detail nebo JSON polozek, podle potreby nakladu |
| Cena opravy | DECIMAL(14,2) |
| Servisni stanice | vazba na `vehicles_station_addresses_v2` |
| Stav servisu | stavova udalost |

EEO servisni a nakladova historie se ma napojit pres stabilni `vehicle_id` nebo
`legacy_carid`; SPZ-only text matching je pouze docasny importni fallback.

## Pojisteni a skody

Navrh tabulek:

- `vehicles_insurance_policies_v2` pro pojistne smlouvy a platnosti
- `vehicles_claims_v2` pro skodni udalosti

Pole skodni udalosti:

- datum udalosti
- popis
- stav likvidace
- vyse plneni
- spoluucast
- pojistna smlouva
- souvisejici dokumenty
- autor, cas a audit

Jedna vozidlo muze mit vice smluv i vice skod, proto zde neni vhodny jeden
sloupec ani JSON v karte.

## Výbava, zarizeni a revize

ODS i DOCX uvadeji vybavu a zarizeni:

- lekarnicka
- zdravotnicka vybava
- defibrilator
- ventilator
- odsavacka
- monitor
- radiostanice
- tablet
- GPS
- kamera
- majaky
- baterie

Navrh:

- typ vybavy/zarizeni jako ciselnik
- inventarni/evidencni cislo
- vyrobni cislo
- dodavatel
- datum porizeni
- revize od/do
- stav
- cena
- vazba na prilohy a servis

Opakovane polozky patri do `vehicles_vehicle_equipment_v2`; pouze jednoduchy
priznak pritomnosti muze zustat jako odvozeny/prezentacni udaj.

## Provozni metriky

| Pole | Zdroj | Navrh |
|---|---|---|
| Pocet vyjezdu | interni/EEO | odvozena metrika nebo agregacni tabulka |
| Pocet kilometru | WebDispecink | `vehicles_wd_km_stats_v2` |
| Spotreba PHM | WebDispecink/CCS | existujici billing/statistiky |
| Prumerny najezd za mesic | odvozeno | nepersistovat jako rucni udaj |
| Vytizeni vozidla | odvozeno | definovat vzorec a obdobi |

Odvozene metriky nesmi byt editovatelne v karte. V karte se pouze zobrazi a
jejich vypocet se auditne nemení jako hodnota vozidla.

## Zdroj a audit pro kazde pole

Kazde pole ve finalni matici musi mit doplnene:

- source: `webdispecink`, `user`, `eeo`, `derived`, `migration`
- editability: read-only/editable/override
- validation a nullability
- role, ktera muze menit hodnotu
- audit: ano/ne
- platnost nebo historie
- vazbu na `vehicle_id`

## Navrh dalsiho poradi

1. Overit pojmenovani a vyznam poli s uzivatelem.
2. Ziskat DEV `SHOW CREATE TABLE` pro vsechny tabulky, ktere budou nahrazeny.
3. Navrhnout a schvalit nove tabulky pro prilohy, servis, vybavu, pojisteni,
   skody, financovani a pneumatiky.
4. Vytvorit DEV migraci po dalsim full dumpu.
5. Teprve potom odstranit legacy joiny a doplnit V2 editaci.