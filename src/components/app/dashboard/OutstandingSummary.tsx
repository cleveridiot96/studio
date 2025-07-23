
"use client";
import React, { useMemo } from 'react';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, PurchaseReturn, SaleReturn } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { getFinancialYearDateRange } from '@/lib/utils';
import { isDateBeforeFinancialYear, isDateInFinancialYear } from "@/lib/utils";

// All the data keys
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

export const OutstandingSummary = () => {
  const [hydrated, setHydrated] = React.useState(false);
  const { financialYear: currentFinancialYearString } = useSettings();
  React.useEffect(() => { setHydrated(true) }, []);

  const [purchases] = useLocalStorageState<Purchase[]>(keys.purchases, []);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(keys.purchaseReturns, []);
  const [sales] = useLocalStorageState<Sale[]>(keys.sales, []);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(keys.saleReturns, []);
  const [receipts] = useLocalStorageState<Receipt[]>(keys.receipts, []);
  const [payments] = useLocalStorageState<Payment[]>(keys.payments, []);
  const [customers] = useLocalStorageState<MasterItem[]>(keys.customers, []);
  const [suppliers] = useLocalStorageState<MasterItem[]>(keys.suppliers, []);
  const [agents] = useLocalStorageState<MasterItem[]>(keys.agents, []);
  const [transporters] = useLocalStorageState<MasterItem[]>(keys.transporters, []);
  const [brokers] = useLocalStorageState<MasterItem[]>(keys.brokers, []);
  const [expenses] = useLocalStorageState<MasterItem[]>(keys.expenses, []);

  const { totalReceivable, totalPayable } = useMemo(() => {
    if (!hydrated) return { totalReceivable: 0, totalPayable: 0 };
    
    const allMasters = [...customers, ...suppliers, ...agents, ...transporters, ...brokers, ...expenses];
    const balances = new Map<string, number>();

    // Step 1: Initialize with opening balances
    allMasters.forEach(m => {
        let openingBalance = m.openingBalanceType === 'Cr' ? -(m.openingBalance || 0) : (m.openingBalance || 0);

        // Sum up all transactions from *before* the current financial year to adjust the opening balance
        const transactionsBeforeFY = [
            ...purchases, ...sales, ...receipts, ...payments, ...purchaseReturns, ...saleReturns
        ].filter(tx => tx && isDateBeforeFinancialYear(tx.date, currentFinancialYearString));

        transactionsBeforeFY.forEach(tx => {
            if ('billedAmount' in tx) { // It's a Sale
                const accountablePartyId = tx.brokerId || tx.customerId;
                if(accountablePartyId === m.id) openingBalance += tx.billedAmount || 0;
            } else if ('totalAmount' in tx) { // It's a Purchase
                const accountablePartyId = tx.agentId || tx.supplierId;
                if(accountablePartyId === m.id) openingBalance -= (tx.totalAmount || 0);
            } else if ('paymentMethod' in tx && 'cashDiscount' in tx) { // It's a Receipt
                if(tx.partyId === m.id) openingBalance -= (tx.amount + (tx.cashDiscount || 0));
            } else if ('paymentMethod' in tx) { // It's a Payment
                if(tx.partyId === m.id) openingBalance += tx.amount || 0;
            } else if ('originalPurchaseId' in tx) { // It's a PurchaseReturn
                const p = purchases.find(p => p.id === tx.originalPurchaseId);
                if(p && (p.agentId === m.id || p.supplierId === m.id)) openingBalance += tx.returnAmount || 0;
            } else if ('originalSaleId' in tx) { // It's a SaleReturn
                const s = sales.find(s => s.id === tx.originalSaleId);
                if(s && (s.brokerId === m.id || s.customerId === m.id)) openingBalance -= (tx.returnAmount || 0);
            }
        });

        balances.set(m.id, openingBalance);
    });
    
    // Step 2: Process transactions *within* the current financial year
    const transactionsInFY = [
        ...purchases, ...sales, ...receipts, ...payments, ...purchaseReturns, ...saleReturns
    ].filter(tx => tx && isDateInFinancialYear(tx.date, currentFinancialYearString));

    const updateBalance = (partyId: string | undefined, amount: number) => {
        if (!partyId || !balances.has(partyId)) return;
        balances.set(partyId, balances.get(partyId)! + amount);
    };
    
    transactionsInFY.forEach(tx => {
        if ('billedAmount' in tx) { // Sale
            updateBalance(tx.brokerId || tx.customerId, tx.billedAmount || 0);
        } else if ('totalAmount' in tx) { // Purchase
            updateBalance(tx.agentId || tx.supplierId, -(tx.totalAmount || 0));
        } else if ('paymentMethod' in tx && 'cashDiscount' in tx) { // Receipt
            updateBalance(tx.partyId, -(tx.amount + (tx.cashDiscount || 0)));
        } else if ('paymentMethod' in tx) { // Payment
            updateBalance(tx.partyId, tx.amount || 0);
        } else if ('originalPurchaseId' in tx) { // PurchaseReturn
            const p = purchases.find(p => p.id === tx.originalPurchaseId);
            if(p) updateBalance(p.agentId || p.supplierId, tx.returnAmount || 0);
        } else if ('originalSaleId' in tx) { // SaleReturn
            const s = sales.find(s => s.id === tx.originalSaleId);
            if(s) updateBalance(s.brokerId || s.customerId, -(tx.returnAmount || 0));
        }
    });

    let totalReceivable = 0;
    let totalPayable = 0;
    balances.forEach((balance) => {
        if (balance > 0) {
            totalReceivable += balance;
        } else if (balance < 0) {
            totalPayable += balance;
        }
    });

    return { totalReceivable, totalPayable: Math.abs(totalPayable) };

  }, [hydrated, purchases, sales, receipts, payments, customers, suppliers, agents, transporters, brokers, expenses, purchaseReturns, saleReturns, currentFinancialYearString]);
  
  if(!hydrated) return <Card><CardHeader><CardTitle>Loading Outstanding Balances...</CardTitle></CardHeader><CardContent><div className="space-y-2"><div className="h-4 bg-muted rounded w-3/4"></div><div className="h-4 bg-muted rounded w-1/2"></div></div></CardContent></Card>

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-foreground">Outstanding Balances (FY {currentFinancialYearString})</CardTitle>
        <CardDescription>A summary of total money to be paid and received. Click a card to see details.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/outstanding" className="block group">
              <Card className="bg-green-50 dark:bg-green-900/30 border-green-500/50 h-full transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-1">
                  <CardHeader>
                      <CardTitle className="text-green-700 dark:text-green-300">Total Receivables</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">₹{totalReceivable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                  </CardContent>
              </Card>
            </Link>
             <Link href="/outstanding" className="block group">
               <Card className="bg-red-50 dark:bg-red-900/30 border-red-500/50 h-full transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-1">
                  <CardHeader>
                      <CardTitle className="text-red-700 dark:text-red-300">Total Payables</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">₹{totalPayable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                  </CardContent>
              </Card>
            </Link>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
            <Link href="/outstanding">View Full Outstanding Report</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
