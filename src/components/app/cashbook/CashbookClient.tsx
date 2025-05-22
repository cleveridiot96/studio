
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Payment, Receipt, MasterItem, MasterItemType, Customer, Supplier, Agent, Transporter, Broker } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { addDays, format, parseISO, startOfDay, endOfDay, eachDayOfInterval, isSameDay } from "date-fns";
import { BookOpen, TrendingUp, TrendingDown, CalendarDays, Printer, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { AddPaymentForm } from "@/components/app/payments/AddPaymentForm";
import { AddReceiptForm } from "@/components/app/receipts/AddReceiptForm";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext"; // Import useSettings
import { isDateInFinancialYear } from "@/lib/utils"; // Import isDateInFinancialYear

const PAYMENTS_STORAGE_KEY = 'paymentsData';
const RECEIPTS_STORAGE_KEY = 'receiptsData';
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const BROKERS_STORAGE_KEY = 'masterBrokers';

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
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings(); // Use isAppHydrating

  const memoizedEmptyTransactions = React.useMemo(() => [], []);
  const memoizedEmptyMasters = React.useMemo(() => [], []);

  const [payments, setPayments] = useLocalStorageState<Payment[]>(PAYMENTS_STORAGE_KEY, memoizedEmptyTransactions);
  const [receipts, setReceipts] = useLocalStorageState<Receipt[]>(RECEIPTS_STORAGE_KEY, memoizedEmptyTransactions);
  
  const [customers, setCustomers] = useLocalStorageState<Customer[]>(CUSTOMERS_STORAGE_KEY, memoizedEmptyMasters);
  const [suppliers, setSuppliers] = useLocalStorageState<Supplier[]>(SUPPLIERS_STORAGE_KEY, memoizedEmptyMasters);
  const [agents, setAgents] = useLocalStorageState<Agent[]>(AGENTS_STORAGE_KEY, memoizedEmptyMasters);
  const [transporters, setTransporters] = useLocalStorageState<Transporter[]>(TRANSPORTERS_STORAGE_KEY, memoizedEmptyMasters);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, memoizedEmptyMasters);

  const [historicalDateRange, setHistoricalDateRange] = React.useState<DateRange | undefined>(undefined);
  
  const [isAddPaymentFormOpen, setIsAddPaymentFormOpen] = React.useState(false);
  const [isAddReceiptFormOpen, setIsAddReceiptFormOpen] = React.useState(false);
  const [paymentToEdit, setPaymentToEdit] = React.useState<Payment | null>(null);
  const [receiptToEdit, setReceiptToEdit] = React.useState<Receipt | null>(null);


  React.useEffect(() => {
    if (!historicalDateRange && !isAppHydrating) { // Only set default if not already set and context is hydrated
      setHistoricalDateRange({
          from: startOfDay(addDays(new Date(), -7)), 
          to: endOfDay(addDays(new Date(), -1)), 
      });
    }
  }, [isAppHydrating, historicalDateRange]); 

  const allPaymentParties = React.useMemo(() => {
    if (isAppHydrating) return [];
    return [
      ...suppliers.filter(s => s.type === 'Supplier'),
      ...agents.filter(a => a.type === 'Agent'),
      ...transporters.filter(t => t.type === 'Transporter')
    ].filter(party => party && party.id && party.name && party.type)
     .sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers, agents, transporters, isAppHydrating]);

  const allReceiptParties = React.useMemo(() => {
    if (isAppHydrating) return [];
    return [
        ...customers.filter(c => c.type === 'Customer'),
        ...brokers.filter(b => b.type === 'Broker')
    ].filter(party => party && party.id && party.name && party.type)
     .sort((a,b) => a.name.localeCompare(b.name));
  }, [customers, brokers, isAppHydrating]);


  const allTransactionsForFY = React.useMemo(() => {
    if (isAppHydrating) return [];
    const combined: CashBookTransaction[] = [];
    receipts.filter(r => r && r.date && isDateInFinancialYear(r.date, financialYear))
            .forEach(r => combined.push({
                id: `rec-${r.id}`,
                date: r.date,
                type: 'Receipt',
                particulars: `From ${r.partyName || r.partyId} (${r.partyType}) ${r.referenceNo ? `- Ref: ${r.referenceNo}` : ''}`,
                amount: r.amount
            }));
    payments.filter(p => p && p.date && isDateInFinancialYear(p.date, financialYear))
            .forEach(p => combined.push({
                id: `pay-${p.id}`,
                date: p.date,
                type: 'Payment',
                particulars: `To ${p.partyName || p.partyId} (${p.partyType}) ${p.referenceNo ? `- Ref: ${p.referenceNo}` : ''}`,
                amount: p.amount
            }));
    return combined.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [payments, receipts, financialYear, isAppHydrating]);

  const todaysData = React.useMemo(() => {
    if (isAppHydrating) return { date: format(new Date(), "yyyy-MM-dd"), receipts: [], payments: [], openingBalance: 0, closingBalance: 0, totalReceipts: 0, totalPayments: 0 };
    
    const todayDateObj = startOfDay(new Date());
    const todayDateStr = format(todayDateObj, "yyyy-MM-dd");

    let openingBalanceForToday = 0;
    allTransactionsForFY.forEach(t => {
      if (parseISO(t.date) < todayDateObj) {
        openingBalanceForToday += (t.type === 'Receipt' ? t.amount : -t.amount);
      }
    });

    const todaysReceipts = allTransactionsForFY.filter(t => t.date === todayDateStr && t.type === 'Receipt');
    const todaysPayments = allTransactionsForFY.filter(t => t.date === todayDateStr && t.type === 'Payment');
    
    const totalTodaysReceipts = todaysReceipts.reduce((sum, r) => sum + r.amount, 0);
    const totalTodaysPayments = todaysPayments.reduce((sum, p) => sum + p.amount, 0);
    const closingBalanceForToday = openingBalanceForToday + totalTodaysReceipts - totalTodaysPayments;

    return {
      date: todayDateStr,
      receipts: todaysReceipts,
      payments: todaysPayments,
      openingBalance: openingBalanceForToday,
      closingBalance: closingBalanceForToday,
      totalReceipts: totalTodaysReceipts,
      totalPayments: totalTodaysPayments,
    };
  }, [allTransactionsForFY, isAppHydrating]);

  const historicalCashbookData = React.useMemo(() => {
    if (isAppHydrating || !historicalDateRange?.from || !historicalDateRange?.to) {
        return { dailyEntries: [], overallOpeningBalance: 0, finalClosingBalance: 0, flatTransactions: [] };
    }

    const days = eachDayOfInterval({ start: historicalDateRange.from, end: historicalDateRange.to });
    let runningBalance = 0;

    allTransactionsForFY.forEach(t => {
      if (parseISO(t.date) < startOfDay(historicalDateRange.from!)) {
        runningBalance += (t.type === 'Receipt' ? t.amount : -t.amount);
      }
    });
    const overallOpeningBalance = runningBalance;

    const dailyEntries: DailyCashBookEntry[] = days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const openingBalanceForDay = runningBalance;
      const dayReceipts = allTransactionsForFY.filter(t => t.date === dayStr && t.type === 'Receipt');
      const dayPayments = allTransactionsForFY.filter(t => t.date === dayStr && t.type === 'Payment');
      const totalDayReceipts = dayReceipts.reduce((sum, r) => sum + r.amount, 0);
      const totalDayPayments = dayPayments.reduce((sum, p) => sum + p.amount, 0);
      runningBalance += totalDayReceipts - totalDayPayments;
      return { date: dayStr, receipts: dayReceipts, payments: dayPayments, openingBalance: openingBalanceForDay, closingBalance: runningBalance, totalReceipts: totalDayReceipts, totalPayments: totalDayPayments };
    });

    const flatTransactions = dailyEntries.flatMap(dayEntry => 
        [
            ...dayEntry.receipts.map(r => ({ ...r, entryDate: dayEntry.date})),
            ...dayEntry.payments.map(p => ({ ...p, entryDate: dayEntry.date}))
        ]
    ).sort((a,b) => parseISO(a.entryDate).getTime() - parseISO(b.entryDate).getTime() || (a.type === 'Receipt' ? -1 : 1) );


    return { dailyEntries, overallOpeningBalance, finalClosingBalance: runningBalance, flatTransactions };
  }, [allTransactionsForFY, historicalDateRange, isAppHydrating]);

  const handleAddPaymentFromCashbook = React.useCallback((payment: Payment) => {
    setPayments(prevPayments => {
        return [{ ...payment, id: payment.id || `payment-${Date.now()}` }, ...prevPayments];
    });
    toast({ title: "Success!", description: "Payment added to cashbook and payments." });
  }, [setPayments, toast]);

  const handleAddReceiptFromCashbook = React.useCallback((receipt: Receipt) => {
    setReceipts(prevReceipts => {
        return [{ ...receipt, id: receipt.id || `receipt-${Date.now()}` }, ...prevReceipts];
    });
    toast({ title: "Success!", description: "Receipt added to cashbook and receipts." });
  }, [setReceipts, toast]);

  const handleMasterDataUpdateFromCashbook = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    switch (type) {
      case "Supplier":    setSuppliers(prev => [newItem as Supplier, ...prev.filter(i => i.id !== newItem.id)]); break;
      case "Agent":       setAgents(prev => [newItem as Agent, ...prev.filter(i => i.id !== newItem.id)]); break;
      case "Transporter": setTransporters(prev => [newItem as Transporter, ...prev.filter(i => i.id !== newItem.id)]); break;
      case "Customer":    setCustomers(prev => [newItem as Customer, ...prev.filter(i => i.id !== newItem.id)]); break;
      case "Broker":      setBrokers(prev => [newItem as Broker, ...prev.filter(i => i.id !== newItem.id)]); break;
      default: toast({title: "Info", description: `Master type ${type} not directly handled here.`}); break;
    }
  }, [setSuppliers, setAgents, setTransporters, setCustomers, setBrokers, toast]);


  if (isAppHydrating) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <p className="text-lg text-muted-foreground">Loading cashbook data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <div className="flex justify-between items-center no-print">
        <h1 className="text-3xl font-bold text-foreground">Cash Book (FY {financialYear})</h1>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setPaymentToEdit(null); setIsAddPaymentFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Cash Payment
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setReceiptToEdit(null); setIsAddReceiptFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Cash Receipt
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.print()} className="no-print">
                <Printer className="h-5 w-5" />
                <span className="sr-only">Print</span>
            </Button>
        </div>
      </div>

      {/* Today's Cashbook Section */}
      <Card className="shadow-xl border-primary/30">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center"><CalendarDays className="mr-3 h-7 w-7"/>Today&apos;s Cash Book ({format(parseISO(todaysData.date), "PPP")})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 p-2 border rounded-md bg-muted/30 text-sm">
            <strong>Opening Balance:</strong> {todaysData.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            {/* Receipts Side (Dr) */}
            <div className="pr-3">
              <h4 className="text-md font-medium text-green-600 mb-1 flex items-center"><TrendingUp className="h-5 w-5 mr-2"/>Receipts (Inflow)</h4>
              {todaysData.receipts.length > 0 ? (
                <Table className="text-xs">
                  <TableHeader><TableRow><TableHead>Particulars</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {todaysData.receipts.map(r => (
                      <TableRow key={r.id}><TableCell className="truncate max-w-[200px]">{r.particulars}</TableCell><TableCell className="text-right">{r.amount.toFixed(2)}</TableCell></TableRow>
                    ))}
                    <TableRow className="font-semibold bg-green-50 dark:bg-green-900/20"><TableCell>Total Receipts</TableCell><TableCell className="text-right">{todaysData.totalReceipts.toFixed(2)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              ) : (<p className="text-xs text-muted-foreground py-2">No receipts today.</p>)}
            </div>
            {/* Payments Side (Cr) */}
            <div className="pl-3 md:border-l">
              <h4 className="text-md font-medium text-red-600 mb-1 flex items-center"><TrendingDown className="h-5 w-5 mr-2"/>Payments (Outflow)</h4>
              {todaysData.payments.length > 0 ? (
                <Table className="text-xs">
                  <TableHeader><TableRow><TableHead>Particulars</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {todaysData.payments.map(p => (
                      <TableRow key={p.id}><TableCell className="truncate max-w-[200px]">{p.particulars}</TableCell><TableCell className="text-right">{p.amount.toFixed(2)}</TableCell></TableRow>
                    ))}
                    <TableRow className="font-semibold bg-red-50 dark:bg-red-900/20"><TableCell>Total Payments</TableCell><TableCell className="text-right">{todaysData.totalPayments.toFixed(2)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              ) : (<p className="text-xs text-muted-foreground py-2">No payments today.</p>)}
            </div>
          </div>
        </CardContent>
        <CardFooter className="mt-2 pt-3 border-t">
          <div className="w-full flex justify-end text-lg font-bold text-primary">
            <span>Today&apos;s Closing Balance:</span>
            <span className="ml-4">{todaysData.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </CardFooter>
      </Card>

      {/* Historical Transactions Section */}
      <Card className="shadow-xl">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="text-2xl text-primary flex items-center"><BookOpen className="mr-3 h-7 w-7"/>Historical Cash Transactions</CardTitle>
          <DatePickerWithRange date={historicalDateRange} onDateChange={setHistoricalDateRange} className="max-w-sm w-full md:w-auto no-print" />
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 border rounded-md bg-muted/50">
            <div className="flex justify-between text-sm font-medium">
                <span>Opening Balance for Selected Period:</span>
                <span>{historicalCashbookData?.overallOpeningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          <ScrollArea className="h-[50vh] rounded-md border print:h-auto print:overflow-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Receipt Amount (₹)</TableHead>
                  <TableHead className="text-right">Payment Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicalCashbookData?.flatTransactions.length === 0 && (
                     <TableRow><TableCell colSpan={5} className="text-center h-32 text-muted-foreground">No cash transactions in the selected period.</TableCell></TableRow>
                )}
                {historicalCashbookData?.flatTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{format(parseISO(transaction.entryDate), "dd-MM-yy")}</TableCell>
                    <TableCell className="truncate max-w-sm">{transaction.particulars}</TableCell>
                    <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${transaction.type === 'Receipt' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                            {transaction.type}
                        </span>
                    </TableCell>
                    <TableCell className="text-right">{transaction.type === 'Receipt' ? transaction.amount.toFixed(2) : '-'}</TableCell>
                    <TableCell className="text-right">{transaction.type === 'Payment' ? transaction.amount.toFixed(2) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter className="mt-4 pt-4 border-t">
            <div className="w-full flex justify-between text-lg font-bold text-primary">
                <span>Closing Balance for Selected Period:</span>
                <span>{historicalCashbookData?.finalClosingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        </CardFooter>
      </Card>

      {isAddPaymentFormOpen && (
        <AddPaymentForm
          isOpen={isAddPaymentFormOpen}
          onClose={() => setIsAddPaymentFormOpen(false)}
          onSubmit={handleAddPaymentFromCashbook}
          parties={allPaymentParties}
          onMasterDataUpdate={handleMasterDataUpdateFromCashbook}
          paymentToEdit={paymentToEdit} 
        />
      )}

      {isAddReceiptFormOpen && (
        <AddReceiptForm
          isOpen={isAddReceiptFormOpen}
          onClose={() => setIsAddReceiptFormOpen(false)}
          onSubmit={handleAddReceiptFromCashbook}
          parties={allReceiptParties}
          onMasterDataUpdate={handleMasterDataUpdateFromCashbook}
          receiptToEdit={receiptToEdit} 
        />
      )}
    </div>
  );
}
