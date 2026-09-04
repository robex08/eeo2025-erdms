# Evidencni karta vozidla V2 - podklad pro opakovane overeni

Aktualizovano: 2026-08-24

Tento dokument je pracovni podklad pro opakovane funkcni, kodove a databazove
overeni evidencni karty vozidla ve Vehicles V2. Prace probiha pouze v DEV.
Neobsahuje hesla, tokeny ani hodnoty z `.env` souboru.

## Overeny kontext

- Workspace: `/var/www/erdms-dev`
- Repository: `robex08/eeo2025-erdms`
- Aktualni vetev: `v2-develop-evkarta`
- Frontend V2: `apps/vehicles/frontend-v2`
- API V2: `apps/vehicles/api/vehicle/v2.0`
- Detail vozidla: route `/vehicles/:vehicleId`
- API zaklad: `VITE_API_V2_BASE_URL`, s fallbackem
  `/dev/api.vehicles/vehicle/v2.0`

### Dev databazove pristupy

Read-only handshake byl proveden 2026-08-24 konfiguraci
`apps/vehicles/api/vehicle/v2.0/.env`:

| Pripojeni | Databaze | Server | Stav |
|---|---|---|---|
| Vehicles V2 | `vehicles-zzs-dev` | MariaDB 11.8.6 | pripojeno |
| EEO (integrace) | `eeo2025` | MariaDB 11.8.6 | pripojeno |

Pristupove udaje jsou v `.env` a nesmi se zapisovat do dokumentace, Git diffu,
terminoveho vystupu ani do komunikace.

### Izolace DEV a produkce

API pri startu vyzaduje explicitni `VEHICLES_V2_ENV`,
`VEHICLES_V2_DB_NAME`, `VEHICLES_V2_EXPECTED_DB_NAME` a
`VEHICLES_V2_ATTACHMENT_ROOT`. Skutecne pripojena DB musi odpovidat expected DB
a attachment root musi obsahovat konfigurovany marker se shodnym prostredim:
`.vehicles-v2-environment` obsahuje presne `development` nebo `production`.

DEV ma `vehicles-zzs-dev`, root `data/vehicles-v2/attachments` a marker
`development`. Produkce pouziva samostatny root z
`api/vehicle/v2.0/.env.production.example`, expected DB `vehicles-zzs` a marker
`production`. Zmena prostredi bez spravne DB nebo markeru ukonci API pri startu.

Pred nasazenim API se spousti `php verify-environment.php`. Guarded produkcni
deploy `api/vehicle/v2.0/deploy-production-api.sh` zachova produkcni `.env` a
overi konfiguraci pred kopirovanim i po nem.

## Architektura a odpovednost kodu

### Frontend

- Route definice: `apps/vehicles/frontend-v2/src/app/AppRoutes.jsx`
- Orchestrace cele karty a nacitani dat: `apps/vehicles/frontend-v2/src/pages/VehicleDetailPage.jsx`
- HTTP klient a API kontrakty: `apps/vehicles/frontend-v2/src/services/apiClient.js`
- Zakladni/technicka karta: `src/components/vehicles/detail/VehicleBasicInfoCard.jsx`,
  `VehicleTechnicalFormCard.jsx`
- Prehled modulu: `src/components/vehicles/detail/VehicleModulesDashboard.jsx`
- Moduly: `src/components/vehicles/detail/modules/`
  - `AttachmentsModule.jsx`
  - `ServiceRecordsModule.jsx`
  - `EquipmentModule.jsx`
  - `InsuranceModule.jsx`
  - `TiresModule.jsx`
  - `FundingModule.jsx`
  - `HistoryModule.jsx`

`VehicleDetailPage` nacita hlavni detail a samostatne nacita historii, prilohy,
servis, vybavu, pojisteni/skody, pneumatiky, financovani, ciselniky a adresy
stanovist. Editace scalar udaju je povolena jen rolim `superadmin`,
`administrator` a `fleet_manager`.

### Backend

Tok pozadavku je:

