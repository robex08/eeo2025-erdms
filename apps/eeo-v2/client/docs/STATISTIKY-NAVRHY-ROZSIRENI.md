# 📊 MANAŽERSKÉ STATISTIKY - Návrhy na rozšíření

**Datum:** 28. listopadu 2025  
**Status:** NÁPADY K DISKUZI  
**Účel:** Rozšíření stávajícího systému statistik o další analytické pohledy

---

## 🎯 SOUČASNÝ STAV

Máme implementováno:
- ✅ Přehled (základní metriky, KPI)
- ✅ Statistiky uživatelů (produktivita, aktivita)
- ✅ Statistiky dodavatelů (objemy, frekvence)

---

## 💡 NOVÉ NÁPADY NA STATISTIKY

### 1️⃣ FINANČNÍ ANALÝZY

#### 1.1 Rozpočtové čerpání
```
📊 Vizualizace:
- Gauge grafy pro % čerpání podle úseků
- Heatmapa čerpání podle měsíců a úseků
- Waterfall diagram (očekávané vs. skutečné čerpání)

📈 Metriky:
- Průměrné měsíční čerpání
- Predikce čerpání na konec roku
- Srovnání s předchozím rokem (Y-o-Y)
- Top 5 účtů podle objemu
```

#### 1.2 Limitované příslíby - pokročilé
```
📊 Vizualizace:
- Stacked bar chart (čerpáno + zbývá + rezervováno)
- Timeline čerpání LP v čase
- Porovnání plánovaného vs. skutečného čerpání

📈 Metriky:
- Počet LP s > 80% čerpáním (risk zone)
- Průměrná doba od vytvoření objednávky k čerpání LP
- Top 5 objednávek s největším čerpáním LP
```

#### 1.3 Analýza fakturace
```
📊 Vizualizace:
- Časová osa: vytvoření objednávky → fakturace → platba
- Gantt chart plánovaných plateb
- Histogram průměrných částek na objednávku

📈 Metriky:
- Průměrná doba od objednávky k fakturaci
- Počet faktur se splatností < 5 dní
- Objem faktur čekajících na úhradu
- Top 5 dodavatelů podle frekvence fakturace
```

---

### 2️⃣ WORKFLOW ANALÝZY

#### 2.1 Efektivita schvalování
```
📊 Vizualizace:
- Funnel graf workflow stavů (kolik objednávek prošlo jednotlivými fázemi)
- Box plot: doba v jednotlivých stavech
- Sankey diagram: flow mezi stavy

📈 Metriky:
- Průměrná doba schválení podle typu objednávky
- Počet objednávek zaseknutých > 5 dní
- Úspěšnost schválení (% schválených vs. zamítnutých)
- Top 3 "bottlenecks" (kde se objednávky nejvíc zdržují)
```

#### 2.2 Produktivita schvalujících
```
📊 Vizualizace:
- Horizontální bar: počet schválených objednávek na schvalovatele
- Line chart: aktivita schvalujících v čase
- Scatter plot: rychlost schválení vs. počet objednávek

📈 Metriky:
- Průměrný čas na schválení 1 objednávky (na uživatele)
- Nejrychlejší/nejpomalejší schvalovatel
- Počet objednávek čekajících na konkrétního schvalovatele
```

#### 2.3 Analýza zamítnutí
```
📊 Vizualizace:
- Pie chart: důvody zamítnutí
- Timeline: kdy se nejčastěji zamítá
- Heatmap: úseky × důvody zamítnutí

📈 Metriky:
- % zamítnutých objednávek celkem
- Top 3 důvody zamítnutí
- Uživatelé s nejvyšším % zamítnutí
- Průměrná doba do zamítnutí
```

---

### 3️⃣ ANALÝZY PODLE KATEGORIÍ

#### 3.1 Typologie objednávek
```
📊 Vizualizace:
- Treemap: hierarchie druhů objednávek podle objemu
- Stacked area chart: vývoj typů objednávek v čase
- Bubble chart: typ × částka × frekvence

📈 Metriky:
- Nejčastější typ objednávky
- Nejdražší průměrná objednávka podle typu
- Růst/pokles jednotlivých typů (trend)
```

#### 3.2 Majetkové objednávky
```
📊 Vizualizace:
- Bar chart: majetkové vs. nemajetkové (počet i objem)
- Line chart: trend majetkových objednávek
- Pie chart: kategorie majetku

📈 Metriky:
- % majetkových objednávek
- Průměrná hodnota majetkové objednávky
- Nejčastější kategorie majetku
- Růst/pokles majetkových objednávek (Y-o-Y)
```

#### 3.3 Analýza dodavatelů - pokročilá
```
📊 Vizualizace:
- Pareto chart: 20% dodavatelů = 80% objemu (analýza ABC)
- Network diagram: propojení dodavatelů s úseky
- Timeline: aktivita dodavatelů v čase

📈 Metriky:
- Věrnost dodavatelů (kolikrát jsme od nich objednali)
- Průměrná doba dodání (pokud tracked)
- Top dodavatelé podle spolehlivosti
- Noví dodavatelé za posledních 12 měsíců
```

