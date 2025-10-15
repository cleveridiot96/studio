
"use client";
import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, PurchaseReturn, SaleReturn, MasterItemType } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, subMonths, subYears, isBefore } from "date-fns";
import { BookUser, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { useSearchParams, useRouter } from "next/navigation";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { purchaseMigrator, salesMigrator } from '@/lib/dataMigrators';
import { useToast } from "@/hooks/use-toast";
import { MasterForm } from "@/components/app/masters/MasterForm";
import { useMasterData } from "@/contexts/MasterDataContext";
import { Input } from "@/components/ui/input";

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
  href?: string;
}

const initialLedgerData = {
  debitTransactions: [] as LedgerTransaction[],
  creditTransactions: [] as LedgerTransaction[],
  openingStock: { bags: 0, kg: 0 },
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
  const { isAppHydrating } = useSettings();
  const { toast } = useToast();
  const { data: masterData, setData: setMasterData, getAllMasters } = useMasterData();

  const [purchases] = useLocalStorageState<Purchase[]>(TRANSACTIONS_KEYS.purchases, [], purchaseMigrator);
  const [sales] = useLocalStorageState<Sale[]>(TRANSACTIONS_KEYS.sales, [], salesMigrator);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(TRANSACTIONS_KEYS.purchaseReturns, []);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(TRANSACTIONS_KEYS.saleReturns, []);

  const [selectedPartyId, setSelectedPartyId] = React.useState<string>("");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const { financialYear: currentFinancialYearString } = useSettings();

  const [isMasterFormOpen, setIsMasterFormOpen] = React.useState(false);
  const [masterItemToEdit, setMasterItemToEdit] = React.useState<MasterItem | null>(null);

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

  const ledgerData = React.useMemo(() => {
    if (!selectedPartyId || !dateRange?.from || isAppHydrating) return initialLedgerData;

    let openingStock = { bags: 0, kg: 0 };
    
    const allTransactions = [
        ...purchases.map(p => ({ ...p, type: 'Purchase' as const })),
        ...sales.map(s => ({ ...s, type: 'Sale' as const })),
        ...purchaseReturns.map(pr => ({ ...pr, type: 'Purchase Return' as const })),
        ...saleReturns.map(sr => ({ ...sr, type: 'Sale Return' as const }))
    ];

    allTransactions.forEach(tx => {
        if (isBefore(parseISO(tx.date), startOfDay(dateRange.from!))) {
            if (tx.type === 'Purchase' && (tx.supplierId === selectedPartyId || tx.agentId === selectedPartyId)) {
                openingStock.bags += tx.totalQuantity;
                openingStock.kg += tx.totalNetWeight;
            } else if (tx.type === 'Sale' && (tx.brokerId === selectedPartyId || tx.customerId === selectedPartyId)) {
                openingStock.bags -= tx.totalQuantity;
                openingStock.kg -= tx.totalNetWeight;
            } else if (tx.type === 'Purchase Return') {
                const originalPurchase = purchases.find(p => p.id === tx.originalPurchaseId);
                if (originalPurchase && (originalPurchase.supplierId === selectedPartyId || originalPurchase.agentId === selectedPartyId)) {
                    openingStock.bags -= tx.quantityReturned;
                    openingStock.kg -= tx.netWeightReturned;
                }
            } else if (tx.type === 'Sale Return') {
                const originalSale = sales.find(s => s.id === tx.originalSaleId);
                if (originalSale && (originalSale.brokerId === selectedPartyId || originalSale.customerId === selectedPartyId)) {
                    openingStock.bags += tx.quantityReturned;
                    openingStock.kg += tx.netWeightReturned;
                }
            }
        }
    });

    let debitTransactions: LedgerTransaction[] = [];
    let creditTransactions: LedgerTransaction[] = [];
    const toDate = dateRange.to || dateRange.from;
    const dateFilter = (date: string) => isWithinInterval(parseISO(date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) });
    
    purchases.forEach(p => {
        if ((p.supplierId === selectedPartyId || p.agentId === selectedPartyId) && dateFilter(p.date)) {
            p.items.forEach(item => {
                debitTransactions.push({
                    id: `pur-${p.id}-${item.lotNumber}`, date: p.date, vakkal: item.lotNumber, party: p.supplierName || 'N/A',
                    bags: item.quantity, kg: item.netWeight, rate: item.rate, amount: item.goodsValue, type: 'Purchase', href: `/purchases#${p.id}`
                });
            });
        }
    });

    saleReturns.forEach(sr => {
        const originalSale = sales.find(s => s.id === sr.originalSaleId);
        if (originalSale && (originalSale.brokerId === selectedPartyId || originalSale.customerId === selectedPartyId) && dateFilter(sr.date)) {
            debitTransactions.push({
                id: `sr-${sr.id}`, date: sr.date, vakkal: sr.originalLotNumber, party: sr.originalCustomerName || 'N/A',
                bags: sr.quantityReturned, kg: sr.netWeightReturned, rate: originalSale.items.find(i => i.lotNumber === sr.originalLotNumber)?.rate || 0, amount: sr.returnAmount, type: 'Sale Return', href: `/sales#${originalSale.id}`
            });
        }
    });

    sales.forEach(s => {
        if ((s.brokerId === selectedPartyId || s.customerId === selectedPartyId) && dateFilter(s.date)) {
             s.items.forEach(item => {
                creditTransactions.push({
                    id: `sal-${s.id}-${item.lotNumber}`, date: s.date, vakkal: item.lotNumber, party: s.customerName || 'N/A',
                    bags: item.quantity, kg: item.netWeight, rate: item.rate, amount: item.goodsValue, type: 'Sale', href: `/sales#${s.id}`
                });
            });
        }
    });

    purchaseReturns.forEach(pr => {
        const originalPurchase = purchases.find(p => p.id === pr.originalPurchaseId);
        if (originalPurchase && (originalPurchase.supplierId === selectedPartyId || originalPurchase.agentId === selectedPartyId) && dateFilter(pr.date)) {
            creditTransactions.push({
                id: `pr-${pr.id}`, date: pr.date, vakkal: pr.originalLotNumber, party: pr.originalSupplierName || 'N/A',
                bags: pr.quantityReturned, kg: pr.netWeightReturned, rate: originalPurchase.items.find(i => i.lotNumber === pr.originalLotNumber)?.rate || 0, amount: pr.returnAmount, type: 'Purchase Return', href: `/purchases#${originalPurchase.id}`
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
      openingStock,
      totals,
      closingStock: {
        bags: openingStock.bags + totals.debitBags - totals.creditBags,
        kg: openingStock.kg + totals.debitKg - totals.creditKg
      }
    };
  }, [selectedPartyId, dateRange, purchases, sales, purchaseReturns, saleReturns, isAppHydrating]);

   const filteredDebitTransactions = React.useMemo(() => {
    if (!debitSearch) return ledgerData.debitTransactions;
    const lowerCaseSearch = debitSearch.toLowerCase();
    return ledgerData.debitTransactions.filter(tx => 
        tx.vakkal.toLowerCase().includes(lowerCaseSearch) ||
        tx.party.toLowerCase().includes(lowerCaseSearch)
    );
  }, [ledgerData.debitTransactions, debitSearch]);

  const filteredCreditTransactions = React.useMemo(() => {
    if (!creditSearch) return ledgerData.creditTransactions;
    const lowerCaseSearch = creditSearch.toLowerCase();
    return ledgerData.creditTransactions.filter(tx => 
        tx.vakkal.toLowerCase().includes(lowerCaseSearch) ||
        tx.party.toLowerCase().includes(lowerCaseSearch)
    );
  }, [ledgerData.creditTransactions, creditSearch]);

  const totalFilteredDebitBags = React.useMemo(() => filteredDebitTransactions.reduce((sum, tx) => sum + tx.bags, 0), [filteredDebitTransactions]);
  const totalFilteredDebitKg = React.useMemo(() => filteredDebitTransactions.reduce((sum, tx) => sum + tx.kg, 0), [filteredDebitTransactions]);
  const totalFilteredCreditBags = React.useMemo(() => filteredCreditTransactions.reduce((sum, tx) => sum + tx.bags, 0), [filteredCreditTransactions]);
  const totalFilteredCreditKg = React.useMemo(() => filteredCreditTransactions.reduce((sum, tx) => sum + tx.kg, 0), [filteredCreditTransactions]);

  const handlePartySelect = React.useCallback((value: string | undefined) => {
    setSelectedPartyId(value || "");
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
    setMasterData(updatedItem.type, prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i).sort((a,b) => a.name.localeCompare(b.name)));
    toast({ title: `${updatedItem.type} updated`, description: `Details for ${updatedItem.name} saved.` });
    setIsMasterFormOpen(false);
    setMasterItemToEdit(null);
  };


  if (isAppHydrating) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p className="text-lg text-muted-foreground">LOADING LEDGER DATA...</p></div>;
  }

  return (
    <div className="space-y-4 print-area flex flex-col h-[calc(100vh-8rem)]">
      <Card className="shadow-md no-print flex-shrink-0">
        <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">STOCK LEDGER</h1>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <MasterDataCombobox
                        triggerId="ledger-party-selector-trigger" value={selectedPartyId}
                        onChange={handlePartySelect} options={partyOptions}
                        placeholder="SELECT PARTY..." searchPlaceholder="SEARCH PARTIES..."
                        notFoundMessage="NO PARTY FOUND." className="h-9 text-base"
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

      {selectedPartyId && selectedPartyDetails ? (
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
            {/* Debit Side */}
            <Card className="shadow-lg flex flex-col">
                <CardHeader className="p-4 border-b">
                    <CardTitle className="text-xl text-orange-800">DEBIT (INWARD)</CardTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search debits..." value={debitSearch} onChange={e => setDebitSearch(e.target.value)} className="pl-9 h-9" />
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-grow min-h-0">
                    <ScrollArea className="h-full">
                        <Table size="sm">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>DATE</TableHead>
                                    <TableHead>VAKKAL</TableHead>
                                    <TableHead className="text-right">BAGS</TableHead>
                                    <TableHead className="text-right">KG</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="font-semibold bg-muted/30"><TableCell colSpan={2}>OPENING BALANCE</TableCell><TableCell className="text-right">{ledgerData.openingStock.bags.toLocaleString()}</TableCell><TableCell className="text-right">{ledgerData.openingStock.kg.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell></TableRow>
                                {filteredDebitTransactions.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No inward stock in this period.</TableCell></TableRow>
                                ) : (
                                filteredDebitTransactions.map(tx => (
                                    <TableRow key={tx.id} onClick={() => tx.href && router.push(tx.href)} className="uppercase cursor-pointer hover:bg-orange-50">
                                    <TableCell>{format(parseISO(tx.date), "dd/MM/yy")}</TableCell>
                                    <TableCell>{tx.vakkal}</TableCell>
                                    <TableCell className="text-right">{tx.bags.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{tx.kg.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                                )}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="font-bold bg-orange-50">
                                <TableCell colSpan={2}>Total Debits</TableCell>
                                <TableCell className="text-right">{(totalFilteredDebitBags + ledgerData.openingStock.bags).toLocaleString()}</TableCell>
                                <TableCell className="text-right">{(totalFilteredDebitKg + ledgerData.openingStock.kg).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
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
                    <CardTitle className="text-xl text-green-800">CREDIT (OUTWARD)</CardTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search credits..." value={creditSearch} onChange={e => setCreditSearch(e.target.value)} className="pl-9 h-9" />
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-grow min-h-0">
                    <ScrollArea className="h-full">
                        <Table size="sm">
                            <TableHeader>
                                <TableRow>
                                <TableHead>DATE</TableHead>
                                <TableHead>VAKKAL</TableHead>
                                <TableHead className="text-right">BAGS</TableHead>
                                <TableHead className="text-right">KG</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCreditTransactions.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No outward stock in this period.</TableCell></TableRow>
                                ) : (
                                filteredCreditTransactions.map(tx => (
                                    <TableRow key={tx.id} onClick={() => tx.href && router.push(tx.href)} className="uppercase cursor-pointer hover:bg-green-50">
                                    <TableCell>{format(parseISO(tx.date), "dd/MM/yy")}</TableCell>
                                    <TableCell>{tx.vakkal}</TableCell>
                                    <TableCell className="text-right">{tx.bags.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{tx.kg.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                                )}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="font-bold bg-green-50">
                                <TableCell colSpan={2}>Total Credits</TableCell>
                                <TableCell className="text-right">{totalFilteredCreditBags.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{totalFilteredCreditKg.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                         <ScrollBar orientation="vertical" />
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card className="md:col-span-2 mt-2 p-4 flex justify-between items-center bg-primary/5">
                <div className="text-left">
                    <p className="text-sm text-muted-foreground uppercase">PARTY</p>
                    <p className="text-lg font-bold">{selectedPartyDetails.name} ({selectedPartyDetails.type})</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground uppercase">Closing Stock Balance</p>
                    <p className={`text-2xl font-bold ${ledgerData.closingStock.kg >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {ledgerData.closingStock.bags.toLocaleString()} BAGS / {ledgerData.closingStock.kg.toLocaleString('en-IN', {minimumFractionDigits: 2})} KG
                    </p>
                </div>
            </Card>
        </div>
      ) : (
        <Card
          className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 flex-grow flex items-center justify-center no-print cursor-pointer hover:bg-muted/30 transition-colors flex-1"
          onClick={() => { document.getElementById('ledger-party-selector-trigger')?.click(); }}>
          <div className="text-center">
            <BookUser className="h-16 w-16 text-accent mb-4 mx-auto" />
            <p className="text-xl text-muted-foreground uppercase">{allMasters.length === 0 ? "NO PARTIES FOUND." : "PLEASE SELECT A PARTY TO VIEW THEIR STOCK LEDGER."}</p>
            <p className="text-sm text-muted-foreground mt-2 uppercase">(CLICK HERE TO SELECT)</p>
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
            fixedIds={[]}
        />
      )}
    </div>
  );
}

