# V2 evidenční karta - analýza polí modulů

Aktualizováno: 2026-08-20 10:45

Analýza polí ve všech CRUD modulech evidenční karty vozidla. Cíl:
1. Identifikovat pole read-only ze synchronizace Webdispečink.
2. Identifikovat pole, která mají mít číselník (`vehicles_lookups_v2`) nebo FK.
3. Odhalit nesoulad mezi UI formuláři a DB schématem/backend API.
4. Navrhnout priority oprav a chybějící číselníkové kategorie.

## Legenda zdrojů

- **WD** – automaticky ze synchronizace Webdispečink (jen pro čtení).
- **MANUAL** – ruční textové/číselné/datumové pole.
- **LOOKUP:kategorie** – hodnota z `vehicles_lookups_v2` (category + code).
- **LOOKUP:kategorie (chybí)** – doporučená nová číselníková kategorie.
- **FK:tabulka** – vazba na jiný V2 zaznam přes `id`.

---

## ✅ Stav po refaktoru

Původní nesoulad mezi zjednodušenými názvy polí ve FE a skutečnými payloady
backendu byl odstraněn. Všechny moduly nyní používají názvy očekávané
`VehicleService` a odpovídající lookup kódy.

Backend `VehicleService::createVehicleServiceRecord` a další metody čekají DB
sloupce (`service_type_code`, `supplier_name`, `cost_amount`, `service_date`,
…), ale nové inline FE formuláře v `apps/vehicles/frontend-v2/src/components/vehicles/detail/modules/*.jsx`
posílají obecné placeholder názvy (`description`, `service_station`, `cost`,
`tire_type`, `insurance_company`, …).

Refaktor byl proveden pro servisy, vybavu, pojisteni a skody, pneumatiky,
financovani a prilohy. Zbyva pouze overit realne create/update/delete scenare
proti DEV API a pripadne opravit drobne validacni nebo UX odchylky.

---

## 1. Modul: Servisy a opravy

**Tabulka:** `vehicles_service_records_v2`
**Backend service:** `VehicleService::createVehicleServiceRecord` (řádek 664)
**FE modul:** [apps/vehicles/frontend-v2/src/components/vehicles/detail/modules/ServiceRecordsModule.jsx](apps/vehicles/frontend-v2/src/components/vehicles/detail/modules/ServiceRecordsModule.jsx)

| Pole DB | Typ | Zdroj | UI dnes | Doporučení |
|---|---|---|---|---|
| `service_type_code` | VARCHAR(64) | LOOKUP:`service_type` | ❌ chybí | Select z `service_type` (`external`, `internal`) – povinné |
| `service_kind_code` | VARCHAR(64) | LOOKUP:`service_kind` | ❌ chybí | Select z `service_kind` (`repair`, `maintenance`, `inspection`) |
| `status_code` | VARCHAR(64) | LOOKUP:`service_status` | ❌ chybí | Select z `service_status` – default `planned` |
| `service_station_code` | VARCHAR(64) | LOOKUP:`service_station` (chybí) | ❌ místo toho `service_station` free text | Zavést novou kategorii `service_station`, tam ukládat kód interní/externí servisní stanice |
| `supplier_name` | VARCHAR(190) | MANUAL | dnes `service_station` (špatný název) | Přejmenovat na `supplier_name`, ponechat volný text (externí dodavatel) |
| `service_date` | DATE | MANUAL | ✅ `service_date` | OK |
| `planned_date` | DATE | MANUAL | ❌ chybí | Přidat datum plánu |
| `completed_date` | DATE | MANUAL | ❌ chybí | Přidat datum dokončení |
| `description` | TEXT | MANUAL | ✅ `description` | OK |
| `parts_description` | TEXT | MANUAL | ❌ chybí | Přidat volitelný textarea |
| `cost_amount` | DECIMAL(14,2) | MANUAL | dnes `cost` | Přejmenovat na `cost_amount` |
| `cost_currency` | CHAR(3) | fixed `CZK` | ❌ chybí | Skrytě odesílat `CZK` |
| `external_reference` | VARCHAR(128) | MANUAL | ❌ chybí | Přidat pole „Externí reference / číslo zakázky“ |

