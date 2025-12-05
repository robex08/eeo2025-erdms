# Měsíční filtr - Vizuální srovnání

## PŘED změnou (původní layout)

```
┌─────────────────────────────────────────────────────────────┐
│ [Modrý panel]                                               │
│                                                             │
│ 📅 Rok objednávek: [2025▼]          Přehled objednávek    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
- Rok vlevo
- Název vpravo (`justify-content: space-between`)

## PO změně (nový layout s měsícem)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Modrý panel]                                                        │
│                                                                      │
│ Přehled objednávek  📅 Rok: [2025▼]  📅 Období: [Všechny měsíce▼]  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```
- Všechny prvky vlevo (`justify-content: flex-start`)
- Název jako první
- Rok select vedle názvu
- Měsíc select vedle roku

## Změny v CSS

### YearFilterPanel
```diff
- justify-content: space-between;
+ justify-content: flex-start;
```

### YearFilterLeft
```diff
  display: flex;
  align-items: center;
  gap: 1rem;
+ flex-wrap: wrap;
```

### YearFilterTitle
```diff
  margin: 0;
+ margin-right: 2rem;
```

### Nové komponenty

**MonthFilterLabel:**
```css
font-weight: 600;
font-size: 1rem;
display: flex;
align-items: center;
gap: 0.5rem;
margin-left: 1rem;
```

**MonthFilterSelect:**
```css
padding: 0.75rem 1rem;
border: 2px solid rgba(255, 255, 255, 0.3);
border-radius: 6px;
font-size: 1rem;
font-weight: 600;
background: rgba(255, 255, 255, 0.15);
color: white;
cursor: pointer;
min-width: 200px;
```

## Responsive layout

Na menších obrazovkách se prvky zalamují díky `flex-wrap: wrap`:

```
┌──────────────────────────────┐
│ [Modrý panel]                │
│                              │
│ Přehled objednávek           │
│ 📅 Rok: [2025▼]             │
│ 📅 Období: [Všechny měsíce▼]│
│                              │
└──────────────────────────────┘
```

## LocalStorage klíče

| Klíč | Hodnota | Popis |
|------|---------|-------|
| `orders25List_selectedYear` | `"2025"` | Vybraný rok (string) |
| `orders25List_selectedMonth` | `"all"` | Vybrané období (string) |

## Příklad hodnot v localStorage

```javascript
localStorage.getItem('orders25List_selectedYear')
// → "2025"

localStorage.getItem('orders25List_selectedMonth')  
// → "last-quarter"

// Po změně a reloadu stránky:
// Selecty budou mít hodnoty: Rok=2025, Období="Poslední kvartál"
```
