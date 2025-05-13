
"use client";

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface Settings {
  fontSize: number; // e.g., 1 for 1rem, 1.2 for 1.2rem
  financialYear: string; // e.g., "2023-2024"
}

interface SettingsContextType extends Settings {
  setFontSize: Dispatch<SetStateAction<number>>;
  setFinancialYear: Dispatch<SetStateAction<string>>;
  getFinancialYearShort: () => string;
  getPreviousFinancialYear: () => string;
  getNextFinancialYear: () => string;
}

const defaultSettings: Settings = {
  fontSize: 16, // Base font size in pixels
  financialYear: getCurrentFinancialYear(),
};

function getCurrentFinancialYear(): string {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-11 (Jan-Dec)
  const currentYear = today.getFullYear();
  if (currentMonth >= 3) { // April or later
    return `${currentYear}-${currentYear + 1}`;
  } else { // Jan, Feb, March
    return `${currentYear - 1}-${currentYear}`;
  }
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedFontSize = localStorage.getItem('appFontSize');
      return storedFontSize ? parseFloat(storedFontSize) : defaultSettings.fontSize;
    }
    return defaultSettings.fontSize;
  });

  const [financialYear, setFinancialYear] = useState<string>(() => {
     if (typeof window !== 'undefined') {
      const storedFy = localStorage.getItem('appFinancialYear');
      return storedFy || defaultSettings.financialYear;
    }
    return defaultSettings.financialYear;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.fontSize = `${fontSize}px`;
      localStorage.setItem('appFontSize', fontSize.toString());
    }
  }, [fontSize]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('appFinancialYear', financialYear);
    }
  }, [financialYear]);
  
  const getFinancialYearShort = useCallback(() => {
    const years = financialYear.split('-');
    return `${years[0].slice(-2)}-${years[1].slice(-2)}`;
  }, [financialYear]);

  const parseFinancialYear = (fy: string): [number, number] => {
    const [startYear, endYear] = fy.split('-').map(Number);
    return [startYear, endYear];
  };

  const getPreviousFinancialYear = useCallback(() => {
    const [startYear] = parseFinancialYear(financialYear);
    return `${startYear - 1}-${startYear}`;
  }, [financialYear]);

  const getNextFinancialYear = useCallback(() => {
    const [, endYear] = parseFinancialYear(financialYear);
    return `${endYear}-${endYear + 1}`;
  }, [financialYear]);


  return (
    <SettingsContext.Provider value={{ 
      fontSize, 
      setFontSize, 
      financialYear, 
      setFinancialYear,
      getFinancialYearShort,
      getPreviousFinancialYear,
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
