# DOCX Template Mapping - Aktualizace pro Enriched Endpoint

## 🎯 Účel
Aktualizace mappingu šablony "Objednávka do 50 tis. Kč (2025a)" (ID: 26) pro použití s novým enriched endpointem.

---

## ❌ STARÝ MAPPING (NEFUNKČNÍ s enriched endpointem)

```json
{
  "CENA_BEZDPH": "celkova_cena_bez_dph",
  "CENA_SDPH": "celkova_cena_s_dph",
  "DADRESA": "dodavatel_adresa",
  "DDIC": "dodavatel_dic",
  "DICO": "dodavatel_ico",
  "DEMAIL": "dodavatel_kontakt_email",
  "DJMENO": "dodavatel_kontakt_jmeno",
  "DNAZEV": "dodavatel_nazev",
  "DTELEFON": "dodavatel_kontakt_telefon",
  "DZASTUP": "dodavatel_zastoupeny",
  "obj_C": "cislo_objednavky",
  "OJMENO": "objednatel.plne_jmeno",
  "OTELEFON": "objednatel.telefon",
  "OEMAIL": "objednatel.email",
  "POBJEDNATEL": "vypocitane.vybrany_uzivatel_cele_jmeno",
  "PDODAVATEL": "dodavatel_kontakt_jmeno",
  "PODEPSANO_KDE": "objednatel.lokalita.nazev",
  "PREDMET_OBJ": "predmet",
  "zar_doba": "zaruka",
  "DPH": "vypocitane.vypoctene_dph",
  "DODANI_TERMIN": "dt_predpokladany_termin_dodani",
  "DODANI_MISTO": "misto_dodani",
  "DATUM_PODPISU": "vypocitane.datum_generovani"
}
```

---

## ✅ NOVÝ MAPPING (FUNKČNÍ s enriched endpointem)

```json
{
  "CENA_BEZDPH": "vypocitane.celkova_cena_bez_dph",
  "CENA_SDPH": "vypocitane.celkova_cena_s_dph",
  "DADRESA": "dodavatel_adresa",
  "DDIC": "dodavatel_dic",
  "DICO": "dodavatel_ico",
  "DEMAIL": "dodavatel_kontakt_email",
  "DJMENO": "dodavatel_kontakt_jmeno",
  "DNAZEV": "dodavatel_nazev",
  "DTELEFON": "dodavatel_kontakt_telefon",
  "DZASTUP": "dodavatel_zastoupeny",
  "obj_C": "cislo_objednavky",
  "OJMENO": "uzivatel.cele_jmeno",
  "OTELEFON": "uzivatel.telefon",
  "OEMAIL": "uzivatel.email",
  "POBJEDNATEL": "vypocitane.vybrany_uzivatel_cele_jmeno",
  "PDODAVATEL": "dodavatel_kontakt_jmeno",
  "PODEPSANO_KDE": "uzivatel.lokalita.nazev",
  "PREDMET_OBJ": "predmet",
  "zar_doba": "zaruka",
  "DPH": "vypocitane.vypoctene_dph",
  "DODANI_TERMIN": "dt_predpokladany_termin_dodani",
  "DODANI_MISTO": "misto_dodani",
  "DATUM_PODPISU": "vypocitane.datum_generovani"
}
```

---

## 🔧 CO SE ZMĚNILO

| DOCX Pole | Starý mapping | Nový mapping | Důvod |
|-----------|---------------|--------------|-------|
| `CENA_BEZDPH` | `celkova_cena_bez_dph` | `vypocitane.celkova_cena_bez_dph` | Ceny jsou v objektu `vypocitane` |
| `CENA_SDPH` | `celkova_cena_s_dph` | `vypocitane.celkova_cena_s_dph` | Ceny jsou v objektu `vypocitane` |
| `OJMENO` | `objednatel.plne_jmeno` | `uzivatel.cele_jmeno` | Enriched endpoint používá `uzivatel`, ne `objednatel` |
| `OTELEFON` | `objednatel.telefon` | `uzivatel.telefon` | Enriched endpoint používá `uzivatel` |
| `OEMAIL` | `objednatel.email` | `uzivatel.email` | Enriched endpoint používá `uzivatel` |
| `PODEPSANO_KDE` | `objednatel.lokalita.nazev` | `uzivatel.lokalita.nazev` | Enriched endpoint používá `uzivatel` |

