# 📚 DOKUMENTACE WORKFLOW FAKTURACE

> **Projekt:** r-app-zzs-eeo-25  
> **Téma:** Systém fakturace k objednávkám  
> **Datum:** 26. října 2025  
> **Status:** ✅ Dokumentace připravena → 🔧 Čeká na implementaci

---

## 🎯 CO TO JE?

Kompletní dokumentace pro implementaci workflow **fakturace k objednávkám**. Systém umožní přidávat, upravovat a spravovat faktury přímo v detailu objednávky podle obrázku v přílohách (bod 7 - Fakturace).

---

## 📦 DATABÁZE

### Tabulka: `25a_objednavky_faktury`

| Pole | Typ | Popis |
|------|-----|-------|
| `id` | INT | Primary key |
| `objednavka_id` | INT | FK → 25a_objednavky |
| `fa_dorucena` | TINYINT | Faktura doručena (0/1) |
| `fa_castka` | DECIMAL | **Částka faktury** (POVINNÉ) |
| `fa_cislo_vema` | VARCHAR | **Číslo Fa/VPD** (POVINNÉ) |
| `fa_stredisko` | VARCHAR | Středisko (volitelné) |
| `fa_poznamka` | TEXT | Poznámka (volitelné) |
| `rozsirujici_data` | TEXT | JSON pro rozšíření |
| `vytvoril_uzivatel_id` | INT | FK → 25_uzivatel |
| `dt_vytvoreni` | DATETIME | Kdy vytvořeno |
| `dt_aktualizace` | DATETIME | Poslední úprava |
| `aktivni` | TINYINT | Soft delete (1/0) |

---

## 📖 DOKUMENTY

### 🚀 START HERE

#### [`WORKFLOW-FAKTURACE-INDEX.md`](./WORKFLOW-FAKTURACE-INDEX.md)
**→ ZAČNI TADY! Index všech dokumentů**
- Přehled všech dokumentů
- Doporučené čtení podle role
- Quick links

---

### 📋 PRO ROZHODOVÁNÍ

#### [`WORKFLOW-FAKTURACE-QUICK.md`](./WORKFLOW-FAKTURACE-QUICK.md)
**Rychlý přehled pro okamžité rozhodnutí (5-10 min)**
- ✅ Co máme / co zbývá
- 🔄 Vizualizace workflow
- ❓ Klíčová rozhodnutí
- ⏱️ Časové odhady

#### [`WORKFLOW-FAKTURACE-MEETING-CHECKLIST.md`](./WORKFLOW-FAKTURACE-MEETING-CHECKLIST.md)
**Checklist pro týmový meeting (30 min)**
- Agenda schůzky
- Otázky k hlasování
- Rozdělení úkolů
- Zápis z meetingu

---

### 📐 PRO PLÁNOVÁNÍ

#### [`WORKFLOW-FAKTURACE-NAVRH.md`](./WORKFLOW-FAKTURACE-NAVRH.md)
**Kompletní návrh workflow (15-20 min)**
- Detailní popis návrhu
- Workflow varianty
- UI komponenty
- Validace a pravidla
- Otázky k diskusi

#### [`WORKFLOW-FAKTURACE-DIAGRAMS.md`](./WORKFLOW-FAKTURACE-DIAGRAMS.md)
**Vizuální diagramy (10-15 min)**
- 7 různých diagramů
- Životní cyklus objednávky
- User flow
- API flow
- Datový model
- Oprávnění
- UI States

---

### 🔧 PRO IMPLEMENTACI

#### [`WORKFLOW-FAKTURACE-TECH-SPEC.md`](./WORKFLOW-FAKTURACE-TECH-SPEC.md)
**Detailní technická specifikace (30-45 min)**
- Backend: Kompletní PHP kód pro 4 endpointy
- Frontend: Kompletní React komponenty
- API service funkce
- Validace utils
- Integrace do OrderForm25
- Testovací scénáře
- Checklist implementace

---

## 🎭 ČTENÍ PODLE ROLE

### 👔 Product Owner / PM
1. [`WORKFLOW-FAKTURACE-QUICK.md`](./WORKFLOW-FAKTURACE-QUICK.md) - Rychlý přehled
2. [`WORKFLOW-FAKTURACE-NAVRH.md`](./WORKFLOW-FAKTURACE-NAVRH.md) - Návrh k diskusi
3. [`WORKFLOW-FAKTURACE-MEETING-CHECKLIST.md`](./WORKFLOW-FAKTURACE-MEETING-CHECKLIST.md) - Meeting agenda

