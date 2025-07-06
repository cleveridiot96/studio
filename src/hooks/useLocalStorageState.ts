
"use client";

import { useState, useEffect } from 'react';

type SetValue<T> = (value: T | ((prevValue: T) => T)) => void;

// Updated hook to include an optional migrator function.
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  migrator?: (storedValue: any) => T // The migrator function
): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedValue = window.localStorage.getItem(key);
        if (storedValue !== null) {
          let parsed = JSON.parse(storedValue);
          // If a migrator function is provided, run it on the parsed data.
          if (migrator) {
            parsed = migrator(parsed);
          }
          return parsed;
        }
      } catch (error) {
        console.warn(`Error reading or migrating localStorage key "${key}":`, error);
      }
    }
    return defaultValue;
  });

  // This effect will write the (potentially migrated) state back to localStorage.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handler = setTimeout(() => {
        try {
          window.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.error(`Error setting localStorage key "${key}":`, error);
        }
      }, 300);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [key, value]);

  return [value, setValue];
}
