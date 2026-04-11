# Dashboard – nastavení velikosti karet (1x / 2x / 3x / 4x)

**Datum:** 2026-04-11  
**Status:** TODO – naimplementovat

---

## Aktuální stav

### Grid (`DashGrid`)
Responsivní, automatický počet sloupců:
- `< 768px` → 1 sloupec
- `768–1199px` → 2 sloupce
- `1200–1599px` → 3 sloupce
- `≥ 1600px` → 4 sloupce

### Současné velikosti bloků
- **1x** = výchozí (1 sloupec)
- **2x** = `$span2` prop → 2 sloupce — **hardcoded** pro:
  - `orders_stats`, `invoices_stats`, `chart_timeline`, `top_suppliers`
  - `cashbook_summary`, `active_users_admin`, `rss_news`, `chart_majetek`, `chart_fees`

### Kde se ukládá nastavení
- `fetchUserSettings` / `saveUserSettings` (soubor `src/services/userSettingsApi.js`)
- Klíč v DB: `dashboard_layout: { tiles: [...], visible: [...] }`
- Cache v `localStorage` klíč: `dashboard_config_{userId}`

---

## Co je potřeba implementovat

### 1. Rozšířit uložený config o `spans` mapu
```js
// Dnes:
{ tiles: [...], visible: [...] }

// Po rozšíření:
{ tiles: [...], visible: [...], spans: { 'orders_stats': 2, 'chart_timeline': 3 } }
```
Zpětná kompatibilita: pokud klíč `spans` chybí, použij `DEFAULT_SPANS` fallback.

### 2. `DEFAULT_SPANS` – zachovat původní hardcoded hodnoty jako fallback
```js
// src/pages/DashboardPage.js
const DEFAULT_SPANS = {
  orders_stats: 2, invoices_stats: 2, chart_timeline: 2,
  top_suppliers: 2, cashbook_summary: 2, active_users_admin: 2,
  rss_news: 2, chart_majetek: 2, chart_fees: 2
};
// Ostatní widgety = 1 (výchozí)
```

### 3. State ve funkci `Dashboard()`
```js
const [widgetSpans, setWidgetSpans] = useState({});

// Při načtení z DB/localStorage:
setWidgetSpans(dbConfig.spans || {});

// Při ukládání:
saveConfig(tiles, visible, widgetSpans);
// → dashboard_layout: { tiles, visible, spans: widgetSpans }
```

### 4. Nahradit hardcoded `isSpan2` dynamickým výpočtem
```js
// Dnes (hardcoded – řádek 4544):
const isSpan2 = tileId === 'orders_stats' || tileId === 'rss_news' || ...;

// Po refaktoru:
const span = widgetSpans[tileId] ?? DEFAULT_SPANS[tileId] ?? 1;
```

### 5. `WidgetCard` styled component – přidat `$span` prop
```js
// Dnes (řádek 535):
${p => p.$span2 && `grid-column: span 2; @media (max-width: 900px) { grid-column: span 1; }`}

// Po rozšíření:
${p => p.$span > 1 && `
  grid-column: span ${p.$span};
  @media (max-width: 1199px) { grid-column: span ${Math.min(p.$span, 2)}; }
  @media (max-width: 900px)  { grid-column: span 1; }
`}
```

### 6. Renderování widgetu – předat `$span`
```jsx
// Dnes (řádek 4772):
<WidgetCard key={tileId} $accent={cfg.color} $index={index} $span2={isSpan2} ...>

// Po rozšíření:
<WidgetCard key={tileId} $accent={cfg.color} $index={index} $span={span} ...>
```

### 7. `DashboardConfigModal` – přidat tlačítka 1x / 2x / 3x / 4x
Ke každému widgetu v configu přidat skupinu tlačítek:
```
[ ≡  📦 Statistiky objednávek    [1x] [2x] [3x] [4x]  🔵toggle ]
```
- Aktivní span = zvýrazněné tlačítko
- Klik → `onChangeSpan(tileId, newSpan)` callback
- Propojeno s `widgetSpans` state + `saveConfig`

Signature modalu rozšířit:
```js
function DashboardConfigModal({ tiles, visibleTiles, widgetSpans, onToggle, onReorder, onChangeSpan, onClose, availableWidgets })
```

---

## Omezení / poznámky

- **4x má smysl jen při ≥ 1600px** (4 sloupce) – na menším displeji se omezí automaticky přes CSS
- **Volitelné:** přidat `maxSpan` do `WIDGET_REGISTRY` pro widgety, kde větší layout vizuálně nedává smysl (např. `weather`, `calendar` → maxSpan: 1 nebo 2)
- Žádná nová DB tabulka – jen rozšíření existujícího JSON klíče v `nastaveni`

---

## Odhadovaný rozsah změn

~100–150 řádků v `DashboardPage.js` (jediný soubor).
