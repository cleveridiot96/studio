
"use client";
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { DaybookEntry, MasterItem, Purchase, Sale, Payment, Receipt, LocationTransfer, LedgerEntry } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Printer, ShoppingCart, Receipt as ReceiptIcon, ArrowRightCircle, ArrowLeftCircle, ArrowRightLeft, FileText, BookMarked } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useRouter } from 'next/navigation';
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';

const keys = {
  purchases: 'purchasesData',
  sales: 'salesData',
  receipts: 'receiptsData',
  payments: 'paymentsData',
  locationTransfers: 'locationTransfersData',
  ledger: 'ledgerData',
};

const typeToIconMap: Record<DaybookEntry['type'], React.ElementType> = {
    Purchase: ShoppingCart,
    Sale: ReceiptIcon,
    Payment: ArrowRightCircle,
    Receipt: ArrowLeftCircle,
    Transfer: ArrowRightLeft,
    Expense: FileText,
};
const typeToColorMap: Record<DaybookEntry['type'], string> = {
    Purchase: 'text-purple-600',
    Sale: 'text-blue-600',
    Payment: 'text-red-600',
    Receipt: 'text-green-600',
    Transfer: 'text-cyan-600',
    Expense: 'text-orange-600',
};


export function DaybookClient() {
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  const { financialYear, isAppHydrating } = useSettings();

  // Data states
  const [purchases] = useLocalStorageState<Purchase[]>(keys.purchases, []);
  const [sales] = useLocalStorageState<Sale[]>(keys.sales, []);
  const [receipts] = useLocalStorageState<Receipt[]>(keys.receipts, []);
  const [payments] = useLocalStorageState<Payment[]>(keys.payments, []);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(keys.locationTransfers, []);
  const [ledgerData] = useLocalStorageState<LedgerEntry[]>(keys.ledger, []);

  // Filter and sort states
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedType, setSelectedType] = useState<string>('All');
  const [sortKey, setSortKey] = useState<keyof DaybookEntry>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setHydrated(true);
    if (!dateRange) {
        const today = new Date();
        setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
    }
  }, [dateRange]);

  const allDaybookEntries = useMemo((): DaybookEntry[] => {
    if (!hydrated) return [];
    
    const entries: DaybookEntry[] = [];

    purchases.forEach(p => entries.push({
      id: `pur-${p.id}`, date: p.date, type: 'Purchase', voucherNo: p.id.slice(-6).toUpperCase(),
      party: p.supplierName || 'Unknown', debit: p.totalAmount, credit: 0,
      narration: `Purchase of ${p.items.map(i=>i.lotNumber).join(', ')}`, href: '/purchases',
      Icon: typeToIconMap['Purchase'], colorClass: typeToColorMap['Purchase'],
    }));

    sales.forEach(s => entries.push({
      id: `sal-${s.id}`, date: s.date, type: 'Sale', voucherNo: s.billNumber || s.id.slice(-6).toUpperCase(),
      party: s.customerName || 'Unknown', debit: 0, credit: s.billedAmount,
      narration: `Sale of ${s.items.map(i=>i.lotNumber).join(', ')}`, href: '/sales',
      Icon: typeToIconMap['Sale'], colorClass: typeToColorMap['Sale'],
    }));

    payments.forEach(p => entries.push({
      id: `pay-${p.id}`, date: p.date, type: 'Payment', voucherNo: p.id.slice(-6).toUpperCase(),
      party: p.partyName || 'Unknown', debit: 0, credit: p.amount,
      narration: `Payment via ${p.paymentMethod}`, href: '/payments',
      Icon: typeToIconMap['Payment'], colorClass: typeToColorMap['Payment'],
    }));

    receipts.forEach(r => entries.push({
      id: `rec-${r.id}`, date: r.date, type: 'Receipt', voucherNo: r.id.slice(-6).toUpperCase(),
      party: r.partyName || 'Unknown', debit: r.amount, credit: 0,
      narration: `Receipt via ${r.paymentMethod}`, href: '/receipts',
      Icon: typeToIconMap['Receipt'], colorClass: typeToColorMap['Receipt'],
    }));

    locationTransfers.forEach(t => entries.push({
      id: `trn-${t.id}`, date: t.date, type: 'Transfer', voucherNo: t.id.slice(-6).toUpperCase(),
      party: 'Internal Transfer', debit: 0, credit: 0,
      narration: `From ${t.fromWarehouseName} to ${t.toWarehouseName}`, href: '/location-transfer',
      Icon: typeToIconMap['Transfer'], colorClass: typeToColorMap['Transfer'],
    }));
    
    ledgerData.filter(l => l.type === 'Expense').forEach(l => entries.push({
        id: `exp-${l.id}`, date: l.date, type: 'Expense', voucherNo: l.relatedVoucher?.slice(-6).toUpperCase() || 'N/A',
        party: l.party || 'Self', debit: l.debit, credit: l.credit,
        narration: `Expense: ${l.account}`, href: l.linkedTo?.voucherType === 'Transfer' ? '/location-transfer' : l.linkedTo?.voucherType === 'Purchase' ? '/purchases' : '/sales',
        Icon: typeToIconMap['Expense'], colorClass: typeToColorMap['Expense'],
    }));

    return entries.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [hydrated, purchases, sales, payments, receipts, locationTransfers, ledgerData]);

  const filteredEntries = useMemo(() => {
    let filtered = allDaybookEntries;

    if (dateRange?.from) {
        const toDate = dateRange.to || dateRange.from;
        filtered = filtered.filter(entry => isWithinInterval(parseISO(entry.date), { start: dateRange.from!, end: toDate }));
    }

    if (selectedType !== 'All') {
        filtered = filtered.filter(entry => entry.type === selectedType);
    }
    
    // Sort
    return filtered.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        const direction = sortDirection === 'asc' ? 1 : -1;

        if (sortKey === 'date') {
            return (parseISO(valA as string).getTime() - parseISO(valB as string).getTime()) * direction;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB) * direction;
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
            return (valA - valB) * direction;
        }
        return 0;
    });

  }, [allDaybookEntries, dateRange, selectedType, sortKey, sortDirection]);
  
  const handleSort = (key: keyof DaybookEntry) => {
      setSortKey(key);
      setSortDirection(prev => sortKey === key && prev === 'desc' ? 'asc' : 'desc');
  };
  
  const SortIcon = ({ columnKey }: { columnKey: keyof DaybookEntry }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30 inline-block" />;
    return <span className="ml-1 text-xs">{sortDirection === 'desc' ? '▼' : '▲'}</span>;
  };

  if (!hydrated || isAppHydrating) {
      return <div>Loading Daybook...</div>;
  }

  return (
    <div className="space-y-4 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <CardTitle className="text-2xl flex items-center gap-3">
                    <BookMarked className="h-7 w-7 text-primary"/> Daybook / Journal
                </CardTitle>
                <CardDescription>A chronological view of all business transactions.</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={() => window.print()} className="no-print"><Printer className="h-5 w-5"/></Button>
          </div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col md:flex-row gap-2 mb-4 p-2 border rounded-md no-print">
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filter by Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Types</SelectItem>
                        <SelectItem value="Purchase">Purchase</SelectItem>
                        <SelectItem value="Sale">Sale</SelectItem>
                        <SelectItem value="Payment">Payment</SelectItem>
                        <SelectItem value="Receipt">Receipt</SelectItem>
                        <SelectItem value="Transfer">Transfer</SelectItem>
                        <SelectItem value="Expense">Expense</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <ScrollArea className="h-[65vh]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead onClick={() => handleSort('date')} className="cursor-pointer">Date <SortIcon columnKey="date"/></TableHead>
                            <TableHead onClick={() => handleSort('type')} className="cursor-pointer">Type <SortIcon columnKey="type"/></TableHead>
                            <TableHead>Voucher No.</TableHead>
                            <TableHead onClick={() => handleSort('party')} className="cursor-pointer">Party <SortIcon columnKey="party"/></TableHead>
                            <TableHead className="text-right cursor-pointer" onClick={() => handleSort('debit')}>Debit (₹) <SortIcon columnKey="debit"/></TableHead>
                            <TableHead className="text-right cursor-pointer" onClick={() => handleSort('credit')}>Credit (₹) <SortIcon columnKey="credit"/></TableHead>
                            <TableHead>Narration</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredEntries.map(entry => (
                            <TableRow key={entry.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(entry.href)}>
                                <TableCell>{format(parseISO(entry.date), 'dd/MM/yy')}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn("uppercase border-current", entry.colorClass)}>
                                        <entry.Icon className={cn("mr-1.5 h-3.5 w-3.5", entry.colorClass)}/>
                                        {entry.type}
                                    </Badge>
                                </TableCell>
                                <TableCell>{entry.voucherNo}</TableCell>
                                <TableCell>{entry.party}</TableCell>
                                <TableCell className="text-right font-mono">{entry.debit > 0 ? entry.debit.toLocaleString('en-IN') : '-'}</TableCell>
                                <TableCell className="text-right font-mono">{entry.credit > 0 ? entry.credit.toLocaleString('en-IN') : '-'}</TableCell>
                                <TableCell className="truncate max-w-xs">{entry.narration}</TableCell>
                            </TableRow>
                        ))}
                         {filteredEntries.length === 0 && (
                            <TableRow><TableCell colSpan={7} className="text-center h-24">No transactions found for the selected filters.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
