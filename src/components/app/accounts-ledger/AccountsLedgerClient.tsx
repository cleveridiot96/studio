
"use client";
import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, LocationTransfer, PurchaseReturn, SaleReturn } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";

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
  purchaseReturns: 'purchaseReturnsData',
  saleReturns: 'saleReturnsData',
};

interface LedgerEntry {
    id: string;
    date: string;
    type: string;
    particulars: string;
    debit: number;
    credit: number;
    balance: number;
}

const initialFinancialLedgerData = {
  entries: [] as LedgerEntry[],
  openingBalance: 0,
  closingBalance: 0,
  totalDebit: 0,
  totalCredit: 0,
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
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(TRANSACTIONS_KEYS.purchaseReturns, memoizedEmptyArray);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(TRANSACTIONS_KEYS.saleReturns, memoizedEmptyArray);

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

    let transactions: Omit<LedgerEntry, 'balance'>[] = [];

    // --- DEBIT: Amount the party owes us ---
    // --- CREDIT: Amount we owe the party ---
    switch(party.type) {
        case 'Broker':
            sales.filter(s => s.brokerId === partyId).forEach(s => {
                transactions.push({ id: `sale-${s.id}`, date: s.date, type: 'Sale', particulars: `Sale to ${s.customerName} (${s.lotNumber})`, debit: s.billedAmount, credit: 0 });
                const totalBrokerage = (s.calculatedBrokerageCommission || 0) + (s.calculatedExtraBrokerage || 0);
                if (totalBrokerage > 0) {
                    transactions.push({ id: `brok-${s.id}`, date: s.date, type: 'Brokerage', particulars: `Brokerage on ${s.lotNumber}`, debit: 0, credit: totalBrokerage });
                }
            });
            receipts.filter(r => r.partyId === partyId).forEach(r => {
                transactions.push({ id: `receipt-${r.id}`, date: r.date, type: 'Receipt', particulars: `Receipt via ${r.paymentMethod}`, debit: 0, credit: r.amount });
                if (r.cashDiscount && r.cashDiscount > 0) {
                    transactions.push({ id: `disc-${r.id}`, date: r.date, type: 'Discount', particulars: 'Discount Given', debit: 0, credit: r.cashDiscount });
                }
            });
            saleReturns.forEach(sr => {
                const originalSale = sales.find(s => s.id === sr.originalSaleId);
                if (originalSale?.brokerId === partyId) {
                    // Credit broker for returned goods value
                    transactions.push({ id: `sret-${sr.id}`, date: sr.date, type: 'Sale Return', particulars: `Return from ${sr.originalCustomerName} of ${sr.originalLotNumber}`, debit: 0, credit: sr.returnAmount });
                }
            });
            break;
        case 'Agent':
            purchases.filter(p => p.agentId === partyId && p.brokerageCharges && p.brokerageCharges > 0).forEach(p => {
                transactions.push({ id: `brok-${p.id}`, date: p.date, type: 'Brokerage', particulars: `Brokerage on ${p.lotNumber} from ${p.supplierName}`, debit: 0, credit: p.brokerageCharges || 0 });
            });
            payments.filter(p => p.partyId === partyId).forEach(p => {
                transactions.push({ id: `pay-${p.id}`, date: p.date, type: 'Payment', particulars: `Payment via ${p.paymentMethod}`, debit: p.amount, credit: 0 });
            });
            break;
        case 'Supplier':
            purchases.filter(p => p.supplierId === partyId).forEach(p => {
                const payableToSupplier = (p.totalAmount || 0) - (p.brokerageCharges || 0);
                transactions.push({ id: `pur-${p.id}`, date: p.date, type: 'Purchase', particulars: `Purchase: ${p.lotNumber}`, debit: 0, credit: payableToSupplier });
            });
            payments.filter(p => p.partyId === partyId).forEach(p => {
                transactions.push({ id: `pay-${p.id}`, date: p.date, type: 'Payment', particulars: `Payment via ${p.paymentMethod}`, debit: p.amount, credit: 0 });
            });
            purchaseReturns.filter(pr => pr.originalSupplierId === partyId).forEach(pr => {
                transactions.push({ id: `pret-${pr.id}`, date: pr.date, type: 'Purchase Return', particulars: `Return of ${pr.originalLotNumber}`, debit: pr.returnAmount, credit: 0 });
            });
            break;
        case 'Customer':
             sales.filter(s => s.customerId === partyId && !s.brokerId).forEach(s => {
                transactions.push({ id: `sale-${s.id}`, date: s.date, type: 'Sale', particulars: `Sale: ${s.billNumber || s.lotNumber}`, debit: s.billedAmount, credit: 0 });
            });
             receipts.filter(r => r.partyId === partyId).forEach(r => {
                transactions.push({ id: `receipt-${r.id}`, date: r.date, type: 'Receipt', particulars: `Receipt via ${r.paymentMethod}`, debit: 0, credit: r.amount });
                 if (r.cashDiscount && r.cashDiscount > 0) {
                    transactions.push({ id: `disc-${r.id}`, date: r.date, type: 'Discount', particulars: 'Discount Given', debit: 0, credit: r.cashDiscount });
                }
            });
            break;
        default:
            // For Transporter, Expense heads
            payments.filter(p => p.partyId === partyId).forEach(p => {
                 transactions.push({ id: `pay-${p.id}`, date: p.date, type: 'Payment', particulars: `Payment via ${p.paymentMethod}`, debit: p.amount, credit: 0 });
            });
            break;
    }
    
    return transactions;
  }, [allMasters, sales, purchases, payments, receipts, saleReturns, purchaseReturns]);

  const financialLedgerData = React.useMemo(() => {
    if (!selectedPartyId || !dateRange?.from || !hydrated) return initialFinancialLedgerData;
    const party = allMasters.find(p => p.id === selectedPartyId);
    if (!party) return initialFinancialLedgerData;
    
    const allPartyTransactions = getPartyTransactions(selectedPartyId);
    let openingBalance = party.openingBalance || 0;
    if (party.openingBalanceType === 'Cr') openingBalance = -openingBalance;

    // Calculate opening balance based on transactions before the date range
    allPartyTransactions.forEach(tx => {
      if (isBefore(parseISO(tx.date), startOfDay(dateRange.from!))) {
        openingBalance += (tx.debit - tx.credit);
      }
    });

    const periodTransactions = allPartyTransactions
        .filter(tx => isWithinInterval(parseISO(tx.date), { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to || dateRange.from!) }))
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    let runningBalance = openingBalance;
    const entries: LedgerEntry[] = [];
    
    entries.push({ id: 'op_bal', date: format(dateRange.from, 'yyyy-MM-dd'), type: 'Opening Balance', particulars: 'Opening Balance', debit: openingBalance > 0 ? openingBalance : 0, credit: openingBalance < 0 ? -openingBalance : 0, balance: runningBalance });

    periodTransactions.forEach(tx => {
        runningBalance += (tx.debit - tx.credit);
        entries.push({ ...tx, balance: runningBalance });
    });

    const totalDebitDuringPeriod = periodTransactions.reduce((sum, e) => sum + e.debit, 0);
    const totalCreditDuringPeriod = periodTransactions.reduce((sum, e) => sum + e.credit, 0);
    
    return {
      entries,
      openingBalance,
      closingBalance: runningBalance,
      totalDebit: openingBalance > 0 ? openingBalance + totalDebitDuringPeriod : totalDebitDuringPeriod,
      totalCredit: openingBalance < 0 ? -openingBalance + totalCreditDuringPeriod : totalCreditDuringPeriod,
      balanceType: runningBalance >= 0 ? 'Dr' : 'Cr',
    };
  }, [selectedPartyId, dateRange, hydrated, getPartyTransactions, allMasters]);
  
  const selectedPartyDetails = allMasters.find(p => p.id === selectedPartyId);

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

          <CardContent className="flex flex-col flex-grow min-h-0 p-0">
             <ScrollArea className="h-full">
                <Table size="sm" className="whitespace-nowrap">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Particulars</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {financialLedgerData.entries.length <= 1 && <TableRow><TableCell colSpan={5} className="h-24 text-center">No transactions in this period.</TableCell></TableRow>}
                        {financialLedgerData.entries.map((entry) => (
                            <TableRow key={entry.id}>
                                <TableCell>{format(parseISO(entry.date), "dd-MM-yy")}</TableCell>
                                <TableCell className="flex items-center gap-2">
                                    <Badge variant="outline">{entry.type}</Badge>
                                    <span>{entry.particulars}</span>
                                </TableCell>
                                <TableCell className="text-right text-red-600">{entry.debit > 0 ? entry.debit.toLocaleString('en-IN', {minimumFractionDigits: 2}) : ''}</TableCell>
                                <TableCell className="text-right text-green-700">{entry.credit > 0 ? entry.credit.toLocaleString('en-IN', {minimumFractionDigits: 2}) : ''}</TableCell>
                                <TableCell className="text-right font-semibold">
                                    {Math.abs(entry.balance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {entry.balance >= 0 ? 'Dr' : 'Cr'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="font-bold bg-muted">
                            <TableCell colSpan={2}>Total</TableCell>
                            <TableCell className="text-right">{financialLedgerData.totalDebit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                            <TableCell className="text-right">{financialLedgerData.totalCredit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                            <TableCell className="text-right">
                                {Math.abs(financialLedgerData.closingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {financialLedgerData.balanceType}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>

          <CardFooter className="mt-4 pt-4 border-t-2 border-primary/50 flex justify-end">
              <div className="text-right font-bold text-lg">
                  <span>Closing Balance: </span>
                  <span className={financialLedgerData.balanceType === 'Dr' ? 'text-green-700' : 'text-red-700'}>
                      ₹{Math.abs(financialLedgerData.closingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {financialLedgerData.balanceType}
                  </span>
                  <p className="text-xs text-muted-foreground font-normal">({financialLedgerData.balanceType === 'Dr' ? 'Receivable from party' : 'Payable to party'})</p>
              </div>
          </CardFooter>
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
