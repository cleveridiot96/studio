
"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, PurchaseReturn, SaleReturn } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Printer } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, parseISO, addDays, subMonths, subYears, startOfDay, endOfDay, isWithinInterval, isBefore } from 'date-fns';
import { useRouter } from 'next/navigation';
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  id: string; // This will be the invoice ID (purchase or sale id)
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
                try {
                  if (sortKey === 'date' || sortKey === 'dueDate') {
                    const dateA = parseISO(valA).getTime();
                    const dateB = parseISO(valB).getTime();
                    return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
                  }
                } catch (e) { /* fall through to string compare */ }
                return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                 return sortDirection === 'asc' ? valA - valB : valB - valA;
            }
            return 0;
        });
    }, [data, sortKey, sortDirection]);

    const handleSort = (key: SortKey) => {
        setSortKey(key);
        setSortDirection(prev => (sortKey === key && prev === 'desc') ? 'asc' : 'desc');
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
                                <TableHead onClick={() => handleSort('vakkal')} className="cursor-pointer">Voucher # <SortIcon columnKey="vakkal" /></TableHead>
                                <TableHead onClick={() => handleSort('balance')} className="cursor-pointer text-right">Balance <SortIcon columnKey="balance" /></TableHead>
                                <TableHead onClick={() => handleSort('dueDate')} className="cursor-pointer">Due Date <SortIcon columnKey="dueDate" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedData.map(item => (
                                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50 uppercase" onClick={() => router.push(`/accounts-ledger?partyId=${item.partyId}`)}>
                                    <TableCell className="font-medium">{item.partyName}</TableCell>
                                    <TableCell>{item.vakkal}</TableCell>
                                    <TableCell className="font-bold text-right">₹{item.balance.toLocaleString('en-IN')}</TableCell>
                                    <TableCell>{format(parseISO(item.dueDate), 'dd/MM/yy')}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

export function OutstandingClient() {
  const [hydrated, setHydrated] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { financialYear: currentFinancialYearString } = useSettings();

  useEffect(() => { setHydrated(true) }, []);

  useEffect(() => {
    if (hydrated && !dateRange) {
        const [startYearStr] = currentFinancialYearString.split('-');
        const startYear = parseInt(startYearStr, 10);
        if (!isNaN(startYear)) {
          setDateRange({ from: new Date(startYear, 3, 1), to: endOfDay(new Date(startYear + 1, 2, 31)) });
        }
    }
  }, [hydrated, currentFinancialYearString, dateRange]);

  const [purchases] = useLocalStorageState<Purchase[]>(keys.purchases, [], purchaseMigrator);
  const [sales] = useLocalStorageState<Sale[]>(keys.sales, [], salesMigrator);
  const [receipts] = useLocalStorageState<Receipt[]>(keys.receipts, []);
  const [payments] = useLocalStorageState<Payment[]>(keys.payments, []);
  
  const [customers] = useLocalStorageState<MasterItem[]>(keys.customers, []);
  const [suppliers] = useLocalStorageState<MasterItem[]>(keys.suppliers, []);
  const [agents] = useLocalStorageState<MasterItem[]>(keys.agents, []);
  const [brokers] = useLocalStorageState<MasterItem[]>(keys.brokers, []);

  const allMasters = useMemo(() => [...customers, ...suppliers, ...agents, ...brokers], [customers, suppliers, agents, brokers]);
  
  const { receivables, payables, totalReceivable, totalPayable, netOutstanding } = useMemo(() => {
    if (!hydrated || !dateRange?.from) return { receivables: [], payables: [], totalReceivable: 0, totalPayable: 0, netOutstanding: 0 };
    
    const allInvoices = [...sales, ...purchases];
    const allSettlements = [...receipts, ...payments];
    const outstandingTransactions: OutstandingTransaction[] = [];

    allInvoices.forEach(invoice => {
        if (!isWithinInterval(parseISO(invoice.date), { start: dateRange.from!, end: dateRange.to || dateRange.from! })) return;

        let totalPaidForInvoice = 0;
        allSettlements.forEach(settlement => {
            if (settlement.againstBills) {
                settlement.againstBills.forEach(bill => {
                    if (bill.billId === invoice.id) {
                        totalPaidForInvoice += bill.amount;
                    }
                });
            }
        });
        
        const invoiceTotal = 'billedAmount' in invoice ? invoice.billedAmount : invoice.totalAmount;
        const balance = invoiceTotal - totalPaidForInvoice;

        if (balance > 0.01) {
             const partyId = 'customerId' in invoice ? (invoice.brokerId || invoice.customerId) : (invoice.agentId || invoice.supplierId);
             const party = allMasters.find(m => m.id === partyId);
             const dueDate = addDays(parseISO(invoice.date), 30);

             outstandingTransactions.push({
                 id: invoice.id,
                 partyId: partyId!,
                 partyName: party?.name || 'Unknown',
                 partyType: party?.type || 'Unknown',
                 type: 'billedAmount' in invoice ? 'Sale' : 'Purchase',
                 vakkal: 'billNumber' in invoice ? invoice.billNumber || invoice.id.slice(-5) : invoice.items.map(i => i.lotNumber).join(', '),
                 date: invoice.date,
                 dueDate: format(dueDate, 'yyyy-MM-dd'),
                 amount: invoiceTotal,
                 paid: totalPaidForInvoice,
                 balance,
             });
        }
    });
    
    const receivablesList = outstandingTransactions.filter(t => t.type === 'Sale');
    const payablesList = outstandingTransactions.filter(t => t.type === 'Purchase');
    
    const totalReceivable = receivablesList.reduce((sum, item) => sum + item.balance, 0);
    const totalPayable = payablesList.reduce((sum, item) => sum + item.balance, 0);

    return { 
        receivables: receivablesList, payables: payablesList, 
        totalReceivable, totalPayable,
        netOutstanding: totalReceivable - totalPayable
    };
  }, [hydrated, purchases, sales, receipts, payments, allMasters, dateRange]);
  
  const partyOptions = useMemo(() => {
    const partiesWithBalance = new Set([...receivables, ...payables].map(tx => tx.partyId));
    return allMasters
        .filter(m => partiesWithBalance.has(m.id))
        .map(m => ({ value: m.id, label: `${m.name} (${m.type})` }))
        .sort((a,b) => a.label.localeCompare(b.label));
  }, [receivables, payables, allMasters]);

  const filteredData = useMemo(() => {
    let combinedReceivables = receivables;
    let combinedPayables = payables;

    if (selectedPartyId) {
        combinedReceivables = combinedReceivables.filter(item => item.partyId === selectedPartyId);
        combinedPayables = combinedPayables.filter(item => item.partyId === selectedPartyId);
    }
    return { receivables: combinedReceivables, payables: combinedPayables };
  }, [receivables, payables, selectedPartyId]);

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
    <div className="space-y-4 print-area p-4 flex flex-col h-full">
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

            <div className="flex flex-col md:flex-row justify-between items-center my-4 gap-2">
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
                    <Button variant="outline" size="icon" onClick={() => window.print()} title="Print"><Printer className="h-5 w-5" /></Button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-grow">
            <OutstandingTable data={filteredData.receivables} title="Receivables (Sales)" themeColor="green" />
            <OutstandingTable data={filteredData.payables} title="Payables (Purchases)" themeColor="orange" />
        </div>
    </div>
  )
}
