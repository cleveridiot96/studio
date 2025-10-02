
"use client";
import React, { useMemo, useState, useEffect } from 'react';
import type { DaybookEntry, Purchase, Sale, Payment, Receipt, LocationTransfer, LedgerEntry } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, ShoppingCart, Receipt as ReceiptIcon, ArrowRightCircle, ArrowLeftCircle, ArrowRightLeft, FileText, BookMarked } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { DataTableColumnHeader } from '@/components/shared/DataTableColumnHeader';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { purchaseMigrator, salesMigrator, locationTransferMigrator } from '@/lib/dataMigrators';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';


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
  const [purchases] = useLocalStorageState<Purchase[]>(keys.purchases, [], purchaseMigrator);
  const [sales] = useLocalStorageState<Sale[]>(keys.sales, [], salesMigrator);
  const [receipts] = useLocalStorageState<Receipt[]>(keys.receipts, []);
  const [payments] = useLocalStorageState<Payment[]>(keys.payments, []);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(keys.locationTransfers, [], locationTransferMigrator);
  const [ledgerData] = useLocalStorageState<LedgerEntry[]>(keys.ledger, []);

  // Filter and sort states
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

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
      party: p.supplierName || 'UNKNOWN', debit: p.totalAmount, credit: 0,
      narration: `PURCHASE OF ${p.items.map(i=>i.lotNumber).join(', ')}`, href: `/purchases#${p.id}`,
      Icon: typeToIconMap['Purchase'], colorClass: typeToColorMap['Purchase'],
    }));

    sales.forEach(s => entries.push({
      id: `sal-${s.id}`, date: s.date, type: 'Sale', voucherNo: s.billNumber || s.id.slice(-6).toUpperCase(),
      party: s.customerName || 'UNKNOWN', debit: 0, credit: s.billedAmount,
      narration: `SALE OF ${s.items.map(i=>i.lotNumber).join(', ')}`, href: `/sales#${s.id}`,
      Icon: typeToIconMap['Sale'], colorClass: typeToColorMap['Sale'],
    }));

    payments.forEach(p => entries.push({
      id: `pay-${p.id}`, date: p.date, type: 'Payment', voucherNo: p.id.slice(-6).toUpperCase(),
      party: p.partyName || 'UNKNOWN', debit: 0, credit: p.amount,
      narration: `PAYMENT VIA ${p.paymentMethod}`, href: `/payments#${p.id}`,
      Icon: typeToIconMap['Payment'], colorClass: typeToColorMap['Payment'],
    }));

    receipts.forEach(r => entries.push({
      id: `rec-${r.id}`, date: r.date, type: 'Receipt', voucherNo: r.id.slice(-6).toUpperCase(),
      party: r.partyName || 'UNKNOWN', debit: r.amount, credit: 0,
      narration: `RECEIPT VIA ${r.paymentMethod}`, href: `/receipts#${r.id}`,
      Icon: typeToIconMap['Receipt'], colorClass: typeToColorMap['Receipt'],
    }));

    locationTransfers.forEach(t => entries.push({
      id: `trn-${t.id}`, date: t.date, type: 'Transfer', voucherNo: t.id.slice(-6).toUpperCase(),
      party: 'INTERNAL TRANSFER', debit: 0, credit: 0,
      narration: `FROM ${t.fromWarehouseName} TO ${t.toWarehouseName}`, href: `/location-transfer#${t.id}`,
      Icon: typeToIconMap['Transfer'], colorClass: typeToColorMap['Transfer'],
    }));
    
    ledgerData.filter(l => l.type === 'Expense').forEach(l => {
        let href = '/payments'; // Default fallback
        if(l.linkedTo?.voucherId) {
            if(l.linkedTo?.voucherType === 'Purchase') href = `/purchases#${l.linkedTo.voucherId}`;
            else if (l.linkedTo?.voucherType === 'Sale') href = `/sales#${l.linkedTo.voucherId}`;
            else if (l.linkedTo?.voucherType === 'Transfer') href = `/location-transfer#${l.linkedTo.voucherId}`;
        }
        
        entries.push({
            id: `exp-${l.id}`, date: l.date, type: 'Expense', voucherNo: l.relatedVoucher?.slice(-6).toUpperCase() || 'N/A',
            party: l.party || 'SELF', debit: l.debit, credit: l.credit,
            narration: `EXPENSE: ${l.account}`, href: href,
            Icon: typeToIconMap['Expense'], colorClass: typeToColorMap['Expense'],
        });
    });

    return entries.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [hydrated, purchases, sales, payments, receipts, locationTransfers, ledgerData]);

  const filteredEntries = useMemo(() => {
    let filtered = allDaybookEntries;

    if (dateRange?.from) {
        const toDate = dateRange.to || dateRange.from;
        filtered = filtered.filter(entry => entry.date && isWithinInterval(parseISO(entry.date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) }));
    }
    
    return filtered;

  }, [allDaybookEntries, dateRange]);
  
  const setDateQuickFilter = (preset: 'today' | 'yesterday' | 'dayBeforeYesterday') => {
    const today = new Date();
    let from, to;

    switch (preset) {
      case 'today':
        from = startOfDay(today);
        to = endOfDay(today);
        break;
      case 'yesterday':
        from = startOfDay(subDays(today, 1));
        to = endOfDay(subDays(today, 1));
        break;
      case 'dayBeforeYesterday':
        from = startOfDay(subDays(today, 2));
        to = endOfDay(subDays(today, 2));
        break;
    }
    setDateRange({ from, to });
  };
  
  const columns: ColumnDef<DaybookEntry>[] = useMemo(() => [
    {
        accessorKey: 'date',
        header: ({ column }) => <DataTableColumnHeader column={column} title="DATE" />,
        cell: ({ row }) => format(parseISO(row.original.date), 'dd/MM/yy'),
    },
    {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="TYPE" />,
        cell: ({ row }) => (
            <Badge variant="outline" className={cn("uppercase border-current", row.original.colorClass)}>
                <row.original.Icon className={cn("mr-1.5 h-3.5 w-3.5", row.original.colorClass)}/>
                {row.original.type}
            </Badge>
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
        accessorKey: 'voucherNo',
        header: ({ column }) => <DataTableColumnHeader column={column} title="VOUCHER NO." />,
    },
    {
        accessorKey: 'party',
        header: ({ column }) => <DataTableColumnHeader column={column} title="PARTY" />,
    },
    {
        accessorKey: 'debit',
        header: ({ column }) => <DataTableColumnHeader column={column} title="DEBIT (₹)" className="justify-end" />,
        cell: ({ row }) => (
            <div className="text-right font-mono">
                {row.original.debit > 0 ? row.original.debit.toLocaleString('en-IN') : '-'}
            </div>
        )
    },
    {
        accessorKey: 'credit',
        header: ({ column }) => <DataTableColumnHeader column={column} title="CREDIT (₹)" className="justify-end" />,
        cell: ({ row }) => (
            <div className="text-right font-mono">
                {row.original.credit > 0 ? row.original.credit.toLocaleString('en-IN') : '-'}
            </div>
        )
    },
    {
        accessorKey: 'narration',
        header: "NARRATION",
        cell: ({ row }) => <div className="whitespace-normal break-words">{row.original.narration}</div>
    }
  ], []);

  if (!hydrated || isAppHydrating) {
      return <div>Loading Daybook...</div>;
  }

  return (
    <div className="space-y-2 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
                <CardTitle className="text-2xl flex items-center gap-3">
                    <BookMarked className="h-7 w-7 text-primary"/> DAYBOOK / JOURNAL
                </CardTitle>
                <CardDescription>A CHRONOLOGICAL VIEW OF ALL BUSINESS TRANSACTIONS.</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={() => window.print()} className="no-print"><Printer className="h-5 w-5"/></Button>
          </div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col md:flex-row gap-2 mb-2 p-2 border rounded-md no-print items-center flex-wrap">
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                 <div className="flex gap-1 ml-auto">
                    <Button variant="outline" size="sm" onClick={() => setDateQuickFilter('today')}>TODAY</Button>
                    <Button variant="outline" size="sm" onClick={() => setDateQuickFilter('yesterday')}>YESTERDAY</Button>
                    <Button variant="outline" size="sm" onClick={() => setDateQuickFilter('dayBeforeYesterday')}>
                        {format(subDays(new Date(), 2), 'EEEE').toUpperCase()}
                    </Button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={filteredEntries}
                onRowClick={(row) => router.push(row.href)}
                initialState={{
                    sorting: [{ id: 'date', desc: true }]
                }}
            />
        </CardContent>
      </Card>
    </div>
  )
}
