
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Warehouse, Transporter, Purchase, Sale, LocationTransfer, MasterItemType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, AlertTriangle, ArrowRightLeft, ListChecks, Building } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AddLocationTransferForm } from "./AddLocationTransferForm";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
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

// Storage Keys
const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const PURCHASES_STORAGE_KEY = 'purchasesData';
const SALES_STORAGE_KEY = 'salesData';

interface AggregatedStockItem {
  lotNumber: string;
  locationId: string;
  locationName: string;
  currentBags: number;
  currentWeight: number;
}

export function LocationTransferClient() {
  const { toast } = useToast();
  const [hydrated, setHydrated] = React.useState(false);

  const [locationTransfers, setLocationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, []);
  const [warehouses, setWarehouses] = useLocalStorageState<Warehouse[]>(WAREHOUSES_STORAGE_KEY, []);
  const [transporters, setTransporters] = useLocalStorageState<Transporter[]>(TRANSPORTERS_STORAGE_KEY, []);
  const [purchases, setPurchases] // Removed setPurchases as it's read-only here
    = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, []);
  const [sales, setSales] // Removed setSales
    = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, []);

  const [isAddFormOpen, setIsAddFormOpen] = React.useState(false);
  const [transferToEdit, setTransferToEdit] = React.useState<LocationTransfer | null>(null);

  const [itemToDelete, setItemToDelete] = React.useState<LocationTransfer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const aggregatedStock = React.useMemo(() => {
    if (!hydrated) return [];
    const stockMap = new Map<string, AggregatedStockItem>(); // Key: lotNumber-locationId

    purchases.forEach(p => {
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

    sales.forEach(s => {
      // Find purchase to determine original location if not directly on sale
      const relatedPurchase = purchases.find(p => p.lotNumber === s.lotNumber);
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
    
    // Apply location transfers to adjust stock
    locationTransfers.forEach(transfer => {
        transfer.items.forEach(item => {
            // Decrement from source warehouse
            const fromKey = `${item.lotNumber}-${transfer.fromWarehouseId}`;
            const fromEntry = stockMap.get(fromKey);
            if (fromEntry) {
                fromEntry.currentBags -= item.bagsToTransfer;
                fromEntry.currentWeight -= item.netWeightToTransfer;
                stockMap.set(fromKey, fromEntry);
            }

            // Increment in destination warehouse
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
  }, [purchases, sales, locationTransfers, warehouses, hydrated]);


  const handleAddOrUpdateTransfer = (transfer: LocationTransfer) => {
    setLocationTransfers(prev => {
      const isEditing = prev.some(t => t.id === transfer.id);
      if (isEditing) {
        toast({ title: "Transfer Updated", description: "Location transfer details saved." });
        return prev.map(t => (t.id === transfer.id ? transfer : t));
      } else {
        toast({ title: "Transfer Created", description: "New location transfer recorded successfully." });
        return [transfer, ...prev];
      }
    });
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

  if (!hydrated) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p className="text-lg text-muted-foreground">Loading location transfer data...</p></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <ArrowRightLeft className="mr-3 h-8 w-8 text-primary" /> Location Transfers
          </h1>
        </div>
        <Button onClick={() => { setTransferToEdit(null); setIsAddFormOpen(true); }} size="lg" className="text-base py-3 px-6 shadow-md">
          <PlusCircle className="mr-2 h-5 w-5" /> New Transfer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl text-primary flex items-center"><Building className="mr-2 h-6 w-6"/>Current Stock by Warehouse</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] border rounded-md">
                    <Table size="sm">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Warehouse</TableHead>
                                <TableHead>Vakkal/Lot</TableHead>
                                <TableHead className="text-right">Bags</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {aggregatedStock.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24">No stock available.</TableCell></TableRow>}
                            {aggregatedStock.map(item => (
                                <TableRow key={`${item.locationId}-${item.lotNumber}`}>
                                    <TableCell>{item.locationName}</TableCell>
                                    <TableCell>{item.lotNumber}</TableCell>
                                    <TableCell className="text-right font-medium">{item.currentBags.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center"><ListChecks className="mr-2 h-6 w-6"/>Transfer History</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] border rounded-md">
              <Table size="sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationTransfers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center h-24">No transfers recorded yet.</TableCell></TableRow>}
                  {locationTransfers.map(transfer => (
                    <TableRow key={transfer.id}>
                      <TableCell>{format(new Date(transfer.date), "dd-MM-yy")}</TableCell>
                      <TableCell>{transfer.fromWarehouseName || transfer.fromWarehouseId}</TableCell>
                      <TableCell>{transfer.toWarehouseName || transfer.toWarehouseId}</TableCell>
                      <TableCell>{transfer.items.map(i => `${i.lotNumber} (${i.bagsToTransfer} bags)`).join(', ')}</TableCell>
                      <TableCell className="truncate max-w-xs">{transfer.notes || 'N/A'}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleEditTransfer(transfer)} className="mr-1 hover:text-primary"><PlusCircle className="h-4 w-4" /></Button> {/* Reusing Plus as Edit for now */}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTransferAttempt(transfer)} className="hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
           <CardFooter className="flex items-start text-destructive p-3 mt-4 rounded-md border border-destructive/50 bg-destructive/10">
                <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 shrink-0"/>
                <p className="text-xs">
                <strong>Note:</strong> Inventory summary on other pages (Dashboard, Inventory, Stock Report) will reflect these transfers once those modules are updated to process transfer data.
                </p>
          </CardFooter>
        </Card>
      </div>
      

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