```text
V2 frontend -> index.php routes -> VehicleController -> VehicleService -> VehicleRepository -> MariaDB
```

Klicove soubory:

- routovani: `apps/vehicles/api/vehicle/v2.0/index.php`
- HTTP validace/odpovedi: `src/Controller/VehicleController.php`
- domenova logika a autorizace: `src/Service/VehicleService.php`
- SQL, audit a vazby: `src/Repository/VehicleRepository.php`
- konfigurace pripojeni: `src/Config/Database.php`, `src/Config/Env.php`

Repository drzi konstanty pro vedlejsi tabulky evidencni karty. Pri dalsi SQL
uprave je nutne pouzit existujici konstantu nebo ji nejdrive dohledat v
`VehicleRepository.php`; nazvy tabulek se nesmi odhadovat.

## API karty

Vsechny endpointy jsou relativni k `/dev/api.vehicles/vehicle/v2.0`.

| Oblast | Cteni | Zapis |
|---|---|---|
| Hlavni detail | `GET /vehicles/detail?vehicleId=` | `POST /vehicles/detail` |
| Historie | `GET /vehicles/card-history?vehicleId=` | audit se vytvari pri zmenach |
| Prilohy | `GET /vehicles/attachments?vehicleId=` | upload, download, delete pod `/vehicles/attachments/*` |
| Servis | `GET /vehicles/service-records?vehicleId=` | create, update, delete pod `/vehicles/service-records*` |
| Vybava | `GET /vehicles/equipment?vehicleId=` | create, update, delete pod `/vehicles/equipment*` |
| Pojisteni | `GET /vehicles/insurance-policies?vehicleId=` | create, update, delete pod `/vehicles/insurance-policies*` |
| Skody | `GET /vehicles/claims?vehicleId=` | create, update, delete pod `/vehicles/claims*` |
| Pneumatiky | `GET /vehicles/tires?vehicleId=` | create, update, delete pod `/vehicles/tires*` |
| Financovani | `GET /vehicles/funding?vehicleId=` | create, update, delete pod `/vehicles/funding*` |
| EEO servisni historie | `GET /vehicles/eeo-service-history?vehicleId=` | read-only integrace podle SPZ |
| Ciselniky | `GET /lookups` | `/lookups/save`, `/lookups/deactivate` |

API klient obsahuje konkretni nazvy a payloady. Pri zmene kontraktu upravit
backend, `apiClient.js` i pouzivajici modul soucasne.

### EEO servisni historie v detailu

V2 detail vozidla nacita read-only servisni historii primo z databaze EEO pres
`GET /vehicles/eeo-service-history?vehicleId=`. Backend nejdrive overi pristup
uzivatele k vozidlu, ziska jeho SPZ z `vehicles_cars_list_v2` a v EEO vyhleda SPZ
v predmetu objednavky bez mezer. Pouziva stejne filtry jako pocitadlo EEO v
prehledu vozidel: pouze aktivni objednavky a bez rozpracovanych, zamitnutych nebo
zrusenych stavu.

Postranni detail vozidla zobrazuje v sekci `Historie udalosti` kratky prehled
poslednich peti EEO oprav vcetne predmetu, data, cisla objednavky, stavu,
dodavatele a ceny. Pocet a celkova cena se pocitaji ze vsech nactenych EEO
objednavek; prednost ma suma faktur, jinak suma polozek. Pro uplny seznam je
aktivni odkaz do postranniho panelu `Servisni historie z EEO`, ktery nacita az
50 objednavek.

Hlavicka EEO panelu zobrazuje vozidlo ve formatu
`Vyrobce Model, SPZ: registracni znacka (volaci znak)`. Krizek pro zavreni je
velky, transparentni a zarovnany k pravemu hornimu rohu hlavicky. Celkova cena
EEO a pripadny stav vozidla zustavaji ve vlastnim pravem sloupci a nesmi se s
krizkem prekryvat.

Overeni v DEV 2026-08-24: vozidlo se SPZ `6SF 8593` a volacim znakem `ZKL 411`
ma dle stejnych pravidel `10` EEO servisnich objednavek. Drive prazdny detail
byl zpusoben tim, ze klikaci akce nacitala lokalni V2 servisni zaznamy misto EEO.

