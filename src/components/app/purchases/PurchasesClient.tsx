
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, Download, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { Purchase, MasterItem, MasterItemType, Supplier, Agent, Warehouse, Transporter } from "@/lib/types";
import { PurchaseTable } from "./PurchaseTable";
import { AddPurchaseForm } from "./AddPurchaseForm";
import { PurchaseChittiPrint } from "./PurchaseChittiPrint";
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
import { format as formatDateFn } from 'date-fns'; // Renamed to avoid conflict

// Helper function to calculate derived fields for a purchase
const calculatePurchaseEntry = (p: Omit<Purchase, 'totalAmount' | 'effectiveRate' | 'transportRate'> & { transportRatePerKg?: number, expenses?: number, rate: number, netWeight: number, quantity: number }): Purchase => {
  const transportRatePerKg = p.transportRatePerKg || 0;
  const quantity = p.quantity || 0;
  // Assuming gross weight for transport is based on bags * 50kg/bag
  // If actual gross weight differs, this logic might need adjustment or a new field
  const grossWeightForTransport = quantity * 50; 
  const calculatedTransportRate = transportRatePerKg * grossWeightForTransport;

  const totalAmount = (p.netWeight * p.rate) + (p.expenses || 0) + calculatedTransportRate;
  const effectiveRate = p.netWeight > 0 ? totalAmount / p.netWeight : 0;

  return {
    ...p,
    transportRate: calculatedTransportRate,
    totalAmount,
    effectiveRate,
  };
};

const rawInitialPurchases: (Omit<Purchase, 'id' | 'totalAmount' | 'effectiveRate' | 'transportRate'> & { id?: string, transportRatePerKg?: number, expenses?: number, rate: number, netWeight: number, quantity: number })[] = [
  {
    id: "purchase-fy2526-1", date: "2025-05-16", lotNumber: "BU/5", supplierId: "supp-anand", supplierName: "Anand Agro Products", agentId: "agent-ajay", agentName: "Ajay Kumar",
    quantity: 5, netWeight: 250, rate: 300, expenses: 3250, transportRatePerKg: 17, // 17 * (5*50) = 4250
    transporterId: "trans-sudha", transporterName: "Sudha Transports",
    locationId: "wh-chiplun", locationName: "Chiplun Storage"
  },
  {
    id: "purchase-fy2526-2", date: "2025-06-15", lotNumber: "FY2526-LOT-B/50", supplierId: "supp-meena", supplierName: "Meena Farms",
    quantity: 50, netWeight: 2500, rate: 25, expenses: 200, transportRatePerKg: 0.4,
    locationId: "wh-pune", locationName: "Pune North Godown"
  },
  {
    id: "purchase-fy2425-1", date: "2024-08-01", lotNumber: "FY2425-LOT-X/90", supplierId: "supp-uma", supplierName: "Uma Organics",
    quantity: 90, netWeight: 4500, rate: 28, expenses: 700, transportRatePerKg: 0.5, transporterId: "trans-reliable", transporterName: "Reliable Transports",
    locationId: "wh-mum", locationName: "Mumbai Central Warehouse"
  },
];

const initialPurchasesData: Purchase[] = rawInitialPurchases.map(p => calculatePurchaseEntry({ ...p, id: p.id || `purchase-${Date.now()}-${Math.random()}`}));


const PURCHASES_STORAGE_KEY = 'purchasesData';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';


