"use client";

import React from 'react';
import type { Purchase, Sale, Payment, Receipt, LocationTransfer, PurchaseReturn, SaleReturn, StockAdjustment, LedgerEntry } from '@/lib/types';
import { useAppData } from './AppDataContext';
import { produce } from 'immer';

// Custom hook to manage all transactional data from AppData context
export const useTransactions = () => {
    const { appData, setAppData } = useAppData();

    const setData = (updater: (draft: typeof appData) => void) => {
        setAppData(produce(updater));
    };

    const transactions = appData ? {
        purchases: appData.purchases || [],
        sales: appData.sales || [],
        payments: appData.payments || [],
        receipts: appData.receipts || [],
        locationTransfers: appData.locationTransfers || [],
        purchaseReturns: appData.purchaseReturns || [],
        saleReturns: appData.saleReturns || [],
        adjustments: appData.adjustments || [],
        ledger: appData.ledger || [],
    } : {
        purchases: [], sales: [], payments: [], receipts: [], locationTransfers: [],
        purchaseReturns: [], saleReturns: [], adjustments: [], ledger: []
    };

    const setPurchases = (updater: React.SetStateAction<Purchase[]>) => {
        setData(draft => {
            if (draft) draft.purchases = typeof updater === 'function' ? updater(draft.purchases) : updater;
        });
    };

    const setSales = (updater: React.SetStateAction<Sale[]>) => {
        setData(draft => {
            if (draft) draft.sales = typeof updater === 'function' ? updater(draft.sales) : updater;
        });
    };

    const setPayments = (updater: React.SetStateAction<Payment[]>) => {
        setData(draft => {
            if (draft) draft.payments = typeof updater === 'function' ? updater(draft.payments) : updater;
        });
    };

    const setReceipts = (updater: React.SetStateAction<Receipt[]>) => {
        setData(draft => {
            if (draft) draft.receipts = typeof updater === 'function' ? updater(draft.receipts) : updater;
        });
    };

    const setLocationTransfers = (updater: React.SetStateAction<LocationTransfer[]>) => {
        setData(draft => {
            if (draft) draft.locationTransfers = typeof updater === 'function' ? updater(draft.locationTransfers) : updater;
        });
    };

    const setPurchaseReturns = (updater: React.SetStateAction<PurchaseReturn[]>) => {
        setData(draft => {
            if (draft) draft.purchaseReturns = typeof updater === 'function' ? updater(draft.purchaseReturns) : updater;
        });
    };

    const setSaleReturns = (updater: React.SetStateAction<SaleReturn[]>) => {
        setData(draft => {
            if (draft) draft.saleReturns = typeof updater === 'function' ? updater(draft.saleReturns) : updater;
        });
    };

    const setAdjustments = (updater: React.SetStateAction<StockAdjustment[]>) => {
        setData(draft => {
            if (draft) draft.adjustments = typeof updater === 'function' ? updater(draft.adjustments) : updater;
        });
    };

    const setLedger = (updater: React.SetStateAction<LedgerEntry[]>) => {
        setData(draft => {
            if (draft) draft.ledger = typeof updater === 'function' ? updater(draft.ledger) : updater;
        });
    };

    const addLedgerEntry = (newEntries: LedgerEntry | LedgerEntry[]) => {
        const entriesToAdd = Array.isArray(newEntries) ? newEntries : [newEntries];
        if (entriesToAdd.length > 0) {
            setLedger(prev => [...prev, ...entriesToAdd]);
        }
    };

    const removeLedgerEntries = (relatedVoucherId: string) => {
        setLedger(prev => prev.filter(entry => entry.relatedVoucher !== relatedVoucherId));
    };


    return {
        ...transactions,
        setPurchases,
        setSales,
        setPayments,
        setReceipts,
        setLocationTransfers,
        setPurchaseReturns,
        setSaleReturns,
        setAdjustments,
        setLedger,
        addLedgerEntry,
        removeLedgerEntries,
    };
};
