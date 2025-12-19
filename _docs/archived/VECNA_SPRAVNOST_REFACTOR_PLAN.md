# PLÁN REFAKTORINGU: Věcná správnost u faktur

**Datum:** 6. prosince 2025  
**Úkol:** RH FAKTURACE 003 - Přesun věcné správnosti ze samostatné sekce pod jednotlivé faktury

---

## 📋 ANALÝZA SOUČASNÉHO STAVU

### Aktuální implementace věcné správnosti v OrderForm25:

#### 1. State proměnné (formData):
- `vecna_spravnost_umisteni_majetku` - textové pole pro umístění majetku
- `vecna_spravnost_poznamka` - poznámka k věcné správnosti
- `potvrzeni_vecne_spravnosti` - boolean checkbox

#### 2. Section visibility:
- `vecna_spravnost: false` - samostatná sekce (řádek 4061)
- Sekce je viditelná od FÁZE 7 (VECNA_SPRAVNOST workflow stav)

#### 3. Workflow logika:
- FÁZE 7: VECNA_SPRAVNOST - čeká na kontrolu
- FÁZE 8: ZKONTROLOVANA - po potvrzení věcné správnosti
- Po zaškrtnutí checkboxu `potvrzeni_vecne_spravnosti` se přidá stav `ZKONTROLOVANA`

#### 4. Oprávnění:
- Přístup mají: objednatel, garant, schvalovatel, příkazce, ORDER_MANAGE, ADMIN

---

## 🎯 POŽADOVANÁ ZMĚNA

### Co odstranit:
1. ❌ Samostatnou sekci "Věcná správnost" (celý blok kódu)
2. ❌ State proměnné na úrovni objednávky:
   - `vecna_spravnost_umisteni_majetku`
   - `vecna_spravnost_poznamka`  
   - `potvrzeni_vecne_spravnosti` (z úrovně objednávky)

### Co přidat:
1. ✅ Věcná správnost **U KAŽDÉ FAKTURY** zvlášť
2. ✅ Nová pole v DB tabulce `25a_objednavky_faktury`:
   - `fa_vecna_spravnost_potvrzena` (TINYINT) - checkbox pro danou fakturu
   - `fa_vecna_spravnost_potvrdil_id` (INT) - kdo potvrdil
   - `fa_vecna_spravnost_dt_potvrzeni` (DATETIME) - kdy potvrzeno

3. ✅ UI změny:
   - Pod každou fakturou v seznamu zobrazit řádek s checkboxem "Potvrzuji věcnou správnost"
   - Aktivní pouze pokud je objednávka ve stavu `VECNA_SPRAVNOST`
   - Zobrazení info kdo a kdy potvrdil

4. ✅ Validace při uložení:
   - **VŠECHNY** faktury musí mít zaškrtnutou věcnou správnost
   - Pokud není u všech → nelze uložit → chybová hláška
   - Po úspěšném uložení → automatický přechod do stavu `ZKONTROLOVANA`

---

## 🔍 KLÍČOVÁ MÍSTA V KÓDU

### A. Načítání faktur z DB (číslo řádku přibližně 6107-6108):
```javascript
vecna_spravnost_umisteni_majetku: dbOrder.vecna_spravnost_umisteni_majetku || '',
vecna_spravnost_poznamka: dbOrder.vecna_spravnost_poznamka || '',
```
→ **Akce:** Načítat nová pole u každé faktury

### B. Ukládání do DB (číslo řádku přibližně 8581-8582):
```javascript
orderData.vecna_spravnost_umisteni_majetku = formData.vecna_spravnost_umisteni_majetku || '';
orderData.vecna_spravnost_poznamka = formData.vecna_spravnost_poznamka || '';
```
→ **Akce:** Ukládat pole u každé faktury zvlášť

### C. Workflow přechody (číslo řádku přibližně 8113-8114):
```javascript
const hasVecnaSpravnost = hasWorkflowState(newWorkflowState, 'VECNA_SPRAVNOST');
const hadVecnaSpravnost = oldWorkflowState ? hasWorkflowState(oldWorkflowState, 'VECNA_SPRAVNOST') : false;
```
→ **Akce:** Validovat že všechny faktury mají potvrzenou věcnou správnost před přechodem na ZKONTROLOVANA

### D. UI Sekce věcná správnost (řádek ??? - najít):
```javascript
// ✅ SEKCE: VĚCNÁ SPRÁVNOST - FÁZE 7
```
→ **Akce:** Odstranit celou sekci, uložit kód do backup souboru

---

## 📝 IMPLEMENTAČNÍ KROKY

### KROK 1: Git záloha před začátkem
```bash
git add -A
git commit -m "RH FAKTURACE 003: Backup před refaktoringem věcné správnosti"
git push origin main
```

### KROK 2: Vytvoření backup souboru se současným kódem věcné správnosti
- Najít a zkopírovat celou sekci věcné správnosti
- Uložit do `BACKUP_VECNA_SPRAVNOST_SECTION.js`

### KROK 3: Odstranění staré sekce věcné správnosti
- Odstranit z `allSectionStates.vecna_spravnost`
- Odstranit state proměnné na úrovni objednávky
- Odstranit UI sekci věcné správnosti

### KROK 4: Přidání polí k fakturám
- Rozšířit strukturu faktury o nová pole
- Implementovat načítání z DB
- Implementovat ukládání do DB

### KROK 5: UI komponenta pro věcnou správnost u faktury
- Vytvořit komponentu inspirovanou InvoiceEvidencePage readonly zobrazením
- Checkbox pro potvrzení
- Zobrazení kdo a kdy potvrdil

### KROK 6: Validace při uložení
- Kontrola že všechny faktury mají potvrzenu věcnou správnost
- Error handling a zobrazení chyb
- Automatický přechod workflow do ZKONTROLOVANA

### KROK 7: Testování
- Test workflow: FAKTURACE → VECNA_SPRAVNOST → ZKONTROLOVANA
- Test validace (nepůjde uložit bez potvrzení všech faktur)
- Test oprávnění (správní uživatelé mohou potvrdit)

### KROK 8: Git commit po dokončení
```bash
git add -A
git commit -m "RH FAKTURACE 003: Refaktoring věcné správnosti - přesun pod faktury"
git push origin main
```

---

## ⚠️ RIZIKA A OPATRNOST

1. **Workflow flow nesmí být rozbito** - důkladně testovat přechody mezi stavy
2. **Validace musí být konzistentní** - stejná logika jako dříve, jen na úrovni faktur
3. **Zpětná kompatibilita** - staré objednávky s již potvrzenou věcnou správností na úrovni objednávky
4. **Oprávnění** - respektovat stávající permission systém
5. **Git zálohy** - po každém větším kroku

---

## 🔄 PRŮBĚŽNÉ GIT ZÁLOHY

- [ ] Záloha před začátkem
- [ ] Záloha po odstranění staré sekce
- [ ] Záloha po přidání polí k fakturám
- [ ] Záloha po implementaci UI
- [ ] Záloha po dokončení validace
- [ ] Finální záloha

---

## ✅ CHECKLIST DOKONČENÍ

- [ ] Stará sekce věcné správnosti odstraněna
- [ ] Backup kód uložen
- [ ] Nová pole u faktur implementována
- [ ] UI komponenta funguje
- [ ] Validace funguje správně
- [ ] Workflow přechody fungují
- [ ] Oprávnění respektována
- [ ] Git zálohy provedeny
- [ ] Testování úspěšné

