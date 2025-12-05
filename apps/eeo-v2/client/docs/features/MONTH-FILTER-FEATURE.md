# Měsíční filtr objednávek

## Popis
Přidán měsíční filtr vedle existujícího filtru pro rok objednávek v `Orders25List.js`.

## Implementace

### 1. State management
- **selectedMonth**: Ukládá aktuálně vybraný měsíc/období
- Hodnota se ukládá do localStorage (`orders25List_selectedMonth`)
- Výchozí hodnota: `"all"` (všechny měsíce)

### 2. Možnosti filtru

#### Speciální období (dynamické)
- **Všechny měsíce** (`"all"`): Žádný filtr měsíce
- **Poslední měsíc** (`"last-month"`): Pouze aktuální měsíc
- **Poslední kvartál** (`"last-quarter"`): Poslední 3 měsíce od současnosti
- **Poslední půlrok** (`"last-half"`): Posledních 6 měsíců od současnosti

#### Jednotlivé měsíce
- Leden (1) až Prosinec (12)

#### Kvartály (fixní)
- **Q1** (`"1-3"`): Leden-Březen
- **Q2** (`"4-6"`): Duben-Červen
- **Q3** (`"7-9"`): Červenec-Září
- **Q4** (`"10-12"`): Říjen-Prosinec

### 3. API integrace

#### Funkce: `getMonthFilterForAPI()`
Převádí hodnotu z UI selectu na formát pro API:

```javascript
// Příklady převodu:
"all" → undefined (bez filtru)
"last-month" → "10" (pokud je říjen aktuální měsíc)
"last-quarter" → "8-10" (pokud je říjen aktuální měsíc)
"last-half" → "5-10" (pokud je říjen aktuální měsíc)
"1-3" → "1-3" (Q1, beze změny)
```

#### API endpoint
```
POST /orders25/by-user
{
  "token": "...",
  "username": "...",
  "rok": 2025,
  "mesic": "10-12"  // <-- nový parametr
}
```

### 4. Varianty API podpory podle obrázku

Podle přiložených obrázků API podporuje tyto formáty:
- **Jednotlivý měsíc**: `"mesic": "10"`
- **Rozsah měsíců**: `"mesic": "10-12"`
- **Více měsíců**: `"mesic": "1-3"`

## Změny v souborech

### `/src/pages/Orders25List.js`
- Přidán state `selectedMonth`
- Přidán handler `handleMonthChange()`
- Přidána helper funkce `getMonthFilterForAPI()`
- Přidány styled komponenty `MonthFilterLabel` a `MonthFilterSelect`
- Aktualizováno `YearFilterPanel` UI s měsíčním selectem
- Aktualizováno useEffect dependency array o `selectedMonth`
- Aktualizována API volání o parametr `mesic`

### `/src/services/api25orders.js`
- Aktualizována funkce `getOrdersByUser25()` o parametr `mesic`
- Parametr se přidává do payload při API volání

## UI Design

Měsíční select se zobrazuje vedle filtru roku v modrém panelu:
```
[📅 Rok: 2025] [📅 Období: Všechny měsíce]  Přehled objednávek
```

Styled komponenty:
- Stejný design jako rok select (modrá, transparentní pozadí)
- Min-width: 200px (kvůli delším textům)
- Responsive focus stavy

## Testování

Po implementaci ověřte:
1. ✅ Select se správně zobrazuje vedle roku
2. ✅ Změna měsíce spouští reload dat
3. ✅ LocalStorage správně ukládá výběr
4. ✅ API volání obsahuje správný parametr `mesic`
5. ✅ Dynamické hodnoty (poslední měsíc/kvartál/půlrok) se počítají správně
6. ✅ Refresh stránky zachovává vybraný měsíc

## Příklad použití

```javascript
// Uživatel vybere "Poslední kvartál"
// Aktuální měsíc: říjen (10)

getMonthFilterForAPI() vrátí "8-10"

API call:
{
  token: "...",
  username: "user@example.com",
  rok: 2025,
  mesic: "8-10"  // srpen až říjen
}
```

## Poznámky

- Dynamické období (poslední měsíc/kvartál/půlrok) se počítají od aktuálního systémového měsíce
- Pokud by výpočet spadl pod měsíc 1, nastaví se minimum na 1
- API formát podporuje jak jednotlivé měsíce (`"10"`), tak rozsahy (`"10-12"`)
