
"use client";

import React, { createContext, useContext, useMemo } from 'react';
import { useLocalStorageState } from './useLocalStorageState';
import type { Purchase, Sale, Payment, Receipt, LocationTransfer, LedgerEntry, PurchaseReturn, SaleReturn } from '@/lib/types';
import { purchaseMigrator, salesMigrator, locationTransferMigrator } from '@/lib/dataMigrators';

// Define the shape of the context data
interface TransactionsContextType {
  purchases: Purchase[];
  setPurchases: (data: Purchase[] | ((prev: Purchase[]) => Purchase[])) => void;
  sales: Sale[];
  setSales: (data: Sale[] | ((prev: Sale[]) => Sale[])) => void;
  payments: Payment[];
  setPayments: (data: Payment[] | ((prev: Payment[]) => Payment[])) => void;
  receipts: Receipt[];
  setReceipts: (data: Receipt[] | ((prev: Receipt[]) => Receipt[])) => void;
  locationTransfers: LocationTransfer[];
  setLocationTransfers: (data: LocationTransfer[] | ((prev: LocationTransfer[]) => LocationTransfer[])) => void;
  purchaseReturns: PurchaseReturn[];
  setPurchaseReturns: (data: PurchaseReturn[] | ((prev: PurchaseReturn[]) => PurchaseReturn[])) => void;
  saleReturns: SaleReturn[];
  setSaleReturns: (data: SaleReturn[] | ((prev: SaleReturn[]) => SaleReturn[])) => void;
  ledger: LedgerEntry[];
  setLedger: (data: LedgerEntry[] | ((prev: LedgerEntry[]) => LedgerEntry[])) => void;
  addLedgerEntry: (entry: LedgerEntry | LedgerEntry[]) => void;
  removeLedgerEntries: (voucherId: string) => void;
}

// Create the context
const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

// Storage Keys
const STORAGE_KEYS = {
  purchases: 'purchasesData',
  sales: 'salesData',
  payments: 'paymentsData',
  receipts: 'receiptsData',
  locationTransfers: 'locationTransfersData',
  purchaseReturns: 'purchaseReturnsData',
  saleReturns: 'saleReturnsData',
  ledger: 'ledgerData',
};

// Create the provider component
export const TransactionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [purchases, setPurchases] = useLocalStorageState<Purchase[]>(STORAGE_KEYS.purchases, [], purchaseMigrator);
  const [sales, setSales] = useLocalStorageState<Sale[]>(STORAGE_KEYS.sales, [], salesMigrator);
  const [payments, setPayments] = useLocalStorageState<Payment[]>(STORAGE_KEYS.payments, []);
  const [receipts, setReceipts] = useLocalStorageState<Receipt[]>(STORAGE_KEYS.receipts, []);
  const [locationTransfers, setLocationTransfers] = useLocalStorageState<LocationTransfer[]>(STORAGE_KEYS.locationTransfers, [], locationTransferMigrator);
  const [purchaseReturns, setPurchaseReturns] = useLocalStorageState<PurchaseReturn[]>(STORAGE_KEYS.purchaseReturns, []);
  const [saleReturns, setSaleReturns] = useLocalStorageState<SaleReturn[]>(STORAGE_KEYS.saleReturns, []);
  const [ledger, setLedger] = useLocalStorageState<LedgerEntry[]>(STORAGE_KEYS.ledger, []);

  const addLedgerEntry = (entryOrEntries: LedgerEntry | LedgerEntry[]) => {
    setLedger(prev => {
        const entriesToAdd = Array.isArray(entryOrEntries) ? entryOrEntries : [entryOrEntries];
        return [...prev, ...entriesToAdd];
    });
  };

  const removeLedgerEntries = (voucherId: string) => {
    setLedger(prev => prev.filter(entry => entry.relatedVoucher !== voucherId));
  };


  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    purchases, setPurchases,
    sales, setSales,
    payments, setPayments,
    receipts, setReceipts,
    locationTransfers, setLocationTransfers,
    purchaseReturns, setPurchaseReturns,
    saleReturns, setSaleReturns,
    ledger, setLedger,
    addLedgerEntry,
    removeLedgerEntries,
  }), [
    purchases, setPurchases,
    sales, setSales,
    payments, setPayments,
    receipts, setReceipts,
    locationTransfers, setLocationTransfers,
    purchaseReturns, setPurchaseReturns,
    saleReturns, setSaleReturns,
    ledger, setLedger
  ]);

  return (
    <TransactionsContext.Provider value={contextValue}>
      {children}
    </TransactionsContext.Provider>
  );
};

// Create a hook to use the context
export const useTransactions = () => {
  const context = useContext(TransactionsContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionsProvider');
  }
  return context;
};
