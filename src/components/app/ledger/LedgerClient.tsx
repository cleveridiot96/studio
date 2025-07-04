
"use client";
import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, subMonths } from "date-fns";
import { BookUser, Printer } from "lucide-react";
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
  saleVakkal: number;
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
};

export function LedgerClient() {
  const [hydrated, setHydrated] = React.useState(false);
  const [allMasters, setAllMasters] = React.useState<MasterItem[]>([]);
  
  const memoizedEmptyArray = React.useMemo(() => [], []);
  const [purchases] = useLocalStorageState<Purchase[]>(TRANSACTIONS_KEYS.purchases, memoizedEmptyArray);
  const [sales] = useLocalStorageState<Sale[]>(TRANSACTIONS_KEYS.sales, memoizedEmptyArray);

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

    // Debit Side: Purchases where the party is the supplier or agent
    const periodDebitEntries: TAccountPurchaseEntry[] = purchases
      .filter(p => (p.supplierId === party.id || p.agentId === party.id))
      .filter(p => isWithinInterval(parseISO(p.date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) }))
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

    // Credit Side: Sales where the party is the broker
    const periodCreditEntries: TAccountSaleEntry[] = sales
      .filter(s => s.brokerId === party.id)
      .filter(s => isWithinInterval(parseISO(s.date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) }))
      .map(s => ({
        id: s.id,
        date: s.date,
        saleVakkal: s.quantity,
        customer: s.customerName || s.customerId,
        broker: s.brokerName || s.brokerId || 'N/A',
        kg: s.netWeight,
        rate: s.rate,
        amount: s.billedAmount,
      }))
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
      
    const totalDebit = periodDebitEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalCredit = periodCreditEntries.reduce((sum, entry) => sum + entry.amount, 0);

    return {
      debitEntries: periodDebitEntries,
      creditEntries: periodCreditEntries,
      totalDebit,
      totalCredit,
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

  const {debitEntries, creditEntries, totalDebit, totalCredit} = ledgerData;

  return (
    <div className="space-y-6 print-area">
      <Card className="shadow-md no-print">
        <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-foreground">Stock Ledger</h1>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <MasterDataCombobox
                        value={selectedPartyId}
                        onChange={(value) => handlePartySelect(value || "")}
                        options={partyOptions}
                        placeholder="Select Party..."
                        searchPlaceholder="Search parties..."
                        notFoundMessage="No party found."
                        className="w-full md:w-[280px]"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-x-2 space-y-4 md:space-y-0">
            <Card className="shadow-lg">
                <CardHeader className="p-0">
                    <CardTitle className="bg-orange-200 text-orange-800 text-center p-2 font-bold">DEBIT (Purchases via Party)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Vakkal (Bags)</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {debitEntries.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center">No purchases recorded.</TableCell></TableRow>}
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
                                <TableCell colSpan={4}>Total Purchase Value</TableCell>
                                <TableCell className="text-right">{totalDebit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader className="p-0">
                    <CardTitle className="bg-green-200 text-green-800 text-center p-2 font-bold">CREDIT (Sales via Party)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Bags</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {creditEntries.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center">No sales recorded for this party.</TableCell></TableRow>}
                            {creditEntries.map(e => (
                                <TableRow key={e.id}>
                                    <TableCell>{format(parseISO(e.date), "dd-MM-yy")}</TableCell>
                                    <TableCell>{e.customer}</TableCell>
                                    <TableCell className="text-right">{e.saleVakkal}</TableCell>
                                    <TableCell className="text-right">{e.kg.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{e.rate.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{e.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                         <TableFooter>
                            <TableRow className="font-bold bg-green-50">
                                <TableCell colSpan={5}>Total Sales Value</TableCell>
                                <TableCell className="text-right">{totalCredit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
          </div>
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
