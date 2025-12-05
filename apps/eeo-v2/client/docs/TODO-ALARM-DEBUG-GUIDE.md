# 🧪 TODO Alarm - Test & Debug Guide

## 🔍 Zjištění problému

### Problém 1: Ikona zvonečku se nezvýrazňuje
**Příčina**: `alarmPriority` může být `null` u starého formátu nebo pokud alarm objekt nemá `priority` field

**Řešení**: ✅ Změněno v `getAlarmPriority()` - vrací `'NORMAL'` místo `null` jako výchozí

### Problém 2: Tooltip neukazuje info
**Příčina**: Tooltip závisí na `alarmTime` a `alarmPriority`

**Řešení**: ✅ Opraveno - `alarmPriority` nyní vždy vrací platnou hodnotu

### Problém 3: Modal nepředvyplňuje data při opakovaném otevření
**Příčina**: Modal správně načítá `existingAlarm`, ale možná tam nejsou data

**Řešení**: ✅ Přidán debug logging pro kontrolu

---

## 🧪 Test v Prohlížeči

### Krok 1: Otevřít DevTools Console

```javascript
// Spustit v konzoli:
console.clear();
console.log('🧪 TODO Alarm Test Suite');
```

### Krok 2: Nastavit test alarm

```javascript
// 1. Vytvořte TODO úkol s textem "Test alarm"
// 2. Klikněte na ikonu 🔔
// 3. V konzoli byste měli vidět:
// → AlarmModal state: {priority: "NORMAL", showPreview: false, ...}

// 4. Nastavte datum a čas (např. zítra 14:00)
// 5. Vyberte HIGH prioritu
// 6. Klikněte "Uložit"

// V konzoli byste měli vidět:
// → 🔔 Task alarm data: {
//     taskId: "...",
//     taskText: "Test alarm",
//     alarm: {time: 1729360800000, priority: "HIGH", fired: false, ...},
//     alarmPriority: "HIGH",
//     alarmTime: 1729360800000,
//     alarmTimeFormatted: "20.10.2025 14:00:00"
//   }
```

### Krok 3: Zkontrolovat UI

```javascript
// ✅ Ikona zvonečku by měla být:
// - Červená s gradientem (HIGH) nebo oranžová (NORMAL)
// - Má červený/oranžový border
// - Je větší (scale 1.05)
// - Má stín (box-shadow)
// - Vedle zvonečku je 🚨 (jen u HIGH)

// ✅ Tooltip (najeďte myší):
// - "🚨 HIGH Alarm: 20.10.2025 14:00" nebo
// - "🔔 NORMAL Alarm: 20.10.2025 14:00"

// ✅ Pod úkolem je zobrazena info:
// - "🔔 20.10.2025 14:00" (NORMAL) nebo
// - "🔔 20.10.2025 14:00 🚨" (HIGH)
```

### Krok 4: Otevřít modal znovu

```javascript
// 1. Klikněte znovu na ikonu 🔔
// 2. Modal by se měl otevřít s předvyplněnými daty:

// ✅ Datum: 20.10.2025
// ✅ Čas: 14:00
// ✅ Priorita: HIGH (červené tlačítko vybrané)

// 3. V konzoli byste měli vidět:
// → AlarmModal state: {
//     priority: "HIGH",
//     showPreview: false,
//     date: "2025-10-20",
//     time: "14:00"
//   }
```

### Krok 5: Zkontrolovat LocalStorage

```javascript
// Spustit v konzoli:
const userId = 'YOUR_USER_ID'; // nebo 'anon' pokud nejste přihlášeni
const key = `layout_tasks_${userId}`;
const encrypted = localStorage.getItem(key);
console.log('🔐 Encrypted data:', encrypted);

// Pokud chcete vidět dešifrovaná data:
// (předpokládá že máte přístup k secureStorage)
import { secureStorage } from './utils/secureStorage';
const tasks = await secureStorage.getItem(key);
console.log('📋 Decrypted tasks:', JSON.parse(tasks));

// Měli byste vidět:
// [
//   {
//     id: "...",
//     text: "Test alarm",
//     done: false,
//     createdAt: 123456789,
//     alarm: {
//       time: 1729360800000,
//       priority: "HIGH",
//       fired: false,
//       acknowledged: false
//     }
//   }
// ]
```

### Krok 6: Zkontrolovat Network request

```javascript
// 1. Otevřít DevTools → Network tab
// 2. Počkat 500ms (debounce)
// 3. Měli byste vidět POST request:

// POST /api.eeo/todonotes/save
// Payload:
// {
//   username: "...",
//   token: "...",
//   typ: "TODO",
//   user_id: 42,
//   obsah: [
//     {
//       id: "...",
//       text: "Test alarm",
//       alarm: {
//         time: 1729360800000,
//         priority: "HIGH",
//         fired: false,
//         acknowledged: false
//       }
//     }
//   ]
// }

// Response:
// {
//   status: "success",
//   ID: 123
// }
```

---

## 🐛 Debug Commands

### Zobrazit všechny úkoly s alarmy

```javascript
// V konzoli:
const tasks = JSON.parse(localStorage.getItem('layout_tasks_anon') || '[]');
const tasksWithAlarms = tasks.filter(t => t.alarm);
console.table(tasksWithAlarms.map(t => ({
  text: t.text,
  alarmTime: new Date(t.alarm.time || t.alarm).toLocaleString('cs-CZ'),
  priority: t.alarm.priority || 'NORMAL',
  fired: t.alarm.fired || false
})));
```

### Vynutit kontrolu alarmů

