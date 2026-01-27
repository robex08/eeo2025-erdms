import { useState, useEffect } from 'react';

/**
 * useDebounce hook
 * Vrací debounced value po zadané delay
 * 
 * @param {any} value - Hodnota k debounce
 * @param {number} delay - Delay v ms (default 300)
 * @returns {any} Debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
