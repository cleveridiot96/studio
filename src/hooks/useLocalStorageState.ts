
"use client";

import { useState, useEffect } from 'react';

type SetValue<T> = (value: T | ((prevValue: T) => T)) => void;

export function useLocalStorageState<T>(key: string, defaultValue: T): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedValue = window.localStorage.getItem(key);
        if (storedValue !== null) {
          const parsed = JSON.parse(storedValue);
          // Ensure that if storedValue is explicitly null, and defaultValue isn't, we use defaultValue
          // This handles cases where `null` might have been stored unintentionally.
          return parsed === null && defaultValue !== null ? defaultValue : parsed;
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}" during initial state read:`, error);
        // Fall through to return defaultValue if parsing fails or not found
      }
    }
    return defaultValue;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handler = setTimeout(() => {
        try {
          window.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.warn(`Error setting localStorage key "${key}" during debounced write:`, error);
        }
      }, 300); // Slightly reduced debounce delay

      return () => {
        clearTimeout(handler);
      };
    }
  }, [key, value]);

  // `setValue` from useState is already stable and doesn't need useCallback wrapper
  return [value, setValue];
}
