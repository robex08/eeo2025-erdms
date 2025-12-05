# ✅ Checklist pro testování PDF generování

## 📋 Před testováním

- [ ] Zkontroluj, že `@react-pdf/renderer` je nainstalován (`npm list @react-pdf/renderer`)
- [ ] Ujisti se, že jsou všechny soubory správně naimportované
- [ ] Otevři aplikaci v prohlížeči a přihlaš se

## 🧪 Základní testy

### Test 1: Generování prázdného PDF
**Účel:** Zkontrolovat, že PDF se vůbec vygeneruje

- [ ] Otevři stránku s pokladní knihou
- [ ] Klikni na tlačítko "Export PDF"
- [ ] PDF by se mělo stáhnout
- [ ] Otevři PDF a zkontroluj:
  - [ ] Hlavička se zobrazí (POKLADNÍ KNIHA)
  - [ ] Souhrn se zobrazí (všechny 4 hodnoty)
  - [ ] Tabulka má hlavičku se všemi sloupci

### Test 2: Kontrola diakritiky
**Účel:** Ověřit, že české znaky se zobrazují správně

Zkontroluj v PDF tyto části:
- [ ] Hlavička: "POKLADNÍ KNIHA" (ne "POKLADNI KNIHA")
- [ ] Souhrn: "Převod z předchozího měsíce:" (ne "Prevod...")
- [ ] Tabulka hlavička: "Doklad č." (ne "Doklad c.")
- [ ] Symbol měny: "Kč" (ne "K " nebo jiné znaky)

### Test 3: Kontrola tabulky
**Účel:** Ověřit správné zobrazení dat v tabulce

- [ ] Všechny sloupce jsou viditelné
- [ ] Čísla jsou zarovnána doprava (Příjmy, Výdaje, Zůstatek)
- [ ] Text je zarovnán doleva (Obsah zápisu, Komu/Od koho, Poznámka)
- [ ] Střídavé barvy řádků (šedá/bílá)
- [ ] Příjmy jsou zelené
- [ ] Výdaje jsou červené
- [ ] Zůstatek je modrý

### Test 4: Dlouhý text v buňkách
**Účel:** Zkontrolovat zalamování textu

Vytvoř záznam s dlouhým textem:
- [ ] V poli "Obsah zápisu" zadej dlouhý text (50+ znaků)
- [ ] Vygeneruj PDF
- [ ] Zkontroluj, že se text zalomil a nevytéká z buňky

### Test 5: Více stránek
**Účel:** Ověřit správné stránkování

- [ ] Přidej 30+ záznamů do pokladní knihy
- [ ] Vygeneruj PDF
- [ ] Zkontroluj:
  - [ ] PDF má více stránek
  - [ ] Patička se zobrazuje na každé stránce
  - [ ] Číslo stránky se správně inkrementuje (Strana 1 z 3, Strana 2 z 3, ...)
  - [ ] Hlavička tabulky se opakuje na každé stránce

### Test 6: Prázdné hodnoty
**Účel:** Zkontrolovat chování při prázdných polích

Vytvoř záznam s prázdnými poli:
- [ ] Některá pole nech prázdná
- [ ] Vygeneruj PDF
- [ ] Zkontroluj, že se v PDF nezobrazuje "undefined" nebo "null"

### Test 7: Záporné hodnoty
**Účel:** Ověřit zobrazení záporných čísel

- [ ] Vytvoř situaci se záporným zůstatkem
- [ ] Vygeneruj PDF
- [ ] Zkontroluj, že záporná hodnota je červená

## 🔧 Pokročilé testy

### Test 8: Výkon
**Účel:** Zkontrolovat rychlost generování

- [ ] Přidej 100+ záznamů
- [ ] Změř čas generování (console.time/console.timeEnd)
- [ ] PDF by se mělo vygenerovat do 5 sekund

### Test 9: Různé prohlížeče
**Účel:** Zajistit cross-browser kompatibilitu

Test ve třech prohlížečích:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (pokud je dostupný)

### Test 10: Mobilní zařízení
**Účel:** Ověřit funkčnost na mobilu

- [ ] Otevři aplikaci na mobilním zařízení
- [ ] Vygeneruj PDF
- [ ] Zkontroluj, že se PDF správně stáhlo

### Test 11: Offline režim
**Účel:** Zkontrolovat závislost na internetu

⚠️ **POZOR:** Momentálně jsou fonty načítány z CDN, takže offline nefunguje!

- [ ] Odpoj internet
- [ ] Vygeneruj PDF
- [ ] Pokud nefunguje, implementuj lokální fonty (viz dokumentace)

## 🐛 Časté problémy a řešení

### Problém: PDF se nestahuje
**Řešení:**
1. Otevři konzoli prohlížeče (F12)
2. Hledej chybové hlášky
3. Zkontroluj, že jsou fonty načtené (Network tab)

### Problém: Špatná diakritika
**Řešení:**
1. Zkontroluj, že je font zaregistrován (před renderováním)
2. Ověř, že všechny styly používají `fontFamily: 'Roboto'`
3. Zkus použít jiný font (Noto Sans)

### Problém: Text přetéká z buněk
**Řešení:**
1. Zkontroluj, že každý sloupec má definovanou `width`
2. Ujisti se, že součet šířek je ≤ 100%
3. Zmenši velikost fontu

### Problém: Patička se nepřekrývá s obsahem
**Řešení:**
1. Zkontroluj `paddingBottom` na stránce (min. 60)
2. Ujisti se, že patička má `position: 'absolute'`

### Problém: Čísla nejsou zarovnaná doprava
**Řešení:**
1. Zkontroluj, že styl obsahuje `textAlign: 'right'`
2. Ujisti se, že se styl aplikuje na správný sloupec

## 📊 Výsledky testování

**Datum testu:** _________________  
**Tester:** _________________  
**Prostředí:** _________________

| Test | Výsledek | Poznámka |
|------|----------|----------|
| 1. Generování prázdného PDF | ⬜ Pass / ⬜ Fail | |
| 2. Kontrola diakritiky | ⬜ Pass / ⬜ Fail | |
| 3. Kontrola tabulky | ⬜ Pass / ⬜ Fail | |
| 4. Dlouhý text v buňkách | ⬜ Pass / ⬜ Fail | |
| 5. Více stránek | ⬜ Pass / ⬜ Fail | |
| 6. Prázdné hodnoty | ⬜ Pass / ⬜ Fail | |
| 7. Záporné hodnoty | ⬜ Pass / ⬜ Fail | |
| 8. Výkon | ⬜ Pass / ⬜ Fail | Čas: _____ s |
| 9. Různé prohlížeče | ⬜ Pass / ⬜ Fail | |
| 10. Mobilní zařízení | ⬜ Pass / ⬜ Fail | |
| 11. Offline režim | ⬜ Pass / ⬜ Fail | |

## 📝 Poznámky

_____________________________________________
_____________________________________________
_____________________________________________
_____________________________________________

## ✅ Finální schválení

- [ ] Všechny testy prošly
- [ ] Diakritika funguje správně
- [ ] Layout je správný
- [ ] PDF je čitelný
- [ ] Výkon je přijatelný

**Schváleno:** ⬜ ANO / ⬜ NE  
**Podpis:** _________________  
**Datum:** _________________
