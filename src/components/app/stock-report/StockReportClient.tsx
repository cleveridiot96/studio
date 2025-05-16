
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, MasterItem } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingDown, TrendingUp, SlidersHorizontal, BarChart as BarChartIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
  Sheet,
  SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
const PURCHASES_STORAGE_KEY = 'purchasesData';
const SALES_STORAGE_KEY = 'salesData';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';

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
  remainingBags: number;
  remainingWeight: number;
  avgSaleRate?: number;
  daysInStock?: number;
  turnoverRate?: number; 
}

export function StockReportClient() {
  const memoizedInitialPurchases = React.useMemo(() => [], []);
  const memoizedInitialSales = React.useMemo(() => [], []);
  const memoizedInitialWarehouses = React.useMemo(() => [], []);

  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedInitialPurchases);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedInitialSales);
  const [warehouses] = useLocalStorageState<MasterItem[]>(WAREHOUSES_STORAGE_KEY, memoizedInitialWarehouses);

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [lotNumberFilter, setLotNumberFilter] = React.useState<string>("");
  const [locationFilter, setLocationFilter] = React.useState<string>(""); 
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
    setDateRange({
        from: addDays(new Date(), -30),
        to: new Date(),
    });
  }, []);

  const processedReportData = React.useMemo(() => {
    const reportItemsMap = new Map<string, StockReportItem>();

    const filteredPurchases = purchases.filter(p => {
      const purchaseDate = new Date(p.date);
      const fromDate = dateRange?.from ? new Date(dateRange.from) : null;
      const toDate = dateRange?.to ? new Date(dateRange.to) : null;
      return (!fromDate || purchaseDate >= fromDate) && 
             (!toDate || purchaseDate <= toDate) &&
             (!lotNumberFilter || p.lotNumber.toLowerCase().includes(lotNumberFilter.toLowerCase())) &&
             (!locationFilter || p.locationId === locationFilter);
    });

    filteredPurchases.forEach(p => {
      const key = `${p.lotNumber}-${p.locationId}`; 
      let item = reportItemsMap.get(key);
      if (!item) {
        item = {
          lotNumber: p.lotNumber,
          locationId: p.locationId,
          locationName: warehouses.find(w => w.id === p.locationId)?.name || p.locationId,
          purchaseDate: p.date,
          purchaseBags: 0,
          purchaseWeight: 0,
          purchaseRate: p.rate, 
          purchaseValue: 0,
          soldBags: 0,
          soldWeight: 0,
          soldValue: 0,
          remainingBags: 0,
          remainingWeight: 0,
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

    const filteredSales = sales.filter(s => {
        const saleDate = new Date(s.date);
        const fromDate = dateRange?.from ? new Date(dateRange.from) : null;
        const toDate = dateRange?.to ? new Date(dateRange.to) : null;
        return (!fromDate || saleDate >= fromDate) && 
               (!toDate || saleDate <= toDate) &&
               (!lotNumberFilter || s.lotNumber.toLowerCase().includes(lotNumberFilter.toLowerCase()));
    });


    filteredSales.forEach(s => {
      const relatedPurchase = purchases.find(p => p.lotNumber === s.lotNumber && (!locationFilter || p.locationId === locationFilter));
      if (relatedPurchase) {
        const key = `${s.lotNumber}-${relatedPurchase.locationId}`;
        let item = reportItemsMap.get(key);
        if (item) { 
          item.soldBags += s.quantity;
          item.soldWeight += s.netWeight;
          item.soldValue += s.totalAmount; 
        }
      }
    });

    const result: StockReportItem[] = [];
    reportItemsMap.forEach(item => {
      item.remainingBags = item.purchaseBags - item.soldBags;
      item.remainingWeight = item.purchaseWeight - item.soldWeight;
      item.avgSaleRate = item.soldWeight > 0 ? item.soldValue / item.soldWeight : 0;
      if (item.purchaseDate) {
        item.daysInStock = Math.floor((new Date().getTime() - new Date(item.purchaseDate).getTime()) / (1000 * 3600 * 24));
      }
      item.turnoverRate = item.purchaseBags > 0 ? (item.soldBags / item.purchaseBags) * 100 : 0;
      result.push(item);
    });

    return result.sort((a,b) => (a.purchaseDate && b.purchaseDate) ? new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime() : 0);
  }, [purchases, sales, warehouses, dateRange, lotNumberFilter, locationFilter]);
  
  if (!hydrated) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <p className="text-lg text-muted-foreground">Loading stock report data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stock Report</h1>
        </div>
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
                Refine the report by date, lot number, or location.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-6 py-6">
              <div className="space-y-2">
                <label htmlFor="date-range" className="text-sm font-medium">Date Range</label>
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} id="date-range" />
              </div>
              <div className="space-y-2">
                <label htmlFor="lot-filter" className="text-sm font-medium">Vakkal / Lot Number</label>
                <Input 
                  id="lot-filter"
                  placeholder="Enter Lot Number" 
                  value={lotNumberFilter} 
                  onChange={(e) => setLotNumberFilter(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="location-filter" className="text-sm font-medium">Location (Warehouse)</label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger id="location-filter">
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
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-primary">
            <BarChartIcon className="h-7 w-7"/> Stock Movement & Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lot No.</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead className="text-right">Purch. Bags</TableHead>
                  <TableHead className="text-right">Purch. Rate (₹)</TableHead>
                  <TableHead className="text-right">Sold Bags</TableHead>
                  <TableHead className="text-right">Avg. Sale Rate (₹)</TableHead>
                  <TableHead className="text-right">Rem. Bags</TableHead>
                  <TableHead className="text-right">Rem. Wt (kg)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedReportData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground h-32">
                      No data available for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
                {processedReportData.map((item) => (
                  <TableRow key={`${item.lotNumber}-${item.locationId}`}>
                    <TableCell className="font-semibold">{item.lotNumber}</TableCell>
                    <TableCell>{item.locationName}</TableCell>
                    <TableCell>{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-right">{item.purchaseBags.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.purchaseRate.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{item.soldBags.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.avgSaleRate?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right font-bold">{item.remainingBags.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.remainingWeight.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      {item.remainingBags <= 0 && item.purchaseBags > 0 ? (
                        <Badge variant="destructive">Sold Out</Badge>
                      ) : (item.turnoverRate || 0) >= 75 ? (
                        <Badge className="bg-green-500 hover:bg-green-600"><TrendingUp className="h-3 w-3 mr-1"/> Fast Moving</Badge>
                      ) : (item.daysInStock || 0) > 90 && (item.turnoverRate || 0) < 25 ? (
                         <Badge className="bg-orange-500 hover:bg-orange-600"><TrendingDown className="h-3 w-3 mr-1"/> Slow / Aging</Badge>
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
