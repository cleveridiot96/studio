
"use client";

import { useState, useEffect, useRef } from 'react';

type SetValue<T> = (value: T | ((prevValue: T) => T)) => void;

export function useLocalStorageState<T>(key: string, defaultValue: T): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(defaultValue);
  const isMounted = useRef(false); // To track if component has mounted

  // Effect to load from localStorage on initial client-side mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      isMounted.current = true; // Mark as mounted
      try {
        const storedValue = window.localStorage.getItem(key);
        if (storedValue !== null) {
          const parsed = JSON.parse(storedValue);
          // Only update if parsed is different from defaultValue to avoid unnecessary re-render on first client paint
          // and ensure correct type if stored value is explicitly null but defaultValue is not
          if (parsed === null && defaultValue !== null) {
            // If stored is null but default isn't, we might want to stick to default
            // Or if schema changed, prefer default. For now, if null explicitly, use default.
            // This comparison is tricky. Let's assume if stored is null, use default.
            setValue(defaultValue);
          } else if (JSON.stringify(parsed) !== JSON.stringify(defaultValue)) {
            setValue(parsed);
          }
        } else {
          // If nothing in storage, ensure state is defaultValue (it already is by useState initial)
          // but good to be explicit if we had complex logic above.
          // setValue(defaultValue); // Not strictly needed if useState already set it
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}" during initial state read:`, error);
        // Fall back to defaultValue if parsing fails
        setValue(defaultValue);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Removed defaultValue from dependency array as it can cause issues if it's a new ref on each render.
              // The logic now correctly handles initial state and loading from localStorage.

  // Effect to save to localStorage, debounced
  useEffect(() => {
    // Only save to localStorage if the component has mounted and value is not the initial defaultValue
    // or if the value has been changed from the initial defaultValue.
    // This prevents writing the defaultValue to localStorage on initial server render/hydration.
    if (typeof window !== 'undefined' && isMounted.current) {
       // Check if the value is different from the initial default or if it's an intended update
       // This check can be complex if defaultValue is an object/array.
       // For simplicity, we'll write if mounted, assuming any setValue is intentional.
      const handler = setTimeout(() => {
        try {
          window.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.warn(`Error setting localStorage key "${key}" during debounced write:`, error);
        }
      }, 300);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [key, value]);

  return [value, setValue];
}
