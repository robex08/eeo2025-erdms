# 🎯 REPORTY - Priority a Workflow

**Rychlý přehled priorit jednotlivých reportů**

---

## 📊 PRIORITNÍ REPORTY (Implementovat PRVNÍ)

### ⭐⭐⭐ VYSOKÁ PRIORITA

#### 1. ⚠️ Objednávky ke zveřejnění
**Důvod:** Compliance, zákonná povinnost  
**Použití:** Denně/týdně kontrolovat, které objednávky je třeba zveřejnit  
**Filtry:** Období, úsek, částka  
**API:** `POST /reports/to-publish`  
**Složitost:** 🟢 Nízká (jednoduchý SQL filtr)

#### 2. 💰 Objednávky nad 50 000 Kč
**Důvod:** Compliance, hlídání limitů  
**Použití:** Kontrola objednávek vyžadujících zvláštní pozornost  
**Filtry:** Období, úsek, vlastní limit  
**API:** `POST /reports/over-limit`  
**Složitost:** 🟢 Nízká (jednoduchý SQL filtr)

#### 3. 💰 Čerpání LP (Limitované příslíby)
**Důvod:** Rozpočtová kontrola, plánování  
**Použití:** Měsíční/čtvrtletní kontrola čerpání limitů  
**Filtry:** Rok, účet, úsek  
**API:** `POST /reports/lp-status`  
**Složitost:** 🟡 Střední (agregace, % výpočty)

**Časový odhad:** 3-4 dny (backend + frontend + testování)

---

### ⭐⭐ STŘEDNÍ PRIORITA

#### 4. ⏳ Objednávky čekající na schválení > 5 dní
**Důvod:** Workflow monitoring, identifikace úzkých míst  
**Použití:** Týdně kontrolovat zaseknuté objednávky  
**Filtry:** Počet dní, úsek, schvalovatel  
**API:** `POST /reports/pending-approvals`  
**Složitost:** 🟡 Střední (porovnání timestamps)

#### 5. 📢 Zveřejněné objednávky
**Důvod:** Audit, kontrola zveřejněných dat  
**Použití:** Dle potřeby (audit trail)  
**Filtry:** Období, ID zveřejnění, úsek  
**API:** `POST /reports/published`  
**Složitost:** 🟢 Nízká (jednoduchý SQL filtr)

#### 6. ⚡ Faktury se splatností < 5 dní
**Důvod:** Cash-flow management, urgentní platby  
**Použití:** Denně/týdně kontrolovat urgentní platby  
**Filtry:** Počet dní, úsek, dodavatel  
**API:** `POST /reports/urgent-payments`  
**Složitost:** 🟡 Střední (datum splatnosti vs dnes)

#### 7. ❗ Fakturace vyšší než částka na kontrole
**Důvod:** Kontrola nesrovnalostí, rizikové objednávky  
**Použití:** Měsíčně/čtvrtletně kontrolovat diskrepance  
**Filtry:** Období, minimální rozdíl (Kč/%),  úsek  
**API:** `POST /reports/invoice-discrepancy`  
**Složitost:** 🟡 Střední (porovnání částek, % výpočty)

**Časový odhad:** 4-5 dní (všechny 4 reporty)

---

### ⭐ NÍZKÁ PRIORITA

#### 8. ⏪ Objednávky vytvořené po fakturaci
**Důvod:** Kontrola zpětných objednávek (potenciálně problematické)  
**Použití:** Měsíčně/čtvrtletně audit  
**Filtry:** Období, úsek  
**API:** `POST /reports/retroactive-orders`  
**Složitost:** 🟡 Střední (porovnání dat vytvoření vs fakturace)

#### 9. 📋 Statistika akceptačních objednávek
**Důvod:** Monitoring dodržování pravidel akceptace  
**Použití:** Měsíčně/čtvrtletně kontrola  
**Filtry:** Období, úsek, status  
**API:** `POST /reports/acceptance-stats`  
**Složitost:** 🟡 Střední (agregace, % výpočty)

#### 10. 🏢 Objednávky vztahující se k majetku
**Důvod:** Správa majetku, inventura  
**Použití:** Dle potřeby (inventarizace)  
**Filtry:** Období, typ majetku, úsek  
**API:** `POST /reports/asset-orders`  
**Složitost:** 🟢 Nízká (filtr podle typu objednávky)

**Časový odhad:** 2-3 dny (všechny 3 reporty)

---

## 📈 STATISTIKY - Priority

### ⭐⭐⭐ VYSOKÁ PRIORITA

