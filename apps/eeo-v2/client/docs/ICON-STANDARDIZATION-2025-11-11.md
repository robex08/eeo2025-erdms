# Icon Standardization - Implementation Summary
**Date:** 2025-11-11  
**Task:** Sladit ikony v notifikacích u dlaždic aby byly stejné jako v seznamu objednávek

## 🎯 Problem
Uživatelé byli mateni nekonzistentními ikonami napříč aplikací:
- **NotificationsPage.js** používal `getPriorityIcon()` s obecnými ikonami podle priority (urgent, high, normal, low)
- **Orders25List.js** používal `getStatusIcon()` s specifickými ikonami podle stavu objednávky
- Dashboard tiles (StatCard komponenty) používaly stejnou logiku jako Orders25List
- **Výsledek:** Stejný stav objednávky měl různé ikony na různých místech v UI

## ✅ Solution
Vytvořili jsme centralizovaný modul pro mapování ikon:

### 1. Nový modul: `src/utils/iconMapping.js`
```javascript
export const getStatusIcon = (status) => {
  // Mapuje stav objednávky → FontAwesome ikona
  // Podporuje různé formáty: 'nova', 'ke_schvaleni', 'keSchvaleni'
}

export const getNotificationIcon = (notificationType, priority) => {
  // Pro order_status_* notifikace → použije getStatusIcon()
  // Pro ostatní notifikace → specifické ikony podle typu
}

export const getPriorityIcon = (priority) => {
  // Fallback podle priority pro obecné notifikace
}
```

### 2. Aktualizované komponenty

#### NotificationsPage.js
**Před:**
```javascript
const getPriorityIcon = (priority) => {
  switch (priority) {
    case 'urgent': return faExclamationCircle;
    case 'high': return faClock;
    default: return faInfoCircle;
  }
};

// Použití:
<FontAwesomeIcon icon={getPriorityIcon(priority)} />
```

**Po:**
```javascript
import { getNotificationIcon, getPriorityIcon } from '../utils/iconMapping';

// Použití:
<FontAwesomeIcon icon={getNotificationIcon(mainNotification.type, priority)} />
```

#### Orders25List.js
**Před:**
```javascript
const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'nova': return faPlay;
    case 'schvalena': return faCheckCircle;
    // ... 15+ cases
  }
};
```

**Po:**
```javascript
import { getStatusIcon } from '../utils/iconMapping';

// Použití zůstává stejné, ale funkce je sdílená:
<FontAwesomeIcon icon={getStatusIcon('schvalena')} />
```

## 📊 Icon Mapping Reference

| Stav objednávky | Ikona | Význam |
|----------------|-------|--------|
| `nova` | faPlay | Start/začátek |
| `odeslana_ke_schvaleni` | faHourglassHalf | Čeká se |
| `schvalena` | faCheckCircle | Schváleno |
| `zamitnuta` | faBan | Zakázáno |
| `rozpracovana` | faClock | Probíhá |
| `odeslana` | faTruck | Odeslána |
| `potvrzena` | faShield | Chráněno/potvrzeno |
| `uverejnena` | faFileContract | Smlouva/dokument |
| `dokoncena` | faStop | Ukončeno |
| `ceka_potvrzeni` | faPause | Pozastaveno |
| `zrusena` | faTimesCircle | Zrušeno |
| `archivovano` | faArchive | Archiv |

## 🔄 Notification Type Mapping

Notifikace typu `order_status_*` se nyní automaticky mapují na příslušné ikony:
- `order_status_nova` → ikona `nova` (faPlay)
- `order_status_schvalena` → ikona `schvalena` (faCheckCircle)
- `order_status_odeslana` → ikona `odeslana` (faTruck)
- atd.

## 📁 Affected Files

### Vytvořeno:
- ✅ `src/utils/iconMapping.js` - Centralizovaný modul pro ikony

### Aktualizováno:
- ✅ `src/pages/NotificationsPage.js`
  - Import `getNotificationIcon` a `getPriorityIcon`
  - Odstranění lokální `getPriorityIcon()` funkce
  - Aktualizace 2 míst použití ikon
  
- ✅ `src/pages/Orders25List.js`
  - Import `getStatusIcon`
  - Odstranění lokální `getStatusIcon()` funkce
  - Všechna existující použití (30+ míst) fungují beze změny

## 🎨 Benefits

### 1. **Konzistence**
- Stejný stav = stejná ikona všude v aplikaci
- Notifikace, dashboard tiles a seznam objednávek sdílí stejnou ikonografii

### 2. **Maintainability**
- Ikony definované na jednom místě
- Snadná změna ikon pro všechny komponenty najednou
- Žádná duplikace kódu

### 3. **Extensibility**
- Snadné přidání nových stavů/ikon
- Podpora pro různé formáty názvů stavů (s/bez diakritiky, snake_case, camelCase)

### 4. **User Experience**
- Uživatelé rychle rozpoznají stav objednávky podle ikony
- Žádná změna barvy nebo pozice prvků - jen konzistentní ikony

## 🧪 Testing

### Manuální test:
1. Otevřít NotificationsPage
2. Zkontrolovat, že notifikace o změně stavu objednávky mají stejné ikony jako v seznamu
3. Otevřít Orders25List
4. Zkontrolovat, že dashboard tiles mají konzistentní ikony
5. Porovnat ikony mezi všemi třemi místy

### Expected Results:
- ✅ Notifikace `order_status_schvalena` zobrazuje `faCheckCircle`
- ✅ Dashboard tile "Schválená" zobrazuje `faCheckCircle`
- ✅ Řádek v seznamu se stavem "schvalena" zobrazuje `faCheckCircle`

## 📝 Notes

### Zachována zpětná kompatibilita:
- Existující kód funguje beze změny
- Všechny komponenty používající `getStatusIcon()` fungují stejně jako dříve
- Notifikace bez typu `order_status_*` stále používají priority ikony

### Normalizace vstupů:
- `iconMapping.js` podporuje různé formáty názvů stavů
- Odstraňuje diakritiku pro robustnost
- Převádí na lowercase pro case-insensitive matching

### Future Improvements:
- Zvážit přidání barvy ikony do centrálního modulu (nyní definována v NOTIFICATION_CONFIG)
- Možná integrace s `orderStatusColors.js` pro jednotnou konfiguraci

## 🎓 Implementation Principles

1. **Single Source of Truth** - Jedna definice ikon pro celou aplikaci
2. **DRY (Don't Repeat Yourself)** - Žádná duplikace kódu
3. **Progressive Enhancement** - Funguje s existujícím kódem, postupné zlepšení
4. **Backwards Compatible** - Zachována funkcionalita všech komponent

---

**Status:** ✅ **COMPLETED**  
**Build:** ✅ No errors  
**Ready for:** Production deployment
