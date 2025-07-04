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
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { TrendingUp, SlidersHorizontal, Printer, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear, cn } from "@/lib/utils";

const PURCHASES_STORAGE_KEY = 'purchasesData';
const PURCHASE_RETURNS_STORAGE_KEY = 'purchaseReturnsData'; // New
const SALES_STORAGE_KEY = 'salesData';
const SALE_RETURNS_STORAGE_KEY = 'saleReturnsData'; // New
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData';

const DEAD_STOCK_THRESHOLD_DAYS = 180;

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
  purchaseReturnedBags: number;
  purchaseReturnedWeight: number;
  saleReturnedBags: number;
  saleReturnedWeight: number;
  transferredOutBags: number;
  transferredOutWeight: number;
  transferredInBags: number;
  transferredInWeight: number;
  remainingBags: number;
  remainingWeight: number;
  avgSaleRate?: number;
  daysInStock?: number;
  turnoverRate?: number;
  isDeadStock?: boolean; // New property
}

export function StockReportClient() {
  const { financialYear, isAppHydrating } = useSettings();
  const memoizedEmptyArray = React.useMemo(() => [], []);

  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyArray);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(PURCHASE_RETURNS_STORAGE_KEY, memoizedEmptyArray);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(SALE_RETURNS_STORAGE_KEY, memoizedEmptyArray);
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

    // Use all purchases within the FY to establish the base lots, regardless of date filter
    const fyPurchasesAll = purchases.filter(p => isDateInFinancialYear(p.date, financialYear));
    fyPurchasesAll.forEach(p => {
        const key = `${p.lotNumber}-${p.locationId}`;
        reportItemsMap.set(key, {
            lotNumber: p.lotNumber, locationId: p.locationId,
            locationName: warehouses.find(w => w.id === p.locationId)?.name || p.locationId,
            purchaseDate: p.date, purchaseBags: p.quantity, purchaseWeight: p.netWeight, purchaseRate: p.rate, purchaseValue: p.totalAmount,
            soldBags: 0, soldWeight: 0, soldValue: 0,
            purchaseReturnedBags: 0, purchaseReturnedWeight: 0, saleReturnedBags: 0, saleReturnedWeight: 0,
            transferredOutBags: 0, transferredOutWeight: 0, transferredInBags: 0, transferredInWeight: 0,
            remainingBags: 0, remainingWeight: 0,
        });
    });

    const fyLocationTransfersAll = locationTransfers.filter(lt => isDateInFinancialYear(lt.date, financialYear));
    fyLocationTransfersAll.forEach(transfer => {
      transfer.items.forEach(item => {
        // Adjust source lot (which must exist from purchases)
        const fromKey = `${item.originalLotNumber}-${transfer.fromWarehouseId}`;
        const fromItem = reportItemsMap.get(fromKey);
        if (fromItem) {
            fromItem.transferredOutBags += item.bagsToTransfer;
            fromItem.transferredOutWeight += item.netWeightToTransfer;
        }

        // Create/adjust destination lot
        const toKey = `${item.newLotNumber}-${transfer.toWarehouseId}`;
        let toItem = reportItemsMap.get(toKey);
        if (!toItem) {
            const originalPurchaseForLot = purchases.find(p => p.lotNumber === item.originalLotNumber);
            toItem = {
                lotNumber: item.newLotNumber, locationId: transfer.toWarehouseId,
                locationName: warehouses.find(w => w.id === transfer.toWarehouseId)?.name || transfer.toWarehouseId,
                purchaseDate: originalPurchaseForLot?.date || transfer.date, purchaseBags: 0, purchaseWeight: 0, 
                purchaseRate: originalPurchaseForLot?.rate || 0, purchaseValue: 0,
                soldBags: 0, soldWeight: 0, soldValue: 0,
                purchaseReturnedBags: 0, purchaseReturnedWeight: 0, saleReturnedBags: 0, saleReturnedWeight: 0,
                transferredOutBags: 0, transferredOutWeight: 0, transferredInBags: 0, transferredInWeight: 0,
                remainingBags: 0, remainingWeight: 0,
            };
            reportItemsMap.set(toKey, toItem);
        }
        toItem.transferredInBags += item.bagsToTransfer;
        toItem.transferredInWeight += item.netWeightToTransfer;
      });
    });

    const fySales = filterByDate(sales);
    fySales.forEach(s => {
        const MUMBAI_WAREHOUSE_ID = 'fixed-wh-mumbai';
        const key = `${s.lotNumber}-${MUMBAI_WAREHOUSE_ID}`;
        const item = reportItemsMap.get(key);
        if(item) {
            item.soldBags += s.quantity;
            item.soldWeight += s.netWeight;
            item.soldValue += s.billedAmount;
        }
    });

    const fyPurchaseReturns = filterByDate(purchaseReturns);
    fyPurchaseReturns.forEach(pr => {
        const originalPurchase = purchases.find(p => p.id === pr.originalPurchaseId);
        if (originalPurchase) {
            const key = `${originalPurchase.lotNumber}-${originalPurchase.locationId}`;
            const item = reportItemsMap.get(key);
            if (item) {
                item.purchaseReturnedBags += pr.quantityReturned;
                item.purchaseReturnedWeight += pr.netWeightReturned;
            }
        }
    });

    const fySaleReturns = filterByDate(saleReturns);
    fySaleReturns.forEach(sr => {
        const MUMBAI_WAREHOUSE_ID = 'fixed-wh-mumbai';
        const key = `${sr.originalLotNumber}-${MUMBAI_WAREHOUSE_ID}`;
        const item = reportItemsMap.get(key);
        if (item) {
            item.saleReturnedBags += sr.quantityReturned;
            item.saleReturnedWeight += sr.netWeightReturned;
        }
    });

    let result = Array.from(reportItemsMap.values());

    if (lotNumberFilter) {
        result = result.filter(item => item.lotNumber.toLowerCase().includes(lotNumberFilter.toLowerCase()));
    }
    if (locationFilter) {
        result = result.filter(item => item.locationId === locationFilter);
    }
    
    result.forEach(item => {
      item.remainingBags = item.purchaseBags + item.transferredInBags + item.saleReturnedBags
                          - item.soldBags - item.transferredOutBags - item.purchaseReturnedBags;
      item.remainingWeight = item.purchaseWeight + item.transferredInWeight + item.saleReturnedWeight
                           - item.soldWeight - item.transferredOutWeight - item.purchaseReturnedWeight;

      item.avgSaleRate = item.soldWeight > 0 ? item.soldValue / item.soldWeight : 0;
      if (item.purchaseDate) item.daysInStock = Math.floor((new Date().getTime() - parseISO(item.purchaseDate).getTime()) / (1000 * 3600 * 24));
      const totalInitialBags = item.purchaseBags + item.transferredInBags;
      item.turnoverRate = totalInitialBags > 0 ? ((item.soldBags + item.transferredOutBags) / totalInitialBags) * 100 : 0;
      item.isDeadStock = item.remainingBags > 0 && item.daysInStock !== undefined && item.daysInStock > DEAD_STOCK_THRESHOLD_DAYS;
    });

    return result.filter(item => item.purchaseBags > 0 || item.transferredInBags > 0 || item.soldBags > 0 || item.transferredOutBags > 0 || item.remainingBags > 0)
        .sort((a,b) => (a.purchaseDate && b.purchaseDate) ? parseISO(b.purchaseDate).getTime() - parseISO(a.purchaseDate).getTime() : 0);
  }, [purchases, purchaseReturns, sales, saleReturns, warehouses, locationTransfers, dateRange, lotNumberFilter, locationFilter, hydrated, isAppHydrating, financialYear]);

  const locationOptions = React.useMemo(() => {
    const options = warehouses.map(w => ({ value: w.id, label: w.name }));
    return [{ value: "", label: "All Locations" }, ...options];
  }, [warehouses]);

  if (isAppHydrating || !hydrated) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p>Loading data...</p></div>;
  }

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
                <div className="space-y-2"><label htmlFor="loc-stock" className="text-sm font-medium">Location</label>
                  <MasterDataCombobox
                      value={locationFilter}
                      onChange={(value) => setLocationFilter(value || "")}
                      options={locationOptions}
                      placeholder="All Locations"
                      searchPlaceholder="Search locations..."
                  />
                </div>
            </div><SheetFooter><SheetClose asChild><Button>Apply</Button></SheetClose></SheetFooter></SheetContent></Sheet>
            <Button variant="outline" size="icon" onClick={()=>window.print()}><Printer className="h-5 w-5"/><span className="sr-only">Print</span></Button>
        </div>
      </div>
      <Card className="shadow-xl"><CardHeader><CardTitle className="flex items-center gap-2">Stock Movement & Status</CardTitle></CardHeader>
        <CardContent><ScrollArea className="h-[500px] rounded-md border print:h-auto print:overflow-visible">
            <Table><TableHeader><TableRow><TableHead>Lot No.</TableHead><TableHead>Location</TableHead><TableHead>Purch. Date</TableHead><TableHead className="text-right">Net In (Bags)</TableHead><TableHead className="text-right">Net Out (Bags)</TableHead><TableHead className="text-right">Rem. Bags</TableHead><TableHead className="text-right">Rem. Wt (kg)</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
            <TableBody>{processedReportData.length === 0 && (<TableRow><TableCell colSpan={8} className="text-center h-32">No stock data for the selected filters.</TableCell></TableRow>)}
            {processedReportData.map((item) => {
                const netInBags = item.purchaseBags + item.transferredInBags + item.saleReturnedBags;
                const netOutBags = item.soldBags + item.transferredOutBags + item.purchaseReturnedBags;
                return (<TableRow key={`${item.lotNumber}-${item.locationId}`} className={cn(
                  item.isDeadStock && "bg-destructive text-destructive-foreground"
                )}>
                    <TableCell className="font-semibold">{item.lotNumber}</TableCell><TableCell>{item.locationName}</TableCell>
                    <TableCell>{item.purchaseDate ? format(parseISO(item.purchaseDate), "dd-MM-yy") : 'N/A'}</TableCell>
                    <TableCell className="text-right text-green-600">{netInBags.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">{netOutBags.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">{item.remainingBags.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.remainingWeight.toLocaleString(undefined,{minimumFractionDigits:0, maximumFractionDigits:0})}</TableCell>
                    <TableCell className="text-center">
                      {item.isDeadStock ? (<Badge variant="destructive" className="bg-destructive text-destructive-foreground">Dead Stock</Badge>) :
                      item.remainingBags <= 0 ? (<Badge variant="destructive">Zero Stock</Badge>) :
                      item.remainingBags <= 5 ? (<Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100">Low Stock</Badge>) :
                      (item.turnoverRate || 0) >= 75 ? (<Badge className="bg-green-500 hover:bg-green-600 text-white"><TrendingUp className="h-3 w-3 mr-1"/> Fast</Badge>) :
                      (item.daysInStock || 0) > 90 && (item.turnoverRate || 0) < 25 ? (<Badge className="bg-orange-500 hover:bg-orange-600 text-white"><TrendingDown className="h-3 w-3 mr-1"/> Slow</Badge>) :
                      (<Badge variant="secondary">In Stock</Badge>)}
                    </TableCell>
                </TableRow>);
            })}
            </TableBody></Table>
        </ScrollArea></CardContent>
      </Card>
    </div>
  );
}
