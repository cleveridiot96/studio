
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Payment, Receipt } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { addDays, format, parseISO, startOfDay, endOfDay, eachDayOfInterval, isWithinInterval } from "date-fns";
import { BookOpen, TrendingUp, TrendingDown } from "lucide-react";

const PAYMENTS_STORAGE_KEY = 'paymentsData';
const RECEIPTS_STORAGE_KEY = 'receiptsData';

interface CashBookTransaction {
  date: string; // YYYY-MM-DD
  type: 'Receipt' | 'Payment';
  particulars: string;
  amount: number;
  id: string;
}

interface DailyCashBookEntry {
  date: string; // YYYY-MM-DD
  receipts: CashBookTransaction[];
  payments: CashBookTransaction[];
  openingBalance: number;
  closingBalance: number;
  totalReceipts: number;
  totalPayments: number;
}

export function CashbookClient() {
  const memoizedInitialPayments = React.useMemo(() => [], []);
  const memoizedInitialReceipts = React.useMemo(() => [], []);

  const [payments] = useLocalStorageState<Payment[]>(PAYMENTS_STORAGE_KEY, memoizedInitialPayments);
  const [receipts] = useLocalStorageState<Receipt[]>(RECEIPTS_STORAGE_KEY, memoizedInitialReceipts);
  
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
    // Set initial date range on client side after hydration
    setDateRange({
        from: startOfDay(addDays(new Date(), -7)),
        to: endOfDay(new Date()),
    });
  }, []);


  const allTransactions = React.useMemo(() => {
    const combined: CashBookTransaction[] = [];
    receipts.forEach(r => combined.push({
      id: `rec-${r.id}`,
      date: r.date,
      type: 'Receipt',
      particulars: `From ${r.partyName || r.partyId} (${r.partyType}) ${r.referenceNo ? `- Ref: ${r.referenceNo}` : ''}`,
      amount: r.amount
    }));
    payments.forEach(p => combined.push({
      id: `pay-${p.id}`,
      date: p.date,
      type: 'Payment',
      particulars: `To ${p.partyName || p.partyId} (${p.partyType}) ${p.referenceNo ? `- Ref: ${p.referenceNo}` : ''}`,
      amount: p.amount
    }));
    return combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [payments, receipts]);

  const dailyCashbookData = React.useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
        return { dailyEntries: [], overallOpeningBalance: 0, finalClosingBalance: 0 };
    }

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    let runningBalance = 0;

    // Calculate opening balance before the start of the date range
    allTransactions.forEach(t => {
      if (new Date(t.date) < startOfDay(dateRange.from!)) {
        runningBalance += (t.type === 'Receipt' ? t.amount : -t.amount);
      }
    });
    const overallOpeningBalance = runningBalance;


    const dailyEntries: DailyCashBookEntry[] = days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const openingBalanceForDay = runningBalance;

      const dayReceipts = allTransactions.filter(t => t.date === dayStr && t.type === 'Receipt');
      const dayPayments = allTransactions.filter(t => t.date === dayStr && t.type === 'Payment');
      
      const totalDayReceipts = dayReceipts.reduce((sum, r) => sum + r.amount, 0);
      const totalDayPayments = dayPayments.reduce((sum, p) => sum + p.amount, 0);

      runningBalance += totalDayReceipts - totalDayPayments;
      
      return {
        date: dayStr,
        receipts: dayReceipts,
        payments: dayPayments,
        openingBalance: openingBalanceForDay,
        closingBalance: runningBalance,
        totalReceipts: totalDayReceipts,
        totalPayments: totalDayPayments,
      };
    });
    return { dailyEntries, overallOpeningBalance, finalClosingBalance: runningBalance };
  }, [allTransactions, dateRange]);

  if (!hydrated) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <p className="text-lg text-muted-foreground">Loading cashbook data...</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cash Book</h1>
        </div>
        <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="max-w-sm" />
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center"><BookOpen className="mr-3 h-7 w-7"/>Daily Cash Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 border rounded-md bg-muted/50">
            <div className="flex justify-between text-sm font-medium">
                <span>Opening Balance for Period:</span>
                <span>{dailyCashbookData?.overallOpeningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          <ScrollArea className="h-[60vh] rounded-md border p-1">
            {dailyCashbookData?.dailyEntries.length === 0 && (
                 <div className="flex items-center justify-center h-full text-muted-foreground">
                    No cash transactions in the selected period.
                </div>
            )}
            {dailyCashbookData?.dailyEntries.map((dayEntry, index) => (
              <div key={dayEntry.date} className={`mb-4 p-4 rounded-md ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                <h3 className="text-lg font-semibold mb-2 border-b pb-1">
                  Date: {format(parseISO(dayEntry.date), "PPP")}
                  <span className="text-xs ml-2 text-muted-foreground">(OB: {dayEntry.openingBalance.toFixed(2)})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  {/* Receipts Side (Dr) */}
                  <div className="pr-3">
                    <h4 className="text-md font-medium text-green-600 mb-1 flex items-center"><TrendingUp className="h-5 w-5 mr-2"/>Receipts (Inflow)</h4>
                    {dayEntry.receipts.length > 0 ? (
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Particulars</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dayEntry.receipts.map(r => (
                            <TableRow key={r.id}>
                              <TableCell className="truncate max-w-[200px]">{r.particulars}</TableCell>
                              <TableCell className="text-right">{r.amount.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                           <TableRow className="font-semibold bg-green-50 dark:bg-green-900/20">
                                <TableCell>Total Receipts</TableCell>
                                <TableCell className="text-right">{dayEntry.totalReceipts.toFixed(2)}</TableCell>
                            </TableRow>
                        </TableBody>
                      </Table>
                    ) : (<p className="text-xs text-muted-foreground py-2">No receipts.</p>)}
                  </div>
                  {/* Payments Side (Cr) */}
                  <div className="pl-3 md:border-l">
                    <h4 className="text-md font-medium text-red-600 mb-1 flex items-center"><TrendingDown className="h-5 w-5 mr-2"/>Payments (Outflow)</h4>
                     {dayEntry.payments.length > 0 ? (
                      <Table className="text-xs">
                         <TableHeader>
                          <TableRow>
                            <TableHead>Particulars</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dayEntry.payments.map(p => (
                            <TableRow key={p.id}>
                              <TableCell className="truncate max-w-[200px]">{p.particulars}</TableCell>
                              <TableCell className="text-right">{p.amount.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold bg-red-50 dark:bg-red-900/20">
                                <TableCell>Total Payments</TableCell>
                                <TableCell className="text-right">{dayEntry.totalPayments.toFixed(2)}</TableCell>
                            </TableRow>
                        </TableBody>
                      </Table>
                    ) : (<p className="text-xs text-muted-foreground py-2">No payments.</p>)}
                  </div>
                </div>
                 <div className="mt-2 pt-2 border-t text-sm font-semibold text-right">
                    Closing Balance for Day: {dayEntry.closingBalance.toFixed(2)}
                </div>
              </div>
            ))}
          </ScrollArea>
           <CardFooter className="mt-4 pt-4 border-t">
            <div className="w-full flex justify-between text-lg font-bold text-primary">
                <span>Final Closing Balance for Period:</span>
                <span>{dailyCashbookData?.finalClosingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </CardFooter>
        </CardContent>
      </Card>
    </div>
  );
}
