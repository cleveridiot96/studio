
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

type SetValue<T> = (value: T | ((prevValue: T) => T)) => void;

export function useLocalStorageState<T>(key: string, defaultValue: T): [T, SetValue<T>] {
  // Initialize state with defaultValue. This ensures server and initial client render are consistent.
  const [value, setValue] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Effect to load from localStorage on initial client-side mount
  useEffect(() => {
    setIsHydrated(true); // Mark that client-side effects can now run
    if (typeof window !== 'undefined') {
      try {
        const storedValue = window.localStorage.getItem(key);
        if (storedValue !== null) {
          setValue(JSON.parse(storedValue));
        } else {
          // If nothing in storage, ensure state is defaultValue (it already is, but explicit)
          // and save defaultValue to localStorage if it wasn't there.
          window.localStorage.setItem(key, JSON.stringify(defaultValue));
          setValue(defaultValue);
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}" during initial state read:`, error);
        // Fall back to defaultValue if parsing fails
        setValue(defaultValue);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Only re-run if the key changes (which should be rare)

  // Effect to save to localStorage, debounced
  useEffect(() => {
    // Only save to localStorage if the component has hydrated and value is not undefined
    // This prevents writing undefined to localStorage on initial server render/hydration.
    if (typeof window !== 'undefined' && isHydrated) {
      const handler = setTimeout(() => {
        try {
          if (value === undefined) {
            // console.warn(`Attempted to save undefined for key "${key}". Removing from localStorage instead.`);
            // window.localStorage.removeItem(key); // Or choose to save string "undefined"
          } else {
            window.localStorage.setItem(key, JSON.stringify(value));
          }
        } catch (error) {
          console.warn(`Error setting localStorage key "${key}" during debounced write:`, error);
        }
      }, 300);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [key, value, isHydrated]);

  return [value, setValue];
}