---

## 2. Modul: Výbava a zařízení

**Tabulka:** `vehicles_vehicle_equipment_v2`
**FE modul:** [apps/vehicles/frontend-v2/src/components/vehicles/detail/modules/EquipmentModule.jsx](apps/vehicles/frontend-v2/src/components/vehicles/detail/modules/EquipmentModule.jsx)

| Pole DB | Typ | Zdroj | UI dnes | Doporučení |
|---|---|---|---|---|
| `equipment_type_code` | VARCHAR(64) | LOOKUP:`equipment_type` | ❌ chybí | Select – povinné (defibrilátor, ventilátor, …) |
| `status_code` | VARCHAR(64) | LOOKUP:`equipment_status` | ❌ chybí | Select `active`, `service`, `retired` |
| `equipment_name` | VARCHAR(190) | MANUAL | dnes `item_name` | Přejmenovat na `equipment_name` |
| `manufacturer` | VARCHAR(190) | MANUAL | ✅ | OK, případně kombobox s návrhy z minulých hodnot |
| `model` | VARCHAR(190) | MANUAL | ❌ chybí | Přidat |
| `serial_number` | VARCHAR(128) | MANUAL | ✅ | OK |
| `inventory_number` | VARCHAR(128) | MANUAL | ❌ chybí | Přidat |
| `supplier_name` | VARCHAR(190) | MANUAL | ❌ chybí | Přidat |
| `acquired_at` | DATE | MANUAL | dnes `acquisition_date` | Přejmenovat na `acquired_at` |
| `warranty_valid_to` | DATE | MANUAL | ❌ chybí | Přidat |
| `revision_valid_to` | DATE | MANUAL | dnes `valid_to` | Přejmenovat na `revision_valid_to` |
| `cost_amount` / `cost_currency` | DECIMAL / CHAR | MANUAL | ❌ chybí | Přidat cenu (CZK skryté) |
| `note` | TEXT | MANUAL | dnes `notes` | Přejmenovat na `note` |

---

## 3. Modul: Pojištění a škody

**Tabulky:** `vehicles_insurance_policies_v2`, `vehicles_claims_v2`
**FE modul:** [apps/vehicles/frontend-v2/src/components/vehicles/detail/modules/InsuranceModule.jsx](apps/vehicles/frontend-v2/src/components/vehicles/detail/modules/InsuranceModule.jsx)

### 3a. Pojistné smlouvy

| Pole DB | Typ | Zdroj | UI dnes | Doporučení |
|---|---|---|---|---|
| `policy_type_code` | VARCHAR(64) | LOOKUP:`insurance_policy_type` | ❌ chybí | Select `mandatory_liability`, `collision`, `other` |
| `policy_number` | VARCHAR(128) | MANUAL | ✅ | OK |
| `insurer_name` | VARCHAR(190) | MANUAL (doporučeně LOOKUP:`insurance_company` – chybí) | dnes `insurance_company` | Přejmenovat, zvážit combobox s číselníkem pojišťoven |
| `valid_from` / `valid_to` | DATE | MANUAL | ✅ | OK |
| `premium_amount` / `premium_currency` | DECIMAL / CHAR | MANUAL | ❌ chybí | Přidat pojistné (CZK) |
| `deductible_amount` / `deductible_currency` | DECIMAL / CHAR | MANUAL | ❌ chybí | Přidat spoluúčast |
| `note` | TEXT | MANUAL | dnes `notes` | Přejmenovat na `note` |

### 3b. Škodní události

