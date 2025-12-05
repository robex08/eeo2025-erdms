# 🧪 Test Guide - Nové funkce v seznamu objednávek

## 📋 CHECKLIST PRO TESTOVÁNÍ

### 1️⃣ **Základní zobrazení**
- [ ] Seznam objednávek se načte bez chyb
- [ ] Ikona ➕/➖ pro rozbalení je viditelná
- [ ] Kliknutí na ikonu rozbaleně/sbalí detail

### 2️⃣ **💰 Finanční údaje**
- [ ] **Cena z položek (s DPH)** - zobrazuje se správná částka
- [ ] **Cena z položek (bez DPH)** - zobrazuje se správná částka
- [ ] **Celkem faktur** - součet všech faktur je správný
- [ ] **Počítadlo položek/faktur** - správný počet (📦×3 / 🧾×2)
- [ ] Všechny částky jsou správně formátované (mezery mezi tisíci)

### 3️⃣ **🧾 Faktury**
- [ ] Sekce se zobrazí pokud má objednávka faktury
- [ ] Sekce se **NEzobrazí** pokud objednávka nemá faktury
- [ ] Každá faktura má:
  - [ ] Číslo faktury
  - [ ] Částku (správně formátovanou)
  - [ ] Datum vystavení
  - [ ] Datum splatnosti
  - [ ] Badge se stavem (zelený = Doručena, žlutý = Čeká se)
  - [ ] Poznámku (pokud existuje)
- [ ] **Přílohy faktury**:
  - [ ] Seznam příloh se zobrazí
  - [ ] Název souboru je viditelný
  - [ ] Velikost souboru je správná
  - [ ] Ikona stažení funguje
  - [ ] Kliknutí na ikonu stahuje soubor

### 4️⃣ **📄 Dodatečné dokumenty**
- [ ] Sekce se zobrazí pokud existují dokumenty
- [ ] Sekce se **NEzobrazí** pokud dokumenty neexistují
- [ ] Každý dokument má:
  - [ ] Název souboru
  - [ ] Typ dokumentu (badge)
  - [ ] Datum nahrání
  - [ ] Velikost souboru
  - [ ] Kdo dokument nahrál
  - [ ] Popis (pokud existuje)
- [ ] Ikona stažení funguje

### 5️⃣ **✅ Věcná kontrola**
- [ ] Sekce se zobrazí pokud existuje věcná kontrola
- [ ] **Věcná správnost**:
  - [ ] ✅ Zelená ikona + "Potvrzena" pokud je OK
  - [ ] ❌ Červená ikona + "Nepotvrzena" pokud není
- [ ] **Kompletnost**:
  - [ ] ✅ Zelená ikona + "Kompletní" pokud je OK
  - [ ] ❌ Červená ikona + "Nekompletní" pokud není
- [ ] Jméno osoby co provedla kontrolu
- [ ] Datum kontroly
- [ ] Poznámka (pokud existuje)

### 6️⃣ **📋 Registr smluv**
- [ ] Sekce se zobrazí pokud existuje registr smluv
- [ ] Číslo smlouvy je zobrazeno (monospace font)
- [ ] **URL odkaz**:
  - [ ] Zobrazuje text "Zobrazit v registru"
  - [ ] Kliknutí otevře nové okno
  - [ ] URL je správná
- [ ] Datum zveřejnění
- [ ] **Stav zveřejnění**:
  - [ ] ✅ Zelená ikona + "Zveřejněno" pokud je zveřejněno
  - [ ] ⏳ Žlutá ikona + "Čeká na zveřejnění" pokud čeká

### 7️⃣ **🎯 Fáze dokončení**
- [ ] Sekce se zobrazí pokud existují fáze
- [ ] **Progress bar**:
  - [ ] Zobrazuje správné procento (0-100%)
  - [ ] Modrá výplň odpovídá procentu
  - [ ] Animace je plynulá
