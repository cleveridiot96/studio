
"use client";

import React, { useMemo, useEffect } from 'react';
import { useLocalStorageState } from "./useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, PurchaseReturn, SaleReturn } from "@/lib/types";
import { useSettings } from "@/contexts/SettingsContext";
import { salesMigrator, purchaseMigrator } from '@/lib/dataMigrators';
import { parseISO } from 'date-fns';

const keys = {
  purchases: 'purchasesData',
  purchaseReturns: 'purchaseReturnsData',
  sales: 'salesData',
  saleReturns: 'saleReturnsData',
  receipts: 'receiptsData',
  payments: 'paymentsData',
  customers: 'masterCustomers',
  suppliers: 'masterSuppliers',
  agents: 'masterAgents',
  transporters: 'masterTransporters',
  brokers: 'masterBrokers',
  expenses: 'masterExpenses',
};

/**
 * A custom hook to calculate real-time outstanding balances for all parties.
 * It provides sorted lists of receivable and payable parties.
 */
export const useOutstandingBalances = () => {
    const { financialYear: currentFinancialYearString } = useSettings();
    const [hydrated, setHydrated] = React.useState(false);
    useEffect(() => { setHydrated(true) }, []);

    // Load all necessary data from localStorage
    const [purchases] = useLocalStorageState<Purchase[]>(keys.purchases, [], purchaseMigrator);
    const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(keys.purchaseReturns, []);
    const [sales] = useLocalStorageState<Sale[]>(keys.sales, [], salesMigrator);
    const [saleReturns] = useLocalStorageState<SaleReturn[]>(keys.saleReturns, []);
    const [receipts] = useLocalStorageState<Receipt[]>(keys.receipts, []);
    const [payments] = useLocalStorageState<Payment[]>(keys.payments, []);
    const [customers] = useLocalStorageState<MasterItem[]>(keys.customers, []);
    const [suppliers] = useLocalStorageState<MasterItem[]>(keys.suppliers, []);
    const [agents] = useLocalStorageState<MasterItem[]>(keys.agents, []);
    const [transporters] = useLocalStorageState<MasterItem[]>(keys.transporters, []);
    const [brokers] = useLocalStorageState<MasterItem[]>(keys.brokers, []);
    const [expenses] = useLocalStorageState<MasterItem[]>(keys.expenses, []);

    const allMasters = useMemo(() => 
        [...customers, ...suppliers, ...agents, ...transporters, ...brokers, ...expenses],
        [customers, suppliers, agents, transporters, brokers, expenses]
    );

    const partyBalances = useMemo(() => {
        if (!hydrated) return new Map<string, number>();

        const balances = new Map<string, number>();
        
        allMasters.forEach(m => {
            balances.set(m.id, m.openingBalanceType === 'Cr' ? -(m.openingBalance || 0) : (m.openingBalance || 0));
        });

        const allTransactionsSorted = [
            ...purchases.map(p => ({ ...p, txType: 'Purchase' as const })),
            ...sales.map(s => ({ ...s, txType: 'Sale' as const })),
            ...receipts.map(r => ({ ...r, txType: 'Receipt' as const })),
            ...payments.map(p => ({ ...p, txType: 'Payment' as const })),
            ...purchaseReturns.map(pr => ({ ...pr, txType: 'PurchaseReturn' as const })),
            ...saleReturns.map(sr => ({ ...sr, txType: 'SaleReturn' as const }))
        ].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

        const updateBalance = (partyId: string | undefined, amount: number) => {
            if (!partyId || !balances.has(partyId)) return;
            balances.set(partyId, balances.get(partyId)! + amount);
        };

        allTransactionsSorted.forEach(tx => {
            if (tx.txType === 'Sale') {
                const accountablePartyId = tx.brokerId || tx.customerId;
                updateBalance(accountablePartyId, tx.billedAmount || 0);
            }
            else if (tx.txType === 'Purchase') {
                const accountablePartyId = tx.agentId || tx.supplierId;
                updateBalance(accountablePartyId, -(tx.totalAmount || 0));
            }
            else if (tx.txType === 'Receipt') updateBalance(tx.partyId, -(tx.amount + (tx.cashDiscount || 0)));
            else if (tx.txType === 'Payment') updateBalance(tx.partyId, tx.amount || 0);
            else if (tx.txType === 'PurchaseReturn') {
                const p = purchases.find(p => p.id === tx.originalPurchaseId);
                if (p) {
                    const accountablePartyId = p.agentId || p.supplierId;
                    updateBalance(accountablePartyId, tx.returnAmount || 0);
                }
            } else if (tx.txType === 'SaleReturn') {
                const s = sales.find(s => s.id === tx.originalSaleId);
                if (s) {
                    const accountablePartyId = s.brokerId || s.customerId;
                    updateBalance(accountablePartyId, -(tx.returnAmount || 0));
                }
            }
        });

        return balances;
    }, [hydrated, purchases, sales, receipts, payments, purchaseReturns, saleReturns, allMasters]);

    const { receivableParties, payableParties } = useMemo(() => {
        const receivables: MasterItem[] = [];
        const payables: MasterItem[] = [];
        
        allMasters.forEach(party => {
            const balance = partyBalances.get(party.id) || 0;
            if (balance > 0.01) { // Positive balance means receivable
                receivables.push({ ...party, balance });
            } else if (balance < -0.01) { // Negative balance means payable
                payables.push({ ...party, balance });
            }
        });

        // Sort by balance amount, descending
        receivables.sort((a, b) => (b.balance || 0) - (a.balance || 0));
        payables.sort((a, b) => (a.balance || 0) - (b.balance || 0)); // For payables, most negative comes first

        return { receivableParties: receivables, payableParties: payables };

    }, [allMasters, partyBalances]);
    
    const getPartyName = (partyId: string) => {
        return allMasters.find(p => p.id === partyId)?.name || partyId;
    }

    return {
        receivableParties,
        payableParties,
        getPartyName,
        balances: partyBalances,
        isBalancesLoading: !hydrated
    };
};