## Datovy model

Vsechny nove vazby karty pouzivaji `vehicle_id`, tj. `vehicles_cars_list_v2.id`.
SPZ neni primarni klic pro nove vazby a nesmi byt pouzita jako jediny identifikator.
`legacy_carid` je identifikator z WebDispecinku pro synchronizaci a kompatibilitu.

| Tabulka | Uloha | Vazba |
|---|---|---|
| `vehicles_cars_list_v2` | hlavni identita vozidla, WD data | `id` je `vehicle_id`; unikatni `legacy_carid`, `spz` |
| `vehicles_detail_cards` | jeden scalar detail na vozidlo | unikatni `vehicle_id` |
| `vehicles_card_audit_v2` | audit zmen | `vehicle_id`, autor, zdroj, cas, stare/nove hodnoty |
| `vehicles_card_attachments_v2` | prilohy a soft-delete | `vehicle_id`, `deleted_at` |
| `vehicles_service_records_v2` | servisni zaznamy | `vehicle_id`, `deleted_at` |
| `vehicles_vehicle_equipment_v2` | vybava a revize | `vehicle_id`, `deleted_at` |
| `vehicles_insurance_policies_v2` | pojistne smlouvy | `vehicle_id`, `deleted_at` |
| `vehicles_claims_v2` | skodni udalosti | `vehicle_id`, volitelne `insurance_policy_id` |
| `vehicles_vehicle_tires_v2` | sady pneumatik | `vehicle_id`, `deleted_at` |
| `vehicles_vehicle_funding_v2` | dotace a financovani | `vehicle_id`, `deleted_at` |
| `vehicles_lookups_v2` | katalogy hodnot | stabilni vazba `category + code` |
| `vehicles_identity_aliases_v2` | historie/aliasy identity | pomocna vazba pro SPZ |

### Prilohy a nazvy souboru

Upload uklada puvodni UTF-8 nazev do `original_filename`, ale fyzicky soubor ma
jen serverem generovany ASCII `storage_key` ve tvaru `vehicle_id/hex.ext`.
Diakritika v nazvu proto neovlivnuje cestu ani zapis na disk. Download pouziva
`Content-Disposition` s ASCII fallbackem a `filename*=UTF-8''...`, aby prohlizec
spravne obnovil puvodni nazev s diakritikou.

Uloziste je povinne konfigurovane jen pres `VEHICLES_V2_ATTACHMENT_ROOT` v
`apps/vehicles/api/vehicle/v2.0/.env`. Hodnota musi byt absolutni zapisovatelna
cesta mimo verejny web root. Engine nema fallback cestu zadanou v kodu;
`apps/vehicles/api/vehicle/v2.0/.env.example` dokumentuje nutnou promennou.
PHP-FPM uzivatel (`www-data`) musi mit pravo do rootu vstoupit, cist marker a
vytvaret soubory. Runtime guard kontroluje zapisovatelnost pod timto uzivatelem;
shell test jako root neni dostatecny.

Priloha muze patrit obecne ke karte (`context_module=vehicle`) nebo ke
konkretnimu zaznamu v modulu `service`, `equipment`, `insurance`, `tires` ci
`funding`. Upload panel je viditelny pouze uvnitr editoru zaznamu;
obsahuje dropzonu a typ dokumentu z ciselniku. Pri zakladani noveho zaznamu lze
prilohy vlozit do fronty jeste pred prvnim ulozenim; po vytvoreni zaznamu se
automaticky nahraji pod jeho ID a pri chybe ve fronte zustanou. Server overuje,
ze navazany zaznam patri ke stejnemu vozidlu. Centralni modul Prilohy zobrazuje
zdroj modulu a detail prilozenho zaznamu v pravem panelu.

Pri zalozeni noveho zaznamu ma uzivatel jen hlavni akci `Ulozit`: ta ulozi
zaznam i pripadne vybranou prilohu. Uploader pri novem zaznamu nema samostatne
tlacitko pro pridani prilohy; samostatny upload je dostupny az pri editaci uz
ulozeneho zaznamu.