| Pole DB | Typ | Zdroj | UI dnes | Doporučení |
|---|---|---|---|---|
| `insurance_policy_id` | BIGINT (FK) | FK:`vehicles_insurance_policies_v2` | ❌ chybí | Select navázaný na aktivní smlouvy vozidla |
| `claim_status_code` | VARCHAR(64) | LOOKUP:`claim_status` | ❌ chybí | Select `open`, `in_liquidation`, `settled`, `rejected` |
| `claim_date` | DATE | MANUAL | dnes `incident_date` | Přejmenovat na `claim_date` |
| `settled_date` | DATE | MANUAL | ❌ chybí | Přidat |
| `title` | VARCHAR(190) | MANUAL | dnes `claim_number` (matoucí) | Rozdělit: `claim_number` → `external_reference`, `title` → nadpis události |
| `description` | TEXT | MANUAL | ✅ | OK |
| `payout_amount` / `payout_currency` | DECIMAL / CHAR | MANUAL | dnes `claim_amount` | Přejmenovat na `payout_amount` |
| `deductible_amount` / `deductible_currency` | DECIMAL / CHAR | MANUAL | ❌ chybí | Přidat spoluúčast |
| `external_reference` | VARCHAR(128) | MANUAL | ❌ chybí | Přidat |

---

## 4. Modul: Pneumatiky

**Tabulka:** `vehicles_vehicle_tires_v2`
**FE modul:** [apps/vehicles/frontend-v2/src/components/vehicles/detail/modules/TiresModule.jsx](apps/vehicles/frontend-v2/src/components/vehicles/detail/modules/TiresModule.jsx)

| Pole DB | Typ | Zdroj | UI dnes | Doporučení |
|---|---|---|---|---|
| `season_code` | VARCHAR(32) | LOOKUP:`tire_season` | ❌ dnes `tire_type` s češtinou | Select z `tire_season` (`summer`, `winter`, `all_season`) |
| `status_code` | VARCHAR(64) | LOOKUP:`tire_status` | ❌ chybí | Select `active`, `stored`, `retired` |
| `tire_set_name` | VARCHAR(190) | MANUAL | ❌ chybí | Přidat volitelný název sady |
| `dimension` | VARCHAR(64) | MANUAL | dnes `tire_size` | Přejmenovat na `dimension` |
| `quantity` | SMALLINT UNSIGNED | MANUAL | ❌ chybí | Přidat počet (default 4) |
| `tread_depth_mm` | DECIMAL(5,2) | MANUAL | dnes `tread_depth` | Přejmenovat na `tread_depth_mm` |
| `acquired_at` | DATE | MANUAL | dnes `purchase_date` | Přejmenovat na `acquired_at` |
| `installed_at` | DATE | MANUAL | ❌ chybí | Přidat datum nasazení |
| `removed_at` | DATE | MANUAL | ❌ chybí | Přidat datum sundání |
| `supplier_name` | VARCHAR(190) | MANUAL | ❌ chybí | Přidat dodavatele |
| `storage_location` | VARCHAR(190) | MANUAL | ❌ chybí | Přidat umístění skladu |
| `cost_amount` / `cost_currency` | DECIMAL / CHAR | MANUAL | ❌ chybí | Přidat cenu |
| `note` | TEXT | MANUAL | dnes `notes` | Přejmenovat na `note` |
| `manufacturer` | – | – | ❌ v DB neexistuje | Odstranit z formuláře nebo přidat do `metadata_json` |

---

## 5. Modul: Dotace a financování

**Tabulka:** `vehicles_vehicle_funding_v2`
**FE modul:** [apps/vehicles/frontend-v2/src/components/vehicles/detail/modules/FundingModule.jsx](apps/vehicles/frontend-v2/src/components/vehicles/detail/modules/FundingModule.jsx)

