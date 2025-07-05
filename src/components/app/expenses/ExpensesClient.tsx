
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";
import { DollarSign, Printer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import Link from "next/link";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const PURCHASES_STORAGE_KEY = 'purchasesData';
const SALES_STORAGE_KEY = 'salesData';

interface ExpenseJournalEntry {
  id: string;
  date: string;
  type: 'Transport' | 'Packing' | 'Labour' | 'Brokerage' | 'Misc';
  partyName?: string;
  vakkalNo?: string;
  amount: number;
  linkedTxnId: string;
  linkedTxnType: 'Purchase' | 'Sale';
  href: string;
}

const EXPENSE_TYPES = ['Transport', 'Packing', 'Labour', 'Brokerage', 'Misc'];

export function ExpensesClient() {
  const [hydrated, setHydrated] = React.useState(false);
  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, []);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, []);
  
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [filterType, setFilterType] = React.useState<string>("all");

  React.useEffect(() => { setHydrated(true); }, []);

  const expenseJournal = React.useMemo(() => {
    if (!hydrated) return [];
    
    const entries: ExpenseJournalEntry[] = [];

    purchases.forEach(p => {
      if (p.transportCharges && p.transportCharges > 0) entries.push({ id: `${p.id}-transport`, date: p.date, type: 'Transport', partyName: p.supplierName, vakkalNo: p.lotNumber, amount: p.transportCharges, linkedTxnId: p.id, linkedTxnType: 'Purchase', href: `/purchases#${p.id}` });
      if (p.packingCharges && p.packingCharges > 0) entries.push({ id: `${p.id}-packing`, date: p.date, type: 'Packing', partyName: p.supplierName, vakkalNo: p.lotNumber, amount: p.packingCharges, linkedTxnId: p.id, linkedTxnType: 'Purchase', href: `/purchases#${p.id}` });
      if (p.labourCharges && p.labourCharges > 0) entries.push({ id: `${p.id}-labour`, date: p.date, type: 'Labour', partyName: p.supplierName, vakkalNo: p.lotNumber, amount: p.labourCharges, linkedTxnId: p.id, linkedTxnType: 'Purchase', href: `/purchases#${p.id}` });
      if (p.brokerageCharges && p.brokerageCharges > 0) entries.push({ id: `${p.id}-brokerage`, date: p.date, type: 'Brokerage', partyName: p.supplierName, vakkalNo: p.lotNumber, amount: p.brokerageCharges, linkedTxnId: p.id, linkedTxnType: 'Purchase', href: `/purchases#${p.id}` });
      if (p.miscExpenses && p.miscExpenses > 0) entries.push({ id: `${p.id}-misc`, date: p.date, type: 'Misc', partyName: p.supplierName, vakkalNo: p.lotNumber, amount: p.miscExpenses, linkedTxnId: p.id, linkedTxnType: 'Purchase', href: `/purchases#${p.id}` });
    });

    sales.forEach(s => {
      if (s.transportCost && s.transportCost > 0) entries.push({ id: `${s.id}-transport`, date: s.date, type: 'Transport', partyName: s.customerName, vakkalNo: s.lotNumber, amount: s.transportCost, linkedTxnId: s.id, linkedTxnType: 'Sale', href: `/sales#${s.id}` });
      if (s.packingCost && s.packingCost > 0) entries.push({ id: `${s.id}-packing`, date: s.date, type: 'Packing', partyName: s.customerName, vakkalNo: s.lotNumber, amount: s.packingCost, linkedTxnId: s.id, linkedTxnType: 'Sale', href: `/sales#${s.id}` });
      if (s.labourCost && s.labourCost > 0) entries.push({ id: `${s.id}-labour`, date: s.date, type: 'Labour', partyName: s.customerName, vakkalNo: s.lotNumber, amount: s.labourCost, linkedTxnId: s.id, linkedTxnType: 'Sale', href: `/sales#${s.id}` });
      const totalBrokerage = (s.calculatedBrokerageCommission || 0) + (s.calculatedExtraBrokerage || 0);
      if (totalBrokerage > 0) entries.push({ id: `${s.id}-brokerage`, date: s.date, type: 'Brokerage', partyName: s.brokerName, vakkalNo: s.lotNumber, amount: totalBrokerage, linkedTxnId: s.id, linkedTxnType: 'Sale', href: `/sales#${s.id}` });
    });

    return entries.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [hydrated, purchases, sales]);

  const filteredExpenses = React.useMemo(() => {
    let result = expenseJournal;
    if (dateRange?.from) {
        const toDate = dateRange.to || dateRange.from;
        result = result.filter(e => isWithinInterval(parseISO(e.date), { start: dateRange.from!, end: toDate }));
    }
    if (filterType !== 'all') {
        result = result.filter(e => e.type === filterType);
    }
    return result;
  }, [expenseJournal, dateRange, filterType]);

  const totalFilteredAmount = React.useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredExpenses]);

  if (!hydrated) {
    return <div className="flex justify-center items-center h-full"><p>Loading expenses...</p></div>;
  }

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-2xl text-primary flex items-center"><DollarSign className="mr-3 h-7 w-7"/>Expense Journal</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto no-print">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {EXPENSE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="w-full sm:w-auto" />
              <Button variant="outline" size="icon" onClick={() => window.print()} title="Print">
                <Printer className="h-5 w-5" /><span className="sr-only">Print</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[65vh] rounded-md border print:h-auto print:overflow-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Vakkal No.</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                  <TableHead className="text-center no-print">Linked Txn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No expenses found for the selected filters.</TableCell></TableRow>
                ) : (
                  filteredExpenses.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{format(parseISO(item.date), "dd-MM-yy")}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell className="truncate max-w-xs">{item.partyName || 'N/A'}</TableCell>
                      <TableCell>{item.vakkalNo || 'N/A'}</TableCell>
                      <TableCell className="text-right font-medium">{item.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                      <TableCell className="text-center no-print">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={item.href}>
                            <ArrowRight className="h-4 w-4" />
                            <span className="sr-only">View {item.linkedTxnType}</span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
         <CardFooter className="border-t pt-4 mt-4">
            <div className="w-full flex justify-end text-lg font-bold text-primary">
                <span>Total for Period:</span>
                <span className="ml-4">
                ₹{totalFilteredAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                </span>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