### 💻 Backend Developer
1. [`WORKFLOW-FAKTURACE-QUICK.md`](./WORKFLOW-FAKTURACE-QUICK.md) - Rychlý přehled
2. [`WORKFLOW-FAKTURACE-TECH-SPEC.md`](./WORKFLOW-FAKTURACE-TECH-SPEC.md) (Backend) - PHP kód
3. [`WORKFLOW-FAKTURACE-DIAGRAMS.md`](./WORKFLOW-FAKTURACE-DIAGRAMS.md) (D3, D4) - API flow

### 🎨 Frontend Developer
1. [`WORKFLOW-FAKTURACE-QUICK.md`](./WORKFLOW-FAKTURACE-QUICK.md) - Rychlý přehled
2. [`WORKFLOW-FAKTURACE-TECH-SPEC.md`](./WORKFLOW-FAKTURACE-TECH-SPEC.md) (Frontend) - React komponenty
3. [`WORKFLOW-FAKTURACE-DIAGRAMS.md`](./WORKFLOW-FAKTURACE-DIAGRAMS.md) (D2, D7) - User flow

### 🧪 QA Tester
1. [`WORKFLOW-FAKTURACE-DIAGRAMS.md`](./WORKFLOW-FAKTURACE-DIAGRAMS.md) - Všechny diagramy
2. [`WORKFLOW-FAKTURACE-TECH-SPEC.md`](./WORKFLOW-FAKTURACE-TECH-SPEC.md) (Testování) - Scénáře
3. [`WORKFLOW-FAKTURACE-NAVRH.md`](./WORKFLOW-FAKTURACE-NAVRH.md) - Validace

---

## ⚡ QUICK START

### 1️⃣ Před implementací (30 min meeting)
```bash
# Přečti:
- WORKFLOW-FAKTURACE-QUICK.md

# Připrav na meeting:
- WORKFLOW-FAKTURACE-MEETING-CHECKLIST.md

# Rozhodněte:
❓ Kdy zobrazit sekci? (Varianta A/B)
❓ Více faktur? (ANO/NE)
❓ Validace částky? (Warning/Error)
❓ Kdo může editovat? (Autor+garant/Kdokoliv)
```

### 2️⃣ Backend implementace (4-6 hodin)
```bash
# Přečti:
- WORKFLOW-FAKTURACE-TECH-SPEC.md (Backend sekce)

# Implementuj:
✅ POST /api.eeo/faktury/list
✅ POST /api.eeo/faktury/create
✅ POST /api.eeo/faktury/update
✅ POST /api.eeo/faktury/delete

# Otestuj v Postman
```

### 3️⃣ Frontend implementace (8-10 hodin)
```bash
# Přečti:
- WORKFLOW-FAKTURACE-TECH-SPEC.md (Frontend sekce)

# Vytvoř:
✅ src/services/api25orders.js (API funkce)
✅ src/utils/fakturaValidation.js
✅ src/components/FakturaForm.js
✅ src/components/FakturaCard.js
✅ src/components/FakturyList.js

# Integruj:
✅ src/forms/OrderForm25.js (aktivuj sekci)
```

### 4️⃣ Testování (2-4 hodiny)
```bash
# Přečti:
- WORKFLOW-FAKTURACE-TECH-SPEC.md (Testování)

# Otestuj:
✅ Unit testy (validace)
✅ Integration testy (API)
✅ E2E testy (workflow)
✅ Manuální testování
✅ Edge cases
```

---

## 🔄 WORKFLOW PŘEHLED

```
NOVA → ODESLANA_KE_SCHVALENI → SCHVALENA → CEKA_POTVRZENI
                                                    ↓
                                              ✅ POTVRZENA ✅
                                                    ↓
                                        📄 FAKTURACE VIDITELNÁ
                                                    ↓
                                              - Přidat faktury
                                              - Upravit faktury
                                              - Smazat faktury
                                                    ↓
                                              DOKONCENA
```

---

## 📊 ČASOVÉ ODHADY

| Úkol | Čas |
|------|-----|
| Backend (4 endpointy) | 4-6 hodin |
| Frontend (komponenty) | 8-10 hodin |
| Testování | 2-4 hodiny |
| **CELKEM** | **14-20 hodin** |

