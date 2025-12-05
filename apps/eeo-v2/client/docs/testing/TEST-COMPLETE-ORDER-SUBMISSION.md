# 🧪 TEST: Kompletní zadání objednávky

**Datum vytvoření:** 29. října 2025  
**Účel:** Komplexní test celého workflow zadání objednávky od začátku do konce  
**Backend:** Používá **původní notifikační systém** (nový systém 42 templates čeká na implementaci)

---

## 📋 Přehled testovacích scénářů

### Scénář 1: ✅ ŠŤASTNÁ CESTA (Happy Path)
**Cíl:** Zadání kompletní objednávky se všemi povinnými i volitelnými poli

### Scénář 2: ⚠️ VALIDACE (Validation Path)
**Cíl:** Ověření validačních pravidel při chybějících nebo neplatných datech

### Scénář 3: 🔄 WORKFLOW (Workflow Path)
**Cíl:** Test průchodu všemi 8 fázemi workflow

### Scénář 4: 💾 ŠABLONY (Templates Path)
**Cíl:** Ukládání a načítání šablon během zadávání objednávky

---

## 🎯 SCÉNÁŘ 1: Kompletní objednávka (Happy Path)

### FÁZE 1: Základní údaje (Nova/Rozpracovaná)

#### 1.1 Otevření formuláře
```javascript
// URL: /orders/new
// Očekávané: Prázdný formulář, currentPhase = 1
```

#### 1.2 Vyplnění základních údajů
```javascript
TEST_DATA_FASE_1 = {
  // Povinná pole
  predmet: "Notebook Lenovo ThinkPad T14 Gen 5",
  garant_uzivatel_id: 5, // Vyber z dropdown
  prikazce_id: 3,         // Vyber z dropdown
  
  // Střediska (multi-select)
  strediska_kod: ["ABC123", "DEF456"],
  
  // Maximální cena
  max_cena_s_dph: 45000,
  
  // Způsob financování
  zpusob_financovani: "LP", // Limitovaný příkaz
  lp_kod: "LP-2025-001234",
  
  // Druh objednávky
  druh_objednavky_kod: "MATERIAL",
  
  // Poznámka objednávky
  poznamka_objednavky: "Náhrada za starý notebook po záruce"
}
```

#### 1.3 Kontrola transformace dat před odesláním
```javascript
// ✅ KONTROLY:
// - strediska_kod → pole objektů [{kod_stavu, nazev_stavu}]
// - zpusob_financovani → JSON objekt {kod_stavu, nazev_stavu, doplnujici_data: {lp_kod}}
// - druh_objednavky_kod → JSON objekt {kod_stavu, nazev_stavu}
// - objednatel_id → automaticky nastaven user_id (pouze při INSERT)
```

#### 1.4 Uložení FÁZE 1
```javascript
// Kliknutí: "Uložit objednávku"
// Očekávané:
// ✅ Validace projde (všechna povinná pole vyplněna)
// ✅ API call: POST /api25orders/create
// ✅ Response: {success: true, data: {id: 123, cislo_objednavky: "OBJ-2025-0123"}}
// ✅ Toast: "Objednávka byla úspěšně vytvořena"
// ✅ Redirect: /orders/edit/123
// ✅ isOrderSavedToDB = true
// ✅ savedOrderId = 123
// ✅ currentPhase = 1 (stále v FÁZI 1, čeká na položky)
// ✅ Workflow: ['ROZPRACOVANA']
```

#### 1.5 Kontrola notifikací (původní systém)
```javascript
// ❓ OTÁZKA PRO BACKEND:
// Je notifikace při vytvoření rozpracované objednávky?
// Pokud ANO:
//   - Kdo: Objednatel (creator)
//   - Typ: order_created_draft
//   - Obsah: "Objednávka OBJ-2025-0123 byla vytvořena v rozpracovaném stavu"
```

---

### FÁZE 2: Položky objednávky

#### 2.1 Přidání položek
```javascript
TEST_DATA_FASE_2 = {
  polozky_objednavky: [
    {
      popis: "Lenovo ThinkPad T14 Gen 5 - AMD Ryzen 7 8840HS, 32GB RAM, 1TB SSD",
      mnozstvi: "1",
      jednotka: "ks",
      cena_bez_dph: 37190.08, // Automatický výpočet
      sazba_dph: 21,
      cena_s_dph: 45000,
      // Lokalizace
      usek_kod: "IT",
      budova_kod: "A",
      mistnost_kod: "201",
      poznamka: "Pro Jana Nováka - výměna staršího zařízení"
    }
  ]
}
```

