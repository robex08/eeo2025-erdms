# 📚 FAKTURACE - Index dokumentace

> **Datum:** 26. října 2025  
> **Projekt:** r-app-zzs-eeo-25  
> **Téma:** Implementace workflow fakturace k objednávkám

---

## 📋 OBSAH DOKUMENTACE

Kompletní dokumentace k implementaci systému fakturace je rozdělena do následujících dokumentů:

### 1️⃣ **WORKFLOW-FAKTURACE-QUICK.md** 🚀
**Rychlý přehled pro okamžité rozhodnutí**

- ⏱️ **Čas čtení:** 5-10 minut
- 🎯 **Účel:** Rychlé zorientování, klíčová rozhodnutí
- 📊 **Obsah:**
  - Současný stav (co máme, co zbývá)
  - Vizualizace workflow
  - Klíčová rozhodnutí k diskusi
  - Backend & Frontend TODO
  - Časové odhady

**Čti nejdřív, pokud:**
- ✅ Potřebuješ rychlý přehled
- ✅ Chceš vidět workflow diagram
- ✅ Hledáš otázky k rozhodnutí

---

### 2️⃣ **WORKFLOW-FAKTURACE-NAVRH.md** 📖
**Kompletní návrh workflow a funkcionality**

- ⏱️ **Čas čtení:** 15-20 minut
- 🎯 **Účel:** Detailní popis návrhu, diskusní podklad
- 📊 **Obsah:**
  - Aktuální stav (DB tabulka, backend, frontend)
  - Návrh workflow (kdy se fakturace zobrazuje)
  - Struktura dat faktury
  - UI komponenty a chování
  - Validace a pravidla
  - Backend API endpointy (přehled)
  - Frontend implementace (přehled)
  - Postupné kroky implementace
  - Vizuální návrh podle obrázku
  - Otázky k rozhodnutí

**Čti, pokud:**
- ✅ Chceš pochopit celkový koncept
- ✅ Potřebuješ diskusní podklad
- ✅ Hledáš odpovědi "proč" a "jak"

---

### 3️⃣ **WORKFLOW-FAKTURACE-TECH-SPEC.md** 🔧
**Detailní technická specifikace s kódem**

- ⏱️ **Čas čtení:** 30-45 minut
- 🎯 **Účel:** Přesná implementační příručka
- 📊 **Obsah:**
  - Struktura projektu (nové/upravené soubory)
  - Backend API specifikace
    - PHP kód pro všechny 4 endpointy
    - SQL queries s komentáři
  - Frontend API service
    - Kompletní JavaScript kód
  - Validace faktur (utils)
  - Frontend komponenty
    - FakturaForm.js (kompletní kód)
    - FakturaCard.js (kompletní kód)
    - FakturyList.js (kompletní kód)
  - Integrace do OrderForm25.js
  - Testovací scénáře
  - Checklist implementace

**Čti, pokud:**
- ✅ Implementuješ backend
- ✅ Implementuješ frontend
- ✅ Potřebuješ přesný kód
- ✅ Chceš zkopírovat a upravit

---

### 4️⃣ **WORKFLOW-FAKTURACE-DIAGRAMS.md** 📊
**Vizuální diagramy a flow charts**

- ⏱️ **Čas čtení:** 10-15 minut
- 🎯 **Účel:** Vizuální pochopení workflow
- 📊 **Obsah:**
  - Diagram 1: Životní cyklus objednávky s fakturací
  - Diagram 2: Flow práce s fakturami (user flow)
  - Diagram 3: Backend API flow
  - Diagram 4: Datový model a vztahy
  - Diagram 5: Oprávnění a přístupy
  - Diagram 6: Stavový diagram faktury
  - Diagram 7: UI States

**Čti, pokud:**
- ✅ Jsi vizuální typ
- ✅ Potřebuješ pochopit flow
- ✅ Chceš vidět souvislosti
- ✅ Prezentuješ koncept týmu

---

## 🎯 DOPORUČENÉ ČTENÍ PODLE ROLE

### 👔 **Product Owner / Project Manager**
1. `WORKFLOW-FAKTURACE-QUICK.md` - Rychlý přehled
2. `WORKFLOW-FAKTURACE-NAVRH.md` - Návrh k diskusi
3. `WORKFLOW-FAKTURACE-DIAGRAMS.md` - Vizualizace