| Pole DB | Typ | Zdroj | UI dnes | Doporučení |
|---|---|---|---|---|
| `funding_status_code` | VARCHAR(64) | LOOKUP:`funding_status` | ❌ chybí | Select `none`, `applied`, `awarded`, `sustainability`, `closed` |
| `grant_title_code` | VARCHAR(128) | LOOKUP:`grant_title` (chybí) | ❌ dnes `funding_source` free text | Zavést kategorii `grant_title` s běžnými dotačními tituly (EU, SFDI, …) |
| `call_code` | VARCHAR(128) | LOOKUP:`grant_call` (chybí) | ❌ chybí | Zvážit další kategorii pro výzvy nebo volný text |
| `provider_name` | VARCHAR(190) | MANUAL | ❌ chybí | Přidat |
| `reference_number` | VARCHAR(128) | MANUAL | ❌ chybí | Přidat číslo smlouvy/rozhodnutí |
| `award_date` | DATE | MANUAL | dnes `received_date` | Přejmenovat na `award_date` |
| `eligible_amount` | DECIMAL(14,2) | MANUAL | ❌ chybí | Přidat způsobilé výdaje |
| `grant_amount` | DECIMAL(14,2) | MANUAL | dnes `amount` | Přejmenovat na `grant_amount` |
| `own_share_amount` | DECIMAL(14,2) | MANUAL | ❌ chybí | Přidat vlastní podíl |
| `sustainability_from` / `sustainability_to` | DATE | MANUAL | ❌ chybí | Přidat období udržitelnosti |
| `note` | TEXT | MANUAL | dnes `notes` | Přejmenovat na `note` |

---

## 6. Modul: Přílohy

**Tabulka:** `vehicles_card_attachments_v2`
**FE modul:** [apps/vehicles/frontend-v2/src/components/vehicles/detail/modules/AttachmentsModule.jsx](apps/vehicles/frontend-v2/src/components/vehicles/detail/modules/AttachmentsModule.jsx)

| Pole DB | Typ | Zdroj | UI dnes | Doporučení |
|---|---|---|---|---|
| `document_type_code` | VARCHAR(64) | LOOKUP:`document_type` (chybí) | ❌ nepoužívá | Zavést kategorii `document_type` podle klasifikace v [EVKARTA_FIELD_MATRIX.md](apps/vehicles/podklady/EVKARTA_FIELD_MATRIX.md) (příprava, VZ, předání, zprovoznění, provoz, vyřazení) |
| `original_filename` | VARCHAR | AUTO při uploadu | zobrazí se | OK |
| `mime_type` / `file_size` | – | AUTO | zobrazí se | OK |
| `uploaded_at` / `uploaded_by` | – | AUTO | zobrazí se | OK |
| valid_from / valid_to (dle původního plánu) | DATE | MANUAL | ❌ chybí | Přidat platnost dokumentu |
| poznámka / description | TEXT | MANUAL | ❌ chybí | Přidat volitelný popis |

---

## 7. Základní údaje v hlavičce karty

**Zdroj Webdispečink:** `w_tovarni_znacka`, `w_model_vozu`, `w_typ_phm`, `w_popis` (volací znak),
`w_stanoviste`, `spz`, `status`, `datum_zarazeni` (in_service_from), `najeto_km`
(z `vehicles_wd_positions_v2`), `last_update`.

| Pole | Zdroj | UI dnes | Doporučení |
|---|---|---|---|
| SPZ | WD | zobrazeno v hlavičce | Označit badgem „WD“ v tooltipu |
| Volací znak (`w_popis`) | WD | needitovatelné | Označit „WD“ |
| Palivo (`w_typ_phm`) | WD | needitovatelné | Označit „WD“ |
| Stanoviště (`w_stanoviste`) | WD | needitovatelné | Označit „WD“ |
| Nájezd km (`najeto_km`) | WD | needitovatelné, nově doplněno | OK, přidat čas poslední pozice |
| Datum zařazení (`in_service_from`) | WD | needitovatelné | OK |
| Status | WD + manuální override | badge | Ponechat, přidat tooltip s WD stavem |
| Typ vozidla / ZZS typ | LOOKUP:`vehicle_type` (chybí) | text | Zavést číselník `vehicle_type` (RLP, RV, SAN, DRNR, …) |

Scalar manuální pole (VIN, evidenční číslo, dodavatel, cena, technický stav,
životnost, servisní intervaly) zůstávají editovatelné.

Doporučení pro UI: přidat malý badge `WD` (auto-sync) k needitovatelným polím
v hlavičce a formuláři, aby uživatel viděl, co nemá smysl přepisovat.

---

## 8. Číselníkové kategorie

Kategorie byly zavedeny do `vehicles_lookups_v2` migrací
`20260821_v2_vehicle_lookups_extension.sql` a aplikovány do DEV DB:

