
"use client";

import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = (value: T | ((prevValue: T) => T)) => void;

export function useLocalStorageState<T>(key: string, defaultValue: T): [T, SetValue<T>] {
  // Initialize state with defaultValue.
  // This ensures server and initial client render match.
  const [value, setValue] = useState<T>(defaultValue);

  // Effect to load from localStorage on the client after initial mount.
  useEffect(() => {
    // Only run on client
    if (typeof window !== 'undefined') {
      try {
        const storedValue = window.localStorage.getItem(key);
        if (storedValue !== null) {
          setValue(JSON.parse(storedValue));
        }
        // If storedValue is null, state remains defaultValue, which is correct.
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}" in useEffect:`, error);
        // If error, state remains defaultValue.
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Only re-run if the key changes.

  // Effect to save to localStorage whenever the value changes.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // This effect runs after the initial state is set (either to defaultValue or value from localStorage).
      // So, it's safe to write `value` to localStorage here.
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
    [] // setValue from useState is stable
  );

  return [value, setStoredValue];
}