---

## 📝 SQL UPDATE PRO ŠABLONU

```sql
-- Aktualizace mappingu pro šablonu ID 26
UPDATE 25_docx_sablony 
SET mapovani_json = '{
  "CENA_BEZDPH": "vypocitane.celkova_cena_bez_dph",
  "CENA_SDPH": "vypocitane.celkova_cena_s_dph",
  "DADRESA": "dodavatel_adresa",
  "DDIC": "dodavatel_dic",
  "DICO": "dodavatel_ico",
  "DEMAIL": "dodavatel_kontakt_email",
  "DJMENO": "dodavatel_kontakt_jmeno",
  "DNAZEV": "dodavatel_nazev",
  "DTELEFON": "dodavatel_kontakt_telefon",
  "DZASTUP": "dodavatel_zastoupeny",
  "obj_C": "cislo_objednavky",
  "OJMENO": "uzivatel.cele_jmeno",
  "OTELEFON": "uzivatel.telefon",
  "OEMAIL": "uzivatel.email",
  "POBJEDNATEL": "vypocitane.vybrany_uzivatel_cele_jmeno",
  "PDODAVATEL": "dodavatel_kontakt_jmeno",
  "PODEPSANO_KDE": "uzivatel.lokalita.nazev",
  "PREDMET_OBJ": "predmet",
  "zar_doba": "zaruka",
  "DPH": "vypocitane.vypoctene_dph",
  "DODANI_TERMIN": "dt_predpokladany_termin_dodani",
  "DODANI_MISTO": "misto_dodani",
  "DATUM_PODPISU": "vypocitane.datum_generovani"
}'
WHERE id = 26;
```

---

## 🎯 ROZŠÍŘENÝ MAPPING - Všechna dostupná pole z enriched endpointu

Pro referenci - zde je kompletní seznam všech polí, která můžete použít v mappingu:

### Základní data objednávky
```
id
cislo_objednavky
dt_objednavky
predmet
max_cena_s_dph
poznamka
strediska_kod
financovani.typ
druh_objednavky_kod
stav_workflow_kod
dt_predpokladany_termin_dodani
misto_dodani
zaruka
```

### Enriched uživatelé (každý má tuto strukturu)
```
garant_uzivatel.cele_jmeno
garant_uzivatel.jmeno
garant_uzivatel.prijmeni
garant_uzivatel.titul_pred
garant_uzivatel.titul_za
garant_uzivatel.email
garant_uzivatel.telefon
garant_uzivatel.lokalita.nazev
garant_uzivatel.lokalita.kod

prikazce_uzivatel.cele_jmeno
prikazce_uzivatel.jmeno
prikazce_uzivatel.prijmeni
prikazce_uzivatel.titul_pred
prikazce_uzivatel.titul_za
prikazce_uzivatel.email
prikazce_uzivatel.telefon
prikazce_uzivatel.lokalita.nazev

schvalovatel.cele_jmeno
schvalovatel.jmeno
schvalovatel.prijmeni
schvalovatel.titul_pred
schvalovatel.titul_za
schvalovatel.email
schvalovatel.telefon
schvalovatel.lokalita.nazev

uzivatel.cele_jmeno (OBJEDNATEL)
uzivatel.jmeno
uzivatel.prijmeni
uzivatel.titul_pred
uzivatel.titul_za
uzivatel.email
uzivatel.telefon
uzivatel.lokalita.nazev

odesilatel.cele_jmeno
odesilatel.jmeno
odesilatel.prijmeni
odesilatel.titul_pred
odesilatel.titul_za
odesilatel.email
odesilatel.telefon
odesilatel.lokalita.nazev

fakturant.cele_jmeno
fakturant.jmeno
fakturant.prijmeni
fakturant.email
fakturant.telefon
```

### Dodavatel
```
dodavatel_nazev
dodavatel_adresa
dodavatel_ico
dodavatel_dic
dodavatel_zastoupeny
dodavatel_kontakt_jmeno
dodavatel_kontakt_email
dodavatel_kontakt_telefon
```