Fronta priloh pri zakladani zaznamu je drzena v rodici modulu pres `queueRef`
prop, aby prezila remount upload komponenty behem ukladani. Uploader sam o sobe
neprovadi SQL zapis; pouziva pouze imperative handle `validatePending()` a
`uploadQueued(recordId)`. Rodic ovlada faze ukladani pres `submitPhase` state
(`'record'` -> `'attachments'`) s loading gate; formularne tlacitko je disabled
po celou dobu a zobrazuje aktualni fazi. Po dokonceni uploadu se fronta vymaze
a formular se zavre.

Seznam priloh u ulozeneho zaznamu zobrazuje nazev souboru, cesky nazev typu
dokumentu z ciselniku `document_type` a ikonova tlacitka pro download (sipka
dolu) a smazani (kos). Tlacitka pouzivaji tridu `btn btn-ghost btn-sm` pro
jednotny styl se vsemi ikonovymi akcemi v aplikaci a automaticky podporuji
svetly/tmavy rezim pres CSS promenne `--surface`, `--border` a `--ink`. Typ
dokumentu je prelozeny pomoci `lookupLabel()` utility z `moduleUtils.js`.

### Audit modulu

Update servisnich zaznamu, vybaveni, pojisteni, skod, pneumatik a financovani
porovnava skutecna pole pred zapisem. Pokud se zadna hodnota nezmenila, neprovede
SQL update ani nevytvori auditni udalost. Pri skutecne zmene audit uklada pouze
zmenena pole jako JSON pred/po; historie je zobrazuje lidsky a preklada kody
ciselniku pomoci aktivnich lookupu. Stare udalosti, ktere obsahuji pouze stejne
ID (`2 -> 2`), se zobrazi jako `Bez vecne zmeny`.

No-op overeni v DEV pro vybaveni `#2`: audit `equipment_updated` zustal `3 -> 3`.
Transakcni overeni skutecne zmeny vytvorilo jen pole `equipment_name` s hodnotami
pred/po a bylo rollbacknuto; zadna testovaci zmena ani auditni radek v DEV nezustal.
Create audit modulu uklada pocatecni snapshot relevantnich poli; overeni vybaveni
obsahovalo `equipment_type_code=lupus` a `inventory_number=INV-PROBE` a bylo
rollbacknuto. Starsi create audity, ktere obsahovaly jen interne ID, nelze
bezpecne zpetne doplnit z aktualniho stavu a jsou oznaceny jako historicky detail
nedostupny.

Migrace kontextu: `apps/vehicles/database/migrations/20260824_v2_attachment_context.sql`.
Pred aplikaci byl vytvoren DEV dump
`backups/dev-db/vehicles-zzs-dev_20260824_082052_before_attachment_context.sql.gz`.

### Audit konfigurace

Overeno 2026-08-24: lookupove a domenni hodnoty karty jsou vedene v DB
ciselnikach nebo validovane v kodu; nemaji se plosne presouvat do `.env`.
Attachment root je povinne v `.env` a nema hardcoded fallback.

K rozhodnuti pred dalsim refaktorem zustavaji externi a provozni hodnoty:

- WSDL endpoint WebDispecinku je natvrdo ve `WebDispecinkClientV2.php`.
- Debug synchronizace zapisuje do pevne cesty `/tmp/vehicles-sync-debug.log` ve
  `VehicleService.php` a `VehicleController.php`; zapisuje i request body a trace.
- Backend ma fallbacky pro DB, API a frontend base path; DEV `.env` nema
  `VEHICLES_V2_FRONTEND_BASE_PATH`.
- Frontend ma fallback V2 API cesty v `apiClient.js`; `.env.local` ji sice
  nastavuje, ale fallback muze pri chybne konfiguraci maskovat problem.
- Limit velikosti prilohy a MIME allowlist jsou bezpecnostni politika v kodu;
  pripadne presunuti do konfigurace ma mit striktne validovany format.

