
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import type { Purchase, MasterItem, MasterItemType, Supplier, Agent, Warehouse, Transporter } from "@/lib/types";
import { PurchaseTable } from "./PurchaseTable";
import { AddPurchaseForm } from "./AddPurchaseForm";
import { PurchaseChittiPrint } from "./PurchaseChittiPrint"; // Import the Chitti component
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

const calculatePurchaseEntry = (p: Omit<Purchase, 'totalAmount' | 'effectiveRate'> & { transportRatePerKg?: number, expenses?: number, rate: number, netWeight: number, quantity: number }): Purchase => {
  const transportRatePerKg = p.transportRatePerKg || 0;
  const quantity = p.quantity || 0;
  const assumedGrossWeightForTransport = quantity * 50; 
  const calculatedTransportRate = transportRatePerKg * assumedGrossWeightForTransport;
  
  const totalAmount = (p.netWeight * p.rate) + (p.expenses || 0) + calculatedTransportRate;
  const effectiveRate = p.netWeight > 0 ? totalAmount / p.netWeight : 0;

  return {
    ...p,
    transportRate: calculatedTransportRate, // Store the calculated total transport cost
    totalAmount,
    effectiveRate,
  };
};

const rawInitialPurchases: (Omit<Purchase, 'totalAmount' | 'effectiveRate'> & { transportRatePerKg?: number, expenses?: number, rate: number, netWeight: number, quantity: number })[] = [
  {
    id: "purchase-fy2526-1", date: "2025-05-01", lotNumber: "FY2526-LOT-A/100", supplierId: "supp-anand", supplierName: "Anand Agro Products", agentId: "agent-ajay", agentName: "Ajay Kumar",
    quantity: 100, netWeight: 5000, rate: 22, expenses: 500, transportRatePerKg: 0.5, transporterId: "trans-speedy", transporterName: "Speedy Logistics",
    locationId: "wh-mum", locationName: "Mumbai Central Warehouse"
  },
  {
    id: "purchase-fy2526-2", date: "2025-06-15", lotNumber: "FY2526-LOT-B/50", supplierId: "supp-meena", supplierName: "Meena Farms",
    quantity: 50, netWeight: 2500, rate: 25, expenses: 200, 
    locationId: "wh-pune", locationName: "Pune North Godown"
  },
  {
    id: "purchase-fy2425-1", date: "2024-08-01", lotNumber: "FY2425-LOT-X/90", supplierId: "supp-uma", supplierName: "Uma Organics",
    quantity: 90, netWeight: 4500, rate: 28, expenses: 700, transportRatePerKg: 0.4, transporterId: "trans-reliable", transporterName: "Reliable Transports",
    locationId: "wh-mum", locationName: "Mumbai Central Warehouse"
  },
];
const initialPurchasesData: Purchase[] = rawInitialPurchases.map(calculatePurchaseEntry);

const PURCHASES_STORAGE_KEY = 'purchasesData';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';

export function PurchasesClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();
  const chittiContainerRef = React.useRef<HTMLDivElement>(null);


  const [purchases, setPurchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, initialPurchasesData);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(SUPPLIERS_STORAGE_KEY, []);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(AGENTS_STORAGE_KEY, []);
  const [warehouses, setWarehouses] = useLocalStorageState<MasterItem[]>(WAREHOUSES_STORAGE_KEY, []);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, []);
  
  const [isAddPurchaseFormOpen, setIsAddPurchaseFormOpen] = React.useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = React.useState<Purchase | null>(null);
  const [purchaseForPdf, setPurchaseForPdf] = React.useState<Purchase | null>(null);


  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [purchaseToDeleteId, setPurchaseToDeleteId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (purchases.some(p => p.effectiveRate === undefined || p.totalAmount === undefined || p.transportRate === undefined)) {
      setPurchases(prevPurchases => prevPurchases.map(p => {
        if (p.effectiveRate === undefined || p.totalAmount === undefined || p.transportRate === undefined) {
          const rawP = { ...p, transportRatePerKg: p.transportRatePerKg }; 
          return calculatePurchaseEntry(rawP as any);
        }
        return p;
      }));
    }
  }, [purchases, setPurchases]);


  const filteredPurchases = React.useMemo(() => {
    if (isAppHydrating) return []; 
    return purchases.filter(purchase => isDateInFinancialYear(purchase.date, financialYear));
  }, [purchases, financialYear, isAppHydrating]);

  const handleAddOrUpdatePurchase = React.useCallback((purchase: Purchase) => {
    const isEditing = purchases.some(p => p.id === purchase.id);
    setPurchases(prevPurchases => {
      if (isEditing) {
        return prevPurchases.map(p => p.id === purchase.id ? purchase : p);
      } else {
        const newPurchase = { ...purchase, id: purchase.id || `purchase-${Date.now()}` };
        return [newPurchase, ...prevPurchases];
      }
    });
    setPurchaseToEdit(null);
    toast({ title: "Success!", description: isEditing ? "Purchase updated successfully." : "Purchase added successfully." });
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
      toast({ title: "Success!", description: "Purchase deleted successfully." });
      setPurchaseToDeleteId(null);
      setShowDeleteConfirm(false);
    }
  }, [purchaseToDeleteId, setPurchases, toast]);

  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    switch (type) {
      case "Supplier":
        setSuppliers(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
        break;
      case "Agent":
        setAgents(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
        break;
      case "Warehouse":
        setWarehouses(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
        break;
      case "Transporter":
        setTransporters(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
        break;
      default:
        break;
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
        const elementToCapture = chittiContainerRef.current;
        if (!elementToCapture) {
          toast({ title: "Error", description: "Could not find Chitti content for PDF.", variant: "destructive" });
          setPurchaseForPdf(null);
          return;
        }
        
        // Temporarily make it visible for capture if it's truly off-screen
        // This is tricky; html2canvas might handle some off-screen elements.
        // Ensure styles allow for capture.
        
        html2canvas(elementToCapture, { 
          scale: 2, // Improves quality
          useCORS: true, 
          logging: false,
          width: elementToCapture.offsetWidth, 
          height: elementToCapture.offsetHeight,
          windowWidth: elementToCapture.scrollWidth,
          windowHeight: elementToCapture.scrollHeight,
        }).then(canvas => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px', // Use pixels for easier mapping from canvas
            format: [canvas.width, canvas.height] // Set PDF page size to image size
          });
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
          pdf.save(`Purchase-Chitti-${purchaseForPdf.lotNumber.replace(/[\/\s.]/g, '_')}.pdf`);
          toast({ title: "PDF Generated", description: `Chitti for ${purchaseForPdf.lotNumber} downloaded.` });
        }).catch(err => {
          console.error("Error generating PDF:", err);
          toast({ title: "PDF Generation Failed", description: "Could not generate Chitti PDF.", variant: "destructive" });
        }).finally(() => {
          setPurchaseForPdf(null); // Reset after attempting PDF generation
        });
      };

      // Timeout to allow DOM to update with the PurchaseChittiPrint component
      const timer = setTimeout(generatePdf, 100); 
      return () => clearTimeout(timer);
    }
  }, [purchaseForPdf, toast]);


  if (isAppHydrating) {
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

      {/* Hidden container for rendering Chitti for PDF generation */}
      {purchaseForPdf && (
        <div ref={chittiContainerRef} style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -10, backgroundColor: 'white' }}>
          <PurchaseChittiPrint purchase={purchaseForPdf} />
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the purchase record.
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
