
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, Download, ListCollapse, RotateCcw } from "lucide-react";
import type { Purchase, MasterItem, MasterItemType, Agent, Warehouse, Transporter, PurchaseReturn, LedgerEntry } from "@/lib/types";
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
import { FIXED_WAREHOUSES, FIXED_EXPENSES } from '@/lib/constants';

// TRIAL PACKAGE 1 DATA
const initialPurchasesData: Purchase[] = [
    { id: "pur-tp1-1", date: "2024-07-10", supplierId: "supp-anand", supplierName: "ANAND AGRO PRODUCTS", items: [{ lotNumber: "VAKKAL-A1", quantity: 100, netWeight: 5000, rate: 25, goodsValue: 125000, landedCostPerKg: 25.5 }], expenses: [], locationId: "fixed-wh-chiplun", locationName: "CHIPLUN", totalGoodsValue: 125000, totalQuantity: 100, totalNetWeight: 5000, totalAmount: 127500, effectiveRate: 25.5 },
    { id: "pur-tp1-2", date: "2024-07-12", supplierId: "supp-meena", supplierName: "MEENA FARMS", agentId: "agent-ajay", agentName: "AJAY KUMAR", items: [{ lotNumber: "VAKKAL-B2", quantity: 200, netWeight: 10000, rate: 28, goodsValue: 280000, landedCostPerKg: 28 }], expenses: [], locationId: "fixed-wh-sawantwadi", locationName: "SAWANTWADI", totalGoodsValue: 280000, totalQuantity: 200, totalNetWeight: 10000, totalAmount: 280000, effectiveRate: 28 },
];
const initialPurchaseReturnsData: PurchaseReturn[] = [
    { id: "pret-tp1-1", date: "2024-07-15", originalPurchaseId: "pur-tp1-2", originalLotNumber: "VAKKAL-B2", originalSupplierId: "supp-meena", originalSupplierName: "MEENA FARMS", originalPurchaseRate: 28, quantityReturned: 10, netWeightReturned: 500, returnAmount: 14000, returnReason: "QUALITY ISSUE", notes: "10 bags returned." },
];

const PURCHASES_STORAGE_KEY = 'purchasesData';
const PURCHASE_RETURNS_STORAGE_KEY = 'purchaseReturnsData';
const SALES_STORAGE_KEY = 'salesData';
const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData';
const LEDGER_STORAGE_KEY = 'ledgerData';