### Editace uzivatelu

telefon pouziva `autocomplete=tel` a backend pripousti jen cislice, mezeru,
`+`, zavorky, tecku a pomlcku. Heslo v editaci pouziva `autocomplete=new-password`;
prazdne pole nemeni hash a maskovany vstup slozeny z hvezdicek je odmitnut.

Administrativni create, update a delete se zapisuji do `vehicles_user_audit_v2`
vcetne aktera, cile, typu udalosti a seznamu zmenenych poli. Hesla ani jejich
hashe se do auditu neukladaji; samoobsluzna zmena hesla zapisuje jen
`password_changed`. Migrace: `20260824_v2_user_audit.sql`; DEV dump pred migraci:
`vehicles-zzs-dev_20260824_091215_before_user_audit.sql.gz`.

### Hlavni scalar pole

`vehicles_detail_cards` obsahuje mimo jine: `evidencni_cislo_zzs`, `vin`,
`zzs_typ`, `w_popis`, `service_context_json`, `service_notes`,
`technical_notes`, `insurance_policy`, `stk_valid_to`, `emission_valid_to`,
`acquisition_year`, `acquisition_supplier`, `warranty_valid_to`,
`acquisition_price`, `technical_condition_code`, `service_interval_km`,
`service_interval_months`, `battery_condition_code`,
`vehicle_lifetime_percent` a `in_service_from`.

`vehicles_cars_list_v2` drzi synchronizovanou identitu a provozni data,
zejmena `legacy_carid`, `spz`, `status`, vyrobce, model, palivo, skupinu,
CCS udaje a `last_update`.

Hlavicka detailu vozidla zobrazuje read-only WD widgety `Cislo CCS karty` a
`Platnost CCS karty`. Zdroj jsou `vehicles_cars_list_v2.ccs_card_number` a
`vehicles_cars_list_v2.ccs_card_expiration`; detailovy SELECT je vraci jako
`ccs_card_number` a `ccs_card_expiration`. Nevyplnena platnost se zobrazi jako
`-`.

### Servisy a opravy: zdroj stanice a snapshot

Od 2026-08-24 modul `Servisy a opravy` nepouziva ciselnik
`service_station`. Nabizi pouze zaznamy ze `vehicles_station_addresses_v2`,
kde `typ = Servis`; zaznamy `typ = VS` jsou vylouceny ve FE i serverovou
validaci.

Vybrany servis se do `vehicles_service_records_v2` uklada jako snapshot bez
vazby na ID stanoviste: `service_organization`, `service_station_name`,
`service_city`, `service_street`, `service_postal_code`. Ikona vedle roletky
`Servis` otevre dialog odpovidajici formulari seznamu stanovist; typ je v nem
pevne `Servis`. Po ulozeni se novy servis ihned vytvori v seznamu stanovist a
automaticky vybere pro editovany servisni zaznam.

Migrace: `apps/vehicles/database/migrations/20260824_v2_service_station_snapshots.sql`.
Pred jejim aplikovanim byl vytvoren DEV dump
`backups/dev-db/vehicles-zzs-dev_20260824_072013_before_service_station_snapshots.sql.gz`.

### Nazvy kategorii ciselniku

Tabulka `vehicles_lookups_v2` obsahuje vedle technickeho klice `category` take
pole `category_name` pro zobrazovany nazev kategorie. Migrace
`apps/vehicles/database/migrations/20260824_v2_lookup_category_names.sql`
naplnila existujici kategorie a v DEV bylo overeno, ze vsech 130 polozek ma
vyplneny nazev kategorie. Pri ulozeni polozky se nazev aktualizuje u cele
kategorie, aby vsechny jeji polozky pouzivaly stejny zobrazovany nazev.

Uzivatel muze upravovat pouze nazev aktualne vybrane programove definovane
kategorie a pridavat nebo upravovat jeji polozky. Novou kategorii z aplikace
vytvorit nelze. Systemovy klic kategorie je v editoru pouze disabled informacni
pole.

