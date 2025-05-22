
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Warehouse, Transporter, Purchase, Sale, LocationTransfer, MasterItemType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, AlertTriangle, ArrowRightLeft, ListChecks, Building, Boxes, Printer, Trash2 } from "lucide-react"; // Added Printer, Trash2
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AddLocationTransferForm } from "./AddLocationTransferForm";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSettings } from "@/contexts/SettingsContext"; // Import useSettings
import { isDateInFinancialYear } from "@/lib/utils"; // Import isDateInFinancialYear

// Storage Keys
const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const PURCHASES_STORAGE_KEY = 'purchasesData';
const SALES_STORAGE_KEY = 'salesData';

const initialLocationTransfers: LocationTransfer[] = [
  {
    id: "lt-fy2526-1", date: "2025-05-20", fromWarehouseId: "wh-mum", fromWarehouseName: "Mumbai Central Warehouse", toWarehouseId: "wh-pune", toWarehouseName: "Pune North Godown",
    transporterId: "trans-quick", transporterName: "Quick Movers",
    items: [
      { lotNumber: "FY2526-LOT-A/100", bagsToTransfer: 10, netWeightToTransfer: 500 }, 
      { lotNumber: "FY2526-LOT-D/120", bagsToTransfer: 20, netWeightToTransfer: 1000 },
    ],
    notes: "Transferring partial stock for FY2526 to manage regional demand."
  },
  {
    id: "lt-fy2425-1", date: "2024-08-22", fromWarehouseId: "wh-pune", fromWarehouseName: "Pune North Godown", toWarehouseId: "wh-ngp", toWarehouseName: "Nagpur South Storage",
    items: [
      { lotNumber: "FY2425-LOT-X/90", bagsToTransfer: 15, netWeightToTransfer: 750 },
    ],
    notes: "Moving LOT-X stock to Nagpur for FY2425 distribution strategy."
  },
];

interface AggregatedStockItem {
  lotNumber: string;
  locationId: string;
  locationName: string;
  currentBags: number;
  currentWeight: number;
}

