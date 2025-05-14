
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
          // If parsed is null but defaultValue isn't, it means localStorage had "null"
          // for a key that might expect a non-null structure (e.g., an array).
          // In such cases, falling back to defaultValue is safer to avoid type errors.
          if (parsed === null && defaultValue !== null) {
            setValue(defaultValue);
          } else {
            setValue(parsed);
          }
        }
        // If storedValue is null (key not found), state remains defaultValue as initialized.
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}" in useEffect:`, error);
        // If error, state remains defaultValue.
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, defaultValue]); // Added defaultValue to ensure effect runs if it changes.

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    }
  }, [key, value]);

  const setStoredValue: SetValue<T> = useCallback(
    (newValue) => {
      setValue(newValue);
    },
    []
  );

  return [value, setStoredValue];
}
