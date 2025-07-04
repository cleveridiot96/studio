
"use client";
import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Payment, MasterItemType, Sale } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, subMonths } from "date-fns";
import { BookUser, CalendarRange, Printer, Download } from "lucide-react";
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
  sales: 'salesData', // Added sales data source
  payments: 'paymentsData',
};

// Local interfaces for the T-Account ledger view
interface TAccountDebitEntry {
  id: string;
  date: string;
  vakkal: string; // From lotNumber or "Commission on Sale..."
  bags?: number;
  kg?: number;
  rate?: number;
  amount: number;
}

interface TAccountCreditEntry {
  id: string;
  date: string;
  amount: number;
  source: string; // From payment method & notes
}

const initialLedgerData = {
  debitEntries: [] as TAccountDebitEntry[],
  creditEntries: [] as TAccountCreditEntry[],
  openingBalance: 0,
  closingBalance: 0,
  totalDebit: 0,
  totalCredit: 0,
};

export function LedgerClient() {
  const [hydrated, setHydrated] = React.useState(false);
  const [allMasters, setAllMasters] = React.useState<MasterItem[]>([]);
  
  const memoizedEmptyArray = React.useMemo(() => [], []);
  const [purchases] = useLocalStorageState<Purchase[]>(TRANSACTIONS_KEYS.purchases, memoizedEmptyArray);
  const [sales] = useLocalStorageState<Sale[]>(TRANSACTIONS_KEYS.sales, memoizedEmptyArray);
  const [payments] = useLocalStorageState<Payment[]>(TRANSACTIONS_KEYS.payments, memoizedEmptyArray);

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
      const relevantMasters = loadedMasters.filter(m => m.type === 'Supplier' || m.type === 'Broker' || m.type === 'Agent');
      relevantMasters.sort((a, b) => a.name.localeCompare(b.name));
      setAllMasters(relevantMasters);

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
      if (partyIdFromQuery && relevantMasters.some(m => m.id === partyIdFromQuery) && selectedPartyId !== partyIdFromQuery) {
        setSelectedPartyId(partyIdFromQuery);
      }
    }
  }, [hydrated, currentFinancialYearString, searchParams, dateRange, selectedPartyId]);

  const ledgerData = React.useMemo(() => {
    if (!selectedPartyId || !dateRange?.from || !dateRange?.to || !hydrated) {
      return initialLedgerData;
    }

    const party = allMasters.find(m => m.id === selectedPartyId);
    if (!party) return initialLedgerData;

    let balance = party.openingBalanceType === 'Dr' ? (party.openingBalance || 0) : -(party.openingBalance || 0);

    // Calculate opening balance for the period
    purchases.forEach(p => {
      if ((p.supplierId === party.id || p.agentId === party.id) && parseISO(p.date) < startOfDay(dateRange.from!)) {
        balance += p.totalAmount;
      }
    });
    sales.forEach(s => {
        if (s.brokerId === party.id && parseISO(s.date) < startOfDay(dateRange.from!)) {
            const totalCommission = (s.calculatedBrokerageCommission || 0) + (s.calculatedExtraBrokerage || 0);
            balance += totalCommission;
        }
    });
    payments.forEach(pm => {
      if (pm.partyId === party.id && parseISO(pm.date) < startOfDay(dateRange.from!)) {
        balance -= pm.amount;
      }
    });
    const openingBalance = balance;

    const periodDebitEntries: TAccountDebitEntry[] = [];
    const periodCreditEntries: TAccountCreditEntry[] = [];
    
    // Debit Side: Purchases and Sales Commissions
    purchases.forEach(p => {
      if ((p.supplierId === party.id || p.agentId === party.id) && isWithinInterval(parseISO(p.date), { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) })) {
        periodDebitEntries.push({
          id: p.id, date: p.date, vakkal: p.lotNumber,
          bags: p.quantity, kg: p.netWeight, rate: p.rate,
          amount: p.totalAmount,
        });
      }
    });

    sales.forEach(s => {
        if(s.brokerId === party.id && isWithinInterval(parseISO(s.date), { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) })) {
            const totalCommission = (s.calculatedBrokerageCommission || 0) + (s.calculatedExtraBrokerage || 0);
            if(totalCommission > 0) {
                periodDebitEntries.push({
                    id: `comm-${s.id}`, date: s.date,
                    vakkal: `Commission on Sale to ${s.customerName || 'N/A'}`,
                    amount: totalCommission,
                });
            }
        }
    });

    // Credit Side: Payments made to the party
    payments.forEach(pm => {
      if (pm.partyId === party.id && isWithinInterval(parseISO(pm.date), { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) })) {
        periodCreditEntries.push({
          id: pm.id, date: pm.date,
          source: `${pm.paymentMethod}${pm.referenceNo ? ` - ${pm.referenceNo}` : ''}`,
          amount: pm.amount,
        });
      }
    });
    
    periodDebitEntries.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    periodCreditEntries.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    const totalDebit = periodDebitEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalCredit = periodCreditEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const closingBalance = openingBalance + totalDebit - totalCredit;
    
    return {
      debitEntries: periodDebitEntries,
      creditEntries: periodCreditEntries,
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance,
    };
  }, [selectedPartyId, dateRange, purchases, sales, payments, allMasters, hydrated]);

  const handlePartySelect = React.useCallback((value: string) => {
    setSelectedPartyId(value);
    const newPath = value ? `/ledger?partyId=${value}` : '/ledger';
    router.push(newPath, { scroll: false });
  }, [router]);
  
  const selectedPartyDetails = React.useMemo(() => {
    if (!selectedPartyId || allMasters.length === 0) return undefined;
    return allMasters.find(p => p.id === selectedPartyId);
  }, [selectedPartyId, allMasters]);

  const setCurrentFinancialYearFilter = React.useCallback(() => {
    const [startYearStr] = currentFinancialYearString.split('-');
    const startYear = parseInt(startYearStr, 10);
    if (!isNaN(startYear)) {
      setDateRange({
        from: new Date(startYear, 3, 1),
        to: endOfDay(new Date(startYear + 1, 2, 31)),
      });
    }
  }, [currentFinancialYearString]);


  if (!hydrated) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <p className="text-lg text-muted-foreground">Loading ledger data...</p>
      </div>
    );
  }

  const {debitEntries, creditEntries, openingBalance, totalDebit, totalCredit, closingBalance} = ledgerData;
  const balanceDirection = closingBalance >= 0 ? 'Dr' : 'Cr';
  const openingBalanceDirection = openingBalance >= 0 ? 'Dr' : 'Cr';

  return (
    <div className="space-y-6 print-area">
      <Card className="shadow-md no-print">
        <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-foreground">Party Stock Ledger</h1>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Select onValueChange={handlePartySelect} value={selectedPartyId || ""}>
                        <SelectTrigger className="w-full md:w-[280px]">
                            <SelectValue placeholder="Select Party..." />
                        </SelectTrigger>
                        <SelectContent>
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
                        </SelectContent>
                    </Select>
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
        <div id="ledger-t-account">
          <CardHeader className="text-center">
            <PrintHeaderSymbol className="hidden print:block text-sm font-semibold mb-1" />
            <CardTitle className="text-2xl text-primary flex items-center justify-center">
              <BookUser className="mr-3 h-7 w-7 no-print" /> {selectedPartyDetails.name} ({selectedPartyDetails.type})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Period: {dateRange?.from ? format(dateRange.from, "dd-MM-yyyy") : 'Start'} to {dateRange?.to ? format(dateRange.to, "dd-MM-yyyy") : 'End'}
            </p>
          </CardHeader>

          <div className="mb-4 p-3 border rounded-md bg-muted/50">
            <div className="flex justify-between text-sm font-medium">
                <span>Opening Balance for Selected Period:</span>
                <span className={`font-semibold ${openingBalanceDirection === 'Dr' ? 'text-destructive' : 'text-green-800'}`}>
                    {Math.abs(openingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {openingBalanceDirection}
                </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4 space-y-4 md:space-y-0">
            <Card className="shadow-lg">
                <CardHeader className="p-0">
                    <CardTitle className="bg-orange-200 text-orange-800 text-center p-2 font-bold">DEBIT (Goods Received / Dues)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Vakkal/Particulars (Bags)</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {debitEntries.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center">No purchases or commissions recorded.</TableCell></TableRow>}
                            {debitEntries.map(e => (
                                <TableRow key={e.id}>
                                    <TableCell>{format(parseISO(e.date), "dd-MM-yy")}</TableCell>
                                    <TableCell>{e.vakkal} {e.bags ? `(${e.bags})` : ''}</TableCell>
                                    <TableCell className="text-right">{e.kg ? e.kg.toFixed(2) : '-'}</TableCell>
                                    <TableCell className="text-right">{e.rate ? e.rate.toFixed(2) : '-'}</TableCell>
                                    <TableCell className="text-right">{e.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="font-bold bg-orange-50">
                                <TableCell colSpan={4}>Total Debit</TableCell>
                                <TableCell className="text-right">{totalDebit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader className="p-0">
                    <CardTitle className="bg-green-200 text-green-800 text-center p-2 font-bold">CREDIT (Payments Made)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {creditEntries.length === 0 && <TableRow><TableCell colSpan={3} className="h-24 text-center">No payments recorded.</TableCell></TableRow>}
                            {creditEntries.map(e => (
                                <TableRow key={e.id}>
                                    <TableCell>{format(parseISO(e.date), "dd-MM-yy")}</TableCell>
                                    <TableCell>{e.source}</TableCell>
                                    <TableCell className="text-right">{e.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                         <TableFooter>
                            <TableRow className="font-bold bg-green-50">
                                <TableCell colSpan={2}>Total Credit</TableCell>
                                <TableCell className="text-right">{totalCredit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
          </div>
          <Card className="mt-4 shadow-xl">
              <CardContent className="p-4 space-y-2 text-base">
                  <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Debits for Period:</span>
                      <span className="font-semibold text-orange-700">{totalDebit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                   <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Credits for Period:</span>
                      <span className="font-semibold text-green-700">{totalCredit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2 mt-2 text-lg">
                      <span className="font-bold text-primary">Closing Balance:</span>
                      <span className={`font-bold ${balanceDirection === 'Dr' ? 'text-destructive' : 'text-green-800'}`}>
                          {Math.abs(closingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {balanceDirection}
                      </span>
                  </div>
              </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 min-h-[300px] flex items-center justify-center no-print">
          <div className="text-center">
            <BookUser className="h-16 w-16 text-accent mb-4 mx-auto" />
            <p className="text-xl text-muted-foreground">
              {allMasters.length === 0 && hydrated ? "No suppliers/brokers found." : "Please select a party to view their stock ledger."}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
