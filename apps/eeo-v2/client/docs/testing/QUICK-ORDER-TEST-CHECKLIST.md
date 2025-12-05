# ⚡ Rychlý testovací checklist - Zadání objednávky

**Datum:** 29. října 2025  
**Účel:** Rychlé manuální ověření základního workflow objednávky  
**Čas:** ~10-15 minut

---

## 🚀 Příprava testu

### 1. Spuštění prostředí
```bash
# Backend
cd backend
php -S localhost:5000

# Frontend (nové okno terminálu)
cd frontend
npm start
```

### 2. Přihlášení
- [ ] URL: http://localhost:3000
- [ ] Přihlásit jako **objednatel** (normální uživatel)
- [ ] Ověřit, že uživatel má oprávnění vytvářet objednávky

---

## ✅ TEST 1: Vytvoření objednávky (5 min)

### Krok 1: Otevření formuláře
- [ ] Navigace: `/orders/new` nebo klik na "Nová objednávka"
- [ ] Formulář se otevřel prázdný
- [ ] `currentPhase = 1` (viditelné v debug konzoli)

### Krok 2: Základní údaje (FÁZE 1)
```javascript
Vyplnit:
- [x] Předmět: "Test notebook"
- [x] Garant: Vybrat z dropdown
- [x] Příkazce: Vybrat z dropdown
- [x] Středisko: Vybrat minimálně 1
- [x] Max. cena s DPH: "50000"
- [x] Financování: "Limitovaný příkaz"
- [x] LP kód: "LP-2025-TEST"
- [x] Druh: "Materiál"
```

### Krok 3: Uložení
- [ ] Klik: "Uložit objednávku"
- [ ] ✅ Toast: "Objednávka byla úspěšně vytvořena"
- [ ] ✅ URL změněno na: `/orders/edit/[ID]`
- [ ] ✅ Zobrazeno číslo objednávky: `OBJ-2025-XXXX`
- [ ] ✅ `isOrderSavedToDB = true`
- [ ] ✅ `savedOrderId = [ID]`

**✅ PASS / ❌ FAIL**

---

## ✅ TEST 2: Položky objednávky (3 min)

### Krok 1: Přidání položky
```javascript
Vyplnit:
- [x] Popis: "Notebook Lenovo"
- [x] Množství: "1"
- [x] Jednotka: "ks"
- [x] Cena s DPH: "45000"
- [x] Sazba DPH: "21"
```

### Krok 2: Kontrola limitu
- [ ] Součet položek: **45 000 Kč**
- [ ] Max. cena: **50 000 Kč**
- [ ] Nadlimit: **0 Kč** (zelený indikátor)
- [ ] Status: ✅ **V LIMITU**

### Krok 3: Uložení
- [ ] Klik: "Uložit objednávku"
- [ ] ✅ Toast: "Objednávka byla úspěšně aktualizována"
- [ ] ✅ Položky zůstaly v tabulce

**✅ PASS / ❌ FAIL**

---

## ✅ TEST 3: Dodavatel (2 min)

### Krok 1: ARES vyhledání
- [ ] IČO: "27082440" (ALZA)
- [ ] Klik: "Vyhledat v ARES"
- [ ] ✅ Automatické vyplnění: název, adresa, DIČ

### Krok 2: Kontakty
```javascript
Vyplnit:
- [x] Kontaktní osoba: "Test Kontakt"
- [x] Email: "test@alza.cz"
- [x] Telefon: "+420123456789"
```

### Krok 3: Uložení
- [ ] Klik: "Uložit objednávku"
- [ ] ✅ Toast: "Objednávka byla úspěšně aktualizována"

**✅ PASS / ❌ FAIL**

---

## ✅ TEST 4: Odeslání ke schválení (2 min)

### Krok 1: Kontrola kompletnosti
- [ ] Všechna povinná pole vyplněna
- [ ] Položky přidány
- [ ] Dodavatel vyplněn
- [ ] Limit respektován

### Krok 2: Odeslání
- [ ] Klik: "Odeslat ke schválení"
- [ ] ✅ Modal: "Opravdu chcete odeslat ke schválení?"
- [ ] Klik: "ANO"
- [ ] ✅ Toast: "Objednávka byla odeslána ke schválení"
- [ ] ✅ `currentPhase = 7` (čeká na schválení)
- [ ] ✅ Workflow obsahuje: `ODESLANA_KE_SCHVALENI`

### Krok 3: Notifikace
- [ ] Otevřít: Notification dropdown
- [ ] ✅ Nová notifikace pro **garanta**
- [ ] ✅ Text: "Nová objednávka čeká na schválení"

**✅ PASS / ❌ FAIL**

---

## ✅ TEST 5: Schválení (3 min)

### Krok 1: Přihlášení jako garant
- [ ] Odhlásit se
- [ ] Přihlásit jako **garant** (uživatel vybraný v FÁZI 1)
- [ ] Navigovat: `/orders/edit/[ID]`

### Krok 2: Schválení
- [ ] Formulář je **read-only** (garant nemůže editovat)
- [ ] Sekce "Schválení objednávky" je **viditelná**
- [ ] Klik: "Schválit objednávku"
- [ ] ✅ Modal: "Opravdu chcete schválit?"
- [ ] Klik: "ANO"
- [ ] ✅ Toast: "Objednávka byla schválena"
- [ ] ✅ Workflow obsahuje: `SCHVALENA`