Pred migraci byl vytvoren DEV dump
`backups/dev-db/vehicles-zzs-dev_20260824_111707_before_lookup_category_names.sql.gz`.

### Ciselnik druhu servisniho ukonu

Pole `service_kind_code` pouziva ciselnik `service_kind` v
`vehicles_lookups_v2`. Aktivni DEV katalog obsahuje stabilni puvodni kody
`repair`, `maintenance`, `inspection` a rozsireni `technical_inspection`,
`emissions_inspection`, `warranty_inspection`, `diagnostics`, `oil_service`,
`tire_service`, `bodywork`, `electrical_service`, `seasonal_preparation` a
`other`.

Rozsireni je v migraci
`apps/vehicles/database/migrations/20260824_v2_service_kind_lookups.sql` a bylo
aplikovano do DEV po vytvoreni dumpu
`backups/dev-db/vehicles-zzs-dev_20260824_073810_before_service_kind_lookups.sql.gz`.

### Ciselnik typu vybaveni

Pole `equipment_type_code` pouziva ciselnik `equipment_type`. Rozsireni v
`apps/vehicles/database/migrations/20260824_v2_equipment_type_lookups.sql`
pridava `sim_card`, `navigation_tablet`, `medical_documentation_tablet`,
`printer`, `router` a `stretcher` (Nositka). Posledni doplneni Nositek bylo
aplikovano do DEV po vytvoreni dumpu
`backups/dev-db/vehicles-zzs-dev_20260824_075127_before_stretcher_equipment_lookup.sql.gz`.

Typ vybaveni `lupus` (Zarizeni LUPUS) byl doplnen do DEV ciselniku s poradim
155 po vytvoreni dumpu
`backups/dev-db/vehicles-zzs-dev_20260824_094241_before_lupus_equipment_lookup.sql.gz`.

Stav vybaveni se stabilnim kodem `equipment_status.service` ma uzivatelsky
nazev `V oprave`; kod se nezmenil, aby zustal platny pro existujici zaznamy.
Zmena je v migraci
`apps/vehicles/database/migrations/20260824_v2_equipment_status_label.sql` a
byla aplikovana do DEV po vytvoreni dumpu
`backups/dev-db/vehicles-zzs-dev_20260824_075234_before_equipment_status_label.sql.gz`.

### Dotace a financovani

`vehicles_vehicle_funding_v2` obsahuje stav, dotacni titul a vyzvu,
poskytovatele, referenci, datum priznani, zpusobile vydaje, dotaci, vlastni
podil, menu, obdobi udrzitelnosti a poznamku. V DEV je 74 aktivnich zaznamu z
`legacy_read_migration`; aktualne obsahuji jen stav `awarded`. Formular umoznuje
doplnit vsechna dostupna pole a prehled zobrazuje titul/vyzvu, referenci, vsechny
financni castky a cele obdobi udrzitelnosti.

### Ciselnik typu vybaveni

Pole `equipment_type_code` pouziva ciselnik `equipment_type` v
`vehicles_lookups_v2`. Dne 2026-08-24 byly doplneny aktivni hodnoty `sim_card`,
`navigation_tablet`, `medical_documentation_tablet`, `printer` a `router` pro
SIM kartu, navigacni tablet, tablet ZD, tiskarnu a router.

Rozsireni je v migraci
`apps/vehicles/database/migrations/20260824_v2_equipment_type_lookups.sql` a
bylo aplikovano do DEV po vytvoreni dumpu
`backups/dev-db/vehicles-zzs-dev_20260824_074959_before_equipment_type_lookups.sql.gz`.

## Zdroje dat a pravidla

| Zdroj | Pravidlo |
|---|---|
| WebDispecink | synchronizovana identita/provozni data; ve FE zobrazena jako read-only s badgem `WD` |
| Manualni editace | scalar data karty a zaznamy modulu, podle role |
| Ciselnik | aplikace uklada stabilni `category + code` a zobrazovaci `category_name`, nikdy business vazbu na lookup `id` |
| EEO | pouze read-only servisni historie; repository spojuje objednavky z `eeo2025.25a_objednavky` s vozidlem podle SPZ jako kompatibilni fallback |
| Audit | kazda zmena karty/modulu musi zanechat auditni stopu |

