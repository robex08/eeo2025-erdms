# 💡 TODO Alarm - Příklady Použití

## Základní Příklady

### 1. Jednoduché Připomenutí (NORMAL)

**Scenario**: Připomenout si zavolat klientovi

```
Úkol: "Zavolat Ing. Nováka ohledně nabídky"
Datum: Dnes
Čas: 14:00
Priorita: NORMAL 🔔
```

**Co se stane**:
- Ve 14:00 se zobrazí notifikace v zvonečku
- Řádek TODO je žlutě podbarvený
- Můžeš ji odkliknout později

---

### 2. Kritický Termín (HIGH)

**Scenario**: Termín pro podání dokumentů

```
Úkol: "Podat daňové přiznání - DEADLINE!"
Datum: 31.3.2025
Čas: 15:00
Priorita: HIGH 🚨
```

**Co se stane**:
- Ve 15:00 se zobrazí velké floating okénko
- Nelze přehlédnout
- Řádek TODO je červeně podbarvený
- Okénko můžeš přesouvat

---

### 3. Více Alarmů Najednou

**Scenario**: Busy den s více schůzkami

```
1. "Meeting s vedením" - 9:00 - HIGH 🚨
2. "Zavolat dodavateli" - 11:30 - NORMAL 🔔
3. "Oběd s klientem" - 12:30 - HIGH 🚨
4. "Code review" - 15:00 - NORMAL 🔔
```

**Co se stane**:
- HIGH alarmy se zobrazí jako floating okénka
- Automaticky se rozmístí aby se nepřekrývala
- NORMAL alarmy jdou do notifikací
- Všechny řádky mají příslušné barevné označení

---

## Pokročilé Use Cases

### 4. Ranní Rutina

```
TODO List "Ranní rutina":
├─ "Vstát a protáhnout se" - 6:00 - HIGH
├─ "Připravit snídani" - 6:30 - NORMAL
├─ "Přečíst zprávy" - 7:00 - NORMAL
└─ "Vyrazit do práce" - 7:45 - HIGH
```

### 5. Projektový Management

```
Projekt "Nová webová stránka":
├─ "Review design" - Dnes 10:00 - NORMAL
├─ "Client feedback call" - Dnes 14:00 - HIGH
├─ "Fix bugs" - Zítra 9:00 - NORMAL
└─ "Deploy to production" - Pátek 16:00 - HIGH
```

### 6. Zdravotní Připomínky

```
├─ "Vzít léky" - Každý den* 8:00 - HIGH
├─ "Cvičení" - Po/St/Pá 17:00 - NORMAL
└─ "Lékař - kontrola" - 15.11.2025 10:00 - HIGH

* Poznámka: Opakující se alarmy zatím nejsou podporovány
  (musíš vytvořit nový úkol po každém dni)
```

---

## Tips & Tricks

### 🎯 Kdy použít NORMAL vs HIGH?

**NORMAL 🔔** použij pro:
- Rutinní úkoly
- Připomínky které můžeš odkliknout později
- Úkoly bez pevného termínu
- Všechno co není urgentní

**HIGH 🚨** použij pro:
- Pevné termíny/deadliny
- Schůzky a meetings
- Kritické akce
- Cokoliv co nesmíš propást

### ⏰ Quick Time Setup

Místo ruční nastavení času použij **+15m** tlačítko:
1. Vyber současný čas
2. Klikej +15m dokud nedosáhneš požadovaného času
3. Každé kliknutí přidá 15 minut

### 🎨 Vizuální Organizace

Barvy pomáhají rychle identifikovat priority:
```
🟦 Modrá   = Bez alarmu (běžný úkol)
🟨 Žlutá   = NORMAL alarm (pozor!)
🟥 Červená = HIGH alarm (KRITICKÉ!)
```

### 🔄 Workflow Pattern

Doporučený workflow:
1. Vytvoř úkol bez alarmu
2. Když je čas nastavit termín → přidej alarm
3. Podle důležitosti zvol prioritu
4. Po dokončení označ jako hotové
5. Pravidelně mazat hotové úkoly (tlačítko ✔−)

---

## Časté Situace

### "Zapomněl jsem nastavit alarm"

✅ **Řešení**: 
- Klikni na 🔔 ikonu u úkolu
- Nastav čas o 5-10 minut dopředu
- Vyber HIGH prioritu pro okamžité upozornění

### "Mám příliš mnoho alarmů"

✅ **Řešení**:
- Použij NORMAL pro méně důležité
- Seskupuj podobné úkoly
- Nastav alarmy jen na kritické věci

### "Floating okénko mi překáží"

✅ **Řešení**:
- Přesuň ho myší jinam na obrazovce
- Nebo klikni "Zavřít" aby zmizelo
- Alternativa: použij NORMAL místo HIGH

### "Alarm se neodpálil"

✅ **Check list**:
- [ ] Jsi přihlášený?
- [ ] Aplikace je otevřená?
- [ ] Čas alarmu už prošel?
- [ ] Alarm není označen jako "fired"?
- [ ] F5 refresh nevyřeší?

---

## Scénáře z Reálného Světa

### 📊 Kancelářská Práce

```
Pondělí:
├─ 8:00  Team standup (HIGH)
├─ 10:00 Email check (NORMAL)
├─ 12:00 Oběd (NORMAL)
├─ 14:00 Client call (HIGH)
└─ 16:30 Reporting deadline (HIGH)
```

### 👨‍💻 Developer Schedule

```
Sprint Day:
├─ 9:00  Code review (NORMAL)
├─ 11:00 Fix critical bug (HIGH)
├─ 13:00 Standup meeting (HIGH)
├─ 15:00 Write tests (NORMAL)
└─ 17:00 Git push before EOD (HIGH)
```

### 🏠 Domácnost

```
Weekend TODO:
├─ 9:00  Nákup (NORMAL)
├─ 11:00 Zavolat rodičům (NORMAL)
├─ 14:00 Pračka - konec cyklu (HIGH)
└─ 16:00 Připravit večeři (NORMAL)
```

---

## Pro Power Users

### Batch Creating

Vytvoř více úkolů s alarmem najednou:
1. Vytvoř první úkol s alarmem
2. Nastavit čas a prioritu
3. Duplicitně vytvoř další úkoly
4. Uprav jen text a čas (priorita zůstane)

### Color Coding Strategy

Kombinuj s vizuálním označením:
- **Červené řádky** (HIGH) = Dnešní deadliny
- **Žluté řádky** (NORMAL) = Zítřejší úkoly
- **Modré řádky** (bez alarmu) = Backlog

### Integration with Notifications

NORMAL alarmy se integrují do systému notifikací:
- Můžeš je filtrovat v notifikacích
- Označit jako přečtené
- Historie všech alarmů

---

**Pro více info**: `TODO-ALARM-SYSTEM.md`
