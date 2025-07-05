
"use client";
import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, MasterItemType, Purchase, Sale } from "@/lib/types";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const MASTERS_KEYS = {
  customers: 'masterCustomers',
  suppliers: 'masterSuppliers',
  agents: 'masterAgents',
  brokers: 'masterBrokers',
};
const TRANSACTIONS_KEYS = {
  purchases: 'purchasesData',
  sales: 'salesData',
};

interface LedgerTransaction {
  id: string;
  date: string;
  vakkal: string;
  party: string; // Customer name for sales, Supplier name for purchases
  bags: number;
  kg: number;
  rate: number;
  amount: number;
  type: 'Purchase' | 'Sale';
}

const initialLedgerData = {
  debitTransactions: [] as LedgerTransaction[],
  creditTransactions: [] as LedgerTransaction[],
  totals: {
    debitBags: 0,
    debitKg: 0,
    creditBags: 0,
    creditKg: 0,
  },
  closingStock: {
    bags: 0,
    kg: 0,
  },
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
          } catch (e) { console.error("Failed to parse master data from localStorage for key:", key, e); }
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
    if (!selectedPartyId || !dateRange?.from || !hydrated) return initialLedgerData;
    const party = allMasters.find(m => m.id === selectedPartyId);
    if (!party) return initialLedgerData;

    const toDate = dateRange.to || dateRange.from;
    let debitTransactions: LedgerTransaction[] = [];
    let creditTransactions: LedgerTransaction[] = [];

    if (party.type === 'Supplier' || party.type === 'Agent') {
      debitTransactions = purchases
        .filter(p => {
            const isMatch = (party.type === 'Supplier' && p.supplierId === party.id) || (party.type === 'Agent' && p.agentId === party.id);
            return isMatch && isWithinInterval(parseISO(p.date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) });
        })
        .map(p => ({
            id: `pur-${p.id}`,
            date: p.date,
            vakkal: p.lotNumber,
            party: p.supplierName || 'N/A',
            bags: p.quantity,
            kg: p.netWeight,
            rate: p.rate,
            amount: p.totalAmount,
            type: 'Purchase',
        }))
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    }
    
    if (party.type === 'Broker') {
      creditTransactions = sales
        .filter(s => s.brokerId === party.id && isWithinInterval(parseISO(s.date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) }))
        .map(s => ({
            id: `sal-${s.id}`,
            date: s.date,
            vakkal: s.lotNumber,
            party: s.customerName || 'N/A',
            bags: s.quantity,
            kg: s.netWeight,
            rate: s.rate,
            amount: s.goodsValue,
            type: 'Sale',
        }))
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    }

    const totals = {
      debitBags: debitTransactions.reduce((acc, tx) => acc + tx.bags, 0),
      debitKg: debitTransactions.reduce((acc, tx) => acc + tx.kg, 0),
      creditBags: creditTransactions.reduce((acc, tx) => acc + tx.bags, 0),
      creditKg: creditTransactions.reduce((acc, tx) => acc + tx.kg, 0),
    };
    
    return { 
      debitTransactions, 
      creditTransactions, 
      totals,
      closingStock: {
        bags: totals.debitBags - totals.creditBags,
        kg: totals.debitKg - totals.creditKg
      }
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
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p className="text-lg text-muted-foreground">Loading ledger data...</p></div>;
  }

  return (
    <div className="space-y-6 print-area flex flex-col flex-1">
      <Card className="shadow-md no-print">
        <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-foreground">Stock Ledger</h1>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <MasterDataCombobox
                        triggerId="ledger-party-selector-trigger" value={selectedPartyId}
                        onChange={(value) => handlePartySelect(value || "")} options={partyOptions}
                        placeholder="Select Party..." searchPlaceholder="Search parties..."
                        notFoundMessage="No party found." className="h-11 text-base" />
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
              <BookUser className="mr-3 h-7 w-7 no-print" /> {selectedPartyDetails.name} ({selectedPartyDetails.type})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Period: {dateRange?.from ? format(dateRange.from, "dd-MM-yyyy") : 'Start'} to {dateRange?.to ? format(dateRange.to, "dd-MM-yyyy") : 'End'}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col flex-grow min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow min-h-0">
                {/* Debit Side */}
                <div className="md:col-span-1 flex flex-col">
                  <Card className="shadow-inner border-orange-300 flex flex-col flex-1">
                    <CardHeader className="p-0">
                      <CardTitle className="bg-orange-200 text-orange-800 text-center p-2 font-bold">DEBIT (Inward)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow overflow-auto">
                        <Table size="sm" className="whitespace-nowrap">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Vakkal</TableHead>
                              <TableHead className="text-right">Bags</TableHead>
                              <TableHead className="text-right">Kg</TableHead>
                              <TableHead className="text-right">Rate</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ledgerData.debitTransactions.length === 0 ? (
                              <TableRow><TableCell colSpan={6} className="h-24 text-center">No inward stock recorded.</TableCell></TableRow>
                            ) : (
                              ledgerData.debitTransactions.map(tx => (
                                <TableRow key={tx.id}>
                                  <TableCell>{format(parseISO(tx.date), "dd-MM-yy")}</TableCell>
                                  <TableCell>{tx.vakkal}</TableCell>
                                  <TableCell className="text-right">{tx.bags.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{tx.kg.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{tx.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-right">{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                          <TableFooter>
                            <TableRow className="font-bold bg-orange-50">
                              <TableCell colSpan={2}>Total</TableCell>
                              <TableCell className="text-right">{ledgerData.totals.debitBags.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{ledgerData.totals.debitKg.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell colSpan={2}></TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                    </CardContent>
                  </Card>
                </div>
                {/* Credit Side */}
                <div className="md:col-span-1 flex flex-col">
                  <Card className="shadow-inner border-green-300 flex flex-col flex-1">
                    <CardHeader className="p-0">
                      <CardTitle className="bg-green-200 text-green-800 text-center p-2 font-bold">CREDIT (Outward)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow overflow-auto">
                        <Table size="sm" className="whitespace-nowrap">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Vakkal</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead className="text-right">Bags</TableHead>
                              <TableHead className="text-right">Kg</TableHead>
                              <TableHead className="text-right">Rate</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ledgerData.creditTransactions.length === 0 ? (
                              <TableRow><TableCell colSpan={7} className="h-24 text-center">No outward stock recorded.</TableCell></TableRow>
                            ) : (
                              ledgerData.creditTransactions.map(tx => (
                                <TableRow key={tx.id}>
                                  <TableCell>{format(parseISO(tx.date), "dd-MM-yy")}</TableCell>
                                  <TableCell>{tx.vakkal}</TableCell>
                                  <TableCell>{tx.party}</TableCell>
                                  <TableCell className="text-right">{tx.bags.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{tx.kg.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{tx.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-right">{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                          <TableFooter>
                            <TableRow className="font-bold bg-green-50">
                              <TableCell colSpan={3}>Total</TableCell>
                              <TableCell className="text-right">{ledgerData.totals.creditBags.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{ledgerData.totals.creditKg.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell colSpan={2}></TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                    </CardContent>
                  </Card>
                </div>
            </div>
          </CardContent>
          <CardFooter className="mt-4 pt-4 border-t-2 border-primary/50 flex justify-end">
              <div className="text-right font-bold text-lg">
                  <span>Closing Stock Balance: </span>
                  <span className={ledgerData.closingStock.kg >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {ledgerData.closingStock.bags.toLocaleString()} Bags / {ledgerData.closingStock.kg.toLocaleString('en-IN', {minimumFractionDigits: 2})} kg
                  </span>
                  <p className="text-xs text-muted-foreground font-normal">(Debit - Credit for the selected period)</p>
              </div>
          </CardFooter>
        </Card>
      ) : (
        <Card className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 min-h-[300px] flex items-center justify-center no-print cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => { document.getElementById('ledger-party-selector-trigger')?.click(); }}>
          <div className="text-center">
            <BookUser className="h-16 w-16 text-accent mb-4 mx-auto" />
            <p className="text-xl text-muted-foreground">{allMasters.length === 0 && hydrated ? "No suppliers/brokers/agents found." : "Please select a party to view their stock ledger."}</p>
            <p className="text-sm text-muted-foreground mt-2">(Click here to select)</p>
          </div>
        </Card>
      )}
    </div>
  );
}
