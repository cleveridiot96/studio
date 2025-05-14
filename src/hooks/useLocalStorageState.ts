
"use client";

import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = (value: T | ((prevValue: T) => T)) => void;

export function useLocalStorageState<T>(key: string, defaultValue: T): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedValue = window.localStorage.getItem(key);
        if (storedValue !== null) {
          const parsed = JSON.parse(storedValue);
          if (parsed === null && defaultValue !== null) {
            setValue(defaultValue);
          } else {
            setValue(parsed);
          }
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}" in useEffect:`, error);
      }
    }
  }, [key, defaultValue]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Debounce the localStorage.setItem call
      const handler = setTimeout(() => {
        try {
          console.log(`Debounced: Writing to localStorage key "${key}"`);
          window.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.warn(`Error setting localStorage key "${key}" during debounced write:`, error);
        }
      }, 500); // Adjust debounce delay as needed (500ms is a common starting point)

      // Cleanup function to clear the timeout if the effect runs again before the timeout completes
      return () => {
        clearTimeout(handler);
      };
    }
  }, [key, value]); // Effect runs when key or value changes, but the write is debounced

  const setStoredValue: SetValue<T> = useCallback(
    (newValue) => {
      setValue(newValue);
    },
    []
  );

  return [value, setStoredValue];
}
