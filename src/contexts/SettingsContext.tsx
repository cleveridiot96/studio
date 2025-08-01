
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
  isAppHydrating: boolean;
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
  fontSize: 19,
  financialYear: getDefaultFinancialYear(),
  isFinancialYearHydrated: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState<number>(defaultSettings.fontSize);
  const [financialYear, setFinancialYear] = useState<string>(defaultSettings.financialYear);
  const [isFontSizeHydrated, setIsFontSizeHydrated] = useState<boolean>(false);
  const [isFinancialYearHydrated, setIsFinancialYearHydrated] = useState<boolean>(false);
  const isAppHydrating = !isFontSizeHydrated || !isFinancialYearHydrated;


  // Effect for font size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedFontSize = localStorage.getItem('appFontSize');
      if (storedFontSize) {
        setFontSize(parseFloat(storedFontSize));
      }
      setIsFontSizeHydrated(true);
      }
  }, []);

  useEffect(() => {
    if (isFontSizeHydrated) {
        document.documentElement.style.fontSize = `${fontSize}px`;
        localStorage.setItem('appFontSize', fontSize.toString());
    }
  }, [fontSize, isFontSizeHydrated]);

  // Effect for financial year
  useEffect(() => {
    if (typeof window !== 'undefined') {
       const storedFy = localStorage.getItem('appFinancialYear');
       if (storedFy) {
           setFinancialYear(storedFy);
       }
       setIsFinancialYearHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (isFinancialYearHydrated) {
        localStorage.setItem('appFinancialYear', financialYear);
    }
  }, [financialYear, isFinancialYearHydrated]);


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
      isAppHydrating,
      isFinancialYearHydrated,
      getFinancialYearShort,
      getPreviousFinancialYear,
      getNextFinancialYear,
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
