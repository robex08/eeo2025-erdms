# Načítání kurzovního lístku - Flow dokumentace

## 📋 Přehled

Kurzovní lístek (směnné kurzy měn) se načítá z externího API a aktualizuje se v plánovaných intervalech. Systém je navržen tak, aby:
- ✅ Načítal kurzy **POUZE po přihlášení uživatele**
- ✅ Aktualizoval kurzy **každých 30 minut** v background tasku
- ❌ **NIKDY** nenačítal kurzy při refresh stránky (F5)
- ❌ **NIKDY** neblokoval přihlášení uživatele

## 🔄 Flow načítání

### 1. Při přihlášení uživatele

```
Uživatel → Login formulář → AuthContext.login()
    ↓
✅ Úspěšné přihlášení
    ↓
window.dispatchEvent('trigger-initial-exchange-rates')  [AuthContext.js:124]
    ↓
App.js useEffect poslouchá na event  [App.js:278]
    ↓
bgTasksInstance.runNow('exchangeRatesRefresh')
    ↓
createExchangeRatesTask callback  [backgroundTasks.js:447]
    ↓
Fetch z API (fiat + crypto kurzy)
    ↓
exchangeRatesContext.updateRates(rates)  [App.js:258]
    ↓
✅ Kurzy dostupné v celé aplikaci přes useExchangeRates()
```

### 2. Automatické aktualizace (každých 30 minut)

```
Background Task Service
    ↓
createExchangeRatesTask
    interval: 30 * 60 * 1000  [backgroundTasks.js:448]
    immediate: false  ✅ DŮLEŽITÉ!
    ↓
Každých 30 minut spustí callback
    ↓
Fetch z API
    ↓
exchangeRatesContext.updateRates(rates)
```

### 3. Při refresh stránky (F5) - ❌ NENAČÍTÁ

```
Refresh stránky (F5)
    ↓
AuthContext useEffect  [AuthContext.js:278]
    ↓
Obnoví session z localStorage (token, userDetail)
    ↓
❌ NESPOUŠTÍ event 'trigger-initial-exchange-rates'
    ↓
ExchangeRatesContext má poslední uložené kurzy v paměti
    ↓
✅ Kurzy se načtou až v dalším plánovaném intervalu
```

## 📂 Klíčové soubory

### 1. AuthContext.js (řádek 110-130)
```javascript
// Spouští event POUZE při login(), NIKDY při refresh
setTimeout(() => {
  window.dispatchEvent(new CustomEvent('trigger-initial-exchange-rates'));
}, 100);
```

### 2. App.js (řádek 278-312)
```javascript
// Poslouchá na event a spouští runNow()
useEffect(() => {
  window.addEventListener('trigger-initial-exchange-rates', handleInitialExchangeRates);
  return () => {
    window.removeEventListener('trigger-initial-exchange-rates', handleInitialExchangeRates);
  };
}, [isLoggedIn]);
```

### 3. backgroundTasks.js (řádek 442-519)
```javascript
export const createExchangeRatesTask = (onRatesUpdated) => ({
  name: 'exchangeRatesRefresh',
  interval: 30 * 60 * 1000, // 30 minut
  immediate: false, // ✅ NE při inicializaci!
  enabled: true,
  callback: async () => {
    // Fetch z API (fiat + crypto)
    // Volá onRatesUpdated(rates)
  }
});
```

### 4. ExchangeRatesContext.js
```javascript
// Context provider pro směnné kurzy
// Drží data v paměti (React state)
const [exchangeData, setExchangeData] = useState(null);
const updateRates = useCallback((rates) => {
  setExchangeData({ rates });
}, []);
```

## 🔧 API Endpointy

### Fiat měny
- **URL**: `https://open.er-api.com/v6/latest/CZK`
- **Interval**: 30 minut
- **Timeout**: 10 sekund

### Crypto měny
- **URL**: `${API_BASE_URL}/api.eeo/crypto-rates-proxy.php` (backend proxy)
- **Důvod proxy**: Řešení CORS problémů s CoinGecko API
- **Interval**: 30 minut
- **Timeout**: 15 sekund

## ⚙️ Konfigurace

```javascript
// backgroundTasks.js
export const TASK_INTERVALS = {
  EXCHANGE_RATES: 30 * 60 * 1000, // 30 minut
};

// createExchangeRatesTask
{
  name: 'exchangeRatesRefresh',
  interval: 30 * 60 * 1000,
  immediate: false,  // ✅ KRITICKÉ: NE při mount!
  enabled: true,
  condition: () => !!loadAuthData.token()  // Pouze když je přihlášen
}
```

## 🛡️ Error Handling

```javascript
// backgroundTasks.js - onError
onError: (error) => {
  // ✅ Tiše selhat - NIKDY nerušit uživatele
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Exchange rates error (silently handled):', error.message);
  }
}

// App.js - runNow catch
bgTasksInstance.runNow('exchangeRatesRefresh').catch(err => {
  // Tiše ignorovat - zkusí to znovu za 30 minut
});
```

## 📊 Použití v komponentách

```javascript
import { useExchangeRates } from '../context/ExchangeRatesContext';

function MyComponent() {
  const { exchangeData, isLoading, lastUpdate } = useExchangeRates();
  
  if (isLoading) {
    return <div>Načítání kurzů...</div>;
  }
  
  const rates = exchangeData?.rates || {};
  const eurRate = rates.EUR; // Kolik CZK stojí 1 EUR
  const btcRate = rates.BTC; // Kolik CZK stojí 1 BTC
  
  return (
    <div>
      <p>EUR: {eurRate?.toFixed(2)} CZK</p>
      <p>BTC: {btcRate?.toLocaleString()} CZK</p>
      <p>Poslední aktualizace: {lastUpdate?.toLocaleString()}</p>
    </div>
  );
}
```

## 🚨 DŮLEŽITÉ POZNÁMKY

1. **NIKDY neměnit `immediate: false`** v createExchangeRatesTask!
   - Jinak by se kurzy načítaly při každém refreshi stránky

2. **Event trigger POUZE v AuthContext.login()**
   - Ne v initAuth useEffect (ten se spouští při F5)

3. **Chyby v načítání kurzů NESMÍ blokovat přihlášení**
   - Vždy catch a tiše ignorovat
   - Kurzy nejsou kritické pro funkčnost aplikace

4. **Backend proxy pro crypto kurzy**
   - CoinGecko API má CORS omezení
   - Backend proxy: `/api.eeo/crypto-rates-proxy.php`

## 🔍 Debugging

### Jak ověřit, že se kurzy načítají správně:

```javascript
// V konzoli:
1. Přihlásit se → mělo by se spustit načtení
2. Zkontrolovat network tab: volání na er-api.com a crypto-rates-proxy.php
3. Zkontrolovat ExchangeRatesContext state:
   localStorage.getItem('react_state_exchange_rates') // pokud se cachuje

// V development módu:
console.log při úspěchu: ✅ Exchange rates loaded
console.warn při chybě: ⚠️ Exchange rates error
```

### Jak otestovat interval:

```javascript
// Změnit interval na 1 minutu (pouze pro test!)
interval: 1 * 60 * 1000, // 1 minuta místo 30

// Po testu VRÁTIT na 30 minut!
```

## 📝 Changelog

- **2025-11-25**: Dokumentace vytvořena, potvrzeno že systém funguje správně
- Kurzy se načítají POUZE po přihlášení + v intervalech
- NIKDY při refresh stránky (F5)