#### 2.2 Kontrola limitu
```javascript
// ✅ KONTROLY:
// - Součet cen s DPH: 45000 Kč
// - Maximální cena: 45000 Kč
// - Nadlimit: 0 Kč ✅
// - Status indikátor: zelený (v limitu)
```

#### 2.3 Uložení FÁZE 2
```javascript
// Kliknutí: "Uložit objednávku"
// Očekávané:
// ✅ Validace projde (položky vyplněny)
// ✅ API call: PUT /api25orders/update/123
// ✅ orderData.polozky = [...] (pole objektů, NE JSON string)
// ✅ Toast: "Objednávka byla úspěšně aktualizována"
// ✅ currentPhase = 2
// ✅ Workflow: ['ROZPRACOVANA'] (beze změny)
```

---

### FÁZE 3: Dodavatel

#### 3.1 Vyhledání dodavatele v ARES
```javascript
// Zadání IČO: 12345678
// Kliknutí: "Vyhledat v ARES"
// Očekávané:
// ✅ API call: ARES API
// ✅ Automatické vyplnění:
//    - dodavatel_nazev
//    - dodavatel_adresa
//    - dodavatel_ico
//    - dodavatel_dic
```

#### 3.2 Doplnění dodavatelských údajů
```javascript
TEST_DATA_FASE_3 = {
  dodavatel_id: 456, // Pokud je v DB
  dodavatel_nazev: "ALZA.cz a.s.",
  dodavatel_adresa: "Jankovcova 1522/53, 170 00 Praha 7",
  dodavatel_ico: "27082440",
  dodavatel_dic: "CZ27082440",
  dodavatel_zastoupeny: "Mgr. Aleš Zavoral - jednatel",
  
  // Kontaktní osoba dodavatele
  dodavatel_kontakt_jmeno: "Jana Dvořáková",
  dodavatel_kontakt_email: "dvorakova@alza.cz",
  dodavatel_kontakt_telefon: "+420 234 092 111",
  
  // Dodací podmínky
  dt_predpokladany_termin_dodani: "2025-11-15",
  misto_dodani: "ZZS HKK, Sokolská 603, 500 02 Hradec Králové",
  zaruka: "24 měsíců zákonná záruka + 12 měsíců rozšířená záruka výrobce"
}
```

#### 3.3 Uložení FÁZE 3
```javascript
// Kliknutí: "Uložit objednávku"
// Očekávané:
// ✅ API call: PUT /api25orders/update/123
// ✅ Toast: "Objednávka byla úspěšně aktualizována"
// ✅ currentPhase = 3
```

---

### FÁZE 4: Kontaktní údaje objednatele

#### 4.1 Vyplnění kontaktů
```javascript
TEST_DATA_FASE_4 = {
  objednatel_jmeno: "Jan Novák",
  objednatel_email: "jan.novak@zzshk.cz",
  objednatel_telefon: "+420 495 755 111"
}
```

#### 4.2 Uložení FÁZE 4
```javascript
// Kliknutí: "Uložit objednávku"
// Očekávané:
// ✅ API call: PUT /api25orders/update/123
// ✅ currentPhase = 4
```

---

### FÁZE 5: Popis požadavku

#### 5.1 Vyplnění popisu
```javascript
TEST_DATA_FASE_5 = {
  popis_pozadavku: `
Požadavek na nákup nového notebooku pro zaměstnance IT oddělení.

Důvod pořízení:
- Současný notebook (5 let starý) vykazuje častá hardwarová selhání
- Nedostatečný výkon pro současné úkoly (virtualizace, správa serverů)
- Opotřebená baterie (výdrž pouze 30 minut)

Specifikace:
- Business notebook s vysokým výkonem
- Min. 32GB RAM pro virtualizaci
- Min. 1TB SSD
- Dobrá výdrž na baterie (min. 8h)

Výběr modelu:
- ThinkPad T14 Gen 5 splňuje všechny požadavky
- Osvědčená řada pro firemní prostředí
- Dobrá dostupnost náhradních dílů a servisu
  `,
  
  poznamky: "Urgentní pořízení - současný notebook je kriticky nestabilní"
}
```

