
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, Download, ListCollapse, RotateCcw } from "lucide-react";
import type { Purchase, MasterItem, MasterItemType, Supplier, Agent, Warehouse, Transporter, PurchaseReturn, Sale, LocationTransfer } from "@/lib/types";
import { PurchaseTable } from "./PurchaseTable";
import { AddPurchaseForm } from "./AddPurchaseForm";
import { PurchaseChittiPrint } from "./PurchaseChittiPrint";
import { AddPurchaseReturnForm } from "./AddPurchaseReturnForm";
import { PurchaseReturnTable } from "./PurchaseReturnTable";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear } from "@/lib/utils";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format as formatDateFn } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { purchaseMigrator } from '@/lib/dataMigrators';
import { FIXED_WAREHOUSES } from '@/lib/constants';

const initialPurchasesData: Purchase[] = [];
const initialPurchaseReturnsData: PurchaseReturn[] = [];

const PURCHASES_STORAGE_KEY = 'purchasesData';
const PURCHASE_RETURNS_STORAGE_KEY = 'purchaseReturnsData';
const SALES_STORAGE_KEY = 'salesData'; // For checking dependencies
const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData'; // For checking dependencies
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';

export function PurchasesClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();

  const memoizedInitialPurchases = React.useMemo(() => initialPurchasesData, []);
  const memoizedInitialPurchaseReturns = React.useMemo(() => initialPurchaseReturnsData, []);
  const memoizedEmptyMasters = React.useMemo(() => [], []);
  const memoizedEmptyArray = React.useMemo(() => [], []);

  const [purchases, setPurchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedInitialPurchases, purchaseMigrator);
  const [purchaseReturns, setPurchaseReturns] = useLocalStorageState<PurchaseReturn[]>(PURCHASE_RETURNS_STORAGE_KEY, memoizedInitialPurchaseReturns);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, memoizedEmptyArray);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(SUPPLIERS_STORAGE_KEY, memoizedEmptyMasters);
  const [agents, setAgents] = useLocalStorageState<Agent[]>(AGENTS_STORAGE_KEY, memoizedEmptyMasters);
  const [warehouses, setWarehouses] = useLocalStorageState<MasterItem[]>(WAREHOUSES_STORAGE_KEY, memoizedEmptyMasters);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, memoizedEmptyMasters);

  const [isAddPurchaseFormOpen, setIsAddPurchaseFormOpen] = React.useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = React.useState<Purchase | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [purchaseToDeleteId, setPurchaseToDeleteId] = React.useState<string | null>(null);

  const [isAddPurchaseReturnFormOpen, setIsAddPurchaseReturnFormOpen] = React.useState(false);
  const [purchaseReturnToEdit, setPurchaseReturnToEdit] = React.useState<PurchaseReturn | null>(null);
  const [showDeleteReturnConfirm, setShowDeleteReturnConfirm] = React.useState(false);
  const [purchaseReturnToDeleteId, setPurchaseReturnToDeleteId] = React.useState<string | null>(null);

  const [purchaseForPdf, setPurchaseForPdf] = React.useState<Purchase | null>(null);
  const chittiContainerRef = React.useRef<HTMLDivElement>(null);
  const [isPurchasesClientHydrated, setIsPurchasesClientHydrated] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('purchases');

  React.useEffect(() => {
    setIsPurchasesClientHydrated(true);
  }, []);
  
  React.useEffect(() => {
    if (isPurchasesClientHydrated) {
        const warehousesMap = new Map(warehouses.map(item => [item.id, item]));
        let updated = false;
        FIXED_WAREHOUSES.forEach(fixedWarehouse => {
            const existing = warehousesMap.get(fixedWarehouse.id);
            if (!existing || existing.name !== fixedWarehouse.name) {
                warehousesMap.set(fixedWarehouse.id, { ...fixedWarehouse });
                updated = true;
            }
        });

        if (updated) {
            setWarehouses(Array.from(warehousesMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        }
    }
  }, [isPurchasesClientHydrated, warehouses, setWarehouses]);

  const filteredPurchases = React.useMemo(() => {
    if (isAppHydrating || !isPurchasesClientHydrated) return [];
    return purchases.filter(purchase => purchase && purchase.date && isDateInFinancialYear(purchase.date, financialYear));
  }, [purchases, financialYear, isAppHydrating, isPurchasesClientHydrated]);

  const filteredPurchaseReturns = React.useMemo(() => {
    if (isAppHydrating || !isPurchasesClientHydrated) return [];
    return purchaseReturns.filter(pr => pr && pr.date && isDateInFinancialYear(pr.date, financialYear));
  }, [purchaseReturns, financialYear, isAppHydrating, isPurchasesClientHydrated]);

  const handleAddOrUpdatePurchase = React.useCallback((purchase: Purchase) => {
    setPurchases(prevPurchases => {
      const isEditing = prevPurchases.some(p => p.id === purchase.id);
      return isEditing ? prevPurchases.map(p => p.id === purchase.id ? purchase : p) : [{ ...purchase, id: purchase.id || `purchase-${Date.now()}` }, ...prevPurchases];
    });
    setPurchaseToEdit(null);
    toast({ title: "Success!", description: purchases.some(p=>p.id === purchase.id) ? "Purchase updated." : "Purchase added." });
  }, [setPurchases, toast, purchases]);

  const handleEditPurchase = (purchase: Purchase) => {
    setPurchaseToEdit(purchase);
    setIsAddPurchaseFormOpen(true);
  };

  const handleDeletePurchaseAttempt = React.useCallback((purchaseId: string) => {
    const purchaseToDelete = purchases.find(p => p.id === purchaseId);
    if (!purchaseToDelete) return;

    const lotNumbersInPurchase = purchaseToDelete.items.map(item => item.lotNumber);

    const isUsedInSales = sales.some(sale => 
        sale.items.some(item => lotNumbersInPurchase.includes(item.lotNumber))
    );

    if (isUsedInSales) {
        toast({
            title: "Deletion Prohibited",
            description: "Cannot delete. Stock from this purchase has been used in a sale.",
            variant: "destructive",
        });
        return;
    }

    const isUsedInTransfers = locationTransfers.some(transfer => 
        transfer.items.some(item => lotNumbersInPurchase.includes(item.originalLotNumber))
    );

    if (isUsedInTransfers) {
        toast({
            title: "Deletion Prohibited",
            description: "Cannot delete. Stock from this purchase has been transferred.",
            variant: "destructive",
        });
        return;
    }

    setPurchaseToDeleteId(purchaseId);
    setShowDeleteConfirm(true);
}, [purchases, sales, locationTransfers, toast]);


  const confirmDeletePurchase = React.useCallback(() => {
    if (purchaseToDeleteId) {
      setPurchases(prev => prev.filter(p => p.id !== purchaseToDeleteId));
      toast({ title: "Deleted!", description: "Purchase record removed.", variant: "destructive" });
      setPurchaseToDeleteId(null); setShowDeleteConfirm(false);
    }
  }, [purchaseToDeleteId, setPurchases, toast]);

  const handleAddOrUpdatePurchaseReturn = React.useCallback((prData: PurchaseReturn) => {
    setPurchaseReturns(prevReturns => {
      const isEditing = prevReturns.some(pr => pr.id === prData.id);
      return isEditing ? prevReturns.map(pr => pr.id === prData.id ? prData : pr) : [{ ...prData, id: prData.id || `pr-${Date.now()}` }, ...prevReturns];
    });
    setPurchaseReturnToEdit(null);
    toast({ title: "Success!", description: purchaseReturns.some(pr => pr.id === prData.id) ? "Purchase return updated." : "Purchase return added." });
  }, [setPurchaseReturns, toast, purchaseReturns]);

  const handleEditPurchaseReturn = React.useCallback((pr: PurchaseReturn) => {
    setPurchaseReturnToEdit(pr);
    setIsAddPurchaseReturnFormOpen(true);
  }, []);

  const handleDeletePurchaseReturnAttempt = React.useCallback((prId: string) => {
    setPurchaseReturnToDeleteId(prId);
    setShowDeleteReturnConfirm(true);
  }, []);

  const confirmDeletePurchaseReturn = React.useCallback(() => {
    if (purchaseReturnToDeleteId) {
      setPurchaseReturns(prev => prev.filter(pr => pr.id !== purchaseReturnToDeleteId));
      toast({ title: "Deleted!", description: "Purchase return record removed.", variant: "destructive" });
      setPurchaseReturnToDeleteId(null); setShowDeleteReturnConfirm(false);
    }
  }, [purchaseReturnToDeleteId, setPurchaseReturns, toast]);

  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    const setters: Record<string, React.Dispatch<React.SetStateAction<MasterItem[]>>> = { Supplier: setSuppliers, Agent: setAgents, Warehouse: setWarehouses, Transporter: setTransporters };
    const setter = setters[type];
    if (setter) setter(prev => { const newSet = new Map(prev.map(item => [item.id, item])); newSet.set(newItem.id, newItem); return Array.from(newSet.values()).sort((a,b) => a.name.localeCompare(b.name)); });
  }, [setSuppliers, setAgents, setWarehouses, setTransporters]);

  const openAddPurchaseForm = React.useCallback(() => {
    setPurchaseToEdit(null);
    setIsAddPurchaseFormOpen(true);
  }, []);

  const closeAddPurchaseForm = React.useCallback(() => {
    setIsAddPurchaseFormOpen(false);
    setPurchaseToEdit(null);
  }, []);

  const openAddPurchaseReturnForm = React.useCallback(() => {
    setPurchaseReturnToEdit(null);
    setIsAddPurchaseReturnFormOpen(true);
  }, []);

  const closeAddPurchaseReturnForm = React.useCallback(() => {
    setIsAddPurchaseReturnFormOpen(false);
    setPurchaseReturnToEdit(null);
  }, []);

  const triggerDownloadPurchasePdf = React.useCallback((purchase: Purchase) => {
    setPurchaseForPdf(purchase);
  }, []);

  const addButtonDynamicClass = React.useMemo(() => {
    if (activeTab === 'purchases') {
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
    if (activeTab === 'purchaseReturns') {
        return 'bg-orange-600 hover:bg-orange-700 text-white';
    }
    return 'bg-primary hover:bg-primary/90'; // Fallback
  }, [activeTab]);

  React.useEffect(() => {
    if (purchaseForPdf && chittiContainerRef.current) {
      const generatePdf = async () => {
        const elementToCapture = chittiContainerRef.current?.querySelector('.print-chitti-styles') as HTMLElement;
        if (!elementToCapture) { toast({ title: "PDF Error", description: "Chitti content not ready.", variant: "destructive" }); setPurchaseForPdf(null); return; }
        try {
          const canvas = await html2canvas(elementToCapture, { scale: 1.5, useCORS: true, width: 550, height: elementToCapture.offsetHeight, logging: false });
          const imgData = canvas.toDataURL('image/jpeg', 0.85);
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5', compress: true });
          const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = pdf.internal.pageSize.getHeight(); const imgProps = pdf.getImageProperties(imgData);
          const margin = 10; const contentWidth = pdfWidth - 2 * margin; const contentHeight = pdfHeight - 2 * margin;
          const ratio = imgProps.width / imgProps.height; let imgWidth = contentWidth; let imgHeight = imgWidth / ratio;
          if (imgHeight > contentHeight) { imgHeight = contentHeight; imgWidth = imgHeight * ratio; }
          const xOffset = (pdfWidth - imgWidth) / 2; const yOffset = (pdfHeight - imgHeight) / 2;
          pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
          const timestamp = formatDateFn(new Date(), 'yyyyMMddHHmmss');
          pdf.save(`PurchaseChitti_${(purchaseForPdf.items[0]?.lotNumber || 'Purchase').replace(/[\/\s.]/g, '_')}_${timestamp}.pdf`);
          toast({ title: "PDF Generated", description: `Chitti for ${purchaseForPdf.items[0]?.lotNumber || 'Purchase'} downloaded.` });
        } catch (err) { console.error("Error PDF:", err); toast({ title: "PDF Failed", variant: "destructive" }); }
        finally { setPurchaseForPdf(null); }
      };
      const timer = setTimeout(generatePdf, 300); return () => clearTimeout(timer);
    }
  }, [purchaseForPdf, toast]);

  if (isAppHydrating || !isPurchasesClientHydrated) return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p className="text-lg text-muted-foreground">Loading data...</p></div>;

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
        <h1 className="text-3xl font-bold text-foreground">Purchases & Returns (FY {financialYear})</h1>
      </div>

      <Tabs defaultValue="purchases" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full md:w-auto grid-cols-2 mb-4 no-print bg-transparent p-0 gap-2">
          <TabsTrigger value="purchases" className="py-2.5 text-base text-white bg-blue-600 hover:bg-blue-700 data-[state=active]:bg-blue-800 data-[state=active]:text-white rounded-md transition-all">
            <ListCollapse className="mr-2 h-5 w-5" />Purchases
          </TabsTrigger>
          <TabsTrigger value="purchaseReturns" className="py-2.5 text-base text-white bg-orange-600 hover:bg-orange-700 data-[state=active]:bg-orange-800 data-[state=active]:text-white rounded-md transition-all">
            <RotateCcw className="mr-2 h-5 w-5" />Purchase Returns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases">
          <div className="flex justify-end gap-2 mb-4 no-print">
            <Button onClick={openAddPurchaseForm} size="lg" className={cn("text-base py-3 px-6 shadow-md", addButtonDynamicClass)}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add Purchase
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.print()}><Printer className="h-5 w-5" /><span className="sr-only">Print</span></Button>
          </div>
          <PurchaseTable data={filteredPurchases} onEdit={handleEditPurchase} onDelete={handleDeletePurchaseAttempt} onDownloadPdf={triggerDownloadPurchasePdf} />
        </TabsContent>

        <TabsContent value="purchaseReturns">
          <div className="flex justify-end gap-2 mb-4 no-print">
            <Button onClick={openAddPurchaseReturnForm} size="lg" className={cn("text-base py-3 px-6 shadow-md", addButtonDynamicClass)}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add Purchase Return
            </Button>
             <Button variant="outline" size="icon" onClick={() => window.print()}><Printer className="h-5 w-5" /><span className="sr-only">Print</span></Button>
          </div>
          <PurchaseReturnTable data={filteredPurchaseReturns} onEdit={handleEditPurchaseReturn} onDelete={handleDeletePurchaseReturnAttempt} />
        </TabsContent>
      </Tabs>

      {isAddPurchaseFormOpen && (
        <AddPurchaseForm
          key={purchaseToEdit ? `edit-purchase-${purchaseToEdit.id}` : 'add-new-purchase'}
          isOpen={isAddPurchaseFormOpen}
          onClose={closeAddPurchaseForm}
          onSubmit={handleAddOrUpdatePurchase}
          suppliers={suppliers as Supplier[]}
          agents={agents as Agent[]}
          warehouses={warehouses as Warehouse[]}
          transporters={transporters as Transporter[]}
          onMasterDataUpdate={handleMasterDataUpdate}
          purchaseToEdit={purchaseToEdit}
        />
      )}
      {isAddPurchaseReturnFormOpen && (
        <AddPurchaseReturnForm
          key={purchaseReturnToEdit ? `edit-preturn-${purchaseReturnToEdit.id}` : 'add-new-preturn'}
          isOpen={isAddPurchaseReturnFormOpen}
          onClose={closeAddPurchaseReturnForm}
          onSubmit={handleAddOrUpdatePurchaseReturn}
          purchases={filteredPurchases}
          existingPurchaseReturns={purchaseReturns}
          purchaseReturnToEdit={purchaseReturnToEdit}
        />
      )}

      <div ref={chittiContainerRef} className="fixed left-[-9999px] top-0 z-[-1] p-1 bg-white" aria-hidden="true">
          {purchaseForPdf && <PurchaseChittiPrint purchase={purchaseForPdf} />}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Purchase Record?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the purchase record.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setPurchaseToDeleteId(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeletePurchase} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteReturnConfirm} onOpenChange={setShowDeleteReturnConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Purchase Return Record?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this purchase return record. Inventory adjustments will need manual verification if this is undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setPurchaseReturnToDeleteId(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeletePurchaseReturn} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
