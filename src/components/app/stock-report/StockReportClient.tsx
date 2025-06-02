
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, MasterItem, LocationTransfer, PurchaseReturn, SaleReturn } from "@/lib/types"; // Added Returns
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { addDays, format, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, SlidersHorizontal, Printer, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear } from "@/lib/utils";

const PURCHASES_STORAGE_KEY = 'purchasesData';
const PURCHASE_RETURNS_STORAGE_KEY = 'purchaseReturnsData'; // New
const SALES_STORAGE_KEY = 'salesData';
const SALE_RETURNS_STORAGE_KEY = 'saleReturnsData'; // New
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData';

interface StockReportItem {
  lotNumber: string;
  locationId?: string;
  locationName?: string;
  purchaseDate?: string;
  purchaseBags: number;
  purchaseWeight: number;
  purchaseRate: number;
  purchaseValue: number;
  soldBags: number;
  soldWeight: number;
  soldValue: number;
  purchaseReturnedBags: number; // New
  purchaseReturnedWeight: number; // New
  saleReturnedBags: number; // New
  saleReturnedWeight: number; // New
  transferredOutBags: number;
  transferredOutWeight: number;
  transferredInBags: number;
  transferredInWeight: number;
  remainingBags: number;
  remainingWeight: number;
  avgSaleRate?: number;
  daysInStock?: number;
  turnoverRate?: number;
}