#### 5.2 Uložení FÁZE 5
```javascript
// Kliknutí: "Uložit objednávku"
// Očekávané:
// ✅ currentPhase = 5
// ✅ Workflow: ['ROZPRACOVANA']
```

---

### FÁZE 6: Přílohy

#### 6.1 Nahrání příloh
```javascript
TEST_DATA_FASE_6 = {
  prilohy: [
    {
      nazev_souboru: "nabidka_alza_thinkpad.pdf",
      velikost: 245678,
      typ: "application/pdf",
      url: "/uploads/orders/123/nabidka_alza_thinkpad.pdf"
    },
    {
      nazev_souboru: "specifikace_thinkpad_t14_gen5.pdf",
      velikost: 512340,
      typ: "application/pdf",
      url: "/uploads/orders/123/specifikace_thinkpad_t14_gen5.pdf"
    }
  ]
}
```

#### 6.2 Uložení FÁZE 6
```javascript
// Kliknutí: "Uložit objednávku"
// Očekávané:
// ✅ prilohy uloženy do DB
// ✅ currentPhase = 6
```

---

### FÁZE 7: Odeslání ke schválení

#### 7.1 Kontrola před odesláním
```javascript
// ✅ KONTROLY:
// [x] Základní údaje vyplněny
// [x] Položky objednávky přidány
// [x] Dodavatel vyplněn
// [x] Kontakty vyplněny
// [x] Popis požadavku vyplněn
// [x] Přílohy nahrány (volitelné)
// [x] Limit respektován
```

#### 7.2 Odeslání ke schválení
```javascript
// Kliknutí: "Odeslat ke schválení"
// Očekávané:
// ✅ Modal: "Opravdu chcete odeslat objednávku ke schválení?"
// ✅ Potvrzení: ANO
// ✅ API call: PUT /api25orders/update/123
// ✅ stav_schvaleni = 'ceka_na_schvaleni'
// ✅ Workflow: ['ROZPRACOVANA', 'ODESLANA_KE_SCHVALENI']
// ✅ Toast: "Objednávka byla odeslána ke schválení"
// ✅ currentPhase = 7 (čeká na schválení)
```

#### 7.3 Kontrola notifikací
```javascript
// ✅ NOTIFIKACE (původní systém):
// Kdo: Garant (schvalovatel)
// Typ: order_pending_approval
// Obsah: "Nová objednávka OBJ-2025-0123 čeká na Vaše schválení"
// Email: ANO ✅
// Priority: normal
```

---

### FÁZE 8: Schválení garanta

#### 8.1 Přihlášení jako garant
```javascript
// Odhlásit se
// Přihlásit jako garant (user_id: 5)
// Navigovat: /orders/edit/123
```

#### 8.2 Kontrola objednávky
```javascript
// Očekávané:
// ✅ Formulář v read-only režimu (garant může pouze schvalovat)
// ✅ Sekce "Schválení objednávky" je viditelná
// ✅ currentPhase = 7 (čeká na schválení)
// ✅ Workflow: ['ROZPRACOVANA', 'ODESLANA_KE_SCHVALENI']
```

#### 8.3 Schválení objednávky
```javascript
// Kliknutí: "Schválit objednávku"
// Očekávané:
// ✅ Modal: "Opravdu chcete schválit tuto objednávku?"
// ✅ Potvrzení: ANO
// ✅ API call: PUT /api25orders/update/123
// ✅ stav_schvaleni = 'schvaleno'
// ✅ dt_schvaleni = "2025-10-29T10:15:00Z"
// ✅ schvalil_id = 5 (garant user_id)
// ✅ schvaleni_komentar = '' (vymazán při schválení)
// ✅ Workflow: ['ROZPRACOVANA', 'ODESLANA_KE_SCHVALENI', 'SCHVALENA']
// ✅ Toast: "Objednávka byla schválena"
// ✅ currentPhase = 8 (schváleno, čeká na odeslání dodavateli)
```

#### 8.4 Kontrola notifikací
```javascript
// ✅ NOTIFIKACE (původní systém):
// Kdo: Objednatel (creator)
// Typ: order_approved
// Obsah: "Vaše objednávka OBJ-2025-0123 byla schválena garantem"
// Email: ANO ✅
// Priority: normal
```

---

### FÁZE 9: Odeslání dodavateli

