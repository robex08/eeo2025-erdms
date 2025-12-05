# ✅ Testovací Checklist - Import Starých Objednávek

**Datum testování:** _____________  
**Tester:** _____________  
**Verze:** 1.0

---

## 🔧 PRE-TEST SETUP

- [ ] Backend běží a obsahuje endpoint `/orders25/import-oldies`
- [ ] Frontend běží (`npm start`)
- [ ] Uživatel je přihlášen
- [ ] V `.env` je nastaveno `REACT_APP_DB_ORDER_KEY=DEMO_objednavky_2025`
- [ ] V localStorage existuje `user_id`

---

## 1️⃣ ZÁKLADNÍ FUNKČNOST

### Test 1.1: Otevření modalu
- [ ] Jít na stránku `/orders`
- [ ] Vybrat 3 objednávky checkboxy
- [ ] Kliknout "Převést do nového seznamu"
- [ ] ✅ Modal se otevře
- [ ] ✅ Zobrazí se správný počet vybraných objednávek (3)
- [ ] ✅ Tlačítko "Importovat (3)" je aktivní

### Test 1.2: Zavření modalu bez importu
- [ ] Otevřít modal
- [ ] Kliknout "Zrušit"
- [ ] ✅ Modal se zavře
- [ ] ✅ Checkboxy zůstávají označené

### Test 1.3: Kliknutí mimo modal
- [ ] Otevřít modal
- [ ] Kliknout mimo modal (na overlay)
- [ ] ✅ Modal se zavře

---

## 2️⃣ VALIDACE

### Test 2.1: Žádná objednávka nevybrána
- [ ] Zrušit všechny checkboxy
- [ ] Kliknout "Převést do nového seznamu"
- [ ] ✅ Zobrazí se toast warning: "Nevybrali jste žádné objednávky"
- [ ] ✅ Modal se NEOTEVŘE

---

## 3️⃣ IMPORT PROCES

### Test 3.1: Úspěšný import
- [ ] Vybrat 3 objednávky, které NEEXISTUJÍ v nové DB
- [ ] Kliknout "Importovat (3)"
- [ ] ✅ Progress bar se animuje 0% → 100%
- [ ] ✅ Zobrazí se "Probíhá import objednávek..."
- [ ] ✅ Spinner rotuje
- [ ] ✅ Tlačítka jsou disabled během importu
- [ ] ✅ Po dokončení: "Import dokončen úspěšně"
- [ ] ✅ Úspěšných: 3, Selhalo: 0

### Test 3.2: Import s duplikátem
- [ ] Vybrat objednávku, která už EXISTUJE v nové DB
- [ ] Kliknout "Importovat (1)"
- [ ] ✅ Import proběhne
- [ ] ✅ Zobrazí se "Import dokončen s chybami"
- [ ] ✅ Úspěšných: 0, Selhalo: 1
- [ ] ✅ V detailu červená ikona ❌
- [ ] ✅ Error message: "Objednávka s číslem ... již existuje"

### Test 3.3: Smíšené výsledky
- [ ] Vybrat 5 objednávek (některé nové, některé duplikáty)
- [ ] Kliknout "Importovat (5)"
- [ ] ✅ Zobrazí se správný počet úspěšných/selhání
- [ ] ✅ Zelené ikony ✅ pro úspěšné
- [ ] ✅ Červené ikony ❌ pro selhané
- [ ] ✅ Každá objednávka má detail (nové ID, položky, přílohy)

---

## 4️⃣ VÝSLEDKY V MODALU

### Test 4.1: Detailní výpis
- [ ] Po importu zkontrolovat detaily:
- [ ] ✅ Evidenční číslo je zobrazeno
- [ ] ✅ Nové ID je zobrazeno (u úspěšných)
- [ ] ✅ Počet položek je zobrazen
- [ ] ✅ Počet příloh je zobrazen
- [ ] ✅ Error message je zobrazen (u selhání)

### Test 4.2: Statistiky
- [ ] Zkontrolovat souhrn v zeleném/červeném boxu:
- [ ] ✅ Celkem: správný počet
- [ ] ✅ Úspěšných: správný počet
- [ ] ✅ Selhalo: správný počet

### Test 4.3: Scrollování výsledků
- [ ] Importovat 10+ objednávek
- [ ] ✅ Seznam výsledků je scrollovatelný
- [ ] ✅ Všechny výsledky jsou viditelné

---

## 5️⃣ PO IMPORTU

### Test 5.1: Auto-refresh
- [ ] Zavřít modal po úspěšném importu
- [ ] ✅ Seznam objednávek se automaticky refreshne
- [ ] ✅ Nové objednávky jsou viditelné v seznamu

### Test 5.2: Vyčištění checkboxů
- [ ] Zavřít modal po úspěšném importu
- [ ] ✅ Všechny checkboxy jsou odznačené
- [ ] ✅ `selectedOrders` Set je prázdný

### Test 5.3: Toast notifikace
- [ ] Po zavření modalu (s úspěšným importem)
- [ ] ✅ Zobrazí se zelený toast: "Import byl úspěšně dokončen"