### 💻 **Backend Developer**
1. `WORKFLOW-FAKTURACE-QUICK.md` - Rychlý přehled
2. `WORKFLOW-FAKTURACE-TECH-SPEC.md` (Backend sekce) - PHP kód
3. `WORKFLOW-FAKTURACE-DIAGRAMS.md` (Diagram 3, 4) - API flow, DB

### 🎨 **Frontend Developer**
1. `WORKFLOW-FAKTURACE-QUICK.md` - Rychlý přehled
2. `WORKFLOW-FAKTURACE-TECH-SPEC.md` (Frontend sekce) - React komponenty
3. `WORKFLOW-FAKTURACE-DIAGRAMS.md` (Diagram 2, 7) - User flow, UI states

### 🧪 **QA Tester**
1. `WORKFLOW-FAKTURACE-QUICK.md` - Rychlý přehled
2. `WORKFLOW-FAKTURACE-DIAGRAMS.md` - Všechny diagramy
3. `WORKFLOW-FAKTURACE-TECH-SPEC.md` (Testování) - Testovací scénáře

### 🎓 **Nový člen týmu**
1. `WORKFLOW-FAKTURACE-NAVRH.md` - Pochopení konceptu
2. `WORKFLOW-FAKTURACE-DIAGRAMS.md` - Vizuální pochopení
3. `WORKFLOW-FAKTURACE-QUICK.md` - Rychlá referenční příručka

---

## 📊 SOUČASNÝ STAV

### ✅ Co je HOTOVO:
- ✅ Databázová tabulka `25a_objednavky_faktury` vytvořena
- ✅ Frontend sekce připravena (aktuálně skryta)
- ✅ Backend připravuje SQL
- ✅ Kompletní dokumentace připravena

### 🔧 Co ZBÝVÁ:
1. **ROZHODNOUT** workflow otázky (viz Quick dokumenty)
2. **BACKEND** - Implementovat 4 API endpointy
3. **FRONTEND** - Aktivovat a propojit s BE
4. **TESTOVÁNÍ** - Kompletní testování workflow

---

## 🗂️ DATABÁZOVÁ STRUKTURA

### Tabulka: `25a_objednavky_faktury`

```sql
Pole:
- id                    INT(10)       PK
- objednavka_id         INT(10)       FK → 25a_objednavky
- fa_dorucena           TINYINT(1)    0=NE, 1=ANO
- fa_castka             DECIMAL(15,2) REQUIRED
- fa_cislo_vema         VARCHAR(100)  REQUIRED
- fa_stredisko          VARCHAR(255)  OPTIONAL
- fa_poznamka           TEXT          OPTIONAL
- rozsirujici_data      TEXT          JSON
- vytvoril_uzivatel_id  INT(10)       FK → 25_uzivatel
- dt_vytvoreni          DATETIME
- dt_aktualizace        DATETIME
- aktivni               TINYINT(1)    1=aktivní, 0=smazáno

Indexy:
- PRIMARY KEY           (id)
- idx_objednavka        (objednavka_id)
- idx_vytvoril          (vytvoril_uzivatel_id)
- idx_cislo_vema        (fa_cislo_vema)
- idx_aktivni           (aktivni)
```

---

## 🔄 WORKFLOW PRAVIDLA

### Kdy se sekce FAKTURACE zobrazí?

**DOPORUČENO (Varianta A):**
```javascript
stav_schvaleni_kod IN ('POTVRZENA', 'DOKONCENA')
```

**Alternativa (Varianta B):**
```javascript
stav_schvaleni_kod IN ('CEKA_POTVRZENI', 'POTVRZENA', 'ROZPRACOVANA', 'DOKONCENA')
```

### Validace:

✅ **Povinná pole:**
- `fa_cislo_vema` - Číslo Fa/VPD z VEMA
- `fa_castka` - Částka faktury (> 0)

⚠️ **Upozornění (warning):**
- Pokud `fa_castka > max_cena_s_dph` → zobrazit varování, ale povolit uložení

❌ **Nepovinná pole:**
- `fa_dorucena` - checkbox (výchozí: false)
- `fa_stredisko` - text
- `fa_poznamka` - textarea

---

## 🔗 API ENDPOINTY

### Backend API (k implementaci):

```
POST /api.eeo/faktury/list       Seznam faktur k objednávce
POST /api.eeo/faktury/create     Přidat fakturu
POST /api.eeo/faktury/update     Upravit fakturu
POST /api.eeo/faktury/delete     Smazat fakturu (soft delete)
```

