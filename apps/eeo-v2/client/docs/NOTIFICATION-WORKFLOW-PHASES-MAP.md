# MAPA NOTIFIKACÍ PRO VŠECHNY FÁZE WORKFLOW

**Datum:** 29.10.2025  
**Účel:** Kompletní přehled všech notifikací pro každou fázi objednávky

---

## 📊 PŘEHLED 8 FÁZÍ WORKFLOW

```
FÁZE 1: Nová/Rozpracovaná
   ↓
FÁZE 2: Ke schválení → Schválena/Zamítnuta/Čeká se
   ↓
FÁZE 3: Odeslána dodavateli
   ↓
FÁZE 4: Potvrzena dodavatelem
   ↓
FÁZE 5: Registr smluv (volitelně, pokud ma_byt_zverejnena=1)
   ↓
FÁZE 6: Fakturace
   ↓
FÁZE 7: Věcná správnost (kontrola)
   ↓
FÁZE 8: Dokončena
```

---

## 🔄 FÁZE 1: NOVÁ / ROZPRACOVANÁ

**Stav workflow:** `nova`, `rozpracovana`  
**Charakteristika:** Objednávka vytvořena, ale ještě neuložena do DB nebo je jako koncept

### Notifikace:

#### 1.1 `order_status_nova` - Nová objednávka vytvořena
- **Kdy:** Po prvním uložení objednávky do DB
- **Příjemci:** Tvůrce (pro potvrzení)
- **Priorita:** `low`
- **Email:** NE (pouze zvoneček)
- **Trigger:** Po úspěšném `INSERT` do tabulky objednávek

#### 1.2 `order_status_rozpracovana` - Objednávka rozpracována
- **Kdy:** Objednávka uložena jako koncept (neodeslána ke schválení)
- **Příjemci:** Tvůrce (připomínka)
- **Priorita:** `low`
- **Email:** NE
- **Trigger:** Po uložení s `workflow_state = 'rozpracovana'`

---

## ✅ FÁZE 2: SCHVALOVACÍ PROCES

**Stav workflow:** `ke_schvaleni`, `schvalena`, `zamitnuta`, `ceka_se`  
**Charakteristika:** Objednávka prochází schvalovacím workflow

### Notifikace:

#### 2.1 `order_status_ke_schvaleni` - Objednávka ke schválení
- **Kdy:** Objednávka odeslána ke schválení
- **Příjemci:** 
  - Všichni schvalovatelé (z tabulky `25_schvalovaci_proces`)
  - Garant
  - Příkazce
- **Priorita:** `high`
- **Email:** ANO
- **Trigger:** Po změně `workflow_state` na `ke_schvaleni`
- **Data:** počet položek, celková cena, deadline

#### 2.2 `order_status_schvalena` - Objednávka schválena
- **Kdy:** Všichni schvalovatelé schválili
- **Příjemci:**
  - Tvůrce objednávky
  - Garant
  - Příkazce
- **Priorita:** `normal`
- **Email:** ANO
- **Trigger:** Po schválení posledního schvalovatele
- **Data:** Jméno schvalovatele, datum schválení

#### 2.3 `order_status_zamitnuta` - Objednávka zamítnuta
- **Kdy:** Alespoň jeden schvalovatel zamítl
- **Příjemci:**
  - Tvůrce objednávky
  - Garant
  - Příkazce
  - Ostatní schvalovatelé (pro informaci)
- **Priorita:** `high`
- **Email:** ANO
- **Trigger:** Okamžitě po zamítnutí
- **Data:** Jméno schvalovatele, důvod zamítnutí

#### 2.4 `order_status_ceka_se` - Objednávka vrácena k doplnění
- **Kdy:** Schvalovatel vrátil k doplnění informací
- **Příjemci:**
  - Tvůrce objednávky
  - Garant
- **Priorita:** `normal`
- **Email:** ANO
- **Trigger:** Po označení jako "čeká se"
- **Data:** Co je potřeba doplnit

---

## 📤 FÁZE 3: ODESLÁNA DODAVATELI

**Stav workflow:** `odeslana`, `ceka_potvrzeni`  
**Charakteristika:** Objednávka odeslána dodavateli, čeká na potvrzení

### Notifikace:

#### 3.1 `order_status_odeslana` - Objednávka odeslána dodavateli
- **Kdy:** Objednávka odeslána dodavateli (email, portál, atd.)
- **Příjemci:**
  - Tvůrce objednávky
  - Garant
  - Příkazce
