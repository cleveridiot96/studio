
"use client";
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, PurchaseReturn, SaleReturn } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Printer } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, differenceInDays, parseISO, addDays, subMonths, subYears, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { useRouter } from 'next/navigation';
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { purchaseMigrator, salesMigrator } from '@/lib/dataMigrators';
import { useSettings } from "@/contexts/SettingsContext";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { MasterDataCombobox } from '@/components/shared/MasterDataCombobox';

const keys = {
  purchases: 'purchasesData',
  sales: 'salesData',
  receipts: 'receiptsData',
  payments: 'paymentsData',
  purchaseReturns: 'purchaseReturnsData',
  saleReturns: 'saleReturnsData',
  customers: 'masterCustomers',
  suppliers: 'masterSuppliers',
  agents: 'masterAgents',
  transporters: 'masterTransporters',
  brokers: 'masterBrokers',
  expenses: 'masterExpenses',
};

interface OutstandingTransaction {
  id: string;
  partyId: string;
  partyName: string;
  partyType: string;
  type: 'Sale' | 'Purchase';
  vakkal: string;
  date: string;
  dueDate: string;
  amount: number;
  paid: number;
  balance: number;
  status: 'Paid' | 'Partially Paid' | 'Pending' | 'Overdue';
}

type SortKey = keyof OutstandingTransaction;
type SortDirection = 'asc' | 'desc';