### Frontend API (k implementaci):

```javascript
getFaktury25({ token, username, objednavkaId })
createFaktura25({ token, username, fakturaData })
updateFaktura25({ token, username, fakturaId, fakturaData })
deleteFaktura25({ token, username, fakturaId })
```

---

## 🧩 KOMPONENTY

### Nové React komponenty:

```
src/components/
├── FakturaForm.js      Formulář pro přidání/úpravu faktury
├── FakturaCard.js      Karta s detailem faktury
└── FakturyList.js      Seznam všech faktur k objednávce
```

### Upravené soubory:

```
src/forms/OrderForm25.js          Integrace sekce fakturace
src/services/api25orders.js       API funkce pro faktury
src/utils/fakturaValidation.js   Validační funkce [NOVÝ]
```

---

## ⏱️ ČASOVÝ ODHAD

### Backend:
- **4-6 hodin** - Implementace PHP endpointů + testování

### Frontend:
- **8-10 hodin** - Komponenty + integrace + testování

### **CELKEM: 12-16 hodin**

---

## 📋 CHECKLIST

### 🔴 PŘED IMPLEMENTACÍ (ROZHODNOUT):
- [ ] Kdy zobrazit sekci fakturace? (Varianta A/B)
- [ ] Více faktur k jedné objednávce? (ANO)
- [ ] Validace částky? (Warning/Error)
- [ ] Kdo může editovat? (Autor+garant/Kdokoliv)

### 🟡 BACKEND (BE TÝM):
- [ ] Endpoint: `POST /faktury/list`
- [ ] Endpoint: `POST /faktury/create`
- [ ] Endpoint: `POST /faktury/update`
- [ ] Endpoint: `POST /faktury/delete`
- [ ] Testování v Postman/Insomnia
- [ ] Validace dat
- [ ] Error handling

### 🟢 FRONTEND (FE TÝM):
- [ ] API funkce v `api25orders.js`
- [ ] Validační utils `fakturaValidation.js`
- [ ] Komponenta `FakturaForm.js`
- [ ] Komponenta `FakturaCard.js`
- [ ] Komponenta `FakturyList.js`
- [ ] Integrace do `OrderForm25.js`
- [ ] Testování workflow

### 🔵 TESTOVÁNÍ (QA):
- [ ] Unit testy (validace)
- [ ] Integration testy (API)
- [ ] E2E testy (workflow)
- [ ] Manuální testování
- [ ] Edge cases
- [ ] Performance

---

## 💡 TIPY PRO IMPLEMENTACI

### Backend:
1. Začni s `list` endpointem - nejjednodušší
2. Ověř správné JOINy s tabulkou uživatelů
3. Implementuj pořádnou validaci
4. Soft delete je MUST (aktivni=0)
5. Testuj v Postman před předáním FE

### Frontend:
1. Začni API funkcemi - základ všeho
2. Vytvořte komponenty postupně (Form → Card → List)
3. Testuj každou komponentu samostatně
4. Integrace do OrderForm25 až nakonec
5. State management - pozor na re-renders

### Testování:
1. Happy path nejdřív
2. Pak edge cases (prázdný seznam, chyby API)
3. Validace - zkus uložit neplatná data
4. Oprávnění - testuj různé role
5. Performance - více faktur najednou

---

## 🆘 KONTAKT A PODPORA

### Otázky k dokumentaci:
- Autor dokumentace: GitHub Copilot
- Datum: 26. října 2025

### Další dokumenty v projektu:
- `docs/ORDERS25_API_DOCUMENTATION.md` - API objednávek
- `docs/WORKFLOW-FAKTURACE-*.md` - Tato dokumentace

---

## 📝 VERZE DOKUMENTACE

| Verze | Datum | Změny |
|-------|-------|-------|
| 1.0 | 26.10.2025 | Inicializace dokumentace - kompletní návrh |

---

## 🎯 NEXT STEPS

1. **TERAZ** - Přečíst `WORKFLOW-FAKTURACE-QUICK.md`
2. **POTOM** - Rozhodnout klíčové otázky
3. **BACKEND** - Implementovat endpointy
4. **FRONTEND** - Vytvořit komponenty
5. **TEST** - Otestovat workflow
6. **DEPLOY** - Nasadit do produkce

---

**Dokumentace připravena! Můžeme začít implementovat! 🚀**
