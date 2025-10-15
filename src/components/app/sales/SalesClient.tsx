"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, Download, ListCollapse, RotateCcw } from "lucide-react";
import type { Sale, MasterItem, MasterItemType, Broker, Purchase, SaleReturn, PurchaseReturn, LocationTransfer, Receipt, CostBreakdown, SaleItem, PurchaseItem, LocationTransferItem, LedgerEntry } from "@/lib/types";
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
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format as formatDateFn, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useMasterData } from "@/contexts/MasterDataContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useInventory } from "@/hooks/useInventory";

export function SalesClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();
  const [hydrated, setHydrated] = React.useState(false);
  const { setMasterData } = useMasterData();
  const {
    sales,
    setSales,
    saleReturns,
    setSaleReturns,
    receipts,
    addLedgerEntry,
    removeLedgerEntries
  } = useTransactions();


  const [isAddSaleFormOpen, setIsAddSaleFormOpen] = React.useState(false);
  const [saleToEdit, setSaleToEdit] = React.useState<Sale | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = React.useState<string | null>(null);
  
  const [isAddSaleReturnFormOpen, setIsAddSaleReturnFormOpen] = React.useState(false);
  const [saleReturnToEdit, setSaleReturnToEdit] = React.useState<SaleReturn | null>(null);
  const [showDeleteReturnConfirm, setShowDeleteReturnConfirm] = React.useState(false);
  const [saleReturnToDeleteId, setSaleReturnToDeleteId] = React.useState<string | null>(null);

  const [saleForPdf, setSaleForPdf] = React.useState<Sale | null>(null);
  const chittiContainerRef = React.useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = React.useState('sales');
  
  const { availableStock, isLoading: isInventoryLoading } = useInventory(saleToEdit?.id);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const filteredSales = React.useMemo(() => {
    if (isAppHydrating || !hydrated) return [];
    const fySales = sales.filter(sale => sale && sale.date && isDateInFinancialYear(sale.date, financialYear));

    const enrichedSales = fySales.map(sale => {
      if (!sale || !sale.items) return null;

      let totalPaid = 0;
      receipts.forEach(receipt => {
        if(receipt.againstBills) {
          receipt.againstBills.forEach(bill => {
            if (bill.billId === sale.id) {
              totalPaid += bill.amount;
            }
          });
        }
      });
      const balanceAmount = sale.billedAmount - totalPaid;

      return {
        ...sale,
        paidAmount: totalPaid,
        balanceAmount: balanceAmount,
      };

    }).filter(Boolean) as Sale[];

    return enrichedSales.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [sales, receipts, financialYear, isAppHydrating, hydrated]);


  const handleAddOrUpdateSale = React.useCallback((sale: Sale) => {
    const isEditing = sales.some(s => s.id === sale.id);
    setSales(prevSales => {
      return isEditing
        ? prevSales.map(s => (s.id === sale.id ? sale : s))
        : [{ ...sale, id: sale.id || `sale-${Date.now()}` }, ...prevSales];
    });

    removeLedgerEntries(sale.id); // Clear old entries
    if (sale.expenses && sale.expenses.length > 0) {
      const newLedgerEntries: LedgerEntry[] = [];
      sale.expenses.forEach(exp => {
        if (exp.amount > 0) {
          newLedgerEntries.push({
            id: `ledger-${sale.id}-${exp.account.replace(/\s/g, '')}`,
            date: sale.date,
            type: 'Expense',
            account: exp.account,
            debit: exp.amount,
            credit: 0,
            paymentMode: exp.paymentMode,
            party: exp.partyName || 'Self',
            partyId: exp.partyId,
            relatedVoucher: sale.id,
            linkedTo: { voucherType: 'Sale', voucherId: sale.id },
            remarks: `Expense for sale to ${sale.customerName}`
          });
        }
      });
       if (newLedgerEntries.length > 0) {
            addLedgerEntry(newLedgerEntries);
            toast({ title: "Sale Expenses Logged", description: `${newLedgerEntries.length} expense(s) have been recorded in the ledger.` });
        }
    }

    toast({
      title: "Success!",
      description: isEditing ? "Sale updated." : "Sale added."
    });
    setIsAddSaleFormOpen(false);
    setSaleToEdit(null);
    window.dispatchEvent(new CustomEvent('reindex-search'));
  }, [sales, setSales, addLedgerEntry, removeLedgerEntries, toast]);

  const handleEditSale = React.useCallback((sale: Sale) => { setSaleToEdit(sale); setIsAddSaleFormOpen(true); }, []);
  const handleDeleteSaleAttempt = React.useCallback((saleId: string) => { setSaleToDeleteId(saleId); setShowDeleteConfirm(true); }, []);
  const confirmDeleteSale = React.useCallback(() => {
    if (saleToDeleteId) {
      setSales(prev => prev.filter(s => s.id !== saleToDeleteId));
      removeLedgerEntries(saleToDeleteId);
      toast({ title: "Deleted!", description: "Sale record removed.", variant: "destructive" });
      setSaleToDeleteId(null); setShowDeleteConfirm(false);
      window.dispatchEvent(new CustomEvent('reindex-search'));
    }
  }, [saleToDeleteId, setSales, removeLedgerEntries, toast]);

  const handleAddOrUpdateSaleReturn = React.useCallback((srData: SaleReturn) => {
    setSaleReturns(prevReturns => {
      const isEditing = prevReturns.some(sr => sr.id === srData.id);
      return isEditing ? prevReturns.map(sr => sr.id === srData.id ? srData : sr) : [{ ...srData, id: srData.id || `sr-${Date.now()}` }, ...prevReturns];
    });
    toast({ title: "Success!", description: saleReturns.some(sr => sr.id === srData.id) ? "Sale return updated." : "Sale return added." });
    setIsAddSaleReturnFormOpen(false); setSaleReturnToEdit(null);
    window.dispatchEvent(new CustomEvent('reindex-search'));
  }, [setSaleReturns, toast, saleReturns]);

  const handleEditSaleReturn = React.useCallback((sr: SaleReturn) => { toast({title: "Info", description:"Editing sale returns is planned."})}, [toast]);
  const handleDeleteSaleReturnAttempt = React.useCallback((srId: string) => { setSaleReturnToDeleteId(srId); setShowDeleteReturnConfirm(true); }, []);
  const confirmDeleteSaleReturn = React.useCallback(() => {
    if (saleReturnToDeleteId) {
      setSaleReturns(prev => prev.filter(sr => sr.id !== saleReturnToDeleteId));
      toast({ title: "Deleted!", description: "Sale return record removed.", variant: "destructive" });
      setSaleReturnToDeleteId(null); setShowDeleteReturnConfirm(false);
      window.dispatchEvent(new CustomEvent('reindex-search'));
    }
  }, [saleReturnToDeleteId, setSaleReturns, toast]);

  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    setMasterData(type, (prev: any[]) => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
    toast({ title: `${newItem.type} updated.` });
  }, [setMasterData, toast]);

  const openAddSaleForm = React.useCallback(() => { setSaleToEdit(null); setIsAddSaleFormOpen(true); }, []);
  const closeAddSaleForm = React.useCallback(() => { setIsAddSaleFormOpen(false); setSaleToEdit(null); }, []);
  const openAddSaleReturnForm = React.useCallback(() => { setSaleReturnToEdit(null); setIsAddSaleReturnFormOpen(true); }, []);
  const closeAddSaleReturnForm = React.useCallback(() => { setIsAddSaleReturnFormOpen(false); setSaleReturnToEdit(null); }, []);

  const triggerDownloadSalePdf = React.useCallback((sale: Sale) => setSaleForPdf(sale), []);
  
  const addButtonDynamicClass = React.useMemo(() => {
    if (activeTab === 'sales') {
        return 'bg-green-600 hover:bg-green-700 text-white';
    }
    if (activeTab === 'saleReturns') {
        return 'bg-red-600 hover:bg-red-700 text-white';
    }
    return 'bg-primary hover:bg-primary/90'; // Fallback
  }, [activeTab]);

  React.useEffect(() => {
    if (saleForPdf && chittiContainerRef.current) {
      const generatePdf = async () => {
        const elementToCapture = chittiContainerRef.current?.querySelector('.print-chitti-styles') as HTMLElement;
        if (!elementToCapture) {
          toast({ title: "PDF Error", description: "Chitti content not ready.", variant: "destructive" });
          setSaleForPdf(null);
          return;
        }
        try {
          const canvas = await html2canvas(elementToCapture, { scale: 1.5, useCORS: true, width: 550, height: elementToCapture.offsetHeight, logging: false });
          const imgData = canvas.toDataURL('image/jpeg', 0.85);
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5', compress: true });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgProps = pdf.getImageProperties(imgData);
          const margin = 10;
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
          pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
          const timestamp = formatDateFn(new Date(), 'yyyyMMddHHmmss');
          pdf.save(`SaleChitti_${saleForPdf.billNumber?.replace(/[\/\s.]/g, '_') || saleForPdf.id.slice(-4)}_${timestamp}.pdf`);
          toast({ title: "PDF Generated", description: `Chitti for ${saleForPdf.billNumber || saleForPdf.id.slice(-4)} downloaded.` });
        } catch (err) {
          console.error(err);
          toast({ title: "PDF Failed", variant: "destructive" });
        } finally {
          setSaleForPdf(null);
        }
      };
      const timer = setTimeout(generatePdf, 300);
      return () => clearTimeout(timer);
    }
  }, [saleForPdf, toast]);

  if (isAppHydrating || !hydrated) return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p>Loading sales data...</p></div>;

  return (
    <div className="space-y-2 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-2" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 no-print">
        <h1 className="text-2xl font-bold text-foreground uppercase">Sales & Returns (FY {financialYear})</h1>
      </div>
      
      <Tabs defaultValue="sales" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-10 mb-2 no-print">
          <TabsTrigger value="sales" className="py-2.5 text-base rounded-md">
            <ListCollapse className="mr-2 h-5 w-5" />Sales
          </TabsTrigger>
          <TabsTrigger value="saleReturns" className="py-2.5 text-base rounded-md">
            <RotateCcw className="mr-2 h-5 w-5" />Sale Returns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <div className="flex justify-end gap-2 mb-2 no-print">
            <Button onClick={openAddSaleForm} size="default" className={cn("text-base py-2 px-5 shadow-md", addButtonDynamicClass)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Sale
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.print()}><Printer className="h-5 w-5" /><span className="sr-only">Print</span></Button>
          </div>
          <SaleTable data={filteredSales} onEdit={handleEditSale} onDelete={handleDeleteSaleAttempt} onDownloadPdf={triggerDownloadSalePdf} />
        </TabsContent>

        <TabsContent value="saleReturns">
           <div className="flex justify-end gap-2 mb-2 no-print">
            <Button onClick={openAddSaleReturnForm} size="default" className={cn("text-base py-2 px-5 shadow-md", addButtonDynamicClass)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Sale Return
            </Button>
             <Button variant="outline" size="icon" onClick={() => window.print()}><Printer className="h-5 w-5" /><span className="sr-only">Print</span></Button>
          </div>
          <SaleReturnTable data={saleReturns} onEdit={handleEditSaleReturn} onDelete={handleDeleteSaleReturnAttempt} />
        </TabsContent>
      </Tabs>
      
      <div ref={chittiContainerRef} style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -10, backgroundColor: 'white' }}>{saleForPdf && <SaleChittiPrint sale={saleForPdf} />}</div>
      {isAddSaleFormOpen && <AddSaleForm key={saleToEdit ? `edit-${saleToEdit.id}` : 'add-new-sale'} isOpen={isAddSaleFormOpen} onClose={closeAddSaleForm} onSubmit={handleAddOrUpdateSale} availableStock={availableStock} existingSales={sales} onMasterDataUpdate={handleMasterDataUpdate} saleToEdit={saleToEdit} />}
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
