# 🗄️ TODO Alarm - Databázová Integrace & Tooltip

## 📋 Přehled Změn (19.10.2025)

### ✅ Co bylo implementováno

#### 1. **Automatické ukládání alarmů do databáze** 💾

Alarm data se nyní automaticky ukládají:
- ✅ **Lokálně**: Do `secureStorage` (šifrovaně)
- ✅ **Na server**: Do databáze přes API endpoint `/api.eeo/todonotes/save`
- ✅ **Backward compatible**: Funguje i bez připojení k serveru

**Datová struktura**:
```javascript
{
  id: "unique-id",
  text: "Text úkolu",
  done: false,
  createdAt: 1729350000000,
  alarm: {
    time: 1729360800000,      // timestamp kdy alarm vyprší
    priority: "HIGH",          // nebo "NORMAL"
    fired: false,              // zda už alarm vypršel
    acknowledged: false        // zda byl alarm potvrzen uživatelem
  }
}
```

#### 2. **Tooltip u ikony zvonečku** 🔔💬

Když najedete myší na ikonu zvonečku (pokud je alarm nastaven):

**NORMAL priorita**:
```
🔔 NORMAL Alarm: 20.10.2025 14:30
Klikněte pro úpravu
```

**HIGH priorita**:
```
🚨 HIGH Alarm: 20.10.2025 14:30
Klikněte pro úpravu
```

**Bez alarmu**:
```
Nastavit alarm
```

#### 3. **Preview pro NORMAL prioritu** 👁️

Nyní můžete zobrazit náhled i pro NORMAL alarm:
- Tlačítko: **"👁️ Zobrazit náhled notifikace"**
- Zobrazí mini verzi notifikace jak se objeví v seznamu upozornění
- Obsahuje: ikonu 🔔, titulek, text úkolu, datum/čas

**Design NORMAL preview**:
```
┌─────────────────────────────────────┐
│ 🔔 Náhled NORMAL Priority Alarmu    │
│ ┌──────────────────────────────────┐│
│ │ [🔔] TODO Alarm                  ││
│ │      Text úkolu                  ││
│ │      20.10.2025 14:30           ││
│ └──────────────────────────────────┘│
│ 💡 Notifikace se zobrazí v seznamu  │
│    upozornění (zvoneček nahoře)     │
└─────────────────────────────────────┘
```

---

## 🔄 Jak funguje databázová synchronizace

### Architektura

```
┌─────────────────┐
│   TodoPanel     │
│  (UI Component) │
└────────┬────────┘
         │ updateTaskAlarm(id, alarm)
         ↓
┌─────────────────┐
│ useFloatingPanels│ Hook
│    (Logic)       │
└────────┬─────────┘
         │ setTasks() → triggere useEffect
         ↓
┌─────────────────┐
│  Auto-save      │
│   useEffect     │
└────────┬────────┘
         │
         ├─→ secureStorage.setItem() [Lokální šifrované úložiště]
         │
         └─→ notesAPI.saveTodo()     [Server API]
                    ↓
         ┌──────────────────┐
         │ /api.eeo/        │
         │ todonotes/save   │
         │   (Backend)      │
         └──────────────────┘
```

### Kód Flow

**1. Uživatel nastaví alarm**:
```javascript
// TodoPanel.js - AlarmModal
const handleSave = () => {
  if (alarmActive && date && time) {
    const alarmDateTime = new Date(`${date}T${time}`);
    onSave({
      time: alarmDateTime.getTime(),
      priority: priority,           // "NORMAL" nebo "HIGH"
      fired: false,
      acknowledged: false
    });
  }
};
```

**2. Update task state**:
```javascript
// useFloatingPanels.js
const updateTaskAlarm = (id, alarm) => {
  setTasks(prev => prev.map(t => 
    t.id === id ? { ...t, alarm } : t
  ));
};
```

**3. Auto-save triggered**:
```javascript
// useFloatingPanels.js - useEffect
useEffect(() => {
  const handler = setTimeout(() => {
    saveTasks();
  }, 500); // debounce 500ms
  
  return () => clearTimeout(handler);
}, [tasks]);
```

**4. Save function**:
```javascript
const saveTasks = useCallback(async () => {
  // 1. Uložit lokálně (vždy)
  await secureStorage.setItem(
    `layout_tasks_${storageId}`, 
    JSON.stringify(tasks)
  );
  
  // 2. Uložit na server (pokud je připojení)
  if (notesAPI && isLoggedIn && tasks.length > 0) {
    const saveResult = await notesAPI.saveTodo(tasks, todoID);
    
    // Uložit ID pro budoucí UPDATE operace
    if (saveResult && saveResult.ID) {
      setTodoID(saveResult.ID);
    }
  }
}, [tasks, notesAPI, isLoggedIn, todoID]);
```

