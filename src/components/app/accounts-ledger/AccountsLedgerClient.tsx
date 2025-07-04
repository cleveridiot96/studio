
"use client";
import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt } from "@/lib/types";
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

const MASTERS_KEYS = {
  customers: 'masterCustomers',
  suppliers: 'masterSuppliers',
  agents: 'masterAgents',
  transporters: 'masterTransporters',
  brokers: 'masterBrokers',
};
const TRANSACTIONS_KEYS = {
  purchases: 'purchasesData',
  sales: 'salesData',
  payments: 'paymentsData',
  receipts: 'receiptsData',
};

interface LedgerEntry {
    id: string;
    date: string;
    particulars: string;
    vakkal?: string;
    bags?: number;
    kg?: number;
    rate?: number;
    amount: number;
}

const initialLedgerData = {
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

export function AccountsLedgerClient() {
  const [hydrated, setHydrated] = React.useState(false);
  const [allMasters, setAllMasters] = React.useState<MasterItem[]>([]);
  
  const memoizedEmptyArray = React.useMemo(() => [], []);
  const [purchases] = useLocalStorageState<Purchase[]>(TRANSACTIONS_KEYS.purchases, memoizedEmptyArray);
  const [sales] = useLocalStorageState<Sale[]>(TRANSACTIONS_KEYS.sales, memoizedEmptyArray);
  const [payments] = useLocalStorageState<Payment[]>(TRANSACTIONS_KEYS.payments, memoizedEmptyArray);
  const [receipts] = useLocalStorageState<Receipt[]>(TRANSACTIONS_KEYS.receipts, memoizedEmptyArray);

  const [selectedPartyId, setSelectedPartyId] = React.useState<string>("");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const { financialYear: currentFinancialYearString } = useSettings();

  const searchParams = useSearchParams();
  const router = useRouter();

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
      
      const partyIdFromQuery = searchParams.get('partyId');
      if (partyIdFromQuery && loadedMasters.some(m => m.id === partyIdFromQuery) && selectedPartyId !== partyIdFromQuery) {
        setSelectedPartyId(partyIdFromQuery);
      }
    }
  }, [hydrated, currentFinancialYearString, searchParams, dateRange, selectedPartyId]);

  const partyOptions = React.useMemo(() => {
    return allMasters.map(p => ({ value: p.id, label: `${p.name} (${p.type})` }));
  }, [allMasters]);
  
  const getPartyTransactions = React.useCallback((partyId: string) => {
    const party = allMasters.find(p => p.id === partyId);
    if (!party) return [];

    let transactions: (LedgerEntry & { type: 'debit' | 'credit' })[] = [];

    // Sales (Debit to Customer account)
    if (party.type === 'Customer') {
      sales.filter(s => s.customerId === partyId).forEach(s => {
        transactions.push({ id: `sale-${s.id}`, date: s.date, type: 'debit', amount: s.billedAmount, particulars: `Sale Bill: ${s.billNumber || s.id.slice(-4)}`, vakkal: s.lotNumber, bags: s.quantity, kg: s.netWeight, rate: s.rate });
      });
      receipts.filter(r => r.partyId === partyId).forEach(r => {
        transactions.push({ id: `receipt-${r.id}`, date: r.date, type: 'credit', amount: r.amount, particulars: `Receipt - ${r.paymentMethod}` });
        if (r.cashDiscount && r.cashDiscount > 0) {
          transactions.push({ id: `disc-${r.id}`, date: r.date, type: 'credit', amount: r.cashDiscount, particulars: `Cash Discount Given` });
        }
      });
    }

    // Purchases (Credit to Supplier/Agent account)
    if (party.type === 'Supplier' || party.type === 'Agent') {
      purchases.filter(p => p.supplierId === partyId || p.agentId === partyId).forEach(p => {
        transactions.push({ id: `pur-${p.id}`, date: p.date, type: 'credit', amount: p.totalAmount, particulars: `Purchase - Lot: ${p.lotNumber}`, vakkal: p.lotNumber, bags: p.quantity, kg: p.netWeight, rate: p.rate });
      });
      payments.filter(p => p.partyId === partyId).forEach(p => {
        transactions.push({ id: `pay-${p.id}`, date: p.date, type: 'debit', amount: p.amount, particulars: `Payment - ${p.paymentMethod}` });
      });
    }
    
    // Brokerage (Credit to Broker) and Payments (Debit to Broker)
    if (party.type === 'Broker') {
      sales.filter(s => s.brokerId === partyId).forEach(s => {
        const totalBrokerage = (s.calculatedBrokerageCommission || 0) + (s.calculatedExtraBrokerage || 0);
        if (totalBrokerage > 0) {
          transactions.push({ id: `broke-${s.id}`, date: s.date, type: 'credit', amount: totalBrokerage, particulars: `Brokerage on Sale: ${s.billNumber || s.id.slice(-4)}`, vakkal: s.lotNumber, kg: s.netWeight });
        }
      });
      payments.filter(p => p.partyId === partyId).forEach(p => {
        transactions.push({ id: `pay-${p.id}`, date: p.date, type: 'debit', amount: p.amount, particulars: `Payment - ${p.paymentMethod}` });
      });
    }

    return transactions;
  }, [allMasters, sales, purchases, payments, receipts]);

  const ledgerData = React.useMemo(() => {
    if (!selectedPartyId || !dateRange?.from || !hydrated) return initialLedgerData;

    const party = allMasters.find(p => p.id === selectedPartyId);
    if (!party) return initialLedgerData;
    
    const partyTransactions = getPartyTransactions(selectedPartyId);

    let openingBalance = party.openingBalance || 0;
    if (party.openingBalanceType === 'Cr') {
        openingBalance = -openingBalance;
    }

    partyTransactions.forEach(tx => {
      if (isBefore(parseISO(tx.date), startOfDay(dateRange.from!))) {
        openingBalance += (tx.type === 'debit' ? tx.amount : -tx.amount);
      }
    });

    const periodTransactions = partyTransactions.filter(tx => isWithinInterval(parseISO(tx.date), { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to || dateRange.from!) }));
    
    let debitEntries = periodTransactions.filter(tx => tx.type === 'debit').sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    let creditEntries = periodTransactions.filter(tx => tx.type === 'credit').sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    // Add opening balance to the correct side
    if (openingBalance > 0) {
      debitEntries.unshift({ id: 'op_bal', date: format(dateRange.from, 'yyyy-MM-dd'), particulars: 'Opening Balance', amount: openingBalance });
    } else if (openingBalance < 0) {
      creditEntries.unshift({ id: 'op_bal', date: format(dateRange.from, 'yyyy-MM-dd'), particulars: 'Opening Balance', amount: -openingBalance });
    }
    
    const totalDebitBags = debitEntries.reduce((sum, entry) => sum + (entry.bags || 0), 0);
    const totalDebitKg = debitEntries.reduce((sum, entry) => sum + (entry.kg || 0), 0);
    const totalCreditBags = creditEntries.reduce((sum, entry) => sum + (entry.bags || 0), 0);
    const totalCreditKg = creditEntries.reduce((sum, entry) => sum + (entry.kg || 0), 0);

    const finalTotalDebit = debitEntries.reduce((sum, e) => sum + e.amount, 0);
    const finalTotalCredit = creditEntries.reduce((sum, e) => sum + e.amount, 0);
    const closingBalance = finalTotalDebit - finalTotalCredit;

    return {
      debitEntries,
      creditEntries,
      totalDebit: finalTotalDebit,
      totalCredit: finalTotalCredit,
      totalDebitBags,
      totalCreditBags,
      totalDebitKg,
      totalCreditKg,
      openingBalance,
      closingBalance,
      balanceType: closingBalance >= 0 ? 'Dr' : 'Cr',
    };
  }, [selectedPartyId, dateRange, hydrated, getPartyTransactions, allMasters]);


  const handlePartySelect = (value: string) => {
    setSelectedPartyId(value);
    router.push(value ? `/accounts-ledger?partyId=${value}` : '/accounts-ledger', { scroll: false });
  };
  
  const selectedPartyDetails = allMasters.find(p => p.id === selectedPartyId);

  return (
    <div className="space-y-6 print-area">
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
                <Printer className="h-5 w-5" />
                <span className="sr-only">Print</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {selectedPartyId && selectedPartyDetails && hydrated ? (
        <Card id="ledger-t-account" className="shadow-lg p-4">
          <CardHeader className="text-center">
            <PrintHeaderSymbol className="hidden print:block text-sm font-semibold mb-1" />
            <CardTitle className="text-2xl text-primary flex items-center justify-center">
              <BookCopy className="mr-3 h-7 w-7 no-print" /> {selectedPartyDetails.name} ({selectedPartyDetails.type})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Period: {dateRange?.from ? format(dateRange.from, "dd-MM-yyyy") : 'Start'} to {dateRange?.to ? format(dateRange.to, "dd-MM-yyyy") : 'End'}
            </p>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
              <Card className="shadow-inner h-full flex flex-col border-orange-300">
                <CardHeader className="p-0"><CardTitle className="bg-orange-200 text-orange-800 text-center p-2 font-bold">DEBIT</CardTitle></CardHeader>
                <CardContent className="p-0 flex-grow">
                  <Table size="sm"><TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Vakkal</TableHead>
                    <TableHead className="text-right">Bags</TableHead><TableHead className="text-right">Kg</TableHead>
                    <TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead>
                  </TableRow></TableHeader>
                    <TableBody>
                      {ledgerData.debitEntries.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center">No debit entries.</TableCell></TableRow>}
                      {ledgerData.debitEntries.map(e => (<TableRow key={`dr-${e.id}`}>
                        <TableCell>{format(parseISO(e.date), "dd-MM-yy")}</TableCell>
                        <TableCell>{e.vakkal || '-'}</TableCell>
                        <TableCell className="text-right">{e.bags?.toLocaleString() || '-'}</TableCell>
                        <TableCell className="text-right">{e.kg?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '-'}</TableCell>
                        <TableCell className="text-right">{e.rate?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '-'}</TableCell>
                        <TableCell className="text-right">{e.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                      </TableRow>))}
                    </TableBody>
                    <TableFooter><TableRow className="font-bold bg-orange-50">
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className="text-right">{ledgerData.totalDebitBags.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{ledgerData.totalDebitKg.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right">{ledgerData.totalDebit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                    </TableRow></TableFooter>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-1">
              <Card className="shadow-inner h-full flex flex-col border-green-300">
                <CardHeader className="p-0"><CardTitle className="bg-green-200 text-green-800 text-center p-2 font-bold">CREDIT</CardTitle></CardHeader>
                <CardContent className="p-0 flex-grow">
                   <Table size="sm"><TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Vakkal</TableHead>
                    <TableHead className="text-right">Bags</TableHead><TableHead className="text-right">Kg</TableHead>
                    <TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead>
                  </TableRow></TableHeader>
                    <TableBody>
                      {ledgerData.creditEntries.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center">No credit entries.</TableCell></TableRow>}
                      {ledgerData.creditEntries.map(e => (<TableRow key={`cr-${e.id}`}>
                        <TableCell>{format(parseISO(e.date), "dd-MM-yy")}</TableCell>
                        <TableCell>{e.vakkal || '-'}</TableCell>
                        <TableCell className="text-right">{e.bags?.toLocaleString() || '-'}</TableCell>
                        <TableCell className="text-right">{e.kg?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '-'}</TableCell>
                        <TableCell className="text-right">{e.rate?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '-'}</TableCell>
                        <TableCell className="text-right">{e.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                      </TableRow>))}
                    </TableBody>
                    <TableFooter><TableRow className="font-bold bg-green-50">
                       <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className="text-right">{ledgerData.totalCreditBags.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{ledgerData.totalCreditKg.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right">{ledgerData.totalCredit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                    </TableRow></TableFooter>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
          <CardFooter className="mt-4 pt-4 border-t-2 border-primary/50 flex justify-end">
            <div className="text-right font-bold text-lg">
                <span>Closing Balance: </span>
                <span className={ledgerData.balanceType === 'Dr' ? 'text-green-700' : 'text-red-700'}>
                    ₹{Math.abs(ledgerData.closingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {ledgerData.balanceType}
                </span>
                <p className="text-xs text-muted-foreground font-normal">({ledgerData.balanceType === 'Dr' ? 'Receivable from party' : 'Payable to party'})</p>
            </div>
          </CardFooter>
        </Card>
      ) : (
        <Card
          className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 min-h-[300px] flex items-center justify-center no-print cursor-pointer hover:bg-muted/30 transition-colors"
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
