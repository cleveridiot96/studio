
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, Download, ListCollapse, RotateCcw } from "lucide-react";
import type { Sale, MasterItem, MasterItemType, Customer, Transporter, Broker, Purchase, SaleReturn } from "@/lib/types";
import { SaleTable } from "./SaleTable";
import { AddSaleForm } from "./AddSaleForm";
import { SaleChittiPrint } from "./SaleChittiPrint";
import { AddSaleReturnForm } from "./AddSaleReturnForm";
import { SaleReturnTable } from "./SaleReturnTable";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SALES_STORAGE_KEY = 'salesData';
const SALE_RETURNS_STORAGE_KEY = 'saleReturnsData';
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const BROKERS_STORAGE_KEY = 'masterBrokers';
const PURCHASES_STORAGE_KEY = 'purchasesData'; // Needed for inventory lots in AddSaleForm

export function SalesClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();

  const [isAddSaleFormOpen, setIsAddSaleFormOpen] = React.useState(false);
  const [saleToEdit, setSaleToEdit] = React.useState<Sale | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = React.useState<string | null>(null);
  
  const [isAddSaleReturnFormOpen, setIsAddSaleReturnFormOpen] = React.useState(false);
  const [saleReturnToEdit, setSaleReturnToEdit] = React.useState<SaleReturn | null>(null);
  const [showDeleteReturnConfirm, setShowDeleteReturnConfirm] = React.useState(false);
  const [saleReturnToDeleteId, setSaleReturnToDeleteId] = React.useState<string | null>(null);

  const [isSalesClientHydrated, setIsSalesClientHydrated] = React.useState(false);
  const [saleForPdf, setSaleForPdf] = React.useState<Sale | null>(null);
  const chittiContainerRef = React.useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(10);

  const memoizedEmptyArray = React.useMemo(() => [], []);
  const [sales, setSales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray);
  const [saleReturns, setSaleReturns] = useLocalStorageState<SaleReturn[]>(SALE_RETURNS_STORAGE_KEY, memoizedEmptyArray);
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(CUSTOMERS_STORAGE_KEY, memoizedEmptyArray);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, memoizedEmptyArray);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, memoizedEmptyArray);
  const [inventorySource, setInventorySource] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyArray);

  React.useEffect(() => setIsSalesClientHydrated(true), []);

  const filteredSales = React.useMemo(() => {
    if (isAppHydrating || !isSalesClientHydrated) return [];
    return sales.filter(sale => sale && sale.date && isDateInFinancialYear(sale.date, financialYear));
  }, [sales, financialYear, isAppHydrating, isSalesClientHydrated]);

  const filteredSaleReturns = React.useMemo(() => {
    if (isAppHydrating || !isSalesClientHydrated) return [];
    return saleReturns.filter(sr => sr && sr.date && isDateInFinancialYear(sr.date, financialYear));
  }, [saleReturns, financialYear, isAppHydrating, isSalesClientHydrated]);


  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = React.useMemo(() => filteredSales.slice(startIndex, endIndex), [filteredSales, startIndex, endIndex]);
  const totalPages = React.useMemo(() => Math.ceil(filteredSales.length / itemsPerPage), [filteredSales, itemsPerPage]);

  const goToPage = React.useCallback((page: number) => setCurrentPage(page), []);
  const nextPage = React.useCallback(() => setCurrentPage(prev => Math.min(prev + 1, totalPages)), [totalPages]);
  const prevPage = React.useCallback(() => setCurrentPage(prev => Math.max(prev - 1, 1)), []);

  const handleAddOrUpdateSale = React.useCallback((sale: Sale) => {
    setSales(prevSales => {
      const isEditing = prevSales.some(s => s.id === sale.id);
      return isEditing ? prevSales.map(s => s.id === sale.id ? sale : s) : [{ ...sale, id: sale.id || `sale-${Date.now()}` }, ...prevSales];
    });
    toast({ title: "Success!", description: sales.some(s => s.id === sale.id) ? "Sale updated." : "Sale added." });
    setIsAddSaleFormOpen(false); setSaleToEdit(null);
  }, [setSales, toast, sales]);

  const handleEditSale = React.useCallback((sale: Sale) => { setSaleToEdit(sale); setIsAddSaleFormOpen(true); }, []);
  const handleDeleteSaleAttempt = React.useCallback((saleId: string) => { setSaleToDeleteId(saleId); setShowDeleteConfirm(true); }, []);
  const confirmDeleteSale = React.useCallback(() => {
    if (saleToDeleteId) {
      setSales(prev => prev.filter(s => s.id !== saleToDeleteId));
      toast({ title: "Deleted!", description: "Sale record removed.", variant: "destructive" });
      setSaleToDeleteId(null); setShowDeleteConfirm(false);
    }
  }, [saleToDeleteId, setSales, toast]);

  const handleAddOrUpdateSaleReturn = React.useCallback((srData: SaleReturn) => {
    setSaleReturns(prevReturns => {
      const isEditing = prevReturns.some(sr => sr.id === srData.id);
      // TODO: Update inventory for sale returns
      return isEditing ? prevReturns.map(sr => sr.id === srData.id ? srData : sr) : [{ ...srData, id: srData.id || `sr-${Date.now()}` }, ...prevReturns];
    });
    toast({ title: "Success!", description: saleReturns.some(sr => sr.id === srData.id) ? "Sale return updated." : "Sale return added." });
    setIsAddSaleReturnFormOpen(false); setSaleReturnToEdit(null);
  }, [setSaleReturns, toast, saleReturns]);

  const handleEditSaleReturn = React.useCallback((sr: SaleReturn) => { /* setSaleReturnToEdit(sr); setIsAddSaleReturnFormOpen(true); */ toast({title: "Info", description:"Editing sale returns is planned."})}, [toast]);
  const handleDeleteSaleReturnAttempt = React.useCallback((srId: string) => { setSaleReturnToDeleteId(srId); setShowDeleteReturnConfirm(true); }, []);
  const confirmDeleteSaleReturn = React.useCallback(() => {
    if (saleReturnToDeleteId) {
      setSaleReturns(prev => prev.filter(sr => sr.id !== saleReturnToDeleteId));
      // TODO: Revert inventory changes if a sale return is deleted
      toast({ title: "Deleted!", description: "Sale return record removed.", variant: "destructive" });
      setSaleReturnToDeleteId(null); setShowDeleteReturnConfirm(false);
    }
  }, [saleReturnToDeleteId, setSaleReturns, toast]);

  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    const setters = { Customer: setCustomers, Transporter: setTransporters, Broker: setBrokers };
    const setter = setters[type as keyof typeof setters];
    if (setter) {
      setter(prev => { const newSet = new Map(prev.map(item => [item.id, item])); newSet.set(newItem.id, newItem); return Array.from(newSet.values()).sort((a,b) => a.name.localeCompare(b.name)); });
      toast({ title: `${newItem.type} updated.` });
    } else { toast({title: "Info", description: `Master type ${type} not handled here.`}); }
  }, [setCustomers, setTransporters, setBrokers, toast]);

  const openAddSaleForm = React.useCallback(() => { setSaleToEdit(null); setIsAddSaleFormOpen(true); }, []);
  const closeAddSaleForm = React.useCallback(() => { setIsAddSaleFormOpen(false); setSaleToEdit(null); }, []);
  const openAddSaleReturnForm = React.useCallback(() => { setSaleReturnToEdit(null); setIsAddSaleReturnFormOpen(true); }, []);
  const closeAddSaleReturnForm = React.useCallback(() => { setIsAddSaleReturnFormOpen(false); setSaleReturnToEdit(null); }, []);

  const triggerDownloadSalePdf = React.useCallback((sale: Sale) => setSaleForPdf(sale), []);
  React.useEffect(() => {
    if (saleForPdf && chittiContainerRef.current) {
      const generatePdf = async () => {
        const el = chittiContainerRef.current; if (!el || !el.hasChildNodes()) { toast({ title: "PDF Error", variant: "destructive" }); setSaleForPdf(null); return; }
        try {
          const canvas = await html2canvas(el, { scale: 2, useCORS: true, width: 550, windowWidth: 550 });
          const imgData = canvas.toDataURL('image/png'); const pdf = new jsPDF({ o: 'p', u: 'px', f: [canvas.width, canvas.height] });
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height); pdf.save(`SaleChitti_${saleForPdf.billNumber || saleForPdf.id.slice(-4)}.pdf`);
          toast({ title: "PDF Generated" });
        } catch (err) { console.error(err); toast({ title: "PDF Failed", variant: "destructive" }); }
        finally { setSaleForPdf(null); }
      };
      const timer = setTimeout(generatePdf, 250); return () => clearTimeout(timer);
    }
  }, [saleForPdf, toast]);

  if (isAppHydrating || !isSalesClientHydrated) return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p>Loading sales data...</p></div>;

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      
      <Tabs defaultValue="sales" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
          <h1 className="text-3xl font-bold text-foreground">Sales & Returns (FY {financialYear})</h1>
          <TabsList className="grid w-full md:w-auto grid-cols-2">
            <TabsTrigger value="sales"><ListCollapse className="mr-2 h-4 w-4" />Sales</TabsTrigger>
            <TabsTrigger value="saleReturns"><RotateCcw className="mr-2 h-4 w-4" />Sale Returns</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sales">
          <div className="flex justify-end gap-2 mb-4 no-print">
            <Button onClick={openAddSaleForm} size="lg" className="text-base py-3 px-6 shadow-md">
              <PlusCircle className="mr-2 h-5 w-5" /> Add Sale
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.print()}><Printer className="h-5 w-5" /><span className="sr-only">Print</span></Button>
          </div>
          <SaleTable data={paginatedSales} currentPage={currentPage} itemsPerPage={itemsPerPage} totalPages={totalPages} goToPage={goToPage} nextPage={nextPage} prevPage={prevPage} onEdit={handleEditSale} onDelete={handleDeleteSaleAttempt} onDownloadPdf={triggerDownloadSalePdf} />
        </TabsContent>

        <TabsContent value="saleReturns">
           <div className="flex justify-end gap-2 mb-4 no-print">
            <Button onClick={openAddSaleReturnForm} size="lg" className="text-base py-3 px-6 shadow-md">
              <PlusCircle className="mr-2 h-5 w-5" /> Add Sale Return
            </Button>
             <Button variant="outline" size="icon" onClick={() => window.print()}><Printer className="h-5 w-5" /><span className="sr-only">Print</span></Button>
          </div>
          <SaleReturnTable data={filteredSaleReturns} onEdit={handleEditSaleReturn} onDelete={handleDeleteSaleReturnAttempt} />
        </TabsContent>
      </Tabs>
      
      <div ref={chittiContainerRef} style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -10, backgroundColor: 'white' }}>{saleForPdf && <SaleChittiPrint sale={saleForPdf} />}</div>
      {isAddSaleFormOpen && <AddSaleForm key={saleToEdit ? `edit-${saleToEdit.id}` : 'add-new-sale'} isOpen={isAddSaleFormOpen} onClose={closeAddSaleForm} onSubmit={handleAddOrUpdateSale} customers={customers as Customer[]} transporters={transporters as Transporter[]} brokers={brokers} inventoryLots={inventorySource} existingSales={sales} onMasterDataUpdate={handleMasterDataUpdate} saleToEdit={saleToEdit} />}
      {isAddSaleReturnFormOpen && <AddSaleReturnForm isOpen={isAddSaleReturnFormOpen} onClose={closeAddSaleReturnForm} onSubmit={handleAddOrUpdateSaleReturn} sales={filteredSales} existingSaleReturns={saleReturns} saleReturnToEdit={saleReturnToEdit} />}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Sale Record?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this sale record.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setSaleToDeleteId(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteSale} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showDeleteReturnConfirm} onOpenChange={setShowDeleteReturnConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Sale Return?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this sale return record.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setSaleReturnToDeleteId(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteSaleReturn} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
