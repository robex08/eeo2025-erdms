# Uživatelská nastavení - Rok a Období

## Přehled

Do uživatelských nastavení v ProfilePage byla přidána nová pole pro výchozí rok a období (měsíc), která umožňují uživateli nastavit preferovaný časový rozsah pro filtrování dat v aplikaci.

## Nová pole v userSettings

```javascript
{
  vychozi_rok: 'current',  // 'current' nebo konkrétní rok (např. '2025')
  vychozi_obdobi: 'all'    // 'all' nebo číslo měsíce ('1'-'12')
}
```

### Možnosti pro `vychozi_rok`
- **'current'** - Použije se aktuální rok dle systémového data (první volba)
- **'all'** - Všechny roky (od 2016 do aktuálního roku) (druhá volba)
- **'2025'-'2016'** - Konkrétní rok (sestupně od aktuálního roku až k 2016)

### Možnosti pro `vychozi_obdobi`
- **'all'** - Všechny měsíce v roce (výchozí volba)
- **'1'-'12'** - Konkrétní měsíc (Leden až Prosinec)

## Uložení nastavení

Nastavení se ukládá:
1. **Do databáze** - Tlačítkem "Uložit nastavení" (bez reloadu aplikace)
2. **Do localStorage** - Tlačítkem "Aplikovat změny" (s reloadem aplikace)

## Jak používat v komponentách

### Import helper funkcí

```javascript
import { 
  getYearFromSetting, 
  getMonthName, 
  getDateRangeFromSettings 
} from '../utils/dateHelpers';
```

### Načtení nastavení z localStorage

```javascript
import { loadSettingsFromLocalStorage } from '../services/userSettingsApi';

// V komponentě
const user_id = parseInt(localStorage.getItem('auth_user_id'), 10);
const userSettings = loadSettingsFromLocalStorage(user_id);

// Získat konkrétní rok
const year = getYearFromSetting(userSettings.vychozi_rok);
console.log(year); // 2025 (pokud je aktuální rok 2025), nebo null (pokud je vybráno "Všechny roky")

// Získat název měsíce
const monthName = getMonthName(userSettings.vychozi_obdobi);
console.log(monthName); // "Leden" nebo "Všechny měsíce"

// Získat rozsah dat
const dateRange = getDateRangeFromSettings(
  userSettings.vychozi_rok, 
  userSettings.vychozi_obdobi
);
console.log(dateRange);
// Příklad pro konkrétní rok:
// {
//   from: Date(2025, 0, 1),      // 1. ledna 2025
//   to: Date(2025, 11, 31),      // 31. prosince 2025
//   year: 2025,
//   month: null                  // null pro celý rok, jinak číslo měsíce
// }
//
// Příklad pro "Všechny roky":
// {
//   from: Date(2016, 0, 1),      // 1. ledna 2016
//   to: Date(2025, 11, 31),      // 31. prosince 2025 (aktuální rok)
//   year: null,                  // null = všechny roky
//   month: null
// }
```

### Použití v API volání

```javascript
const fetchOrders = async () => {
  const userSettings = loadSettingsFromLocalStorage(user_id);
  const dateRange = getDateRangeFromSettings(
    userSettings.vychozi_rok,
    userSettings.vychozi_obdobi
  );
  
  const response = await fetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      from_date: dateRange.from.toISOString(),
      to_date: dateRange.to.toISOString()
    })
  });
  
  // ...
};
```

### Použití ve filtrech (Orders25List)

```javascript
useEffect(() => {
  const userSettings = loadSettingsFromLocalStorage(user_id);
  
  if (userSettings?.vychozi_rok) {
    const year = getYearFromSetting(userSettings.vychozi_rok);
    setFilters(prev => ({ ...prev, rok: year.toString() }));
  }
  
  if (userSettings?.vychozi_obdobi && userSettings.vychozi_obdobi !== 'all') {
    setFilters(prev => ({ ...prev, obdobi: userSettings.vychozi_obdobi }));
  }
}, [user_id]);
```

## UI komponenty

### Rok select
- Zobrazuje se v ProfilePage > Nastavení > Chování aplikace
- První volba: "Aktuální rok" (value: 'current')
- Druhá volba: "Všechny roky" (value: 'all')
- Ostatní volby: Konkrétní roky od aktuálního roku sestupně až k 2016 (2025, 2024, 2023... 2016)

### Období select
- Zobrazuje se v ProfilePage > Nastavení > Chování aplikace
- První volba: "Všechny měsíce" (value: 'all')
- Ostatní volby: Leden až Prosinec (value: '1'-'12')

## Backend

Nastavení se ukládá do tabulky `user_nastaveni` ve sloupci `nastaveni` jako JSON:

```sql
{
  "vychozi_rok": "current",
  "vychozi_obdobi": "all",
  ...
}
```

## Testování

1. Otevřete ProfilePage
2. Přejděte na tab "Nastavení"
3. Rozbalte sekci "Chování a předvolby aplikace"
4. Vyberte "Výchozí rok" (např. "Aktuální rok")
5. Vyberte "Výchozí období" (např. "Leden")
6. Klikněte na "Uložit nastavení" (uloží se do DB)
7. Klikněte na "Aplikovat změny" (aplikuje se do localStorage a reload)
8. Ověřte, že nastavení zůstalo zachováno po reloadu

## Datum vytvoření
19. listopadu 2025

## Autor
Implementováno dle požadavku uživatele
