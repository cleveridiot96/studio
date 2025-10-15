
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
import { BookCopy, Printer, Download, Search } from "lucide-react";
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
import { FIXED_EXPENSES, FIXED_WAREHOUSES } from '@/lib/constants';
import { useMasterData } from '@/contexts/MasterDataContext';
import { AccountStatementPrint } from "./AccountStatementPrint";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Input } from "@/components/ui/input";

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
  const { isAppHydrating } = useSettings();
  const { getAllMasters, setData: setMasterData } = useMasterData();
  
  const memoizedEmptyArray = React.useMemo(() => [], []);
  
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

  const [pdfData, setPdfData] = React.useState<any>(null);
  const printRef = React.useRef<HTMLDivElement>(null);

  const [debitSearch, setDebitSearch] = React.useState('');
  const [creditSearch, setCreditSearch] = React.useState('');

  const searchParams = useSearchParams();
  const router = useRouter();
  const partyIdFromQuery = searchParams.get('partyId');
  
  const allMasters = React.useMemo(() => getAllMasters(), [getAllMasters]);

  React.useEffect(() => {
    if (isAppHydrating) return;
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
  }, [isAppHydrating, currentFinancialYearString, partyIdFromQuery, dateRange, selectedPartyId, allMasters]);

  const partyOptions = React.useMemo(() => {
    return allMasters.map(p => ({ value: p.id, label: `${p.name} (${p.type})` }));
  }, [allMasters]);
  
  const financialLedgerData = React.useMemo(() => {
    if (!selectedPartyId || !dateRange?.from || isAppHydrating) return initialFinancialLedgerData;

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
                const primaryCreditorId = tx.agentId || tx.supplierId;
                if(primaryCreditorId === party.id) {
                    openingBalance -= (tx.totalAmount || 0);
                } else if(tx.supplierId === party.id) {
                }
            } else if (tx.txType === 'Payment' && tx.partyId === party.id) {
                openingBalance += tx.amount;
            } else if (tx.txType === 'Receipt' && tx.partyId === party.id) {
                openingBalance -= (tx.amount + (tx.cashDiscount || 0));
            } else if (tx.txType === 'PurchaseReturn') {
                const originalPurchase = purchases.find(p => p.id === tx.originalPurchaseId);
                if (originalPurchase) {
                    const primaryCreditorId = originalPurchase.agentId || originalPurchase.supplierId;
                    if(primaryCreditorId === party.id) {
                        openingBalance += tx.returnAmount;
                    }
                }
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
            const results: DisplayLedgerEntry[] = [];
            if (tx.txType === 'Sale') {
                const primaryDebtorId = tx.brokerId || tx.customerId;
                if (primaryDebtorId === party.id) {
                    results.push({ id: `sale-goods-${tx.id}`, date: tx.date, type: 'Sale', particulars: `TO: ${tx.customerName} (BILL: ${tx.billNumber || 'N/A'})`, debit: tx.billedAmount, credit: 0, href: `/sales#${tx.id}` });
                }
                if (tx.customerId === party.id && tx.brokerId && party.id !== tx.brokerId) {
                    const brokerName = allMasters.find(m => m.id === tx.brokerId)?.name || 'Unknown Broker';
                    results.push({ id: `sale-info-${tx.id}`, date: tx.date, type: 'Sale Info', particulars: `VIA: ${brokerName} (BILL: ${tx.billNumber || 'N/A'})`, debit: 0, credit: 0, href: `/sales#${tx.id}` });
                }
                const brokerCommission = tx.expenses?.find(e => e.account === 'Broker Commission')?.amount || 0;
                if (tx.brokerId === party.id && brokerCommission > 0) {
                    results.push({ id: `sale-comm-${tx.id}`, date: tx.date, type: 'Sale Commission', particulars: `COMM. FOR BILL: ${tx.billNumber || 'N/A'}`, debit: 0, credit: brokerCommission, href: `/sales#${tx.id}` });
                }
            } else if (tx.txType === 'Purchase') {
                 const primaryCreditorId = tx.agentId || tx.supplierId;
                 if(primaryCreditorId === party.id) {
                    results.push({ id: `pur-goods-${tx.id}`, date: tx.date, type: 'Purchase', particulars: `FROM: ${tx.supplierName} (LOTS: ${tx.items.map(i=>i.lotNumber).join(', ')})`, debit: 0, credit: tx.totalAmount, href: `/purchases#${tx.id}` });
                 }
                 if(tx.supplierId === party.id && tx.agentId && party.id !== tx.agentId) {
                    const agentName = allMasters.find(m => m.id === tx.agentId)?.name || 'Unknown Agent';
                    results.push({ id: `pur-info-${tx.id}`, date: tx.date, type: 'Purchase Info', particulars: `VIA: ${agentName}`, debit: 0, credit: 0, href: `/purchases#${tx.id}` });
                 }
            } else if (tx.txType === 'Payment' && tx.partyId === party.id) {
                const particularDetails = tx.transactionType === 'On Account' ? `ON ACCOUNT PAYMENT (${tx.paymentMethod})` : `PAYMENT VIA ${tx.paymentMethod} AGAINST BILL(S): ${tx.againstBills?.map(b => b.billId).join(', ') || 'N/A'}`;
                results.push({ id: `pay-${tx.id}`, date: tx.date, type: 'Payment', particulars: particularDetails, debit: tx.amount, credit: 0, href: `/payments#${tx.id}` });
            } else if (tx.txType === 'Receipt' && tx.partyId === party.id) {
                const particularDetails = tx.transactionType === 'On Account' ? `ON ACCOUNT RECEIPT (${tx.paymentMethod})` : `RECEIPT VIA ${tx.paymentMethod} AGAINST BILL(S): ${tx.againstBills?.map(b => b.billId).join(', ') || 'N/A'}`;
                results.push({ id: `receipt-${tx.id}`, date: tx.date, type: 'Receipt', particulars: particularDetails, debit: 0, credit: tx.amount + (tx.cashDiscount || 0), href: `/receipts#${tx.id}` });
            } else if (tx.txType === 'PurchaseReturn') {
                 const originalPurchase = purchases.find(p => p.id === tx.originalPurchaseId);
                 if(originalPurchase) {
                     const primaryCreditorId = originalPurchase.agentId || originalPurchase.supplierId;
                     if(primaryCreditorId === party.id) {
                        results.push({ id: `pret-${tx.id}`, date: tx.date, type: 'Purchase Return', particulars: `RETURN OF VAKKAL: ${tx.originalLotNumber}`, debit: tx.returnAmount, credit: 0, href: `/purchases#${tx.originalPurchaseId}` });
                     }
                 }
            } else if (tx.txType === 'SaleReturn') {
                 const originalSale = sales.find(s => s.id === tx.originalSaleId);
                 if (originalSale) {
                    const primaryDebtorId = originalSale.brokerId || originalSale.customerId;
                    if(primaryDebtorId === party.id) {
                      results.push({ id: `sret-${tx.id}`, date: tx.date, type: 'Sale Return', particulars: `RETURN FROM ${tx.originalCustomerName} OF VAKKAL: ${tx.originalLotNumber}`, debit: 0, credit: tx.returnAmount, href: `/sales#${tx.originalSaleId}` });
                    }
                 }
            } else if (tx.txType === 'LedgerEntry' && tx.partyId === party.id) {
                results.push({ id: tx.id, date: tx.date, type: tx.type, particulars: `${tx.account} (VCH: ${tx.relatedVoucher?.slice(-5) || 'N/A'})`, debit: tx.debit, credit: tx.credit, href: tx.linkedTo?.voucherType === 'Transfer' ? '/location-transfer' : tx.linkedTo?.voucherType === 'Purchase' ? '/purchases' : '/sales' });
            }
            return results;
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
  }, [selectedPartyId, dateRange, isAppHydrating, allMasters, purchases, sales, payments, receipts, purchaseReturns, saleReturns, ledgerData]);

  const filteredDebitTransactions = React.useMemo(() => {
    if (!debitSearch) return financialLedgerData.debitTransactions;
    const lowerCaseSearch = debitSearch.toLowerCase();
    return financialLedgerData.debitTransactions.filter(tx => 
        tx.particulars.toLowerCase().includes(lowerCaseSearch) ||
        tx.type.toLowerCase().includes(lowerCaseSearch) ||
        tx.debit.toString().includes(lowerCaseSearch)
    );
  }, [financialLedgerData.debitTransactions, debitSearch]);

  const filteredCreditTransactions = React.useMemo(() => {
    if (!creditSearch) return financialLedgerData.creditTransactions;
    const lowerCaseSearch = creditSearch.toLowerCase();
    return financialLedgerData.creditTransactions.filter(tx => 
        tx.particulars.toLowerCase().includes(lowerCaseSearch) ||
        tx.type.toLowerCase().includes(lowerCaseSearch) ||
        tx.credit.toString().includes(lowerCaseSearch)
    );
  }, [financialLedgerData.creditTransactions, creditSearch]);

  const totalFilteredDebit = React.useMemo(() => filteredDebitTransactions.reduce((sum, tx) => sum + tx.debit, 0), [filteredDebitTransactions]);
  const totalFilteredCredit = React.useMemo(() => filteredCreditTransactions.reduce((sum, tx) => sum + tx.credit, 0), [filteredCreditTransactions]);

  
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
    setMasterData(updatedItem.type, prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i).sort((a, b) => a.name.localeCompare(b.name)));
    toast({ title: `${updatedItem.type} updated`, description: `Details for ${updatedItem.name} saved.` });
    setIsMasterFormOpen(false);
    setMasterItemToEdit(null);
  };
  
  const triggerDownloadPdf = React.useCallback(() => {
    if (selectedPartyDetails && dateRange?.from && dateRange.to) {
        setPdfData({
            partyDetails: selectedPartyDetails,
            dateRange: dateRange,
            ledgerData: financialLedgerData,
        });
    } else {
        toast({ title: 'Cannot Generate PDF', description: 'Please select a party and date range first.', variant: 'destructive' });
    }
  }, [selectedPartyDetails, dateRange, financialLedgerData, toast]);

  React.useEffect(() => {
    if (pdfData && printRef.current) {
        const generatePdf = async () => {
            const elementToCapture = printRef.current?.querySelector('.print-chitti-styles') as HTMLElement;
            if (!elementToCapture) {
                toast({ title: "PDF Error", description: "Statement content not found.", variant: "destructive" });
                setPdfData(null);
                return;
            }
            try {
                const canvas = await html2canvas(elementToCapture, { scale: 1.5, useCORS: true, width: 550, height: elementToCapture.scrollHeight, logging: false });
                const imgData = canvas.toDataURL('image/jpeg', 0.85);
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5', compress: true });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgProps = pdf.getImageProperties(imgData);
                const margin = 10;
                let contentWidth = pdfWidth - 2 * margin;
                let contentHeight = (contentWidth * imgProps.height) / imgProps.width;
                let heightLeft = contentHeight;
                let position = margin;
                
                pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
                heightLeft -= (pdfHeight - (2 * margin));
                
                while(heightLeft > 0) {
                    position = margin - heightLeft;
                    pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
                    heightLeft -= (pdfHeight - (2*margin));
                }

                const timestamp = format(new Date(), 'ddMMyy_HHmm');
                pdf.save(`Statement_${pdfData.partyDetails.name.replace(/[\/\s.]/g, '_')}_${timestamp}.pdf`);
                toast({ title: "PDF Generated", description: `Statement for ${pdfData.partyDetails.name} downloaded.` });
            } catch(err) {
                console.error("PDF Generation Error:", err);
                toast({ title: "PDF Generation Failed", variant: "destructive"});
            } finally {
                setPdfData(null);
            }
        };
        const timer = setTimeout(generatePdf, 300);
        return () => clearTimeout(timer);
    }
  }, [pdfData, toast]);

  if (isAppHydrating) {
      return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p className="text-lg text-muted-foreground">Loading accounts ledger...</p></div>
  }

  return (
    <TooltipProvider>
    <div className="space-y-4 print-area flex flex-col h-[calc(100vh-8rem)]">
      <Card className="shadow-md no-print flex-shrink-0">
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
              <Button variant="outline" size="icon" onClick={triggerDownloadPdf} title="Download PDF">
                <Download className="h-5 w-5" /><span className="sr-only">Download PDF</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {selectedPartyId && selectedPartyDetails ? (
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
            {/* Debit Side */}
            <Card className="shadow-lg flex flex-col">
                <CardHeader className="p-4 border-b">
                    <CardTitle className="text-xl text-orange-800">DEBIT (Receivable / Paid)</CardTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search debits..." value={debitSearch} onChange={e => setDebitSearch(e.target.value)} className="pl-9 h-9" />
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-grow min-h-0">
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Particulars</TableHead>
                                    <TableHead className="text-right">Amount (₹)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDebitTransactions.length === 0 ? (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center">No debit entries.</TableCell></TableRow>
                                ) : (
                                filteredDebitTransactions.map(tx => (
                                    <TableRow key={tx.id} onClick={() => tx.href && router.push(tx.href)} className={tx.href ? 'cursor-pointer hover:bg-orange-50' : ''}>
                                    <TableCell>{format(parseISO(tx.date), "dd/MM/yy")}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 uppercase">
                                        <Badge variant="outline" className="uppercase">{tx.type}</Badge>
                                        <span>{tx.particulars}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{tx.debit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                    </TableRow>
                                ))
                                )}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="font-bold bg-orange-50">
                                <TableCell colSpan={2}>Total Debits</TableCell>
                                <TableCell className="text-right">{totalFilteredDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                        <ScrollBar orientation="vertical" />
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Credit Side */}
            <Card className="shadow-lg flex flex-col">
                <CardHeader className="p-4 border-b">
                    <CardTitle className="text-xl text-green-800">CREDIT (Payable / Received)</CardTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search credits..." value={creditSearch} onChange={e => setCreditSearch(e.target.value)} className="pl-9 h-9" />
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-grow min-h-0">
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Particulars</TableHead>
                                <TableHead className="text-right">Amount (₹)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCreditTransactions.length === 0 ? (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center">No credit entries.</TableCell></TableRow>
                                ) : (
                                filteredCreditTransactions.map(tx => (
                                    <TableRow key={tx.id} onClick={() => tx.href && router.push(tx.href)} className={tx.href ? 'cursor-pointer hover:bg-green-50' : ''}>
                                    <TableCell>{format(parseISO(tx.date), "dd/MM/yy")}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 uppercase">
                                        <Badge variant="secondary" className="uppercase">{tx.type}</Badge>
                                        <span>{tx.particulars}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{tx.credit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                    </TableRow>
                                ))
                                )}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="font-bold bg-green-50">
                                <TableCell colSpan={2}>Total Credits</TableCell>
                                <TableCell className="text-right">{totalFilteredCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                        <ScrollBar orientation="vertical" />
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card className="md:col-span-2 mt-4 p-4 flex justify-between items-center bg-primary/5">
                <div className="text-left">
                    <p className="text-sm text-muted-foreground uppercase">Opening Balance</p>
                    <p className="text-lg font-bold">₹{Math.abs(financialLedgerData.openingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {financialLedgerData.openingBalance >= 0 ? 'Dr' : 'Cr'}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground uppercase">Closing Balance ({financialLedgerData.balanceType === 'Dr' ? 'Receivable' : 'Payable'})</p>
                    <p className={`text-2xl font-bold ${financialLedgerData.balanceType === 'Dr' ? 'text-green-700' : 'text-red-700'}`}>
                        ₹{Math.abs(financialLedgerData.closingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {financialLedgerData.balanceType}
                    </p>
                </div>
            </Card>
        </div>
      ) : (
        <Card
          className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 flex-grow flex items-center justify-center no-print cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => {
            const trigger = document.getElementById('accounts-ledger-party-selector-trigger');
            trigger?.click();
          }}
        >
          <div className="text-center">
            <BookCopy className="h-16 w-16 text-accent mb-4 mx-auto" />
            <p className="text-xl text-muted-foreground uppercase">
              {allMasters.length === 0 && isAppHydrating ? "No parties found." : "Please select a party to view their accounts ledger."}
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
      <div ref={printRef} className="fixed left-[-9999px] top-0 z-[-1] p-1 bg-white" aria-hidden="true">
        {pdfData && <AccountStatementPrint {...pdfData} />}
      </div>
    </div>
    </TooltipProvider>
  );
}
