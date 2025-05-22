
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import type { Purchase, MasterItem, MasterItemType, Supplier, Agent, Warehouse, Transporter } from "@/lib/types";
import { PurchaseTable } from "./PurchaseTable";
import { AddPurchaseForm } from "./AddPurchaseForm";
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

// Helper function to calculate initial data with effective rates
const calculateInitialPurchaseData = (data: Omit<Purchase, 'totalAmount' | 'effectiveRate' | 'transportRate'> & { transportRatePerKg?: number, expenses?: number, rate: number, netWeight: number, quantity: number }[]): Purchase[] => {
  return data.map(p => {
    const transportRatePerKg = p.transportRatePerKg || 0;
    const quantity = p.quantity || 0;
    const assumedGrossWeightForTransport = quantity * 50; // Assuming 50kg per bag for transport cost calculation
    const transportRate = transportRatePerKg * assumedGrossWeightForTransport;
    
    const totalAmount = (p.netWeight * p.rate) + (p.expenses || 0) + transportRate;
    const effectiveRate = p.netWeight > 0 ? totalAmount / p.netWeight : 0;

    return {
      ...p,
      transportRate,
      totalAmount,
      effectiveRate,
    };
  });
};

const rawInitialPurchases = [
  {
    id: "purchase-fy2526-1", date: "2025-05-01", lotNumber: "FY2526-LOT-A/100", supplierId: "supp-anand", supplierName: "Anand Agro Products", agentId: "agent-ajay", agentName: "Ajay Kumar",
    quantity: 100, netWeight: 5000, rate: 22, expenses: 500, transportRatePerKg: 0.5, transporterId: "trans-speedy", transporterName: "Speedy Logistics",
    locationId: "wh-mum", locationName: "Mumbai Central Warehouse"
  },
  {
    id: "purchase-fy2526-2", date: "2025-06-15", lotNumber: "FY2526-LOT-B/50", supplierId: "supp-meena", supplierName: "Meena Farms",
    quantity: 50, netWeight: 2500, rate: 25, expenses: 200, transportRatePerKg: 0, // No transport
    locationId: "wh-pune", locationName: "Pune North Godown"
  },
  {
    id: "purchase-fy2526-3", date: "2025-07-10", lotNumber: "FY2526-LOT-C/75", supplierId: "supp-vikas", supplierName: "Vikas Seeds & Grains", agentId: "agent-sunila", agentName: "Sunil Varma",
    quantity: 75, netWeight: 3750, rate: 20, expenses: 0, transportRatePerKg: 0, // No transport
    locationId: "wh-ngp", locationName: "Nagpur South Storage"
  },
  {
    id: "purchase-fy2425-1", date: "2024-08-01", lotNumber: "FY2425-LOT-X/90", supplierId: "supp-uma", supplierName: "Uma Organics",
    quantity: 90, netWeight: 4500, rate: 28, expenses: 700, transportRatePerKg: 0.4, transporterId: "trans-reliable", transporterName: "Reliable Transports",
    locationId: "wh-mum", locationName: "Mumbai Central Warehouse"
  },
  {
    id: "purchase-fy2526-4", date: "2025-09-05", lotNumber: "FY2526-LOT-D/120", supplierId: "supp-sunilp", supplierName: "Sunil Trading Co.", agentId: "agent-ajay", agentName: "Ajay Kumar",
    quantity: 120, netWeight: 6000, rate: 23.5, expenses: 0, transportRatePerKg: 0.1, // Small transport cost
    transporterId: "trans-reliable", transporterName: "Reliable Transports",
    locationId: "wh-pune", locationName: "Pune North Godown"
  },
   // Example from original data for AR Agent Supplier
  {
    id: "purchase-1", // Original ID
    date: "2025-05-01", // Assuming FY 2025-2026 for visibility
    lotNumber: "AB/6", 
    locationId: "w1", // Needs to match a warehouse from masters
    locationName: "Mumbai Godown",
    supplierId: "s1", // Needs to match a supplier from masters
    supplierName: "AR Agent Supplier",
    agentId: "a1", // Needs to match an agent from masters
    agentName: "AR Agent",
    quantity: 6, 
    netWeight: 300, 
    rate: 320, 
    expenses: 1000,
    transportRatePerKg: (2000 / (6*50)), // Original total transport was 2000 for 6 bags
    transporterId: "t1", // Needs to match a transporter
    transporterName: "Speedy Logistics",
  },
];

const initialPurchasesData: Purchase[] = calculateInitialPurchaseData(rawInitialPurchases);


const PURCHASES_STORAGE_KEY = 'purchasesData';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';

export function PurchasesClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();

  const [purchases, setPurchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, initialPurchasesData);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(SUPPLIERS_STORAGE_KEY, []);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(AGENTS_STORAGE_KEY, []);
  const [warehouses, setWarehouses] = useLocalStorageState<MasterItem[]>(WAREHOUSES_STORAGE_KEY, []);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, []);
  
  const [isAddPurchaseFormOpen, setIsAddPurchaseFormOpen] = React.useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = React.useState<Purchase | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [purchaseToDeleteId, setPurchaseToDeleteId] = React.useState<string | null>(null);

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
        // Ensure a unique ID for new purchases if one isn't already provided
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

      <PurchaseTable data={filteredPurchases} onEdit={handleEditPurchase} onDelete={handleDeletePurchaseAttempt} />

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

    