### Vypočítané hodnoty
```
vypocitane.celkova_cena_bez_dph
vypocitane.celkova_cena_s_dph
vypocitane.vypoctene_dph
vypocitane.celkova_cena_bez_dph_kc  (formátováno s "Kč")
vypocitane.celkova_cena_s_dph_kc    (formátováno s "Kč")
vypocitane.vypoctene_dph_kc         (formátováno s "Kč")

vypocitane.pocet_polozek
vypocitane.pocet_priloh

vypocitane.datum_generovani
vypocitane.cas_generovani
vypocitane.datum_cas_generovani

vypocitane.garant_jmeno_prijmeni
vypocitane.garant_prijmeni_jmeno
vypocitane.garant_cele_jmeno_s_tituly
vypocitane.garant_jmeno
vypocitane.garant_prijmeni

vypocitane.prikazce_jmeno_prijmeni
vypocitane.prikazce_prijmeni_jmeno
vypocitane.prikazce_cele_jmeno_s_tituly
vypocitane.prikazce_jmeno
vypocitane.prikazce_prijmeni

vypocitane.schvalovatel_jmeno_prijmeni
vypocitane.schvalovatel_prijmeni_jmeno
vypocitane.schvalovatel_cele_jmeno_s_tituly

vypocitane.objednatel_jmeno_prijmeni
vypocitane.objednatel_prijmeni_jmeno
vypocitane.objednatel_cele_jmeno

vypocitane.odesilatel_jmeno_prijmeni
vypocitane.odesilatel_prijmeni_jmeno
vypocitane.odesilatel_cele_jmeno

vypocitane.vybrany_uzivatel_cele_jmeno
vypocitane.vybrany_uzivatel_role
vypocitane.vybrany_uzivatel_lokalita
```

### Položky objednávky (array)
```
polozky[0].nazev
polozky[0].mnozstvi
polozky[0].mj
polozky[0].cena_bez_dph
polozky[0].cena_s_dph
polozky[0].sazba_dph
polozky[0].poznamka
```

### Přílohy (array)
```
prilohy[0].nazev_souboru
prilohy[0].typ_prilohy
prilohy[0].velikost
```

---

## 🚀 JAK AKTUALIZOVAT

### Varianta 1: SQL Update (doporučeno)
Spusťte SQL příkaz výše v databázi.

### Varianta 2: Přes GUI
1. Otevřete administraci DOCX šablon
2. Upravte šablonu ID 26
3. Nahraďte `mapovani_json` novým JSON

### Varianta 3: Export/Import
1. Exportujte šablonu
2. Upravte JSON v souboru
3. Importujte zpět

---

## ✅ PO AKTUALIZACI

Po aktualizaci mappingu by VŠECHNA pole měla být vyplněna správně:

```
✅ CENA_BEZDPH → "8 264.46"
✅ CENA_SDPH → "10 000.00"
✅ OJMENO → "Anna Nováková" (nebo kdo je objednatel)
✅ OEMAIL → "anna.novakova@firma.cz"
✅ OTELEFON → "+420 444 555 666"
✅ PODEPSANO_KDE → "Praha"
✅ DPH → "1 735.54"
✅ POBJEDNATEL → "Hana Sochůrková" (vybraný uživatel)
```

---

## 📊 TESTOVÁNÍ

Po update mappingu otestujte:

1. Vygenerovat DOCX pro objednávku 11306
2. Zkontrolovat, že všechna pole jsou vyplněna
3. Ověřit formátování cen (mezery jako tisícový oddělovač)
4. Zkontrolovat, že vybraný uživatel je správně dosazen

---

## 🔄 MIGRACE VŠECH ŠABLON

Pokud máte více šablon, je třeba aktualizovat mapping ve VŠECH:

```sql
-- Najdi všechny šablony, které používají starý mapping
SELECT id, nazev, mapovani_json 
FROM 25_docx_sablony 
WHERE mapovani_json LIKE '%objednatel.plne_jmeno%'
   OR mapovani_json LIKE '%celkova_cena_bez_dph%' AND mapovani_json NOT LIKE '%vypocitane.celkova_cena_bez_dph%';
```

Pro každou nalezenou šablonu proveďte update mappingu podle vzoru výše.