```javascript
// Background task běží každou minutu
// Pro okamžitou kontrolu:
// (toto vyžaduje přístup k React komponentám, takže to nejde přímo z konzole)

// Alternativa: Počkat maximálně 1 minutu
console.log('⏰ Background task checks alarms every 60 seconds');
console.log('Current time:', new Date().toLocaleString('cs-CZ'));
```

### Zkontrolovat stav ikony

```javascript
// Najdi ikonu zvonečku v DOM
const bellButtons = document.querySelectorAll('button[title*="Alarm"]');
bellButtons.forEach((btn, i) => {
  const styles = window.getComputedStyle(btn);
  console.log(`🔔 Bell button ${i}:`, {
    title: btn.title,
    background: styles.background,
    border: styles.border,
    transform: styles.transform,
    boxShadow: styles.boxShadow,
    fontSize: styles.fontSize
  });
});
```

---

## 📊 Expected vs Actual

### ✅ Správné chování

| Stav | Ikona | Tooltip | Info pod úkolem |
|------|-------|---------|----------------|
| **Bez alarmu** | 🔔 šedá, transparentní | "Nastavit alarm" | - |
| **NORMAL alarm** | 🔔 oranžová + border + stín | "🔔 NORMAL Alarm: 20.10.2025 14:00" | "🔔 20.10.2025 14:00" |
| **HIGH alarm** | 🔔 červená + border + stín + 🚨 | "🚨 HIGH Alarm: 20.10.2025 14:00" | "🔔 20.10.2025 14:00 🚨" |

### ❌ Možné problémy

| Problém | Diagnóza | Řešení |
|---------|----------|--------|
| Ikona je šedá i s alarmem | `t.alarm` je null nebo undefined | Zkontrolovat console.log, ověřit že alarm je uložený |
| Tooltip neukazuje datum | `alarmTime` je null | Zkontrolovat `getAlarmTime()`, možná špatný formát |
| Modal není předvyplněný | `existingAlarm` není správně extrahovaný | Zkontrolovat console.log v AlarmModal |
| Alarm nevyprší | Background task neběží | Zkontrolovat že `isLoggedIn` je true |

---

## 🔧 Quick Fixes

### Fix 1: Reset alarm data

```javascript
// Pokud máte špatná data v localStorage:
localStorage.removeItem('layout_tasks_anon');
// Nebo pro konkrétního uživatele:
localStorage.removeItem('layout_tasks_42');

// Refresh stránku
location.reload();
```

### Fix 2: Vynutit re-render

```javascript
// Pokud se UI neaktualizuje:
// Změňte text úkolu (to vyvolá re-render)
// Nebo klikněte na checkbox (done/undone)
```

### Fix 3: Zkontrolovat API response

```javascript
// V Network tab najděte POST request na /todonotes/save
// Zkontrolujte že:
// 1. Status code je 200
// 2. Response obsahuje { status: "success", ID: ... }
// 3. Payload obsahuje alarm objekt
```

---

## 📝 Checklist pro manuální test

- [ ] Vytvořit TODO úkol
- [ ] Kliknout na 🔔 ikonu
- [ ] V konzoli se zobrazí debug log
- [ ] Modal je otevřený
- [ ] Datum a čas jsou předvyplněné (+30 minut od aktuálního času)
- [ ] Nastavit vlastní datum/čas
- [ ] Vybrat HIGH prioritu
- [ ] Kliknout "Zobrazit náhled" → zobrazí se mini popup
- [ ] Kliknout "Uložit"
- [ ] V konzoli se zobrazí "🔔 Task alarm data"
- [ ] Ikona 🔔 je červená + border + stín + 🚨
- [ ] Tooltip ukazuje "🚨 HIGH Alarm: ..."
- [ ] Pod úkolem je info "🔔 ... 🚨"
- [ ] V Network tab je POST request
- [ ] Response je success
- [ ] Kliknout znovu na 🔔
- [ ] Modal je předvyplněný správným datem/časem
- [ ] Priorita je HIGH (červené tlačítko)
- [ ] Změnit čas na +2 minuty od aktuálního
- [ ] Uložit
- [ ] Počkat 2 minuty
- [ ] Mělo by se zobrazit floating popup okénko
- [ ] V konzoli "🔔 ALARM FIRED [HIGH]: ..."
- [ ] Kliknout "✓ Hotové" v popupu
- [ ] Popup zmizí
- [ ] Úkol je označený jako hotový (done)

---

## 🎯 Co debug logging ukáže

### Console output při nastavení alarmu:

```
AlarmModal state: {
  priority: "HIGH",
  showPreview: false,
  date: "2025-10-20",
  time: "14:00"
}

🔔 Task alarm data: {
  taskId: "b4f5c6d7-e8f9-0a1b-2c3d-4e5f6a7b8c9d",
  taskText: "Test alarm",
  alarm: {
    time: 1729360800000,
    priority: "HIGH",
    fired: false,
    acknowledged: false
  },
  alarmPriority: "HIGH",
  alarmTime: 1729360800000,
  alarmTimeFormatted: "20.10.2025 14:00:00"
}
```

### Console output při vypršení alarmu:

```
🔔 ALARM FIRED [HIGH]: Test alarm 2025-10-20T12:00:00.000Z
```

---

**Použití**:
1. Otevřít aplikaci
2. Otevřít DevTools (F12)
3. Přejít na Console tab
4. Následovat kroky výše
5. Sledovat console výstupy
6. Ověřit UI změny

**Status**: ✅ Debug logging aktivní  
**Datum**: 19.10.2025
