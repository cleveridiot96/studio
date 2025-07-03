
"use client";
import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, MasterItemType, LedgerEntry } from "@/lib/types";
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

interface LedgerEntryWithBalance extends LedgerEntry {
  relatedDocId: string;
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
            const parsedDataArray = JSON.parse(data) as MasterItem[];
            if (Array.isArray(parsedDataArray)) {
                parsedDataArray.forEach(item => {
                    if (item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.type === 'string') {
                        loadedMasters.push(item);
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
          setDateRange({ from: startOfDay(subMonths(new Date(), 1)), to: endOfDay(new Date()) });
        }
      }
      
      const partyIdFromQuery = searchParams.get('partyId');
      if (partyIdFromQuery && loadedMasters.some(m => m.id === partyIdFromQuery) && selectedPartyId !== partyIdFromQuery) {
        setSelectedPartyId(partyIdFromQuery);
      }
    }
  }, [hydrated, currentFinancialYearString, searchParams, dateRange, selectedPartyId]);


  const ledgerTransactions = React.useMemo(() => {
    if (!selectedPartyId || !dateRange?.from || !dateRange?.to || !hydrated) {
      return initialLedgerData;
    }

    const party = allMasters.find(m => m.id === selectedPartyId);
    if (!party) return initialLedgerData;

    const tempTransactions: LedgerEntry[] = [];

    purchases.forEach(p => {
      if (p.supplierId === selectedPartyId && party.type === 'Supplier') {
        tempTransactions.push({
          id: `pur-${p.id}`, relatedDocId: p.id, date: p.date, vchType: 'Purchase', refNo: p.lotNumber,
          description: `By Goods Purchased (Lot: ${p.lotNumber})`,
          credit: p.totalAmount,
          rate: p.rate, netWeight: p.netWeight, transactionAmount: p.totalAmount
        });
      }
      if (p.agentId === selectedPartyId && party.type === 'Agent') {
        const agentMasterData = allMasters.find(a => a.id === p.agentId && a.type === 'Agent');
        const agentCommissionAmount = agentMasterData?.commission && p.netWeight && p.rate
          ? (p.netWeight * p.rate * (agentMasterData.commission / 100))
          : 0;
        if (agentCommissionAmount > 0) tempTransactions.push({
          id: `pur-comm-${p.id}`, relatedDocId: p.id, date: p.date, vchType: 'Agent Comm.', refNo: p.lotNumber,
          description: `By Comm. on Purchase Lot ${p.lotNumber} (Sup: ${p.supplierName || p.supplierId})`,
          credit: agentCommissionAmount,
          transactionAmount: agentCommissionAmount,
          rate: p.rate, netWeight: p.netWeight, supplierName: p.supplierName || p.supplierId,
        });
      }
      if (p.transporterId === selectedPartyId && party.type === 'Transporter' && p.transportRate) {
        const transportDescription = `By Transport: Lot ${p.lotNumber} (${p.quantity} bags, Total: ₹${p.transportRate?.toFixed(2)})${p.transportRatePerKg ? ' @ ₹'+p.transportRatePerKg.toFixed(2)+'/kg' : ''}`;
        tempTransactions.push({
          id: `pur-trans-${p.id}`, relatedDocId: p.id, date: p.date, vchType: 'Transport Exp.', refNo: p.lotNumber,
          description: transportDescription,
          credit: p.transportRate,
          transactionAmount: p.transportRate
        });
      }
    });

    sales.forEach(s => {
      if (s.customerId === selectedPartyId && party.type === 'Customer') {
        tempTransactions.push({
          id: `sale-${s.id}`, relatedDocId: s.id, date: s.date, vchType: 'Sale', refNo: s.billNumber || s.id,
          description: `To Goods Sold (Bill: ${s.billNumber || s.id}, Lot: ${s.lotNumber})`,
          debit: s.billedAmount, 
          rate: s.rate, netWeight: s.netWeight, transactionAmount: s.billedAmount 
        });
      }
      if (s.brokerId === selectedPartyId && party.type === 'Broker') {
        tempTransactions.push({
          id: `sale-via-broker-${s.id}`, relatedDocId: s.id, date: s.date, vchType: 'Sale via Broker', refNo: s.billNumber || s.id,
          description: `To Sale (Cust: ${s.customerName || s.customerId}, Bill: ${s.billNumber || s.id})`,
          debit: s.billedAmount, 
          customerName: s.customerName || s.customerId,
          rate: s.rate, netWeight: s.netWeight, transactionAmount: s.billedAmount
        });
        if (s.calculatedBrokerageCommission && s.calculatedBrokerageCommission > 0) {
            tempTransactions.push({
                id: `sale-brokerage-exp-${s.id}`, relatedDocId: s.id, date: s.date, vchType: 'Brokerage Exp.', refNo: s.billNumber || s.id,
                description: `By Brokerage on Sale (Cust: ${s.customerName || s.customerId}, Bill: ${s.billNumber || s.id})`,
                credit: s.calculatedBrokerageCommission,
                customerName: s.customerName || s.customerId,
                transactionAmount: s.calculatedBrokerageCommission
            });
        }
        if (s.calculatedExtraBrokerage && s.calculatedExtraBrokerage > 0) {
            tempTransactions.push({
                id: `sale-extra-brokerage-${s.id}`, relatedDocId: s.id, date: s.date, vchType: 'Extra Brokerage', refNo: s.billNumber || s.id,
                description: `By Extra Brokerage on Sale (Cust: ${s.customerName || s.customerId}, Bill: ${s.billNumber || s.id})`,
                credit: s.calculatedExtraBrokerage,
                customerName: s.customerName || s.customerId,
                transactionAmount: s.calculatedExtraBrokerage
            });
        }
      }
      if (s.transporterId === selectedPartyId && party.type === 'Transporter' && s.transportCost) {
        tempTransactions.push({
          id: `sale-trans-${s.id}`, relatedDocId: s.id, date: s.date, vchType: 'Transport Exp.', refNo: s.billNumber || s.id,
          description: `By Transport for Sale ${s.billNumber || s.id}`,
          credit: s.transportCost,
          transactionAmount: s.transportCost
        });
      }
    });

    payments.forEach(pm => {
      if (pm.partyId === selectedPartyId) {
        tempTransactions.push({
          id: `pm-${pm.id}`, relatedDocId: pm.id, date: pm.date, vchType: 'Payment', refNo: pm.referenceNo,
          description: `To ${pm.paymentMethod} ${pm.referenceNo ? `(${pm.referenceNo})` : ''} ${pm.notes ? '- ' + pm.notes : ''}`,
          debit: pm.amount,
          transactionAmount: pm.amount
        });
      }
    });

    receipts.forEach(rc => {
      if (rc.partyId === selectedPartyId) {
        tempTransactions.push({
          id: `rc-${rc.id}`, relatedDocId: rc.id, date: rc.date, vchType: 'Receipt', refNo: rc.referenceNo,
          description: `By ${rc.paymentMethod} ${rc.referenceNo ? `(${rc.referenceNo})` : ''} ${rc.notes ? '- ' + rc.notes : ''}`,
          credit: rc.amount,
          cashDiscount: rc.cashDiscount || 0,
          transactionAmount: rc.amount + (rc.cashDiscount || 0),
        });
      }
    });

    let balance = 0;
    // Start with the master opening balance
    if (party.openingBalance && party.openingBalanceType) {
        balance = party.openingBalanceType === 'Dr' ? party.openingBalance : -party.openingBalance;
    }

    tempTransactions.forEach(t => {
      if (parseISO(t.date) < startOfDay(dateRange.from!)) {
        balance += (t.debit || 0) - (t.credit || 0);
      }
    });
    const openingBalanceForPeriod = balance;

    const dateFilteredTransactions = tempTransactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return isWithinInterval(transactionDate, { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) });
    });

    dateFilteredTransactions.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime() || ((a.debit || 0) > 0 ? -1 : 1));

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
    const newPath = value ? `/ledger?partyId=${value}` : '/ledger';
    router.push(newPath, { scroll: false });
  }, [router]);
  
  const selectedPartyDetails = React.useMemo(() => {
    if (!selectedPartyId || allMasters.length === 0) return undefined;
    return allMasters.find(p => p.id === selectedPartyId);
  }, [selectedPartyId, allMasters]);

  const setDateFilter = React.useCallback((monthsAgo: number) => {
    const today = new Date();
    const fromDate = startOfDay(subMonths(today, monthsAgo));
    setDateRange({ from: fromDate, to: endOfDay(today) });
  }, []);

  const setCurrentFinancialYearFilter = React.useCallback(() => {
    const [startYearStr] = currentFinancialYearString.split('-');
    const startYear = parseInt(startYearStr, 10);
    if (!isNaN(startYear)) {
      setDateRange({
        from: new Date(startYear, 3, 1), // April 1st
        to: endOfDay(new Date(startYear + 1, 2, 31)), // March 31st
      });
    }
  }, [currentFinancialYearString]);


  const handleDownloadPdf = async () => {
    if (!ledgerTableRef.current || !selectedPartyDetails) {
      console.error("Ledger table reference or party details not found for PDF generation.");
      return;
    }
    const input = ledgerTableRef.current;
    
    const noPrintElements = Array.from(input.querySelectorAll('.no-print')) as HTMLElement[];
    const printOnlyElements = Array.from(input.querySelectorAll('.print-only-block')) as HTMLElement[];
    
    noPrintElements.forEach(el => el.style.display = 'none');
    printOnlyElements.forEach(el => el.style.display = 'table-cell');

    const parentScrollArea = input.closest('.print\\:h-auto');
    if (parentScrollArea) {
        (parentScrollArea as HTMLElement).style.height = 'auto';
        (parentScrollArea as HTMLElement).style.maxHeight = 'none';
        (parentScrollArea as HTMLElement).style.overflow = 'visible';
    }

    const canvas = await html2canvas(input, { 
      scale: 2,
      logging: false,
      useCORS: true,
      onclone: (document) => {
        const tableInClone = document.querySelector('#ledger-table-to-print');
        if (tableInClone) {
            (tableInClone as HTMLElement).style.height = 'auto';
            (tableInClone as HTMLElement).style.maxHeight = 'none';
            (tableInClone as HTMLElement).style.overflow = 'visible';
        }
        const clonedPrintOnly = Array.from(document.querySelectorAll('.print-only-block')) as HTMLElement[];
        clonedPrintOnly.forEach(el => el.style.display = 'table-cell');
        const clonedNoPrint = Array.from(document.querySelectorAll('.no-print')) as HTMLElement[];
        clonedNoPrint.forEach(el => el.style.display = 'none');
      }
    });

    noPrintElements.forEach(el => el.style.display = '');
    printOnlyElements.forEach(el => el.style.display = '');
     if (parentScrollArea) {
        (parentScrollArea as HTMLElement).style.height = ''; 
        (parentScrollArea as HTMLElement).style.maxHeight = ''; 
        (parentScrollArea as HTMLElement).style.overflow = ''; 
    }
      
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pdfWidth - 2 * margin;
    
    let yPos = margin; 

    const shreeSymbol = document.getElementById('print-header-symbol-ledger-pdf');
    if (shreeSymbol) {
        try {
            const shreeCanvas = await html2canvas(shreeSymbol, { backgroundColor: null, scale: 2 });
            const shreeImgData = shreeCanvas.toDataURL('image/png');
            const shreeImgProps = pdf.getImageProperties(shreeImgData);
            const shreeRatio = shreeImgProps.width / shreeImgProps.height;
            const shreePdfHeight = 10; 
            const shreePdfWidth = shreePdfHeight * shreeRatio;
            pdf.addImage(shreeImgData, 'PNG', (pdfWidth - shreePdfWidth) / 2, yPos, shreePdfWidth, shreePdfHeight);
            yPos += shreePdfHeight + 2;
        } catch(e) { console.error("Error rendering Shree symbol to PDF", e); }
    }

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    const title = `${selectedPartyDetails.name} (${selectedPartyDetails.type}) - Ledger`;
    const titleWidth = pdf.getStringUnitWidth(title) * pdf.getFontSize() / pdf.internal.scaleFactor;
    pdf.text(title, (pdfWidth - titleWidth) / 2, yPos);
    yPos += 6;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const periodText = `Period: ${dateRange?.from ? format(dateRange.from, "dd-MM-yyyy") : 'Start'} to ${dateRange?.to ? format(dateRange.to, "dd-MM-yyyy") : 'End'}`;
    const periodWidth = pdf.getStringUnitWidth(periodText) * pdf.getFontSize() / pdf.internal.scaleFactor;
    pdf.text(periodText, (pdfWidth - periodWidth) / 2, yPos);
    yPos += 8; 

    const imgProps = pdf.getImageProperties(imgData);
    const ratio = contentWidth / imgProps.width; 
    const finalImgHeight = imgProps.height * ratio;
    
    let currentImgPos = 0; 
    let pageContentHeight = pdfHeight - yPos - margin; 

    while(currentImgPos < imgProps.height) { 
        const sourceImgHeightForPage = Math.min(imgProps.height - currentImgPos, pageContentHeight / ratio);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imgProps.width; 
        tempCanvas.height = sourceImgHeightForPage;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx?.drawImage(canvas, 0, currentImgPos, imgProps.width, sourceImgHeightForPage, 0, 0, tempCanvas.width, tempCanvas.height);
        const pageImgData = tempCanvas.toDataURL('image/png');

        pdf.addImage(pageImgData, 'PNG', margin, yPos, contentWidth, sourceImgHeightForPage * ratio);
        currentImgPos += sourceImgHeightForPage;

        if(currentImgPos < imgProps.height) {
            pdf.addPage();
            yPos = margin; 
            pageContentHeight = pdfHeight - 2 * margin; 
        }
    }
    
    pdf.save(`Ledger-${selectedPartyDetails?.name || 'Report'}-${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };


  if (!hydrated) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <p className="text-lg text-muted-foreground">Loading ledger data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 print-area">
      <div id="print-header-symbol-ledger-pdf" style={{ display: 'none', textAlign: 'center', fontSize: '12pt', fontWeight: 'bold' }}>
         || 卐 SHREE 卐 ||
      </div>
      <Card className="shadow-md no-print">
        <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-foreground">Party Ledger (FY {currentFinancialYearString})</h1>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                {allMasters.length > 0 ? (
                    <Select onValueChange={handlePartySelect} value={selectedPartyId || ""}>
                        <SelectTrigger className="w-full md:w-[280px]">
                            <SelectValue placeholder="Select Party..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Customers</SelectLabel>
                            {allMasters.filter(p=>p.type==='Customer').map(opt => (<SelectItem key={`cust-${opt.id}`} value={opt.id}>{opt.name}</SelectItem>))}
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Suppliers</SelectLabel>
                            {allMasters.filter(p=>p.type==='Supplier').map(opt => (<SelectItem key={`supp-${opt.id}`} value={opt.id}>{opt.name}</SelectItem>))}
                          </SelectGroup>
                           <SelectGroup>
                            <SelectLabel>Agents</SelectLabel>
                            {allMasters.filter(p=>p.type==='Agent').map(opt => (<SelectItem key={`agent-${opt.id}`} value={opt.id}>{opt.name}</SelectItem>))}
                          </SelectGroup>
                           <SelectGroup>
                            <SelectLabel>Brokers</SelectLabel>
                            {allMasters.filter(p=>p.type==='Broker').map(opt => (<SelectItem key={`brok-${opt.id}`} value={opt.id}>{opt.name}</SelectItem>))}
                          </SelectGroup>
                           <SelectGroup>
                            <SelectLabel>Transporters</SelectLabel>
                            {allMasters.filter(p=>p.type==='Transporter').map(opt => (<SelectItem key={`trans-${opt.id}`} value={opt.id}>{opt.name}</SelectItem>))}
                          </SelectGroup>
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
                    <Button variant="outline" size="icon" onClick={handleDownloadPdf} title="Download PDF" disabled={!selectedPartyId || !selectedPartyDetails}>
                        <Download className="h-5 w-5" />
                        <span className="sr-only">Download PDF</span>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => setDateFilter(1)}><CalendarRange className="mr-2 h-4 w-4" /> Last Month</Button>
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
                    <BookUser className="mr-3 h-7 w-7 no-print" /> {selectedPartyDetails.name} ({selectedPartyDetails.type}) - Ledger
                </CardTitle>
                <p className="text-sm text-muted-foreground print:text-xs print:mb-1">
                    Period: {dateRange?.from ? format(dateRange.from, "dd-MM-yyyy") : 'Start'} to {dateRange?.to ? format(dateRange.to, "dd-MM-yyyy") : 'End'}
                </p>
            </div>
          </CardHeader>
          <CardContent className="print:p-0">
          <TooltipProvider>
            <ScrollArea className="h-[500px] rounded-md border print:h-auto print:border-none print:shadow-none print:overflow-visible">
              <Table className="print:text-[9pt]" ref={ledgerTableRef} id="ledger-table-to-print">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] print:w-[50px]">Date</TableHead>
                    <TableHead className="print:w-[35%]">Particulars</TableHead>
                    <TableHead className="print:w-[10%]">Vch Type</TableHead>
                    <TableHead className="print:w-[10%]">Ref. No.</TableHead>
                    <TableHead className="text-right no-print">Rate (₹)</TableHead>
                    <TableHead className="text-right no-print">Net Wt. (kg)</TableHead>
                    <TableHead className="text-right no-print">Trans. Amt. (₹)</TableHead>
                    <TableHead className="text-right print:w-[12%]">Debit (₹)</TableHead>
                    <TableHead className="text-right print:w-[12%]">Credit (₹)</TableHead>
                    <TableHead className="text-right no-print">Balance (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="print:font-medium">
                    <TableCell colSpan={selectedPartyDetails.type === 'Broker' ? 3 : 4} className="print:col-span-2 print:font-semibold print:text-left">Opening Balance</TableCell>
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
                      <TableRow key={`${entry.id}-${index}`}>
                        <TableCell>{format(parseISO(entry.date), "dd-MM-yy")}</TableCell>
                        <TableCell className="max-w-xs truncate print:max-w-none print:whitespace-normal">
                           <Tooltip>
                            <TooltipTrigger asChild><span className="no-print">{entry.description}</span></TooltipTrigger>
                            <TooltipContent><p>{entry.description}</p></TooltipContent>
                           </Tooltip>
                           <span className="print:block hidden print-only-block">{entry.description}</span>
                        </TableCell>
                        <TableCell>{entry.vchType}</TableCell>
                        <TableCell>{entry.refNo || ''}</TableCell>
                        <TableCell className="text-right no-print">{entry.rate?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</TableCell>
                        <TableCell className="text-right no-print">{entry.netWeight?.toLocaleString() || '-'}</TableCell>
                        <TableCell className="text-right no-print">
                           {entry.transactionAmount !== undefined ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{entry.transactionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </TooltipTrigger>
                              {entry.refNo && (<TooltipContent><p>Ref: {entry.refNo}</p></TooltipContent>)}
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
                        <TableCell colSpan={4} className="text-right print:col-span-2 print:text-left">Totals for Period:</TableCell>
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
                        <TableCell colSpan={4} className="text-right print:col-span-2 print:text-left">
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
        !hydrated ? (
          <div className="flex justify-center items-center min-h-[calc(100vh-20rem)] no-print">
            <p className="text-lg text-muted-foreground">Initializing ledger...</p>
          </div>
        ) : (
        <Card className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 min-h-[300px] flex items-center justify-center no-print">
          <div className="text-center">
            <BookUser className="h-16 w-16 text-accent mb-4 mx-auto" />
            <p className="text-xl text-muted-foreground">
              {allMasters.length === 0 && hydrated ? "No parties found. Please add master data first." : "Please select a party to view their ledger."}
            </p>
          </div>
        </Card>
        )
      )}
    </div>
  );
}
