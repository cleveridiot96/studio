"use client";
import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, MasterItemType } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { addDays, format, parseISO, startOfDay, endOfDay, isWithinInterval, subMonths } from "date-fns";
import { BookUser, CalendarRange, Printer, Download } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSearchParams, useRouter } from "next/navigation";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const MASTERS_KEYS = {
  customers: 'masterCustomers',
  suppliers: 'masterSuppliers',
  agents: 'masterAgents',
  transporters: 'masterTransporters',
  brokers: 'masterBrokers',
  warehouses: 'masterWarehouses',
};
const TRANSACTIONS_KEYS = {
  purchases: 'purchasesData',
  sales: 'salesData',
  payments: 'paymentsData',
  receipts: 'receiptsData',
};

interface LedgerTransaction {
  date: string; 
  type: string; 
  refNo?: string; 
  particulars: string;
  debit?: number;
  credit?: number;
  relatedDocId: string; 
  rate?: number; 
  netWeight?: number; 
  transactionAmount?: number; 
}

interface LedgerEntryWithBalance extends LedgerTransaction {
  balance: number;
}

const initialLedgerData = { entries: [] as LedgerEntryWithBalance[], openingBalance: 0, closingBalance: 0, totalDebit: 0, totalCredit: 0 };

export function LedgerClient() {
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
  const ledgerTableRef = React.useRef<HTMLTableElement>(null);

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
            const parsedDataArray = JSON.parse(data);
            if (Array.isArray(parsedDataArray)) {
              parsedDataArray.forEach(item => {
                if (item && typeof item === 'object' && item.id && typeof item.id === 'string' && item.name && typeof item.name === 'string' && item.type && typeof item.type === 'string') {
                  loadedMasters.push(item as MasterItem);
                }
              });
            }
          } catch (e) {
            console.error("Failed to parse master data from localStorage for key:", key, e);
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
            setDateRange({ from: startOfDay(subMonths(new Date(), 3)), to: endOfDay(new Date()) });
        }
      }

      const partyIdFromQuery = searchParams.get('partyId');
      if (partyIdFromQuery && loadedMasters.some(m => m.id === partyIdFromQuery)) {
        setSelectedPartyId(partyIdFromQuery);
      }
    }
  }, [hydrated, currentFinancialYearString, searchParams, dateRange]); // Added dateRange here


  const ledgerTransactions = React.useMemo(() => {
    if (!selectedPartyId || !dateRange?.from || !dateRange?.to || !hydrated) {
      return initialLedgerData;
    }

    const party = allMasters.find(m => m.id === selectedPartyId); 
    if (!party) return initialLedgerData;

    const partyTransactions: LedgerTransaction[] = [];

    purchases.forEach(p => {
      if (p.supplierId === selectedPartyId && party.type === 'Supplier') {
        partyTransactions.push({ 
          relatedDocId: p.id, date: p.date, type: 'Purchase', refNo: p.lotNumber, 
          particulars: `By Goods Purchased (Lot: ${p.lotNumber})`, 
          credit: p.totalAmount,
          rate: p.rate, netWeight: p.netWeight, transactionAmount: p.totalAmount
        });
      }
      if (p.agentId === selectedPartyId && party.type === 'Agent') {
        const agentMasterData = allMasters.find(a => a.id === p.agentId && a.type === 'Agent');
        const agentCommissionAmount = agentMasterData?.commission && p.netWeight && p.rate
            ? (p.netWeight * p.rate * (agentMasterData.commission / 100)) 
            : 0;
        if (agentCommissionAmount > 0) partyTransactions.push({ 
            relatedDocId: p.id, date: p.date, type: 'Agent Comm.', refNo: p.lotNumber, 
            particulars: `By Comm. on Purchase Lot ${p.lotNumber} (Sup: ${p.supplierName || p.supplierId})`, 
            credit: agentCommissionAmount, 
            transactionAmount: agentCommissionAmount,
            rate: p.rate, netWeight: p.netWeight 
        });
      }
      if (p.transporterId === selectedPartyId && party.type === 'Transporter' && p.transportRate) {
        partyTransactions.push({ 
            relatedDocId: p.id, date: p.date, type: 'Transport Exp.', refNo: p.lotNumber, 
            particulars: `By Transport for Purchase Lot ${p.lotNumber}`, 
            credit: p.transportRate,
            transactionAmount: p.transportRate
        });
      }
    });

    sales.forEach(s => {
      if (s.customerId === selectedPartyId && party.type === 'Customer') {
        partyTransactions.push({ 
            relatedDocId: s.id, date: s.date, type: 'Sale', refNo: s.billNumber, 
            particulars: `To Goods Sold (Bill: ${s.billNumber || s.id}, Lot: ${s.lotNumber})`, 
            debit: s.totalAmount,
            rate: s.rate, netWeight: s.netWeight, transactionAmount: s.totalAmount
        });
      }
      if (s.brokerId === selectedPartyId && party.type === 'Broker' && s.calculatedBrokerageCommission) { 
        if (s.calculatedBrokerageCommission > 0) partyTransactions.push({ 
            relatedDocId: s.id, date: s.date, type: 'Brokerage Exp.', refNo: s.billNumber, 
            particulars: `By Brokerage on Sale ${s.billNumber || s.id} (Cust: ${s.customerName || s.customerId})`, 
            credit: s.calculatedBrokerageCommission,
            transactionAmount: s.calculatedBrokerageCommission,
            rate: s.rate, netWeight: s.netWeight
        });
      }
       if (s.transporterId === selectedPartyId && party.type === 'Transporter' && s.transportCost) { 
        partyTransactions.push({ 
            relatedDocId: s.id, date: s.date, type: 'Transport Exp.', refNo: s.billNumber, 
            particulars: `By Transport for Sale ${s.billNumber || s.id}`, 
            credit: s.transportCost,
            transactionAmount: s.transportCost
        });
      }
    });

    payments.forEach(pm => {
      if (pm.partyId === selectedPartyId) {
        partyTransactions.push({ 
            relatedDocId: pm.id, date: pm.date, type: 'Payment', refNo: pm.referenceNo, 
            particulars: `To ${pm.paymentMethod} ${pm.referenceNo ? `(${pm.referenceNo})` : ''} ${pm.notes ? '- '+pm.notes : ''}`, 
            debit: pm.amount,
            transactionAmount: pm.amount
        });
      }
    });

    receipts.forEach(rc => {
      if (rc.partyId === selectedPartyId) {
        partyTransactions.push({ 
            relatedDocId: rc.id, date: rc.date, type: 'Receipt', refNo: rc.referenceNo, 
            particulars: `By ${rc.paymentMethod} ${rc.referenceNo ? `(${rc.referenceNo})` : ''} ${rc.notes ? '- '+rc.notes : ''}`, 
            credit: rc.amount,
            transactionAmount: rc.amount
        });
      }
    });
    
    let balance = 0;
    partyTransactions.forEach(t => {
        if (parseISO(t.date) < startOfDay(dateRange.from! )) { 
            balance += (t.debit || 0) - (t.credit || 0);
        }
    });
    const openingBalanceForPeriod = balance;

    const dateFilteredTransactions = partyTransactions.filter(t => {
        const transactionDate = parseISO(t.date);
        return isWithinInterval(transactionDate, { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) });
    });

    dateFilteredTransactions.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime() || ((a.debit || 0) > 0 ? -1 : 1) ); 
    
    let currentPeriodBalance = openingBalanceForPeriod;
    let totalDebitForPeriod = 0;
    let totalCreditForPeriod = 0;

    const entriesWithBalance: LedgerEntryWithBalance[] = dateFilteredTransactions.map(t => {
      totalDebitForPeriod += (t.debit || 0);
      totalCreditForPeriod += (t.credit || 0);
      currentPeriodBalance += (t.debit || 0) - (t.credit || 0);
      return { ...t, balance: currentPeriodBalance };
    });

    return { 
        entries: entriesWithBalance, 
        openingBalance: openingBalanceForPeriod, 
        closingBalance: currentPeriodBalance,
        totalDebit: totalDebitForPeriod,
        totalCredit: totalCreditForPeriod
    };

  }, [selectedPartyId, allMasters, purchases, sales, payments, receipts, dateRange, hydrated]);

  const handlePartySelect = React.useCallback((value: string) => {
    setSelectedPartyId(value);
    const newPath = value ? `/ledger?partyId=${value}` : '/ledger'; // Avoid adding ?partyId= if value is empty
    router.push(newPath, { scroll: false });
  }, [router]); 

  const partyOptions = React.useMemo(() =>
    allMasters
      .filter(m => ['Customer', 'Supplier', 'Agent', 'Broker', 'Transporter'].includes(m.type))
      .map(p => ({ label: `${p.name} (${p.type})`, value: p.id })),
    [allMasters]
  );

  const setDateFilter = (months: number) => {
    const to = endOfDay(new Date());
    const from = startOfDay(subMonths(to, months));
    setDateRange({ from, to });
  };

  const setCurrentFinancialYearFilter = () => { 
    const [currentFyStartYearStr] = currentFinancialYearString.split('-');
    const currentFyStartYear = parseInt(currentFyStartYearStr, 10);
    const from = new Date(currentFyStartYear, 3, 1); 
    const to = endOfDay(new Date(currentFyStartYear + 1, 2, 31)); 
    setDateRange({ from: startOfDay(from), to });
  };
  
  const handleDownloadPdf = async () => {
    const input = ledgerTableRef.current;
    if (input && selectedPartyDetails) { // Ensure selectedPartyDetails is available
      const canvas = await html2canvas(input, { scale: 2 }); // Increased scale for better quality
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const printHeaderSymbolEl = document.createElement('div');
      const printHeaderSymbolComponent = <PrintHeaderSymbol />;
      // Temporarily render to get HTML, then remove. This is a bit hacky.
      const root = document.createElement('div');
      document.body.appendChild(root);
      // This part is tricky without a full React render context.
      // A simpler way is to just add text directly to PDF.
      
      let yPos = 10; // Initial y position

      // Add header symbol text
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      const shreeText = "|| 卐 SHREE 卐 ||";
      const shreeTextWidth = pdf.getStringUnitWidth(shreeText) * pdf.getFontSize() / pdf.internal.scaleFactor;
      pdf.text(shreeText, (pdfWidth - shreeTextWidth) / 2, yPos);
      yPos += 8;

      // Add Party Name and Ledger Title
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      const title = `${selectedPartyDetails.name} (${selectedPartyDetails.type}) - Ledger Account`;
      const titleWidth = pdf.getStringUnitWidth(title) * pdf.getFontSize() / pdf.internal.scaleFactor;
      pdf.text(title, (pdfWidth - titleWidth) / 2, yPos);
      yPos += 6;

      // Add Period
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const periodText = `Period: ${dateRange?.from ? format(dateRange.from, "dd-MM-yyyy") : 'Start'} to ${dateRange?.to ? format(dateRange.to, "dd-MM-yyyy") : 'End'}`;
      const periodWidth = pdf.getStringUnitWidth(periodText) * pdf.getFontSize() / pdf.internal.scaleFactor;
      pdf.text(periodText, (pdfWidth - periodWidth) / 2, yPos);
      yPos += 8; // Space before table image

      const imgProps= pdf.getImageProperties(imgData);
      const imgWidth = imgProps.width;
      const imgHeight = imgProps.height;
      
      // Calculate ratio to fit width, leave some margin
      const ratio = (pdfWidth - 20) / imgWidth; // 10mm margin on each side
      const finalImgHeight = imgHeight * ratio;

      // Check if image needs to be split or scaled down further if too tall
      if (yPos + finalImgHeight > pdfHeight -10 ) { // 10mm bottom margin
          // Potentially add logic for multi-page or further scaling
          // For now, it might get cut off if too tall
      }
      pdf.addImage(imgData, 'PNG', 10, yPos, imgWidth * ratio, finalImgHeight);
      
      pdf.save(`Ledger-${selectedPartyDetails?.name || 'Report'}-${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    } else {
        console.error("Ledger table reference or party details not found for PDF generation.");
    }
  };


  if (!hydrated) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <p className="text-lg text-muted-foreground">Loading ledger data...</p>
      </div>
    );
  }
  const selectedPartyDetails = allMasters.find(p => p.id === selectedPartyId);

  return (
    <div className="space-y-6 print-area">
      
      <Card className="shadow-md no-print">
        <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-foreground">Party Ledger</h1>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                {partyOptions.length > 0 ? (
                    <Select onValueChange={handlePartySelect} value={selectedPartyId || ""}>
                        <SelectTrigger className="w-full md:w-[280px]">
                            <SelectValue placeholder="Select Party..." />
                        </SelectTrigger>
                        <SelectContent>
                            {partyOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <p className="text-sm text-muted-foreground md:w-[280px] text-center py-2">No parties found. Add Masters.</p>
                )}
                    <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="w-full md:w-auto"/>
                     <Button variant="outline" size="icon" onClick={() => window.print()} title="Print">
                        <Printer className="h-5 w-5" />
                        <span className="sr-only">Print</span>
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleDownloadPdf} title="Download PDF">
                        <Download className="h-5 w-5" />
                        <span className="sr-only">Download PDF</span>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => setDateFilter(3)}><CalendarRange className="mr-2 h-4 w-4" /> Last 3 Months</Button>
                <Button variant="outline" size="sm" onClick={() => setDateFilter(6)}><CalendarRange className="mr-2 h-4 w-4" /> Last 6 Months</Button>
                <Button variant="outline" size="sm" onClick={setCurrentFinancialYearFilter}><CalendarRange className="mr-2 h-4 w-4" /> Current FY</Button>
            </div>
        </CardContent>
      </Card>

      {selectedPartyId && selectedPartyDetails && hydrated ? (
        <Card className="shadow-xl print:shadow-none print:border-none">
          <CardHeader className="print:p-0 print:mb-2">
            <div className="print:text-center">
                <PrintHeaderSymbol id="print-header-symbol-ledger" className="hidden print:block text-sm font-semibold mb-1" />
                <CardTitle className="text-2xl text-primary flex items-center print:justify-center print:text-lg">
                    <BookUser className="mr-3 h-7 w-7 no-print" /> {selectedPartyDetails.name} ({selectedPartyDetails.type}) - Ledger Account
                </CardTitle>
                <p className="text-sm text-muted-foreground print:text-xs print:mb-1">
                    Period: {dateRange?.from ? format(dateRange.from, "dd-MM-yyyy") : 'Start'} to {dateRange?.to ? format(dateRange.to, "dd-MM-yyyy") : 'End'}
                    <span className="mx-2 print:hidden">|</span> <span className="print:hidden">FY: {currentFinancialYearString}</span>
                </p>
            </div>
          </CardHeader>
          <CardContent className="print:p-0">
          <TooltipProvider>
            <ScrollArea className="h-[500px] rounded-md border print:h-auto print:border-none print:shadow-none print:overflow-visible">
              <Table className="print:text-[9pt]" ref={ledgerTableRef}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] print:w-[50px]">Date</TableHead>
                    <TableHead className="print:w-[35%]">Particulars</TableHead>
                    <TableHead className="print:w-[10%]">Vch Type</TableHead>
                    <TableHead className="print:w-[10%]">Ref. No.</TableHead>
                    <TableHead className="text-right print:w-[12.5%] no-print">Rate (₹)</TableHead>
                    <TableHead className="text-right print:w-[12.5%] no-print">Net Wt. (kg)</TableHead>
                    <TableHead className="text-right no-print">Trans. Amt. (₹)</TableHead>
                    <TableHead className="text-right">Debit (₹)</TableHead>
                    <TableHead className="text-right">Credit (₹)</TableHead>
                    <TableHead className="text-right no-print">Balance (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="print:font-medium">
                    <TableCell colSpan={4} className="print:font-semibold">Opening Balance</TableCell>
                    <TableCell className="text-right print:font-semibold no-print">{/* Rate */}</TableCell>
                    <TableCell className="text-right print:font-semibold no-print">{/* Net Wt. */}</TableCell>
                    <TableCell className="text-right print:font-semibold no-print">{/* Trans. Amt. */}</TableCell>
                    <TableCell className="text-right print:font-semibold">
                        {ledgerTransactions.openingBalance >= 0 ? ledgerTransactions.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </TableCell>
                    <TableCell className="text-right print:font-semibold">
                        {ledgerTransactions.openingBalance < 0 ? Math.abs(ledgerTransactions.openingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-semibold no-print ${ledgerTransactions.openingBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {Math.abs(ledgerTransactions.openingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {ledgerTransactions.openingBalance < 0 ? 'Cr' : 'Dr'}
                    </TableCell>
                  </TableRow>
                  {ledgerTransactions.entries.length > 0 ? (
                    ledgerTransactions.entries.map((entry, index) => (
                      <TableRow key={`${entry.relatedDocId}-${index}-${entry.type}`}>
                        <TableCell>{format(parseISO(entry.date), "dd-MM-yy")}</TableCell>
                        <TableCell className="max-w-xs truncate print:max-w-none print:whitespace-normal">
                           <Tooltip>
                            <TooltipTrigger asChild><span className="no-print">{entry.particulars}</span></TooltipTrigger>
                            <TooltipContent><p>{entry.particulars}</p></TooltipContent>
                           </Tooltip>
                           <span className="print:block hidden">{entry.particulars}</span>
                        </TableCell>
                        <TableCell>{entry.type}</TableCell>
                        <TableCell>{entry.refNo || ''}</TableCell>
                        <TableCell className="text-right no-print">{entry.rate?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</TableCell>
                        <TableCell className="text-right no-print">{entry.netWeight?.toLocaleString() || '-'}</TableCell>
                        <TableCell className="text-right no-print">
                           {entry.transactionAmount !== undefined ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{entry.transactionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </TooltipTrigger>
                              {entry.refNo && (
                                <TooltipContent><p>Ref: {entry.refNo}</p></TooltipContent>
                              )}
                            </Tooltip>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">{entry.debit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || ''}</TableCell>
                        <TableCell className="text-right">{entry.credit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || ''}</TableCell>
                        <TableCell className={`text-right font-semibold no-print ${entry.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {Math.abs(entry.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {entry.balance < 0 ? 'Cr' : 'Dr'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="print:hidden">
                      <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                        No transactions for this party in the selected period after opening balance.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter className="print:text-[9pt]">
                    <TableRow className="font-semibold">
                        <TableCell colSpan={4} className="text-right">Totals for Period:</TableCell>
                        <TableCell className="no-print">{/* Rate */}</TableCell>
                        <TableCell className="no-print">{/* Net Wt. */}</TableCell>
                        <TableCell className="no-print">{/* Trans. Amt. */}</TableCell>
                        <TableCell className="text-right border-t border-b border-foreground">
                            {ledgerTransactions.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right border-t border-b border-foreground">
                            {ledgerTransactions.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="no-print"></TableCell>
                    </TableRow>
                    <TableRow className="font-semibold text-base">
                        <TableCell colSpan={4} className="text-right">
                            {ledgerTransactions.closingBalance < 0 ? 'By Closing Balance:' : 'To Closing Balance:'}
                        </TableCell>
                        <TableCell className="no-print">{/* Rate */}</TableCell>
                        <TableCell className="no-print">{/* Net Wt. */}</TableCell>
                        <TableCell className="no-print">{/* Trans. Amt. */}</TableCell>
                        <TableCell className="text-right border-b-2 border-foreground">
                            {ledgerTransactions.closingBalance >= 0 ? Math.abs(ledgerTransactions.closingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                        </TableCell>
                        <TableCell className="text-right border-b-2 border-foreground">
                             {ledgerTransactions.closingBalance < 0 ? Math.abs(ledgerTransactions.closingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                        </TableCell>
                        <TableCell colSpan={1} className={`text-right font-semibold no-print ${ledgerTransactions.closingBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                           {/* This cell is for the running balance display on screen, not directly part of debit/credit closing balance line for print */}
                           {Math.abs(ledgerTransactions.closingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {ledgerTransactions.closingBalance < 0 ? 'Cr' : 'Dr'}
                        </TableCell>
                    </TableRow>
                </TableFooter>
              </Table>
            </ScrollArea>
          </TooltipProvider>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 min-h-[300px] flex items-center justify-center no-print">
          <div className="text-center">
            <BookUser className="h-16 w-16 text-accent mb-4 mx-auto" />
            <p className="text-xl text-muted-foreground">
              {partyOptions.length === 0 && hydrated ? "No parties found. Please add master data first." : "Please select a party to view their ledger."}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
