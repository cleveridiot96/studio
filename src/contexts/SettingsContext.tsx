
"use client";

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface Settings {
  fontSize: number;
  financialYear: string;
  isFinancialYearHydrated: boolean;
  lowStockThreshold: number; // New setting for low stock
}

interface SettingsContextType extends Settings {
  setFontSize: Dispatch<SetStateAction<number>>;
  setFinancialYear: Dispatch<SetStateAction<string>>;
  setLowStockThreshold: Dispatch<SetStateAction<number>>;
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
  lowStockThreshold: 10, // Default to 10 bags
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState<number>(defaultSettings.fontSize);
  const [financialYear, setFinancialYear] = useState<string>(defaultSettings.financialYear);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(defaultSettings.lowStockThreshold);
  
  const [isFontSizeHydrated, setIsFontSizeHydrated] = useState<boolean>(false);
  const [isFinancialYearHydrated, setIsFinancialYearHydrated] = useState<boolean>(false);
  const [isLowStockHydrated, setIsLowStockHydrated] = useState<boolean>(false);
  
  const isAppHydrating = !isFontSizeHydrated || !isFinancialYearHydrated || !isLowStockHydrated;

  // Hydration effects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedFontSize = localStorage.getItem('appFontSize');
      if (storedFontSize) setFontSize(parseFloat(storedFontSize));
      setIsFontSizeHydrated(true);

      const storedFy = localStorage.getItem('appFinancialYear');
      if (storedFy) setFinancialYear(storedFy);
      setIsFinancialYearHydrated(true);
      
      const storedLowStock = localStorage.getItem('appLowStockThreshold');
      if (storedLowStock) setLowStockThreshold(parseInt(storedLowStock, 10));
      setIsLowStockHydrated(true);
    }
  }, []);

  // Persistence effects
  useEffect(() => {
    if (isFontSizeHydrated) {
        document.documentElement.style.fontSize = `${fontSize}px`;
        localStorage.setItem('appFontSize', fontSize.toString());
    }
  }, [fontSize, isFontSizeHydrated]);

  useEffect(() => {
    if (isFinancialYearHydrated) {
        localStorage.setItem('appFinancialYear', financialYear);
    }
  }, [financialYear, isFinancialYearHydrated]);

  useEffect(() => {
    if (isLowStockHydrated) {
        localStorage.setItem('appLowStockThreshold', lowStockThreshold.toString());
    }
  }, [lowStockThreshold, isLowStockHydrated]);

  const getFinancialYearShort = useCallback(() => {
    const years = financialYear.split('-');
    if (years.length === 2 && years[0].length >= 4 && years[1].length >=4) {
        return `${years[0].slice(-2)}-${years[1].slice(-2)}`;
    }
    return financialYear;
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
    return financialYear;
  }, [financialYear]);

  const getNextFinancialYear = useCallback(() => {
    const parsed = parseFinancialYear(financialYear);
    if (parsed) {
      const [, endYear] = parsed;
      return `${endYear}-${endYear + 1}`;
    }
    return financialYear;
  }, [financialYear]);


  return (
    <SettingsContext.Provider value={{
      fontSize,
      setFontSize,
      financialYear,
      setFinancialYear,
      lowStockThreshold,
      setLowStockThreshold,
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
