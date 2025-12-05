# Měsíční filtr - Finální implementace

## ✅ Dokončeno

### UI změny
- ✅ Filtr měsíce zarovnán doleva vedle roku
- ✅ Layout: `[Název] [Rok select] [Období select]`
- ✅ Všechny prvky v jedné řadě (flex-wrap pro menší obrazovky)

### LocalStorage
- ✅ `orders25List_selectedYear` - ukládá vybraný rok
- ✅ `orders25List_selectedMonth` - ukládá vybraný měsíc/období
- ✅ Hodnoty se načítají při inicializaci komponenty
- ✅ Hodnoty se ukládají při každé změně
- ✅ Persistentní napříč reloady stránky

### Struktura UI (zleva doprava)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Modrý panel]                                                       │
│                                                                     │
│ Přehled objednávek  📅 Rok: [2025▼]  📅 Období: [Všechny měsíce▼] │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### CSS změny

**YearFilterPanel:**
- `justify-content: flex-start` (místo space-between)
- Všechny prvky zarovnány vlevo

**YearFilterLeft:**
- `flex-wrap: wrap` pro responsive layout
- Gap 1rem mezi prvky

**YearFilterTitle:**
- Přesunutý dovnitř YearFilterLeft
- Margin-right: 2rem pro oddělení od filtrů

**MonthFilterLabel:**
- Margin-left: 1rem (místo 1.5rem)

## Možnosti filtru období

| Hodnota | API formát | Popis |
|---------|-----------|-------|
| `all` | `undefined` | Všechny měsíce (bez filtru) |
| `last-month` | `"10"` | Aktuální měsíc (dynamické) |
| `last-quarter` | `"8-10"` | Poslední 3 měsíce (dynamické) |
| `last-half` | `"5-10"` | Posledních 6 měsíců (dynamické) |
| `1` až `12` | `"1"` až `"12"` | Konkrétní měsíc |
| `1-3` | `"1-3"` | Q1 (fixní) |
| `4-6` | `"4-6"` | Q2 (fixní) |
| `7-9` | `"7-9"` | Q3 (fixní) |
| `10-12` | `"10-12"` | Q4 (fixní) |

## Dynamické výpočty

Dnešní datum: **17. října 2025** (měsíc = 10)

- **Poslední měsíc** → `"10"` (říjen)
- **Poslední kvartál** → `"8-10"` (srpen až říjen)
- **Poslední půlrok** → `"5-10"` (květen až říjen)

Edge cases:
- **Leden (měsíc 1):**
  - Poslední kvartál: `"1-1"` (pouze leden, díky Math.max)
  - Poslední půlrok: `"1-1"` (pouze leden, díky Math.max)

## API integrace

### Endpoint: `POST /orders25/by-user`

**S filtrem měsíce:**
```json
{
  "token": "...",
  "username": "user@example.com",
  "rok": 2025,
  "mesic": "10-12"
}
```

**Bez filtru měsíce (všechny měsíce):**
```json
{
  "token": "...",
  "username": "user@example.com",
  "rok": 2025
}
```

## Testovací skripty

### 1. Test localStorage
```bash
# V Developer Console (F12)
# Načti a spusť:
test-debug/test-month-filter-localStorage.js
```

### 2. Test výpočtů
```bash
node test-debug/test-month-calculation.js
```

### 3. Manuální test v UI
1. Otevři Orders25List
2. Vyber rok: **2024**
3. Vyber období: **Poslední kvartál**
4. Zkontroluj Network tab → API call obsahuje `"mesic": "8-10"`
5. Obnov stránku (F5)
6. Ověř, že filtry zůstaly na **2024** a **Poslední kvartál**

## Soubory změněny

1. `/src/pages/Orders25List.js`
   - Přidán state `selectedMonth`
   - Přidána funkce `getMonthFilterForAPI()`
   - Přidán handler `handleMonthChange()`
   - Přidány styled komponenty (MonthFilterLabel, MonthFilterSelect)
   - Upraveno UI layout (zarovnání doleva)
   - Aktualizována API volání
   - Aktualizován useEffect dependency array

2. `/src/services/api25orders.js`
   - Aktualizována funkce `getOrdersByUser25()`
   - Přidán parametr `mesic`

3. Dokumentace:
   - `/docs/features/MONTH-FILTER-FEATURE.md`
   - `/test-debug/test-month-filter-localStorage.js`
   - `/test-debug/test-month-calculation.js`

## Závěr

✅ Implementace dokončena a otestována
✅ LocalStorage správně funguje
✅ UI zarovnáno doleva podle požadavků
✅ API integrace připravena
✅ Dokumentace kompletní
