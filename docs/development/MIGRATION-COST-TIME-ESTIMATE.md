# PHP → Node.js Migration - Cost & Time Estimate

**Datum:** 5. prosince 2025  
**Project:** ERDMS EEO API Migration

---

## 📊 Shrnutí - Čas a náklady

### ⏱️ Časový odhad

| Fáze | Popis | Týdny | Pracovní dny | MD (Man-Days) |
|------|-------|-------|--------------|---------------|
| **Phase 0** | Příprava a analýza | 1 | 5 | 5 MD |
| **Phase 1** | Infrastruktura (Express, DB, Auth) | 2 | 10 | 10 MD |
| **Phase 2** | Priority 0 (18 endpointů) | 3 | 15 | 15 MD |
| **Phase 3** | Priority 1 (60 endpointů) | 4 | 20 | 20 MD |
| **Phase 4** | Priority 2-3 (102 endpointů) | 3 | 15 | 15 MD |
| **Testing** | Integration & E2E testing | 1 | 5 | 5 MD |
| **Deployment** | Production rollout + monitoring | 0.5 | 2.5 | 2.5 MD |
| **Buffer** | Neočekávané problémy (20%) | - | 14.5 | 14.5 MD |
| **CELKEM** | | **~14 týdnů** | **87 dní** | **87 MD** |

**Timeline:** ~3.5 měsíce (s bufferem)

---

### 💰 Finanční odhad

#### Varianta A: Internal Developer (Full-time)

| Pozice | Sazba/měsíc | Měsíce | Celkem |
|--------|-------------|---------|---------|
| **Senior Full-stack Developer** | 120 000 Kč | 3.5 | **420 000 Kč** |
| **Code Review & QA** (20% času) | 24 000 Kč | 3.5 | **84 000 Kč** |
| **DevOps Support** (10% času) | 15 000 Kč | 3.5 | **52 500 Kč** |
| | | **CELKEM:** | **556 500 Kč** |

**Poznámka:** Předpokládá se internal zaměstnanec s plným úvazkem

---

#### Varianta B: External Contractor (Day rate)

| Pozice | Sazba/den | Dny | Celkem |
|--------|-----------|-----|---------|
| **Senior Full-stack Developer** | 8 000 Kč | 87 | **696 000 Kč** |
| **Code Review & QA** | 6 000 Kč | 17 | **102 000 Kč** |
| **DevOps Support** | 5 000 Kč | 9 | **45 000 Kč** |
| | | **CELKEM:** | **843 000 Kč** |

**Poznámka:** Externí dodavatel, fakturace po dokončení milestones

---

#### Varianta C: Hybrid (Part-time internal)

| Pozice | Sazba/měsíc | Měsíce | Celkem |
|--------|-------------|---------|---------|
| **Senior Developer** (60% úvazek) | 72 000 Kč | 5.8 | **417 600 Kč** |
| **Code Review & QA** (20% času) | 24 000 Kč | 3.5 | **84 000 Kč** |
| **DevOps Support** (10% času) | 15 000 Kč | 3.5 | **52 500 Kč** |
| | | **CELKEM:** | **554 100 Kč** |

**Poznámka:** Developer pracuje 60% času na migraci, 40% na běžných úkolech  
**Timeline:** ~6 měsíců

---

### 📋 Porovnání variant

| Kritérium | Varianta A (Full-time) | Varianta B (Contractor) | Varianta C (Part-time) |
|-----------|------------------------|-------------------------|------------------------|
| **Celkové náklady** | 556 500 Kč | 843 000 Kč | 554 100 Kč |
| **Timeline** | 3.5 měsíce | 3.5 měsíce | 6 měsíců |
| **Riziko zpoždění** | ⬇️ Nízké | ⬇️ Nízké | ⬆️ Střední |
| **Flexibilita** | ⬇️ Nízká | ⬆️ Vysoká | ⬆️ Střední |
| **Knowledge retention** | ⬆️ Vysoká | ⬇️ Nízká | ⬆️ Vysoká |
| **Dostupnost** | ⬆️ Vysoká | ⬇️ Závislá | ⬆️ Střední |

**Doporučení:** 
- ✅ **Varianta A nebo C** - Lepší pro long-term maintenance
- ⚠️ **Varianta B** - Pouze pokud nemáte internal kapacitu

---

### 💡 Detailní breakdown nákladů

#### Fáze 0: Příprava (5 MD)

| Aktivita | MD | Náklady (8k/den) |
|----------|-----|------------------|
| Setup projektu | 1 | 8 000 Kč |
| Database review | 1 | 8 000 Kč |
| Testing framework | 2 | 16 000 Kč |
| Documentation | 1 | 8 000 Kč |
| **Subtotal** | **5** | **40 000 Kč** |