---

### 4️⃣ ČASOVÉ ANALÝZY

#### 4.1 Sezónnost
```
📊 Vizualizace:
- Heatmap: měsíc × rok (barva = objem objednávek)
- Line chart: srovnání jednotlivých let
- Calendar heatmap: aktivita podle dnů v roce

📈 Metriky:
- Nejzatíženější měsíc v roce
- Nejméně aktivní období
- Průměrný počet objednávek na den/týden/měsíc
- Peak days (dny s nejvyšší aktivitou)
```

#### 4.2 Týdenní/denní vzory
```
📊 Vizualizace:
- Bar chart: objednávky podle dne v týdnu
- Heatmap: den × hodina (kdy se nejvíc vytváří objednávek)
- Line chart: průměrná aktivita během týdne

📈 Metriky:
- Nejaktivnější den v týdnu
- Nejaktivnější hodiny (pokud tracked)
- Weekend vs. weekday aktivita
```

#### 4.3 Trend analýza
```
📊 Vizualizace:
- Line chart s trend linií (moving average)
- Area chart: kumulativní objem v čase
- Sparklines: mini trendy pro rychlý přehled

📈 Metriky:
- Růst/pokles počtu objednávek (%)
- Růst/pokles objemu (%)
- Predikce na příští kvartál (simple forecast)
- Srovnání s benchmarkem/cílem
```

---

### 5️⃣ SROVNÁVACÍ ANALÝZY

#### 5.1 Úseky (oddělení)
```
📊 Vizualizace:
- Radar chart: srovnání úseků podle více metrik
- Grouped bar chart: úseky × měsíce
- Box plot: rozložení částek podle úseků

📈 Metriky:
- Nejaktivnější úsek
- Úsek s nejvyšším průměrným objemem
- Úsek s nejrychlejším schvalováním
- Úsek s nejvyšší kvalitou objednávek (nejméně chyb/zamítnutí)
```

#### 5.2 Rok-na-rok (Y-o-Y)
```
📊 Vizualizace:
- Dual axis chart: současný rok vs. předchozí rok
- Waterfall: rozdíly mezi roky
- Butterfly chart: srovnání dvou let vedle sebe

📈 Metriky:
- Celkový růst/pokles (%)
- Oblasti s největším růstem
- Oblasti s poklesem (rizika)
```

#### 5.3 Kvartální srovnání
```
📊 Vizualizace:
- Grouped bar: Q1, Q2, Q3, Q4
- Line chart: trend napříč kvartály
- Heatmap: kvartály × roky

📈 Metriky:
- Nejsilnější kvartál
- Průměrné čerpání na kvartál
- Plnění kvartálních cílů (pokud definováno)
```

---

### 6️⃣ RIZIKOVÉ ANALÝZY

#### 6.1 Compliance dashboard
```
📊 Vizualizace:
- Gauge meter: % compliance score
- Alert card: kritické nesoulady
- Timeline: compliance incidenty

📈 Metriky:
- Počet objednávek bez zveřejnění (povinné)
- Počet objednávek nad limit bez schválení
- Zpětné objednávky (po fakturaci)
- Fakturace vyšší než schválená částka
```

#### 6.2 Riziková objednávky
```
📊 Vizualizace:
- Lista s filtry: typ rizika, závažnost
- Heatmap: rizikovost podle úseků
- Trend line: vývoj rizikových objednávek

📈 Metriky:
- Počet objednávek v "red zone" (> 80% LP, blízko deadline)
- Objednávky s nesrovnalostmi
- Objednávky čekající na schválení > X dní
- Potenciální překročení rozpočtu
```

---

### 7️⃣ POKROČILÉ KPI DASHBOARDY

#### 7.1 Executive Dashboard (pro vedení)
```
📊 Komponenty:
- 🎯 Hlavní KPI (velká čísla, % změny)
- 📊 Klíčové grafy (trend, rozdělení)
- ⚠️ Alerts (co vyžaduje pozornost)
- 📈 Forecasts (predikce)

📈 KPI:
- Celkový objem objednávek (Kč)
- Počet objednávek (ks)
- Průměrná doba zpracování
- Compliance score (%)
- Budget utilization (%)
```

#### 7.2 Operational Dashboard (pro manažery)
```
📊 Komponenty:
- 👥 Produktivita týmu
- ⏱️ Workflow metriky
- 📋 Backlog (čekající objednávky)
- 🎯 Cíle vs. skutečnost

📈 Metriky:
- Objednávky čekající na schválení
- Průměrná doba ve workflow
- Vytížení schvalujících
- Compliance issues
```

#### 7.3 Personal Dashboard (pro uživatele)
```
📊 Komponenty:
- 📊 Moje statistiky
- 🏆 Achievementy/badges
- 📈 Můj trend produktivity
- 🎯 Srovnání s průměrem týmu

📈 Metriky:
- Moje objednávky (vytvořené, schválené)
- Můj průměrný čas zpracování
- Moje úspěšnost (% schválených)
```

