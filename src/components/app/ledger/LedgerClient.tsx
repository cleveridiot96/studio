
"use client";
import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, subMonths } from "date-fns";
import { BookUser, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { useSearchParams, useRouter } from "next/navigation";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { ScrollArea } from "@/components/ui/scroll-area";

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
};

// Local interfaces for the T-Account ledger view
interface TAccountPurchaseEntry {
  id: string;
  date: string;
  vakkal: string;
  bags?: number;
  kg?: number;
  rate?: number;
  amount: number;
}

interface TAccountSaleEntry {
  id: string;
  date: string;
  vakkal: string;
  bags: number;
  customer: string;
  broker: string;
  kg: number;
  rate: number;
  amount: number;
}

const initialLedgerData = {
  debitEntries: [] as TAccountPurchaseEntry[],
  creditEntries: [] as TAccountSaleEntry[],
  totalDebit: 0,
  totalCredit: 0,
  totalDebitBags: 0,
  totalDebitKg: 0,
  totalCreditBags: 0,
  totalCreditKg: 0,
  closingBags: 0,
  closingKg: 0,
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
      
      if (partyIdFromQuery && relevantMasters.some(m => m.id === partyIdFromQuery) && selectedPartyId !== partyIdFromQuery) {
        setSelectedPartyId(partyIdFromQuery);
      }
    }
  }, [hydrated, currentFinancialYearString, partyIdFromQuery, dateRange, selectedPartyId]);

  const partyOptions = React.useMemo(() => {
    return allMasters.map(p => ({ value: p.id, label: `${p.name} (${p.type})` }));
  }, [allMasters]);


  const ledgerData = React.useMemo(() => {
    if (!selectedPartyId || !dateRange?.from || !hydrated) {
      return initialLedgerData;
    }

    const party = allMasters.find(m => m.id === selectedPartyId);
    if (!party) return initialLedgerData;

    const toDate = dateRange.to || dateRange.from;

    let periodDebitEntries: TAccountPurchaseEntry[] = [];
    if (party.type === 'Supplier' || party.type === 'Agent') {
      periodDebitEntries = purchases
        .filter(p => {
            const isMatch = (party.type === 'Supplier' && p.supplierId === party.id) || 
                          (party.type === 'Agent' && p.agentId === party.id);
            return isMatch && isWithinInterval(parseISO(p.date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) });
        })
        .map(p => ({
          id: p.id,
          date: p.date,
          vakkal: p.lotNumber,
          bags: p.quantity,
          kg: p.netWeight,
          rate: p.rate,
          amount: p.totalAmount,
        }))
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    }

    let periodCreditEntries: TAccountSaleEntry[] = [];
    if (party.type === 'Broker') {
      periodCreditEntries = sales
        .filter(s => s.brokerId === party.id && isWithinInterval(parseISO(s.date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) }))
        .map(s => ({
          id: s.id,
          date: s.date,
          vakkal: s.lotNumber,
          bags: s.quantity,
          customer: s.customerName || s.customerId,
          broker: s.brokerName || s.brokerId || 'N/A',
          kg: s.netWeight,
          rate: s.rate,
          amount: s.billedAmount,
        }))
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    }
      
    const totalDebit = periodDebitEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalDebitBags = periodDebitEntries.reduce((sum, entry) => sum + (entry.bags || 0), 0);
    const totalDebitKg = periodDebitEntries.reduce((sum, entry) => sum + (entry.kg || 0), 0);
    
    const totalCredit = periodCreditEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalCreditBags = periodCreditEntries.reduce((sum, entry) => sum + (entry.bags || 0), 0);
    const totalCreditKg = periodCreditEntries.reduce((sum, entry) => sum + (entry.kg || 0), 0);

    const closingBags = totalDebitBags - totalCreditBags;
    const closingKg = totalDebitKg - totalCreditKg;

    return {
      debitEntries: periodDebitEntries,
      creditEntries: periodCreditEntries,
      totalDebit,
      totalCredit,
      totalDebitBags,
      totalDebitKg,
      totalCreditBags,
      totalCreditKg,
      closingBags,
      closingKg,
    };
  }, [selectedPartyId, dateRange, purchases, sales, allMasters, hydrated]);

  const handlePartySelect = React.useCallback((value: string) => {
    setSelectedPartyId(value);
    const newPath = value ? `/ledger?partyId=${value}` : '/ledger';
    router.push(newPath, { scroll: false });
  }, [router]);
  
  const selectedPartyDetails = React.useMemo(() => {
    if (!selectedPartyId || allMasters.length === 0) return undefined;
    return allMasters.find(p => p.id === selectedPartyId);
  }, [selectedPartyId, allMasters]);


  if (!hydrated) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <p className="text-lg text-muted-foreground">Loading ledger data...</p>
      </div>
    );
  }

  const {
    debitEntries, 
    creditEntries, 
    totalDebit, 
    totalCredit, 
    totalDebitBags,
    totalDebitKg,
    totalCreditBags,
    totalCreditKg,
    closingBags,
    closingKg,
  } = ledgerData;

  return (
    <div className="space-y-6 print-area">
      <Card className="shadow-md no-print">
        <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-foreground">Stock Ledger</h1>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <MasterDataCombobox
                        triggerId="ledger-party-selector-trigger"
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
              <BookUser className="mr-3 h-7 w-7 no-print" /> {selectedPartyDetails.name} ({selectedPartyDetails.type})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Period: {dateRange?.from ? format(dateRange.from, "dd-MM-yyyy") : 'Start'} to {dateRange?.to ? format(dateRange.to, "dd-MM-yyyy") : 'End'}
            </p>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
                <Card className="shadow-inner h-full flex flex-col border-orange-300">
                    <CardHeader className="p-0">
                        <CardTitle className="bg-orange-200 text-orange-800 text-center p-2 font-bold">DEBIT (Inward)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow">
                      <ScrollArea>
                        <Table size="sm">
                            <TableHeader><TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Vakkal</TableHead>
                                <TableHead className="text-right">Bags</TableHead>
                                <TableHead className="text-right">Kg</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {debitEntries.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center">No purchases recorded.</TableCell></TableRow>}
                                {debitEntries.map(e => (
                                    <TableRow key={`dr-${e.id}`}>
                                        <TableCell>{format(parseISO(e.date), "dd-MM-yy")}</TableCell>
                                        <TableCell>{e.vakkal}</TableCell>
                                        <TableCell className="text-right">{e.bags?.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{e.kg ? e.kg.toFixed(2) : '-'}</TableCell>
                                        <TableCell className="text-right">{e.rate ? e.rate.toFixed(2) : '-'}</TableCell>
                                        <TableCell className="text-right">{e.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="font-bold bg-orange-50">
                                    <TableCell colSpan={2}>Total</TableCell>
                                    <TableCell className="text-right">{totalDebitBags.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{totalDebitKg.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right">{totalDebit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-1">
                <Card className="shadow-inner h-full flex flex-col border-green-300">
                    <CardHeader className="p-0">
                        <CardTitle className="bg-green-200 text-green-800 text-center p-2 font-bold">CREDIT (Outward)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow">
                      <ScrollArea>
                        <Table size="sm">
                            <TableHeader><TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Vakkal</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead className="text-right">Bags</TableHead>
                                <TableHead className="text-right">Kg</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {creditEntries.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center">No sales recorded for this party.</TableCell></TableRow>}
                                {creditEntries.map(e => (
                                    <TableRow key={`cr-${e.id}`}>
                                        <TableCell>{format(parseISO(e.date), "dd-MM-yy")}</TableCell>
                                        <TableCell>{e.vakkal}</TableCell>
                                        <TableCell>{e.customer}</TableCell>
                                        <TableCell className="text-right">{e.bags}</TableCell>
                                        <TableCell className="text-right">{e.kg.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{e.rate.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{e.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="font-bold bg-green-50">
                                    <TableCell colSpan={3}>Total</TableCell>
                                    <TableCell className="text-right">{totalCreditBags.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{totalCreditKg.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right">{totalCredit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                </Card>
            </div>
          </div>
           <CardFooter className="mt-4 pt-4 border-t-2 border-primary/50 flex justify-end">
            <div className="text-right font-bold text-lg">
                <span>Closing Stock Balance: </span>
                <span className="text-primary">
                    {closingBags.toLocaleString()} Bags / {closingKg.toLocaleString('en-IN', { minimumFractionDigits: 2 })} kg
                </span>
                 <p className="text-xs text-muted-foreground font-normal">(Debit - Credit for the selected period)</p>
            </div>
          </CardFooter>
        </Card>
      ) : (
        <Card
          className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 min-h-[300px] flex items-center justify-center no-print cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => {
            const trigger = document.getElementById('ledger-party-selector-trigger');
            trigger?.click();
          }}
        >
          <div className="text-center">
            <BookUser className="h-16 w-16 text-accent mb-4 mx-auto" />
            <p className="text-xl text-muted-foreground">
              {allMasters.length === 0 && hydrated ? "No suppliers/brokers found." : "Please select a party to view their stock ledger."}
            </p>
            <p className="text-sm text-muted-foreground mt-2">(Click here to select)</p>
          </div>
        </Card>
      )}
    </div>
  );
}
