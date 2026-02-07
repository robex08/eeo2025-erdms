# CHANGELOG: Vylepšení UI kalendáře

**Datum:** 24. prosince 2025  
**Status:** ✅ **NASAZENO DO PRODUKCE**  
**Verze:** 2.0 (s kategoriemi a opravou hover)

---

## 🎯 Provedené změny

### Verze 2.0 - Kategorie a oprava hover (24.12.2025 22:41)

#### 1. Oprava hover logiky - KRITICKÁ OPRAVA ⚠️
- **Problém:** Dropdown mizel hned po opuštění ikony kalendáře, nebylo možné najet myší na události
- **Řešení:**
  - Přidán state `calendarHoverTimeout` pro řízení zpoždění
  - Nové funkce `handleCalendarMouseEnter()` a `handleCalendarMouseLeave()`
  - Timeout 300ms před zavřením dropdownu
  - Dropdown zůstává otevřený při pohybu myši mezi ikonou a dropdown menu
  - Clearování timeoutu při opětovném najetí myší

#### 2. Barevné kategorie událostí
- **Problém:** Nebylo poznat kategorii události z kalendáře
- **Řešení:**
  - Přidáno pole `categories` do Graph API query
  - Funkce `getCategoryColor(categories)` mapuje kategorie na barvy
  - Barva levého okraje události odpovídá kategorii
  - Název události má barvu podle kategorie (font-weight: 700)
  
**Podporované kategorie:**
- 🔵 Modrá kategorie / Blue category: `#3b82f6`
- 🟢 Zelená kategorie / Green category: `#10b981`
- 🔴 Červená kategorie / Red category: `#ef4444`
- 🟡 Žlutá kategorie / Yellow category: `#f59e0b`
- 🟠 Oranžová kategorie / Orange category: `#f97316`
- 🟣 Fialová kategorie / Purple category: `#8b5cf6`
- 🔷 Tyrkysová kategorie / Teal category: `#06b6d4`
- ⚪ Šedá kategorie / Gray category: `#6b7280`
- ⚫ Výchozí (bez kategorie): `#3b82f6`

---

### Verze 1.0 - Základní responsive + tooltip (24.12.2025 20:00)

#### 1. Responzivní dropdown kalendáře
- **Problém:** Dropdown mizel na úzkých obrazovkách
- **Řešení:** 
  - Přidán `max-width: calc(100vw - 40px)` pro základní viewport
  - Na mobilech (< 768px): `max-width: calc(100vw - 20px)`, šířka 350px
  - Na malých mobilech (< 480px): `max-width: calc(100vw - 10px)`, šířka 320px, posun `-10px`
  - Dropdown vždy zarovnán vpravo (`right: 0`)

### 2. Podmíněné zobrazení lokace
- **Problém:** Špendlík (📍) se zobrazoval i když událost nemá místo
- **Řešení:** 
  - Změna podmínky z `{event.location &&` na `{event.location && event.location.displayName &&`
  - Špendlík se nyní zobrazí **pouze** pokud `displayName` existuje a není prázdný

### 3. Tooltip s popisem události
- **Problém:** Nebylo možné vidět popis události (bodyPreview)
- **Řešení:**
  - Přidán `title={event.bodyPreview ? event.bodyPreview : ''}` na `.calendar-event-item`
  - Vlastní CSS tooltip s:
    - Tmavým pozadím (#1f2937 / #374151 dark mode)
    - Šipkou směřující k události
    - Max-width 300px, zalamování textu
    - Na desktop: zobrazení vpravo od události
    - Na mobilech: zobrazení nad událostí
  - Kurzor změněn na `cursor: help` pro indikaci tooltipu

---

## 📁 Upravené soubory

### Dashboard.jsx
**Soubor:** `/var/www/erdms-dev/dashboard/src/components/Dashboard.jsx`

**Změny:**
```jsx
// Přidán title atribut s bodyPreview
<div 
  key={index} 
  className="calendar-event-item"
  title={event.bodyPreview ? event.bodyPreview : ''}
>
  <div className="event-time">{formatEventDate(event.start.dateTime)}</div>
  <div className="event-subject">{event.subject}</div>
  {event.location && event.location.displayName && (
    <div className="event-location">📍 {event.location.displayName}</div>
  )}
</div>
```

### Dashboard.css
**Soubor:** `/var/www/erdms-dev/dashboard/src/components/Dashboard.css`

**Změny:**

1. **Responzivní dropdown:**
```css
.calendar-dropdown {
  max-width: calc(100vw - 40px);
  /* ... */
}

@media (max-width: 768px) {
  .calendar-dropdown {
    width: 350px;
    max-width: calc(100vw - 20px);
  }
}

@media (max-width: 480px) {
  .calendar-dropdown {
    width: 320px;
    max-width: calc(100vw - 10px);
    right: -10px;
  }
}
```

2. **Tooltip styling:**
```css
.calendar-event-item {
  cursor: help;
  position: relative;
}

/* Tooltip bublina */
.calendar-event-item[title]:not([title=""]):hover::after {
  content: attr(title);
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-left: 12px;
  padding: 12px 16px;
  background: #1f2937;
  color: white;
  border-radius: 8px;
  max-width: 300px;
  /* ... */
}

/* Tooltip šipka */
.calendar-event-item[title]:not([title=""]):hover::before {
  border-right: 6px solid #1f2937;
  /* ... */
}
```

---

## 🚀 Nasazení

### Build
```bash
cd /var/www/erdms-dev/dashboard
npm run build
```

**Výsledek:**
- Build ID: `index-BvLypHdb.js` (277.65 kB, gzip: 82.90 kB)
- CSS: `index-CCD8-JH4.css` (50.07 kB, gzip: 9.50 kB)

### Deployment
```bash
rsync -av --delete /var/www/erdms-dev/dashboard/build/ /var/www/erdms-platform/dashboard/build/
```

**Status:** ✅ Nasazeno 24.12.2025

---

## 🧪 Testování

### Desktop (1920x1080)
- ✅ Dropdown se zobrazuje správně zarovnaný vpravo
- ✅ Tooltip se zobrazuje vpravo od události
- ✅ Špendlík se zobrazuje pouze u událostí s místem
- ✅ Hover na události zobrazí popis

### Tablet (768x1024)
- ✅ Dropdown má šířku 350px, max-width 748px
- ✅ Tooltip se zobrazuje nad událostí

### Mobil (375x667)
- ✅ Dropdown má šířku 320px, max-width 365px
- ✅ Dropdown mírně přesahuje vpravo (-10px) pro lepší využití místa
- ✅ Tooltip se zobrazuje nad událostí s šipkou nahoru

---

## 📝 Poznámky

### Tooltip implementace
- Používá CSS `::before` a `::after` pseudo-elementy
- `title` atribut s `bodyPreview` z Graph API
- Automaticky skryto pokud je `title=""` pomocí `:not([title=""])`
- Responzivní zobrazení podle šířky viewportu

### Lokace validace
- Kontrola `event.location && event.location.displayName` místo jen `event.location`
- Chrání před prázdnými objekty lokace

### Dark mode podpora
- Tooltip má tmavší pozadí v dark mode (#374151)
- Všechny barvy přizpůsobeny CSS custom properties

---

## 🔗 Související dokumenty
- [CALENDAR_PERMISSIONS.md](_docs/CALENDAR_PERMISSIONS.md) - Nastavení Azure AD oprávnění
- [BUILD.md](dashboard/BUILD.md) - Build proces dashboardu