export function PurchasesClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();
  const [hydrated, setHydrated] = React.useState(false);

  const [purchases, setPurchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, [], purchaseMigrator);
  const [purchaseReturns, setPurchaseReturns] = useLocalStorageState<PurchaseReturn[]>(PURCHASE_RETURNS_STORAGE_KEY, []);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, []);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, []);
  const [ledgerData, setLedgerData] = useLocalStorageState<LedgerEntry[]>(LEDGER_STORAGE_KEY, []);

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
  const [activeTab, setActiveTab] = React.useState('purchases');

   React.useEffect(() => {
    setHydrated(true);
    if (localStorage.getItem(PURCHASES_STORAGE_KEY) === null) {
      setPurchases(initialPurchasesData);
    }
    if (localStorage.getItem(PURCHASE_RETURNS_STORAGE_KEY) === null) {
      setPurchaseReturns(initialPurchaseReturnsData);
    }
  }, [setPurchases, setPurchaseReturns]);

  const filteredPurchases = React.useMemo(() => {
    if (isAppHydrating || !hydrated) return [];
    return purchases.filter(purchase => purchase && purchase.date && isDateInFinancialYear(purchase.date, financialYear));
  }, [purchases, financialYear, isAppHydrating, hydrated]);

  const filteredPurchaseReturns = React.useMemo(() => {
    if (isAppHydrating || !hydrated) return [];
    return purchaseReturns.filter(pr => pr && pr.date && isDateInFinancialYear(pr.date, financialYear));
  }, [purchaseReturns, financialYear, isAppHydrating, hydrated]);

  const handleAddOrUpdatePurchase = React.useCallback((purchase: Purchase) => {
    const isEditing = purchases.some(p => p.id === purchase.id);
    setPurchases(prevPurchases => {
      return isEditing ? prevPurchases.map(p => p.id === purchase.id ? purchase : p) : [{ ...purchase, id: purchase.id || `purchase-${Date.now()}` }, ...prevPurchases];
    });
    
    if (purchase.expenses && purchase.expenses.length > 0) {
        const newLedgerEntries: LedgerEntry[] = [];
        purchase.expenses.forEach(exp => {
            if (exp.amount > 0) {
                newLedgerEntries.push({
                    id: `ledger-${purchase.id}-${exp.account.replace(/\s/g, '')}`,
                    date: purchase.date,
                    type: 'Expense',
                    account: exp.account,
                    debit: exp.amount,
                    credit: 0,
                    paymentMode: exp.paymentMode,
                    party: exp.partyName || 'Self',
                    partyId: exp.partyId,
                    relatedVoucher: purchase.id,
                    linkedTo: {
                        voucherType: 'Purchase',
                        voucherId: purchase.id,
                    },
                    remarks: `Expense for purchase from ${purchase.supplierName}`
                });
            }
        });

        if (newLedgerEntries.length > 0) {
            setLedgerData(prevLedger => [...prevLedger.filter(l => l.relatedVoucher !== purchase.id), ...newLedgerEntries]);
            toast({ title: "Expenses Logged", description: `${newLedgerEntries.length} expense(s) have been recorded in the ledger.` });
        }
    }

    setPurchaseToEdit(null);
    toast({ title: "Success!", description: isEditing ? "Purchase updated." : "Purchase added." });
  }, [setPurchases, setLedgerData, toast, purchases]);

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
      setLedgerData(prev => prev.filter(l => l.relatedVoucher !== purchaseToDeleteId));
      toast({ title: "Deleted!", description: "Purchase record removed.", variant: "destructive" });
      setPurchaseToDeleteId(null); setShowDeleteConfirm(false);
    }
  }, [purchaseToDeleteId, setPurchases, setLedgerData, toast]);

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

  const handleDeletePurchaseReturnAttempt = React.useCallback((prId: string) => { setPurchaseReturnToDeleteId(prId); setShowDeleteReturnConfirm(true); }, []);
  const confirmDeletePurchaseReturn = React.useCallback(() => {
    if (purchaseReturnToDeleteId) {
      setPurchaseReturns(prev => prev.filter(pr => pr.id !== purchaseReturnToDeleteId));
      toast({ title: "Deleted!", description: "Purchase return record removed.", variant: "destructive" });
      setPurchaseReturnToDeleteId(null); setShowDeleteReturnConfirm(false);
    }
  }, [purchaseReturnToDeleteId, setPurchaseReturns, toast]);

  const openAddPurchaseForm = React.useCallback(() => { setPurchaseToEdit(null); setIsAddPurchaseFormOpen(true); }, []);
  const closeAddPurchaseForm = React.useCallback(() => { setIsAddPurchaseFormOpen(false); setPurchaseToEdit(null); }, []);
  const openAddPurchaseReturnForm = React.useCallback(() => { setPurchaseReturnToEdit(null); setIsAddPurchaseReturnFormOpen(true); }, []);
  const closeAddPurchaseReturnForm = React.useCallback(() => { setIsAddPurchaseReturnFormOpen(false); setPurchaseReturnToEdit(null); }, []);


  const triggerDownloadPurchasePdf = React.useCallback((purchase: Purchase) => setPurchaseForPdf(purchase), []);
  
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

  if (isAppHydrating || !hydrated) return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p className="text-lg text-muted-foreground">Loading data...</p></div>;

  return (
    <div className="space-y-2 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-2" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 no-print">
        <h1 className="text-2xl font-bold text-foreground uppercase">Purchases & Returns (FY {financialYear})</h1>
      </div>

      <Tabs defaultValue="purchases" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-10 mb-2 no-print">
          <TabsTrigger value="purchases" className="py-2.5 text-base rounded-md">
            <ListCollapse className="mr-2 h-5 w-5" />Purchases
          </TabsTrigger>
          <TabsTrigger value="purchaseReturns" className="py-2.5 text-base rounded-md">
            <RotateCcw className="mr-2 h-5 w-5" />Purchase Returns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases">
          <div className="flex justify-end gap-2 mb-2 no-print">
            <Button onClick={openAddPurchaseForm} size="default" className={cn("text-base py-2 px-5 shadow-md", addButtonDynamicClass)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Purchase
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.print()}><Printer className="h-5 w-5" /><span className="sr-only">Print</span></Button>
          </div>
          <PurchaseTable data={filteredPurchases} onEdit={handleEditPurchase} onDelete={handleDeletePurchaseAttempt} onDownloadPdf={triggerDownloadPurchasePdf} />
        </TabsContent>

        <TabsContent value="purchaseReturns">
          <div className="flex justify-end gap-2 mb-2 no-print">
            <Button onClick={openAddPurchaseReturnForm} size="default" className={cn("text-base py-2 px-5 shadow-md", addButtonDynamicClass)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Purchase Return
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
