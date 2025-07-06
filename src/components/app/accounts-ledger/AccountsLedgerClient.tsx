
"use client";
import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, LocationTransfer, LedgerEntry as LedgerEntryType } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, subMonths, isBefore } from "date-fns";
import { BookCopy, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { useSearchParams, useRouter } from "next/navigation";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const MASTERS_KEYS = {
  customers: 'masterCustomers',
  suppliers: 'masterSuppliers',
  agents: 'masterAgents',
  transporters: 'masterTransporters',
  brokers: 'masterBrokers',
  expenses: 'masterExpenses',
};
const TRANSACTIONS_KEYS = {
  purchases: 'purchasesData',
  sales: 'salesData',
  payments: 'paymentsData',
  receipts: 'receiptsData',
  locationTransfers: 'locationTransfersData',
};

interface LedgerEntry {
    id: string;
    date: string;
    vakkal?: string;
    bags?: number;
    kg?: number;
    rate?: number;
    amount: number;
}

interface TransporterCreditEntry {
  id: string;
  date: string;
  vakkalTransfer: string;
  bags: number;
  grossWeight: number;
  rate: number;
  amount: number;
}
interface TransporterDebitEntry {
  id: string;
  date: string;
  amount: number;
  mode: string;
  notes: string;
}

const initialFinancialLedgerData = {
  debitEntries: [] as LedgerEntry[],
  creditEntries: [] as LedgerEntry[],
  totalDebit: 0,
  totalCredit: 0,
  totalDebitBags: 0,
  totalCreditBags: 0,
  totalDebitKg: 0,
  totalCreditKg: 0,
  openingBalance: 0,
  closingBalance: 0,
  balanceType: 'Dr',
};

const initialTransporterLedgerData = {
  creditEntries: [] as TransporterCreditEntry[],
  debitEntries: [] as TransporterDebitEntry[],
  totalCredit: 0,
  totalDebit: 0,
  balance: 0,
};

export function AccountsLedgerClient() {
  const [hydrated, setHydrated] = React.useState(false);
  const [allMasters, setAllMasters] = React.useState<MasterItem[]>([]);
  
  const memoizedEmptyArray = React.useMemo(() => [], []);
  const [purchases] = useLocalStorageState<Purchase[]>(TRANSACTIONS_KEYS.purchases, memoizedEmptyArray);
  const [sales] = useLocalStorageState<Sale[]>(TRANSACTIONS_KEYS.sales, memoizedEmptyArray);
  const [payments] = useLocalStorageState<Payment[]>(TRANSACTIONS_KEYS.payments, memoizedEmptyArray);
  const [receipts] = useLocalStorageState<Receipt[]>(TRANSACTIONS_KEYS.receipts, memoizedEmptyArray);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(TRANSACTIONS_KEYS.locationTransfers, memoizedEmptyArray);

  const [selectedPartyId, setSelectedPartyId] = React.useState<string>("");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const { financialYear: currentFinancialYearString } = useSettings();

  const searchParams = useSearchParams();
  const router = useRouter();
  const partyIdFromQuery = searchParams.get('partyId');

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated) {
      const loadedMasters: MasterItem[] = [];
      Object.values(MASTERS_KEYS).forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsedDataArray = JSON.parse(data) as MasterItem[];
            if (Array.isArray(parsedDataArray)) {
              parsedDataArray.forEach(item => {
                if (item?.id && item?.name && item?.type && item.type !== 'Warehouse') {
                  loadedMasters.push(item);
                }
              });
            }
          } catch (e) {
            console.error(`Failed to parse master data for key: ${key}`, e);
          }
        }
      });
      loadedMasters.sort((a, b) => a.name.localeCompare(b.name));
      setAllMasters(loadedMasters);

      if (!dateRange) {
        const [startYearStr] = currentFinancialYearString.split('-');
        const startYear = parseInt(startYearStr, 10);
        if (!isNaN(startYear)) {
          setDateRange({ from: new Date(startYear, 3, 1), to: endOfDay(new Date(startYear + 1, 2, 31)) });
        } else {
          setDateRange({ from: startOfDay(subMonths(new Date(), 1)), to: endOfDay(new Date()) });
        }
      }
      
      if (partyIdFromQuery && loadedMasters.some(m => m.id === partyIdFromQuery) && selectedPartyId !== partyIdFromQuery) {
        setSelectedPartyId(partyIdFromQuery);
      }
    }
  }, [hydrated, currentFinancialYearString, partyIdFromQuery, dateRange, selectedPartyId]);

  const partyOptions = React.useMemo(() => {
    return allMasters.map(p => ({ value: p.id, label: `${p.name} (${p.type})` }));
  }, [allMasters]);
  
  const getPartyTransactions = React.useCallback((partyId: string) => {
    const party = allMasters.find(p => p.id === partyId);
    if (!party) return [];

    let transactions: (LedgerEntryType & { type: 'debit' | 'credit' })[] = [];

    // Sales: Debit the broker if present, otherwise debit the customer
    sales.forEach(s => {
        if (s.brokerId === partyId) {
            transactions.push({ id: `sale-${s.id}`, date: s.date, type: 'debit', amount: s.billedAmount, vakkal: `Sale: ${s.customerName} (${s.lotNumber})`, bags: s.quantity, kg: s.netWeight, rate: s.rate } as any);
        } else if (!s.brokerId && s.customerId === partyId) {
            transactions.push({ id: `sale-${s.id}`, date: s.date, type: 'debit', amount: s.billedAmount, vakkal: `Sale: ${s.billNumber || s.lotNumber}`, bags: s.quantity, kg: s.netWeight, rate: s.rate } as any);
        }
    });

    // Purchases: Credit the supplier for goods, credit the agent for brokerage separately
    purchases.forEach(p => {
        if (p.supplierId === partyId) {
            const goodsPayable = (p.totalAmount || 0) - (p.brokerageCharges || 0);
            transactions.push({ id: `pur-goods-${p.id}`, date: p.date, type: 'credit', amount: goodsPayable, vakkal: `Purchase: ${p.lotNumber}`, bags: p.quantity, kg: p.netWeight, rate: p.rate } as any);
        }
        if (p.agentId === partyId && p.brokerageCharges && p.brokerageCharges > 0) {
            transactions.push({ id: `pur-brok-${p.id}`, date: p.date, type: 'credit', amount: p.brokerageCharges, vakkal: `Brokerage on ${p.lotNumber}`, bags: p.quantity, kg: p.netWeight, rate: p.brokerageValue } as any);
        }
    });

    // Receipts: Always a credit for the party making the payment
    receipts.forEach(r => {
        if (r.partyId === partyId) {
            transactions.push({ id: `receipt-${r.id}`, date: r.date, type: 'credit', amount: r.amount, vakkal: `Receipt - Ref: ${r.referenceNo || ''}` } as any);
            if (r.cashDiscount && r.cashDiscount > 0) {
                transactions.push({ id: `disc-${r.id}`, date: r.date, type: 'credit', amount: r.cashDiscount, vakkal: 'Discount Given' } as any);
            }
        }
    });

    // Payments: Always a debit for the party receiving the payment
    payments.forEach(p => {
        if (p.partyId === partyId) {
            transactions.push({ id: `pay-${p.id}`, date: p.date, type: 'debit', amount: p.amount, vakkal: `Payment - Ref: ${p.referenceNo || ''}` } as any);
        }
    });
    
    // Expense heads are payables, so credit them from purchases/sales
    if (party.type === 'Expense') {
        purchases.forEach(p => {
            if (party.id === 'fixed-exp-packing' && p.packingCharges && p.packingCharges > 0) { transactions.push({ id: `pur-pack-${p.id}`, date: p.date, type: 'credit', amount: p.packingCharges, vakkal: `Purchase: ${p.lotNumber}` } as any); }
            if (party.id === 'fixed-exp-labour' && p.labourCharges && p.labourCharges > 0) { transactions.push({ id: `pur-labour-${p.id}`, date: p.date, type: 'credit', amount: p.labourCharges, vakkal: `Purchase: ${p.lotNumber}` } as any); }
            if (party.id === 'fixed-exp-misc' && p.miscExpenses && p.miscExpenses > 0) { transactions.push({ id: `pur-misc-${p.id}`, date: p.date, type: 'credit', amount: p.miscExpenses, vakkal: `Purchase: ${p.lotNumber}` } as any); }
        });
        sales.forEach(s => {
            if (party.id === 'fixed-exp-packing' && s.packingCost && s.packingCost > 0) { transactions.push({ id: `sale-pack-${s.id}`, date: s.date, type: 'credit', amount: s.packingCost, vakkal: `Sale: ${s.billNumber || s.lotNumber}` } as any); }
            if (party.id === 'fixed-exp-labour' && s.labourCost && s.labourCost > 0) { transactions.push({ id: `sale-labour-${s.id}`, date: s.date, type: 'credit', amount: s.labourCost, vakkal: `Sale: ${s.billNumber || s.lotNumber}` } as any); }
        });
    }

    return transactions;
  }, [allMasters, sales, purchases, payments, receipts]);

  const financialLedgerData = React.useMemo(() => {
    if (!selectedPartyId || !dateRange?.from || !hydrated) return initialFinancialLedgerData;
    const party = allMasters.find(p => p.id === selectedPartyId);
    if (!party || party.type === 'Transporter') return initialFinancialLedgerData; // Transporter handled separately
    
    const partyTransactions = getPartyTransactions(selectedPartyId);
    let openingBalance = party.openingBalance || 0;
    if (party.openingBalanceType === 'Cr') openingBalance = -openingBalance;

    partyTransactions.forEach(tx => {
      if (isBefore(parseISO(tx.date), startOfDay(dateRange.from!))) {
        openingBalance += (tx.type === 'debit' ? tx.amount : -tx.amount);
      }
    });

    const periodTransactions = partyTransactions.filter(tx => isWithinInterval(parseISO(tx.date), { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to || dateRange.from!) }));
    let debitEntries = periodTransactions.filter(tx => tx.type === 'debit').sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    let creditEntries = periodTransactions.filter(tx => tx.type === 'credit').sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    const totalDebitDuringPeriod = debitEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalCreditDuringPeriod = creditEntries.reduce((sum, e) => sum + e.amount, 0);

    if (openingBalance > 0) debitEntries.unshift({ id: 'op_bal', date: format(dateRange.from, 'yyyy-MM-dd'), amount: openingBalance, vakkal: 'Opening Balance' } as any);
    else if (openingBalance < 0) creditEntries.unshift({ id: 'op_bal', date: format(dateRange.from, 'yyyy-MM-dd'), amount: -openingBalance, vakkal: 'Opening Balance' } as any);
    
    return {
      debitEntries, creditEntries,
      totalDebit: debitEntries.reduce((sum, e) => sum + e.amount, 0),
      totalCredit: creditEntries.reduce((sum, e) => sum + e.amount, 0),
      totalDebitBags: debitEntries.reduce((sum, entry) => sum + (entry.bags || 0), 0),
      totalDebitKg: debitEntries.reduce((sum, entry) => sum + (entry.kg || 0), 0),
      totalCreditBags: creditEntries.reduce((sum, entry) => sum + (entry.bags || 0), 0),
      totalCreditKg: creditEntries.reduce((sum, entry) => sum + (entry.kg || 0), 0),
      openingBalance, closingBalance: openingBalance + totalDebitDuringPeriod - totalCreditDuringPeriod,
      balanceType: (openingBalance + totalDebitDuringPeriod - totalCreditDuringPeriod) >= 0 ? 'Dr' : 'Cr',
    };
  }, [selectedPartyId, dateRange, hydrated, getPartyTransactions, allMasters]);
  
  const selectedPartyDetails = allMasters.find(p => p.id === selectedPartyId);

  const transporterLedgerData = React.useMemo(() => {
    if (!selectedPartyId || !dateRange?.from || !hydrated) return initialTransporterLedgerData;
    const party = allMasters.find(p => p.id === selectedPartyId);
    if (!party || party.type !== 'Transporter') return initialTransporterLedgerData;

    const toDate = dateRange.to || dateRange.from;

    const creditEntries: TransporterCreditEntry[] = locationTransfers
      .filter(lt => lt.transporterId === selectedPartyId && isWithinInterval(parseISO(lt.date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) }))
      .map(lt => ({
        id: lt.id, date: lt.date,
        vakkalTransfer: lt.items.map(i => i.originalLotNumber).join(', '),
        bags: lt.items.reduce((s, i) => s + i.bagsToTransfer, 0),
        grossWeight: lt.items.reduce((s, i) => s + i.grossWeightToTransfer, 0),
        rate: lt.transportRatePerKg || 0,
        amount: lt.transportCharges || 0,
      }))
      .sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    const debitEntries: TransporterDebitEntry[] = payments
      .filter(p => p.partyId === selectedPartyId && isWithinInterval(parseISO(p.date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) }))
      .map(p => ({
        id: p.id, date: p.date, amount: p.amount,
        mode: p.paymentMethod, notes: p.notes || p.referenceNo || ''
      }))
      .sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
      
    const totalCredit = creditEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalDebit = debitEntries.reduce((sum, entry) => sum + entry.amount, 0);

    return { creditEntries, debitEntries, totalCredit, totalDebit, balance: totalCredit - totalDebit };
  }, [selectedPartyId, dateRange, hydrated, locationTransfers, payments, allMasters]);


  const handlePartySelect = (value: string) => {
    setSelectedPartyId(value);
    router.push(value ? `/accounts-ledger?partyId=${value}` : '/accounts-ledger', { scroll: false });
  };
  
  return (
    <div className="space-y-6 print-area flex flex-col flex-1">
      <Card className="shadow-md no-print">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl font-bold text-foreground">Accounts Ledger</h1>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <MasterDataCombobox
                triggerId="accounts-ledger-party-selector"
                value={selectedPartyId}
                onChange={(value) => handlePartySelect(value || "")}
                options={partyOptions}
                placeholder="Select Party..."
                searchPlaceholder="Search parties..."
                notFoundMessage="No party found."
                className="h-11 text-base"
              />
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="w-full md:w-auto"/>
              <Button variant="outline" size="icon" onClick={() => window.print()} title="Print">
                <Printer className="h-5 w-5" /><span className="sr-only">Print</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {selectedPartyId && selectedPartyDetails && hydrated ? (
        <Card id="ledger-t-account" className="shadow-lg p-4 flex flex-col flex-1">
          <CardHeader className="text-center">
            <PrintHeaderSymbol className="hidden print:block text-sm font-semibold mb-1" />
            <CardTitle className="text-2xl text-primary flex items-center justify-center">
              <BookCopy className="mr-3 h-7 w-7 no-print" /> {selectedPartyDetails.name} ({selectedPartyDetails.type})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Period: {dateRange?.from ? format(dateRange.from, "dd-MM-yyyy") : 'Start'} to {dateRange?.to ? format(dateRange.to, "dd-MM-yyyy") : 'End'}
            </p>
          </CardHeader>

          {selectedPartyDetails.type === 'Transporter' ? (
             <CardContent className="flex flex-col flex-grow min-h-0">
                <div className="flex flex-col md:flex-row gap-4 flex-grow min-h-0">
                  <div className="flex-1 flex flex-col min-w-0">
                    <Card className="shadow-inner h-full flex flex-col border-green-300 flex-1">
                      <CardHeader className="p-0"><CardTitle className="bg-green-200 text-green-800 text-center p-2 font-bold">CREDIT (Payable to Transporter)</CardTitle></CardHeader>
                      <CardContent className="p-0 flex-grow min-h-0">
                        <ScrollArea className="h-full">
                          <Table size="sm"><TableHeader><TableRow>
                              <TableHead>Date</TableHead><TableHead>Vakkal(s)</TableHead>
                              <TableHead className="text-right">Weight</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead>
                            </TableRow></TableHeader><TableBody>
                                {transporterLedgerData.creditEntries.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center">No transport charges recorded.</TableCell></TableRow>}
                                {transporterLedgerData.creditEntries.map(e => (<TableRow key={`cr-${e.id}`}>
                                  <TableCell>{format(parseISO(e.date), "dd-MM-yy")}</TableCell>
                                  <TableCell>{e.vakkalTransfer}</TableCell>
                                  <TableCell className="text-right">{e.grossWeight.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{e.rate.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                  <TableCell className="text-right">{e.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                </TableRow>))}
                              </TableBody><TableFooter><TableRow className="font-bold bg-green-50">
                                  <TableCell colSpan={4}>Total Payable</TableCell>
                                  <TableCell className="text-right">{transporterLedgerData.totalCredit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                              </TableRow></TableFooter></Table>
                               <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </CardContent>
                      </Card>
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <Card className="shadow-inner h-full flex flex-col border-orange-300 flex-1">
                      <CardHeader className="p-0"><CardTitle className="bg-orange-200 text-orange-800 text-center p-2 font-bold">DEBIT (Paid to Transporter)</CardTitle></CardHeader>
                      <CardContent className="p-0 flex-grow min-h-0">
                        <ScrollArea className="h-full">
                          <Table size="sm"><TableHeader><TableRow>
                              <TableHead>Date</TableHead><TableHead>Mode</TableHead><TableHead>Notes</TableHead><TableHead className="text-right">Amount</TableHead>
                            </TableRow></TableHeader><TableBody>
                                {transporterLedgerData.debitEntries.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">No payments recorded.</TableCell></TableRow>}
                                {transporterLedgerData.debitEntries.map(e => (<TableRow key={`dr-${e.id}`}>
                                  <TableCell>{format(parseISO(e.date), "dd-MM-yy")}</TableCell>
                                  <TableCell>{e.mode}</TableCell>
                                  <TableCell>{e.notes}</TableCell>
                                  <TableCell className="text-right">{e.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                </TableRow>))}
                              </TableBody><TableFooter><TableRow className="font-bold bg-orange-50">
                                  <TableCell colSpan={3}>Total Paid</TableCell>
                                  <TableCell className="text-right">{transporterLedgerData.totalDebit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                              </TableRow></TableFooter></Table>
                               <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </div>
                </div>
            </CardContent>
          ) : (
            <CardContent className="flex flex-col flex-grow min-h-0">
            <div className="flex flex-col md:flex-row gap-4 flex-grow min-h-0">
              <div className="flex-1 flex flex-col min-h-0">
                <Card className="shadow-inner h-full flex flex-col border-orange-300 flex-1">
                  <CardHeader className="p-0"><CardTitle className="bg-orange-200 text-orange-800 text-center p-2 font-bold">DEBIT</CardTitle></CardHeader>
                  <CardContent className="p-0 flex-grow min-h-0">
                    <ScrollArea className="h-full">
                      <Table size="sm" className="whitespace-nowrap"><TableHeader><TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Particulars</TableHead>
                          <TableHead className="text-right">Bags</TableHead>
                          <TableHead className="text-right">Kg</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow></TableHeader><TableBody>
                            {financialLedgerData.debitEntries.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center">No debit entries.</TableCell></TableRow>}
                            {financialLedgerData.debitEntries.map(e => (<TableRow key={`dr-${e.id}`}>
                              <TableCell>{format(parseISO(e.date), "dd-MM-yy")}</TableCell>
                              <TableCell>{e.vakkal}</TableCell>
                              <TableCell className="text-right">{e.bags?.toLocaleString() ?? ''}</TableCell>
                              <TableCell className="text-right">{e.kg?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? ''}</TableCell>
                              <TableCell className="text-right">{e.rate?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? ''}</TableCell>
                              <TableCell className="text-right">{e.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                            </TableRow>))}
                          </TableBody><TableFooter><TableRow className="font-bold bg-orange-50">
                              <TableCell colSpan={2}>Total</TableCell>
                              <TableCell className="text-right">{financialLedgerData.totalDebitBags.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{financialLedgerData.totalDebitKg.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-right">{financialLedgerData.totalDebit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                          </TableRow></TableFooter></Table>
                           <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </CardContent>
                  </Card>
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                  <Card className="shadow-inner h-full flex flex-col border-green-300 flex-1">
                  <CardHeader className="p-0"><CardTitle className="bg-green-200 text-green-800 text-center p-2 font-bold">CREDIT</CardTitle></CardHeader>
                  <CardContent className="p-0 flex-grow min-h-0">
                    <ScrollArea className="h-full">
                      <Table size="sm" className="whitespace-nowrap"><TableHeader><TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Particulars</TableHead>
                          <TableHead className="text-right">Bags</TableHead>
                          <TableHead className="text-right">Kg</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow></TableHeader><TableBody>
                            {financialLedgerData.creditEntries.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center">No credit entries.</TableCell></TableRow>}
                            {financialLedgerData.creditEntries.map(e => (<TableRow key={`cr-${e.id}`}>
                              <TableCell>{format(parseISO(e.date), "dd-MM-yy")}</TableCell>
                              <TableCell>{e.vakkal}</TableCell>
                              <TableCell className="text-right">{e.bags?.toLocaleString() ?? ''}</TableCell>
                              <TableCell className="text-right">{e.kg?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? ''}</TableCell>
                              <TableCell className="text-right">{e.rate?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? ''}</TableCell>
                              <TableCell className="text-right">{e.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                            </TableRow>))}
                          </TableBody><TableFooter><TableRow className="font-bold bg-green-50">
                            <TableCell colSpan={2}>Total</TableCell>
                            <TableCell className="text-right">{financialLedgerData.totalCreditBags.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{financialLedgerData.totalCreditKg.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right">{financialLedgerData.totalCredit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                          </TableRow></TableFooter></Table>
                           <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </CardContent>
                  </Card>
              </div>
            </div>
            </CardContent>
          )}

          {selectedPartyDetails.type === 'Transporter' ? (
             <CardFooter className="mt-4 pt-4 border-t-2 border-primary/50 flex justify-end">
              <div className="text-right font-bold text-lg">
                  <span>Balance Due: </span>
                  <span className={transporterLedgerData.balance >= 0 ? 'text-green-700' : 'text-red-700'}>
                      ₹{Math.abs(transporterLedgerData.balance).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </span>
              </div>
            </CardFooter>
          ) : (
             <CardFooter className="mt-4 pt-4 border-t-2 border-primary/50 flex justify-end">
              <div className="text-right font-bold text-lg">
                  <span>Closing Balance: </span>
                  <span className={financialLedgerData.balanceType === 'Dr' ? 'text-green-700' : 'text-red-700'}>
                      ₹{Math.abs(financialLedgerData.closingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {financialLedgerData.balanceType}
                  </span>
                  <p className="text-xs text-muted-foreground font-normal">({financialLedgerData.balanceType === 'Dr' ? 'Receivable from party' : 'Payable to party'})</p>
              </div>
            </CardFooter>
          )}
        </Card>
      ) : (
        <Card
          className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 min-h-[300px] flex items-center justify-center no-print cursor-pointer hover:bg-muted/30 transition-colors flex-1"
          onClick={() => {
            const trigger = document.getElementById('accounts-ledger-party-selector');
            trigger?.click();
          }}
        >
          <div className="text-center">
            <BookCopy className="h-16 w-16 text-accent mb-4 mx-auto" />
            <p className="text-xl text-muted-foreground">
              {allMasters.length === 0 && hydrated ? "No parties found." : "Please select a party to view their accounts ledger."}
            </p>
            <p className="text-sm text-muted-foreground mt-2">(Click here to select)</p>
          </div>
        </Card>
      )}
    </div>
  );
}
