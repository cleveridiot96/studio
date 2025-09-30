
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Warehouse, Transporter, Purchase, Sale, LocationTransfer, MasterItemType, PurchaseReturn, SaleReturn, LocationTransferItem, CostBreakdown, PurchaseItem, SaleItem, LedgerEntry, ExpenseItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowRightLeft, ListChecks, Boxes, Printer, Trash2, Edit, Download, MoreVertical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddLocationTransferForm } from "./AddLocationTransferForm";
import { LocationTransferSlipPrint } from "./LocationTransferSlipPrint";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO, subDays, startOfDay, endOfDay } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear } from "@/lib/utils";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PrintHeaderSymbol } from "@/components/shared/PrintHeaderSymbol";
import { cn } from "@/lib/utils";
import { salesMigrator, purchaseMigrator, locationTransferMigrator } from '@/lib/dataMigrators';
import { FIXED_WAREHOUSES, FIXED_EXPENSES } from '@/lib/constants';
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";

// TRIAL PACKAGE 1 DATA
const initialLocationTransfersData: LocationTransfer[] = [
    { id: "lt-tp1-1", date: "2024-07-15", fromWarehouseId: "fixed-wh-chiplun", fromWarehouseName: "CHIPLUN", toWarehouseId: "fixed-wh-mumbai", toWarehouseName: "MUMBAI", items: [{ originalLotNumber: "VAKKAL-A1", newLotNumber: "VAKKAL-A1/50", bagsToTransfer: 50, netWeightToTransfer: 2500, grossWeightToTransfer: 2500, preTransferLandedCost: 25.5 }], expenses: [{ account: "Transport Charges", amount: 500, paymentMode: "Cash", partyName: "Self" }], totalExpenses: 500, perKgExpense: 0.2, totalNetWeight: 2500, totalGrossWeight: 2500 },
];

const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const PURCHASES_STORAGE_KEY = 'purchasesData';
const PURCHASE_RETURNS_STORAGE_KEY = 'purchaseReturnsData';
const SALES_STORAGE_KEY = 'salesData';
const SALE_RETURNS_STORAGE_KEY = 'saleReturnsData';
const EXPENSES_STORAGE_KEY = 'masterExpenses';
const LEDGER_STORAGE_KEY = 'ledgerData';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const BROKERS_STORAGE_KEY = 'masterBrokers';
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';


export interface AggregatedStockItemForForm {
  lotNumber: string;
  locationId: string;
  locationName?: string;
  currentBags: number;
  averageWeightPerBag: number;
  effectiveRate: number; // This is the up-to-date landed cost per kg
  purchaseRate: number; // The original base rate
  costBreakdown: CostBreakdown;
}


interface ExpandedTransferHistoryItem extends LocationTransfer {
  item: LocationTransferItem;
}

const KEY_SEPARATOR = '_$_';