### Krok 3: Notifikace
- [ ] Odhlásit se
- [ ] Přihlásit jako **původní objednatel**
- [ ] Otevřít: Notification dropdown
- [ ] ✅ Nová notifikace: "Vaše objednávka byla schválena"

**✅ PASS / ❌ FAIL**

---

## ✅ TEST 6: Věcná správnost (2 min)

### Krok 1: Vyplnění věcné správnosti
```javascript
Vyplnit:
- [x] Umístění majetku: "IT, budova A, místnost 201"
- [x] Poznámka: "Předáno 15.11.2025, bez závad"
- [x] Checkbox: "Potvrzuji věcnou správnost"
```

### Krok 2: Uložení
- [ ] Klik: "Uložit objednávku"
- [ ] ✅ Toast: "Objednávka byla úspěšně aktualizována"
- [ ] ✅ V databázi:
  - `potvrdil_vecnou_spravnost_id = [user_id]` ✅
  - `dt_potvrzeni_vecne_spravnosti = [timestamp]` ✅

**✅ PASS / ❌ FAIL**

---

## ✅ TEST 7: Dokončení (1 min)

### Krok 1: Označení jako dokončené
- [ ] Klik: "Označit jako dokončenou"
- [ ] ✅ Modal: "Opravdu chcete dokončit?"
- [ ] Klik: "ANO"
- [ ] ✅ Toast: "Objednávka byla dokončena"
- [ ] ✅ Workflow obsahuje: `DOKONCENA`
- [ ] ✅ Formulář je **read-only** (nelze dále editovat)

**✅ PASS / ❌ FAIL**

---

## 🐛 TEST 8: Validace chyb (3 min)

### Test A: Chybějící povinné pole
1. [ ] Nová objednávka: `/orders/new`
2. [ ] **NEVYPLNIT** předmět
3. [ ] Klik: "Uložit objednávku"
4. [ ] ✅ Toast: "Vyplňte prosím všechna povinná pole"
5. [ ] ✅ Pole "Předmět" zvýrazněno červeně
6. [ ] ✅ Scroll na chybné pole

### Test B: Překročení limitu
1. [ ] Max. cena: "10000"
2. [ ] Položka: cena_s_dph = "15000"
3. [ ] Klik: "Uložit objednávku"
4. [ ] ✅ Toast: "Nelze uložit - překročen limit o 5 000 Kč!"
5. [ ] ✅ Červený indikátor nadlimitu
6. [ ] ✅ Scroll na sekci Detail objednávky

**✅ PASS / ❌ FAIL**

---

## 📊 Výsledek testu

### Souhrn
- **Celkem testů:** 8
- **Úspěšných:** _____ / 8
- **Neúspěšných:** _____ / 8

### Kritické chyby (BLOCKER)
```
1. _____________________________________
2. _____________________________________
```

### Drobné chyby (MINOR)
```
1. _____________________________________
2. _____________________________________
```

### Poznámky
```
_______________________________________
_______________________________________
```

---

## 🔍 Kontrola v databázi

### SQL dotazy pro ověření

```sql
-- 1. Kontrola objednávky
SELECT 
  id,
  cislo_objednavky,
  predmet,
  stav_workflow_kod,
  stav_schvaleni,
  objednatel_id,
  garant_uzivatel_id,
  prikazce_id
FROM 25_objednavky
WHERE id = [TEST_ORDER_ID];

-- 2. Kontrola položek
SELECT 
  id,
  objednavka_id,
  popis,
  mnozstvi,
  cena_s_dph
FROM 25_polozky_objednavky
WHERE objednavka_id = [TEST_ORDER_ID];

-- 3. Kontrola workflow historie
SELECT 
  id,
  objednavka_id,
  stav_workflow_kod,
  dt_zmeny,
  uzivatel_id
FROM 25_workflow_historie
WHERE objednavka_id = [TEST_ORDER_ID]
ORDER BY dt_zmeny DESC;

-- 4. Kontrola notifikací
SELECT 
  id,
  user_id,
  order_id,
  message,
  type,
  is_read,
  created_at
FROM 25_notifications
WHERE order_id = [TEST_ORDER_ID]
ORDER BY created_at DESC;

-- 5. Kontrola věcné správnosti
SELECT 
  id,
  vecna_spravnost_umisteni_majetku,
  vecna_spravnost_poznamka,
  potvrzeni_vecne_spravnosti,
  potvrdil_vecnou_spravnost_id,
  dt_potvrzeni_vecne_spravnosti
FROM 25_objednavky
WHERE id = [TEST_ORDER_ID];
```

---

## 🎯 Co testujeme PRIMÁRNĚ

### ✅ MUST WORK (kritické)
1. Vytvoření objednávky (INSERT)
2. Uložení položek (UPDATE)
3. Odeslání ke schválení
4. Schválení garanta
5. Validace povinných polí
6. Kontrola limitu
7. Workflow stavy

### ⚠️ SHOULD WORK (důležité)
1. ARES integrace
2. Notifikace (základní)
3. Věcná správnost (automatické ID)
4. Transformace středisek/financování

### 💡 NICE TO HAVE (volitelné)
1. Email notifikace
2. TODO alarmy (nový systém)
3. System notifications (nový systém)
4. Advanced templates

---

## 📝 Podpis testera

**Jméno:** _____________________  
**Datum:** _____________________  
**Čas:** _____ - _____  
**Prostředí:** DEV / TEST / PROD  

**Výsledek:** ✅ PASS / ⚠️ PARTIAL / ❌ FAIL  

**Poznámky:**
```
_______________________________________
_______________________________________
_______________________________________
```