export function StockReportClient() {
  const { financialYear, isAppHydrating } = useSettings();
  const memoizedEmptyArray = React.useMemo(() => [], []);

  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyArray);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(PURCHASE_RETURNS_STORAGE_KEY, memoizedEmptyArray); // New
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(SALE_RETURNS_STORAGE_KEY, memoizedEmptyArray); // New
  const [warehouses] = useLocalStorageState<MasterItem[]>(WAREHOUSES_STORAGE_KEY, memoizedEmptyArray);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, memoizedEmptyArray);

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [lotNumberFilter, setLotNumberFilter] = React.useState<string>("");
  const [locationFilter, setLocationFilter] = React.useState<string>("");
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
    if (!dateRange) {
        const [startYearStr] = financialYear.split('-');
        const startYear = parseInt(startYearStr, 10);
        if (!isNaN(startYear)) setDateRange({ from: new Date(startYear, 3, 1), to: endOfDay(new Date(startYear + 1, 2, 31)) });
        else setDateRange({ from: startOfDay(addDays(new Date(), -90)), to: endOfDay(new Date()) });
    }
  }, [hydrated, financialYear, dateRange]);

  const processedReportData = React.useMemo(() => {
    if (isAppHydrating || !hydrated || !dateRange?.from) return [];
    const reportItemsMap = new Map<string, StockReportItem>();
    const effectiveToDate = dateRange.to || dateRange.from;

    const filterByDate = <T extends {date: string}>(items: T[]) => items.filter(i => isWithinInterval(parseISO(i.date), { start: dateRange.from!, end: endOfDay(effectiveToDate) }));
    
    const fyPurchases = filterByDate(purchases);
    const fyPurchaseReturns = filterByDate(purchaseReturns);
    const fySales = filterByDate(sales);
    const fySaleReturns = filterByDate(saleReturns);
    const fyLocationTransfers = filterByDate(locationTransfers);

    fyPurchases.forEach(p => {
      if (lotNumberFilter && !p.lotNumber.toLowerCase().includes(lotNumberFilter.toLowerCase())) return;
      if (locationFilter && p.locationId !== locationFilter) return;
      const key = `${p.lotNumber}-${p.locationId}`;
      let item = reportItemsMap.get(key);
      if (!item) {
        item = {
          lotNumber: p.lotNumber, locationId: p.locationId,
          locationName: warehouses.find(w => w.id === p.locationId)?.name || p.locationId,
          purchaseDate: p.date, purchaseBags: 0, purchaseWeight: 0, purchaseRate: p.rate, purchaseValue: 0,
          soldBags: 0, soldWeight: 0, soldValue: 0,
          purchaseReturnedBags: 0, purchaseReturnedWeight: 0, saleReturnedBags: 0, saleReturnedWeight: 0,
          transferredOutBags: 0, transferredOutWeight: 0, transferredInBags: 0, transferredInWeight: 0,
          remainingBags: 0, remainingWeight: 0,
        };
      }
      item.purchaseBags += p.quantity; item.purchaseWeight += p.netWeight; item.purchaseValue += p.totalAmount;
      if (new Date(p.date) < new Date(item.purchaseDate || '9999-12-31')) { item.purchaseDate = p.date; item.purchaseRate = p.rate; }
      reportItemsMap.set(key, item);
    });

    fyPurchaseReturns.forEach(pr => {
      const originalPurchase = purchases.find(p => p.id === pr.originalPurchaseId);
      if (originalPurchase) {
        if (lotNumberFilter && !originalPurchase.lotNumber.toLowerCase().includes(lotNumberFilter.toLowerCase())) return;
        if (locationFilter && originalPurchase.locationId !== locationFilter) return;
        const key = `${originalPurchase.lotNumber}-${originalPurchase.locationId}`;
        let item = reportItemsMap.get(key);
        if (item) { item.purchaseReturnedBags += pr.quantityReturned; item.purchaseReturnedWeight += pr.netWeightReturned; }
      }
    });

    fySales.forEach(s => {
      const relatedPurchase = purchases.find(p => p.lotNumber === s.lotNumber);
      if (relatedPurchase) {
        if (lotNumberFilter && !s.lotNumber.toLowerCase().includes(lotNumberFilter.toLowerCase())) return;
        if (locationFilter && relatedPurchase.locationId !== locationFilter) return;
        const key = `${s.lotNumber}-${relatedPurchase.locationId}`;
        let item = reportItemsMap.get(key);
        if (item) { item.soldBags += s.quantity; item.soldWeight += s.netWeight; item.soldValue += s.totalAmount; }
      }
    });
    
    fySaleReturns.forEach(sr => {
        const originalSale = sales.find(s => s.id === sr.originalSaleId);
        if (originalSale) {
            const relatedPurchase = purchases.find(p => p.lotNumber === originalSale.lotNumber);
            if (relatedPurchase) {
                if (lotNumberFilter && !originalSale.lotNumber.toLowerCase().includes(lotNumberFilter.toLowerCase())) return;
                if (locationFilter && relatedPurchase.locationId !== locationFilter) return;
                const key = `${originalSale.lotNumber}-${relatedPurchase.locationId}`;
                let item = reportItemsMap.get(key);
                if (item) { item.saleReturnedBags += sr.quantityReturned; item.saleReturnedWeight += sr.netWeightReturned; }
            }
        }
    });

    fyLocationTransfers.forEach(transfer => {
      transfer.items.forEach(transferItem => {
        if (lotNumberFilter && !transferItem.lotNumber.toLowerCase().includes(lotNumberFilter.toLowerCase())) return;
        if (!locationFilter || transfer.fromWarehouseId === locationFilter) {
            const fromKey = `${transferItem.lotNumber}-${transfer.fromWarehouseId}`;
            let fromItem = reportItemsMap.get(fromKey);
            if (fromItem) { fromItem.transferredOutBags += transferItem.bagsToTransfer; fromItem.transferredOutWeight += transferItem.netWeightToTransfer; }
        }
        if (!locationFilter || transfer.toWarehouseId === locationFilter) {
            const toKey = `${transferItem.lotNumber}-${transfer.toWarehouseId}`;
            let toItem = reportItemsMap.get(toKey);
            if (!toItem) { /* Create if not exists as transfers can introduce lots to new locations */ }
            if (toItem) { toItem.transferredInBags += transferItem.bagsToTransfer; toItem.transferredInWeight += transferItem.netWeightToTransfer; }
        }
      });
    });

    const result: StockReportItem[] = [];
    reportItemsMap.forEach(item => {
      item.remainingBags = item.purchaseBags + item.transferredInBags + item.saleReturnedBags
                          - item.soldBags - item.transferredOutBags - item.purchaseReturnedBags;
      const totalEffectivePurchaseWeight = item.purchaseWeight + item.transferredInWeight + item.saleReturnedWeight;
      const totalEffectivePurchaseBags = item.purchaseBags + item.transferredInBags + item.saleReturnedBags;
      const avgWeightPerBag = totalEffectivePurchaseBags > 0 ? totalEffectivePurchaseWeight / totalEffectivePurchaseBags : 50;
      item.remainingWeight = item.remainingBags * avgWeightPerBag;

      item.avgSaleRate = item.soldWeight > 0 ? item.soldValue / item.soldWeight : 0;
      if (item.purchaseDate) item.daysInStock = Math.floor((new Date().getTime() - parseISO(item.purchaseDate).getTime()) / (1000 * 3600 * 24));
      const totalInitialBags = item.purchaseBags + item.transferredInBags;
      item.turnoverRate = totalInitialBags > 0 ? ((item.soldBags + item.transferredOutBags) / totalInitialBags) * 100 : 0;
      if (item.purchaseBags > 0 || item.transferredInBags > 0 || item.soldBags > 0 || item.transferredOutBags > 0 || item.purchaseReturnedBags > 0 || item.saleReturnedBags > 0) {
         result.push(item);
      }
    });
    return result.sort((a,b) => (a.purchaseDate && b.purchaseDate) ? parseISO(b.purchaseDate).getTime() - parseISO(a.purchaseDate).getTime() : 0);
  }, [purchases, purchaseReturns, sales, saleReturns, warehouses, locationTransfers, dateRange, lotNumberFilter, locationFilter, hydrated, isAppHydrating, financialYear]);

  if (isAppHydrating || !hydrated) return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p>Loading data...</p></div>;

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-foreground">Stock Report (FY {financialYear})</h1>
        <div className="flex items-center gap-2">
            <Sheet><SheetTrigger asChild><Button variant="outline" size="lg"><SlidersHorizontal className="mr-2 h-5 w-5"/>Filters</Button></SheetTrigger>
            <SheetContent className="w-[350px] sm:w-[450px]"><SheetHeader><SheetTitle>Filter Stock Report</SheetTitle><SheetDescription>Refine by date, lot, or location.</SheetDescription></SheetHeader>
            <div className="grid gap-6 py-6">
                <div className="space-y-2"><label htmlFor="dr-stock" className="text-sm font-medium">Date Range</label><DatePickerWithRange date={dateRange} onDateChange={setDateRange} id="dr-stock" /></div>
                <div className="space-y-2"><label htmlFor="lot-stock" className="text-sm font-medium">Lot No.</label><Input id="lot-stock" placeholder="Enter Lot" value={lotNumberFilter} onChange={(e) => setLotNumberFilter(e.target.value)} /></div>
                <div className="space-y-2"><label htmlFor="loc-stock" className="text-sm font-medium">Location</label><Select value={locationFilter} onValueChange={setLocationFilter}><SelectTrigger id="loc-stock"><SelectValue placeholder="All Locations"/></SelectTrigger><SelectContent><SelectItem value="">All</SelectItem>{warehouses.map(wh=>(<SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>))}</SelectContent></Select></div>
            </div><SheetFooter><SheetClose asChild><Button>Apply</Button></SheetClose></SheetFooter></SheetContent></Sheet>
            <Button variant="outline" size="icon" onClick={()=>window.print()}><Printer className="h-5 w-5"/><span className="sr-only">Print</span></Button>
        </div>
      </div>
      <Card className="shadow-xl"><CardHeader><CardTitle className="flex items-center gap-2">Stock Movement & Status</CardTitle></CardHeader>
        <CardContent><ScrollArea className="h-[500px] rounded-md border print:h-auto print:overflow-visible">
            <Table><TableHeader><TableRow><TableHead>Lot No.</TableHead><TableHead>Location</TableHead><TableHead>Purch. Date</TableHead><TableHead className="text-right">Net In (Bags)</TableHead><TableHead className="text-right">Net Out (Bags)</TableHead><TableHead className="text-right">Rem. Bags</TableHead><TableHead className="text-right">Rem. Wt (kg)</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
            <TableBody>{processedReportData.length === 0 && (<TableRow><TableCell colSpan={8} className="text-center h-32">No stock data.</TableCell></TableRow>)}
            {processedReportData.map((item) => {
                const netInBags = item.purchaseBags + item.transferredInBags + item.saleReturnedBags;
                const netOutBags = item.soldBags + item.transferredOutBags + item.purchaseReturnedBags;
                return (<TableRow key={`${item.lotNumber}-${item.locationId}`}>
                    <TableCell className="font-semibold">{item.lotNumber}</TableCell><TableCell>{item.locationName}</TableCell>
                    <TableCell>{item.purchaseDate ? format(parseISO(item.purchaseDate), "dd-MM-yy") : 'N/A'}</TableCell>
                    <TableCell className="text-right text-green-600">{netInBags.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">{netOutBags.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">{item.remainingBags.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.remainingWeight.toLocaleString(undefined,{minFrac:0,maxFrac:0})}</TableCell>
                    <TableCell className="text-center">{item.remainingBags <= 0 ? (<Badge variant="destructive">Zero</Badge>):item.remainingBags <=5 ? (<Badge className="bg-yellow-500 hover:bg-yellow-600">Low</Badge>):(item.turnoverRate||0)>=75?(<Badge className="bg-green-500">Fast</Badge>):(item.daysInStock||0)>90&&(item.turnoverRate||0)<25?(<Badge className="bg-orange-500">Slow</Badge>):(<Badge variant="secondary">Stock</Badge>)}</TableCell>
                </TableRow>);
            })}
            </TableBody></Table>
        </ScrollArea></CardContent>
      </Card>
    </div>
  );
}
