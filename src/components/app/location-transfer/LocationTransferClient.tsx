
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Warehouse, Transporter, Purchase, Sale, LocationTransfer, MasterItemType, PurchaseReturn, SaleReturn, LocationTransferItem, CostBreakdown } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowRightLeft, ListChecks, Boxes, Printer, Trash2, Edit, Download, MoreVertical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddLocationTransferForm } from "./AddLocationTransferForm";
import { LocationTransferSlipPrint } from "./LocationTransferSlipPrint";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";
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
import { salesMigrator, purchaseMigrator } from '@/lib/dataMigrators';


const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const PURCHASES_STORAGE_KEY = 'purchasesData';
const PURCHASE_RETURNS_STORAGE_KEY = 'purchaseReturnsData';
const SALES_STORAGE_KEY = 'salesData';
const SALE_RETURNS_STORAGE_KEY = 'saleReturnsData';
const EXPENSES_STORAGE_KEY = 'masterExpenses';

const initialLocationTransfers: LocationTransfer[] = [];

// This interface is crucial for the form, providing it with all necessary cost data.
export interface AggregatedStockItemForForm {
  lotNumber: string;
  locationId: string;
  currentBags: number;
  currentWeight: number;
  averageWeightPerBag: number;
  effectiveRate: number; // This is the up-to-date landed cost per kg
  costBreakdown: CostBreakdown;
}


interface ExpandedTransferHistoryItem extends LocationTransfer {
  item: LocationTransferItem;
}

