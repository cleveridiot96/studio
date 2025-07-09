"use client";
import React, { useMemo, useState } from 'react';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, PurchaseReturn, SaleReturn } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { cn } from "@/lib/utils";

// All the data keys
const keys = {
  purchases: 'purchasesData',
  purchaseReturns: 'purchaseReturnsData',
  sales: 'salesData',
  saleReturns: 'saleReturnsData',
  receipts: 'receiptsData',
  payments: 'paymentsData',
  locationTransfers: 'locationTransfersData',
  customers: 'masterCustomers',
  suppliers: 'masterSuppliers',
  agents: 'masterAgents',
  transporters: 'masterTransporters',
  brokers: 'masterBrokers',
  expenses: 'masterExpenses',
};


export const OutstandingSummary = () => {
  const [hydrated, setHydrated] = React.useState(false);
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

    allMasters.forEach(m => {
        const openingBalance = m.openingBalanceType === 'Cr' ? -(m.openingBalance || 0) : (m.openingBalance || 0);
        balances.set(m.id, openingBalance);
    });
    
    const updateBalance = (partyId: string | undefined, amount: number) => {
        if (!partyId || !balances.has(partyId)) return;
        balances.set(partyId, balances.get(partyId)! + amount);
    };

    // DEBIT(+) means party owes us. CREDIT(-) means we owe party.
    
    // Purchases: If agent exists, liability is with agent. Otherwise, supplier.
    purchases.forEach(p => {
        const accountablePartyId = p.agentId || p.supplierId;
        updateBalance(accountablePartyId, -(p.totalAmount || 0));
    });

    // Sales: If broker exists, receivable is from broker. Otherwise, customer.
    sales.forEach(s => {
        const accountablePartyId = s.brokerId || s.customerId;
        updateBalance(accountablePartyId, s.billedAmount || 0);
        // Brokerage is a CREDIT to the broker (we owe them)
        const totalBrokerage = (s.calculatedBrokerageCommission || 0) + (s.calculatedExtraBrokerage || 0);
        if (s.brokerId && totalBrokerage > 0) {
            updateBalance(s.brokerId, -totalBrokerage);
        }
    });

    // Receipts: CREDIT the party who paid.
    receipts.forEach(r => {
        updateBalance(r.partyId, -(r.amount + (r.cashDiscount || 0)));
    });
    
    // Payments: DEBIT the party who was paid.
    payments.forEach(p => {
        updateBalance(p.partyId, p.amount || 0);
    });

    // Purchase Returns: DEBIT the accountable party for the return amount.
    purchaseReturns.forEach(pr => {
        const originalPurchase = purchases.find(p => p.id === pr.originalPurchaseId);
        if(originalPurchase) {
            const accountablePartyId = originalPurchase.agentId || originalPurchase.supplierId;
            updateBalance(accountablePartyId, pr.returnAmount || 0);
        }
    });

    // Sale Returns: CREDIT the accountable party for the return amount.
    saleReturns.forEach(sr => {
        const originalSale = sales.find(s => s.id === sr.originalSaleId);
        if(originalSale) {
            const accountablePartyId = originalSale.brokerId || originalSale.customerId;
            updateBalance(accountablePartyId, -(sr.returnAmount || 0));
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

    return { totalReceivable, totalPayable };

  }, [hydrated, purchases, sales, receipts, payments, customers, suppliers, agents, transporters, brokers, expenses, purchaseReturns, saleReturns]);
  
  if(!hydrated) return <Card><CardHeader><CardTitle>Loading Outstanding Balances...</CardTitle></CardHeader><CardContent><div className="space-y-2"><div className="h-4 bg-muted rounded w-3/4"></div><div className="h-4 bg-muted rounded w-1/2"></div></div></CardContent></Card>

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-foreground">Outstanding Balances</CardTitle>
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
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">₹{Math.abs(totalPayable).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
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
