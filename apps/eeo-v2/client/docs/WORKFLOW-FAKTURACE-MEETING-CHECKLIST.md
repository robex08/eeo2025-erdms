# ✅ FAKTURACE - Meeting Checklist

> **Pro:** Týmová schůzka / Rozhodovací meeting  
> **Datum:** 26. října 2025  
> **Čas:** ~30 minut  
> **Účastníci:** PM, BE Lead, FE Lead

---

## 📋 AGENDA MEETINGU

### 1. Rychlá rekapitulace (5 min)
- [ ] Představení problému - potřeba workflow fakturace
- [ ] Ukázat obrázek z příloh (bod 7 - Fakturace)
- [ ] DB tabulka připravena, BE připravuje SQL
- [ ] FE má sekci připravenou (zatím skrytou)

### 2. Klíčová rozhodnutí (15 min)

#### ❓ OTÁZKA 1: Kdy zobrazit sekci fakturace?

**Varianta A: Po potvrzení dodavatele** ⭐
- Stavy: `POTVRZENA`, `DOKONCENA`
- ✅ Logický flow podle obrázku
- ❌ Méně flexibilní

**Varianta B: Po odeslání objednávky**
- Stavy: `CEKA_POTVRZENI`, `POTVRZENA`, `ROZPRACOVANA`, `DOKONCENA`
- ✅ Flexibilnější
- ❌ Méně přísný workflow

**→ HLASOVÁNÍ:** _________

---

#### ❓ OTÁZKA 2: Více faktur k jedné objednávce?

- [ ] **ANO** - Seznam faktur (DB tabulka podporuje) ⭐
- [ ] **NE** - Pouze jedna faktura

**→ ROZHODNUTÍ:** _________

---

#### ❓ OTÁZKA 3: Validace částky faktury?

**Když `fa_castka > max_cena_s_dph`:**

- [ ] **WARNING** - Upozornění, ale lze uložit ⭐
- [ ] **ERROR** - Chyba, nelze uložit

**→ ROZHODNUTÍ:** _________

---

#### ❓ OTÁZKA 4: Kdo může přidávat/editovat faktury?

- [ ] **Autor + Garant + Admin** ⭐
- [ ] **Kdokoliv s přístupem k objednávce**
- [ ] **Pouze autor objednávky**

**→ ROZHODNUTÍ:** _________

---

### 3. Časové odhady a plán (5 min)

- [ ] **Backend:** 4-6 hodin (4 endpointy + testování)
- [ ] **Frontend:** 8-10 hodin (komponenty + integrace)
- [ ] **CELKEM:** 12-16 hodin

**Kdy můžeme začít?**
- Backend: _________
- Frontend: _________

**Deadline?**
- _________

---

### 4. Rozdělení úkolů (5 min)

#### Backend tým:
- [ ] Implementovat `POST /faktury/list`
- [ ] Implementovat `POST /faktury/create`
- [ ] Implementovat `POST /faktury/update`
- [ ] Implementovat `POST /faktury/delete`
- [ ] Otestovat v Postman
- [ ] Informovat FE tým o dokončení

**Zodpovědná osoba:** _________

---

#### Frontend tým:
- [ ] Počkat na dokončení BE endpointů
- [ ] Implementovat API funkce (`api25orders.js`)
- [ ] Vytvořit validační utils (`fakturaValidation.js`)
- [ ] Vytvořit komponenty (Form, Card, List)
- [ ] Integrovat do `OrderForm25.js`
- [ ] Otestovat workflow

**Zodpovědná osoba:** _________

---

#### QA tým:
- [ ] Připravit testovací scénáře
- [ ] Otestovat všechny endpointy
- [ ] Otestovat UI komponenty
- [ ] Otestovat celý workflow
- [ ] Edge cases (prázdný seznam, chyby, oprávnění)

**Zodpovědná osoba:** _________

---

## 📊 RYCHLÝ PŘEHLED

### Co MÁME:
✅ DB tabulka `25a_objednavky_faktury`  
✅ Backend připravuje SQL  
✅ Frontend sekce připravena (skryta)  
✅ Kompletní dokumentace  

### Co ZBÝVÁ:
🔴 Rozhodnout workflow pravidla (tento meeting!)  
🟡 Backend implementovat endpointy  
🟢 Frontend aktivovat a propojit  
🔵 Otestovat celý workflow  

---

## 📝 VÝSTUPY Z MEETINGU

### Rozhodnutí:

1. **Kdy zobrazit sekci?**
   - [ ] Varianta A (POTVRZENA+)
   - [ ] Varianta B (CEKA_POTVRZENI+)
   - Poznámka: _________

2. **Více faktur?**
   - [ ] ANO
   - [ ] NE
   - Poznámka: _________

3. **Validace částky?**
   - [ ] Warning
   - [ ] Error
   - Poznámka: _________

4. **Oprávnění?**
   - [ ] Autor + Garant + Admin
   - [ ] Kdokoliv
   - [ ] Pouze autor
   - Poznámka: _________

### Časový plán:

- **Backend start:** _________
- **Backend deadline:** _________
- **Frontend start:** _________
- **Frontend deadline:** _________
- **QA start:** _________
- **Deploy do produkce:** _________

### Zodpovědnosti:

- **Backend:** _________
- **Frontend:** _________
- **QA:** _________
- **PM (oversight):** _________

---

## 🔗 ODKAZY NA DOKUMENTACI

Před implementací si přečtěte:

1. **`WORKFLOW-FAKTURACE-INDEX.md`** - Index všech dokumentů
2. **`WORKFLOW-FAKTURACE-QUICK.md`** - Rychlý přehled
3. **`WORKFLOW-FAKTURACE-TECH-SPEC.md`** - Detailní kód pro implementaci
4. **`WORKFLOW-FAKTURACE-DIAGRAMS.md`** - Vizuální diagramy

---

## 📞 DALŠÍ KROKY PO MEETINGU

- [ ] Zaslat zápis z meetingu všem účastníkům
- [ ] Vytvořit tasks v project managementu (Jira/Trello/...)
- [ ] Backend tým může začít implementovat
- [ ] Frontend tým připravit strukturu komponent
- [ ] QA tým připravit testovací scénáře
- [ ] Naplánovat code review
- [ ] Naplánovat demo po dokončení

---

## 🎯 SUCCESS CRITERIA

Projekt bude považován za dokončený, když:

- ✅ Všechny 4 backend endpointy fungují
- ✅ Frontend komponenty jsou implementované
- ✅ Sekce fakturace se zobrazuje podle pravidel
- ✅ Lze přidat/upravit/smazat fakturu
- ✅ Validace funguje správně
- ✅ Všechny testy prošly (unit, integration, E2E)
- ✅ Code review dokončen
- ✅ Demo proběhlo úspěšně
- ✅ Dokumentace aktualizována

---

**Meeting checklist připraven! ✅**

**Datum meetingu:** _________  
**Čas:** _________  
**Místnost/Zoom:** _________