#### 9.1 Přihlášení zpět jako objednatel
```javascript
// Odhlásit se
// Přihlásit jako původní objednatel
// Navigovat: /orders/edit/123
```

#### 9.2 Odeslání dodavateli
```javascript
// Kliknutí: "Odeslat dodavateli"
// Očekávané:
// ✅ Modal: "Opravdu chcete odeslat objednávku dodavateli?"
// ✅ Potvrzení: ANO
// ✅ API call: PUT /api25orders/update/123
// ✅ dt_odeslani_dodavateli = "2025-10-29T10:30:00Z"
// ✅ Workflow: [..., 'ODESLANA']
// ✅ Toast: "Objednávka byla odeslána dodavateli"
// ✅ currentPhase = 9 (odesláno dodavateli)
```

#### 9.3 Kontrola notifikací
```javascript
// ✅ NOTIFIKACE (původní systém):
// Kdo: Dodavatel (pokud má email)
// Typ: order_sent_to_supplier
// Obsah: "Objednávka OBJ-2025-0123 byla odeslána Vaší společnosti"
// Email: ANO (na dodavatel_kontakt_email) ✅
// Priority: normal
```

---

### FÁZE 10: Potvrzení dodavatelem

#### 10.1 Potvrzení přijetí objednávky
```javascript
// Kliknutí: "Potvrdit přijetí dodavatelem"
// Zadání: datum potvrzení
// Očekávané:
// ✅ Modal: "Zadejte datum potvrzení dodavatelem"
// ✅ Vyplnění: "2025-10-30"
// ✅ Potvrzení: OK
// ✅ API call: PUT /api25orders/update/123
// ✅ dt_potvrzeni_dodavatelem = "2025-10-30"
// ✅ Workflow: [..., 'POTVRZENA']
// ✅ Toast: "Objednávka byla potvrzena dodavatelem"
// ✅ currentPhase = 10 (potvrzeno dodavatelem)
```

#### 10.2 Kontrola notifikací
```javascript
// ✅ NOTIFIKACE (původní systém):
// Kdo: Objednatel, Garant
// Typ: order_confirmed_by_supplier
// Obsah: "Objednávka OBJ-2025-0123 byla potvrzena dodavatelem"
// Email: ANO ✅
// Priority: normal
```

---

### FÁZE 11: Registr smluv (NOVÁ FÁZE)

#### 11.1 Kontrola podmínky zveřejnění
```javascript
// ✅ KONTROLA:
// - Pokud ma_byt_zverejnena = 1 → pokračovat do FÁZE 11
// - Pokud ma_byt_zverejnena = 0 → přeskočit na FÁZI 12 (Fakturace)

// Pro tento test: ma_byt_zverejnena = 1
```

#### 11.2 Vyplnění registrových údajů
```javascript
TEST_DATA_FASE_11 = {
  ma_byt_zverejnena: 1,
  registr_iddt: "REG-2025-0123",
  dt_zverejneni: "2025-11-05"
}
```

#### 11.3 Označení jako zveřejněno
```javascript
// Kliknutí: "Zveřejněno v registru"
// Očekávané:
// ✅ API call: PUT /api25orders/update/123
// ✅ Workflow: [..., 'REGISTROVANA']
// ✅ Toast: "Objednávka byla zveřejněna v registru smluv"
// ✅ currentPhase = 11 (registrováno)
```

#### 11.4 Kontrola notifikací (NOVÝ systém - čeká na BE)
```javascript
// 🔜 NOTIFIKACE (nový systém - template 'order_registry_published'):
// Kdo: Objednatel, Garant, Příkazce
// Typ: order_registry_published
// Obsah: "Objednávka OBJ-2025-0123 byla zveřejněna v registru smluv"
// Email: ANO ✅
// Priority: normal
// Placeholders: {{registr_iddt}}, {{dt_zverejneni}}
```

---

### FÁZE 12: Fakturace (NOVÁ FÁZE)

#### 12.1 Přidání faktury
```javascript
TEST_DATA_FASE_12 = {
  faktury: [
    {
      cislo_faktury: "2025001234",
      castka_s_dph: 45000,
      dt_vystaveni: "2025-11-20",
      dt_splatnosti: "2025-12-20",
      stav: "ceka_na_schvaleni"
    }
  ]
}
```

