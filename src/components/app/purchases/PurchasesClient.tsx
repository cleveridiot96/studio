
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
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

const calculatePurchaseEntry = (p: Omit<Purchase, 'totalAmount' | 'effectiveRate' | 'transportRate'> & { transportRatePerKg?: number, expenses?: number, rate: number, netWeight: number, quantity: number }): Purchase => {
  const transportRatePerKg = p.transportRatePerKg || 0;
  const quantity = p.quantity || 0;
  // Assume 50kg per bag for transport calculation if not otherwise specified more accurately.
  // This gross weight might differ from p.netWeight if netWeight is more precise.
  // For transport cost, often a per-bag or per-trip rate is used, or a rate on an assumed gross weight.
  // Here, we use (quantity * 50kg) as the basis for transport cost per kg.
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

// Initial data with effectiveRate calculated
const rawInitialPurchases: (Omit<Purchase, 'totalAmount' | 'effectiveRate' | 'transportRate'> & { transportRatePerKg?: number, expenses?: number, rate: number, netWeight: number, quantity: number })[] = [
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


// Keys for localStorage
const PURCHASES_STORAGE_KEY = 'purchasesData';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses'; // Also used for Locations
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';


export function PurchasesClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();
  
  const memoizedInitialPurchases = React.useMemo(() => initialPurchasesData, []);
  const memoizedEmptyMasters = React.useMemo(() => [], []);

  const [purchases, setPurchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedInitialPurchases);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(SUPPLIERS_STORAGE_KEY, memoizedEmptyMasters);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(AGENTS_STORAGE_KEY, memoizedEmptyMasters);
  const [warehouses, setWarehouses] = useLocalStorageState<MasterItem[]>(WAREHOUSES_STORAGE_KEY, memoizedEmptyMasters); // Locations
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, memoizedEmptyMasters);


  const [isAddPurchaseFormOpen, setIsAddPurchaseFormOpen] = React.useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = React.useState<Purchase | null>(null);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [purchaseToDeleteId, setPurchaseToDeleteId] = React.useState<string | null>(null);

  const [purchaseForPdf, setPurchaseForPdf] = React.useState<Purchase | null>(null);
  const chittiContainerRef = React.useRef<HTMLDivElement>(null);


  const filteredPurchases = React.useMemo(() => {
    if (isAppHydrating) return []; 
    return purchases.filter(purchase => purchase && purchase.date && isDateInFinancialYear(purchase.date, financialYear));
  }, [purchases, financialYear, isAppHydrating]);


  const handleAddOrUpdatePurchase = React.useCallback((purchase: Purchase) => {
    const isEditing = purchases.some(p => p.id === purchase.id);
    const processedPurchase = calculatePurchaseEntry(purchase as any); 
    let successMessage = "";
    let successDescription = "";

    setPurchases(prevPurchases => {
      if (isEditing) {
        successMessage = "Success!";
        successDescription = "Purchase updated successfully.";
        return prevPurchases.map(p => p.id === processedPurchase.id ? processedPurchase : p);
      } else {
        successMessage = "Success!";
        successDescription = "Purchase added successfully.";
        return [processedPurchase, ...prevPurchases];
      }
    });
    setPurchaseToEdit(null);
    if (successMessage) {
      toast({ title: successMessage, description: successDescription });
    }
  }, [setPurchases, purchases, toast]);

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
    let updated = false;
    switch (type) {
      case "Supplier":
        setSuppliers(prev => {
            updated = true;
            return [newItem, ...prev.filter(i => i.id !== newItem.id)];
        });
        break;
      case "Agent":
        setAgents(prev => {
            updated = true;
            return [newItem, ...prev.filter(i => i.id !== newItem.id)];
        });
        break;
      case "Warehouse": // Location
        setWarehouses(prev => {
            updated = true;
            return [newItem, ...prev.filter(i => i.id !== newItem.id)];
        });
        break;
      case "Transporter":
        setTransporters(prev => {
            updated = true;
            return [newItem, ...prev.filter(i => i.id !== newItem.id)];
        });
        break;
      default:
        break;
    }
    if(updated) {
        toast({ title: `${newItem.type} "${newItem.name}" added/updated.` });
    }
  }, [setSuppliers, setAgents, setWarehouses, setTransporters, toast]);
  
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
        const elementToCapture = chittiContainerRef.current?.firstChild as HTMLElement | null;
  
        if (!elementToCapture) {
          toast({ title: "Error Generating PDF", description: "Chitti content not ready or found. Please try again.", variant: "destructive", duration: 5000 });
          console.error("PDF Generation: Chitti content element not found:", chittiContainerRef.current);
          setPurchaseForPdf(null);
          return;
        }
  
        try {
          const canvas = await html2canvas(elementToCapture, { 
            scale: 2,
            useCORS: true, 
            logging: false, 
            width: elementToCapture.offsetWidth || 550, 
            height: elementToCapture.offsetHeight || 780, 
            windowWidth: elementToCapture.scrollWidth,
            windowHeight: elementToCapture.scrollHeight,
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            // A5-ish in pixels at 96DPI: 559px x 794px. html2canvas scale affects this.
            // We want the canvas dimensions as the PDF page size
            format: [canvas.width, canvas.height] 
          });

          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
          const timestamp = new Date().getTime(); 
          pdf.save(`Purchase-Chitti-${purchaseForPdf.lotNumber.replace(/[\/\s.]/g, '_')}-${timestamp}.pdf`);
          toast({ title: "PDF Generated", description: `Chitti for ${purchaseForPdf.lotNumber} downloaded.` });
        } catch (err) {
          console.error("Error generating PDF:", err);
          toast({ title: "PDF Generation Failed", description: "Could not generate Chitti PDF. Check console for errors.", variant: "destructive" });
        } finally {
          setPurchaseForPdf(null); 
        }
      };
  
      const timer = setTimeout(generatePdf, 300); // Ensure DOM has updated
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
      
      <div ref={chittiContainerRef} style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -10, backgroundColor: 'white', padding: '1px' }}>
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
