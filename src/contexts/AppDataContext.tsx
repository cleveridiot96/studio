"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Purchase, Sale, Payment, Receipt, LocationTransfer, PurchaseReturn, SaleReturn, StockAdjustment, LedgerEntry, MasterItem } from '@/lib/types';

// 1. Define the shape of our entire application's data
export interface AppData {
  purchases: Purchase[];
  sales: Sale[];
  payments: Payment[];
  receipts: Receipt[];
  locationTransfers: LocationTransfer[];
  purchaseReturns: PurchaseReturn[];
  saleReturns: SaleReturn[];
  adjustments: StockAdjustment[];
  ledger: LedgerEntry[];
  masterData: {
    Customer: MasterItem[];
    Supplier: MasterItem[];
    Agent: MasterItem[];
    Transporter: MasterItem[];
    Broker: MasterItem[];
    Warehouse: MasterItem[];
    Expense: MasterItem[];
  };
  settings: {
    financialYear: string;
    // Add other settings here as needed
  };
}

// 2. Define the context shape
interface AppDataContextType {
  appData: AppData | null;
  setAppData: React.Dispatch<React.SetStateAction<AppData | null>>;
  loadDataFromFile: (file: File) => Promise<void>;
  saveDataToFile: () => Promise<void>;
  isDataLoaded: boolean;
}

// 3. Create the context
const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// 4. Create the provider component
export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [appData, setAppData] = useState<AppData | null>(null);
  const isDataLoaded = appData !== null;

  const loadDataFromFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as AppData;
      // Basic validation to ensure it's our data file
      if (data && data.masterData && data.transactions) {
        setAppData(data);
        console.log("Data loaded successfully.");
      } else {
        throw new Error("Invalid data file format.");
      }
    } catch (error) {
      console.error("Failed to load or parse data file:", error);
      // Here you might want to use a toast to show the error to the user
    }
  };

  const saveDataToFile = async () => {
    if (!appData) {
      console.error("No data to save.");
      return;
    }
    try {
      const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `kisan_khata_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log("Data saved successfully.");
    } catch (error) {
      console.error("Failed to save data:", error);
    }
  };

  const value = {
    appData,
    setAppData,
    loadDataFromFile,
    saveDataToFile,
    isDataLoaded,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

// 5. Create a custom hook for easy access to the context
export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