- [ ] Název aktivní fáze je zobrazen
- [ ] **Banner dokončení**:
  - [ ] Zobrazí se pokud je `dokonceno === 1`
  - [ ] Zelené pozadí
  - [ ] Ikona ✅
  - [ ] Datum dokončení (pokud existuje)
- [ ] **Seznam fází**:
  - [ ] Hotové fáze = zelená ikona ✅
  - [ ] Aktivní fáze = modrá ikona 🔄 (animovaná)
  - [ ] Čekající fáze = šedá ikona ⏳
  - [ ] Datum dokončení u hotových fází

### 8️⃣ **🎨 Styly a animace**
- [ ] Karty mají správné barvy podle stavu objednávky
- [ ] Hover efekt na kartách funguje (posun vpravo)
- [ ] Ikony jsou správně zobrazené
- [ ] Fonty jsou čitelné
- [ ] Barvy odpovídají schématu:
  - [ ] Zelená pro úspěch
  - [ ] Modrá pro aktivní/odkazy
  - [ ] Žlutá pro varování
  - [ ] Červená pro chyby

### 9️⃣ **📱 Responzivita**
- [ ] Desktop (>1600px) - karty mají optimální šířku
- [ ] Tablet (1200-1600px) - karty se přizpůsobí
- [ ] Mobile (<1200px) - karty se přizpůsobí
- [ ] Faktury a dodatečné dokumenty zabírají 2 sloupce
- [ ] Text se nezalomuje divně
- [ ] Nic nepřetéká mimo okraj

### 🔟 **⚡ Výkon**
- [ ] Seznam se načte rychle
- [ ] Rozbalení detailu je okamžité
- [ ] Žádné lag při scrollování
- [ ] Žádné "blikání" při přepočtech

---

## 🐛 CO TESTOVAT NA CHYBY

### Edge cases:
- [ ] Objednávka **BEZ** faktur → sekce Faktury se nezobrazí
- [ ] Objednávka **BEZ** dodatečných dokumentů → sekce se nezobrazí
- [ ] Objednávka **BEZ** věcné kontroly → sekce se nezobrazí
- [ ] Objednávka **BEZ** registru smluv → sekce se nezobrazí
- [ ] Objednávka **BEZ** fází dokončení → sekce se nezobrazí
- [ ] Prázdné pole položek → správně se zobrazí "---"
- [ ] Null hodnoty → nezpůsobí crash
- [ ] Chybějící enriched data → fallback na základní data

### API:
- [ ] Enriched endpoint se volá správně
- [ ] Fallback na basic endpoint pokud enriched selže
- [ ] Chyby API se správně zobrazí (toast notifikace)

---

## ✅ AKCEPTAČNÍ KRITÉRIA

### Must have:
- ✅ Všechny sekce se zobrazí pokud jsou data
- ✅ Žádná sekce se nezobrazí pokud data nejsou
- ✅ Stahování příloh funguje
- ✅ Odkazy do registru smluv fungují
- ✅ Žádné chyby v konzoli
- ✅ Responzivita na všech zařízeních

### Nice to have:
- ✨ Animace jsou plynulé
- 🎨 Barvy odpovídají stavu objednávky
- 📊 Progress bar je vizuálně atraktivní

---

## 📝 REPORTOVÁNÍ CHYB

Pokud najdete chybu, uveďte:
1. **Co jste dělali** (kroky k reprodukci)
2. **Co jste očekávali** (expected)
3. **Co se stalo** (actual)
4. **Screenshot** (pokud možno)
5. **Console log** (F12 → Console)

---

## 🎯 PRIORITY TESTOVÁNÍ

### 🔴 Kritické (musí fungovat):
1. Zobrazení faktur
2. Stahování příloh
3. Finanční údaje (ceny)
4. Podmíněné zobrazení sekcí

### 🟡 Důležité:
1. Věcná kontrola
2. Registr smluv
3. Fáze dokončení
4. Responzivita

### 🟢 Nice to have:
1. Animace
2. Hover efekty
3. Barevné schéma

---

**Začněte testovat!** 🚀

Pokud najdete cokoli, co nefunguje, dejte vědět. 💪