---

## 6️⃣ ERROR HANDLING

### Test 6.1: Network error
- [ ] Odpojit internet NEBO zastavit backend
- [ ] Spustit import
- [ ] ✅ Zobrazí se červený error box
- [ ] ✅ Error message obsahuje popis problému
- [ ] ✅ Progress bar zůstane na 0% nebo resetuje

### Test 6.2: Server error (500)
- [ ] Způsobit server error (např. špatný DB config)
- [ ] Spustit import
- [ ] ✅ Zobrazí se error message
- [ ] ✅ Import se NEZPRACUJE

### Test 6.3: Chybějící token
- [ ] Odhlásit se (vymazat token z localStorage)
- [ ] Zkusit importovat
- [ ] ✅ Zobrazí se error: "Token a username jsou povinné"

### Test 6.4: Chybějící user_id
- [ ] Vymazat `user_id` z localStorage
- [ ] Zkusit importovat
- [ ] ✅ Zobrazí se error: "Chybí ID uživatele"

---

## 7️⃣ RESPONSIVE DESIGN

### Test 7.1: Desktop (1920x1080)
- [ ] Otevřít modal
- [ ] ✅ Modal je vystředěný
- [ ] ✅ Šířka max 700px
- [ ] ✅ Všechny elementy jsou viditelné

### Test 7.2: Tablet (768x1024)
- [ ] Otevřít modal
- [ ] ✅ Modal se přizpůsobí šířce
- [ ] ✅ Vše je čitelné

### Test 7.3: Mobil (375x667)
- [ ] Otevřít modal
- [ ] ✅ Modal zabere celou šířku (s paddingem)
- [ ] ✅ Statistiky se správně zalamují
- [ ] ✅ Tlačítka jsou dostatečně velká

---

## 8️⃣ ANIMACE & UX

### Test 8.1: Progress bar animace
- [ ] Spustit import
- [ ] ✅ Progress bar se plynule animuje
- [ ] ✅ Procenta se zobrazují uvnitř progress baru
- [ ] ✅ Barva je zelená (nebo červená při chybě)

### Test 8.2: Spinner rotace
- [ ] Během importu sledovat spinner
- [ ] ✅ Spinner rotuje plynule
- [ ] ✅ Animace je smooth (bez záškubání)

### Test 8.3: Hover efekty
- [ ] Najet myší na tlačítka
- [ ] ✅ Primární tlačítko: mírný shadow + translateY
- [ ] ✅ Sekundární tlačítko: tmavší border

### Test 8.4: Close button hover
- [ ] Najet na křížek pro zavření
- [ ] ✅ Ikona se mírně zvětší (scale 1.1)

---

## 9️⃣ EDGE CASES

### Test 9.1: Import 1 objednávky
- [ ] Vybrat pouze 1 objednávku
- [ ] ✅ Funguje stejně jako při více objednávkách
- [ ] ✅ Tlačítko: "Importovat (1)"

### Test 9.2: Import 100+ objednávek
- [ ] Vybrat všechny objednávky (Select All)
- [ ] ✅ Modal se otevře
- [ ] ✅ Import proběhne (může trvat déle)
- [ ] ✅ Výsledky jsou scrollovatelné

### Test 9.3: Duplicitní import
- [ ] Importovat stejné objednávky 2x po sobě
- [ ] ✅ První import: úspěšný
- [ ] ✅ Druhý import: všechny selhají (duplikáty)

### Test 9.4: Párové kliknutí
- [ ] Během importu rychle klikat na "Importovat"
- [ ] ✅ Tlačítko je disabled, druhé kliknutí nemá efekt

---

## 🔟 KONZOLE & LOGY

### Test 10.1: Console errors
- [ ] Otevřít DevTools Console
- [ ] Provést celý import workflow
- [ ] ✅ ŽÁDNÉ červené errory v konzoli
- [ ] ✅ Pouze normální logy (pokud debug mode)

### Test 10.2: Network tab
- [ ] Otevřít DevTools Network
- [ ] Spustit import
- [ ] ✅ Request na `/orders25/import-oldies`
- [ ] ✅ Payload obsahuje správná data
- [ ] ✅ Response je JSON s results
- [ ] ✅ Status 200 OK (nebo jiný validní status)

---

## 📊 SHRNUTÍ TESTOVÁNÍ

**Celkem testů:** 50+  
**Úspěšných:** _____  
**Selhalo:** _____  
**Poznámky:**

_______________________________________________
_______________________________________________
_______________________________________________

---

## ✅ FINÁLNÍ SCHVÁLENÍ

- [ ] Všechny kritické testy prošly
- [ ] UX je intuitivní a srozumitelný
- [ ] Žádné console errory
- [ ] Responsive design funguje
- [ ] Animace jsou smooth
- [ ] Error handling funguje správně

**Schválil:** _____________  
**Datum:** _____________  
**Připraveno k produkci:** [ ] ANO  [ ] NE

---

**Status:** ⏳ ČEKÁ NA TESTOVÁNÍ