#### 1. 📊 Přehled (Dashboard)
**Obsahuje:**
- Celkový počet objednávek
- Celková částka
- Průměrná hodnota objednávky
- % schválených/zamítnutých

**API:** `POST /statistics/overview`  
**Složitost:** 🟢 Nízká (základní agregace)  
**Časový odhad:** 1 den

#### 2. 📈 Časové řady
**Obsahuje:**
- Vývoj počtu objednávek v čase (měsíce/čtvrtletí)
- Vývoj částek v čase
- Sloupcový/čárový graf

**API:** `POST /statistics/timeline`  
**Složitost:** 🟡 Střední (GROUP BY datum, agregace)  
**Časový odhad:** 1-2 dny

#### 3. 🥧 Rozdělení podle úseků
**Obsahuje:**
- Koláčový graf rozdělení podle úseků
- Tabulka s detaily (počet, částka, %)

**API:** `POST /statistics/departments`  
**Složitost:** 🟢 Nízká (GROUP BY úsek)  
**Časový odhad:** 1 den

---

### ⭐⭐ STŘEDNÍ PRIORITA

#### 4. 👥 Statistiky uživatelů
**Obsahuje:**
- TOP 10 uživatelů (podle počtu objednávek)
- TOP 10 uživatelů (podle částky)
- Průměrná doba zpracování

**API:** `POST /statistics/users`  
**Složitost:** 🟡 Střední (GROUP BY user, agregace, ORDER BY)  
**Časový odhad:** 1-2 dny

#### 5. 📊 Srovnání období (YoY, QoQ)
**Obsahuje:**
- Srovnání roku s rokem
- Srovnání čtvrtletí s čtvrtletím
- % změny

**API:** `POST /statistics/comparison`  
**Složitost:** 🟡 Střední (multiple queries, % výpočty)  
**Časový odhad:** 1 den

---

## 🛠️ IMPLEMENTAČNÍ STRATEGIE

### Fáze 2A: První reporty (3-4 dny)
```
✅ Objednávky ke zveřejnění        [1 den]
✅ Objednávky nad 50k Kč            [0.5 dne]
✅ Čerpání LP                       [1.5 dne]
✅ Testování + bugfixy              [1 den]
```

### Fáze 2B: Rozšíření reportů (4-5 dní)
```
✅ Objednávky čekající na schválení [1 den]
✅ Zveřejněné objednávky            [0.5 dne]
✅ Urgentní platby                  [1 den]
✅ Nesrovnalosti ve fakturaci       [1.5 dne]
✅ Testování + bugfixy              [1 den]
```

### Fáze 2C: Doplňkové reporty (2-3 dny)
```
✅ Zpětné objednávky                [0.5 dne]
✅ Akceptační statistiky            [1 den]
✅ Majetkové objednávky             [0.5 dne]
✅ Testování + bugfixy              [0.5 dne]
```

### Fáze 3: Statistiky (5-7 dní)
```
✅ Přehled (Dashboard)              [1 den]
✅ Časové řady + grafy              [2 dny]
✅ Rozdělení podle úseků + grafy    [1 den]
✅ Statistiky uživatelů             [1.5 dne]
✅ Srovnání období                  [1 den]
✅ Testování + bugfixy              [1 den]
```

---

## 🎯 DOPORUČENÍ

### Pro rychlý start:
1. Začít s **Fází 2A** (první 3 reporty)
2. Otestovat na produkčních datech
3. Získat feedback od uživatelů
4. Pokračovat s **Fází 2B** podle priorit

### Flexibilita:
- Pokud je některý report méně důležitý → přesunout do nižší priority
- Pokud se objeví nový urgent požadavek → lze zařadit mezi priority

### Optimalizace:
- Sdílené komponenty (ReportCard, ReportModal, ReportDataTable)
- Sdílené filtry (ReportFilterBar)
- Sdílené hooks (useReportData, useReportExport)
- → Rychlejší implementace dalších reportů

---

## 📋 CHECKLIST PRO KAŽDÝ REPORT

- [ ] Backend API endpoint (PHP)
- [ ] SQL dotaz optimalizovaný (indexy)
- [ ] Kontrola oprávnění (ORDER_VIEW_OWN vs ORDER_VIEW_ALL)
- [ ] Frontend komponenta (ReportCard)
- [ ] Modal s daty (ReportModal)
- [ ] Filtry fungují
- [ ] Export CSV funguje
- [ ] Testy (unit + integration)
- [ ] Dokumentace API
- [ ] Uživatelská dokumentace

---

**Připravil:** AI Assistant  
**Datum:** 27. listopadu 2025  
**Status:** ✅ READY FOR PLANNING
