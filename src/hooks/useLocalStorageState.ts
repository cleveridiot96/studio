
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
      const item = window.localStorage.getItem(key);
      if (item === null) {
        // If no value is in localStorage, set it to the default
        window.localStorage.setItem(key, JSON.stringify(defaultValue));
        return defaultValue;
      }
      
      const parsed = JSON.parse(item);
      return migrator ? migrator(parsed) : parsed;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setStoredValue = useCallback<SetValue<T>>((newValue) => {
    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
      
      setValue(valueToStore);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  // This effect synchronizes changes across tabs/windows.
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          const migrated = migrator ? migrator(parsed) : parsed;
          setValue(migrated);
        } catch (error) {
          console.error(`Error processing storage event for key "${key}":`, error);
        }
      } else if (event.key === key && !event.newValue) {
        // Handle case where item is removed from another tab
        setValue(defaultValue);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, defaultValue, migrator]);

  return [value, setStoredValue];
}
