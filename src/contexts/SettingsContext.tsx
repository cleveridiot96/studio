
"use client";

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface Settings {
  fontSize: number;
  financialYear: string;
 isFinancialYearHydrated: boolean; // Added to track hydration state for financial year
}

interface SettingsContextType extends Settings {
  setFontSize: Dispatch<SetStateAction<number>>;
  setFinancialYear: Dispatch<SetStateAction<string>>;
  getFinancialYearShort: () => string;
  getPreviousFinancialYear: () => string;
  getNextFinancialYear: () => string;
}

function getDefaultFinancialYear(): string {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  if (currentMonth >= 3) {
    return `${currentYear}-${currentYear + 1}`;
  } else {
    return `${currentYear - 1}-${currentYear}`;
  }
}

const defaultSettings: Settings = {
  fontSize: 16,
  financialYear: getDefaultFinancialYear(), // Default financial year
};
const defaultIsAppHydrating = true; // Default to true

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState<number>(defaultSettings.fontSize);
  const [financialYear, setFinancialYear] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const storedFy = localStorage.getItem('appFinancialYear');
      return storedFy || defaultSettings.financialYear;
    }
    return defaultSettings.financialYear;
  });
  const [isFontSizeHydrated, setIsFontSizeHydrated] = useState<boolean>(false); // Added state for fontSize hydration
  const [isFinancialYearHydrated, setIsFinancialYearHydrated] = useState<boolean>(false); // Added state for financialYear hydration
  const [isAppHydrating, setIsAppHydrating] = useState<boolean>(defaultIsAppHydrating); // Added state for overall app hydration status


  // Effect for font size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedFontSize = localStorage.getItem('appFontSize');
      if (storedFontSize) {
        const parsedSize = parseFloat(storedFontSize);
        // Only update if it's different from the initial default to avoid unnecessary sets
        if (parsedSize !== defaultSettings.fontSize) {
            setFontSize(parsedSize);
        }
      } else { /* No stored value, use default. State is considered hydrated. */ }
      // Mark font size as hydrated regardless of whether a stored value was found
      setIsFontSizeHydrated(true);
      }

  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.fontSize = `${fontSize}px`;
      localStorage.setItem('appFontSize', fontSize.toString());
    }
  }, [fontSize]);

  // Effect for financial year
  useEffect(() => {
    if (typeof window !== 'undefined') {
       // Check if localStorage value is loaded into state.
       // This effect runs after the initial useState execution
       // We can also save the latest value here
       localStorage.setItem('appFinancialYear', financialYear);
       setIsFinancialYearHydrated(true);
    }

  }, [financialYear]);

  // Effect to determine overall app hydration status for settings
  useEffect(() => {
    if (isFontSizeHydrated && isFinancialYearHydrated) {
      setIsAppHydrating(false); // Set hydration to false once both are hydrated
    }
  }, [isFontSizeHydrated, isFinancialYearHydrated]);

  const getFinancialYearShort = useCallback(() => {
    const years = financialYear.split('-');
    if (years.length === 2 && years[0].length >= 4 && years[1].length >=4) {
        return `${years[0].slice(-2)}-${years[1].slice(-2)}`;
    }
    return financialYear; // Fallback if format is unexpected
  }, [financialYear]);

  const parseFinancialYear = (fy: string): [number, number] | null => {
    const parts = fy.split('-');
    if (parts.length === 2) {
      const startYear = parseInt(parts[0], 10);
      const endYear = parseInt(parts[1], 10);
      if (!isNaN(startYear) && !isNaN(endYear) && endYear === startYear + 1) {
        return [startYear, endYear];
      }
    }
    console.warn("Invalid financial year format for parsing:", fy);
    return null;
  };

  const getPreviousFinancialYear = useCallback(() => {
    const parsed = parseFinancialYear(financialYear);
    if (parsed) {
      const [startYear] = parsed;
      return `${startYear - 1}-${startYear}`;
    }
    return financialYear; // Fallback
  }, [financialYear]);

  const getNextFinancialYear = useCallback(() => {
    const parsed = parseFinancialYear(financialYear);
    if (parsed) {
      const [, endYear] = parsed; // endYear is the second year of the FY string e.g. 2024 from "2023-2024"
      return `${endYear}-${endYear + 1}`;
    }
    return financialYear; // Fallback
  }, [financialYear]);


  return (
    <SettingsContext.Provider value={{
      fontSize,
      setFontSize,
      financialYear,
      setFinancialYear,
      isAppHydrating, // Expose hydrating state to context consumers
      isFinancialYearHydrated, // Expose hydration state for financial year to context consumers
      getFinancialYearShort,
      getNextFinancialYear
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// Helper to get initial settings from localStorage (can be used outside provider if needed)
export const getInitialSettings = () => {
  if (typeof window !== 'undefined') {
    const storedFontSize = localStorage.getItem('appFontSize');
    const storedFinancialYear = localStorage.getItem('appFinancialYear');

    return {
      fontSize: storedFontSize ? parseInt(storedFontSize, 10) : defaultSettings.fontSize,
      financialYear: storedFinancialYear || defaultSettings.financialYear,
    };
  }
  return defaultSettings;
};
