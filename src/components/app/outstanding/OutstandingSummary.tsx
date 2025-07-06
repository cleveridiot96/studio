
"use client";
import React, { useMemo, useState } from 'react';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, LocationTransfer } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { cn } from '@/lib/utils';

// All the data keys
const keys = {
  purchases: 'purchasesData',
  sales: 'salesData',
  receipts: 'receiptsData',
  payments: 'paymentsData',
  locationTransfers: 'locationTransfersData',
  customers: 'masterCustomers',
  suppliers: 'masterSuppliers',
  agents: 'masterAgents',
  transporters: 'masterTransporters',
  brokers: 'masterBrokers',
};


export const OutstandingSummary = () => {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => { setHydrated(true) }, []);

  const [purchases] = useLocalStorageState<Purchase[]>(keys.purchases, []);
  const [sales] = useLocalStorageState<Sale[]>(keys.sales, []);
  const [receipts] = useLocalStorageState<Receipt[]>(keys.receipts, []);
  const [payments] = useLocalStorageState<Payment[]>(keys.payments, []);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(keys.locationTransfers, []);

  const [customers] = useLocalStorageState<MasterItem[]>(keys.customers, []);
  const [suppliers] = useLocalStorageState<MasterItem[]>(keys.suppliers, []);
  const [agents] = useLocalStorageState<MasterItem[]>(keys.agents, []);
  const [transporters] = useLocalStorageState<MasterItem[]>(keys.transporters, []);
  const [brokers] = useLocalStorageState<MasterItem[]>(keys.brokers, []);

  const { totalReceivable, totalPayable } = useMemo(() => {
        if (!hydrated) return { totalReceivable: 0, totalPayable: 0 };
        
        const allMasters = [...customers, ...suppliers, ...agents, ...transporters, ...brokers];
        const balances = new Map<string, number>();

        allMasters.forEach(m => {
            const openingBalance = m.openingBalanceType === 'Cr' ? -(m.openingBalance || 0) : (m.openingBalance || 0);
            balances.set(m.id, openingBalance);
        });
        
        const updateBalance = (partyId: string | undefined, amount: number) => {
            if (!partyId || !balances.has(partyId)) return;
            balances.set(partyId, balances.get(partyId)! + amount);
        };

        // --- Corrected Logic ---
        // Sales create receivables. Accountable party is broker, fallback to customer.
        sales.forEach(s => {
            const accountablePartyId = s.brokerId || s.customerId;
            updateBalance(accountablePartyId, s.billedAmount);
        });

        // Receipts reduce receivables.
        receipts.forEach(r => {
            updateBalance(r.partyId, -(r.amount + (r.cashDiscount || 0)));
        });
        
        // Purchases create payables to supplier and agent separately.
        purchases.forEach(p => {
            const payableToSupplier = (p.totalAmount || 0) - (p.brokerageCharges || 0);
            updateBalance(p.supplierId, -payableToSupplier);
            if (p.agentId && p.brokerageCharges && p.brokerageCharges > 0) {
                updateBalance(p.agentId, -p.brokerageCharges);
            }
        });

        // Payments reduce payables.
        payments.forEach(p => {
            updateBalance(p.partyId, p.amount);
        });

        // Transport charges are also payables to the transporter.
        locationTransfers.forEach(lt => {
            if (lt.transporterId && lt.transportCharges) {
                updateBalance(lt.transporterId, -lt.transportCharges);
            }
        });
        // --- End of Corrected Logic ---

        let totalReceivable = 0;
        let totalPayable = 0;
        balances.forEach((balance) => {
            if (balance > 0) totalReceivable += balance;
            else if (balance < 0) totalPayable += balance;
        });

        return { totalReceivable, totalPayable };

  }, [hydrated, purchases, sales, receipts, payments, locationTransfers, customers, suppliers, agents, transporters, brokers]);
  
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