#### 12.2 Schválení faktury
```javascript
// Kliknutí: "Schválit fakturu"
// Očekávané:
// ✅ API call: PUT /api25orders/faktury/update/456
// ✅ stav = 'schvaleno'
// ✅ dt_schvaleni = "2025-11-21"
// ✅ Toast: "Faktura byla schválena"
```

#### 12.3 Označení faktury jako uhrazené
```javascript
// Kliknutí: "Označit jako uhrazenou"
// Očekávané:
// ✅ API call: PUT /api25orders/faktury/update/456
// ✅ stav = 'uhrazeno'
// ✅ dt_uhrazeni = "2025-12-15"
// ✅ Workflow: [..., 'FAKTURACE']
// ✅ Toast: "Faktura byla označena jako uhrazená"
// ✅ currentPhase = 12 (fakturováno)
```

#### 12.4 Kontrola notifikací (NOVÝ systém - čeká na BE)
```javascript
// 🔜 NOTIFIKACE 1 (nový systém - template 'order_invoice_added'):
// Kdo: Garant
// Typ: order_invoice_added
// Obsah: "K objednávce OBJ-2025-0123 byla přidána faktura č. 2025001234"
// Email: ANO ✅

// 🔜 NOTIFIKACE 2 (nový systém - template 'order_invoice_approved'):
// Kdo: Objednatel
// Typ: order_invoice_approved
// Obsah: "Faktura č. 2025001234 byla schválena"
// Email: ANO ✅

// 🔜 NOTIFIKACE 3 (nový systém - template 'order_invoice_paid'):
// Kdo: Objednatel, Garant
// Typ: order_invoice_paid
// Obsah: "Faktura č. 2025001234 byla uhrazena"
// Email: ANO ✅
```

---

### FÁZE 13: Věcná správnost (NOVÁ FÁZE)

#### 13.1 Vyplnění věcné správnosti
```javascript
TEST_DATA_FASE_13 = {
  vecna_spravnost_umisteni_majetku: "IT oddělení, budova A, místnost 201",
  vecna_spravnost_poznamka: "Majetek předán Janu Novákovi dne 15.11.2025, funkční, bez závad",
  potvrzeni_vecne_spravnosti: 1,
  // Automaticky nastaveno při zaškrtnutí checkboxu:
  potvrdil_vecnou_spravnost_id: 5, // user_id přihlášeného uživatele
  dt_potvrzeni_vecne_spravnosti: "2025-11-16T09:30:00Z"
}
```

#### 13.2 Potvrzení věcné správnosti
```javascript
// Zaškrtnutí: "Potvrzuji věcnou správnost"
// Kliknutí: "Uložit objednávku"
// Očekávané:
// ✅ API call: PUT /api25orders/update/123
// ✅ Workflow: [..., 'VECNA_SPRAVNOST_POTVRZENA']
// ✅ Toast: "Věcná správnost byla potvrzena"
// ✅ currentPhase = 13 (věcná správnost potvrzena)
```

#### 13.3 Kontrola notifikací (NOVÝ systém - čeká na BE)
```javascript
// 🔜 NOTIFIKACE (nový systém - template 'order_vecna_spravnost_confirmed'):
// Kdo: Garant, Příkazce
// Typ: order_vecna_spravnost_confirmed
// Obsah: "Věcná správnost objednávky OBJ-2025-0123 byla potvrzena"
// Email: ANO ✅
// Priority: normal
// Placeholders: {{vecna_spravnost_umisteni_majetku}}, {{kontroloval_name}}
```

---

### FÁZE 14: Dokončení objednávky

#### 14.1 Označení jako dokončené
```javascript
// Kliknutí: "Označit jako dokončenou"
// Očekávané:
// ✅ Modal: "Opravdu chcete dokončit tuto objednávku?"
// ✅ Potvrzení: ANO
// ✅ API call: PUT /api25orders/update/123
// ✅ dt_dokonceni = "2025-11-16T10:00:00Z"
// ✅ Workflow: [..., 'DOKONCENA']
// ✅ Toast: "Objednávka byla dokončena"
// ✅ currentPhase = 14 (dokončeno)
// ✅ Formulář: read-only režim (nelze dále editovat)
```

#### 14.2 Kontrola notifikací
```javascript
// ✅ NOTIFIKACE (původní systém):
// Kdo: Objednatel, Garant, Příkazce
// Typ: order_completed
// Obsah: "Objednávka OBJ-2025-0123 byla dokončena"
// Email: ANO ✅
// Priority: normal
```

---

