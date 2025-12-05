# 🔧 TODO Alarm - Fix: Alarm se neuložil (null problem)

## 🐛 Identifikovaný problém

### Data z API:
```json
{
  "id": 1760831339944,
  "text": "Predelat pri editac...",
  "done": false,
  "createdAt": 1760831339944,
  "alarm": null  ← PROBLÉM!
}
```

### Příčiny:
1. **Špatná logika v `handleSave()`**: Ukládalo `null` když `alarmActive` bylo false
2. **Nepředvyplňování po deaktivaci**: Když byl alarm `null`, modal se otevřel s výchozími hodnotami
3. **Ztráta historických dat**: Po deaktivaci se zapomnělo předchozí nastavení

---

## ✅ Implementované opravy

### 1. **Paměť posledního nastavení**

Přidána localStorage cache pro každý úkol:

```javascript
// Ukládá se automaticky při změně datum/čas/priority
React.useEffect(() => {
  if (date && time) {
    localStorage.setItem(`last_alarm_settings_${task.id}`, JSON.stringify({
      dateStr: date,
      timeStr: time,
      priority: priority
    }));
  }
}, [date, time, priority, task.id]);
```

**Výhody**:
- ✅ Po deaktivaci alarmu se pamatuje nastavení
- ✅ Při opětovném otevření modalu je předvyplněné
- ✅ Uživatel nemusí zadávat znovu datum/čas

### 2. **Inteligentní předvyplňování**

Pořadí priorit při načítání hodnot:

```javascript
// 1. Priorita: Aktivní alarm
if (existingAlarm && existingAlarm.time) {
  defaults = {
    dateStr: new Date(existingAlarm.time).toISOString().split('T')[0],
    timeStr: new Date(existingAlarm.time).toTimeString().slice(0, 5),
    priority: existingAlarm.priority || 'NORMAL'
  };
}
// 2. Priorita: Poslední uložené nastavení
else {
  const lastSettings = getLastAlarmSettings();
  if (lastSettings) {
    defaults = lastSettings;
  }
  // 3. Priorita: Výchozí hodnoty (+30 minut)
  else {
    defaults = { ...getDefaultDateTime(), priority: 'NORMAL' };
  }
}
```

**Flow**:
```
Otevření modalu
    ↓
Je alarm aktivní? (t.alarm !== null)
    ├─→ ANO: Předvyplň z alarm objektu
    └─→ NE: 
        ↓
        Existuje last_alarm_settings?
        ├─→ ANO: Předvyplň z localStorage
        └─→ NE: Použij výchozí (+30 min)
```

### 3. **Zjednodušená logika uložení**

**PŘED**:
```javascript
const handleSave = () => {
  if (alarmActive && date && time) {
    // Uložit alarm
    onSave({...});
  } else {
    onSave(null); // ← Problém!
  }
};
```

**PO**:
```javascript
const handleSave = () => {
  // Pokud jsou vyplněné datum a čas, VŽDY ulož alarm
  if (date && time) {
    const alarmDateTime = new Date(`${date}T${time}`);
    
    // Validace: čas musí být v budoucnosti
    if (alarmDateTime.getTime() < Date.now()) {
      alert('⚠️ Čas alarmu musí být v budoucnosti!');
      return;
    }
    
    onSave({
      time: alarmDateTime.getTime(),
      priority: priority,
      fired: false,
      acknowledged: false
    });
    onClose();
  } else {
    alert('⚠️ Vyplňte datum a čas alarmu!');
  }
};
```

**Klíčové změny**:
- ✅ Odstraněna závislost na `alarmActive` stavu
- ✅ Alarm se uloží pokud je vyplněný datum + čas
- ✅ Validace času (nesmí být v minulosti)
- ✅ Jasné chybové hlášky
- ✅ Automatické zavření modalu po uložení

### 4. **Oprava tlačítka "Uložit"**