EEO vazba podle SPZ je textove parovani a nema byt rozsirovana jako zaklad noveho
datoveho modelu. Pro nove integrace preferovat `vehicle_id` nebo `legacy_carid`.

## Povinne kontroly pred zmenou

1. Potvrdit aktivni branch a `git status`; nerevertovat cizi zmeny.
2. Overit konkretni tabulku a sloupce v DEV pres `information_schema` nebo `DESCRIBE`.
3. Overit, zda uz pro tabulku existuje konstanta v `VehicleRepository.php`.
4. U novych SQL hodnot pouzit prepared statements a MariaDB-kompatibilni syntaxi.
5. Pred jakoukoli DB migraci vytvorit novy full DEV dump do `backups/dev-db/`.
6. Produkce neni soucasti teto etapy.

## Opakovatelne read-only overeni

Nasledujici prikazy nementeji data a nesmi vypisovat tajne hodnoty:

```bash
cd /var/www/erdms-dev

# Frontendovy build a lint
cd apps/vehicles/frontend-v2
npm run lint
npm run build

# PHP syntax hlavniho backendoveho toku
cd /var/www/erdms-dev
php -l apps/vehicles/api/vehicle/v2.0/src/Controller/VehicleController.php
php -l apps/vehicles/api/vehicle/v2.0/src/Service/VehicleService.php
php -l apps/vehicles/api/vehicle/v2.0/src/Repository/VehicleRepository.php
```

Bezpecne overeni databazoveho pripojeni z `.env` musi pouzit pouze
`SELECT DATABASE(), VERSION()` nebo obdobny read-only dotaz. Nikdy nevypisovat
`DB_PASSWORD`, `VEHICLES_V2_DB_PASS`, `EEO_DB_PASS` ani obsah `.env`.

Pro kontrolu schematu doporuceny vzor:

```sql
SELECT column_name, column_type, is_nullable, column_key
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'vehicles_detail_cards'
ORDER BY ordinal_position;
```

## Funkcni smoke checklist

Overovat na DEV, idealne na vybranem testovacim vozidle a s predem dohodnutymi
testovacimi daty. Po zapisovem testu data odstranit nebo vratit podle dohodnuteho
postupu, aby v DEV nezustal neznamy balast.

- Otevrit aktivni, neaktivni a vozidlo bez zaznamu v `vehicles_detail_cards`.
- Zkontrolovat shodu SPZ, data zarazeni, statusu a najezdu s WD zdrojem.
- Overit nacitani ciselniku a zobrazeni jejich `item_name` pri ukladani kodu.
- Overit validaci a ulozeni scalar udaju, nasledne znovunacteni detailu.
- Provest create, edit, delete a zruseni formulare pro servis, vybavu, pojisteni,
  skodu, pneumatiky a financovani.
- Overit upload, download a soft-delete prilohy vcetne metadat a opravneni.
- Overit zaznam v `vehicles_card_audit_v2` po kazde zmenene oblasti.
- Overit read-only roli: bez editacnich akci a jen pro prirazena vozidla.
- Overit responsivni vzhled a svetle/tmave schema karty.
- Overit, ze bezny runtime V2 nepouziva legacy API pro servisni moduly.

## Dalsi referencni podklady

- `apps/vehicles/podklady/EVKARTA_FIELD_MATRIX.md`: puvodni navrh poli a zdroju.
- `apps/vehicles/podklady/EVKARTA_MODULE_FIELDS_AUDIT.md`: pole jednotlivych
  modulu a jejich FE/BE mapovani.
- `apps/vehicles/podklady/EVKARTA_IMPLEMENTATION_PROGRESS.md`: historicky stav
  implementace a seznam finalnich UI/API testu.

Tyto dokumenty obsahuji historicke zaznamy. Pro aktualni branch, schema, pristup
k DB a konkretni chovani ma prednost tento dokument a aktualne overeny zdrojovy kod.