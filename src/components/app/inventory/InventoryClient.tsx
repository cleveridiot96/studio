
"use client";

import * as React from "react";
import Link from 'next/link';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { StockAdjustment } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive, Boxes, Printer, RotateCcw, PlusCircle, ArrowRightLeft, ShoppingCart, Warehouse as WarehouseIcon, DollarSign, AlertTriangle, GitMerge, ListTodo, SlidersHorizontal, Undo2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear } from "@/lib/utils";
import { InventoryTable } from "./InventoryTable"; 
import { cn } from "@/lib/utils";
import { PartyBrokerLeaderboard } from "./PartyBrokerLeaderboard";
import { MergeLotsForm } from "./MergeLotsForm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LowStockWarning } from "@/components/app/dashboard/LowStockWarning";
import { useMasterData } from '@/contexts/MasterDataContext';
import { useTransactions } from '@/hooks/useTransactions';
import { AddAdjustmentForm } from "../stock-adjustments/AddAdjustmentForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import type { AggregatedInventoryItem } from '@/hooks/useInventory';
import { useInventory } from '@/hooks/useInventory';

const ARCHIVED_LOTS_STORAGE_KEY = 'archivedInventoryLotKeys';

interface InventoryClientProps {
  warehouseIdFromQuery?: string;
}

