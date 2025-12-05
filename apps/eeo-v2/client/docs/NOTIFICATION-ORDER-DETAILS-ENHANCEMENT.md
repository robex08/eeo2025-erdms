# 🔔 Vylepšení detailů v notifikacích objednávek

**Datum:** 25. října 2025  
**Implementováno v:** `OrderForm25.js`, `NotificationBell.js`

## 📋 Požadavky

Notifikace o objednávkách nyní zahrnují:
1. **Jméno osoby, která provedla akci** (ne jen vytvořitele)
2. **Datum akce** (vytvoření, schválení, odeslání, atd.)
3. **Aktivní link "Edit"** na objednávku
4. **Profesionální vzhled** s gradienty a ikonami

## ✨ Implementované změny

### 1. Dynamické určení relevantní osoby podle akce

**Soubor:** `src/forms/OrderForm25.js`

Podle stavu objednávky se určuje:
- **Vytvořena** → Zobrazí se objednatel
- **Schválena** → Zobrazí se schvalovatel
- **Zamítnuta** → Zobrazí se schvalovatel
- **Odeslána** → Zobrazí se garant/odesílatel
- **Potvrzena** → Zobrazí se dodavatel
- **Zrušena** → Zobrazí se osoba, která zrušila
- **Čeká** → Zobrazí se schvalovatel

```javascript
// Dynamické určení relevantního jména a data podle akce
let actionPerformedBy = creatorName;
let actionPerformedByLabel = 'Vytvořil';
let actionDate = formatDate(createdDate);
let actionDateLabel = 'Datum vytvoření';
let actionIcon = '📝';

// Určení podle typu notifikace
if (hasSchvalena && !hadSchvalena) {
  actionPerformedBy = getUserNameById(formData.schvalovatel_id) || 'Schvalovatel';
  actionPerformedByLabel = 'Schválil';
  actionDate = formData.dt_schvaleni ? formatDate(formData.dt_schvaleni) : ...;
  actionDateLabel = 'Datum schválení';
  actionIcon = '✅';
}
// ... další stavy
```

### 2. Rozšířená data v notifikaci

Každá notifikace obsahuje v `data_json`:
```json
{
  "order_id": 123,
  "order_number": "2025/001",
  "workflow_state": "SCHVALENA",
  "creator_name": "Jan Novák",
  "created_date": "25. 10. 2025",
  "action_performed_by": "Petr Svoboda",
  "action_performed_by_label": "Schválil",
  "action_date": "25. 10. 2025",
  "action_date_label": "Datum schválení",
  "action_icon": "✅",
  "edit_link": "/order-form-25?id=123&mode=edit"
}
```

### 3. Profesionální UI s gradienty

**Soubor:** `src/components/NotificationBell.js`

Nový design notifikačního boxu:
- **Gradientní pozadí** (fialová → růžová)
- **Ikony podle akce** (✅ schválení, 📤 odeslání, ❌ zamítnutí, atd.)
- **Strukturované zobrazení informací**
- **Interaktivní tlačítko "Editovat objednávku"**
- **Dekorativní efekty** (rozmazané pozadí, stíny)

```jsx
<div style={{
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '8px',
  color: 'white',
  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.25)',
  // ... další styly
}}>
  {/* Hlavní akce s ikonou */}
  <div>
    <span>{actionIcon}</span>
    <div>
      <div>{actionPerformedByLabel}</div>
      <div>{actionPerformedBy}</div>
    </div>
  </div>
  
  {/* Datum akce */}
  <div>
    <div>{actionDateLabel}</div>
    <div>{actionDate}</div>
  </div>
  
  {/* Původní vytvořitel (pokud se liší) */}
  {creator_name !== action_performed_by && (
    <div>
      📝 Původní objednatel: {creator_name}
      📅 Vytvořeno: {created_date}
    </div>
  )}
  
  {/* Tlačítko Edit */}
  <a href={editLink}>
    ✏️ Editovat objednávku
  </a>
</div>
```

## 🎨 Ikony podle stavů