const OutstandingTable = ({ data, title, themeColor }: { data: OutstandingTransaction[]; title: string; themeColor: 'green' | 'orange' }) => {
    const [sortKey, setSortKey] = useState<SortKey>('dueDate');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const router = useRouter();

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                 return sortDirection === 'asc' ? valA - valB : valB - valA;
            }
            return 0;
        });
    }, [data, sortKey, sortDirection]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };
    
    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortKey !== columnKey) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30 inline-block" />;
        return <span className="ml-1 text-xs">{sortDirection === 'desc' ? '▼' : '▲'}</span>;
    };

    return (
        <Card className={`flex flex-col flex-grow shadow-md border-2 ${themeColor === 'green' ? 'border-green-200 bg-green-50/30' : 'border-orange-200 bg-orange-50/30'}`}>
            <CardHeader>
                <CardTitle className={`text-xl font-semibold ${themeColor === 'green' ? 'text-green-700' : 'text-orange-700'}`}>{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-grow">
                <ScrollArea className="h-[60vh]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead onClick={() => handleSort('partyName')} className="cursor-pointer">Party <SortIcon columnKey="partyName" /></TableHead>
                                <TableHead onClick={() => handleSort('vakkal')} className="cursor-pointer">Vakkal No. <SortIcon columnKey="vakkal" /></TableHead>
                                <TableHead onClick={() => handleSort('balance')} className="cursor-pointer text-right">Balance <SortIcon columnKey="balance" /></TableHead>
                                <TableHead onClick={() => handleSort('dueDate')} className="cursor-pointer">Due Date <SortIcon columnKey="dueDate" /></TableHead>
                                <TableHead onClick={() => handleSort('status')} className="cursor-pointer">Status <SortIcon columnKey="status" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedData.map(item => (
                                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/accounts-ledger?partyId=${item.partyId}`)}>
                                    <TableCell className="font-medium">{item.partyName}</TableCell>
                                    <TableCell>{item.vakkal}</TableCell>
                                    <TableCell className="font-bold text-right">₹{item.balance.toLocaleString('en-IN')}</TableCell>
                                    <TableCell>{format(parseISO(item.dueDate), 'dd MMM yyyy')}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn({
                                            'bg-green-100 text-green-800 border-green-300': item.status === 'Paid',
                                            'bg-yellow-100 text-yellow-800 border-yellow-300': item.status === 'Partially Paid' || item.status === 'Pending',
                                            'bg-red-100 text-red-800 border-red-300': item.status === 'Overdue',
                                        })}>
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

export function OutstandingClient() {
  const [hydrated, setHydrated] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState<string | undefined>();
  const [filterType, setFilterType] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { financialYear: currentFinancialYearString } = useSettings();

  useEffect(() => { setHydrated(true) }, []);

  useEffect(() => {
    if (hydrated && !dateRange) {
        const [startYearStr] = currentFinancialYearString.split('-');
        const startYear = parseInt(startYearStr, 10);
        if (!isNaN(startYear)) {
          setDateRange({ from: new Date(startYear, 3, 1), to: endOfDay(new Date(startYear + 1, 2, 31)) });
        } else {
          setDateRange({ from: startOfDay(subMonths(new Date(), 1)), to: endOfDay(new Date()) });
        }
    }
  }, [hydrated, currentFinancialYearString, dateRange]);

  const [purchases] = useLocalStorageState<Purchase[]>(keys.purchases, [], purchaseMigrator);
  const [sales] = useLocalStorageState<Sale[]>(keys.sales, [], salesMigrator);
  const [receipts] = useLocalStorageState<Receipt[]>(keys.receipts, []);
  const [payments] = useLocalStorageState<Payment[]>(keys.payments, []);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(keys.purchaseReturns, []);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(keys.saleReturns, []);
  
  const [customers] = useLocalStorageState<MasterItem[]>(keys.customers, []);
  const [suppliers] = useLocalStorageState<MasterItem[]>(keys.suppliers, []);
  const [agents] = useLocalStorageState<MasterItem[]>(keys.agents, []);
  const [brokers] = useLocalStorageState<MasterItem[]>(keys.brokers, []);

  const allMasters = useMemo(() => [...customers, ...suppliers, ...agents, ...brokers], [customers, suppliers, agents, brokers]);
  
  const { receivables, payables, totalReceivable, totalPayable, netOutstanding } = useMemo(() => {
    if (!hydrated || !dateRange?.from) return { receivables: [], payables: [], totalReceivable: 0, totalPayable: 0, netOutstanding: 0 };
    
    const paymentPools = new Map<string, number>();
    receipts.forEach(r => paymentPools.set(r.partyId, (paymentPools.get(r.partyId) || 0) + r.amount + (r.cashDiscount || 0)));
    payments.forEach(p => paymentPools.set(p.partyId, (paymentPools.get(p.partyId) || 0) + p.amount));
    purchaseReturns.forEach(pr => {
        const p = purchases.find(p => p.id === pr.originalPurchaseId);
        if (p) {
            const partyId = p.agentId || p.supplierId;
            paymentPools.set(partyId, (paymentPools.get(partyId) || 0) + pr.returnAmount);
        }
    });
    saleReturns.forEach(sr => {
        const s = sales.find(s => s.id === sr.originalSaleId);
        if (s) {
            const partyId = s.brokerId || s.customerId;
            paymentPools.set(partyId, (paymentPools.get(partyId) || 0) + sr.returnAmount);
        }
    });

    const periodSales = sales.filter(s => s && s.date && isWithinInterval(parseISO(s.date), { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to || dateRange.from!) }));
    const periodPurchases = purchases.filter(p => p && p.date && isWithinInterval(parseISO(p.date), { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to || dateRange.from!) }));

    const processTransactions = (transactions: (Sale | Purchase)[], type: 'Sale' | 'Purchase'): OutstandingTransaction[] => {
        return transactions.map(tx => {
            const partyId = type === 'Sale' ? (tx as Sale).brokerId || (tx as Sale).customerId : (tx as Purchase).agentId || (tx as Purchase).supplierId;
            const party = allMasters.find(m => m.id === partyId);
            const amount = type === 'Sale' ? (tx as Sale).billedAmount : (tx as Purchase).totalAmount;
            
            const vakkal = (type === 'Sale' ? (tx as Sale).items.map(i => i.lotNumber) : (tx as Purchase).items.map(i => i.lotNumber)).join(', ');
            
            const paymentPool = paymentPools.get(partyId) || 0;
            const paid = Math.min(paymentPool, amount);
            const balance = amount - paid;
            
            if (paymentPool > 0) {
                paymentPools.set(partyId, paymentPool - paid);
            }
            
            const dueDate = format(addDays(parseISO(tx.date), 30), 'yyyy-MM-dd'); // Assuming 30 days due date
            const isOverdue = new Date() > parseISO(dueDate) && balance > 0;

            let status: OutstandingTransaction['status'] = 'Pending';
            if (balance <= 0.01) status = 'Paid';
            else if (paid > 0) status = 'Partially Paid';
            
            if (isOverdue && status !== 'Paid') status = 'Overdue';

            return {
                id: tx.id,
                partyId: partyId,
                partyName: party?.name || 'Unknown Party',
                partyType: party?.type || 'Unknown',
                type,
                vakkal,
                date: tx.date,
                dueDate,
                amount,
                paid,
                balance,
                status,
            };
        }).filter(tx => tx.balance > 0.01);
    };

    const receivables = processTransactions(periodSales, 'Sale');
    const payables = processTransactions(periodPurchases, 'Purchase');
    
    const totalReceivable = receivables.reduce((sum, item) => sum + item.balance, 0);
    const totalPayable = payables.reduce((sum, item) => sum + item.balance, 0);

    return { 
        receivables, 
        payables, 
        totalReceivable, 
        totalPayable,
        netOutstanding: totalReceivable - totalPayable
    };

  }, [hydrated, purchases, sales, receipts, payments, allMasters, purchaseReturns, saleReturns, dateRange]);
  
  const partyOptions = useMemo(() => {
    const partiesWithBalance = new Set([...receivables, ...payables].map(tx => tx.partyId));
    return allMasters
        .filter(m => partiesWithBalance.has(m.id))
        .map(m => ({ value: m.id, label: `${m.name} (${m.type})` }))
        .sort((a,b) => a.label.localeCompare(b.label));
  }, [receivables, payables, allMasters]);

  const filteredData = useMemo(() => {
    let combined = [];
    if (filterType === 'all') combined = [...receivables, ...payables];
    else if (filterType === 'sales') combined = receivables;
    else if (filterType === 'purchases') combined = payables;
    else if (filterType === 'overdue') combined = [...receivables, ...payables].filter(item => item.status === 'Overdue');
    else combined = [...receivables, ...payables];

    if (selectedPartyId) {
        combined = combined.filter(item => item.partyId === selectedPartyId);
    }

    return {
        receivables: combined.filter(t => t.type === 'Sale'),
        payables: combined.filter(t => t.type === 'Purchase'),
    };
  }, [receivables, payables, selectedPartyId, filterType]);

  const setDatePreset = (preset: '1m' | '3m' | '6m' | '1y') => {
    const to = endOfDay(new Date());
    let from;
    switch (preset) {
      case '1m': from = startOfDay(subMonths(to, 1)); break;
      case '3m': from = startOfDay(subMonths(to, 3)); break;
      case '6m': from = startOfDay(subMonths(to, 6)); break;
      case '1y': from = startOfDay(subYears(to, 1)); break;
    }
    setDateRange({ from, to });
  };


  if(!hydrated) return <div className="flex justify-center items-center h-full"><Card><CardHeader><CardTitle>Loading Outstanding Balances...</CardTitle></CardHeader><CardContent><div className="space-y-2"><div className="h-4 bg-muted rounded w-3/4"></div><div className="h-4 bg-muted rounded w-1/2"></div></div></CardContent></Card></div>;

  return (
    <div className="space-y-6 print-area p-4">
        <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
        
        <div className="no-print">
            <h1 className="text-3xl font-bold text-foreground mb-4">Outstanding Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base text-green-700">Total Receivables</CardTitle></CardHeader>
                <CardContent className="text-2xl text-green-600 font-bold">₹{totalReceivable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base text-orange-600">Total Payables</CardTitle></CardHeader>
                <CardContent className="text-2xl text-orange-600 font-bold">₹{totalPayable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base text-primary">Net Outstanding</CardTitle></CardHeader>
                <CardContent className="text-2xl font-bold">₹{netOutstanding.toLocaleString('en-IN', {minimumFractionDigits: 2})}</CardContent>
              </Card>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center my-4 gap-4">
                <MasterDataCombobox 
                    value={selectedPartyId}
                    onChange={(value) => setSelectedPartyId(value)}
                    options={partyOptions}
                    placeholder="Filter by Party..."
                    className="w-full md:w-1/3"
                />
                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
                     <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                     <Button variant="outline" size="sm" onClick={() => setDatePreset('1m')}>1M</Button>
                     <Button variant="outline" size="sm" onClick={() => setDatePreset('3m')}>3M</Button>
                     <Button variant="outline" size="sm" onClick={() => setDatePreset('6m')}>6M</Button>
                     <Button variant="outline" size="sm" onClick={() => setDatePreset('1y')}>1Y</Button>
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full md:w-40">
                            <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="purchases">Purchases</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => window.print()} title="Print"><Printer className="h-5 w-5" /></Button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OutstandingTable data={filteredData.receivables} title="Receivables (Sales)" themeColor="green" />
            <OutstandingTable data={filteredData.payables} title="Payables (Purchases)" themeColor="orange" />
        </div>
    </div>
  )
}