### API Endpoint

**Request**:
```javascript
POST /api.eeo/todonotes/save
Content-Type: application/json

{
  "username": "user123",
  "token": "auth-token-xyz",
  "typ": "TODO",
  "user_id": 42,
  "id": 123,              // null při prvním uložení
  "obsah": [
    {
      "id": "uuid-1",
      "text": "Zavolat klientovi",
      "done": false,
      "createdAt": 1729350000000,
      "alarm": {
        "time": 1729360800000,
        "priority": "HIGH",
        "fired": false,
        "acknowledged": false
      }
    }
  ]
}
```

**Response**:
```javascript
{
  "status": "success",
  "ID": 123,              // ID záznamu v databázi
  "message": "Data uložena"
}
```

---

## 📥 Načítání dat po přihlášení

### Automatické načtení

Když se uživatel přihlásí, data se automaticky načtou:

```javascript
// useFloatingPanels.js - useEffect
useEffect(() => {
  if (!isLoggedIn || !notesAPI) return;
  
  const loadServerData = async () => {
    try {
      const result = await notesAPI.loadTodo();
      
      if (result && Array.isArray(result)) {
        setTasks(result);
      } else if (result && Array.isArray(result.items)) {
        setTasks(result.items);
      }
      
      // Uložit ID pro budoucí UPDATE
      if (result && result.ID) {
        setTodoID(result.ID);
      }
    } catch (error) {
      console.warn('Chyba při načítání TODO:', error);
    }
  };
  
  loadServerData();
}, [isLoggedIn, notesAPI]);
```

### Ikona zvonečku po načtení

Po načtení z databáze se ikona automaticky zvýrazní podle priority:

```javascript
// TodoPanel.js - TodoItemEditable
const alarmPriority = getAlarmPriority(); // načte z t.alarm.priority
const alarmTime = getAlarmTime();         // načte z t.alarm.time

// Ikona se styluje podle priority
style={{
  background: t.alarm 
    ? (alarmPriority === 'HIGH' 
        ? 'linear-gradient(135deg, #fee2e2, #fecaca)'  // červená
        : 'linear-gradient(135deg, #fed7aa, #fdba74)') // oranžová
    : 'transparent',
  border: t.alarm 
    ? (alarmPriority === 'HIGH' 
        ? '1.5px solid #dc2626' 
        : '1.5px solid #ea580c')
    : 'none'
}}
```

---

## 🎯 Příklady použití

### Scénář 1: Nový alarm

```javascript
// 1. Uživatel klikne na 🔔 ikonu
// 2. Otevře se AlarmModal
// 3. Vybere datum: 20.10.2025
// 4. Vybere čas: 14:30
// 5. Vybere prioritu: HIGH
// 6. Klikne "Zobrazit náhled" → vidí mini floating popup
// 7. Klikne "Uložit"
// 8. ✅ Data se uloží:
//    - Lokálně v secureStorage (okamžitě)
//    - Na server v databázi (po 500ms debounce)
// 9. Ikona 🔔 se zvýrazní červeně + zobrazí 🚨
```

### Scénář 2: Přihlášení na jiném zařízení

```javascript
// 1. Uživatel se přihlásí na notebooku
// 2. useFloatingPanels.loadTodo() se zavolá automaticky
// 3. ✅ TODO včetně alarmů se načtou z databáze
// 4. Ikony 🔔 se automaticky zvýrazní podle priorit
// 5. Background task začne kontrolovat alarmy
```

### Scénář 3: Úprava alarmu

```javascript
// 1. Uživatel klikne na zvýrazněnou 🔔 ikonu
// 2. Tooltip ukáže: "🚨 HIGH Alarm: 20.10.2025 14:30"
// 3. Otevře se AlarmModal s předvyplněnými daty
// 4. Uživatel změní čas na 15:00
// 5. Klikne "Uložit"
// 6. ✅ Změna se uloží lokálně i na server
```

### Scénář 4: Deaktivace alarmu

```javascript
// 1. Uživatel otevře AlarmModal
// 2. Klikne "⏸️ Deaktivovat"
// 3. ✅ alarm nastaveno na null
// 4. Ikona 🔔 se vrátí do šedé (nezvýrazněná)
// 5. Změna se uloží do databáze
```

