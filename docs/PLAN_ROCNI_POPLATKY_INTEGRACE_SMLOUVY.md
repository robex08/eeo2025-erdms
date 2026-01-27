# ⚠️ BUDOUCÍ ROZŠÍŘENÍ - Integrace s čerpáním smluv

**Datum poznámky:** 27.1.2026  
**Status:** Plánováno, ale implementovat jako POSLEDNÍ  

---

## 🎯 PROBLÉM

Roční poplatky jsou **plánované položky** pod smlouvami, ale nemají přímou vazbu na faktury (na rozdíl od objednávek).

→ **Potřebujeme je promítnout do čerpání smluv, ale jako plánované, ne skutečné!**

---

## 📊 POŽADAVEK

### 1️⃣ Čerpání smluv - promítnutí ročních poplatků

**Tabulka:** `25_smlouvy`  
**Sloupce k aktualizaci:**
- `cerpano_planovano` ← **Sem přičíst celkovou částku z ročních poplatků**
- `cerpano_skutecne` ← Zůstává z faktur (bez ročních poplatků)

**Trigger/Funkce:**
- Při vytvoření ročního poplatku → +celkova_castka do smlouvy.cerpano_planovano
- Při smazání ročního poplatku → -celkova_castka ze smlouvy.cerpano_planovano
- Při změně částky → přepočítat delta

---

### 2️⃣ Filtrace v statistikách a přehledech

**Problém:**  
Pokud roční poplatky zvyšují `cerpano_planovano`, mohou **zkreslovat** reálné čerpání smluv v reportech.

**Řešení:**
- Všechny přehledy/statistiky smluv musí mít možnost **vyloučit roční poplatky** z výpočtu
- Nebo je **vyznačit jinak** (např. zvláštní barva/ikona)

**Příklady endpoint úprav:**
```
GET /api/smlouvy/list
  ?exclude_annual_fees=1    // Nezahrnout roční poplatky do čerpání

GET /api/smlouvy/stats
  ?highlight_annual_fees=1  // Zobrazit roční poplatky odděleně
```

---

### 3️⃣ UI komponenty

**Smlouvy - detail:**
```
┌─────────────────────────────────────────┐
│ Čerpání smlouvy:                        │
├─────────────────────────────────────────┤
│ Rezervováno:        50 000 Kč           │
│ Plánováno (obj.):  120 000 Kč           │
│ + Roční poplatky:   12 000 Kč 🏷️      │  ← NOVÉ
│ Skutečně čerpáno:   95 000 Kč           │
│ Zbývá:             155 000 Kč           │
└─────────────────────────────────────────┘
```

**Smlouvy - přehled:**
- Checkbox "Zahrnout roční poplatky do čerpání"
- Možnost filtrovat smlouvy, které MAJÍ roční poplatky

---

## 🛠️ IMPLEMENTACE (jako POSLEDNÍ fáze)

### Krok 1: Databázová logika
- Vytvořit helper funkci `recalculateSmlouvaCerpaniFromAnnualFees($smlouva_id)`
- Zavolat po každém CREATE/UPDATE/DELETE ročního poplatku

### Krok 2: Backend API úpravy
- `/api/smlouvy/detail` → přidat pole `annual_fees_total`
- `/api/smlouvy/list` → přidat query parametr `exclude_annual_fees`
- `/api/smlouvy/stats` → rozdělit čerpání na "s poplatky" / "bez poplatků"

### Krok 3: Frontend
- Přidat checkbox do SmlouvyFilters
- Upravit SmlouvaDetail komponentu (zobrazit roční poplatky zvlášť)
- Upravit statistiky (graf s rozdělením)

---

## ✅ CHECKLIST PŘED IMPLEMENTACÍ TÉTO FÁZE

- [ ] Základní CRUD ročních poplatků funguje
- [ ] UI pro roční poplatky otestováno
- [ ] Automatické generování položek ověřeno
- [ ] Fakturace (volitelná vazba) funguje
- [ ] Teprve pak začít s integrací do čerpání smluv

---

## 🚨 POZNÁMKA

**Neimplementovat ihned!** Nejdřív dokončit:
1. SQL migrace ✅
2. Backend handlers ✅
3. UI komponenty ✅
4. Testování základní funkčnosti
5. **PAK** přidat tuto integraci
