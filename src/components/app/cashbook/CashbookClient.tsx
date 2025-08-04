
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Payment, Receipt, MasterItem, MasterItemType, Customer, Supplier, Agent, Transporter, Broker } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { addDays, format, parseISO, startOfDay, endOfDay, isWithinInterval, subMonths, subDays } from "date-fns";
import { BookOpen, TrendingUp, TrendingDown, CalendarDays, Printer, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { AddPaymentForm } from "@/components/app/payments/AddPaymentForm";
import { AddReceiptForm } from "@/components/app/receipts/AddReceiptForm";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PAYMENTS_STORAGE_KEY = 'paymentsData';
const RECEIPTS_STORAGE_KEY = 'receiptsData';
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const BROKERS_STORAGE_KEY = 'masterBrokers';
const EXPENSES_STORAGE_KEY = 'masterExpenses';
const CASH_OPENING_BALANCE_KEY = 'cashbookBaseOpeningBalance';

interface CashLedgerTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'Receipt' | 'Payment';
  particulars: string;
  debit: number; // Inflow
  credit: number; // Outflow
  balance: number;
}

export function CashbookClient() {
  const { toast } = useToast();
  const memoizedInitialPayments = React.useMemo(() => [], []);
  const memoizedInitialReceipts = React.useMemo(() => [], []);
  const memoizedEmptyMasters = React.useMemo(() => [], []);

  const [payments, setPayments] = useLocalStorageState<Payment[]>(PAYMENTS_STORAGE_KEY, memoizedInitialPayments);
  const [receipts, setReceipts] = useLocalStorageState<Receipt[]>(RECEIPTS_STORAGE_KEY, memoizedInitialReceipts);
  
  const [customers, setCustomers] = useLocalStorageState<Customer[]>(CUSTOMERS_STORAGE_KEY, memoizedEmptyMasters);
  const [suppliers, setSuppliers] = useLocalStorageState<Supplier[]>(SUPPLIERS_STORAGE_KEY, memoizedEmptyMasters);
  const [agents, setAgents] = useLocalStorageState<Agent[]>(AGENTS_STORAGE_KEY, memoizedEmptyMasters);
  const [transporters, setTransporters] = useLocalStorageState<Transporter[]>(TRANSPORTERS_STORAGE_KEY, memoizedEmptyMasters);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, memoizedEmptyMasters);
  const [expenses, setExpenses] = useLocalStorageState<MasterItem[]>(EXPENSES_STORAGE_KEY, memoizedEmptyMasters);

  const [baseOpeningBalance, setBaseOpeningBalance] = useLocalStorageState<number>(CASH_OPENING_BALANCE_KEY, 0);
  const [tempOpeningBalance, setTempOpeningBalance] = React.useState('0');

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });
  const [hydrated, setHydrated] = React.useState(false);

  const [isAddPaymentFormOpen, setIsAddPaymentFormOpen] = React.useState(false);
  const [isAddReceiptFormOpen, setIsAddReceiptFormOpen] = React.useState(false);
  const [paymentToEdit, setPaymentToEdit] = React.useState<Payment | null>(null);
  const [receiptToEdit, setReceiptToEdit] = React.useState<Receipt | null>(null);

  React.useEffect(() => {
    setHydrated(true);
  }, []); 

  React.useEffect(() => {
    if (hydrated) {
        setTempOpeningBalance(String(baseOpeningBalance));
    }
  }, [hydrated, baseOpeningBalance]);

  const handleSaveOpeningBalance = () => {
    const newBalance = parseFloat(tempOpeningBalance);
    if (!isNaN(newBalance)) {
        setBaseOpeningBalance(newBalance);
        toast({ title: 'Base opening balance saved.' });
    } else {
        toast({ title: 'Invalid number', description: 'Please enter a valid number for the opening balance.', variant: 'destructive' });
        setTempOpeningBalance(String(baseOpeningBalance)); // Revert to old value on error
    }
  };

  const allPaymentParties = React.useMemo(() => {
    if (!hydrated) return [];
    return [
      ...suppliers.filter(s => s.type === 'Supplier'),
      ...agents.filter(a => a.type === 'Agent'),
      ...transporters.filter(t => t.type === 'Transporter'),
      ...brokers.filter(b => b.type === 'Broker'),
      ...expenses.filter(e => e.type === 'Expense')
    ].filter(party => party && party.id && party.name && party.type)
     .sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers, agents, transporters, brokers, expenses, hydrated]);

  const allReceiptParties = React.useMemo(() => {
    if (!hydrated) return [];
    return [
        ...customers.filter(c => c.type === 'Customer'),
        ...brokers.filter(b => b.type === 'Broker')
    ].filter(party => party && party.id && party.name && party.type)
     .sort((a,b) => a.name.localeCompare(b.name));
  }, [customers, brokers, hydrated]);

  const cashLedgerData = React.useMemo(() => {
    if (!hydrated || !dateRange?.from) return { entries: [], openingBalance: 0, closingBalance: 0 };
    
    let calculatedOpeningBalance = baseOpeningBalance;

    const combinedTransactions = [
        ...receipts.map(r => ({ ...r, type: 'Receipt' as const })),
        ...payments.map(p => ({ ...p, type: 'Payment' as const }))
    ].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    combinedTransactions.forEach(tx => {
        if (parseISO(tx.date) < startOfDay(dateRange.from!)) {
            const amount = tx.type === 'Receipt' ? tx.amount : -tx.amount;
            calculatedOpeningBalance += amount;
        }
    });

    const periodTransactions = combinedTransactions.filter(tx => 
        isWithinInterval(parseISO(tx.date), { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to || dateRange.from!) })
    );

    let runningBalance = calculatedOpeningBalance;
    const entries: CashLedgerTransaction[] = periodTransactions.map(tx => {
        const debit = tx.type === 'Receipt' ? tx.amount : 0;
        const credit = tx.type === 'Payment' ? tx.amount : 0;
        runningBalance = runningBalance + debit - credit;
        
        const particularDetails = `${tx.type === 'Receipt' ? 'From' : 'To'} ${tx.partyName || tx.partyId} (${tx.partyType})` +
                                  (tx.source ? ` (Src: ${tx.source})` : '');
        return {
            id: `${tx.type}-${tx.id}`,
            date: tx.date,
            type: tx.type,
            particulars: particularDetails,
            debit,
            credit,
            balance: runningBalance,
        };
    });

    return { entries, openingBalance: calculatedOpeningBalance, closingBalance: runningBalance };
  }, [payments, receipts, hydrated, dateRange, baseOpeningBalance]);


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
      case "Expense":     setExpenses(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]); break;
      default: toast({title: "Info", description: `Master type ${type} not directly handled here.`}); break;
    }
  }, [setSuppliers, setAgents, setTransporters, setCustomers, setBrokers, setExpenses, toast]);

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


  if (!hydrated) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <p className="text-lg text-muted-foreground">Loading cashbook data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-2xl text-primary flex items-center">
              <BookOpen className="mr-3 h-7 w-7"/>Cash Book
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto no-print">
              <Button variant="outline" size="sm" onClick={() => { setPaymentToEdit(null); setIsAddPaymentFormOpen(true); }} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4"/> Add Payment
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setReceiptToEdit(null); setIsAddReceiptFormOpen(true); }} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4"/> Add Receipt
              </Button>
            </div>
          </div>
          <div className="w-full border-t pt-4 mt-4 flex justify-end items-center gap-2 no-print">
            <Label htmlFor="opening-balance-input" className="text-sm font-medium whitespace-nowrap">Base Opening Balance (₹):</Label>
            <Input
                id="opening-balance-input"
                type="number"
                step="0.01"
                className="w-40 h-9"
                value={tempOpeningBalance}
                onChange={(e) => setTempOpeningBalance(e.target.value)}
                onBlur={handleSaveOpeningBalance}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleSaveOpeningBalance();
                        (e.target as HTMLInputElement).blur();
                    }
                }}
            />
        </div>
        </CardHeader>
        <CardContent>
           <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 no-print flex-wrap">
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="max-w-sm w-full" />
            <div className="flex gap-1 items-center justify-end flex-grow">
              <Button variant="outline" size="sm" onClick={() => setDateQuickFilter('today')}>Today</Button>
              <Button variant="outline" size="sm" onClick={() => setDateQuickFilter('yesterday')}>Yesterday</Button>
              <Button variant="outline" size="sm" onClick={() => setDateQuickFilter('dayBeforeYesterday')}>
                  {format(subDays(new Date(), 2), 'EEEE')}
              </Button>
              <Button variant="outline" size="icon" onClick={() => window.print()}>
                  <Printer className="h-5 w-5" />
                  <span className="sr-only">Print</span>
              </Button>
            </div>
          </div>

          <div className="mb-4 p-3 border rounded-md bg-muted/50">
            <div className="flex justify-between text-sm font-medium">
                <span>Opening Balance for Period:</span>
                <span>{cashLedgerData.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          <ScrollArea className="h-[60vh] rounded-md border print:h-auto print:overflow-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead className="text-right">Debit (In)</TableHead>
                  <TableHead className="text-right">Credit (Out)</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashLedgerData.entries.length === 0 ? (
                     <TableRow><TableCell colSpan={5} className="text-center h-32 text-muted-foreground">No cash transactions in the selected period.</TableCell></TableRow>
                ) : (
                  cashLedgerData.entries.map((tx) => (
                    <TableRow key={tx.id} className={cn(tx.type === 'Receipt' ? 'bg-green-50/50' : 'bg-red-50/50')}>
                      <TableCell>{format(parseISO(tx.date), "dd/MM/yy")}</TableCell>
                      <TableCell className="truncate max-w-sm uppercase">{tx.particulars}</TableCell>
                      <TableCell className="text-right font-mono text-green-700">
                        {tx.debit > 0 ? tx.debit.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {tx.credit > 0 ? tx.credit.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold font-mono">{tx.balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter className="mt-4 pt-4 border-t">
            <div className="w-full flex justify-between text-lg font-bold text-primary">
                <span>Closing Balance for Period:</span>
                <span>{cashLedgerData.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
          allPurchases={[]} // Pass empty as cashbook doesn't need full purchase data for allocation
          allPayments={payments}
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
          allSales={[]} // Pass empty as cashbook doesn't need full sale data for allocation
          allReceipts={receipts}
        />
      )}
    </div>
  );
}
