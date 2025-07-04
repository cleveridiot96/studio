
"use client";
import React, { useMemo, useState } from 'react';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, LocationTransfer } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowRight, Printer } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, differenceInDays, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';

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

interface OutstandingEntry {
  partyId: string;
  partyName: string;
  partyType: string;
  amount: number;
  lastTransactionDate: string;
  daysOutstanding: number;
}

type SortKey = 'partyName' | 'amount' | 'daysOutstanding';
type SortDirection = 'asc' | 'desc';

const OutstandingTable = ({ title, data, type }: { title: string; data: OutstandingEntry[]; type: 'receivable' | 'payable' }) => {
    const [sortKey, setSortKey] = useState<SortKey>('daysOutstanding');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const router = useRouter();

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            let compareA = a[sortKey];
            let compareB = b[sortKey];
            
            if(sortKey === 'partyName') {
                return sortDirection === 'asc' ? String(compareA).localeCompare(String(compareB)) : String(compareB).localeCompare(String(compareA));
            } else {
                 return sortDirection === 'asc' ? (compareA as number) - (compareB as number) : (compareB as number) - (compareA as number);
            }
        });
    }, [data, sortKey, sortDirection]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('desc');
        }
    };

    const getSortIcon = (key: SortKey) => {
        if (sortKey !== key) return <ArrowUpDown className="h-4 w-4 ml-2 opacity-30 inline-block" />;
        return sortDirection === 'desc' ? '▼' : '▲';
    }

    if(data.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground text-center py-4">No outstanding {type}s.</p></CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className={`text-lg ${type === 'receivable' ? 'text-green-700' : 'text-red-700'}`}>{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[60vh]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead onClick={() => handleSort('partyName')} className="cursor-pointer hover:bg-muted/50">
                                    Party Name {getSortIcon('partyName')}
                                </TableHead>
                                <TableHead onClick={() => handleSort('amount')} className="cursor-pointer hover:bg-muted/50 text-right">
                                    Amount Due {getSortIcon('amount')}
                                </TableHead>
                                <TableHead onClick={() => handleSort('daysOutstanding')} className="cursor-pointer hover:bg-muted/50 text-right">
                                    Days Since Last Tx {getSortIcon('daysOutstanding')}
                                </TableHead>
                                <TableHead className="text-center w-[80px]">Ledger</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedData.map(item => (
                                <TableRow key={item.partyId} className="cursor-pointer hover:bg-muted/20" onClick={() => router.push(`/accounts-ledger?partyId=${item.partyId}`)}>
                                    <TableCell>
                                        <div className="font-medium">{item.partyName}</div>
                                        <div className="text-xs text-muted-foreground">{item.partyType}</div>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">₹{Math.abs(item.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                    <TableCell className={`text-right ${item.daysOutstanding > 30 ? 'text-destructive font-bold' : item.daysOutstanding > 7 ? 'text-orange-500' : ''}`}>
                                        {item.daysOutstanding} days
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/accounts-ledger?partyId=${item.partyId}`)}}>
                                            <ArrowRight className="h-4 w-4"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

export function OutstandingClient() {
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

  const { receivables, payables, totalReceivable, totalPayable } = useMemo(() => {
        if (!hydrated) return { receivables: [], payables: [], totalReceivable: 0, totalPayable: 0 };
        
        const allMasters = [...customers, ...suppliers, ...agents, ...transporters, ...brokers];
        const balances = new Map<string, { balance: number; lastTxDate: string, name: string, type: string }>();

        allMasters.forEach(m => {
            const openingBalance = m.openingBalanceType === 'Cr' ? -(m.openingBalance || 0) : (m.openingBalance || 0);
            balances.set(m.id, { balance: openingBalance, lastTxDate: '1970-01-01', name: m.name, type: m.type });
        });
        
        const updateBalance = (partyId: string | undefined, amount: number, date: string) => {
            if (!partyId || !balances.has(partyId)) return;
            const entry = balances.get(partyId)!;
            entry.balance += amount;
            if (new Date(date) > new Date(entry.lastTxDate)) {
                entry.lastTxDate = date;
            }
        };

        sales.forEach(s => updateBalance(s.customerId, s.billedAmount, s.date));
        receipts.forEach(r => updateBalance(r.partyId, -(r.amount + (r.cashDiscount || 0)), r.date));
        purchases.forEach(p => updateBalance(p.supplierId, -p.totalAmount, p.date));
        payments.forEach(p => updateBalance(p.partyId, p.amount, p.date));
        locationTransfers.forEach(lt => {
            if (lt.transporterId && lt.transportCharges) {
                updateBalance(lt.transporterId, -lt.transportCharges, lt.date);
            }
        });

        const today = new Date();
        const outstanding: OutstandingEntry[] = [];
        balances.forEach((value, key) => {
            if (Math.abs(value.balance) > 0.01) { // Threshold to avoid floating point issues
                outstanding.push({
                    partyId: key,
                    partyName: value.name,
                    partyType: value.type,
                    amount: value.balance,
                    lastTransactionDate: value.lastTxDate,
                    daysOutstanding: value.lastTxDate === '1970-01-01' ? 0 : differenceInDays(today, parseISO(value.lastTxDate))
                });
            }
        });

        const receivables = outstanding.filter(o => o.amount > 0);
        const payables = outstanding.filter(o => o.amount < 0);
        const totalReceivable = receivables.reduce((sum, item) => sum + item.amount, 0);
        const totalPayable = payables.reduce((sum, item) => sum + item.amount, 0);

        return { receivables, payables, totalReceivable, totalPayable };

  }, [hydrated, purchases, sales, receipts, payments, locationTransfers, customers, suppliers, agents, transporters, brokers]);
  
  if(!hydrated) return <div className="flex justify-center items-center h-full"><Card><CardHeader><CardTitle>Loading Outstanding Balances...</CardTitle></CardHeader><CardContent><div className="space-y-2"><div className="h-4 bg-muted rounded w-3/4"></div><div className="h-4 bg-muted rounded w-1/2"></div></div></CardContent></Card></div>;

  return (
    <div className="space-y-6 print-area">
        <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
            <h1 className="text-3xl font-bold text-foreground">Outstanding Balances</h1>
            <Button variant="outline" size="icon" onClick={() => window.print()}> <Printer className="h-5 w-5" /> <span className="sr-only">Print</span></Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-green-50 dark:bg-green-900/30 border-green-500/50">
                <CardHeader>
                    <CardTitle className="text-green-700 dark:text-green-300">Total Receivables</CardTitle>
                    <CardDescription>Total money to be collected from all parties.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">₹{totalReceivable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                </CardContent>
            </Card>
             <Card className="bg-red-50 dark:bg-red-900/30 border-red-500/50">
                <CardHeader>
                    <CardTitle className="text-red-700 dark:text-red-300">Total Payables</CardTitle>
                    <CardDescription>Total money to be paid out to all parties.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">₹{Math.abs(totalPayable).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OutstandingTable title="Receivables (To Collect)" data={receivables} type="receivable" />
            <OutstandingTable title="Payables (To Pay)" data={payables} type="payable" />
        </div>
    </div>
  )
}
