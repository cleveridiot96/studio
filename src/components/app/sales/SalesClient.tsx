
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, Download } from "lucide-react"; // Added Download
import type { Sale, MasterItem, MasterItemType, Customer, Transporter, Broker, Purchase } from "@/lib/types";
import { SaleTable } from "./SaleTable";
import { AddSaleForm } from "./AddSaleForm";
import { SaleChittiPrint } from "./SaleChittiPrint"; // For PDF
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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const SALES_STORAGE_KEY = 'salesData';
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const BROKERS_STORAGE_KEY = 'masterBrokers';
const PURCHASES_STORAGE_KEY = 'purchasesData';

export function SalesClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();

  const [isAddSaleFormOpen, setIsAddSaleFormOpen] = React.useState(false);
  const [saleToEdit, setSaleToEdit] = React.useState<Sale | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = React.useState<string | null>(null);
  const [isSalesClientHydrated, setIsSalesClientHydrated] = React.useState(false);

  const [saleForPdf, setSaleForPdf] = React.useState<Sale | null>(null);
  const chittiContainerRef = React.useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10); // You can adjust this value

  const memoizedEmptyArray = React.useMemo(() => [], []);

  const [sales, setSales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray);
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(CUSTOMERS_STORAGE_KEY, memoizedEmptyArray);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, memoizedEmptyArray);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, memoizedEmptyArray);
  const [inventorySource, setInventorySource] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyArray);

  React.useEffect(() => {
    setIsSalesClientHydrated(true);
  }, []);

  const filteredSales = React.useMemo(() => {
    if (isAppHydrating || !isSalesClientHydrated) return [];
    return sales.filter(sale => sale && sale.date && isDateInFinancialYear(sale.date, financialYear));
  }, [sales, financialYear, isAppHydrating, isSalesClientHydrated]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = React.useMemo(() => {
    return filteredSales.slice(startIndex, endIndex);
  }, [filteredSales, startIndex, endIndex]);

  const totalPages = React.useMemo(() => {
    return Math.ceil(filteredSales.length / itemsPerPage);
  }, [filteredSales, itemsPerPage]);

  const goToPage = React.useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const nextPage = React.useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const handleAddOrUpdateSale = React.useCallback((sale: Sale) => {
    const isEditing = sales.some(s => s.id === sale.id);
    setSales(prevSales => { // Use prevSales here for correct state update
      return isEditing
        ? prevSales.map(s => s.id === sale.id ? sale : s)
        : [{ ...sale, id: sale.id || `sale-${Date.now()}` }, ...prevSales];
    });
    toast({
 title: "Success!",
 description: isEditing ? "Sale updated successfully." : "Sale added successfully."
 });
    })
    setIsAddSaleFormOpen(false);
    setSaleToEdit(null);
  }, [setSales, toast]);

  const handleEditSale = React.useCallback((sale: Sale) => {
    setSaleToEdit(sale);
    setIsAddSaleFormOpen(true);
  }, []);

  const handleDeleteSaleAttempt = React.useCallback((saleId: string) => {
    setSaleToDeleteId(saleId);
    setShowDeleteConfirm(true);
  }, []);

  const prevPage = React.useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  const confirmDeleteSale = React.useCallback(() => {
    if (saleToDeleteId) {
      setSales(prev => prev.filter(s => s.id !== saleToDeleteId));
      toast({ title: "Success!", description: "Sale deleted successfully.", variant: "destructive" });
      setSaleToDeleteId(null);
      setShowDeleteConfirm(false);
    }
  }, [saleToDeleteId, setSales, toast]);

  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    const setters: Record<string, React.Dispatch<React.SetStateAction<any[]>>> = {
      Customer: setCustomers,
      Transporter: setTransporters,
      Broker: setBrokers,
    };
    const setter = setters[type];
    if (setter) {
      setter(prev => {
        const newSet = new Map(prev.map(item => [item.id, item]));
        newSet.set(newItem.id, newItem);
        return Array.from(newSet.values()).sort((a, b) => a.name.localeCompare(b.name));
      });
      toast({ title: `${newItem.type} "${newItem.name}" added/updated from Sales.` });
    } else {
      toast({title: "Info", description: `Master type ${type} not handled here for sales.`});
    }
  }, [setCustomers, setTransporters, setBrokers, toast]);

  const openAddSaleForm = React.useCallback(() => {
    setSaleToEdit(null);
    setIsAddSaleFormOpen(true);
  }, []);

  const closeAddSaleForm = React.useCallback(() => {
    setIsAddSaleFormOpen(false);
    setSaleToEdit(null);
  }, []);
  
  const triggerDownloadSalePdf = React.useCallback((sale: Sale) => {
    setSaleForPdf(sale);
  }, []);

  React.useEffect(() => {
    if (saleForPdf && chittiContainerRef.current) {
      const generatePdf = async () => {
        const elementToCapture = chittiContainerRef.current;
        if (!elementToCapture || !elementToCapture.hasChildNodes()) {
          toast({ title: "Error Generating PDF", description: "Chitti content not ready.", variant: "destructive" });
          setSaleForPdf(null); return;
        }
        try {
          const canvas = await html2canvas(elementToCapture, { scale: 2, useCORS: true, width: 550, windowWidth: 550 });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
          pdf.save(`SaleChitti_${saleForPdf.billNumber || saleForPdf.id.slice(-4)}.pdf`);
          toast({ title: "PDF Generated", description: `Chitti for ${saleForPdf.billNumber || saleForPdf.id} downloaded.` });
        } catch (err) {
          console.error("Error generating PDF:", err);
          toast({ title: "PDF Failed", description: "Could not generate Chitti PDF.", variant: "destructive" });
        } finally {
          setSaleForPdf(null);
        }
      };
      const timer = setTimeout(generatePdf, 250);
      return () => clearTimeout(timer);
    }
  }, [saleForPdf, toast]);


  if (isAppHydrating || !isSalesClientHydrated) {
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

      <SaleTable 
        data={paginatedSales}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalPages={totalPages}
        goToPage={goToPage}
        nextPage={nextPage}
        prevPage={prevPage}
        onEdit={handleEditSale} 
        onDelete={handleDeleteSaleAttempt}
        onDownloadPdf={triggerDownloadSalePdf} 
      />
      
      <div ref={chittiContainerRef} style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -10, backgroundColor: 'white' }}>
          {saleForPdf && <SaleChittiPrint sale={saleForPdf} />}
      </div>

      {isAddSaleFormOpen && (
        <AddSaleForm
          key={saleToEdit ? `edit-${saleToEdit.id}` : 'add-new-sale'}
          isOpen={isAddSaleFormOpen}
          onClose={closeAddSaleForm}
          onSubmit={handleAddOrUpdateSale}
          customers={customers as Customer[]}
          transporters={transporters as Transporter[]}
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
