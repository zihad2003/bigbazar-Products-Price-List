import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce rapid state changes (e.g. user search input).
 * @param {*} value - The input value to debounce
 * @param {number} delayMs - Delay in milliseconds (default 300ms)
 * @returns {*} Debounced value
 */
export function useDebounce(value, delayMs = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

export default useDebounce;
