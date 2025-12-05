# 🔔 TODO Alarm - Update Notes

## 📝 Poslední Změny (19.10.2025)

### ✅ Opravené Chyby

1. **Layout.js - addNotification error**
   - ❌ Problém: `addNotification` nebyla definována
   - ✅ Řešení: Použito `setNotifications` z `useFloatingPanels`
   - Změna: Přidáno `setNotifications` do destructuringu

### 🆕 Nové Funkce

#### 1. Tlačítko "Deaktivovat Alarm"

**Umístění**: AlarmModal dialog

**Vzhled**: 
- Žluté tlačítko s ikonou ⏸️
- Zobrazí se pouze pokud alarm je již nastaven
- Hover efekt pro vizuální feedback

**Funkce**:
- Deaktivuje alarm bez smazání nastavení
- Uloží `null` do `task.alarm`
- Umožňuje zachovat datum/čas pro pozdější reaktivaci

**Use Case**:
```
Scénář: Chci dočasně vypnout alarm, ale nechci ztratit nastavení

1. Otevřu alarm dialog u úkolu s nastaveným alarmem
2. Kliknu "⏸️ Deaktivovat"
3. Alarm je deaktivován, ale datum/čas zůstává v UI
4. Později můžu kliknout "Nastavit alarm" a obnovit ho
```

#### 2. Preview Floating Popup Okénka

**Umístění**: AlarmModal dialog (pouze pro HIGH priority)

**Trigger**: Tlačítko "👁️ Zobrazit náhled popup okénka"

**Zobrazení**:
- Mini verze skutečného floating popup okénka (85% velikost)
- Obsahuje všechny prvky: ikona 🚨, titulek, čas, text úkolu, tlačítka
- Živý náhled s aktuálním datem/časem z formuláře
- Hint: "💡 Okénko lze přesouvat myší po obrazovce"

**Design**:
```
┌────────────────────────────────────┐
│ ⚡ Náhled HIGH Priority Alarmu     │
│ ┌────────────────────────────────┐ │
│ │ 🚨 HIGH Alarm TODO              │ │
│ │ 20.10.2025 14:30               │ │
│ │ ┌──────────────────────────┐   │ │
│ │ │ Text úkolu               │   │ │
│ │ └──────────────────────────┘   │ │
│ │ [Zavřít] [✓ Hotové]            │ │
│ └────────────────────────────────┘ │
│ 💡 Okénko lze přesouvat myší...   │
└────────────────────────────────────┘
```

**Use Case**:
```
Scénář: Chci vidět jak bude vypadat HIGH alarm než ho nastavím

1. Nastavuji alarm s HIGH prioritou
2. Kliknu "👁️ Zobrazit náhled"
3. Zobrazí se mini verze floating okénka
4. Vidím přesně jak bude vypadat když alarm vyprší
5. Můžu se rozhodnout zda použít HIGH nebo NORMAL
```

### 🎨 UI Vylepšení

#### AlarmModal Rozšíření

**Před**:
- Šířka: 360px
- Bez max-height
- Základní layout

**Po**:
- Šířka: 400-600px (min-max)
- Max výška: 90vh s scrollem
- Responzivní layout
- Dvě sekce tlačítek (vlevo deaktivace, vpravo akce)

**Layout Tlačítek**:
```
┌─────────────────────────────────────────┐
│ [⏸️ Deaktivovat]    [Zavřít] [Uložit]  │
└─────────────────────────────────────────┘
   ↑ vlevo              ↑ vpravo
```

### 🔧 Technické Detaily

#### State Management

```javascript
const [showPreview, setShowPreview] = useState(false);
const [alarmActive, setAlarmActive] = useState(!!existingAlarm);
```

**showPreview**: Řídí zobrazení preview okénka
**alarmActive**: Sleduje zda je alarm aktivní (pro deaktivaci)

#### Handler Functions

```javascript
const handleDeactivate = () => {
  setAlarmActive(false);
  onSave(null);
};

const handleSave = () => {
  if (alarmActive && date && time) {
    // Save alarm
  } else {
    // Remove alarm
  }
};
```

### 📊 Změněné Soubory

```
src/
├── components/
│   ├── Layout.js                    [OPRAVENO]
│   │   ├── Přidáno setNotifications do destructuringu
│   │   └── Opravena handleTodoAlarmNotification callback
│   │
│   └── panels/
│       └── TodoPanel.js             [VYLEPŠENO]
│           ├── AlarmModal - přidán preview
│           ├── AlarmModal - přidáno tlačítko deaktivovat
│           ├── AlarmModal - zvětšeno okno (400-600px)
│           └── AlarmModal - responzivní layout
│
└── docs/
    └── TODO-ALARM-UPDATE.md         [NOVÝ]
```

### 🎯 Přínosy

1. **Lepší UX**: Uživatel vidí preview jak alarm bude vypadat
2. **Flexibilita**: Možnost dočasně deaktivovat alarm
3. **Transparentnost**: Jasná ukázka rozdílu mezi NORMAL a HIGH
4. **Responzivita**: Modal se přizpůsobí velikosti obsahu

### 🐛 Opravené Bugy

- ✅ `addNotification is not defined` v Layout.js
- ✅ Syntaktická chyba v TodoPanel.js (duplicitní kód)

### 📝 Návod k Použití

#### Deaktivace Alarmu

1. Otevři TODO panel
2. Klikni 🔔 u úkolu s alarmem
3. Klikni "⏸️ Deaktivovat"
4. ✅ Alarm je vypnutý

#### Zobrazení Preview

1. Otevři alarm dialog
2. Vyber HIGH prioritu
3. Klikni "👁️ Zobrazit náhled popup okénka"
4. ✅ Zobrazí se mini verze floating okénka
5. Klikni znovu pro skrytí

### ⚡ Performance

- Preview je lightweight (pure CSS, no animations v preview)
- Conditional rendering (zobrazí se jen když je HIGH)
- Žádný extra API call nebo datová zátěž

### 🔮 Budoucí Vylepšení

- [ ] Animovaný preview (pulsující ikona)
- [ ] Interaktivní preview (klikatelná tlačítka v preview)
- [ ] Preview pro NORMAL (mini verze notification)
- [ ] Reactive alarm (zapnout zpět deaktivovaný)

---

**Verze**: 1.1  
**Datum**: 19.10.2025  
**Změny**: Deaktivace alarmu + Preview floating popup
