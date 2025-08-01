
"use client";
import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, PurchaseReturn, SaleReturn, MasterItemType, LedgerEntry } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, subMonths, isBefore, subYears } from "date-fns";
import { BookCopy, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { useSearchParams, useRouter } from "next/navigation";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { purchaseMigrator, salesMigrator } from '@/lib/dataMigrators';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { MasterForm } from "@/components/app/masters/MasterForm";


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
  purchaseReturns: 'purchaseReturnsData',
  saleReturns: 'saleReturnsData',
  ledger: 'ledgerData',
};

interface DisplayLedgerEntry {
    id: string;
    date: string;
    type: string;
    particulars: string;
    debit: number;
    credit: number;
    transactionDetails?: React.ReactNode;
}

const initialFinancialLedgerData = {
  debitTransactions: [] as DisplayLedgerEntry[],
  creditTransactions: [] as DisplayLedgerEntry[],
  openingBalance: 0,
  closingBalance: 0,
  totalDebit: 0,
  totalCredit: 0,
  balanceType: 'Dr',
};

export function AccountsLedgerClient() {
  const { toast } = useToast();
  const [hydrated, setHydrated] = React.useState(false);
  
  const memoizedEmptyArray = React.useMemo(() => [], []);
  
  // Master data states
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(MASTERS_KEYS.customers, memoizedEmptyArray);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(MASTERS_KEYS.suppliers, memoizedEmptyArray);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(MASTERS_KEYS.agents, memoizedEmptyArray);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(MASTERS_KEYS.transporters, memoizedEmptyArray);
  const [brokers, setBrokers] = useLocalStorageState<MasterItem[]>(MASTERS_KEYS.brokers, memoizedEmptyArray);
  const [expenses, setExpenses] = useLocalStorageState<MasterItem[]>(MASTERS_KEYS.expenses, memoizedEmptyArray);

  // Transaction data states
  const [purchases] = useLocalStorageState<Purchase[]>(TRANSACTIONS_KEYS.purchases, memoizedEmptyArray, purchaseMigrator);
  const [sales] = useLocalStorageState<Sale[]>(TRANSACTIONS_KEYS.sales, memoizedEmptyArray, salesMigrator);
  const [payments] = useLocalStorageState<Payment[]>(TRANSACTIONS_KEYS.payments, memoizedEmptyArray);
  const [receipts] = useLocalStorageState<Receipt[]>(TRANSACTIONS_KEYS.receipts, memoizedEmptyArray);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(TRANSACTIONS_KEYS.purchaseReturns, memoizedEmptyArray);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(TRANSACTIONS_KEYS.saleReturns, memoizedEmptyArray);
  const [ledgerData] = useLocalStorageState<LedgerEntry[]>(TRANSACTIONS_KEYS.ledger, memoizedEmptyArray);


  const [selectedPartyId, setSelectedPartyId] = React.useState<string>("");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const { financialYear: currentFinancialYearString } = useSettings();

  const [isMasterFormOpen, setIsMasterFormOpen] = React.useState(false);
  const [masterItemToEdit, setMasterItemToEdit] = React.useState<MasterItem | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const partyIdFromQuery = searchParams.get('partyId');

  React.useEffect(() => {
    setHydrated(true);
  }, []);
  
  const allMasters = React.useMemo(() => {
    if (!hydrated) return [];
    return [...customers, ...suppliers, ...agents, ...transporters, ...brokers, ...expenses]
      .filter(item => item && item.id && item.name && item.type && item.type !== 'Warehouse')
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [hydrated, customers, suppliers, agents, transporters, brokers, expenses]);

  React.useEffect(() => {
    if (hydrated) {
      if (!dateRange) {
        const [startYearStr] = currentFinancialYearString.split('-');
        const startYear = parseInt(startYearStr, 10);
        if (!isNaN(startYear)) {
          setDateRange({ from: new Date(startYear, 3, 1), to: endOfDay(new Date(startYear + 1, 2, 31)) });
        } else {
          setDateRange({ from: startOfDay(subMonths(new Date(), 1)), to: endOfDay(new Date()) });
        }
      }
      
      if (partyIdFromQuery && allMasters.some(m => m.id === partyIdFromQuery) && selectedPartyId !== partyIdFromQuery) {
        setSelectedPartyId(partyIdFromQuery);
      }
    }
  }, [hydrated, currentFinancialYearString, partyIdFromQuery, dateRange, selectedPartyId, allMasters]);

  const partyOptions = React.useMemo(() => {
    return allMasters.map(p => ({ value: p.id, label: `${p.name} (${p.type})` }));
  }, [allMasters]);
  
  const getPartyTransactions = React.useCallback((partyId: string): DisplayLedgerEntry[] => {
    if (!partyId) return [];

    let transactions: DisplayLedgerEntry[] = [];
    
    // Purchases create a credit for the supplier/agent
    purchases.forEach(p => {
        if (p.supplierId === partyId || p.agentId === partyId) {
            transactions.push({
                id: `pur-goods-${p.id}`, date: p.date, type: 'Purchase',
                particulars: `Vakkal: ${p.items.map(i=>i.lotNumber).join(', ')} (To: ${p.agentName || p.supplierName})`,
                debit: 0, credit: p.totalAmount
            });
        }
    });

    // Sales create a debit for the customer/broker
    sales.forEach(s => {
        const accountablePartyId = s.brokerId || s.customerId;
        if(accountablePartyId === partyId) {
            transactions.push({
                id: `sale-goods-${s.id}`, date: s.date, type: 'Sale',
                particulars: `To: ${s.customerName} (Vakkal: ${s.items.map(i=>i.lotNumber).join(', ')})`,
                debit: s.billedAmount, credit: 0,
            });
        }
    });

    // Payments create a debit for the receiving party
    payments.filter(p => p.partyId === partyId).forEach(p => {
        const particularDetails = p.transactionType === 'On Account'
            ? `On Account Payment (${p.paymentMethod})`
            : `Payment via ${p.paymentMethod} against Bill(s): ${p.againstBills?.map(b => b.billId).join(', ') || 'N/A'}`;
        transactions.push({
            id: `pay-${p.id}`, date: p.date, type: 'Payment',
            particulars: particularDetails, debit: p.amount, credit: 0
        });
    });

    // Receipts create a credit for the paying party
    receipts.filter(r => r.partyId === partyId).forEach(r => {
        const particularDetails = r.transactionType === 'On Account'
            ? `On Account Receipt (${r.paymentMethod})`
            : `Receipt via ${r.paymentMethod} against Bill(s): ${r.againstBills?.map(b => b.billId).join(', ') || 'N/A'}`;
        transactions.push({
            id: `receipt-${r.id}`, date: r.date, type: 'Receipt',
            particulars: particularDetails, debit: 0, credit: r.amount + (r.cashDiscount || 0)
        });
    });

    // Purchase Returns create a debit for the supplier/agent
    purchaseReturns.forEach(pr => {
        const originalPurchase = purchases.find(p => p.id === pr.originalPurchaseId);
        if (!originalPurchase) return;
        const accountablePartyId = originalPurchase.agentId || originalPurchase.supplierId;
        if (accountablePartyId === partyId) {
            transactions.push({
                id: `pret-${pr.id}`, date: pr.date, type: 'Purchase Return',
                particulars: `Return of Vakkal: ${pr.originalLotNumber}`, debit: pr.returnAmount, credit: 0
            });
        }
    });

    // Sale Returns create a credit for the customer/broker
    saleReturns.forEach(sr => {
        const originalSale = sales.find(s => s.id === sr.originalSaleId);
        if (!originalSale) return;
        const accountablePartyId = originalSale.brokerId || originalSale.customerId;
        if (accountablePartyId === partyId) {
             transactions.push({
                id: `sret-${sr.id}`, date: sr.date, type: 'Sale Return',
                particulars: `Return from ${sr.originalCustomerName} of Vakkal: ${sr.originalLotNumber}`,
                debit: 0, credit: sr.returnAmount
            });
        }
    });
    
    // Add Expense Ledger entries linked to this party that are PENDING payment.
    // This creates a liability (credit) for the party.
    ledgerData.forEach(entry => {
        if (entry.partyId === partyId && entry.type === 'Expense' && entry.paymentMode === 'Pending') {
            transactions.push({
                id: entry.id,
                date: entry.date,
                type: 'Expense Payable',
                particulars: `${entry.account} (Vch: ${entry.relatedVoucher?.slice(-5) || 'N/A'})`,
                debit: 0, // An expense payable to a party is a credit on their account
                credit: entry.debit // The amount of the expense debit becomes a credit for the party
            });
        }
    });

    return transactions;
  }, [purchases, sales, payments, receipts, purchaseReturns, saleReturns, ledgerData]);

  const financialLedgerData = React.useMemo(() => {
    if (!selectedPartyId || !dateRange?.from || !hydrated) return initialFinancialLedgerData;
    const party = allMasters.find(p => p.id === selectedPartyId);
    if (!party) return initialFinancialLedgerData;
    
    const allPartyTransactions = getPartyTransactions(selectedPartyId);
    let openingBalance = party.openingBalance || 0;
    if (party.openingBalanceType === 'Cr') openingBalance = -openingBalance;

    allPartyTransactions.forEach(tx => {
      if (isBefore(parseISO(tx.date), startOfDay(dateRange.from!))) {
        openingBalance += (tx.debit - tx.credit);
      }
    });

    const periodTransactions = allPartyTransactions
        .filter(tx => isWithinInterval(parseISO(tx.date), { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to || dateRange.from!) }))
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime() || a.id.localeCompare(b.id));

    let debitTransactions: DisplayLedgerEntry[] = [];
    let creditTransactions: DisplayLedgerEntry[] = [];
    
    if (openingBalance > 0) {
        debitTransactions.push({ id: 'op_bal', date: format(dateRange.from, 'yyyy-MM-dd'), type: 'Opening Balance', particulars: 'Opening Balance', debit: openingBalance, credit: 0 });
    } else if (openingBalance < 0) {
        creditTransactions.push({ id: 'op_bal', date: format(dateRange.from, 'yyyy-MM-dd'), type: 'Opening Balance', particulars: 'Opening Balance', debit: 0, credit: -openingBalance });
    }

    periodTransactions.forEach(tx => {
        if (tx.debit > 0) debitTransactions.push({ ...tx });
        if (tx.credit > 0) creditTransactions.push({ ...tx });
    });

    const totalDebit = debitTransactions.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = creditTransactions.reduce((sum, e) => sum + e.credit, 0);
    const closingBalance = openingBalance + periodTransactions.reduce((acc, tx) => acc + tx.debit - tx.credit, 0);

    return {
      debitTransactions,
      creditTransactions,
      openingBalance,
      closingBalance,
      totalDebit,
      totalCredit,
      balanceType: closingBalance >= 0 ? 'Dr' : 'Cr',
    };
  }, [selectedPartyId, dateRange, hydrated, getPartyTransactions, allMasters]);
  
  const selectedPartyDetails = allMasters.find(p => p.id === selectedPartyId);

  const handlePartySelect = (value: string) => {
    setSelectedPartyId(value);
    router.push(value ? `/accounts-ledger?partyId=${value}` : '/accounts-ledger', { scroll: false });
  };
  
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
  
  const handleEditParty = (partyId: string) => {
    const partyToEdit = allMasters.find(p => p.id === partyId);
    if (partyToEdit) {
      setMasterItemToEdit(partyToEdit);
      setIsMasterFormOpen(true);
    }
  };

  const handleMasterFormSubmit = (updatedItem: MasterItem) => {
    const setters: Record<string, React.Dispatch<React.SetStateAction<MasterItem[]>>> = {
        'Customer': setCustomers,
        'Supplier': setSuppliers,
        'Agent': setAgents,
        'Transporter': setTransporters,
        'Broker': setBrokers,
        'Expense': setExpenses,
    };
    const setter = setters[updatedItem.type];
    if (setter) {
        setter(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i).sort((a,b) => a.name.localeCompare(b.name)));
        toast({ title: `${updatedItem.type} updated`, description: `Details for ${updatedItem.name} saved.` });
    }
    setIsMasterFormOpen(false);
    setMasterItemToEdit(null);
  };

  return (
    <TooltipProvider>
    <div className="space-y-6 print-area flex flex-col flex-1">
      <Card className="shadow-md no-print">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl font-bold text-foreground">Accounts Ledger</h1>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <MasterDataCombobox
                triggerId="accounts-ledger-party-selector-trigger"
                value={selectedPartyId}
                onChange={(value) => handlePartySelect(value || "")}
                options={partyOptions}
                placeholder="Select Party..."
                searchPlaceholder="Search parties..."
                notFoundMessage="No party found."
                className="h-11 text-base"
                onEdit={handleEditParty}
              />
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setDatePreset('1m')}>1M</Button>
                <Button variant="outline" size="sm" onClick={() => setDatePreset('3m')}>3M</Button>
                <Button variant="outline" size="sm" onClick={() => setDatePreset('6m')}>6M</Button>
                <Button variant="outline" size="sm" onClick={() => setDatePreset('1y')}>1Y</Button>
              </div>
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
            <CardTitle className="text-2xl text-primary flex items-center justify-center uppercase">
              <BookCopy className="mr-3 h-7 w-7 no-print" /> {selectedPartyDetails.name} ({selectedPartyDetails.type})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Period: {dateRange?.from ? format(dateRange.from, "dd/MM/yy") : 'Start'} to {dateRange?.to ? format(dateRange.to, "dd/MM/yy") : 'End'}
            </p>
          </CardHeader>

          <CardContent className="flex flex-col flex-grow min-h-0">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow min-h-0">
                {/* Debit Side */}
                <div className="md:col-span-1 flex flex-col">
                  <Card className="shadow-inner border-orange-300 flex flex-col flex-1">
                    <CardHeader className="p-0">
                      <CardTitle className="bg-orange-200 text-orange-800 text-center p-2 font-bold">DEBIT (Receivable / Paid)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow">
                        <ScrollArea className="h-full">
                            <Table size="sm" className="whitespace-nowrap">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Particulars</TableHead>
                                  <TableHead className="text-right">Amount (₹)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {financialLedgerData.debitTransactions.length === 0 ? (
                                  <TableRow><TableCell colSpan={3} className="h-24 text-center">No debit entries.</TableCell></TableRow>
                                ) : (
                                  financialLedgerData.debitTransactions.map(tx => (
                                    <TableRow key={tx.id}>
                                      <TableCell>{format(parseISO(tx.date), "dd/MM/yy")}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2 uppercase">
                                          <Badge variant="outline" className="uppercase">{tx.type}</Badge>
                                          {tx.transactionDetails ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="truncate max-w-xs cursor-help underline decoration-dashed">{tx.particulars}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {tx.transactionDetails}
                                                </TooltipContent>
                                            </Tooltip>
                                          ) : (
                                            <span>{tx.particulars}</span>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right font-medium">{tx.debit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                              <TableFooter>
                                <TableRow className="font-bold bg-orange-50">
                                  <TableCell colSpan={2}>Total</TableCell>
                                  <TableCell className="text-right">{financialLedgerData.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                              </TableFooter>
                            </Table>
                           <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
                {/* Credit Side */}
                <div className="md:col-span-1 flex flex-col">
                  <Card className="shadow-inner border-green-300 flex flex-col flex-1">
                    <CardHeader className="p-0">
                      <CardTitle className="bg-green-200 text-green-800 text-center p-2 font-bold">CREDIT (Payable / Received)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow">
                        <ScrollArea className="h-full">
                            <Table size="sm" className="whitespace-nowrap">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Particulars</TableHead>
                                  <TableHead className="text-right">Amount (₹)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {financialLedgerData.creditTransactions.length === 0 ? (
                                  <TableRow><TableCell colSpan={3} className="h-24 text-center">No credit entries.</TableCell></TableRow>
                                ) : (
                                  financialLedgerData.creditTransactions.map(tx => (
                                    <TableRow key={tx.id}>
                                      <TableCell>{format(parseISO(tx.date), "dd/MM/yy")}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2 uppercase">
                                            <Badge variant="secondary" className="uppercase">{tx.type}</Badge>
                                            {tx.transactionDetails ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="truncate max-w-xs cursor-help underline decoration-dashed">{tx.particulars}</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {tx.transactionDetails}
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (
                                                <span>{tx.particulars}</span>
                                            )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right font-medium">{tx.credit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                              <TableFooter>
                                <TableRow className="font-bold bg-green-50">
                                  <TableCell colSpan={2}>Total</TableCell>
                                  <TableCell className="text-right">{financialLedgerData.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                              </TableFooter>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
            </div>
          </CardContent>

          <CardFooter className="mt-4 pt-4 border-t-2 border-primary/50 flex justify-end">
              <div className="text-right font-bold text-lg">
                  <span>Closing Balance: </span>
                  <span className={financialLedgerData.balanceType === 'Dr' ? 'text-green-700' : 'text-red-700'}>
                      ₹{Math.abs(financialLedgerData.closingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {financialLedgerData.balanceType}
                  </span>
                  <p className="text-xs text-muted-foreground font-normal uppercase">({financialLedgerData.balanceType === 'Dr' ? 'Receivable from party' : 'Payable to party'})</p>
              </div>
          </CardFooter>
        </Card>
      ) : (
        <Card
          className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 min-h-[300px] flex items-center justify-center no-print cursor-pointer hover:bg-muted/30 transition-colors flex-1"
          onClick={() => {
            const trigger = document.getElementById('accounts-ledger-party-selector-trigger');
            trigger?.click();
          }}
        >
          <div className="text-center">
            <BookCopy className="h-16 w-16 text-accent mb-4 mx-auto" />
            <p className="text-xl text-muted-foreground uppercase">
              {allMasters.length === 0 && hydrated ? "No parties found." : "Please select a party to view their accounts ledger."}
            </p>
            <p className="text-sm text-muted-foreground mt-2 uppercase">(Click here to select)</p>
          </div>
        </Card>
      )}
       {isMasterFormOpen && (
        <MasterForm
            isOpen={isMasterFormOpen}
            onClose={() => { setIsMasterFormOpen(false); setMasterItemToEdit(null); }}
            onSubmit={handleMasterFormSubmit}
            initialData={masterItemToEdit}
            itemTypeFromButton={masterItemToEdit?.type || 'Customer'}
            fixedIds={allMasters.filter(m => ['fixed-wh-mumbai', 'fixed-wh-chiplun', 'fixed-wh-sawantwadi'].includes(m.id) || FIXED_EXPENSES.some(fe => fe.id === m.id)).map(m => m.id)}
        />
      )}
    </div>
    </TooltipProvider>
  );
}
