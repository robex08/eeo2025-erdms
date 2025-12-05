# TEST CHECKLIST - Refactoring Unlock States

## ✅ KOMPILACE A SYNTAX
- [x] No ESLint errors
- [x] No TypeScript errors
- [x] Aplikace se kompiluje bez chyb

## 🔍 KÓD REVIEW - COMPLETED

### useWorkflowManager
- [x] useState unlockedSections existuje
- [x] unlockSection() metoda implementována
- [x] lockSection() metoda implementována
- [x] isSectionUnlocked() metoda implementována
- [x] resetAllUnlocks() metoda implementována
- [x] getAllSectionStates() používá internal unlockedSections
- [x] Export API obsahuje nové metody

### OrderForm25.js
- [x] Všechny local unlock states odstraněny
- [x] unlockStates objekt odstraněn
- [x] getAllSectionStates() volání bez parametrů
- [x] Save handlery používají resetAllUnlocks()
- [x] Unlock dialogy používají unlockSection()
- [x] Lock konstanty správně definované:
  - [x] isPotvrzeniLocked
  - [x] isRegistrLocked
  - [x] isFakturaceLockedPhase7
  - [x] isVecnaSpravnostLocked
  - [x] isDokonceniLocked
- [x] Všechny disabled atributy používají správné lock states

## 🧪 FUNKČNÍ TESTY - TODO

### FÁZE 1 - Vytvoření objednávky (NOVA)
- [ ] Všechna pole editovatelná
- [ ] Uložení → přechod do FÁZE 2

### FÁZE 2 - Ke schválení (ODESLANA_KE_SCHVALENI)
- [ ] FÁZE 1 sekce zamčené (disabled)
- [ ] Checkboxy schválení odemčené
- [ ] Schváleno/Neschváleno/Čeká se funguje
- [ ] Po zaškrtnutí "Schváleno" → přechod do FÁZE 3

### FÁZE 3 - Schválená (SCHVALENA)
- [ ] FÁZE 1-2 zamčené
- [ ] Financování editovatelné
- [ ] Po uložení → přechod do FÁZE 4

### FÁZE 4 - Potvrzení + Registr smluv (ODESLANA → POTVRZENA/UVEREJNIT/NEUVEREJNIT)
**KRITICKÁ SEKCE - HLAVNÍ ZMĚNY!**

#### Potvrzení dodavatele:
- [ ] Radio ANO/NE editovatelné
- [ ] ANO → automaticky nastaví dodavatel_potvrdil_id
- [ ] ANO → zobrazí způsoby potvrzení (telefon, email, etc.)
- [ ] ANO → přechod na POTVRZENA
- [ ] NE → přechod na ???

#### Registr smluv (checkbox):
- [ ] Checkbox "Má být zveřejněna" viditelný
- [ ] Info text o 50K zobrazený
- [ ] Zaškrtnutí → přechod na UVEREJNIT (FÁZE 5)
- [ ] Odškrtnutí → přechod na NEUVEREJNIT (skip FÁZE 5)
- [ ] Při odškrtnutí → confirm dialog
- [ ] Info box "Čeká se na zveřejnění" skrytý ve FÁZI 4

#### Zamčení FÁZE 4 po přechodu do FÁZE 5+:
- [ ] Po uložení FÁZE 5+ → sekce Potvrzení zamčená
- [ ] Po uložení FÁZE 5+ → sekce Registr (checkbox) zamčená
- [ ] Ikona zámku 🔒 zobrazena
- [ ] Tlačítko "Odemknout" viditelné (pokud má práva)

#### Odemčení FÁZE 4:
- [ ] Klik na tlačítko "Odemknout" u Potvrzení → confirm dialog
- [ ] Potvrzení dialogu → workflowManager.unlockSection('potvrzeni')
- [ ] Potvrzení dialogu → workflowManager.unlockSection('registr')
- [ ] Sekce odemčené → pole editovatelná
- [ ] Workflow vrácen na ODESLÁNA
- [ ] Klik na tlačítko "Odemknout" u Registru → stejná logika
- [ ] Tlačítko "Upravit fázi 4" → stejná logika

