# Indikátory v kalendáři - Dokumentace

## Přehled
Kalendář v aplikaci zobrazuje vizuální indikátory pro dny, kdy byly vytvořeny objednávky.

## Vizuální indikátory

### 🟡 Žlutá tečka
- **Zobrazuje se když:** V daný den byla vytvořena alespoň 1 objednávka
- **Význam:** "Tento den obsahuje objednávky"
- **Implementace:** 
  ```javascript
  count > 0  // Pokud existují objednávky pro tento den
  ```

### ❗ Červený vykřičník
- **Zobrazuje se když:** V daný den existují objednávky vyžadující pozornost
- **Význam:** "Tento den obsahuje neschválené objednávky nebo objednávky ke schválení"
- **Zobrazuje se pro:**
  - Objednávky se stavem schválení = "neschvaleno" (`stav_schvaleni === 'neschvaleno'`)
  - Objednávky se stavem = "Ke schválení" (`stav_objednavky` obsahuje "ke schválení")

## Tooltip
Při najetí myší na den s indikátory se zobrazí:
```
DD.MM.YYYY • X objednávek (Y neschváleno/ke schválení)
```

Příklad:
```
15.01.2025 • 5 objednávek (2 neschváleno/ke schválení)
```

## Technická implementace

### 1. Generování dat (Orders25List.js)
```javascript
// Pro každý den se počítají:
counts[key] = {
  total: 0,      // Celkový počet objednávek v tento den
  pending: 0     // Počet neschválených/ke schválení
}

// pending se inkrementuje pokud:
stavSchvaleni === 'neschvaleno' ||
stavObjednavky.toLowerCase().includes('ke schválení')
```

### 2. Zobrazení v kalendáři (CalendarPanel.js)
```javascript
// Žlutá tečka - pokud existují objednávky
{count > 0 && (
  <span style={{
    width: 6, 
    height: 6, 
    borderRadius: '50%', 
    background: 'linear-gradient(135deg, #FFD700, #fbbf24)',
    boxShadow: '0 0 4px rgba(255, 215, 0, 0.5)'
  }} />
)}

// Červený vykřičník - pokud existují neschválené
{pendingCount > 0 && (
  <span style={{
    fontSize: '0.7rem',
    fontWeight: 'bold',
    color: '#ef4444',
    textShadow: '0 0 4px rgba(239, 68, 68, 0.5)',
    lineHeight: 1
  }}>!</span>
)}
```

## Aktualizace dat
Data pro kalendář se aktualizují:
1. ✅ Při načtení objednávek z databáze
2. ✅ Po úspěšném uložení objednávky
3. ✅ Po odstranění objednávky
4. ✅ Při změně filtru roku/měsíce

Data se ukládají do:
- `localStorage` pod klíčem `calendar_order_counts_${username}`
- Formát: `{ "YYYY-MM-DD": { total: X, pending: Y }, ... }`

## Výkon
- Data se cachují v localStorage pro rychlé načtení
- Aktualizace probíhá pouze při změně dat objednávek
- Event `calendar_order_counts_updated` signalizuje změnu dat

## Testování
Pro ověření funkčnosti:
1. Vytvoř objednávku s datem dnes → měla by se zobrazit 🟡
2. Nastav stav schválení na "neschvaleno" → měl by se přidat ❗
3. Schval objednávku → ❗ by měl zmizet, 🟡 zůstane

## Historie změn
- **2025-10-17**: Oprava logiky pro vykřičník - přidána kontrola `stav_schvaleni === 'neschvaleno'`
- **2025-10-17**: Aktualizace tooltipu na "neschváleno/ke schválení"
