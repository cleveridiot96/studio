
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
import { ScrollArea } from "@/components/ui/scroll-area";

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
  bags: number;
  kg: number;
  rate: number;
  amount: number;
  type: 'Purchase' | 'Sale';
  customer?: string;
  supplier?: string;
  agent?: string;
}

const initialLedgerData: { transactions: LedgerTransaction[], partyType: MasterItemType | null, totals: any } = {
  transactions: [],
  partyType: null,
  totals: {
    bags: 0,
    kg: 0,
    amount: 0,
  }
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
    let transactions: LedgerTransaction[] = [];

    if (party.type === 'Supplier' || party.type === 'Agent') {
      transactions = purchases
        .filter(p => {
            const isMatch = (party.type === 'Supplier' && p.supplierId === party.id) || (party.type === 'Agent' && p.agentId === party.id);
            return isMatch && isWithinInterval(parseISO(p.date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) });
        })
        .map(p => ({ id: p.id, date: p.date, vakkal: p.lotNumber, bags: p.quantity, kg: p.netWeight, rate: p.rate, amount: p.totalAmount, type: 'Purchase', supplier: p.supplierName, agent: p.agentName }))
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    } else if (party.type === 'Broker') {
      transactions = sales
        .filter(s => s.brokerId === party.id && isWithinInterval(parseISO(s.date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) }))
        .map(s => ({ id: s.id, date: s.date, vakkal: s.lotNumber, bags: s.quantity, kg: s.netWeight, rate: s.rate, amount: s.billedAmount, type: 'Sale', customer: s.customerName }))
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }

    const totals = transactions.reduce((acc, tx) => {
        acc.bags += tx.bags;
        acc.kg += tx.kg;
        acc.amount += tx.amount;
        return acc;
    }, { bags: 0, kg: 0, amount: 0 });
    
    return { transactions, partyType: party.type, totals };
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

  const { transactions, partyType, totals } = ledgerData;

  const getTableTitle = () => {
      if (partyType === 'Supplier' || partyType === 'Agent') return 'Purchase Transactions (Stock Inward)';
      if (partyType === 'Broker') return 'Sale Transactions (Stock Outward)';
      return 'Transactions';
  }

  if (!hydrated) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p className="text-lg text-muted-foreground">Loading ledger data...</p></div>;
  }

  return (
    <div className="space-y-6 print-area">
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
          <CardContent>
            <h3 className="text-lg font-semibold mb-3">{getTableTitle()}</h3>
            <ScrollArea className="border rounded-md">
                <div className="overflow-auto" style={{maxHeight: '65vh'}}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Vakkal</TableHead>
                                {partyType === 'Broker' && <TableHead>Customer</TableHead>}
                                {partyType === 'Agent' && <TableHead>Supplier</TableHead>}
                                <TableHead className="text-right">Bags</TableHead>
                                <TableHead className="text-right">Kg</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead className="text-right">Amount (₹)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length === 0 && (
                                <TableRow><TableCell colSpan={partyType === 'Broker' || partyType === 'Agent' ? 7 : 6} className="h-24 text-center">No transactions recorded for this party in the selected period.</TableCell></TableRow>
                            )}
                            {transactions.map(tx => (
                                <TableRow key={tx.id}>
                                    <TableCell>{format(parseISO(tx.date), "dd-MM-yy")}</TableCell>
                                    <TableCell>{tx.vakkal}</TableCell>
                                    {partyType === 'Broker' && <TableCell>{tx.customer}</TableCell>}
                                    {partyType === 'Agent' && <TableCell>{tx.supplier}</TableCell>}
                                    <TableCell className="text-right">{tx.bags.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{tx.kg.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right">{tx.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right font-medium">{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                         <TableFooter>
                            <TableRow className="font-bold bg-muted/50">
                                <TableCell colSpan={partyType === 'Broker' || partyType === 'Agent' ? 2 : 1}>Total</TableCell>
                                {partyType === 'Broker' || partyType === 'Agent' ? <TableCell /> : null}
                                <TableCell className="text-right">{totals.bags.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{totals.kg.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                                <TableCell />
                                <TableCell className="text-right">{totals.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </ScrollArea>
          </CardContent>
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