## ⚠️ SCÉNÁŘ 2: Validační chyby

### 2.1 Chybějící povinná pole
```javascript
// Test: Pokus o uložení bez předmětu
formData = {
  predmet: "", // ❌ PRÁZDNÉ
  garant_uzivatel_id: 5,
  prikazce_id: 3
}

// Očekávané:
// ❌ Validace selže
// ❌ Toast: "Vyplňte prosím všechna povinná pole"
// ❌ Zvýraznění chybějících polí červeně
// ❌ Scroll na první chybné pole
```

### 2.2 Překročení limitu
```javascript
// Test: Součet položek překračuje max_cena_s_dph
formData = {
  max_cena_s_dph: 45000,
  polozky_objednavky: [
    { cena_s_dph: 30000 },
    { cena_s_dph: 20000 } // Celkem 50000 > 45000 ❌
  ]
}

// Očekávané:
// ❌ Validace selže
// ❌ Toast: "Nelze uložit objednávku - překročen limit o 5 000 Kč!"
// ❌ Červený indikátor nadlimitu
// ❌ Scroll na sekci Detail objednávky
// ❌ Automatické rozbalení sekce
```

### 2.3 Neplatný email
```javascript
// Test: Neplatný formát emailu
formData = {
  objednatel_email: "neplatny-email" // ❌ Bez @
}

// Očekávané:
// ❌ Validace selže
// ❌ Toast: "Neplatný formát emailové adresy"
// ❌ Zvýraznění pole červeně
```

---

## 🔄 SCÉNÁŘ 3: Workflow testy

### 3.1 Test zamítnutí objednávky
```javascript
// FÁZE 7: Garant zamítá objednávku
// Kliknutí: "Zamítnout objednávku"
// Zadání komentáře: "Nedostatečně odůvodněný požadavek"
// Očekávané:
// ✅ stav_schvaleni = 'zamitnuto'
// ✅ schvaleni_komentar = "Nedostatečně odůvodněný požadavek"
// ✅ Workflow: [..., 'ZAMITNUTA']
// ✅ Notifikace objednateli
// ✅ Možnost editovat a znovu odeslat ke schválení
```

### 3.2 Test vrácení k přepracování
```javascript
// FÁZE 7: Garant vrací k přepracování
// Kliknutí: "Vrátit k přepracování"
// Zadání komentáře: "Doplňte prosím podrobnější specifikaci"
// Očekávané:
// ✅ stav_schvaleni = 'ceka_se'
// ✅ schvaleni_komentar = "Doplňte prosím podrobnější specifikaci"
// ✅ Workflow: [..., 'CEKA_SE']
// ✅ Notifikace objednateli
// ✅ Objednatel může editovat a znovu odeslat
```

### 3.3 Test přeskočení registru smluv
```javascript
// FÁZE 11: ma_byt_zverejnena = 0
// Očekávané:
// ✅ FÁZE 11 (Registr) se přeskočí
// ✅ Přímý přechod z FÁZE 10 (Potvrzena) → FÁZE 12 (Fakturace)
// ✅ Workflow: [..., 'POTVRZENA'] → [..., 'FAKTURACE']
```

---

## 💾 SCÉNÁŘ 4: Šablony

### 4.1 Uložení jako šablona (FÁZE 1)
```javascript
// Po vyplnění základních údajů
// Kliknutí: "Uložit jako šablonu"
// Zadání názvu: "Notebook - standardní konfigurace"
// Očekávané:
// ✅ Šablona uložena do localStorage
// ✅ Šablona uložena do DB (user_specific)
// ✅ Toast: "Šablona byla úspěšně uložena"
```

### 4.2 Načtení šablony
```javascript
// Nová objednávka: /orders/new
// Kliknutí: "Načíst šablonu"
// Výběr: "Notebook - standardní konfigurace"
// Očekávané:
// ✅ Automatické vyplnění všech polí ze šablony
// ✅ Toast: "Šablona byla načtena"
// ✅ Uživatel může upravit hodnoty
```

---

## 📊 Checklist pro manuální testování

### Před testem
- [ ] Backend běží na http://localhost:5000
- [ ] Frontend běží na http://localhost:3000
- [ ] Databáze je dostupná
- [ ] Testovací uživatelé jsou vytvořeni:
  - [ ] Objednatel (normální uživatel)
  - [ ] Garant (schvalovatel)
  - [ ] SUPERADMIN (pro admin funkce)