export function LocationTransferClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings(); // Use isAppHydrating
  
  const memoizedInitialLocationTransfers = React.useMemo(() => initialLocationTransfers, []);
  const memoizedEmptyMasters = React.useMemo(() => [], []);
  const memoizedEmptyTransactions = React.useMemo(() => [], []);


  const [locationTransfers, setLocationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, memoizedInitialLocationTransfers);
  const [warehouses, setWarehouses] = useLocalStorageState<Warehouse[]>(WAREHOUSES_STORAGE_KEY, memoizedEmptyMasters);
  const [transporters, setTransporters] = useLocalStorageState<Transporter[]>(TRANSPORTERS_STORAGE_KEY, memoizedEmptyMasters);
  const [purchases, setPurchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyTransactions);
  const [sales, setSales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyTransactions);

  const [isAddFormOpen, setIsAddFormOpen] = React.useState(false);
  const [transferToEdit, setTransferToEdit] = React.useState<LocationTransfer | null>(null);

  const [itemToDelete, setItemToDelete] = React.useState<LocationTransfer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const filteredLocationTransfers = React.useMemo(() => {
    if (isAppHydrating) return [];
    return locationTransfers.filter(transfer => transfer && transfer.date && isDateInFinancialYear(transfer.date, financialYear));
  }, [locationTransfers, financialYear, isAppHydrating]);

  const aggregatedStock = React.useMemo(() => {
    if (isAppHydrating) return [];
    const stockMap = new Map<string, AggregatedStockItem>();

    // Filter purchases by financial year
    const fyPurchases = purchases.filter(p => p && p.date && isDateInFinancialYear(p.date, financialYear));
    fyPurchases.forEach(p => {
      const key = `${p.lotNumber}-${p.locationId}`;
      let entry = stockMap.get(key);
      if (!entry) {
        entry = {
          lotNumber: p.lotNumber,
          locationId: p.locationId,
          locationName: warehouses.find(w => w.id === p.locationId)?.name || p.locationId,
          currentBags: 0,
          currentWeight: 0,
        };
      }
      entry.currentBags += p.quantity;
      entry.currentWeight += p.netWeight;
      stockMap.set(key, entry);
    });

    // Filter sales by financial year
    const fySales = sales.filter(s => s && s.date && isDateInFinancialYear(s.date, financialYear));
    fySales.forEach(s => {
      const relatedPurchase = fyPurchases.find(p => p.lotNumber === s.lotNumber); // Ensure related purchase is also in current FY
      if (relatedPurchase) {
          const key = `${s.lotNumber}-${relatedPurchase.locationId}`;
          const entry = stockMap.get(key);
          if (entry) {
          entry.currentBags -= s.quantity;
          entry.currentWeight -= s.netWeight;
          stockMap.set(key, entry);
          }
      }
    });

    // Filter location transfers by financial year
    filteredLocationTransfers.forEach(transfer => { // Use already filtered transfers
        transfer.items.forEach(item => {
            const fromKey = `${item.lotNumber}-${transfer.fromWarehouseId}`;
            const fromEntry = stockMap.get(fromKey);
            if (fromEntry) {
                fromEntry.currentBags -= item.bagsToTransfer;
                fromEntry.currentWeight -= item.netWeightToTransfer;
                stockMap.set(fromKey, fromEntry);
            }

            const toKey = `${item.lotNumber}-${transfer.toWarehouseId}`;
            let toEntry = stockMap.get(toKey);
            if (!toEntry) {
                toEntry = {
                    lotNumber: item.lotNumber,
                    locationId: transfer.toWarehouseId,
                    locationName: warehouses.find(w => w.id === transfer.toWarehouseId)?.name || transfer.toWarehouseId,
                    currentBags: 0,
                    currentWeight: 0,
                };
            }
            toEntry.currentBags += item.bagsToTransfer;
            toEntry.currentWeight += item.netWeightToTransfer;
            stockMap.set(toKey, toEntry);
        });
    });

    return Array.from(stockMap.values()).filter(item => item.currentBags > 0 || item.currentWeight > 0)
        .sort((a,b) => a.locationName.localeCompare(b.locationName) || a.lotNumber.localeCompare(b.lotNumber));
  }, [purchases, sales, filteredLocationTransfers, warehouses, financialYear, isAppHydrating]);


  const handleAddOrUpdateTransfer = (transfer: LocationTransfer) => {
    const isEditing = locationTransfers.some(t => t.id === transfer.id);
    setLocationTransfers(prev => {
      if (isEditing) {
        return prev.map(t => (t.id === transfer.id ? transfer : t));
      } else {
        return [{...transfer, id: transfer.id || `lt-${Date.now()}`}, ...prev];
      }
    });
    toast({ title: isEditing ? "Transfer Updated" : "Transfer Created", description: isEditing ? "Location transfer details saved." : "New location transfer recorded successfully." });
    setTransferToEdit(null);
  };

  const handleEditTransfer = (transfer: LocationTransfer) => {
    setTransferToEdit(transfer);
    setIsAddFormOpen(true);
  };

  const handleDeleteTransferAttempt = (transfer: LocationTransfer) => {
    setItemToDelete(transfer);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTransfer = () => {
    if (itemToDelete) {
      setLocationTransfers(prev => prev.filter(t => t.id !== itemToDelete.id));
      toast({ title: "Transfer Deleted", description: "Location transfer record removed.", variant: "destructive" });
      setItemToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleMasterDataUpdate = (type: "Warehouse" | "Transporter", newItem: MasterItem) => {
    if (type === "Warehouse") {
      setWarehouses(prev => [newItem as Warehouse, ...prev.filter(w => w.id !== newItem.id)]);
    } else if (type === "Transporter") {
      setTransporters(prev => [newItem as Transporter, ...prev.filter(t => t.id !== newItem.id)]);
    }
  };

  if (isAppHydrating) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p className="text-lg text-muted-foreground">Loading location transfer data...</p></div>;
  }

  return (
    <div className="space-y-8 print-area">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
            <ArrowRightLeft className="mr-3 h-8 w-8 text-primary" /> Location Transfers (FY {financialYear})
        </h1>
        <div className="flex items-center gap-2">
            <Button onClick={() => { setTransferToEdit(null); setIsAddFormOpen(true); }} size="lg" className="text-base py-3 px-6 shadow-md">
                <PlusCircle className="mr-2 h-5 w-5" /> New Transfer
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.print()}>
                <Printer className="h-5 w-5" />
                <span className="sr-only">Print</span>
            </Button>
        </div>
      </div>

      <Card className="shadow-xl">
      <TooltipProvider>
        <Tabs defaultValue="stockOverview" className="w-full">
          <CardHeader className="p-0 no-print">
            <TabsList className="grid w-full grid-cols-2 rounded-t-lg rounded-b-none">
              <TabsTrigger value="stockOverview" className="py-3 text-base">
                <Boxes className="mr-2 h-5 w-5"/>Stock Overview
              </TabsTrigger>
              <TabsTrigger value="transferHistory" className="py-3 text-base">
                <ListChecks className="mr-2 h-5 w-5"/>Transfer History
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <TabsContent value="stockOverview">
            <CardContent className="pt-6">
                <ScrollArea className="h-[400px] border rounded-md">
                    <Table size="sm">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Warehouse</TableHead>
                                <TableHead>Vakkal/Lot</TableHead>
                                <TableHead className="text-right">Bags</TableHead>
                                <TableHead className="text-right">Weight (kg)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {aggregatedStock.length === 0 && <TableRow><TableCell colSpan={4} className="text-center h-24">No stock available for FY {financialYear}.</TableCell></TableRow>}
                            {aggregatedStock.map(item => (
                                <TableRow key={`${item.locationId}-${item.lotNumber}`}>
                                    <TableCell>
                                      <Tooltip>
                                        <TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{item.locationName}</span></TooltipTrigger>
                                        <TooltipContent><p>{item.locationName}</p></TooltipContent>
                                      </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                      <Tooltip>
                                        <TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{item.lotNumber}</span></TooltipTrigger>
                                        <TooltipContent><p>{item.lotNumber}</p></TooltipContent>
                                      </Tooltip>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{item.currentBags.toLocaleString()}</TableCell>
                                    <TableCell className="text-right font-medium">{item.currentWeight.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
          </TabsContent>
          <TabsContent value="transferHistory">
            <CardContent className="pt-6">
              <ScrollArea className="h-[400px] border rounded-md">
                <Table size="sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-center no-print">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLocationTransfers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center h-24">No transfers recorded for FY {financialYear}.</TableCell></TableRow>}
                    {filteredLocationTransfers.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(transfer => (
                      <TableRow key={transfer.id}>
                        <TableCell>{format(new Date(transfer.date), "dd-MM-yy")}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{transfer.fromWarehouseName || transfer.fromWarehouseId}</span></TooltipTrigger>
                            <TooltipContent><p>{transfer.fromWarehouseName || transfer.fromWarehouseId}</p></TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{transfer.toWarehouseName || transfer.toWarehouseId}</span></TooltipTrigger>
                            <TooltipContent><p>{transfer.toWarehouseName || transfer.toWarehouseId}</p></TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate max-w-[200px] inline-block">
                                {transfer.items.map(i => `${i.lotNumber} (${i.bagsToTransfer} bags)`).join(', ')}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <ul className="list-disc pl-4">
                                {transfer.items.map(i => <li key={i.lotNumber}>{`${i.lotNumber} (${i.bagsToTransfer} bags, ${i.netWeightToTransfer.toLocaleString()}kg)`}</li>)}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="truncate max-w-xs">
                          {transfer.notes ? (
                            <Tooltip>
                              <TooltipTrigger asChild><span>{transfer.notes}</span></TooltipTrigger>
                              <TooltipContent><p>{transfer.notes}</p></TooltipContent>
                            </Tooltip>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center no-print">
                          <Button variant="ghost" size="icon" onClick={() => handleEditTransfer(transfer)} className="mr-1 hover:text-primary"><PlusCircle className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTransferAttempt(transfer)} className="hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
        <CardFooter className="flex items-start text-destructive p-3 mt-4 rounded-md border border-destructive/50 bg-destructive/10 no-print">
            <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 shrink-0"/>
            <p className="text-xs">
            <strong>Note:</strong> Ensure all relevant transactions (Purchases, Sales) are up-to-date for the current financial year for accurate stock overview.
            </p>
        </CardFooter>
      </Card>


      {isAddFormOpen && (
        <AddLocationTransferForm
          isOpen={isAddFormOpen}
          onClose={() => setIsAddFormOpen(false)}
          onSubmit={handleAddOrUpdateTransfer}
          warehouses={warehouses}
          transporters={transporters}
          purchases={purchases} 
          onMasterDataUpdate={handleMasterDataUpdate}
          transferToEdit={transferToEdit}
        />
      )}

      {itemToDelete && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transfer Record?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this location transfer record? This action cannot be undone and will not automatically revert stock changes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteTransfer} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
