"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import type { MasterItem, MasterItemType } from '@/lib/types';
import { useAppData } from './AppDataContext';

// 1. Define the context shape
interface MasterDataContextType {
  data: { [key in MasterItemType]: MasterItem[] };
  setMasterData: (type: MasterItemType, updater: React.SetStateAction<MasterItem[]>) => void;
  addMasterItem: (item: MasterItem) => void;
  updateMasterItem: (item: MasterItem) => void;
  // getMasterItemById: (type: MasterItemType, id: string) => MasterItem | undefined;
}

// 2. Create the context
const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

// 3. Create the provider component
export const MasterDataProvider = ({ children }: { children: ReactNode }) => {
  const { appData, setAppData } = useAppData();

  const setMasterData = (type: MasterItemType, updater: React.SetStateAction<MasterItem[]>) => {
    setAppData(prevData => {
      if (!prevData) return null;
      const currentItems = prevData.masterData[type] || [];
      const newItems = typeof updater === 'function' ? updater(currentItems) : updater;
      return {
        ...prevData,
        masterData: {
          ...prevData.masterData,
          [type]: newItems,
        },
      };
    });
  };
  
  const addMasterItem = (item: MasterItem) => {
    setMasterData(item.type, (prevItems) => [item, ...prevItems]);
  };

  const updateMasterItem = (item: MasterItem) => {
    setMasterData(item.type, (prevItems) =>
      prevItems.map(i => (i.id === item.id ? item : i))
    );
  };

  const value: MasterDataContextType = {
    data: appData?.masterData || { Customer: [], Supplier: [], Agent: [], Transporter: [], Broker: [], Warehouse: [], Expense: [] },
    setMasterData,
    addMasterItem,
    updateMasterItem,
  };

  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
};

// 4. Create a custom hook for easy access
export const useMasterData = () => {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
};