- **Priorita:** `normal`
- **Email:** ANO
- **Trigger:** Po změně `workflow_state` na `odeslana`
- **Data:** Název dodavatele, IČ, kontakt, počet položek, celková cena

#### 3.2 `order_status_ceka_potvrzeni` - Čeká na potvrzení
- **Kdy:** Automatická připomínka, pokud dodavatel nepotvrdil do X dnů
- **Příjemci:**
  - Garant (primárně zodpovědný)
  - Tvůrce objednávky
- **Priorita:** `normal`
- **Email:** NE (pouze zvoneček)
- **Trigger:** Automatický job (např. po 7 dnech bez potvrzení)
- **Data:** Počet dní čekání

---

## ✔️ FÁZE 4: POTVRZENA DODAVATELEM

**Stav workflow:** `potvrzena`  
**Charakteristika:** Dodavatel potvrdil objednávku, čeká se na dodání

### Notifikace:

#### 4.1 `order_status_potvrzena` - Objednávka potvrzena
- **Kdy:** Dodavatel potvrdil objednávku
- **Příjemci:**
  - Tvůrce objednávky
  - Garant
  - Příkazce
- **Priorita:** `normal`
- **Email:** ANO
- **Trigger:** Po změně `workflow_state` na `potvrzena`
- **Data:** Dodavatel, datum potvrzení, předpokládaný termín dodání

---

## 📋 FÁZE 5: REGISTR SMLUV (volitelně)

**Stav workflow:** `registr`  
**Charakteristika:** Objednávka má být zveřejněna v registru smluv (pokud `ma_byt_zverejnena = 1`)

### Notifikace:

#### 5.1 `order_status_registr_ceka` - Čeká na zveřejnění v registru
- **Kdy:** Objednávka potvrzena a má být zveřejněna, ale ještě nejsou vyplněny údaje
- **Příjemci:**
  - Garant (zodpovědný za registr)
  - Osoba zodpovědná za registr smluv
- **Priorita:** `normal`
- **Email:** ANO
- **Trigger:** Po změně na `potvrzena` + `ma_byt_zverejnena = 1` + chybí `registr_iddt`
- **Data:** Co je potřeba vyplnit

#### 5.2 `order_status_registr_zverejnena` - Zveřejněna v registru
- **Kdy:** Údaje vyplněny a objednávka zveřejněna
- **Příjemci:**
  - Tvůrce objednávky
  - Garant
  - Příkazce
- **Priorita:** `normal`
- **Email:** ANO
- **Trigger:** Po vyplnění `registr_iddt` + `dt_zverejneni`
- **Data:** ID registru, datum zveřejnění, odkaz

---

## 💵 FÁZE 6: FAKTURACE

**Stav workflow:** `fakturace`  
**Charakteristika:** Přidávání a zpracování faktur od dodavatele

### Notifikace:

#### 6.1 `order_status_faktura_ceka` - Čeká na fakturu
- **Kdy:** Objednávka potvrzena/zveřejněna, ale ještě není přidána žádná faktura
- **Příjemci:**
  - Garant (zodpovědný za kontrolu faktury)
- **Priorita:** `normal`
- **Email:** ANO (po X dnech od potvrzení)
- **Trigger:** Automatický job (např. 14 dní po potvrzení bez faktury)
- **Data:** Dodavatel, předpokládaná částka

#### 6.2 `order_status_faktura_pridana` - Faktura přidána
- **Kdy:** K objednávce byla přidána nová faktura
- **Příjemci:**
  - Garant
  - Tvůrce objednávky
  - Příkazce (pokud je zodpovědný za schválení faktury)
  - Účetní (pokud je definován)
- **Priorita:** `normal`
- **Email:** ANO
- **Trigger:** Po přidání faktury (`INSERT` do tabulky faktur)
- **Data:** Číslo faktury, částka, datum vystavení, splatnost

#### 6.3 `order_status_faktura_schvalena` - Faktura schválena k úhradě
- **Kdy:** Faktura byla zkontrolována a schválena k úhradě
- **Příjemci:**
  - Účetní
  - Garant
  - Tvůrce objednávky
- **Priorita:** `normal`
- **Email:** ANO
- **Trigger:** Po změně stavu faktury na `schvalena`
- **Data:** Číslo faktury, částka, splatnost, kdo schválil

#### 6.4 `order_status_faktura_uhrazena` - Faktura uhrazena
- **Kdy:** Faktura byla uhrazena
- **Příjemci:**
  - Garant
  - Tvůrce objednávky
  - Příkazce
