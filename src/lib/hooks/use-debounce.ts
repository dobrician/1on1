"use client";

import { useState, useEffect } from "react";

/**
 * Debounces a value by the specified delay.
 * Returns the debounced value that only updates after
 * the specified delay has passed since the last change.
 *
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds (default: 500)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}
