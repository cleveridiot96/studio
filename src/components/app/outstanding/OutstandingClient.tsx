
"use client";
import React, { useMemo, useState } from 'react';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, LocationTransfer } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowRight, Printer, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
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

const OutstandingTable = ({ data }: { data: OutstandingEntry[] }) => {
    const [sortKey, setSortKey] = useState<SortKey>('daysOutstanding');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const router = useRouter();

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            if (sortKey === 'partyName') return sortDirection === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
            return sortDirection === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
        });
    }, [data, sortKey, sortDirection]);

    const handleSort = (key: SortKey) => {
        setSortKey(key);
        setSortDirection(prev => (sortKey === key && prev === 'desc') ? 'asc' : 'desc');
    };
    
    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortKey !== columnKey) return <ArrowUpDown className="h-4 w-4 ml-2 opacity-30 inline-block" />;
        return <span className="ml-2">{sortDirection === 'desc' ? '▼' : '▲'}</span>;
    };

    return (
        <ScrollArea className="h-[85vh]">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead onClick={() => handleSort('partyName')} className="cursor-pointer hover:bg-muted/50 w-2/5 p-1">
                            Party Name <SortIcon columnKey="partyName" />
                        </TableHead>
                        <TableHead onClick={() => handleSort('amount')} className="cursor-pointer hover:bg-muted/50 text-right p-1">
                            Amount Due <SortIcon columnKey="amount" />
                        </TableHead>
                        <TableHead onClick={() => handleSort('daysOutstanding')} className="cursor-pointer hover:bg-muted/50 text-right p-1">
                            Days Out <SortIcon columnKey="daysOutstanding" />
                        </TableHead>
                        <TableHead className="text-center w-[80px] p-1">Ledger</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedData.map(item => (
                        <TableRow key={item.partyId} className="cursor-pointer hover:bg-muted/20" onClick={() => router.push(`/accounts-ledger?partyId=${item.partyId}`)}>
                            <TableCell className="p-1">
                                <div className="font-medium">{item.partyName}</div>
                                <div className="text-xs text-muted-foreground">{item.partyType}</div>
                            </TableCell>
                            <TableCell className="p-1 text-right font-semibold">₹{Math.abs(item.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                            <TableCell className={`p-1 text-right ${item.daysOutstanding > 30 ? 'text-destructive font-bold' : item.daysOutstanding > 7 ? 'text-orange-500' : ''}`}>
                                {item.daysOutstanding}
                            </TableCell>
                            <TableCell className="p-1 text-center">
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/accounts-ledger?partyId=${item.partyId}`)}}><ArrowRight className="h-4 w-4"/></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}

const Leaderboard = ({ title, data }: { title: string, data: OutstandingEntry[] }) => {
    const topParties = useMemo(() => data.sort((a,b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0,10), [data]);
    if (topParties.length === 0) return null;

    return (
        <Card>
            <CardHeader><CardTitle className="text-lg font-semibold">{title}</CardTitle></CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[250px]">
                    <Table>
                        <TableBody>
                            {topParties.map((party, index) => (
                                <TableRow key={party.partyId}>
                                    <TableCell className="font-bold w-8 p-1 text-center">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}</TableCell>
                                    <TableCell className="p-1">{party.partyName}</TableCell>
                                    <TableCell className="p-1 text-right font-semibold">₹{Math.abs(party.amount).toLocaleString('en-IN', {minimumFractionDigits: 0})}</TableCell>
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
  const [hydrated, setHydrated] = useState(false);
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

        // --- Corrected Logic ---
        // Sales create receivables. Accountable party is broker, fallback to customer.
        sales.forEach(s => {
            const accountablePartyId = s.brokerId || s.customerId;
            updateBalance(accountablePartyId, s.billedAmount, s.date);
        });

        // Receipts reduce receivables.
        receipts.forEach(r => {
            updateBalance(r.partyId, -(r.amount + (r.cashDiscount || 0)), r.date);
        });
        
        // Purchases create payables to supplier and agent separately.
        purchases.forEach(p => {
            const payableToSupplier = (p.totalAmount || 0) - (p.brokerageCharges || 0);
            updateBalance(p.supplierId, -payableToSupplier, p.date);
            if (p.agentId && p.brokerageCharges && p.brokerageCharges > 0) {
                updateBalance(p.agentId, -p.brokerageCharges, p.date);
            }
        });

        // Payments reduce payables.
        payments.forEach(p => {
            updateBalance(p.partyId, p.amount, p.date);
        });

        // Transport charges are also payables to the transporter.
        locationTransfers.forEach(lt => {
            if (lt.transporterId && lt.transportCharges) {
                updateBalance(lt.transporterId, -lt.transportCharges, lt.date);
            }
        });
        // --- End of Corrected Logic ---

        const today = new Date();
        const outstanding: OutstandingEntry[] = [];
        balances.forEach((value, key) => {
            if (Math.abs(value.balance) > 0.01) {
                outstanding.push({
                    partyId: key, partyName: value.name, partyType: value.type,
                    amount: value.balance, lastTransactionDate: value.lastTxDate,
                    daysOutstanding: value.lastTxDate === '1970-01-01' ? 0 : differenceInDays(today, parseISO(value.lastTxDate))
                });
            }
        });

        const receivablesData = outstanding.filter(o => o.amount > 0);
        // A broker should never be a payable party. Filter them out from this list if they appear due to advances etc.
        const payablesData = outstanding.filter(o => o.amount < 0 && o.partyType !== 'Broker');
        
        const totalReceivable = receivablesData.reduce((sum, item) => sum + item.amount, 0);
        const totalPayable = payablesData.reduce((sum, item) => sum + item.amount, 0);

        return { receivables: receivablesData, payables: payablesData, totalReceivable, totalPayable };

  }, [hydrated, purchases, sales, receipts, payments, locationTransfers, customers, suppliers, agents, transporters, brokers]);
  
  if(!hydrated) return <div className="flex justify-center items-center h-full"><Card><CardHeader><CardTitle>Loading Outstanding Balances...</CardTitle></CardHeader><CardContent><div className="space-y-2"><div className="h-4 bg-muted rounded w-3/4"></div><div className="h-4 bg-muted rounded w-1/2"></div></div></CardContent></Card></div>;

  return (
    <div className="space-y-6 print-area">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
            <h1 className="text-2xl font-bold text-foreground">
                Outstanding Dashboard
            </h1>
            <Button variant="outline" size="icon" onClick={() => window.print()} title="Print">
                <Printer className="h-5 w-5" /><span className="sr-only">Print</span>
            </Button>
        </div>
        <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-4">
                <Card className="bg-green-50 dark:bg-green-900/30 border-green-500/50">
                    <CardHeader className="py-4 px-5">
                        <CardTitle className="text-lg font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                           <ArrowDownCircle className="h-5 w-5" /> Receivables (To Collect)
                        </CardTitle>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                          ₹{totalReceivable.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0"><OutstandingTable data={receivables} /></CardContent>
                </Card>
                <Leaderboard title="📈 Top Receivables" data={receivables} />
            </div>
             <div className="space-y-4">
                <Card className="bg-red-50 dark:bg-red-900/30 border-red-500/50">
                    <CardHeader className="py-4 px-5">
                        <CardTitle className="text-lg font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                           <ArrowUpCircle className="h-5 w-5"/> Payables (To Pay)
                        </CardTitle>
                         <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                           ₹{Math.abs(totalPayable).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0"><OutstandingTable data={payables} /></CardContent>
                </Card>
                <Leaderboard title="📉 Top Payables" data={payables} />
            </div>
        </div>
    </div>
  )
}