**PŘED**:
```javascript
<button 
  onClick={handleSave}
  disabled={!alarmActive && !date && !time}  // ← Špatná logika
  style={{
    background: (alarmActive || (date && time)) ? '#2563eb' : '#cbd5e1',
    cursor: (alarmActive || (date && time)) ? 'pointer' : 'not-allowed',
  }}
>
  {alarmActive ? 'Uložit' : 'Nastavit alarm'}
</button>
```

**PO**:
```javascript
<button 
  onClick={handleSave}
  disabled={!date || !time}  // ← Jednoduchá validace
  style={{
    background: (date && time) ? '#2563eb' : '#cbd5e1',
    cursor: (date && time) ? 'pointer' : 'not-allowed',
    opacity: (date && time) ? 1 : 0.6
  }}
>
  Uložit alarm
</button>
```

**Změny**:
- ✅ Tlačítko disabled pouze pokud chybí datum NEBO čas
- ✅ Jednoznačný text "Uložit alarm"
- ✅ Vizuální indikace (opacity) když je disabled

### 5. **Tlačítko "Deaktivovat"**

Zůstává samostatné pro explicitní vypnutí alarmu:

```javascript
const handleDeactivate = () => {
  setAlarmActive(false);
  onSave(null);  // ← Toto je jediné místo kde se uloží null
  onClose();
};
```

---

## 🎯 Uživatelské scénáře

### Scénář A: První nastavení alarmu
```
1. Kliknout na šedou 🔔 ikonu
2. Modal se otevře s výchozími hodnotami (nyní + 30 min)
3. Upravit datum/čas/prioritu
4. Kliknout "Uložit alarm"
5. ✅ Alarm je uložen v DB
6. ✅ Ikona 🔔 je zvýrazněná
7. ✅ Nastavení je uloženo do localStorage
```

### Scénář B: Úprava existujícího alarmu
```
1. Kliknout na zvýrazněnou 🔔 ikonu
2. Modal se otevře s předvyplněnými hodnotami z alarmu
3. Upravit čas (např. +1 hodina)
4. Kliknout "Uložit alarm"
5. ✅ Alarm je aktualizován v DB
6. ✅ Ikona zůstává zvýrazněná
7. ✅ Nové nastavení je uloženo do localStorage
```

### Scénář C: Deaktivace alarmu
```
1. Kliknout na zvýrazněnou 🔔 ikonu
2. Modal se otevře s předvyplněnými hodnotami
3. Kliknout "⏸️ Deaktivovat"
4. ✅ Alarm je nastaven na null v DB
5. ✅ Ikona 🔔 je šedá
6. ✅ Nastavení ZŮSTÁVÁ v localStorage
```

### Scénář D: Opětovná aktivace po deaktivaci
```
1. Kliknout na šedou 🔔 ikonu
2. Modal se otevře s POSLEDNÍMI hodnotami (z localStorage)
3. Kliknout "Uložit alarm" (bez úprav)
4. ✅ Alarm je znovu aktivován s původními hodnotami
5. ✅ Ikona 🔔 je opět zvýrazněná
```

---

## 📊 Datový tok

### Uložení alarmu

```
User klikne "Uložit alarm"
    ↓
handleSave()
    ↓
Validace: date && time?
    ├─→ NE: Alert "Vyplňte datum a čas"
    └─→ ANO:
        ↓
        Validace: alarmTime > now?
        ├─→ NE: Alert "Čas musí být v budoucnosti"
        └─→ ANO:
            ↓
            onSave({
              time: timestamp,
              priority: "HIGH",
              fired: false,
              acknowledged: false
            })
            ↓
            useFloatingPanels.updateTaskAlarm(id, alarmObj)
            ↓
            setTasks(prev => prev.map(...))
            ↓
            useEffect detekuje změnu tasks
            ↓
            saveTasks() (debounce 500ms)
            ↓
            ├─→ secureStorage.setItem() ✅ LocalStorage
            └─→ notesAPI.saveTodo() ✅ Database
```

### Načítání hodnot do modalu