---

## 🔐 Bezpečnost

### Šifrování

- **Lokální data**: Šifrována pomocí `secureStorage` (AES-256)
- **Server komunikace**: HTTPS + autentizační token
- **User isolation**: Každý uživatel vidí jen své TODO

### Validace

```javascript
// Backend by měl validovat:
- token && username → ověřit session
- user_id → ověřit že patří k tokenu
- obsah → validovat JSON strukturu
- alarm.time → validovat timestamp (future date)
- alarm.priority → validovat enum ["NORMAL", "HIGH"]
```

---

## 📊 Status Bar

Status bar ukazuje stav synchronizace:

```
┌────────────────────────────────────┐
│ 💾 Lokálně: před 2s                │
│ ☁️ Server: před 5s ✓               │
│ [🔄 Synchronizovat]                │
└────────────────────────────────────┘
```

**Stavy**:
- ✓ = synchronized successfully
- ⏳ = syncing...
- ❌ = error (zobrazí chybovou hlášku)

---

## 🧪 Testování

### Test 1: Ukládání alarmu
```bash
# 1. Nastavit alarm
# 2. Otevřít DevTools → Network tab
# 3. Sledovat POST request na /api.eeo/todonotes/save
# 4. Ověřit payload obsahuje alarm objekt
```

### Test 2: Načítání po přihlášení
```bash
# 1. Odhlásit se
# 2. Otevřít DevTools → Application → Clear site data
# 3. Přihlásit se znovu
# 4. Sledovat GET request na /api.eeo/todonotes/load
# 5. Ověřit že alarmy se načetly a ikony jsou zvýrazněné
```

### Test 3: Tooltip
```bash
# 1. Nastavit NORMAL alarm na 20.10.2025 14:30
# 2. Najet myší na 🔔 ikonu
# 3. Tooltip by měl ukázat: "🔔 NORMAL Alarm: 20.10.2025 14:30"
# 4. Změnit na HIGH alarm
# 5. Tooltip by měl ukázat: "🚨 HIGH Alarm: 20.10.2025 14:30"
```

### Test 4: Preview NORMAL
```bash
# 1. Otevřít AlarmModal
# 2. Vybrat NORMAL prioritu
# 3. Kliknout "👁️ Zobrazit náhled notifikace"
# 4. Měla by se zobrazit mini notifikace s 🔔 ikonou
# 5. Zkontrolovat že obsahuje text úkolu a datum/čas
```

---

## 🐛 Možné problémy

### Problém 1: Data se neukládají na server

**Příčiny**:
- `notesAPI` není inicializováno (chybí token/username)
- `isLoggedIn` je false
- Network error

**Řešení**:
```javascript
// Debug v konzoli:
console.log('notesAPI:', notesAPI);
console.log('isLoggedIn:', isLoggedIn);
console.log('token:', token);
console.log('username:', username);
```

### Problém 2: Ikona není zvýrazněná po načtení

**Příčiny**:
- Alarm data mají špatnou strukturu
- `getAlarmPriority()` vrací null
- CSS styly nejsou aplikovány

**Řešení**:
```javascript
// Debug:
console.log('Task alarm:', task.alarm);
console.log('Alarm priority:', getAlarmPriority());
console.log('Alarm time:', getAlarmTime());
```

### Problém 3: Tooltip neukazuje datum

**Příčiny**:
- `alarmTime` je null/undefined
- Špatný formát timestampu

**Řešení**:
```javascript
// Ověřit:
const alarmTime = getAlarmTime();
console.log('Alarm time:', alarmTime);
console.log('Formatted:', new Date(alarmTime).toLocaleString('cs-CZ'));
```

---

## 📝 Changelog

### Verze 1.2 (19.10.2025)
- ✅ Přidán tooltip s datem/časem alarmu
- ✅ Preview pro NORMAL prioritu
- ✅ Dokumentace databázové integrace

### Verze 1.1 (19.10.2025)
- ✅ Deaktivace alarmu
- ✅ Preview pro HIGH prioritu
- ✅ Výrazná ikona zvonečku

### Verze 1.0 (19.10.2025)
- ✅ Základní alarm systém
- ✅ NORMAL/HIGH priority
- ✅ Floating popup pro HIGH
- ✅ Background check každou minutu

---

**Status**: ✅ Kompletní integrace s databází  
**Datum**: 19.10.2025  
**Autor**: GitHub Copilot