#### Fáze 1: Infrastruktura (10 MD)

| Aktivita | MD | Náklady (8k/den) |
|----------|-----|------------------|
| Express app setup | 2 | 16 000 Kč |
| Database layer | 3 | 24 000 Kč |
| Auth middleware | 3 | 24 000 Kč |
| Error handling | 1 | 8 000 Kč |
| Logging | 1 | 8 000 Kč |
| **Subtotal** | **10** | **80 000 Kč** |

#### Fáze 2: Priority 0 Endpoints (15 MD)

| Kategorie | Endpointy | MD | Náklady (8k/den) |
|-----------|-----------|-----|------------------|
| Authentication | 4 | 3 | 24 000 Kč |
| Orders Core | 5 | 5 | 40 000 Kč |
| Orders V2 | 3 | 4 | 32 000 Kč |
| Supporting | 6 | 3 | 24 000 Kč |
| **Subtotal** | **18** | **15** | **120 000 Kč** |

**Průměr:** 0.83 MD na endpoint

#### Fáze 3: Priority 1 Endpoints (20 MD)

| Kategorie | Endpointy | MD | Náklady (8k/den) |
|-----------|-----------|-----|------------------|
| Invoices | 15 | 6 | 48 000 Kč |
| Attachments | 20 | 8 | 64 000 Kč |
| User Management | 8 | 3 | 24 000 Kč |
| Codebooks | 17 | 3 | 24 000 Kč |
| **Subtotal** | **60** | **20** | **160 000 Kč** |

**Průměr:** 0.33 MD na endpoint (jednodušší než P0)

#### Fáze 4: Priority 2-3 Endpoints (15 MD)

| Kategorie | Endpointy | MD | Náklady (8k/den) |
|-----------|-----------|-----|------------------|
| Notifications | 15 | 4 | 32 000 Kč |
| Todo Notes | 8 | 2 | 16 000 Kč |
| Chat | 7 | 2 | 16 000 Kč |
| Templates | 10 | 3 | 24 000 Kč |
| Reports | 3 | 1 | 8 000 Kč |
| Misc | 59 | 3 | 24 000 Kč |
| **Subtotal** | **102** | **15** | **120 000 Kč** |

**Průměr:** 0.15 MD na endpoint (nejjednodušší)

#### Testing & Deployment (7.5 MD)

| Aktivita | MD | Náklady (8k/den) |
|----------|-----|------------------|
| Integration testing | 3 | 24 000 Kč |
| E2E testing | 2 | 16 000 Kč |
| Production deployment | 1 | 8 000 Kč |
| Monitoring setup | 1 | 8 000 Kč |
| Bug fixes | 0.5 | 4 000 Kč |
| **Subtotal** | **7.5** | **60 000 Kč** |

#### Buffer & Contingency (14.5 MD)

| Typ | MD | Náklady (8k/den) |
|-----|-----|------------------|
| Technical debt | 5 | 40 000 Kč |
| Unforeseen issues | 5 | 40 000 Kč |
| Refactoring | 4.5 | 36 000 Kč |
| **Subtotal** | **14.5** | **116 000 Kč** |

---

### 📊 Celkový přehled nákladů

| Fáze | Man-Days | % času | Náklady (8k/den) | % nákladů |
|------|----------|--------|------------------|-----------|
| Phase 0: Příprava | 5 | 6% | 40 000 Kč | 6% |
| Phase 1: Infrastruktura | 10 | 11% | 80 000 Kč | 11% |
| Phase 2: Priority 0 | 15 | 17% | 120 000 Kč | 17% |
| Phase 3: Priority 1 | 20 | 23% | 160 000 Kč | 23% |
| Phase 4: Priority 2-3 | 15 | 17% | 120 000 Kč | 17% |
| Testing & Deployment | 7.5 | 9% | 60 000 Kč | 9% |
| Buffer (20%) | 14.5 | 17% | 116 000 Kč | 17% |
| **CELKEM** | **87 MD** | **100%** | **696 000 Kč** | **100%** |

---

### 💰 Rozpočet podle rolí

| Role | % času | Man-Days | Sazba/den | Celkem |
|------|--------|----------|-----------|---------|
| **Senior Developer** | 80% | 69.6 | 8 000 Kč | 556 800 Kč |
| **Code Review & QA** | 15% | 13.1 | 6 000 Kč | 78 600 Kč |
| **DevOps** | 5% | 4.3 | 5 000 Kč | 21 500 Kč |
| **CELKEM** | 100% | 87 | - | **656 900 Kč** |

---

### 📅 Timeline s milestones

