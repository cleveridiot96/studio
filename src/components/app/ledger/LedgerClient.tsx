

"use client";
import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, PurchaseReturn, SaleReturn, MasterItemType } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, subMonths, subYears } from "date-fns";
import { BookUser, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { useSearchParams, useRouter } from "next/navigation";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { purchaseMigrator, salesMigrator } from '@/lib/dataMigrators';
import { useToast } from "@/hooks/use-toast";
import { MasterForm } from "@/components/app/masters/MasterForm";


const MASTERS_KEYS = {
  customers: 'masterCustomers',
  suppliers: 'masterSuppliers',
  agents: 'masterAgents',
  brokers: 'masterBrokers',
};
const TRANSACTIONS_KEYS = {
  purchases: 'purchasesData',
  sales: 'salesData',
  purchaseReturns: 'purchaseReturnsData',
  saleReturns: 'saleReturnsData',
};

interface LedgerTransaction {
  id: string;
  date: string;
  vakkal: string;
  party: string; 
  bags: number;
  kg: number;
  rate: number;
  amount: number;
  type: 'Purchase' | 'Sale' | 'Purchase Return' | 'Sale Return';
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
  const { toast } = useToast();
  
  const memoizedEmptyArray = React.useMemo(() => [], []);
  
  // Master data states
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(MASTERS_KEYS.customers, memoizedEmptyArray);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(MASTERS_KEYS.suppliers, memoizedEmptyArray);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(MASTERS_KEYS.agents, memoizedEmptyArray);
  const [brokers, setBrokers] = useLocalStorageState<MasterItem[]>(MASTERS_KEYS.brokers, memoizedEmptyArray);

  // Transaction states
  const [purchases] = useLocalStorageState<Purchase[]>(TRANSACTIONS_KEYS.purchases, memoizedEmptyArray, purchaseMigrator);
  const [sales] = useLocalStorageState<Sale[]>(TRANSACTIONS_KEYS.sales, memoizedEmptyArray, salesMigrator);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(TRANSACTIONS_KEYS.purchaseReturns, memoizedEmptyArray);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(TRANSACTIONS_KEYS.saleReturns, memoizedEmptyArray);

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
    const relevantMasters = [...customers, ...suppliers, ...agents, ...brokers]
      .filter(m => m.type === 'Supplier' || m.type === 'Broker' || m.type === 'Agent' || m.type === 'Customer');
    return relevantMasters.sort((a, b) => a.name.localeCompare(b.name));
  }, [hydrated, customers, suppliers, agents, brokers]);

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

  const ledgerData = React.useMemo(() => {
    if (!selectedPartyId || !dateRange?.from || !hydrated) return initialLedgerData;

    let debitTransactions: LedgerTransaction[] = [];
    let creditTransactions: LedgerTransaction[] = [];

    const toDate = dateRange.to || dateRange.from;
    const dateFilter = (date: string) => isWithinInterval(parseISO(date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) });
    
    purchases.forEach(p => {
        if ((p.supplierId === selectedPartyId || p.agentId === selectedPartyId) && dateFilter(p.date)) {
            p.items.forEach(item => {
                debitTransactions.push({
                    id: `pur-${p.id}-${item.lotNumber}`, date: p.date, vakkal: item.lotNumber, party: p.supplierName || 'N/A',
                    bags: item.quantity, kg: item.netWeight, rate: item.rate, amount: item.goodsValue, type: 'Purchase',
                });
            });
        }
    });

    saleReturns.forEach(sr => {
        const originalSale = sales.find(s => s.id === sr.originalSaleId);
        if (originalSale?.brokerId === selectedPartyId && dateFilter(sr.date)) {
            debitTransactions.push({
                id: `sr-${sr.id}`, date: sr.date, vakkal: sr.originalLotNumber, party: sr.originalCustomerName || 'N/A',
                bags: sr.quantityReturned, kg: sr.netWeightReturned, rate: originalSale.items.find(i => i.lotNumber === sr.originalLotNumber)?.rate || 0, amount: sr.returnAmount, type: 'Sale Return',
            });
        }
    });

    sales.forEach(s => {
        if (s.brokerId === selectedPartyId && dateFilter(s.date)) {
             s.items.forEach(item => {
                creditTransactions.push({
                    id: `sal-${s.id}-${item.lotNumber}`, date: s.date, vakkal: item.lotNumber, party: s.customerName || 'N/A',
                    bags: item.quantity, kg: item.netWeight, rate: item.rate, amount: item.goodsValue, type: 'Sale',
                });
            });
        }
    });

    purchaseReturns.forEach(pr => {
        const originalPurchase = purchases.find(p => p.id === pr.originalPurchaseId);
        if (originalPurchase && (originalPurchase.supplierId === selectedPartyId || originalPurchase.agentId === selectedPartyId) && dateFilter(pr.date)) {
            creditTransactions.push({
                id: `pr-${pr.id}`, date: pr.date, vakkal: pr.originalLotNumber, party: pr.originalSupplierName || 'N/A',
                bags: pr.quantityReturned, kg: pr.netWeightReturned, rate: originalPurchase.items.find(i => i.lotNumber === pr.originalLotNumber)?.rate || 0, amount: pr.returnAmount, type: 'Purchase Return',
            });
        }
    });

    debitTransactions.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    creditTransactions.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    
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
  }, [selectedPartyId, dateRange, purchases, sales, purchaseReturns, saleReturns, hydrated]);

  const handlePartySelect = React.useCallback((value: string) => {
    setSelectedPartyId(value);
    const newPath = value ? `/ledger?partyId=${value}` : '/ledger';
    router.push(newPath, { scroll: false });
  }, [router]);
  
  const selectedPartyDetails = React.useMemo(() => {
    if (!selectedPartyId || allMasters.length === 0) return undefined;
    return allMasters.find(p => p.id === selectedPartyId);
  }, [selectedPartyId, allMasters]);

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
        'Broker': setBrokers,
    };
    const setter = setters[updatedItem.type];
    if (setter) {
        setter(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i).sort((a,b) => a.name.localeCompare(b.name)));
        toast({ title: `${updatedItem.type} updated`, description: `Details for ${updatedItem.name} saved.` });
    }
    setIsMasterFormOpen(false);
    setMasterItemToEdit(null);
  };


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
                        notFoundMessage="No party found." className="h-11 text-base"
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
            <CardTitle className="text-2xl text-primary flex items-center justify-center">
              <BookUser className="mr-3 h-7 w-7 no-print" /> {selectedPartyDetails.name} ({selectedPartyDetails.type})
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
                      <CardTitle className="bg-orange-200 text-orange-800 text-center p-2 font-bold">DEBIT (Inward)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow">
                        <ScrollArea className="h-full">
                            <Table size="sm" className="whitespace-nowrap">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Vakkal</TableHead>
                                  <TableHead>Party</TableHead>
                                  <TableHead className="text-right">Bags</TableHead>
                                  <TableHead className="text-right">Kg</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {ledgerData.debitTransactions.length === 0 ? (
                                  <TableRow><TableCell colSpan={5} className="h-24 text-center">No inward stock recorded.</TableCell></TableRow>
                                ) : (
                                  ledgerData.debitTransactions.map(tx => (
                                    <TableRow key={tx.id}>
                                      <TableCell>{format(parseISO(tx.date), "dd/MM/yy")}</TableCell>
                                      <TableCell>{tx.vakkal}</TableCell>
                                      <TableCell>{tx.party}</TableCell>
                                      <TableCell className="text-right">{tx.bags.toLocaleString()}</TableCell>
                                      <TableCell className="text-right">{tx.kg.toLocaleString()}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                              <TableFooter>
                                <TableRow className="font-bold bg-orange-50">
                                  <TableCell colSpan={3}>Total</TableCell>
                                  <TableCell className="text-right">{ledgerData.totals.debitBags.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{ledgerData.totals.debitKg.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
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
                      <CardTitle className="bg-green-200 text-green-800 text-center p-2 font-bold">CREDIT (Outward)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow">
                        <ScrollArea className="h-full">
                            <Table size="sm" className="whitespace-nowrap">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Vakkal</TableHead>
                                  <TableHead>Party</TableHead>
                                  <TableHead className="text-right">Bags</TableHead>
                                  <TableHead className="text-right">Kg</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {ledgerData.creditTransactions.length === 0 ? (
                                  <TableRow><TableCell colSpan={5} className="h-24 text-center">No outward stock recorded.</TableCell></TableRow>
                                ) : (
                                  ledgerData.creditTransactions.map(tx => (
                                    <TableRow key={tx.id}>
                                      <TableCell>{format(parseISO(tx.date), "dd/MM/yy")}</TableCell>
                                      <TableCell>{tx.vakkal}</TableCell>
                                      <TableCell>{tx.party}</TableCell>
                                      <TableCell className="text-right">{tx.bags.toLocaleString()}</TableCell>
                                      <TableCell className="text-right">{tx.kg.toLocaleString()}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                              <TableFooter>
                                <TableRow className="font-bold bg-green-50">
                                  <TableCell colSpan={3}>Total</TableCell>
                                  <TableCell className="text-right">{ledgerData.totals.creditBags.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{ledgerData.totals.creditKg.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
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
                  <span>Closing Stock Balance: </span>
                  <span className={ledgerData.closingStock.kg >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {ledgerData.closingStock.bags.toLocaleString()} Bags / {ledgerData.closingStock.kg.toLocaleString('en-IN', {minimumFractionDigits: 2})} kg
                  </span>
                  <p className="text-xs text-muted-foreground font-normal">(Debit - Credit for the selected period)</p>
              </div>
          </CardFooter>
        </Card>
      ) : (
        <Card className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 min-h-[300px] flex items-center justify-center no-print cursor-pointer hover:bg-muted/30 transition-colors flex-1"
          onClick={() => { document.getElementById('ledger-party-selector-trigger')?.click(); }}>
          <div className="text-center">
            <BookUser className="h-16 w-16 text-accent mb-4 mx-auto" />
            <p className="text-xl text-muted-foreground">{allMasters.length === 0 && hydrated ? "No suppliers/brokers/agents found." : "Please select a party to view their stock ledger."}</p>
            <p className="text-sm text-muted-foreground mt-2">(Click here to select)</p>
          </div>
        </Card>
      )}
       {isMasterFormOpen && (
        <MasterForm
            isOpen={isMasterFormOpen}
            onClose={() => { setIsMasterFormOpen(false); setMasterItemToEdit(null); }}
            onSubmit={handleMasterFormSubmit}
            initialData={masterItemToEdit}
            itemTypeFromButton={masterItemToEdit?.type || 'Supplier'}
        />
      )}
    </div>
  );
}