```
AlarmModal se otevře
    ↓
Kontrola: existingAlarm?
    ├─→ ANO (task.alarm !== null):
    │   defaults = {
    │     date: alarm.time → YYYY-MM-DD,
    │     time: alarm.time → HH:MM,
    │     priority: alarm.priority
    │   }
    │
    └─→ NE (task.alarm === null):
        ↓
        Kontrola: last_alarm_settings_${task.id}?
        ├─→ ANO:
        │   defaults = localStorage.getItem(...)
        │
        └─→ NE:
            defaults = {
              date: nyní + 30min → YYYY-MM-DD,
              time: nyní + 30min → HH:MM,
              priority: "NORMAL"
            }
    ↓
setDate(defaults.dateStr)
setTime(defaults.timeStr)
setPriority(defaults.priority)
```

---

## 🧪 Testování

### Test 1: Alarm se uloží

```bash
# 1. Nastavit alarm
# 2. Otevřít DevTools → Application → Local Storage
# 3. Hledat klíč: layout_tasks_[userId]
# 4. Ověřit že obsahuje alarm objekt (ne null)

# Expected:
{
  "id": "...",
  "text": "...",
  "alarm": {
    "time": 1729360800000,
    "priority": "HIGH",
    "fired": false,
    "acknowledged": false
  }
}
```

### Test 2: Předvyplnění po deaktivaci

```bash
# 1. Nastavit alarm na 20.10.2025 14:00 HIGH
# 2. Uložit
# 3. Kliknout "Deaktivovat"
# 4. Otevřít modal znovu
# 5. Ověřit že je předvyplněné: 20.10.2025 14:00 HIGH

# Expected localStorage klíč:
# last_alarm_settings_[taskId]: {
#   "dateStr": "2025-10-20",
#   "timeStr": "14:00",
#   "priority": "HIGH"
# }
```

### Test 3: Validace času v minulosti

```bash
# 1. Otevřít alarm modal
# 2. Nastavit datum na včera
# 3. Kliknout "Uložit alarm"

# Expected:
# Alert: "⚠️ Čas alarmu musí být v budoucnosti!"
# Modal zůstává otevřený
```

### Test 4: Disabled tlačítko

```bash
# 1. Otevřít modal
# 2. Smazat datum
# Expected: Tlačítko "Uložit alarm" je disabled (šedé)

# 3. Vyplnit datum
# 4. Smazat čas
# Expected: Tlačítko je stále disabled

# 5. Vyplnit čas
# Expected: Tlačítko je enabled (modré)
```

---

## 📝 Checklist

- [x] `handleSave()` uloží alarm pokud je vyplněný datum + čas
- [x] Validace času v budoucnosti
- [x] localStorage cache pro poslední nastavení
- [x] `getLastAlarmSettings()` funkce
- [x] Prioritní načítání: alarm > lastSettings > default
- [x] Tlačítko "Uložit" disabled pouze pokud chybí datum/čas
- [x] `handleDeactivate()` zavírá modal po deaktivaci
- [x] `handleSave()` zavírá modal po uložení
- [x] Debug console.log pro kontrolu dat
- [x] Chybové alerty pro validaci

---

## 🎉 Výsledek

### PŘED:
- ❌ Alarm se ukládal jako `null`
- ❌ Modal se otevřel s výchozími hodnotami po deaktivaci
- ❌ Špatná logika tlačítka "Uložit"
- ❌ Ztráta historických dat

### PO:
- ✅ Alarm se vždy uloží pokud je vyplněný
- ✅ Modal pamatuje poslední nastavení
- ✅ Validace času (musí být v budoucnosti)
- ✅ Jasné chybové hlášky
- ✅ localStorage cache pro každý úkol
- ✅ Automatické zavírání modalu
- ✅ Inteligentní předvyplňování

---

**Status**: ✅ Opraveno  
**Datum**: 19.10.2025  
**Verze**: 1.3 (finální fix)