### Během testu
- [ ] Každá FÁZE ukládá data správně
- [ ] Validace funguje na všech úrovních
- [ ] Notifikace se odesílají správným osobám
- [ ] Workflow stavy se aktualizují korektně
- [ ] Toast zprávy se zobrazují
- [ ] Formulář se nezamrzá (isSaving state)
- [ ] Debug logy jsou viditelné v konzoli

### Po testu
- [ ] Data v databázi odpovídají formuláři
- [ ] Workflow historie je kompletní
- [ ] Notifikace byly doručeny
- [ ] Emaily byly odeslány (pokud nakonfigurováno)
- [ ] Žádné JavaScript chyby v konzoli

---

## 🐛 Známé problémy k ověření

### 1. Věcná správnost - automatické ID
```javascript
// PROBLÉM: potvrdil_vecnou_spravnost_id se možná nenastavuje automaticky
// TEST: Zaškrtnout checkbox a uložit → zkontrolovat DB
// OČEKÁVANÉ: user_id + timestamp se uloží automaticky
```

### 2. Střediska transformace
```javascript
// PROBLÉM: Možná chyba v transformaci kódů na objekty
// TEST: Uložit více středisek → zkontrolovat DB
// OČEKÁVANÉ: Pole objektů [{kod_stavu, nazev_stavu}], NE JSON string
```

### 3. Položky při INSERT
```javascript
// PROBLÉM: Položky by se neměly ukládat při prvním INSERT (FÁZE 1)
// TEST: Uložit FÁZI 1 bez položek → zkontrolovat DB
// OČEKÁVANÉ: polozky_objednavky = NULL nebo []
```

### 4. Notifikace při dokončení
```javascript
// PROBLÉM: Notifikace možná nechodí všem příjemcům
// TEST: Dokončit objednávku → zkontrolovat notifikace v DB
// OČEKÁVANÉ: Notifikace pro: objednatel, garant, příkazce
```

---

## 📝 Poznámky k backendu

### Původní notifikační systém
```php
// Backend aktuálně používá jednoduchou notifikační tabulku:
// - id, user_id, order_id, message, type, is_read, created_at

// NOVÝ systém (42 templates) čeká na implementaci:
// - docs/NOTIFICATION-TEMPLATES-NEW-STRUCTURE.sql
// - docs/BACKEND-NOTIFICATION-API-REQUIREMENTS.md
```

### Co testovat s BE teď (původní systém)
1. ✅ Základní notifikace fungují (vytvoření, schválení, zamítnutí)
2. ✅ Email notifikace se odesílají
3. ✅ Workflow stavy se ukládají správně
4. ⚠️ NOVÉ fáze (registr, fakturace, věcná správnost) možná nemají notifikace

### Co čeká na BE (nový systém)
1. 🔜 Implementace 42 notification templates
2. 🔜 Placeholder replacement system
3. 🔜 TODO alarm worker
4. 🔜 System notifications
5. 🔜 Email templates s HTML

---

## 🎯 Priority testování

### VYSOKÁ (MUST TEST)
1. ✅ Základní workflow (FÁZE 1-8)
2. ✅ Validace povinných polí
3. ✅ Kontrola limitu
4. ✅ Schválení/Zamítnutí
5. ✅ Workflow stavy

### STŘEDNÍ (SHOULD TEST)
1. 🔄 NOVÉ fáze (registr, fakturace, věcná správnost)
2. 🔄 Šablony (ukládání/načítání)
3. 🔄 Přílohy (upload/download)
4. 🔄 ARES integrace

### NÍZKÁ (NICE TO TEST)
1. 💡 Notifikace (čeká na nový systém)
2. 💡 Email doručení
3. 💡 TODO alarmy
4. 💡 System notifications

---

## ✅ Výsledek testu

### Test provedl
- **Jméno:** _____________________
- **Datum:** _____________________
- **Prostředí:** DEV / TEST / PROD

### Výsledek
- [ ] ✅ ÚSPĚŠNÝ - vše funguje
- [ ] ⚠️ ČÁSTEČNÝ - drobné problémy
- [ ] ❌ NEÚSPĚŠNÝ - kritické chyby

### Nalezené chyby
```
1. _____________________________________
2. _____________________________________
3. _____________________________________
```

### Poznámky
```
_______________________________________
_______________________________________
_______________________________________
```