---

### 8️⃣ INTERAKTIVNÍ FUNKCE

#### 8.1 Drill-down analýzy
```
💡 Funkce:
- Kliknutím na graf zobrazit detaily
- Filtrovat podle vybraného období/úseku
- Export vybraných dat
- Uložit vlastní view
```

#### 8.2 Vlastní reporty
```
💡 Funkce:
- Drag & drop builder pro vlastní dashboard
- Výběr metrik a grafů
- Uložení vlastních konfigurací
- Sdílení dashboardů s kolegy
```

#### 8.3 Upozornění a automatizace
```
💡 Funkce:
- Nastavení alertů (např. "když čerpání LP > 80%")
- Automatický email s týdenním reportem
- Push notifikace pro kritické události
- Export do PDF na vyžádání
```

---

## 🎨 NÁVRHY NA VIZUALIZACE

### Doporučené knihovny:
1. **Recharts** - jednoduché, React friendly ✅ (už používáme)
2. **Chart.js** - univerzální, hodně typů grafů ✅ (už používáme)
3. **D3.js** - pokročilé, custom vizualizace
4. **Nivo** - krásné grafy, založené na D3
5. **Victory** - React komponenty pro grafy
6. **Apache ECharts** - pro enterprise dashboardy

### Nové typy grafů k implementaci:
- ✅ Pie chart (už máme)
- ✅ Bar chart (už máme)
- ⏳ Line chart (trendy)
- ⏳ Area chart (kumulativní data)
- ⏳ Gauge meter (% metriky)
- ⏳ Heatmap (2D distribuce)
- ⏳ Treemap (hierarchická data)
- ⏳ Sankey diagram (flow mezi stavy)
- ⏳ Radar chart (multi-dimenzionální srovnání)
- ⏳ Funnel chart (konverze)

---

## 🚀 IMPLEMENTAČNÍ PRIORITY

### FÁZE 1: Rychlé vítězství (1-2 týdny)
1. ✅ Základní statistiky uživatelů a dodavatelů (HOTOVO)
2. ⏳ Finanční přehled (rozpočet, LP status)
3. ⏳ Workflow metriky (doba schvalování)
4. ⏳ Executive dashboard (klíčové KPI)

### FÁZE 2: Pokročilé analýzy (3-4 týdny)
1. ⏳ Časové analýzy (trendy, sezónnost)
2. ⏳ Srovnávací analýzy (Y-o-Y, úseky)
3. ⏳ Rizikové analýzy (compliance, alerts)
4. ⏳ Drill-down funkce

### FÁZE 3: Budoucnost (2-3 měsíce)
1. ⏳ Custom report builder
2. ⏳ Automatické reporty (scheduled)
3. ⏳ Prediktivní analýzy (forecasting)
4. ⏳ AI insights (detekce anomálií)

---

## 💾 DATOVÉ ZDROJE

### Existující data:
- ✅ Objednávky (`orders25`)
- ✅ Uživatelé (`users`)
- ✅ Dodavatelé (`suppliers`)
- ✅ Workflow stavy
- ✅ Limitované příslíby (`lp`)
- ✅ Účty, úseky

### Potenciálně chybějící data:
- ⚠️ Časové razítko schválení (každého kroku)
- ⚠️ Důvody zamítnutí
- ⚠️ Audit log změn
- ⚠️ Faktury a jejich data (pokud není v orders25)
- ⚠️ Plánované vs. skutečné termíny

---

## 🎯 DOPORUČENÍ

### Co implementovat jako první:
1. **Finanční dashboard** - nejvyšší hodnota pro management
2. **Workflow metriky** - operativní využití denně
3. **Compliance alerts** - prevence rizik
4. **Trend analýzy** - strategické rozhodování

### Co odložit:
1. Custom report builder (komplexní)
2. AI/ML predikce (vyžaduje historická data)
3. Real-time dashboardy (není nutné zatím)

### Technické tipy:
- Cache agregovaná data (nemusíme počítat vždy znovu)
- Použít lazy loading pro grafy (načíst až když potřeba)
- Progressive enhancement (základní tabulka → graf)
- Responzivita (grafy musí fungovat i na mobilu)
- Export do PDF/Excel (často požadované)

---

## 📝 OTÁZKY K DISKUZI

1. Které analýzy jsou pro vás nejprioritnější?
2. Potřebujete real-time data nebo stačí denní refresh?
3. Kdo bude hlavním uživatelem statistik? (management/manažeři/všichni)
4. Máte definované cíle/KPI pro srovnání?
5. Potřebujete exporty do specifických formátů?
6. Chcete automatické reporty (email)?
7. Jsou nějaká další data, která bychom měli sledovat?

---

**Status:** 💡 NÁPADY K DISKUZI  
**Další krok:** Vybrat priority a zahájit implementaci další fáze statistik