export function LocationTransferClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();
  const [hydrated, setHydrated] = React.useState(false);

  const memoizedEmptyArray = React.useMemo(() => [], []);
  const memoizedInitialLocationTransfers = React.useMemo(() => initialLocationTransfers, []);

  const [locationTransfers, setLocationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, memoizedInitialLocationTransfers);
  const [warehouses, setWarehouses] = useLocalStorageState<Warehouse[]>(WAREHOUSES_STORAGE_KEY, memoizedEmptyArray);
  const [transporters, setTransporters] = useLocalStorageState<Transporter[]>(TRANSPORTERS_STORAGE_KEY, memoizedEmptyArray);
  const [expenses, setExpenses] = useLocalStorageState<MasterItem[]>(EXPENSES_STORAGE_KEY, memoizedEmptyArray);
  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyArray, purchaseMigrator);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(PURCHASE_RETURNS_STORAGE_KEY, memoizedEmptyArray);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray, salesMigrator);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(SALE_RETURNS_STORAGE_KEY, memoizedEmptyArray);


  const [isAddFormOpen, setIsAddFormOpen] = React.useState(false);
  const [transferToEdit, setTransferToEdit] = React.useState<LocationTransfer | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<LocationTransfer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const [transferForPdf, setTransferForPdf] = React.useState<LocationTransfer | null>(null);
  const chittiContainerRef = React.useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = React.useState('stockOverview');

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const aggregatedStockForForm = React.useMemo((): AggregatedStockItemForForm[] => {
    if (isAppHydrating || !hydrated) return [];

    const stockMap = new Map<string, AggregatedStockItemForForm>();
    const fyPurchases = purchases.filter(p => isDateInFinancialYear(p.date, financialYear));

    fyPurchases.forEach(p => {
        p.items.forEach(item => {
            const key = `${item.lotNumber}-${p.locationId}`;
            const purchaseExpensesPerKg = p.effectiveRate - item.rate;
            stockMap.set(key, {
                lotNumber: item.lotNumber,
                locationId: p.locationId,
                currentBags: item.quantity,
                currentWeight: item.netWeight,
                averageWeightPerBag: item.quantity > 0 ? item.netWeight / item.quantity : 50,
                effectiveRate: p.effectiveRate,
                costBreakdown: {
                    baseRate: item.rate,
                    purchaseExpenses: purchaseExpensesPerKg,
                    transferExpenses: 0,
                },
            });
        });
    });

    const fyPurchaseReturns = purchaseReturns.filter(pr => isDateInFinancialYear(pr.date, financialYear));
    fyPurchaseReturns.forEach(pr => {
        const originalPurchase = purchases.find(p => p.id === pr.originalPurchaseId);
        if (originalPurchase) {
            const key = `${pr.originalLotNumber}-${originalPurchase.locationId}`;
            const entry = stockMap.get(key);
            if (entry) {
                entry.currentBags -= pr.quantityReturned;
                entry.currentWeight -= pr.netWeightReturned;
            }
        }
    });

    const fyLocationTransfers = locationTransfers.filter(lt => isDateInFinancialYear(lt.date, financialYear));
    fyLocationTransfers.forEach(transfer => {
        transfer.items.forEach(item => {
            const fromKey = `${item.originalLotNumber}-${transfer.fromWarehouseId}`;
            const fromEntry = stockMap.get(fromKey);
            if (fromEntry) {
                fromEntry.currentBags -= item.bagsToTransfer;
                fromEntry.currentWeight -= item.netWeightToTransfer;
            }

            const toKey = `${item.newLotNumber}-${transfer.toWarehouseId}`;
            const sourceEntry = fromEntry; 

            const newEffectiveRate = (sourceEntry?.effectiveRate || 0) + (transfer.perKgExpense || 0);
            const newCostBreakdown: CostBreakdown = {
                baseRate: sourceEntry?.costBreakdown.baseRate || 0,
                purchaseExpenses: sourceEntry?.costBreakdown.purchaseExpenses || 0,
                transferExpenses: (sourceEntry?.costBreakdown.transferExpenses || 0) + (transfer.perKgExpense || 0),
            };
            
            let toEntry = stockMap.get(toKey);
            if (!toEntry) {
                toEntry = {
                    lotNumber: item.newLotNumber,
                    locationId: transfer.toWarehouseId,
                    currentBags: 0,
                    currentWeight: 0,
                    averageWeightPerBag: item.bagsToTransfer > 0 ? item.netWeightToTransfer / item.bagsToTransfer : 50,
                    effectiveRate: 0, // Will be updated below
                    costBreakdown: { baseRate: 0, purchaseExpenses: 0, transferExpenses: 0 }
                };
            }
            toEntry.currentBags += item.bagsToTransfer;
            toEntry.currentWeight += item.netWeightToTransfer;
            toEntry.effectiveRate = newEffectiveRate;
            toEntry.costBreakdown = newCostBreakdown;
            stockMap.set(toKey, toEntry);
        });
    });

    const fySales = sales.filter(s => isDateInFinancialYear(s.date, financialYear));
    fySales.forEach(s => {
        s.items.forEach(item => {
            const saleLotKey = Array.from(stockMap.keys()).find(k => k.startsWith(item.lotNumber));
            const entry = saleLotKey ? stockMap.get(saleLotKey) : undefined;
            if (entry) {
                entry.currentBags -= item.quantity;
                entry.currentWeight -= item.netWeight;
            }
        });
    });

    const fySaleReturns = saleReturns.filter(sr => isDateInFinancialYear(sr.date, financialYear));
    fySaleReturns.forEach(sr => {
      const saleReturnLotKey = Array.from(stockMap.keys()).find(k => k.startsWith(sr.originalLotNumber));
      const entry = saleReturnLotKey ? stockMap.get(saleReturnLotKey) : undefined;
      if (entry) {
        entry.currentBags += sr.quantityReturned;
        entry.currentWeight += sr.netWeightReturned;
      }
    });

    return Array.from(stockMap.values()).filter(item => item.currentBags > 0.001);
  }, [purchases, purchaseReturns, sales, saleReturns, locationTransfers, isAppHydrating, isSalesClientHydrated, financialYear]);


  const handleAddOrUpdateTransfer = (transfer: LocationTransfer) => {
    const isEditing = locationTransfers.some(t => t.id === transfer.id);
    setLocationTransfers(prev => {
 return isEditing ? prev.map(t => (t.id === transfer.id ? transfer : t)) : [{ ...transfer, id: transfer.id || `lt-${Date.now()}` }, ...prev];
    });    toast({ title: isEditing ? "Transfer Updated" : "Transfer Created", description: isEditing ? "Location transfer details saved." : "New location transfer recorded successfully." });
    setTransferToEdit(null);
  };

  const handleEditTransfer = (transfer: LocationTransfer) => { setTransferToEdit(transfer); setIsAddFormOpen(true); };
  const handleDeleteTransferAttempt = (transfer: LocationTransfer) => { setItemToDelete(transfer); setShowDeleteConfirm(true); };

  const confirmDeleteTransfer = () => {
    if (itemToDelete) {
      setLocationTransfers(prev => prev.filter(t => t.id !== itemToDelete!.id));
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
    if (isAppHydrating || !hydrated) return [];
    const filtered = locationTransfers.filter(lt => isDateInFinancialYear(lt.date, financialYear));
    
    const flatList: ExpandedTransferHistoryItem[] = [];
    filtered.forEach(transfer => {
      if (transfer.items && transfer.items.length > 0) {
        transfer.items.forEach(item => {
          flatList.push({
            ...transfer,
            item: item,
          });
        });
      }
    });

    return flatList.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [locationTransfers, financialYear, isAppHydrating, hydrated]);
  
  const addButtonDynamicClass = React.useMemo(() => {
    if (activeTab === 'stockOverview') {
        return 'bg-sky-600 hover:bg-sky-700 text-white';
    }
    if (activeTab === 'transferHistory') {
        return 'bg-teal-600 hover:bg-teal-700 text-white';
    }
    return 'bg-primary hover:bg-primary/90'; // Fallback
  }, [activeTab]);


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
            <Button
              onClick={() => { setTransferToEdit(null); setIsAddFormOpen(true); }}
              size="lg"
              className={cn("text-base py-3 px-6 shadow-md", addButtonDynamicClass)}
            >
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
              <TabsTrigger
                value="stockOverview"
                className="py-3 text-base text-white bg-sky-600 hover:bg-sky-700 data-[state=active]:bg-sky-700 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-md"
              >
                <Boxes className="mr-2 h-5 w-5"/>Stock Overview
              </TabsTrigger>
              <TabsTrigger
                value="transferHistory"
                className="py-3 text-base text-white bg-teal-600 hover:bg-teal-700 data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-md"
              >
                <ListChecks className="mr-2 h-5 w-5"/>Transfer History
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <TabsContent value="stockOverview">
            <CardContent className="pt-6">
                <CardDescription className="mb-4 text-sm no-print">Current stock levels for FY {financialYear}.</CardDescription>
                <ScrollArea className="h-[400px] border rounded-md print:h-auto print:overflow-visible">
                    <Table size="sm"><TableHeader><TableRow><TableHead>WAREHOUSE</TableHead><TableHead>VAKKAL/LOT</TableHead><TableHead className="text-right">BAGS</TableHead><TableHead className="text-right">WEIGHT (KG)</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {aggregatedStockForForm.length === 0 && <TableRow><TableCell colSpan={4} className="text-center h-24">No stock for FY {financialYear}.</TableCell></TableRow>}
                            {aggregatedStockForForm.map(item => (
                                <TableRow key={`${item.locationId}-${item.lotNumber}`} className="uppercase">
                                    <TableCell><Tooltip><TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{item.locationName || item.locationId}</span></TooltipTrigger><TooltipContent><p>{item.locationName || item.locationId}</p></TooltipContent></Tooltip></TableCell>
                                    <TableCell><Tooltip><TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{item.lotNumber}</span></TooltipTrigger><TooltipContent><p>{item.lotNumber}</p></TooltipContent></Tooltip></TableCell>
                                    <TableCell className="text-right font-medium">{Math.round(item.currentBags).toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{item.currentWeight.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0})}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
          </TabsContent>
          <TabsContent value="transferHistory">
            <CardContent className="pt-6">
              <CardDescription className="mb-4 text-sm no-print">History of transfers for FY {financialYear}. Each row represents one item in a transfer.</CardDescription>
              <ScrollArea className="h-[400px] border rounded-md print:h-auto print:overflow-visible">
                <Table size="sm">
                  <TableHeader><TableRow><TableHead>DATE</TableHead><TableHead>FROM</TableHead><TableHead>TO</TableHead><TableHead>VAKKAL</TableHead><TableHead className="text-right">BAGS</TableHead><TableHead className="text-right">WEIGHT</TableHead><TableHead className="text-center no-print">ACTIONS</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {expandedTransfers.length === 0 && <TableRow><TableCell colSpan={7} className="text-center h-24">No transfers for FY {financialYear}.</TableCell></TableRow>}
                    {expandedTransfers.map(transfer => (
                      <TableRow key={`${transfer.id}-${transfer.item.originalLotNumber}`} className="uppercase">
                        <TableCell>{format(parseISO(transfer.date), "dd/MM/yy")}</TableCell>
                        <TableCell><Tooltip><TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{transfer.fromWarehouseName || transfer.fromWarehouseId}</span></TooltipTrigger><TooltipContent><p>{transfer.fromWarehouseName || transfer.fromWarehouseId}</p></TooltipContent></Tooltip></TableCell>
                        <TableCell><Tooltip><TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{transfer.toWarehouseName || transfer.toWarehouseId}</span></TooltipTrigger><TooltipContent><p>{transfer.toWarehouseName || transfer.toWarehouseId}</p></TooltipContent></Tooltip></TableCell>
                        <TableCell>
                          <Tooltip><TooltipTrigger asChild>
                            <span className="truncate max-w-[200px] inline-block">{transfer.item.originalLotNumber} → {transfer.item.newLotNumber}</span>
                          </TooltipTrigger>
                            <TooltipContent><p>{transfer.item.originalLotNumber} → {transfer.item.newLotNumber}</p></TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right">{Math.round(transfer.item.bagsToTransfer)}</TableCell>
                        <TableCell className="text-right">{transfer.item.netWeightToTransfer}</TableCell>
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
                    ))}
                  </TableBody>
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