export function PurchasesClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();

  const memoizedInitialPurchases = React.useMemo(() => initialPurchasesData, []);
  const memoizedEmptyMasters = React.useMemo(() => [], []);

  const [purchases, setPurchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedInitialPurchases);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(SUPPLIERS_STORAGE_KEY, memoizedEmptyMasters);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(AGENTS_STORAGE_KEY, memoizedEmptyMasters);
  const [warehouses, setWarehouses] = useLocalStorageState<MasterItem[]>(WAREHOUSES_STORAGE_KEY, memoizedEmptyMasters);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, memoizedEmptyMasters);

  const [isAddPurchaseFormOpen, setIsAddPurchaseFormOpen] = React.useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = React.useState<Purchase | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [purchaseToDeleteId, setPurchaseToDeleteId] = React.useState<string | null>(null);

  const [purchaseForPdf, setPurchaseForPdf] = React.useState<Purchase | null>(null);
  const chittiContainerRef = React.useRef<HTMLDivElement>(null);
  const [isPurchasesClientHydrated, setIsPurchasesClientHydrated] = React.useState(false);

   React.useEffect(() => {
    setIsPurchasesClientHydrated(true);
  }, []);


  const filteredPurchases = React.useMemo(() => {
    if (isAppHydrating || !isPurchasesClientHydrated) return [];
    return purchases.filter(purchase => purchase && purchase.date && isDateInFinancialYear(purchase.date, financialYear));
  }, [purchases, financialYear, isAppHydrating, isPurchasesClientHydrated]);


  const handleAddOrUpdatePurchase = React.useCallback((purchase: Purchase) => {
    // Recalculate derived fields before saving
    const processedPurchase = calculatePurchaseEntry(purchase as any); // Cast as any if some fields might be missing temporarily from form values
    
    setPurchases(prevPurchases => {
      const isEditing = prevPurchases.some(p => p.id === processedPurchase.id);
      if (isEditing) {
        return prevPurchases.map(p => p.id === processedPurchase.id ? processedPurchase : p);
      } else {
        // Ensure new entries also get an ID if not already assigned
        return [{ ...processedPurchase, id: processedPurchase.id || `purchase-${Date.now()}` }, ...prevPurchases];
      }
    });
    setPurchaseToEdit(null);
    toast({ title: "Success!", description: purchases.some(p=>p.id === processedPurchase.id) ? "Purchase updated successfully." : "Purchase added successfully." });
  }, [setPurchases, toast, purchases]);

  const handleEditPurchase = React.useCallback((purchase: Purchase) => {
    setPurchaseToEdit(purchase);
    setIsAddPurchaseFormOpen(true);
  }, []);

  const handleDeletePurchaseAttempt = React.useCallback((purchaseId: string) => {
    setPurchaseToDeleteId(purchaseId);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeletePurchase = React.useCallback(() => {
    if (purchaseToDeleteId) {
      setPurchases(prev => prev.filter(p => p.id !== purchaseToDeleteId));
      toast({ title: "Success!", description: "Purchase deleted successfully.", variant: "destructive" });
      setPurchaseToDeleteId(null);
      setShowDeleteConfirm(false);
    }
  }, [purchaseToDeleteId, setPurchases, toast]);

  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    const setters: Record<string, React.Dispatch<React.SetStateAction<MasterItem[]>>> = {
        Supplier: setSuppliers,
        Agent: setAgents,
        Warehouse: setWarehouses,
        Transporter: setTransporters,
    };
    const setter = setters[type];
    if (setter) {
        setter(prev => {
            const newSet = new Map(prev.map(item => [item.id, item]));
            newSet.set(newItem.id, newItem);
            return Array.from(newSet.values()).sort((a,b) => a.name.localeCompare(b.name));
        });
    }
  }, [setSuppliers, setAgents, setWarehouses, setTransporters]);

  const openAddPurchaseForm = React.useCallback(() => {
    setPurchaseToEdit(null);
    setIsAddPurchaseFormOpen(true);
  }, []);

  const closeAddPurchaseForm = React.useCallback(() => {
    setIsAddPurchaseFormOpen(false);
    setPurchaseToEdit(null);
  }, []);

  const triggerDownloadPurchasePdf = React.useCallback((purchase: Purchase) => {
    setPurchaseForPdf(purchase);
  }, []);

  React.useEffect(() => {
    if (purchaseForPdf && chittiContainerRef.current) {
      const generatePdf = async () => {
        const elementToCapture = chittiContainerRef.current?.querySelector('.print-chitti-styles') as HTMLElement;

        if (!elementToCapture) {
          toast({ title: "PDF Error", description: "Chitti content not ready for PDF generation.", variant: "destructive" });
          setPurchaseForPdf(null);
          return;
        }

        try {
          const canvas = await html2canvas(elementToCapture, {
            scale: 2, // Good scale for A5
            useCORS: true,
            width: elementToCapture.offsetWidth, // Use the actual width of the rendered chitti
            height: elementToCapture.offsetHeight,
            logging: false,
          });

          const imgData = canvas.toDataURL('image/png');
          // A5 size in mm: 148 x 210
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a5' // Standard A5
          });

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgProps = pdf.getImageProperties(imgData);
          
          const margin = 5; // 5mm margin
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

          pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
          const timestamp = formatDateFn(new Date(), 'yyyyMMddHHmmss'); // Use alias
          pdf.save(`PurchaseChitti_${purchaseForPdf.lotNumber.replace(/[\/\s.]/g, '_')}_${timestamp}.pdf`);
          toast({ title: "PDF Generated", description: `Chitti for ${purchaseForPdf.lotNumber} downloaded.` });
        } catch (err) {
          console.error("Error generating PDF:", err);
          toast({ title: "PDF Generation Failed", description: "Could not generate Chitti PDF.", variant: "destructive" });
        } finally {
          setPurchaseForPdf(null); // Clear after attempt
        }
      };

      // Timeout to allow DOM to update if purchaseForPdf just changed
      const timer = setTimeout(generatePdf, 300); 
      return () => clearTimeout(timer);
    }
  }, [purchaseForPdf, toast]);


  if (isAppHydrating || !isPurchasesClientHydrated) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p className="text-lg text-muted-foreground">Loading purchases data...</p></div>;
  }

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-foreground">Purchases (FY {financialYear})</h1>
        <div className="flex gap-2">
          <Button onClick={openAddPurchaseForm} size="lg" className="text-base py-3 px-6 shadow-md">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Purchase
          </Button>
          <Button variant="outline" size="icon" onClick={() => window.print()}>
            <Printer className="h-5 w-5" />
            <span className="sr-only">Print</span>
          </Button>
        </div>
      </div>

      <PurchaseTable
        data={filteredPurchases}
        onEdit={handleEditPurchase}
        onDelete={handleDeletePurchaseAttempt}
        onDownloadPdf={triggerDownloadPurchasePdf}
      />

      {isAddPurchaseFormOpen && (
        <AddPurchaseForm
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

      {/* Hidden div for rendering chitti for PDF generation */}
      <div ref={chittiContainerRef} className="fixed left-[-9999px] top-0 z-[-1] p-1 bg-white" aria-hidden="true">
          {purchaseForPdf && <PurchaseChittiPrint purchase={purchaseForPdf} />}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the purchase
              record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPurchaseToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePurchase} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