export function InventoryClient({ warehouseIdFromQuery }: InventoryClientProps) {
  const { financialYear, isAppHydrating, lowStockThreshold } = useSettings();
  const { toast } = useToast();
  const { data: masterData } = useMasterData();
  const { warehouses } = masterData;
  const { locationTransfers, setLocationTransfers, adjustments, setAdjustments } = useTransactions();
  
  const { allAggregatedInventory, isLoading: isInventoryLoading } = useInventory();

  const [archivedLotKeys, setArchivedLotKeys] = useLocalStorageState<string[]>(ARCHIVED_LOTS_STORAGE_KEY, []);

  const [itemToArchive, setItemToArchive] = React.useState<AggregatedInventoryItem | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = React.useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<string | null>(warehouseIdFromQuery || null);
  const [isMergeFormOpen, setIsMergeFormOpen] = React.useState(false);
  const [activeRowSelection, setActiveRowSelection] = React.useState<Record<string, boolean>>({});
  const [archivedRowSelection, setArchivedRowSelection] = React.useState<Record<string, boolean>>({});
  const [isAdjustmentFormOpen, setIsAdjustmentFormOpen] = React.useState(false);
  const [itemToReverse, setItemToReverse] = React.useState<StockAdjustment | null>(null);
  
  React.useEffect(() => {
    setSelectedWarehouseId(warehouseIdFromQuery || null);
  }, [warehouseIdFromQuery]);

  const activeInventory = React.useMemo(() => {
    return allAggregatedInventory.filter(item => !archivedLotKeys.includes(item.key));
  }, [allAggregatedInventory, archivedLotKeys]);

  const archivedInventory = React.useMemo(() => {
    return allAggregatedInventory.filter(item => archivedLotKeys.includes(item.key));
  }, [allAggregatedInventory, archivedLotKeys]);

  const warehouseSummary = React.useMemo(() => {
    const summary: Record<string, { id: string; name: string; bags: number; netWeight: number; totalValue: number }> = {};
    allAggregatedInventory.forEach(item => { // Use all inventory for summary
      if (item.currentBags > 0) {
        if (!summary[item.locationId]) {
          summary[item.locationId] = { id: item.locationId, name: item.locationName, bags: 0, netWeight: 0, totalValue: 0 };
        }
        summary[item.locationId].bags += item.currentBags;
        summary[item.locationId].netWeight += item.currentWeight;
        summary[item.locationId].totalValue += item.cogs;
      }
    });
    return Object.values(summary).sort((a,b) => a.name.localeCompare(b.name));
  }, [allAggregatedInventory]);

  const filteredActiveInventory = React.useMemo(() => {
    if (!selectedWarehouseId) return activeInventory;
    return activeInventory.filter(item => item.locationId === selectedWarehouseId);
  }, [activeInventory, selectedWarehouseId]);

  const filteredArchivedInventory = React.useMemo(() => {
    if (!selectedWarehouseId) return archivedInventory;
    return archivedInventory.filter(item => item.locationId === selectedWarehouseId);
  }, [archivedInventory, selectedWarehouseId]);

  const allLotsInSystem = React.useMemo(() => {
    const lots = new Set<string>();
    allAggregatedInventory.forEach(item => lots.add(item.lotNumber));
    return Array.from(lots).sort();
  }, [allAggregatedInventory]);

  const filteredAdjustments = React.useMemo(() => {
    if (isAppHydrating) return [];
    return (adjustments || [])
      .filter(adj => isDateInFinancialYear(adj.date, financialYear))
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [adjustments, financialYear, isAppHydrating]);

  const handleArchiveAttempt = (item: AggregatedInventoryItem) => {
    if (item.currentBags <= 0.001) { setItemToArchive(item); setShowArchiveConfirm(true); }
    else { toast({ title: "Cannot Archive", description: `Lot "${item.lotNumber}" has stock. Only zero-stock can be archived.`, variant: "destructive" }); }
  };
  const confirmArchiveItem = () => {
    if (itemToArchive) {
      setArchivedLotKeys(prev => [...prev, itemToArchive.key]);
      toast({ title: "Lot Archived", description: `Lot "${itemToArchive.lotNumber}" at ${itemToArchive.locationName} has been archived.` });
      setItemToArchive(null); setShowArchiveConfirm(false);
    }
  };
  const handleUnarchiveItem = (item: AggregatedInventoryItem) => {
    setArchivedLotKeys(prev => prev.filter(key => key !== item.key));
    toast({ title: "Lot Restored", description: `Lot "${item.lotNumber}" has been restored to the active inventory view.` });
  };
  
  const handleBulkArchive = () => {
    const keysToArchive = Object.keys(activeRowSelection).filter(key => {
        const item = activeInventory.find(i => i.key === key);
        return item && item.currentBags <= 0.001;
    });

    if (keysToArchive.length > 0) {
        setArchivedLotKeys(prev => [...new Set([...prev, ...keysToArchive])]);
        toast({ title: "Bulk Archive", description: `${keysToArchive.length} zero-stock lots archived.` });
        setActiveRowSelection({});
    } else {
        toast({ title: "No Action", description: "No eligible (zero-stock) lots were selected for archival." });
    }
  };

  const handleBulkUnarchive = () => {
    const keysToUnarchive = Object.keys(archivedRowSelection);
    if (keysToUnarchive.length > 0) {
        setArchivedLotKeys(prev => prev.filter(key => !keysToUnarchive.includes(key)));
        toast({ title: "Bulk Restore", description: `${keysToUnarchive.length} lots restored to active inventory.` });
        setArchivedRowSelection({});
    }
  };


  const getActiveFilterName = () => {
    if (!selectedWarehouseId) return "All Warehouses";
    return warehouses.find(w => w.id === selectedWarehouseId)?.name || "Selected Warehouse";
  };
  
  const handleMergeSubmit = (mergeData: Omit<LocationTransfer, 'id' | 'date'>) => {
    const newTransfer = {
      id: `lt-merge-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...mergeData,
    };
    setLocationTransfers(prev => [newTransfer, ...prev]);
    toast({ title: "Lots Merged", description: `Successfully merged lots into ${mergeData.items[0].newLotNumber}.` });
    setIsMergeFormOpen(false);
    window.dispatchEvent(new CustomEvent('reindex-search'));
  };
  
  const handleAddAdjustment = React.useCallback((newAdjustment: Omit<StockAdjustment, 'id'>) => {
    setAdjustments(prev => [{ ...newAdjustment, id: `adj-${Date.now()}` }, ...prev]);
    toast({ title: 'Adjustment Recorded', description: 'The stock adjustment has been successfully saved.' });
    window.dispatchEvent(new CustomEvent('reindex-search'));
  }, [setAdjustments, toast]);

  const handleReverseAttempt = (adjustment: StockAdjustment) => {
    if (adjustment.type === 'Reversal') {
      toast({ title: 'Cannot Reverse', description: 'This is already a reversal transaction.', variant: 'destructive' });
      return;
    }
    setItemToReverse(adjustment);
  };

  const confirmReversal = () => {
    if (itemToReverse) {
      const reversal: Omit<StockAdjustment, 'id'> = {
        date: format(new Date(), 'yyyy-MM-dd'),
        lotNumber: itemToReverse.lotNumber,
        locationId: itemToReverse.locationId,
        locationName: itemToReverse.locationName,
        bags: -itemToReverse.bags,
        weight: -itemToReverse.weight,
        type: 'Reversal',
        reason: `Reversal of adjustment ID: ${itemToReverse.id}`,
      };
      handleAddAdjustment(reversal);
      setItemToReverse(null);
    }
  };

  const getBadgeVariant = (type: StockAdjustment['type']) => {
    switch (type) {
      case 'Wastage':
      case 'Theft':
        return 'destructive';
      case 'Correction':
        return 'secondary';
      case 'Reversal':
        return 'outline';
      default:
        return 'default';
    }
  };
  
  const activeSelectionCount = Object.keys(activeRowSelection).length;
  const archivedSelectionCount = Object.keys(archivedRowSelection).length;


  if (isAppHydrating || isInventoryLoading) return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p>Loading inventory...</p></div>;

  return (
    <div className="space-y-6 print-area">
      <LowStockWarning />
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-foreground">Inventory Dashboard (FY {financialYear})</h1>
        <div className="flex items-center gap-2">
           <Button asChild variant="outline"><Link href="/purchases"><PlusCircle className="mr-2 h-4 w-4" />New Purchase</Link></Button>
           <Button variant="outline" onClick={() => setIsMergeFormOpen(true)}><GitMerge className="mr-2 h-4 w-4" />Merge Stock</Button>
           <Button asChild variant="outline"><Link href="/location-transfer"><ArrowRightLeft className="mr-2 h-4 w-4" />Transfer Stock</Link></Button>
           <Button asChild><Link href="/sales"><ShoppingCart className="mr-2 h-4 w-4" />Sell Stock</Link></Button>
           <Button variant="outline" size="icon" onClick={() => window.print()}><Printer className="h-5 w-5" /><span className="sr-only">Print</span></Button>
        </div>
      </div>
      
      <div className="no-print">
        <h2 className="text-xl font-semibold text-foreground mb-3">Warehouse Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <Link href="/inventory">
            <button
                onClick={() => setSelectedWarehouseId(null)}
                className={cn(
                    "p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow text-left flex flex-col justify-between h-full w-full",
                    !selectedWarehouseId ? 'ring-2 ring-primary bg-primary/10' : 'bg-card'
                )}
            >
                <CardTitle className="text-lg flex items-center gap-2"><WarehouseIcon className="h-5 w-5 text-primary"/>All Warehouses</CardTitle>
                <div>
                  <p className="text-2xl font-bold">{Math.round(allAggregatedInventory.reduce((sum, item) => sum + item.currentBags, 0)).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">BAGS</span></p>
                  <p className="text-sm text-muted-foreground">{allAggregatedInventory.reduce((sum, item) => sum + item.currentWeight, 0).toLocaleString()} KG</p>
                  <p className="text-sm text-muted-foreground font-semibold flex items-center gap-1 mt-1"><DollarSign className="h-3 w-3"/>{Math.round(allAggregatedInventory.reduce((sum, item) => sum + item.cogs, 0)).toLocaleString('en-IN', {style: 'currency', currency: 'INR', minimumFractionDigits: 0})}</p>
                </div>
            </button>
            </Link>
            {warehouseSummary.map(wh => {
              const isLow = wh.bags < lowStockThreshold;
              return (
                <Link key={wh.id} href={`/inventory?warehouseId=${wh.id}`}>
                <button
                  onClick={() => setSelectedWarehouseId(wh.id)}
                  className={cn(
                      "p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow text-left flex flex-col justify-between h-full w-full relative",
                      selectedWarehouseId === wh.id ? 'ring-2 ring-primary bg-primary/10' : 'bg-card',
                      isLow && "border-2 border-destructive"
                  )}
                >
                    {isLow && <AlertTriangle className="h-5 w-5 text-destructive absolute top-2 right-2" />}
                    <CardTitle className="text-lg">{wh.name}</CardTitle>
                    <div>
                      <p className="text-2xl font-bold">{Math.round(wh.bags).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">BAGS</span></p>
                      <p className="text-sm text-muted-foreground">{wh.netWeight.toLocaleString()} KG</p>
                      <p className="text-sm text-muted-foreground font-semibold flex items-center gap-1 mt-1"><DollarSign className="h-3 w-3"/>{Math.round(wh.totalValue).toLocaleString('en-IN', {style: 'currency', currency: 'INR', minimumFractionDigits: 0})}</p>
                    </div>
                </button>
                </Link>
              )
            })}
           {warehouseSummary.length === 0 && <p className="text-muted-foreground col-span-full">No active stock in any warehouse.</p>}
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full pt-6">
        <TabsList className="grid w-full grid-cols-3 h-auto no-print">
          <TabsTrigger value="active" className="py-2 sm:py-3 text-sm sm:text-base"><Boxes className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> Vakkal-Wise Stock Table</TabsTrigger>
          <TabsTrigger value="archived" className="py-2 sm:py-3 text-sm sm:text-base"><Archive className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> Archived Vakkals</TabsTrigger>
          <TabsTrigger value="adjustments" className="py-2 sm:py-3 text-sm sm:text-base"><SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> Adjustments History</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                    Active Inventory: {getActiveFilterName()}
                    {selectedWarehouseId && (
                       <Link href="/inventory">
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                           <X className="h-4 w-4" />
                        </Button>
                       </Link>
                    )}
                </CardTitle>
                 {activeSelectionCount > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <ListTodo className="mr-2 h-4 w-4" />
                          Bulk Actions ({activeSelectionCount})
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={handleBulkArchive}>
                          <Archive className="mr-2 h-4 w-4" /> Archive Selected
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <InventoryTable items={filteredActiveInventory} onArchive={handleArchiveAttempt} lowStockThreshold={lowStockThreshold} rowSelection={activeRowSelection} setRowSelection={setActiveRowSelection} />
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="archived" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Archived Stock: {getActiveFilterName()}</CardTitle>
                {archivedSelectionCount > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <ListTodo className="mr-2 h-4 w-4" />
                          Bulk Actions ({archivedSelectionCount})
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={handleBulkUnarchive}>
                          <RotateCcw className="mr-2 h-4 w-4" /> Restore Selected
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                )}
              </div>
              <CardDescription>These lots have a zero balance and are hidden from the main view. They can be restored.</CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryTable items={filteredArchivedInventory} onArchive={handleArchiveAttempt} onUnarchive={handleUnarchiveItem} isArchivedView={true} lowStockThreshold={lowStockThreshold} rowSelection={archivedRowSelection} setRowSelection={setArchivedRowSelection} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="adjustments" className="mt-6">
           <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Stock Adjustments History</CardTitle>
                <Button onClick={() => setIsAdjustmentFormOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> New Adjustment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[60vh] overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Lot Number</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Bags</TableHead>
                      <TableHead className="text-right">Weight (kg)</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdjustments.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center h-24">No adjustments recorded for this financial year.</TableCell></TableRow>
                    ) : (
                      filteredAdjustments.map(adj => (
                        <TableRow key={adj.id}>
                          <TableCell>{format(parseISO(adj.date), 'dd/MM/yy')}</TableCell>
                          <TableCell>{adj.lotNumber}</TableCell>
                          <TableCell>{adj.locationName}</TableCell>
                          <TableCell><Badge variant={getBadgeVariant(adj.type)}>{adj.type}</Badge></TableCell>
                          <TableCell className={`text-right font-medium ${adj.bags < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {adj.bags.toLocaleString('en-IN', { signDisplay: 'always' })}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${adj.weight < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {adj.weight.toLocaleString('en-IN', { signDisplay: 'always', minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{adj.reason}</TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon" onClick={() => handleReverseAttempt(adj)} title="Reverse Transaction" disabled={adj.type === 'Reversal'}>
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-8 no-print">
        <PartyBrokerLeaderboard items={allAggregatedInventory} />
      </div>

      {isMergeFormOpen && (
        <MergeLotsForm
          isOpen={isMergeFormOpen}
          onClose={() => setIsMergeFormOpen(false)}
          onSubmit={handleMergeSubmit}
          warehouses={warehouses}
          availableStock={activeInventory}
        />
      )}

      {isAdjustmentFormOpen && (
         <AddAdjustmentForm
            isOpen={isAdjustmentFormOpen}
            onClose={() => setIsAdjustmentFormOpen(false)}
            onSubmit={handleAddAdjustment}
            warehouses={masterData.Warehouse}
            availableLots={allLotsInSystem}
        />
      )}

      {itemToReverse && (
        <AlertDialog open={!!itemToReverse} onOpenChange={(open) => !open && setItemToReverse(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reverse this Stock Adjustment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a new, opposite adjustment transaction to cancel out the selected one. The original record will remain for audit purposes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmReversal}>Confirm Reversal</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {itemToArchive && (<AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Archive Vakkal/Lot?</AlertDialogTitle><AlertDialogDescription>This action will hide the lot "<strong>{itemToArchive.lotNumber}</strong>" from the main inventory view. You can view and restore it from the "Archived" tab.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setItemToArchive(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmArchiveItem} className="bg-blue-600 hover:bg-blue-700">Archive</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
    </div>
  );
}
