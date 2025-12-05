# DOCX API Structure Update - 22. října 2025

## 📋 Souhrn změn

Backend vrátil **skutečnou strukturu dat** z endpointu `POST /api.eeo/sablona_docx/order-data`, která se liší od původní specifikace.

## 🔄 Změny v BE Response

### ✅ NOVĚ PŘIDANÁ POLE

1. **`prikazce` (objekt)** - úplně nový vnořený objekt
   ```json
   "prikazce": {
     "username": "pavel.prikazce",
     "titul_pred": "Bc.",
     "jmeno": "Pavel",
     "prijmeni": "Příkazce",
     "titul_za": "",
     "email": "pavel.prikazce@firma.cz",
     "telefon": "+420 444 555 666",
     "plne_jmeno": "Bc. Pavel Příkazce"
   }
   ```

2. **`stav.workflow_kod`** - kód workflow stavu
   ```json
   "stav": {
     "workflow_kod": "ODESLANO_DODAVATELI",  // ← NOVÉ!
     "nazev": "Odesláno dodavateli",
     "popis": "",
     "barva": "",
     "poradi": ""
   }
   ```

3. **`dt_zverejneni`** - datetime zveřejnění (kromě `datum_zverejneni`)
   ```json
   "datum_zverejneni": "2025-01-20",           // date
   "dt_zverejneni": "2025-01-20 12:00:00"      // datetime ← NOVÉ!
   ```

### ❌ CHYBĚJÍCÍ POLE Z PŮVODNÍ SPEC

- **`lokalita`** - objekt lokality není v response (pravděpodobně volitelné pole)

## 🛠️ Provedené úpravy

### 1. `docxProcessor.js` - getOrderFieldsForMapping()

**Přidáno:**
- Nová skupina `Příkazce` se všemi poli (username, jmeno, prijmeni, email, atd.)
- Pole `stav.workflow_kod` do skupiny `Stav`
- Pole `dt_zverejneni` do skupiny `Stavy`

### 2. `docxProcessor.js` - mapOrderToDocxFields()

**Přidáno:**
```javascript
// === PŘÍKAZCE (vnořený objekt) - NOVÉ! ===
if (orderData.prikazce) {
  const prikazce = orderData.prikazce;
  mappedData['prikazce.username'] = prikazce.username || '';
  mappedData['prikazce.titul_pred'] = prikazce.titul_pred || '';
  // ... všechna ostatní pole
  mappedData['prikazce.plne_jmeno'] = prikazce.plne_jmeno || '';
  
  // SLOUČENÁ POLE
  mappedData['prikazce.jmeno_prijmeni'] = `${prikazce.jmeno || ''} ${prikazce.prijmeni || ''}`.trim();
  mappedData['prikazce.kontakt'] = [prikazce.email, prikazce.telefon].filter(x => x).join(', ');
}
```

**Upraveno:**
```javascript
// === STAV - přidáno workflow_kod ===
if (orderData.stav) {
  mappedData['stav.workflow_kod'] = orderData.stav.workflow_kod || '';  // ← NOVÉ!
  mappedData['stav.nazev'] = orderData.stav.nazev || '';
  // ...
}

// === ZÁKLADNÍ POLE - přidáno dt_zverejneni ===
mappedData['dt_zverejneni'] = orderData.dt_zverejneni || '';  // ← NOVÉ!
```

## 📊 Kompletní struktura BE Response

### Top-level skalární pole (38 polí)
- `cislo_objednavky`, `datum_objednavky`, `nazev_objednavky`, `predmet`, `popis`, `poznamka`
- `max_cena_s_dph`, `misto_dodani`, `dt_vytvoreno`, `strediska`, `zdroj_financovani`
- `druh_objednavky`, `datum_schvaleni`, `predpokladany_termin_dodani`, `zaruka`
- `stav_odeslano`, `datum_odeslani`, `potvrzeno_dodavatelem`, `datum_akceptace`
- `potvrzeni_email`, `potvrzeni_telefon`, `potvrzeni_podepsany_form`, `potvrzeni_eshop`
- `platba_faktura`, `platba_pokladna`, `zverejnit_registr_smluv`
- `datum_zverejneni`, **`dt_zverejneni`** ← NOVÉ!
- `registr_iddt`, `stav_komentar`, `dt_aktualizace`
- `celkova_cena_bez_dph`, `celkova_cena_s_dph`, `pocet_polozek`, `pocet_priloh`

### Vnořené objekty (6 objektů)
1. **`objednatel`** (8 polí)
2. **`garant`** (8 polí)
3. **`created_by`** (8 polí)
4. **`schvalil`** (8 polí)
5. **`prikazce`** (8 polí) ← NOVÉ!
6. **`dodavatel`** (8 polí)
7. **`stav`** (5 polí, včetně nového `workflow_kod`)

### Pole (arrays)
- **`polozky`** - pole objektů položek (poradi, popis, cena_bez_dph, dph_sazba, cena_s_dph)
- **`prilohy`** - pole objektů příloh (nazev_souboru, puvodni_nazev, velikost, typ_prilohy, dt_pridani, nahrano_uzivatel)

## 🎯 Doporučení pro DOCX šablony

### Typické mapování polí:

**Příkazce (NOVÝ!):**
```
DOCX: PRIKAZCE_JMENO      → DB: prikazce.plne_jmeno
DOCX: PRIKAZCE_EMAIL      → DB: prikazce.email
DOCX: PRIKAZCE_TELEFON    → DB: prikazce.telefon
```

**Stav s workflow kódem:**
```
DOCX: STAV                → DB: stav.nazev
DOCX: STAV_KOD            → DB: stav.workflow_kod  (← NOVÉ!)
```

**Datum zveřejnění:**
```
DOCX: DATUM_ZVEREJNENI    → DB: datum_zverejneni      (pouze datum)
DOCX: DT_ZVEREJNENI       → DB: dt_zverejneni         (datum + čas)
```

## 🔍 Jupyter Notebook Analýza

Vytvořen soubor **`DOCX-Order-Data-API-Structure.ipynb`** obsahující:
- Ukázkovou BE response
- Analýzu všech polí po kategoriích
- Kompletní seznam dostupných field paths
- Doporučení pro mapování

## ✅ Ověření

```bash
# Zkontrolováno bez chyb:
get_errors() → No errors found
```

## 📝 Poznámky

1. **Lokalita chybí** - pokud backend nepošle objekt `lokalita`, nepřidávám jej do mapování
2. **Všechna pole jsou volitelná** - mapování používá `|| ''` pro prázdné hodnoty
3. **Fallback systém zachován** - pro starší API response stále funguje fallback na ploché pole
4. **Sloučená pole vytvořena** - pro každý objekt (včetně `prikazce`) jsou dostupná pole `jmeno_prijmeni` a `kontakt`

## 🎯 Další kroky

1. **Otestovat v UI** - Nahrát DOCX šablonu s poli `PRIKAZCE_JMENO`, `STAV_KOD`, atd.
2. **Namapovat nová pole** - V číselníku DOCX šablon namapovat nová pole na DB strukturu
3. **Vygenerovat DOCX** - Ověřit že nová pole se správně vyplňují

---

**Datum aktualizace:** 22. října 2025  
**Odpovědná osoba:** GitHub Copilot  
**Soubory upraveny:**
- `src/utils/docx/docxProcessor.js`
- `DOCX-Order-Data-API-Structure.ipynb` (nový)
- `docs/DOCX-API-STRUCTURE-UPDATE.md` (nový)
