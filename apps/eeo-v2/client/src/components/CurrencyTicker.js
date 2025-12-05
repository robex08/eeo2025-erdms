import React from 'react';
import { useExchangeRates } from '../context/ExchangeRatesContext';

/**
 * === Komponenta kurzovního lístku ===
 *
 * Zobrazuje směnné kurzy měn vůči CZK.
 * Data jsou načítána centrálně přes Background Task každých 30 minut.
 * První načtení probíhá ihned po přihlášení uživatele.
 */
const CurrencyTicker = () => {
  // Získání dat z contextu (načítají se v background tasku)
  const exchangeRatesContext = useExchangeRates();

  // Fallback pokud context není k dispozici - nezobrazuj nic
  if (!exchangeRatesContext) {
    return null;
  }

  const { exchangeData, isLoading } = exchangeRatesContext;

  // Měny k zobrazení (vždy vůči CZK)
  const displayedCurrencies = ['EUR', 'USD', 'GBP', 'PLN', 'CHF', 'BTC', 'ETH'];

  const formatRate = (rate, currency) => {
    const isCrypto = ['BTC', 'ETH'].includes(currency);
    if (isCrypto) {
      return rate.toLocaleString('cs-CZ', { maximumFractionDigits: 0 });
    }
    return rate.toFixed(2);
  };

  // Připravíme text pro rolování
  const getTickerText = () => {
    if (!exchangeData) return '';

    return displayedCurrencies
      .filter(curr => exchangeData.rates[curr])
      .map(currency => {
        const rate = exchangeData.rates[currency];
        return `${currency}: ${formatRate(rate, currency)} Kč`;
      })
      .join('  •  ');
  };

  const tickerText = getTickerText();

  // Při načítání nebo pokud nejsou data - nezobrazuj nic
  if (isLoading || !tickerText) {
    return null;
  }

  return (
    <div style={{
      width: '100%',
      overflow: 'hidden',
      position: 'relative',
      height: '20px',
      lineHeight: '20px'
    }}>
      <style>
        {`
          @keyframes tickerScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .ticker-content {
            display: inline-block;
            white-space: nowrap;
            animation: tickerScroll 30s linear infinite;
          }
          .ticker-content:hover {
            animation-play-state: paused;
          }
        `}
      </style>
      <div className="ticker-content" style={{
        fontSize: '11px',
        color: '#555',
        fontWeight: '500'
      }}>
        {/* Duplikujeme pro plynulé rolování */}
        <span>{tickerText}</span>
        <span style={{ marginLeft: '40px' }}>{tickerText}</span>
      </div>
    </div>
  );
};

export default CurrencyTicker;

