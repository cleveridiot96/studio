
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, MasterItem, LocationTransfer } from "@/lib/types";
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
import {
  Sheet,
  SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { useSettings } from "@/contexts/SettingsContext"; // For financial year
import { isDateInFinancialYear } from "@/lib/utils";

const PURCHASES_STORAGE_KEY = 'purchasesData';
const SALES_STORAGE_KEY = 'salesData';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData';


interface StockReportItem {
  lotNumber: string;
  locationId?: string;
  locationName?: string;
  purchaseDate?: string; // Earliest purchase date for this lot-location
  purchaseBags: number;
  purchaseWeight: number;
  purchaseRate: number; // Rate from earliest purchase
  purchaseValue: number; // Total value of purchases for this lot-location
  soldBags: number;
  soldWeight: number;
  soldValue: number;
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
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray);
  const [warehouses] = useLocalStorageState<MasterItem[]>(WAREHOUSES_STORAGE_KEY, memoizedEmptyArray);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, memoizedEmptyArray);

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [lotNumberFilter, setLotNumberFilter] = React.useState<string>("");
  const [locationFilter, setLocationFilter] = React.useState<string>("");
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
    if (!dateRange) {
        // Default to current financial year
        const [startYearStr] = financialYear.split('-');
        const startYear = parseInt(startYearStr, 10);
        if (!isNaN(startYear)) {
            setDateRange({
                from: new Date(startYear, 3, 1), // April 1st
                to: endOfDay(new Date(startYear + 1, 2, 31)) // March 31st
            });
        } else { // Fallback if FY parsing fails
             setDateRange({ from: startOfDay(addDays(new Date(), -90)), to: endOfDay(new Date()) });
        }
    }
  }, [hydrated, financialYear, dateRange]);

  const processedReportData = React.useMemo(() => {
    if (isAppHydrating || !hydrated || !dateRange?.from) return [];

    const reportItemsMap = new Map<string, StockReportItem>();
    const effectiveToDate = dateRange.to || dateRange.from;

    // Filter transactions by selected date range
    const fyPurchases = purchases.filter(p => isWithinInterval(parseISO(p.date), { start: dateRange.from!, end: endOfDay(effectiveToDate) }));
    const fySales = sales.filter(s => isWithinInterval(parseISO(s.date), { start: dateRange.from!, end: endOfDay(effectiveToDate) }));
    const fyLocationTransfers = locationTransfers.filter(lt => isWithinInterval(parseISO(lt.date), { start: dateRange.from!, end: endOfDay(effectiveToDate) }));

    // Process Purchases
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
          transferredOutBags: 0, transferredOutWeight: 0, transferredInBags: 0, transferredInWeight: 0,
          remainingBags: 0, remainingWeight: 0,
        };
      }
      item.purchaseBags += p.quantity;
      item.purchaseWeight += p.netWeight;
      item.purchaseValue += p.totalAmount;
      if (new Date(p.date) < new Date(item.purchaseDate || '9999-12-31')) {
        item.purchaseDate = p.date;
        item.purchaseRate = p.rate;
      }
      reportItemsMap.set(key, item);
    });

    // Process Sales
    fySales.forEach(s => {
      const relatedPurchaseForSale = purchases.find(p => p.lotNumber === s.lotNumber);
      if (relatedPurchaseForSale) {
        if (lotNumberFilter && !s.lotNumber.toLowerCase().includes(lotNumberFilter.toLowerCase())) return;
        if (locationFilter && relatedPurchaseForSale.locationId !== locationFilter) return;
        
        const key = `${s.lotNumber}-${relatedPurchaseForSale.locationId}`;
        let item = reportItemsMap.get(key);
        if (item) {
          item.soldBags += s.quantity;
          item.soldWeight += s.netWeight;
          item.soldValue += s.totalAmount;
        }
      }
    });

    // Process Location Transfers
    fyLocationTransfers.forEach(transfer => {
      transfer.items.forEach(transferItem => {
        if (lotNumberFilter && !transferItem.lotNumber.toLowerCase().includes(lotNumberFilter.toLowerCase())) return;

        // Item transferred OUT
        if (!locationFilter || transfer.fromWarehouseId === locationFilter) {
            const fromKey = `${transferItem.lotNumber}-${transfer.fromWarehouseId}`;
            let fromItem = reportItemsMap.get(fromKey);
            if (fromItem) {
                fromItem.transferredOutBags += transferItem.bagsToTransfer;
                fromItem.transferredOutWeight += transferItem.netWeightToTransfer;
            }
        }

        // Item transferred IN
        if (!locationFilter || transfer.toWarehouseId === locationFilter) {
            const toKey = `${transferItem.lotNumber}-${transfer.toWarehouseId}`;
            let toItem = reportItemsMap.get(toKey);
            if (!toItem) {
                const sourcePurchase = purchases.find(p => p.lotNumber === transferItem.lotNumber);
                toItem = {
                    lotNumber: transferItem.lotNumber, locationId: transfer.toWarehouseId,
                    locationName: warehouses.find(w => w.id === transfer.toWarehouseId)?.name || transfer.toWarehouseId,
                    purchaseDate: sourcePurchase?.date, purchaseBags: 0, purchaseWeight: 0, purchaseRate: sourcePurchase?.rate || 0, purchaseValue: 0,
                    soldBags: 0, soldWeight: 0, soldValue: 0,
                    transferredOutBags: 0, transferredOutWeight: 0, transferredInBags: 0, transferredInWeight: 0,
                    remainingBags: 0, remainingWeight: 0,
                };
                reportItemsMap.set(toKey, toItem);
            }
            toItem.transferredInBags += transferItem.bagsToTransfer;
            toItem.transferredInWeight += transferItem.netWeightToTransfer;
        }
      });
    });

    const result: StockReportItem[] = [];
    reportItemsMap.forEach(item => {
      item.remainingBags = item.purchaseBags + item.transferredInBags - item.soldBags - item.transferredOutBags;
      const avgWeightPerBag = (item.purchaseBags + item.transferredInBags) > 0 ? (item.purchaseWeight + item.transferredInWeight) / (item.purchaseBags + item.transferredInBags) : 50;
      item.remainingWeight = item.remainingBags * avgWeightPerBag;
      item.avgSaleRate = item.soldWeight > 0 ? item.soldValue / item.soldWeight : 0;
      if (item.purchaseDate) {
        item.daysInStock = Math.floor((new Date().getTime() - parseISO(item.purchaseDate).getTime()) / (1000 * 3600 * 24));
      }
      const totalInitialBags = item.purchaseBags + item.transferredInBags;
      item.turnoverRate = totalInitialBags > 0 ? ((item.soldBags + item.transferredOutBags) / totalInitialBags) * 100 : 0;
      
      if (item.purchaseBags > 0 || item.transferredInBags > 0 || item.soldBags > 0 || item.transferredOutBags > 0) {
         result.push(item);
      }
    });

    return result.sort((a,b) => (a.purchaseDate && b.purchaseDate) ? parseISO(b.purchaseDate).getTime() - parseISO(a.purchaseDate).getTime() : 0);
  }, [purchases, sales, warehouses, locationTransfers, dateRange, lotNumberFilter, locationFilter, hydrated, isAppHydrating, financialYear]);

  if (isAppHydrating || !hydrated) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p className="text-lg text-muted-foreground">Loading stock report data...</p></div>;
  }

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-foreground">Stock Report (FY {financialYear})</h1>
        <div className="flex items-center gap-2">
            <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="lg">
                <SlidersHorizontal className="mr-2 h-5 w-5" /> Filters
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[350px] sm:w-[450px]">
                <SheetHeader>
                <SheetTitle>Filter Stock Report</SheetTitle>
                <SheetDescription>
                    Refine the report by date, lot number, or location. Filters apply to transactions within the selected period.
                </SheetDescription>
                </SheetHeader>
                <div className="grid gap-6 py-6">
                <div className="space-y-2">
                    <label htmlFor="date-range-stock" className="text-sm font-medium">Date Range</label>
                    <DatePickerWithRange date={dateRange} onDateChange={setDateRange} id="date-range-stock" />
                </div>
                <div className="space-y-2">
                    <label htmlFor="lot-filter-stock" className="text-sm font-medium">Vakkal / Lot Number</label>
                    <Input
                    id="lot-filter-stock"
                    placeholder="Enter Lot Number"
                    value={lotNumberFilter}
                    onChange={(e) => setLotNumberFilter(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="location-filter-stock" className="text-sm font-medium">Location (Warehouse)</label>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger id="location-filter-stock">
                        <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">All Locations</SelectItem>
                        {warehouses.map(wh => (
                        <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                </div>
                <SheetFooter>
                <SheetClose asChild>
                    <Button>Apply Filters</Button>
                </SheetClose>
                </SheetFooter>
            </SheetContent>
            </Sheet>
            <Button variant="outline" size="icon" onClick={() => window.print()}>
                <Printer className="h-5 w-5" />
                <span className="sr-only">Print</span>
            </Button>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-primary">
            <TrendingUp className="h-7 w-7"/> Stock Movement & Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] rounded-md border print:h-auto print:overflow-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lot No.</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead className="text-right">Purch. Bags</TableHead>
                  <TableHead className="text-right">Trnf. In</TableHead>
                  <TableHead className="text-right">Purch. Rate (₹)</TableHead>
                  <TableHead className="text-right">Sold Bags</TableHead>
                  <TableHead className="text-right">Trnf. Out</TableHead>
                  <TableHead className="text-right">Avg. Sale Rate (₹)</TableHead>
                  <TableHead className="text-right">Rem. Bags</TableHead>
                  <TableHead className="text-right">Rem. Wt (kg)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedReportData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground h-32">
                      No stock data available for the selected filters and financial year.
                    </TableCell>
                  </TableRow>
                )}
                {processedReportData.map((item) => (
                  <TableRow key={`${item.lotNumber}-${item.locationId}`}>
                    <TableCell className="font-semibold">{item.lotNumber}</TableCell>
                    <TableCell>{item.locationName}</TableCell>
                    <TableCell>{item.purchaseDate ? format(parseISO(item.purchaseDate), "dd-MM-yy") : 'N/A'}</TableCell>
                    <TableCell className="text-right">{item.purchaseBags.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.transferredInBags.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.purchaseRate.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{item.soldBags.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.transferredOutBags.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.avgSaleRate?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right font-bold">{item.remainingBags.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.remainingWeight.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</TableCell>
                    <TableCell className="text-center">
                      {item.remainingBags <= 0 ? (
                        <Badge variant="destructive">Zero Stock</Badge>
                      ) : item.remainingBags <= 5 && item.remainingBags > 0 ? (
                        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100">Low Stock</Badge>
                      ) : (item.turnoverRate || 0) >= 75 ? (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white"><TrendingUp className="h-3 w-3 mr-1"/> Fast Moving</Badge>
                      ) : (item.daysInStock || 0) > 90 && (item.turnoverRate || 0) < 25 ? (
                         <Badge className="bg-orange-500 hover:bg-orange-600 text-white"><TrendingDown className="h-3 w-3 mr-1"/> Slow/Aging</Badge>
                      ) : (
                        <Badge variant="secondary">In Stock</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}


    