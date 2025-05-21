
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import type { Sale, MasterItem, MasterItemType, Customer, Transporter, Broker, Purchase } from "@/lib/types";
import { SaleTable } from "./SaleTable";
import { AddSaleForm } from "./AddSaleForm";
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
} from "@/components/ui/alert-dialog";
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear } from "@/lib/utils";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';

const initialSalesData: Sale[] = [
  {
    id: "sale-fy2526-1", date: "2025-05-10", billNumber: "INV-FY2526-001", customerId: "cust-ramesh", customerName: "Ramesh Retail", lotNumber: "FY2526-LOT-A/100",
    quantity: 20, netWeight: 1000, rate: 28, 
    billAmount: 1000 * 28, // Example bill amount
    totalAmount: 1000 * 28, // Assuming billAmount is the totalAmount for customer if not overridden
    calculatedProfit: (1000 * 28) - (1000 * 22), 
    transporterId: "trans-speedy", transporterName: "Speedy Logistics", transportCost: 200,
    brokerId: "broker-vinod", brokerName: "Vinod Mehta", brokerageType: "Percentage", brokerageValue: 1, calculatedBrokerageCommission: (1000*28)*0.01,
    notes: "Urgent delivery to Ramesh Retail for FY2526"
  },
  {
    id: "sale-fy2526-2", date: "2025-06-20", billNumber: "INV-FY2526-002", customerId: "cust-sita", customerName: "Sita General Store", lotNumber: "FY2526-LOT-B/50",
    quantity: 30, netWeight: 1500, rate: 30, 
    billAmount: 1500 * 30,
    totalAmount: 1500 * 30, 
    calculatedProfit: (1500 * 30) - (1500 * 25), 
    notes: "Standard delivery for FY2526"
  },
  {
    id: "sale-fy2425-1", date: "2024-09-15", billNumber: "INV-FY2425-001", customerId: "cust-mohan", customerName: "Mohan Wholesalers", lotNumber: "FY2425-LOT-X/90",
    quantity: 50, netWeight: 2500, rate: 32, 
    billAmount: 2500 * 32,
    totalAmount: 2500 * 32, 
    calculatedProfit: (2500 * 32) - (2500 * 28),
    brokerId: "broker-leela", brokerName: "Leela Associates", brokerageType: "Fixed", brokerageValue: 300, calculatedBrokerageCommission: 300,
  },
];

const SALES_STORAGE_KEY = 'salesData';
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const BROKERS_STORAGE_KEY = 'masterBrokers';
const PURCHASES_STORAGE_KEY = 'purchasesData';

export function SalesClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();
  const [hydrated, setHydrated] = React.useState(false); // Local hydration for component specific data

  const [sales, setSales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, initialSalesData);
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(CUSTOMERS_STORAGE_KEY, []);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, []);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, []);
  const [inventorySource, setInventorySource] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, []);

  const [isAddSaleFormOpen, setIsAddSaleFormOpen] = React.useState(false);
  const [saleToEdit, setSaleToEdit] = React.useState<Sale | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const filteredSales = React.useMemo(() => {
    if (isAppHydrating || !hydrated) return [];
    return sales.filter(sale => isDateInFinancialYear(sale.date, financialYear));
  }, [sales, financialYear, isAppHydrating, hydrated]);

  const handleAddOrUpdateSale = React.useCallback((sale: Sale) => {
    const isEditing = sales.some(s => s.id === sale.id);
    setSales(prevSales => {
      if (isEditing) {
        return prevSales.map(s => s.id === sale.id ? sale : s);
      } else {
        return [sale, ...prevSales];
      }
    });
    setSaleToEdit(null);
    toast({ title: "Success!", description: isEditing ? "Sale updated successfully." : "Sale added successfully." });
  }, [setSales, toast, sales]);

  const handleEditSale = React.useCallback((sale: Sale) => {
    setSaleToEdit(sale);
    setIsAddSaleFormOpen(true);
  }, []);

  const handleDeleteSaleAttempt = React.useCallback((saleId: string) => {
    setSaleToDeleteId(saleId);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteSale = React.useCallback(() => {
    if (saleToDeleteId) {
      setSales(prev => prev.filter(s => s.id !== saleToDeleteId));
      toast({ title: "Success!", description: "Sale deleted successfully." });
      setSaleToDeleteId(null);
      setShowDeleteConfirm(false);
    }
  }, [saleToDeleteId, setSales, toast]);

  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    switch (type) {
        case "Customer":
            setCustomers(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
            break;
        case "Transporter":
            setTransporters(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
            break;
        case "Broker":
            setBrokers(prev => [newItem as Broker, ...prev.filter(i => i.id !== newItem.id)]);
            break;
        default:
            toast({title: "Info", description: `Master type ${type} not handled here.`})
            break;
    }
    toast({ title: `${newItem.type} "${newItem.name}" added/updated from Sales.` });
  }, [setCustomers, setTransporters, setBrokers, toast]);

  const openAddSaleForm = React.useCallback(() => {
    setSaleToEdit(null);
    setIsAddSaleFormOpen(true);
  }, []);

  const closeAddSaleForm = React.useCallback(() => {
    setIsAddSaleFormOpen(false);
    setSaleToEdit(null);
  }, []);

  if (isAppHydrating || !hydrated) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <p className="text-lg text-muted-foreground">Loading sales data...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-foreground">Sales (FY {financialYear})</h1>
        <div className="flex gap-2">
          <Button onClick={openAddSaleForm} size="lg" className="text-base py-3 px-6 shadow-md">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Sale
          </Button>
          <Button variant="outline" size="icon" onClick={() => window.print()}>
            <Printer className="h-5 w-5" />
            <span className="sr-only">Print</span>
          </Button>
        </div>
      </div>

      <SaleTable data={filteredSales} onEdit={handleEditSale} onDelete={handleDeleteSaleAttempt} />

      {isAddSaleFormOpen && (
        <AddSaleForm
          isOpen={isAddSaleFormOpen}
          onClose={closeAddSaleForm}
          onSubmit={handleAddOrUpdateSale}
          customers={customers}
          transporters={transporters}
          brokers={brokers}
          inventoryLots={inventorySource} 
          existingSales={sales}
          onMasterDataUpdate={handleMasterDataUpdate}
          saleToEdit={saleToEdit}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the sale record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaleToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSale} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
