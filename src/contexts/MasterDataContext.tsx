
"use client";

import React, { createContext, useContext, useMemo } from 'react';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import type { MasterItem, MasterItemType } from '@/lib/types';

// Define storage keys for master data
const STORAGE_KEYS: Record<MasterItemType, string> = {
  Customer: 'masterCustomers',
  Supplier: 'masterSuppliers',
  Agent: 'masterAgents',
  Transporter: 'masterTransporters',
  Broker: 'masterBrokers',
  Warehouse: 'masterWarehouses',
  Expense: 'masterExpenses',
};

// Define the shape of the context
interface MasterDataContextType {
  data: Record<MasterItemType, MasterItem[]>;
  setData: (type: MasterItemType, data: MasterItem[] | ((prev: MasterItem[]) => MasterItem[])) => void;
  getAllMasters: () => MasterItem[];
}

// Create the context
const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

// Create the provider component
export const MasterDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(STORAGE_KEYS.Customer, []);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(STORAGE_KEYS.Supplier, []);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(STORAGE_KEYS.Agent, []);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(STORAGE_KEYS.Transporter, []);
  const [brokers, setBrokers] = useLocalStorageState<MasterItem[]>(STORAGE_KEYS.Broker, []);
  const [warehouses, setWarehouses] = useLocalStorageState<MasterItem[]>(STORAGE_KEYS.Warehouse, []);
  const [expenses, setExpenses] = useLocalStorageState<MasterItem[]>(STORAGE_KEYS.Expense, []);

  const data = useMemo(() => ({
    Customer: customers,
    Supplier: suppliers,
    Agent: agents,
    Transporter: transporters,
    Broker: brokers,
    Warehouse: warehouses,
    Expense: expenses,
  }), [customers, suppliers, agents, transporters, brokers, warehouses, expenses]);

  const setData = (type: MasterItemType, value: MasterItem[] | ((prev: MasterItem[]) => MasterItem[])) => {
    const setters: Record<MasterItemType, React.Dispatch<React.SetStateAction<MasterItem[]>>> = {
        Customer: setCustomers,
        Supplier: setSuppliers,
        Agent: setAgents,
        Transporter: setTransporters,
        Broker: setBrokers,
        Warehouse: setWarehouses,
        Expense: setExpenses,
    };
    const setter = setters[type];
    if (setter) {
      setter(value as React.SetStateAction<MasterItem[]>);
    }
  };
  
  const getAllMasters = () => {
    return Object.values(data).flat().sort((a,b) => a.name.localeCompare(b.name));
  }


  const contextValue = { data, setData, getAllMasters };

  return (
    <MasterDataContext.Provider value={contextValue}>
      {children}
    </MasterDataContext.Provider>
  );
};

// Create a hook to use the context
export const useMasterData = () => {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
};