| Kategorie | Použití | Poznámka |
|---|---|---|
| `service_station` | Servisy, interní/externí stanice | Naplnit seznamem servisních středisek |
| `insurance_company` | Insurance policies – pojišťovny | Naplnit seznamem používaných pojišťoven |
| `grant_title` | Funding – dotační tituly | Naplnit hlavními zdroji (EU, SFDI, MPSV, IROP, …) |
| `grant_call` | Funding – výzvy | Volitelné, může začít prázdné |
| `document_type` | Attachments – typ dokumentu | Podle klasifikace v FIELD_MATRIX |
| `vehicle_type` | Hlavička – ZZS typ | RLP, RV, SAN, DRNR, TECH |
| `technical_condition` | Detail card – technický stav | Škála 1–5 nebo textové |
| `battery_condition` | Detail card – stav baterie | OK / Slabá / Vyměnit |

---

## 9. Stav priorit oprav

### ✅ Kritické - dokončeno

1. Přemapovat pole v FE modulech na skutečné DB názvy.
2. Přidat selecty pro existující číselníky (`service_type`, `service_kind`,
   `service_status`, `equipment_type`, `equipment_status`, `insurance_policy_type`,
   `claim_status`, `tire_season`, `tire_status`, `funding_status`).
3. Přidat validaci povinných kódů na FE a citelné chybové hlášky.

Tyto tři body jsou implementovány; zbývá jejich integrační ověření při zápisu.

### ✅ Důležité - implementováno

4. Doplnit chybějící pole formulářů (částky, měna, planned/completed data,
   external_reference, note, kvantita pneumatik, období udržitelnosti dotace).
5. Zavést nové číselníkové kategorie `service_station`, `insurance_company`,
   `grant_title`, `document_type`, `vehicle_type`.
6. Přidat viditelný badge `WD` (nebo ikonu Webdispečink) k needitovatelným
   polím v hlavičce a formuláři.
7. Přílohy: přidat výběr `document_type_code`, `valid_from`, `valid_to`,
   `description`.
8. Škody: přidat select smlouvy (`insurance_policy_id`) a spoluúčast.

Body 4 až 8 jsou implementovány v refaktorovaných FE modulech a čekají na
testování proti reálným záznamům.

### 🟡 Zbývá jako drobné vylepšení

9. Combobox pro dodavatele / pojišťovny s návrhem podle dříve použitých hodnot.
10. Přidat kategorie `technical_condition`, `battery_condition` a napojit
    scalar detail formulář místo dnešního volného textu.
11. Pro pneumatiky doplnit sklad (`storage_location`) a přehled aktivní vs
    uskladněné sady.

---

## 10. Doporučený implementační postup

1. Vytvořit migraci `20260821_v2_vehicle_lookups_extension.sql` s novými
   kategoriemi z bodu 8, ověřit pomocí dumpu podle standardu.
2. Refaktor každého FE modulu:
   - Přenést stávající „primitivní“ pole na skutečné DB názvy.
   - Přidat `<select>` napojený na `lookupByCategory[...]` (viz
     [apps/vehicles/frontend-v2/src/pages/VehicleDetailPage.jsx](apps/vehicles/frontend-v2/src/pages/VehicleDetailPage.jsx) řádek 265).
   - Přidat validaci povinných kódů a částek.
3. Doplnit `metadata_json` mapování jen tam, kde pole reálně chybí v DB (např.
   pneumatiky – `manufacturer`).
4. Označit read-only pole z Webdispečinku ikonou/badgem `WD`.
5. Rozšířit smoke test v [apps/vehicles/podklady/EVKARTA_IMPLEMENTATION_PROGRESS.md](apps/vehicles/podklady/EVKARTA_IMPLEMENTATION_PROGRESS.md)
   o CRUD krok pro každý modul, aby regrese odhalila případný další nesoulad.

Po dokončení prošel PHP lint, frontend build a integrace lookupů se dá znovu
označit implementace evidenční karty za připravenou k finálnímu testování.