| Stav | Ikona | Label | Osoba |
|------|-------|-------|-------|
| Vytvořena | 📝 | Vytvořil | Objednatel |
| Ke schválení | 📝 | Vytvořil | Objednatel |
| Schválena | ✅ | Schválil | Schvalovatel |
| Zamítnuta | ❌ | Zamítl | Schvalovatel |
| Čeká | ⏸️ | Vrátil k doplnění | Schvalovatel |
| Odeslána | 📤 | Odeslal | Garant |
| Potvrzena | ✔️ | Potvrdil | Dodavatel |
| Zrušena | 🚫 | Zrušil | Stornující osoba |

## 📱 Zobrazení v UI

### Příklad notifikace "Schválena":

```
┌─────────────────────────────────────────────┐
│ 🔔 Objednávka schválena: 2025/001          │
│ Objednávka 2025/001 byla schválena.       │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │  [Gradientní box - fialová/růžová]  │   │
│ │                                       │   │
│ │  ✅ SCHVÁLIL                         │   │
│ │  Petr Svoboda                        │   │
│ │                                       │   │
│ │     Datum schválení                  │   │
│ │     25. 10. 2025                     │   │
│ │  ─────────────────────────────       │   │
│ │  📝 Původní objednatel: Jan Novák   │   │
│ │  📅 Vytvořeno: 24. 10. 2025         │   │
│ │                                       │   │
│ │  [✏️ Editovat objednávku]  ←─ tlačítko│  │
│ └─────────────────────────────────────┘   │
│                                             │
│ Před 5 min              Jan Novák          │
└─────────────────────────────────────────────┘
```

## 🔄 Parsování dat

V `NotificationBell.js` se automaticky parsuje `data_json`:

```javascript
// Parsuj data_json pokud je to string
let parsedData = notification.data;
if (!parsedData && notification.data_json) {
  try {
    parsedData = typeof notification.data_json === 'string' 
      ? JSON.parse(notification.data_json) 
      : notification.data_json;
  } catch (e) {
    console.error('[NotificationBell] Error parsing data_json:', e);
    parsedData = {};
  }
}
```

## ✅ Testování

1. **Vytvoř novou objednávku** → Notifikace zobrazí objednatele jako "Vytvořil"
2. **Schval objednávku** → Notifikace zobrazí schvalovatele jako "Schválil"
3. **Odešli objednávku** → Notifikace zobrazí garanta jako "Odeslal"
4. **Klikni na "Editovat objednávku"** → Otevře se formulář v edit módu

## 🎯 Výhody

- ✅ **Kontextově relevantní informace** - uživatel vidí, kdo co udělal
- ✅ **Profesionální vzhled** - gradientní design působí moderně
- ✅ **Přehlednost** - strukturované zobrazení s ikonami
- ✅ **Akční tlačítko** - přímý přístup k editaci objednávky
- ✅ **Zachování historie** - původní objednatel je vždy viditelný

## 🔧 Technické detaily

### Závislosti na funkcích:

- `getUserNameById(userId)` - v `OrderForm25.js` pro získání jmen uživatelů
- `formData.objednatel_jmeno` - jméno objednatele
- `formData.schvalovatel_id` - ID schvalovatele
- `formData.garant_uzivatel_id` - ID garanta
- `formData.storno_provedl` - jméno osoby, která stornovala
- `formData.dodavatel_nazev` - název dodavatele

### Formátování dat:

```javascript
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('cs-CZ', { 
      day: 'numeric', 
      month: 'numeric', 
      year: 'numeric' 
    });
  } catch (e) {
    return dateStr;
  }
};
```

## 🚀 Další možná vylepšení

- [ ] Přidat tooltip s dalšími detaily při hoveru
- [ ] Animace při načtení notifikace
- [ ] Barevné schéma podle typu akce (zelená = schváleno, červená = zamítnuto)
- [ ] Export notifikací do PDF/CSV
- [ ] Push notifikace do prohlížeče

---

**Status:** ✅ Implementováno a otestováno  
**Backend compatibility:** Vyžaduje, aby backend správně ukládal `data_json` jako JSON string nebo object