#### Auto-lock po save:
- [ ] Změna ANO→NE v Potvrzení
- [ ] Uložení (Ctrl+S nebo autosave)
- [ ] workflowManager.resetAllUnlocks() zavolán
- [ ] Sekce opět zamčeny

### FÁZE 5 - Registr smluv vyplnění (UVEREJNIT)
**ZOBRAZÍ SE POUZE KDYŽ ma_byt_zverejnena = true**

- [ ] Sekce "Rozhodnutí o zveřejnění" zobrazena
- [ ] Checkbox "Má být zveřejněna" viditelný (read-only/locked)
- [ ] Datum zveřejnění editovatelné
- [ ] Identifikátor (IDDT) editovatelné
- [ ] Checkbox "Zveřejněna v registru smluv" editovatelný
- [ ] Po zaškrtnutí → přechod na UVEREJNENA (FÁZE 6)
- [ ] Info box "Čeká se na zveřejnění" zobrazený
- [ ] Odemčení → workflowManager.unlockSection('registr_vyplneni')

### FÁZE 6 - Fakturace (FAKTURACE)
- [ ] Sekce Fakturace editovatelná
- [ ] Tlačítko "Přidat fakturu" funkční
- [ ] Po zaškrtnutí "Potvrzuji přijatí faktury" → KONTROLA (FÁZE 7)
- [ ] Zamčení po přechodu do FÁZE 7+
- [ ] Odemčení → workflowManager.unlockSection('fakturace')
- [ ] Auto-lock po save → workflowManager.resetAllUnlocks()

### FÁZE 7 - Kontrola (KONTROLA)
- [ ] Čekání na ZKONTROLOVANA stav

### FÁZE 8 - Věcná správnost (ZKONTROLOVANA)
- [ ] Sekce Věcná správnost editovatelná
- [ ] Checkbox "Potvrzuji věcnou správnost" funguje
- [ ] Po zaškrtnutí → DOKONCENA (FÁZE 9)
- [ ] Zamčení po přechodu do FÁZE 9
- [ ] Odemčení → workflowManager.unlockSection('vecna_spravnost')
- [ ] Odemčení → skryje sekci Dokončení
- [ ] Odemčení → zruší checkbox Dokončení
- [ ] Auto-lock po save → workflowManager.resetAllUnlocks()

### FÁZE 9 - Dokončení (DOKONCENA)
**ZOBRAZÍ SE POUZE KDYŽ isVecnaSpravnostLocked**

- [ ] Sekce Dokončení zobrazena
- [ ] Checkbox "Potvrzuji dokončení" editovatelný
- [ ] Po zaškrtnutí → dokončeno
- [ ] Zamčení po uložení
- [ ] Odemčení → workflowManager.unlockSection('dokonceni')
- [ ] Auto-lock po save → workflowManager.resetAllUnlocks()

## 🔄 CROSS-PHASE TESTY

### Unlock state persistence:
- [ ] Odemčení sekce
- [ ] Refresh stránky (F5)
- [ ] ❌ Sekce opět zamčená (unlock states jsou POUZE in-memory!)

### Reset unlock states po save:
- [ ] Odemčení FÁZE 4
- [ ] Změna hodnoty
- [ ] Save (Ctrl+S)
- [ ] ✅ workflowManager.resetAllUnlocks() zavolán
- [ ] Sekce opět zamčeny

### Collapse/Expand:
- [ ] Klik "Sbalit vše" → pouze zamčené sekce collapsed
- [ ] Odemčené sekce zůstanou expanded
- [ ] Sekce "registr_smluv" NIKDY nesbalovat

### ScrollToSection:
- [ ] Scroll na zamčenou sekci → varování
- [ ] Scroll na odemčenou sekci → funguje

## 🐛 ZNÁMÉ PROBLÉMY
- Žádné (zatím)

## 📝 POZNÁMKY
- Unlock states jsou POUZE in-memory (session storage)
- Po refresh jsou všechny sekce opět zamčeny podle phase
- workflowManager.resetAllUnlocks() se volá po KAŽDÉM save
- Unlock dialogy VŽDY odemknou OBOJE sekce (potvrzeni + registr) ve FÁZI 4
