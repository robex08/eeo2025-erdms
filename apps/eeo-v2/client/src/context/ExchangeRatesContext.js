import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Exchange Rates Context
 *
 * Poskytuje centralizované úložište směnných kurzů načítaných z background tasku.
 * Background task načítá kurzy každých 30 minut a aktualizuje tento context.
 */

const ExchangeRatesContext = createContext(null);

export const useExchangeRates = () => {
  const context = useContext(ExchangeRatesContext);
  if (!context) {
    return null;
  }
  return context;
};

export const ExchangeRatesProvider = ({ children }) => {
  const [exchangeData, setExchangeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  /**
   * Aktualizace směnných kurzů
   * Volá se z background tasku
   * useCallback zajistí stabilní referenci a zabrání infinite loop
   */
  const updateRates = useCallback((rates) => {
    setExchangeData({ rates });
    setIsLoading(false);
    setLastUpdate(new Date());
  }, []); // ✅ Žádné dependencies - funkce je vždy stejná

  const value = {
    exchangeData,
    isLoading,
    lastUpdate,
    updateRates
  };

  return (
    <ExchangeRatesContext.Provider value={value}>
      {children}
    </ExchangeRatesContext.Provider>
  );
};

export default ExchangeRatesContext;