- **Priorita:** `normal`
- **Email:** ANO
- **Trigger:** Po vyplnění `dt_uhrazeni` u faktury
- **Data:** Číslo faktury, částka, datum úhrady

---

## 🔍 FÁZE 7: VĚCNÁ SPRÁVNOST (KONTROLA)

**Stav workflow:** `kontrola`, `zkontrolovana`  
**Charakteristika:** Kontrola věcné správnosti dodávky (kvalita, množství, funkčnost)

### Notifikace:

#### 7.1 `order_status_kontrola_ceka` - Čeká na kontrolu věcné správnosti
- **Kdy:** Faktura uhrazena nebo dodávka doručena, čeká na kontrolu
- **Příjemci:**
  - Garant (zodpovědný za kontrolu)
  - Osoba určená pro kontrolu
  - Tvůrce objednávky
- **Priorita:** `high`
- **Email:** ANO
- **Trigger:** Po změně `workflow_state` na `kontrola` nebo automaticky po uhrazení faktury
- **Data:** Co je potřeba zkontrolovat, počet položek

#### 7.2 `order_status_kontrola_potvrzena` - Věcná správnost potvrzena (OK)
- **Kdy:** Kontrola proběhla úspěšně, vše v pořádku
- **Příjemci:**
  - Tvůrce objednávky
  - Garant
  - Příkazce
  - Účetní
- **Priorita:** `normal`
- **Email:** ANO
- **Trigger:** Po vyplnění `potvrdil_vecnou_spravnost_id` + `dt_potvrzeni_vecne_spravnosti`
- **Data:** Kdo kontroloval, datum kontroly, umístění majetku, poznámka

#### 7.3 `order_status_kontrola_zamitnuta` - Věcná správnost zamítnuta (Reklamace)
- **Kdy:** Kontrola odhalila závady, je třeba reklamace
- **Příjemci:**
  - Garant (primárně zodpovědný)
  - Tvůrce objednávky
  - Příkazce
  - Dodavatel (pokud máme email)
- **Priorita:** `high`
- **Email:** ANO
- **Trigger:** Po označení kontroly jako zamítnuté
- **Data:** Kdo zamítl, důvod zamítnutí, popis závad, poznámka

---

## 🎉 FÁZE 8: DOKONČENA

**Stav workflow:** `dokoncena`  
**Charakteristika:** Objednávka úspěšně dokončena, všechny kroky splněny

### Notifikace:

#### 8.1 `order_status_dokoncena` - Objednávka dokončena
- **Kdy:** Všechny kroky dokončeny, objednávka uzavřena
- **Příjemci:**
  - Tvůrce objednávky
  - Garant
  - Příkazce
  - Všichni schvalovatelé (pro informaci)
- **Priorita:** `normal`
- **Email:** ANO
- **Trigger:** Po změně `workflow_state` na `dokoncena`
- **Data:** Celkový souhrn (dodavatel, faktury, celková cena, datum dokončení)

---

## 🚫 SPECIÁLNÍ STAVY

### Notifikace pro speciální akce:

#### S.1 `order_status_zrusena` - Objednávka zrušena
- **Kdy:** Objednávka zrušena v kterékoli fázi
- **Příjemci:**
  - Všichni relevantní uživatelé podle fáze
  - Dodavatel (pokud už byla odeslána)
- **Priorita:** `high`
- **Email:** ANO
- **Trigger:** Po změně `workflow_state` na `zrusena`
- **Data:** Kdo zrušil, důvod zrušení, ve které fázi

#### S.2 `order_status_smazana` - Objednávka smazána
- **Kdy:** Objednávka trvale smazána (pouze administrátor)
- **Příjemci:**
  - Tvůrce objednávky
  - Garant
  - Administrátoři (pro audit)
- **Priorita:** `high`
- **Email:** ANO
- **Trigger:** Před `DELETE` z DB
- **Data:** Kdo smazal, důvod smazání

---

## 📊 SOUHRN NOTIFIKACÍ PO FÁZÍCH

