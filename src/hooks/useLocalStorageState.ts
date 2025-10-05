
"use client";

import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = (value: T | ((prevValue: T) => T)) => void;

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  migrator?: (storedValue: any) => T
): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    try {
      const storedValue = window.localStorage.getItem(key);
      
      // Explicitly check for null, undefined, or empty string.
      if (storedValue === null || storedValue === undefined || storedValue.trim() === '') {
        return defaultValue;
      }
      
      let parsed = JSON.parse(storedValue);
      
      if (migrator) {
        parsed = migrator(parsed);
      }
      
      return parsed;
    } catch (error) {
      console.warn(`Error reading or migrating localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    }
  }, [key, value]);

  return [value, setValue];
}
