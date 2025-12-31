"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useAppData } from './AppDataContext';

// 1. Define the context shape
interface SettingsContextType {
  financialYear: string;
  setFinancialYear: (year: string) => void;
  isAppHydrating: boolean;
}

// 2. Create the context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// 3. Create the provider component
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { appData, setAppData, isDataLoaded } = useAppData();

  const setFinancialYear = (year: string) => {
    setAppData(prevData => {
      if (!prevData) return null;
      return {
        ...prevData,
        settings: {
          ...prevData.settings,
          financialYear: year,
        },
      };
    });
  };

  const value: SettingsContextType = {
    financialYear: appData?.settings?.financialYear || '2023-2024', // Default value
    setFinancialYear,
    isAppHydrating: !isDataLoaded,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// 4. Create a custom hook for easy access
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
