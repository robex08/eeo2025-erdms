/**
 * Příklad implementace výchozího roku a období v Orders25List
 * 
 * Tento soubor ukazuje, jak by se nová uživatelská nastavení pro rok a období
 * měla integrovat do stránky se seznamem objednávek.
 */

// ==============================================================================
// IMPORT
// ==============================================================================
import { loadSettingsFromLocalStorage } from '../services/userSettingsApi';
import { getYearFromSetting, getDateRangeFromSettings } from '../utils/dateHelpers';

// ==============================================================================
// V KOMPONENTĚ Orders25List
// ==============================================================================

const Orders25List = () => {
  const user_id = parseInt(localStorage.getItem('auth_user_id'), 10);
  
  // State pro filtry
  const [filters, setFilters] = useState({
    rok: new Date().getFullYear().toString(), // Výchozí hodnota
    obdobi: 'all',                            // Výchozí hodnota
    // ... ostatní filtry
  });

  // ==============================================================================
  // NAČTENÍ VÝCHOZÍCH HODNOT Z NASTAVENÍ UŽIVATELE
  // ==============================================================================
  useEffect(() => {
    // Načíst nastavení uživatele z localStorage
    const userSettings = loadSettingsFromLocalStorage(user_id);
    
    if (!userSettings) {
      console.log('Žádná uživatelská nastavení nenalezena');
      return;
    }

    // Aplikovat výchozí rok
    if (userSettings.vychozi_rok) {
      const year = getYearFromSetting(userSettings.vychozi_rok);
      console.log('Nastavuji výchozí rok:', year);
      setFilters(prev => ({ ...prev, rok: year.toString() }));
    }

    // Aplikovat výchozí období
    if (userSettings.vychozi_obdobi) {
      console.log('Nastavuji výchozí období:', userSettings.vychozi_obdobi);
      setFilters(prev => ({ ...prev, obdobi: userSettings.vychozi_obdobi }));
    }

    // VOLITELNĚ: Aplikovat i ostatní filtry (stavy objednávek, atd.)
    if (userSettings.vychozi_filtry_stavu_objednavek?.length > 0) {
      console.log('Nastavuji výchozí stavy:', userSettings.vychozi_filtry_stavu_objednavek);
      setFilters(prev => ({ 
        ...prev, 
        stavy: userSettings.vychozi_filtry_stavu_objednavek 
      }));
    }

  }, [user_id]); // Spustí se pouze při prvním načtení komponenty

  // ==============================================================================
  // POUŽITÍ PRO API VOLÁNÍ
  // ==============================================================================
  const fetchOrders = async () => {
    const userSettings = loadSettingsFromLocalStorage(user_id);
    
    // Získat rozsah dat podle nastavení
    const dateRange = getDateRangeFromSettings(
      userSettings?.vychozi_rok || 'current',
      userSettings?.vychozi_obdobi || 'all'
    );

    console.log('Načítám objednávky pro:', {
      rok: dateRange.year,
      měsíc: dateRange.month || 'všechny',
      od: dateRange.from,
      do: dateRange.to
    });

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_date: dateRange.from.toISOString(),
          to_date: dateRange.to.toISOString(),
          // ... ostatní parametry
        })
      });

      const data = await response.json();
      // ... zpracování dat
    } catch (error) {
      console.error('Chyba při načítání objednávek:', error);
    }
  };

  // ==============================================================================
  // UI - SELECT PRO ROK
  // ==============================================================================
  const renderYearSelect = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    // Generuj roky od aktuálního sestupně až k 2016
    for (let year = currentYear; year >= 2016; year--) {
      years.push(year);
    }

    return (
      <select
        value={filters.rok}
        onChange={(e) => setFilters(prev => ({ ...prev, rok: e.target.value }))}
      >
        <option value="current">Aktuální rok</option>
        <option value="all">Všechny roky</option>
        {years.map(year => (
          <option key={year} value={year.toString()}>
            {year}
          </option>
        ))}
      </select>
    );
  };

  // ==============================================================================
  // UI - SELECT PRO OBDOBÍ
  // ==============================================================================
  const renderPeriodSelect = () => {
    const periods = [
      { value: 'all', label: 'Všechny měsíce' },
      { value: '1', label: 'Leden' },
      { value: '2', label: 'Únor' },
      { value: '3', label: 'Březen' },
      { value: '4', label: 'Duben' },
      { value: '5', label: 'Květen' },
      { value: '6', label: 'Červen' },
      { value: '7', label: 'Červenec' },
      { value: '8', label: 'Srpen' },
      { value: '9', label: 'Září' },
      { value: '10', label: 'Říjen' },
      { value: '11', label: 'Listopad' },
      { value: '12', label: 'Prosinec' }
    ];

    return (
      <select
        value={filters.obdobi}
        onChange={(e) => setFilters(prev => ({ ...prev, obdobi: e.target.value }))}
      >
        {periods.map(period => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
    );
  };

  // ==============================================================================
  // RENDER
  // ==============================================================================
  return (
    <div>
      <div className="filters">
        <label>
          Rok:
          {renderYearSelect()}
        </label>
        
        <label>
          Období:
          {renderPeriodSelect()}
        </label>
        
        {/* ... ostatní filtry */}
      </div>
      
      {/* ... zbytek komponenty */}
    </div>
  );
};

export default Orders25List;

// ==============================================================================
// POZNÁMKY
// ==============================================================================
/*
1. Výchozí hodnoty se načtou z userSettings při prvním renderu komponenty
2. Uživatel může hodnoty změnit pomocí select boxů
3. Změny se projeví okamžitě (pokud je implementováno auto-fetch)
4. Pro uložení změn do nastavení musí uživatel přejít do ProfilePage
5. Hodnoty zůstanou zachovány v localStorage i po reloadu stránky
*/