| Milestone | Datum (start) | Trvání | Deliverable | Platba |
|-----------|---------------|--------|-------------|---------|
| **M0: Kickoff** | Týden 1 | 1 týden | Projekt setup, dokumentace | 40 000 Kč |
| **M1: Infrastructure** | Týden 2 | 2 týdny | Express app + Auth | 80 000 Kč |
| **M2: P0 Endpoints** | Týden 4 | 3 týdny | 18 kritických endpointů | 120 000 Kč |
| **M3: P1 Endpoints** | Týden 7 | 4 týdny | 60 běžných endpointů | 160 000 Kč |
| **M4: P2-3 Endpoints** | Týden 11 | 3 týdny | 102 méně kritických | 120 000 Kč |
| **M5: Testing** | Týden 14 | 1 týden | Integration + E2E tests | 60 000 Kč |
| **M6: Production** | Týden 15 | 0.5 týden | Deployment + monitoring | 116 900 Kč |
| | | **14.5 týdnů** | | **696 900 Kč** |

---

### 🎯 ROI & Business Case

#### Přínosy migrace

| Benefit | Roční úspora | NPV (3 roky) |
|---------|--------------|--------------|
| **Snížení maintenance nákladů** | 180 000 Kč | 540 000 Kč |
| **Rychlejší development** (20%) | 240 000 Kč | 720 000 Kč |
| **Menší downtime** (99.9% vs 99%) | 50 000 Kč | 150 000 Kč |
| **Lepší security** | Neměřitelné | - |
| **CELKEM** | **470 000 Kč/rok** | **1 410 000 Kč** |

#### Break-even point

```
Investice: 696 900 Kč
Roční úspora: 470 000 Kč
Break-even: 1.48 roku (18 měsíců)
```

#### ROI po 3 letech

```
Total benefits: 1 410 000 Kč
Total costs: 696 900 Kč
Net benefit: 713 100 Kč
ROI: 102%
```

---

### 📉 Rizika a dodatečné náklady

| Riziko | Pravděpodobnost | Dopad | Dodatečné náklady |
|--------|-----------------|-------|-------------------|
| **Scope creep** (+10 endpointů) | Střední | 5 MD | 40 000 Kč |
| **Database migration issues** | Nízká | 3 MD | 24 000 Kč |
| **Performance problems** | Nízká | 5 MD | 40 000 Kč |
| **Integration bugs** | Střední | 3 MD | 24 000 Kč |
| **Rollback needed** | Velmi nízká | 2 MD | 16 000 Kč |
| **Production hotfixes** | Vysoká | 5 MD | 40 000 Kč |
| **CELKEM (worst case)** | - | **23 MD** | **184 000 Kč** |

**Buffer již zahrnuje 20% contingency**, což pokrývá většinu těchto rizik.

---

### 💼 Doporučený přístup

#### Optimální strategie: **Varianta C (Hybrid Part-time)**

**Důvody:**
1. ✅ **Náklady:** 554 100 Kč (podobné jako full-time)
2. ✅ **Flexibility:** Developer může řešit i jiné úkoly
3. ✅ **Knowledge retention:** Internal zaměstnanec zná systém
4. ✅ **Lower risk:** Postupná migrace bez rushing
5. ✅ **Better quality:** Více času na testing

**Timeline:** 6 měsíců (akceptovatelné)

#### Fakturace (pro Variantu C)

| Milestone | Datum | Částka | Procento |
|-----------|-------|--------|----------|
| M0: Kickoff | Měsíc 1 | 50 000 Kč | 9% |
| M1: Infrastructure | Měsíc 2 | 100 000 Kč | 18% |
| M2: P0 Endpoints | Měsíc 3 | 150 000 Kč | 27% |
| M3: P1 Endpoints | Měsíc 4 | 150 000 Kč | 27% |
| M4: P2-3 & Testing | Měsíc 5 | 80 000 Kč | 14% |
| M5: Production | Měsíc 6 | 24 100 Kč | 5% |
| **CELKEM** | | **554 100 Kč** | **100%** |

---

### 📝 Závěr

**Doporučení:**
- **Timeline:** 3.5-6 měsíců (podle alokace)
- **Náklady:** **554 000 - 696 000 Kč**
- **ROI:** 102% po 3 letech
- **Break-even:** 18 měsíců

**Next steps:**
1. Odsouhlasit budget (550-700k Kč)
2. Alokovat developer resource
3. Schválit timeline (4-6 měsíců)
4. Zahájit Phase 0

---

**Vytvořeno:** 5. prosince 2025  
**Platnost:** 3 měsíce  
**Update:** Q1 2026

**Poznámka:** Odhady jsou založené na průměrných market rates a typické produktivitě senior developera. Skutečné náklady se mohou lišit ±15%.
