
"use client";
import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, PurchaseReturn, SaleReturn, MasterItemType, LedgerEntry, Agent, Broker } from "@/lib/types";
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
import { FIXED_EXPENSES, FIXED_WAREHOUSES } from "@/lib/constants";


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
    href?: string;
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
  const [agents, setAgents] = useLocalStorageState<Agent[]>(MASTERS_KEYS.agents, memoizedEmptyArray);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(MASTERS_KEYS.transporters, memoizedEmptyArray);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(MASTERS_KEYS.brokers, memoizedEmptyArray);
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
  
  const financialLedgerData = React.useMemo(() => {
    if (!selectedPartyId || !dateRange?.from || !hydrated) return initialFinancialLedgerData;

    const party = allMasters.find(p => p.id === selectedPartyId);
    if (!party) return initialFinancialLedgerData;

    let openingBalance = party.openingBalanceType === 'Cr' ? -(party.openingBalance || 0) : (party.openingBalance || 0);

    const allTransactions = [
        ...purchases.map(p => ({ ...p, txType: 'Purchase' as const })),
        ...sales.map(s => ({ ...s, txType: 'Sale' as const })),
        ...payments.map(p => ({ ...p, txType: 'Payment' as const })),
        ...receipts.map(r => ({ ...r, txType: 'Receipt' as const })),
        ...purchaseReturns.map(pr => ({ ...pr, txType: 'PurchaseReturn' as const })),
        ...saleReturns.map(sr => ({ ...sr, txType: 'SaleReturn' as const })),
        ...ledgerData.map(l => ({ ...l, txType: 'LedgerEntry' as const }))
    ].sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());


    // Calculate opening balance by summing up all transactions before the start date
    allTransactions.forEach(tx => {
        if (isBefore(parseISO(tx.date), startOfDay(dateRange.from!))) {
            if (tx.txType === 'Sale') {
                const primaryDebtorId = tx.brokerId || tx.customerId;
                if (primaryDebtorId === party.id) {
                    openingBalance += tx.billedAmount || 0;
                }
                const brokerCommission = tx.expenses?.find(e => e.account === 'Broker Commission')?.amount || 0;
                if (tx.brokerId === party.id && brokerCommission > 0) {
                    openingBalance -= brokerCommission;
                }
            } else if (tx.txType === 'Purchase') {
                 if (tx.supplierId === party.id) {
                    openingBalance -= (tx.totalGoodsValue || 0);
                }
                const agentCommission = tx.expenses?.find(e => e.account === 'Broker Commission')?.amount || 0;
                if (tx.agentId === party.id && agentCommission > 0) {
                    openingBalance -= agentCommission;
                }
                tx.expenses?.forEach(exp => {
                    if (exp.account !== 'Broker Commission' && exp.partyId === party.id && exp.amount > 0) {
                        openingBalance -= exp.amount;
                    }
                });
            } else if (tx.txType === 'Payment' && tx.partyId === party.id) {
                openingBalance += tx.amount;
            } else if (tx.txType === 'Receipt' && tx.partyId === party.id) {
                openingBalance -= (tx.amount + (tx.cashDiscount || 0));
            } else if (tx.txType === 'PurchaseReturn' && tx.originalSupplierId === party.id) {
                openingBalance += tx.returnAmount;
            } else if (tx.txType === 'SaleReturn') {
                const originalSale = sales.find(s => s.id === tx.originalSaleId);
                if (originalSale) {
                    const primaryDebtorId = originalSale.brokerId || originalSale.customerId;
                    if (primaryDebtorId === party.id) {
                      openingBalance -= tx.returnAmount;
                    }
                }
            } else if (tx.txType === 'LedgerEntry' && tx.partyId === party.id) {
                openingBalance += (tx.debit - tx.credit);
            }
        }
    });

    const periodTransactions = allTransactions
        .filter(tx => isWithinInterval(parseISO(tx.date), { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to || dateRange.from!) }))
        .flatMap(tx => {
            if (tx.txType === 'Sale') {
                const results: DisplayLedgerEntry[] = [];
                const primaryDebtorId = tx.brokerId || tx.customerId;

                // If the selected party is the primary debtor (broker or direct customer)
                if (primaryDebtorId === party.id) {
                  results.push({ id: `sale-goods-${tx.id}`, date: tx.date, type: 'Sale', particulars: `TO: ${tx.customerName} (BILL: ${tx.billNumber || 'N/A'})`, debit: tx.billedAmount, credit: 0, href: `/sales#${tx.id}` });
                }
                
                // If the selected party IS the customer, but the sale was via a broker, show an informational entry.
                if (tx.customerId === party.id && tx.brokerId && party.id !== tx.brokerId) {
                    const brokerName = allMasters.find(m => m.id === tx.brokerId)?.name || 'Unknown Broker';
                    results.push({ id: `sale-info-${tx.id}`, date: tx.date, type: 'Sale Info', particulars: `VIA: ${brokerName} (BILL: ${tx.billNumber || 'N/A'})`, debit: 0, credit: 0, href: `/sales#${tx.id}` });
                }
                
                // If the selected party is the broker, add their commission as a credit (a liability for us).
                const brokerCommission = tx.expenses?.find(e => e.account === 'Broker Commission')?.amount || 0;
                if (tx.brokerId === party.id && brokerCommission > 0) {
                  results.push({ id: `sale-comm-${tx.id}`, date: tx.date, type: 'Sale Commission', particulars: `COMM. FOR BILL: ${tx.billNumber || 'N/A'}`, debit: 0, credit: brokerCommission, href: `/sales#${tx.id}` });
                }
                return results;
            } else if (tx.txType === 'Purchase') {
                const results: DisplayLedgerEntry[] = [];
                // Liability to supplier for goods
                if(tx.supplierId === party.id) {
                  results.push({ id: `pur-goods-${tx.id}`, date: tx.date, type: 'Purchase', particulars: `VAKKAL: ${tx.items.map(i=>i.lotNumber).join(', ')}`, debit: 0, credit: tx.totalGoodsValue, href: `/purchases#${tx.id}` });
                }
                // Liability to agent for commission
                const agentCommission = tx.expenses?.find(e => e.account === 'Broker Commission')?.amount || 0;
                if(tx.agentId === party.id && agentCommission > 0) {
                  results.push({ id: `pur-comm-${tx.id}`, date: tx.date, type: 'Purchase Commission', particulars: `COMM. FOR VAKKAL: ${tx.items.map(i=>i.lotNumber).join(', ')}`, debit: 0, credit: agentCommission, href: `/purchases#${tx.id}` });
                }
                 // Other expenses
                 tx.expenses?.forEach(exp => {
                  if (exp.account !== 'Broker Commission' && exp.partyId === party.id && exp.amount > 0) {
                      results.push({ id: `pur-exp-${tx.id}-${exp.account.replace(' ','')}`, date: tx.date, type: 'Purchase Expense', particulars: `EXP: ${exp.account}`, debit: 0, credit: exp.amount, href: `/purchases#${tx.id}` });
                  }
                });
                return results;
            } else if (tx.txType === 'Payment' && tx.partyId === party.id) {
                const particularDetails = tx.transactionType === 'On Account' ? `ON ACCOUNT PAYMENT (${tx.paymentMethod})` : `PAYMENT VIA ${tx.paymentMethod} AGAINST BILL(S): ${tx.againstBills?.map(b => b.billId).join(', ') || 'N/A'}`;
                return [{ id: `pay-${tx.id}`, date: tx.date, type: 'Payment', particulars: particularDetails, debit: tx.amount, credit: 0, href: `/payments#${tx.id}` }];
            } else if (tx.txType === 'Receipt' && tx.partyId === party.id) {
                const particularDetails = tx.transactionType === 'On Account' ? `ON ACCOUNT RECEIPT (${tx.paymentMethod})` : `RECEIPT VIA ${tx.paymentMethod} AGAINST BILL(S): ${tx.againstBills?.map(b => b.billId).join(', ') || 'N/A'}`;
                return [{ id: `receipt-${tx.id}`, date: tx.date, type: 'Receipt', particulars: particularDetails, debit: 0, credit: tx.amount + (tx.cashDiscount || 0), href: `/receipts#${tx.id}` }];
            } else if (tx.txType === 'PurchaseReturn' && tx.originalSupplierId === party.id) {
                return [{ id: `pret-${tx.id}`, date: tx.date, type: 'Purchase Return', particulars: `RETURN OF VAKKAL: ${tx.originalLotNumber}`, debit: tx.returnAmount, credit: 0, href: `/purchases#${tx.originalPurchaseId}` }];
            } else if (tx.txType === 'SaleReturn') {
                 const originalSale = sales.find(s => s.id === tx.originalSaleId);
                 if (originalSale) {
                    const primaryDebtorId = originalSale.brokerId || originalSale.customerId;
                    if(primaryDebtorId === party.id) {
                      return [{ id: `sret-${tx.id}`, date: tx.date, type: 'Sale Return', particulars: `RETURN FROM ${tx.originalCustomerName} OF VAKKAL: ${tx.originalLotNumber}`, debit: 0, credit: tx.returnAmount, href: `/sales#${tx.originalSaleId}` }];
                    }
                 }
            } else if (tx.txType === 'LedgerEntry' && tx.partyId === party.id) {
                return [{ id: tx.id, date: tx.date, type: tx.type, particulars: `${tx.account} (VCH: ${tx.relatedVoucher?.slice(-5) || 'N/A'})`, debit: tx.debit, credit: tx.credit, href: tx.linkedTo?.voucherType === 'Transfer' ? '/location-transfer' : tx.linkedTo?.voucherType === 'Purchase' ? '/purchases' : '/sales' }];
            }
            return [];
        })
        .filter(Boolean) as DisplayLedgerEntry[];

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
  }, [selectedPartyId, dateRange, hydrated, allMasters, purchases, sales, payments, receipts, purchaseReturns, saleReturns, ledgerData]);
  
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
    const setters: Record<string, React.Dispatch<React.SetStateAction<any[]>>> = {
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
    <div className="space-y-4 print-area flex flex-col flex-1">
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
                                    <TableRow key={tx.id} onClick={() => tx.href && router.push(tx.href)} className={tx.href ? 'cursor-pointer hover:bg-orange-100' : ''}>
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
                                    <TableRow key={tx.id} onClick={() => tx.href && router.push(tx.href)} className={tx.href ? 'cursor-pointer hover:bg-green-100' : ''}>
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
            fixedIds={[...FIXED_WAREHOUSES.map(w=>w.id), ...FIXED_EXPENSES.map(e=>e.id)]}
        />
      )}
    </div>
    </TooltipProvider>
  );
}

    