export function LocationTransferClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();
  const [hydrated, setHydrated] = React.useState(false);

  const [locationTransfers, setLocationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, initialLocationTransfersData, locationTransferMigrator);
  const [warehouses, setWarehouses] = useLocalStorageState<Warehouse[]>(WAREHOUSES_STORAGE_KEY, []);
  const [transporters, setTransporters] = useLocalStorageState<Transporter[]>(TRANSPORTERS_STORAGE_KEY, []);
  const [expenses, setExpenses] = useLocalStorageState<MasterItem[]>(EXPENSES_STORAGE_KEY, []);
  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, [], purchaseMigrator);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(PURCHASE_RETURNS_STORAGE_KEY, []);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, [], salesMigrator);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(SALE_RETURNS_STORAGE_KEY, []);
  const [ledgerData, setLedgerData] = useLocalStorageState<LedgerEntry[]>(LEDGER_STORAGE_KEY, []);

  const [suppliers] = useLocalStorageState<MasterItem[]>(SUPPLIERS_STORAGE_KEY, []);
  const [agents] = useLocalStorageState<MasterItem[]>(AGENTS_STORAGE_KEY, []);
  const [brokers] = useLocalStorageState<MasterItem[]>(BROKERS_STORAGE_KEY, []);
  const [customers] = useLocalStorageState<MasterItem[]>(CUSTOMERS_STORAGE_KEY, []);

  const [isAddFormOpen, setIsAddFormOpen] = React.useState(false);
  const [transferToEdit, setTransferToEdit] = React.useState<LocationTransfer | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<LocationTransfer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const [transferForPdf, setTransferForPdf] = React.useState<LocationTransfer | null>(null);
  const chittiContainerRef = React.useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = React.useState('stockOverview');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  React.useEffect(() => {
    setHydrated(true);
    if (!dateRange) {
        const today = new Date();
        setDateRange({ from: startOfDay(subDays(today, 30)), to: endOfDay(today) });
    }
  }, [dateRange]);

  const allExpenseParties = React.useMemo(() => {
      if (!hydrated) return [];
      return [...suppliers, ...agents, ...transporters, ...brokers, ...customers, ...expenses]
          .filter(p => p && p.id && p.name)
          .sort((a,b) => a.name.localeCompare(b.name));
  }, [hydrated, suppliers, agents, transporters, brokers, customers, expenses]);


  const aggregatedStockForForm = React.useMemo((): AggregatedStockItemForForm[] => {
    if (isAppHydrating || !hydrated) return [];

    const stockMap = new Map<string, {
        currentBags: number;
        currentWeight: number;
        totalCost: number; // Total value of the stock pile (currentWeight * landedCostPerKg)
        purchaseRate: number; // The original base rate
        locationName?: string;
        costBreakdown: CostBreakdown;
    }>();

    const transactions = [
        ...purchases.map(p => ({ ...p, txType: 'purchase' as const })),
        ...purchaseReturns.map(pr => ({ ...pr, txType: 'purchaseReturn' as const })),
        ...locationTransfers.map(lt => ({ ...lt, txType: 'locationTransfer' as const })),
        ...sales.map(s => ({ ...s, txType: 'sale' as const })),
        ...saleReturns.map(sr => ({ ...sr, txType: 'saleReturn' as const }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const tx of transactions) {
        if (!isDateInFinancialYear(tx.date, financialYear)) continue;
        
        if (tx.txType === 'purchase') {
            (tx.items || []).forEach((item: PurchaseItem) => {
                const key = `${item.lotNumber}${KEY_SEPARATOR}${tx.locationId}`;
                const landedCost = item.landedCostPerKg || 0;
                const purchaseExpensesPerKg = landedCost - item.rate;
                
                stockMap.set(key, {
                    currentBags: item.quantity,
                    currentWeight: item.netWeight,
                    totalCost: item.netWeight * landedCost,
                    purchaseRate: item.rate,
                    locationName: tx.locationName,
                    costBreakdown: {
                        baseRate: item.rate,
                        purchaseExpenses: purchaseExpensesPerKg,
                        transferExpenses: 0
                    }
                });
            });
        } else if (tx.txType === 'locationTransfer') {
            (tx.items || []).forEach((item: LocationTransferItem) => {
                const fromKey = `${item.originalLotNumber}${KEY_SEPARATOR}${tx.fromWarehouseId}`;
                const fromEntry = stockMap.get(fromKey);

                if (fromEntry) {
                    const costOfGoodsToTransfer = fromEntry.currentWeight > 0 ? (fromEntry.totalCost / fromEntry.currentWeight) * item.netWeightToTransfer : 0;
                    
                    fromEntry.currentBags -= item.bagsToTransfer;
                    fromEntry.currentWeight -= item.netWeightToTransfer;
                    fromEntry.totalCost -= costOfGoodsToTransfer;

                    const toKey = `${item.newLotNumber}${KEY_SEPARATOR}${tx.toWarehouseId}`;
                    let toEntry = stockMap.get(toKey);

                    if (!toEntry) {
                        toEntry = {
                            currentBags: 0,
                            currentWeight: 0,
                            totalCost: 0,
                            purchaseRate: fromEntry.purchaseRate,
                            locationName: tx.toWarehouseName,
                            costBreakdown: { ...fromEntry.costBreakdown }
                        };
                    }
                    
                    const perKgExpense = (tx.perKgExpense || 0);
                    const newTotalCostForThisChunk = costOfGoodsToTransfer + (perKgExpense * item.netWeightToTransfer);

                    toEntry.currentBags += item.bagsToTransfer;
                    toEntry.currentWeight += item.netWeightToTransfer;
                    toEntry.totalCost += newTotalCostForThisChunk;
                    toEntry.costBreakdown.transferExpenses += perKgExpense;

                    stockMap.set(toKey, toEntry);
                }
            });
        } else if (tx.txType === 'sale' && tx.id !== transferToEdit?.id) {
             (tx.items || []).forEach((item: SaleItem) => {
                const saleLotKey = Array.from(stockMap.keys()).find(k => k.startsWith(item.lotNumber + KEY_SEPARATOR));
                if (saleLotKey) {
                    const entry = stockMap.get(saleLotKey);
                    if (entry && entry.currentWeight > 0) {
                        const costOfGoodsSold = (entry.totalCost / entry.currentWeight) * item.netWeight;
                        entry.currentBags -= item.quantity;
                        entry.currentWeight -= item.netWeight;
                        entry.totalCost -= costOfGoodsSold;
                    }
                }
            });
        }
    }

    const result: AggregatedStockItemForForm[] = [];
    stockMap.forEach((value, key) => {
        const separatorIndex = key.indexOf(KEY_SEPARATOR);
        if (separatorIndex === -1) return;
        const lotNumber = key.substring(0, separatorIndex);
        const locationId = key.substring(separatorIndex + KEY_SEPARATOR.length);

        if (value.currentBags > 0.001) {
            const effectiveRate = value.currentWeight > 0 ? value.totalCost / value.currentWeight : 0;
            result.push({
                lotNumber,
                locationId,
                currentBags: value.currentBags,
                averageWeightPerBag: value.currentBags > 0 ? value.currentWeight / value.currentBags : 50,
                effectiveRate,
                purchaseRate: value.purchaseRate,
                locationName: value.locationName,
                costBreakdown: value.costBreakdown,
            });
        }
    });

    return result;
  }, [purchases, purchaseReturns, sales, saleReturns, locationTransfers, isAppHydrating, hydrated, financialYear, transferToEdit]);


  const handleAddOrUpdateTransfer = (transfer: LocationTransfer) => {
    const isEditing = locationTransfers.some(t => t.id === transfer.id);
    setLocationTransfers(prev => {
      return isEditing ? prev.map(t => (t.id === transfer.id ? transfer : t)) : [{ ...transfer, id: transfer.id || `lt-${Date.now()}` }, ...prev];
    });
    
    if (transfer.expenses && transfer.expenses.length > 0) {
        const newLedgerEntries: LedgerEntry[] = [];
        transfer.expenses.forEach(exp => {
            if (exp.amount > 0) {
                newLedgerEntries.push({
                    id: `ledger-${transfer.id}-${exp.account.replace(/\s/g, '')}`,
                    date: transfer.date,
                    type: 'Expense',
                    account: exp.account,
                    debit: exp.amount,
                    credit: 0,
                    paymentMode: exp.paymentMode,
                    party: exp.partyName || 'Self',
                    partyId: exp.partyId,
                    relatedVoucher: transfer.id,
                    linkedTo: {
                        voucherType: 'Transfer',
                        voucherId: transfer.id,
                    },
                    remarks: `Expense for transfer from ${transfer.fromWarehouseName} to ${transfer.toWarehouseName}`
                });
            }
        });

        if (newLedgerEntries.length > 0) {
            setLedgerData(prevLedger => [...prevLedger.filter(l => l.relatedVoucher !== transfer.id), ...newLedgerEntries]);
            toast({ title: "Expenses Logged", description: `${newLedgerEntries.length} expense(s) have been recorded in the ledger.` });
        }
    }

    toast({ title: isEditing ? "Transfer Updated" : "Transfer Created", description: isEditing ? "Location transfer details saved." : "New location transfer recorded successfully." });
    setTransferToEdit(null);
  };

  const handleEditTransfer = (transfer: LocationTransfer) => { setTransferToEdit(transfer); setIsAddFormOpen(true); };
  const handleDeleteTransferAttempt = (transfer: LocationTransfer) => { setItemToDelete(transfer); setShowDeleteConfirm(true); };

  const confirmDeleteTransfer = () => {
    if (itemToDelete) {
      setLocationTransfers(prev => prev.filter(t => t.id !== itemToDelete!.id));
      setLedgerData(prev => prev.filter(l => l.relatedVoucher !== itemToDelete!.id));
      toast({ title: "Transfer Deleted", description: "Record removed.", variant: "destructive" });
      setItemToDelete(null); setShowDeleteConfirm(false);
    }
  };

  const handleMasterDataUpdate = React.useCallback((type: "Warehouse" | "Transporter" | "Expense", newItem: MasterItem) => {
    if (type === "Warehouse") setWarehouses(prev => [newItem as Warehouse, ...prev.filter(w => w.id !== newItem.id)].sort((a,b) => a.name.localeCompare(b.name)));
    else if (type === "Transporter") setTransporters(prev => [newItem as Transporter, ...prev.filter(t => t.id !== newItem.id)].sort((a,b) => a.name.localeCompare(b.name)));
    else if (type === "Expense") setExpenses(prev => [newItem, ...prev.filter(e => e.id !== newItem.id)].sort((a,b) => a.name.localeCompare(b.name)));
  }, [setWarehouses, setTransporters, setExpenses]);

  const triggerDownloadTransferPdf = React.useCallback((transfer: LocationTransfer) => {
    setTransferForPdf(transfer);
  }, []);

  React.useEffect(() => {
    if (transferForPdf && chittiContainerRef.current) {
      const generatePdf = async () => {
        const elementToCapture = chittiContainerRef.current?.querySelector('.print-chitti-styles') as HTMLElement;
        if (!elementToCapture) {
          toast({ title: "PDF Error", description: "Slip content not ready.", variant: "destructive" });
          setTransferForPdf(null);
          return;
        }
        try {
          const canvas = await html2canvas(elementToCapture, { scale: 1.5, useCORS: true, width: 550, height: elementToCapture.offsetHeight, logging: false });
          const imgData = canvas.toDataURL('image/jpeg', 0.85);
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5', compress: true });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgProps = pdf.getImageProperties(imgData);
          const margin = 10;
          const contentWidth = pdfWidth - 2 * margin;
          const contentHeight = pdfHeight - 2 * margin;
          const ratio = imgProps.width / imgProps.height;
          let imgWidth = contentWidth;
          let imgHeight = imgWidth / ratio;
          if (imgHeight > contentHeight) {
            imgHeight = contentHeight;
            imgWidth = imgHeight * ratio;
          }
          const xOffset = (pdfWidth - imgWidth) / 2;
          const yOffset = (pdfHeight - imgHeight) / 2;
          pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
          const timestamp = format(new Date(), 'ddMMyy_HHmm');
          pdf.save(`TransferSlip_${transferForPdf.id.slice(-4)}_${timestamp}.pdf`);
          toast({ title: "PDF Generated", description: `Slip for transfer ${transferForPdf.id.slice(-4)} downloaded.` });
        } catch (err) {
          console.error("Error generating PDF:", err);
          toast({ title: "PDF Failed", description: "Could not generate slip PDF.", variant: "destructive" });
        } finally {
          setTransferForPdf(null);
        }
      };
      const timer = setTimeout(generatePdf, 300);
      return () => clearTimeout(timer);
    }
  }, [transferForPdf, toast]);

  const expandedTransfers = React.useMemo(() => {
    if (isAppHydrating || !hydrated || !dateRange?.from) return [];
    
    const filtered = locationTransfers.filter(lt => isDateInFinancialYear(lt.date, financialYear) && new Date(lt.date) >= dateRange.from! && new Date(lt.date) <= (dateRange.to || new Date()));
    
    const flatList: ExpandedTransferHistoryItem[] = [];
    filtered.forEach(transfer => {
      if (transfer.items && transfer.items.length > 0) {
        transfer.items.forEach(item => {
          flatList.push({ ...transfer, item: item });
        });
      }
    });

    return flatList.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [locationTransfers, financialYear, isAppHydrating, hydrated, dateRange]);
  
  const transferHistoryTotals = React.useMemo(() => {
    if (!expandedTransfers || expandedTransfers.length === 0) {
        return { totalBags: 0, totalWeight: 0, totalValue: 0, weightedAverageLandedCost: 0 };
    }
    let totalBags = 0, totalWeight = 0, totalValue = 0;
    expandedTransfers.forEach(transfer => {
        totalBags += transfer.item.bagsToTransfer;
        totalWeight += transfer.item.netWeightToTransfer;
        const totalWeightForCalc = transfer.totalGrossWeight || transfer.items.reduce((sum, i) => sum + i.grossWeightToTransfer, 0);
        const perKgExpense = (transfer.totalExpenses && totalWeightForCalc > 0) ? transfer.totalExpenses / totalWeightForCalc : (transfer.perKgExpense || 0);
        const finalLandedCost = (transfer.item.preTransferLandedCost || 0) + perKgExpense;
        totalValue += finalLandedCost * transfer.item.netWeightToTransfer;
    });
    const weightedAverageLandedCost = totalWeight > 0 ? totalValue / totalWeight : 0;
    return { totalBags, totalWeight, totalValue, weightedAverageLandedCost };
  }, [expandedTransfers]);
  
  const addButtonDynamicClass = React.useMemo(() => {
    if (activeTab === 'stockOverview') return 'bg-sky-600 hover:bg-sky-700 text-white';
    if (activeTab === 'transferHistory') return 'bg-teal-600 hover:bg-teal-700 text-white';
    return 'bg-primary hover:bg-primary/90';
  }, [activeTab]);

  const setDateQuickFilter = (preset: 'today' | 'yesterday' | 'dayBeforeYesterday') => {
    const today = new Date();
    let from, to;
    switch (preset) {
      case 'today': from = startOfDay(today); to = endOfDay(today); break;
      case 'yesterday': from = startOfDay(subDays(today, 1)); to = endOfDay(subDays(today, 1)); break;
      case 'dayBeforeYesterday': from = startOfDay(subDays(today, 2)); to = endOfDay(subDays(today, 2)); break;
    }
    setDateRange({ from, to });
  };

  if (isAppHydrating || !hydrated) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p className="text-lg text-muted-foreground">Loading data...</p></div>;
  }

  return (
    <div className="space-y-8 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
            <ArrowRightLeft className="mr-3 h-8 w-8 text-primary" /> Location Transfers (FY {financialYear})
        </h1>
        <div className="flex items-center gap-2">
            <Button onClick={() => { setTransferToEdit(null); setIsAddFormOpen(true); }} size="lg" className={cn("text-base py-3 px-6 shadow-md", addButtonDynamicClass)}>
                <PlusCircle className="mr-2 h-5 w-5" /> New Transfer
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.print()}> <Printer className="h-5 w-5" /> <span className="sr-only">Print</span></Button>
        </div>
      </div>

      <Card className="shadow-xl">
      <TooltipProvider>
        <Tabs defaultValue="stockOverview" className="w-full" onValueChange={(value) => setActiveTab(value)}>
          <CardHeader className="p-0">
            <TabsList className="grid w-full grid-cols-2 rounded-t-lg rounded-b-none no-print p-1 bg-muted gap-1">
              <TabsTrigger value="stockOverview" className="py-3 text-base text-white bg-sky-600 hover:bg-sky-700 data-[state=active]:bg-sky-700 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-md">
                <Boxes className="mr-2 h-5 w-5"/>Stock Overview
              </TabsTrigger>
              <TabsTrigger value="transferHistory" className="py-3 text-base text-white bg-teal-600 hover:bg-teal-700 data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-md">
                <ListChecks className="mr-2 h-5 w-5"/>Transfer History
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <TabsContent value="stockOverview">
            <CardContent className="pt-6">
                <CardDescription className="mb-4 text-sm no-print">Current stock levels for FY {financialYear}. Hover over landed rate for cost breakdown.</CardDescription>
                <ScrollArea className="h-[400px] border rounded-md print:h-auto print:overflow-visible">
                    <Table size="sm"><TableHeader><TableRow>
                        <TableHead>WAREHOUSE</TableHead>
                        <TableHead>VAKKAL/LOT</TableHead>
                        <TableHead className="text-right">BAGS</TableHead>
                        <TableHead className="text-right">WEIGHT (KG)</TableHead>
                        <TableHead className="text-right">LANDED RATE (₹/KG)</TableHead>
                    </TableRow></TableHeader>
                        <TableBody>
                            {aggregatedStockForForm.length === 0 && <TableRow><TableCell colSpan={5} className="text-center h-24">No stock for FY {financialYear}.</TableCell></TableRow>}
                            {aggregatedStockForForm.map(item => (
                                <TableRow key={`${item.locationId}${KEY_SEPARATOR}${item.lotNumber}`} className="uppercase">
                                    <TableCell><Tooltip><TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{item.locationName || item.locationId}</span></TooltipTrigger><TooltipContent><p>{item.locationName || item.locationId}</p></TooltipContent></Tooltip></TableCell>
                                    <TableCell><Tooltip><TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{item.lotNumber}</span></TooltipTrigger><TooltipContent><p>{item.lotNumber}</p></TooltipContent></Tooltip></TableCell>
                                    <TableCell className="text-right font-medium">{Math.round(item.currentBags).toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{item.averageWeightPerBag ? (item.currentBags * item.averageWeightPerBag).toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0}) : 'N/A'}</TableCell>
                                    <TableCell className="text-right font-semibold text-primary">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="cursor-help underline decoration-dashed">
                                                    {Math.round(item.effectiveRate).toLocaleString('en-IN')}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Base: ₹{item.costBreakdown.baseRate.toFixed(2)}</p>
                                                <p>Purchase Exp: ₹{item.costBreakdown.purchaseExpenses.toFixed(2)}</p>
                                                <p>Transfer Exp: ₹{item.costBreakdown.transferExpenses.toFixed(2)}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
          </TabsContent>
          <TabsContent value="transferHistory">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2 no-print">
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="max-w-sm w-full"/>
                 <div className="flex gap-1 ml-auto">
                    <Button variant="outline" size="sm" onClick={() => setDateQuickFilter('today')}>Today</Button>
                    <Button variant="outline" size="sm" onClick={() => setDateQuickFilter('yesterday')}>Yesterday</Button>
                    <Button variant="outline" size="sm" onClick={() => setDateQuickFilter('dayBeforeYesterday')}>
                        {format(subDays(new Date(), 2), 'EEEE')}
                    </Button>
                </div>
              </div>
              <ScrollArea className="h-[400px] border rounded-md print:h-auto print:overflow-visible">
                <Table size="sm">
                  <TableHeader><TableRow>
                    <TableHead>DATE</TableHead>
                    <TableHead>FROM</TableHead>
                    <TableHead>TO</TableHead>
                    <TableHead>VAKKAL</TableHead>
                    <TableHead className="text-right">BAGS</TableHead>
                    <TableHead className="text-right">WEIGHT</TableHead>
                    <TableHead className="text-right">FINAL LANDED COST (₹/KG)</TableHead>
                    <TableHead className="text-right">TOTAL VALUE (₹)</TableHead>
                    <TableHead className="text-center no-print">ACTIONS</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {expandedTransfers.length === 0 && <TableRow><TableCell colSpan={9} className="text-center h-24">No transfers in the selected period.</TableCell></TableRow>}
                    {expandedTransfers.map(transfer => {
                       const totalWeightForCalc = transfer.totalGrossWeight || transfer.items.reduce((sum, i) => sum + i.grossWeightToTransfer, 0);
                       const perKgExpense = (transfer.totalExpenses && totalWeightForCalc > 0) ? transfer.totalExpenses / totalWeightForCalc : (transfer.perKgExpense || 0);
                       const finalLandedCost = (transfer.item.preTransferLandedCost || 0) + perKgExpense;
                       const totalValue = finalLandedCost * transfer.item.netWeightToTransfer;
                       return (
                      <TableRow key={`${transfer.id}${KEY_SEPARATOR}${transfer.item.originalLotNumber}`} className="uppercase">
                        <TableCell>{format(parseISO(transfer.date), "dd/MM/yy")}</TableCell>
                        <TableCell><Tooltip><TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{transfer.fromWarehouseName || transfer.fromWarehouseId}</span></TooltipTrigger><TooltipContent><p>{transfer.fromWarehouseName || transfer.fromWarehouseId}</p></TooltipContent></Tooltip></TableCell>
                        <TableCell><Tooltip><TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{transfer.toWarehouseName || transfer.toWarehouseId}</span></TooltipTrigger><TooltipContent><p>{transfer.toWarehouseName || transfer.toWarehouseId}</p></TooltipContent></Tooltip></TableCell>
                        <TableCell>
                          <Tooltip><TooltipTrigger asChild>
                            <span className="truncate max-w-[200px] inline-block">{transfer.item.newLotNumber}</span>
                          </TooltipTrigger>
                            <TooltipContent><p>Original: {transfer.item.originalLotNumber}</p></TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right">{Math.round(transfer.item.bagsToTransfer)}</TableCell>
                        <TableCell className="text-right">{transfer.item.netWeightToTransfer}</TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {finalLandedCost > 0 ? `₹${Math.round(finalLandedCost).toLocaleString()}` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {totalValue > 0 ? `₹${Math.round(totalValue).toLocaleString()}` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center no-print">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8 px-2"><MoreVertical className="h-4 w-4" /><span className="sr-only">Actions for {transfer.id}</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditTransfer(transfer)}><Edit className="mr-2 h-4 w-4" /> Edit Full Transfer</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => triggerDownloadTransferPdf(transfer)}><Download className="mr-2 h-4 w-4" /> Download Slip</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteTransferAttempt(transfer)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete Full Transfer</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                       );
                    })}
                  </TableBody>
                  <TableFooter>
                      <TableRow className="font-bold bg-muted">
                          <TableCell colSpan={4}>GRAND TOTALS</TableCell>
                          <TableCell className="text-right">{Math.round(transferHistoryTotals.totalBags).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{transferHistoryTotals.totalWeight.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                              {transferHistoryTotals.weightedAverageLandedCost > 0 ? `~ ₹${Math.round(transferHistoryTotals.weightedAverageLandedCost).toLocaleString()}` : ''}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                              {Math.round(transferHistoryTotals.totalValue).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0})}
                          </TableCell>
                          <TableCell></TableCell>
                      </TableRow>
                  </TableFooter>
                </Table>
              </ScrollArea>
            </CardContent>
          </TabsContent>
        </Tabs>
        </TooltipProvider>
      </Card>
      
      <div ref={chittiContainerRef} style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -10, backgroundColor: 'white' }}>
          {transferForPdf && <LocationTransferSlipPrint transfer={transferForPdf} />}
      </div>

      {isAddFormOpen && (
        <AddLocationTransferForm
          key={transferToEdit ? `edit-transfer-${transferToEdit.id}` : 'add-new-transfer'}
          isOpen={isAddFormOpen}
          onClose={() => {
            setIsAddFormOpen(false);
            setTransferToEdit(null);
          }}
          onSubmit={handleAddOrUpdateTransfer}
          warehouses={warehouses}
          transporters={transporters}
          expenses={expenses}
          allExpenseParties={allExpenseParties}
          availableStock={aggregatedStockForForm}
          onMasterDataUpdate={handleMasterDataUpdate}
          transferToEdit={transferToEdit}
        />
      )}

      {itemToDelete && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete Transfer Record?</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete this record? This action cannot be undone and will not automatically revert stock changes.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteTransfer} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    