| Fáze | Typ notifikace | Email | Priorita | Příjemci |
|------|---------------|-------|----------|----------|
| 1 | `order_status_nova` | NE | low | Tvůrce |
| 1 | `order_status_rozpracovana` | NE | low | Tvůrce |
| 2 | `order_status_ke_schvaleni` | ANO | high | Schvalovatelé, Garant, Příkazce |
| 2 | `order_status_schvalena` | ANO | normal | Tvůrce, Garant, Příkazce |
| 2 | `order_status_zamitnuta` | ANO | high | Tvůrce, Garant, Příkazce, Schvalovatelé |
| 2 | `order_status_ceka_se` | ANO | normal | Tvůrce, Garant |
| 3 | `order_status_odeslana` | ANO | normal | Tvůrce, Garant, Příkazce |
| 3 | `order_status_ceka_potvrzeni` | NE | normal | Garant, Tvůrce |
| 4 | `order_status_potvrzena` | ANO | normal | Tvůrce, Garant, Příkazce |
| 5 | `order_status_registr_ceka` | ANO | normal | Garant, Správce registru |
| 5 | `order_status_registr_zverejnena` | ANO | normal | Tvůrce, Garant, Příkazce |
| 6 | `order_status_faktura_ceka` | ANO | normal | Garant |
| 6 | `order_status_faktura_pridana` | ANO | normal | Garant, Tvůrce, Příkazce, Účetní |
| 6 | `order_status_faktura_schvalena` | ANO | normal | Účetní, Garant, Tvůrce |
| 6 | `order_status_faktura_uhrazena` | ANO | normal | Garant, Tvůrce, Příkazce |
| 7 | `order_status_kontrola_ceka` | ANO | high | Garant, Kontrolor, Tvůrce |
| 7 | `order_status_kontrola_potvrzena` | ANO | normal | Tvůrce, Garant, Příkazce, Účetní |
| 7 | `order_status_kontrola_zamitnuta` | ANO | high | Garant, Tvůrce, Příkazce, Dodavatel |
| 8 | `order_status_dokoncena` | ANO | normal | Tvůrce, Garant, Příkazce, Schvalovatelé |
| * | `order_status_zrusena` | ANO | high | Podle fáze + Dodavatel |
| * | `order_status_smazana` | ANO | high | Tvůrce, Garant, Admini |

**Celkem:** 21 typů notifikací pro objednávky

---

## 🔔 AUTOMATICKÉ PŘIPOMÍNKY

### Připomínky pro deadliny:

1. **Čeká na schválení > 3 dny**
   - Připomínka schvalovatelům
   - Type: `order_status_ke_schvaleni` (opakovaně)
   - Priorita: `high`

2. **Čeká na potvrzení dodavatelem > 7 dní**
   - Připomínka garantovi
   - Type: `order_status_ceka_potvrzeni`
   - Priorita: `normal`

3. **Čeká na fakturu > 14 dní od potvrzení**
   - Připomínka garantovi
   - Type: `order_status_faktura_ceka`
   - Priorita: `normal`

4. **Čeká na kontrolu věcné správnosti > 7 dní**
   - Připomínka garantovi a kontrolorovi
   - Type: `order_status_kontrola_ceka`
   - Priorita: `high`

5. **Faktura blíží se splatnost (7 dní před)**
   - Připomínka účetnímu a garantovi
   - Type: vlastní `order_invoice_due_soon`
   - Priorita: `high`

---

## 🎯 IMPLEMENTAČNÍ PRIORITA

### MUST HAVE (Fáze 1 implementace):
1. ✅ `order_status_ke_schvaleni` - Ke schválení
2. ✅ `order_status_schvalena` - Schválena
3. ✅ `order_status_zamitnuta` - Zamítnuta
4. ✅ `order_status_odeslana` - Odeslána dodavateli
5. ✅ `order_status_potvrzena` - Potvrzena
6. ✅ `order_status_dokoncena` - Dokončena
7. ✅ `order_status_zrusena` - Zrušena

### SHOULD HAVE (Fáze 2 implementace):
8. ✅ `order_status_ceka_se` - Vrácena k doplnění
9. ✅ `order_status_faktura_pridana` - Faktura přidána
10. ✅ `order_status_faktura_uhrazena` - Faktura uhrazena
11. ✅ `order_status_kontrola_ceka` - Čeká na kontrolu
12. ✅ `order_status_kontrola_potvrzena` - Věcná správnost OK

### NICE TO HAVE (Fáze 3 implementace):
13. `order_status_registr_ceka` - Čeká na registr
14. `order_status_registr_zverejnena` - Zveřejněna v registru
15. `order_status_faktura_ceka` - Připomínka faktury
16. `order_status_faktura_schvalena` - Faktura schválena
17. `order_status_kontrola_zamitnuta` - Reklamace
18. Automatické připomínky deadlinů

---

**Prepared by:** Frontend Team  
**Date:** 29.10.2025  
**Version:** 1.0