---

## ✅ CHECKLIST

### 🔴 PŘED IMPLEMENTACÍ
- [ ] Přečíst `WORKFLOW-FAKTURACE-QUICK.md`
- [ ] Naplánovat meeting (použít checklist)
- [ ] Rozhodnout klíčové otázky
- [ ] Rozdělit úkoly v týmu

### 🟡 BACKEND
- [ ] Endpoint: `POST /faktury/list`
- [ ] Endpoint: `POST /faktury/create`
- [ ] Endpoint: `POST /faktury/update`
- [ ] Endpoint: `POST /faktury/delete`
- [ ] Testování v Postman
- [ ] Validace a error handling
- [ ] Informovat FE tým

### 🟢 FRONTEND
- [ ] API funkce (`api25orders.js`)
- [ ] Validace utils (`fakturaValidation.js`)
- [ ] Komponenta `FakturaForm.js`
- [ ] Komponenta `FakturaCard.js`
- [ ] Komponenta `FakturyList.js`
- [ ] Integrace (`OrderForm25.js`)
- [ ] Testování

### 🔵 QA
- [ ] Připravit testovací scénáře
- [ ] Unit testy
- [ ] Integration testy
- [ ] E2E testy
- [ ] Edge cases
- [ ] Performance test

### ✅ DEPLOYMENT
- [ ] Code review
- [ ] Demo pro stakeholders
- [ ] Aktualizace dokumentace
- [ ] Deploy do produkce
- [ ] Monitoring

---

## 🆘 FAQ

### Q: Která dokumentace je nejdůležitější?
**A:** Začni s [`WORKFLOW-FAKTURACE-INDEX.md`](./WORKFLOW-FAKTURACE-INDEX.md), pak [`WORKFLOW-FAKTURACE-QUICK.md`](./WORKFLOW-FAKTURACE-QUICK.md).

### Q: Kde najdu kompletní kód?
**A:** V [`WORKFLOW-FAKTURACE-TECH-SPEC.md`](./WORKFLOW-FAKTURACE-TECH-SPEC.md) - backend PHP i frontend React komponenty.

### Q: Jak dlouho implementace potrvá?
**A:** Celkem 14-20 hodin: Backend 4-6h, Frontend 8-10h, Testování 2-4h.

### Q: Můžeme začít implementovat hned?
**A:** NE! Nejdřív musíte rozhodnout klíčové otázky (meeting checklist).

### Q: Co když mám otázku k implementaci?
**A:** Zkontroluj [`WORKFLOW-FAKTURACE-TECH-SPEC.md`](./WORKFLOW-FAKTURACE-TECH-SPEC.md) nebo [`WORKFLOW-FAKTURACE-DIAGRAMS.md`](./WORKFLOW-FAKTURACE-DIAGRAMS.md).

---

## 📞 KONTAKT

- **Dokumentace vytvořena:** 26. října 2025
- **Autor:** GitHub Copilot
- **Projekt:** r-app-zzs-eeo-25
- **Adresář:** `docs/WORKFLOW-FAKTURACE-*.md`

---

## 📌 POZNÁMKY

- ✅ Všechny dokumenty jsou vzájemně propojené
- ✅ Obsahují kompletní kód pro okamžité použití
- ✅ Zahrnují vizuální diagramy
- ✅ Pokrývají všechny aspekty (BE, FE, QA)
- ✅ Připraveno k okamžité implementaci

---

## 🎯 NEXT STEPS

1. **TERAZ** → Přečíst [`WORKFLOW-FAKTURACE-INDEX.md`](./WORKFLOW-FAKTURACE-INDEX.md)
2. **PAK** → Přečíst [`WORKFLOW-FAKTURACE-QUICK.md`](./WORKFLOW-FAKTURACE-QUICK.md)
3. **MEETING** → Použít [`WORKFLOW-FAKTURACE-MEETING-CHECKLIST.md`](./WORKFLOW-FAKTURACE-MEETING-CHECKLIST.md)
4. **IMPLEMENT** → Podle [`WORKFLOW-FAKTURACE-TECH-SPEC.md`](./WORKFLOW-FAKTURACE-TECH-SPEC.md)
5. **TEST** → Testovací scénáře v tech spec
6. **DEPLOY** → Po úspěšném code review

---

**📚 Dokumentace připravena! Můžeme začít! 🚀**
