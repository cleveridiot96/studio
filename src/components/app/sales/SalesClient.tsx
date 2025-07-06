
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, Download, ListCollapse, RotateCcw } from "lucide-react";
import type { Sale, MasterItem, MasterItemType, Customer, Transporter, Broker, Purchase, SaleReturn, PurchaseReturn, LocationTransfer, Receipt } from "@/lib/types";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FIXED_WAREHOUSES } from '@/lib/constants';
import { format as formatDateFn, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { salesMigrator, purchaseMigrator } from '@/lib/dataMigrators';


const SALES_STORAGE_KEY = 'salesData';
const SALE_RETURNS_STORAGE_KEY = 'saleReturnsData';
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const BROKERS_STORAGE_KEY = 'masterBrokers';
const PURCHASES_STORAGE_KEY = 'purchasesData';
const PURCHASE_RETURNS_STORAGE_KEY = 'purchaseReturnsData';
const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const RECEIPTS_STORAGE_KEY = 'receiptsData';

export interface AggregatedStockItemForForm {
  lotNumber: string;
  currentBags: number;
  effectiveRate: number; 
  purchaseRate: number;
  averageWeightPerBag: number;
  locationName?: string;
}

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
  const [activeTab, setActiveTab] = React.useState('sales');

  const memoizedEmptyArray = React.useMemo(() => [], []);
  const [sales, setSales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray, salesMigrator);
  const [saleReturns, setSaleReturns] = useLocalStorageState<SaleReturn[]>(SALE_RETURNS_STORAGE_KEY, memoizedEmptyArray);
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(CUSTOMERS_STORAGE_KEY, memoizedEmptyArray);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, memoizedEmptyArray);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, memoizedEmptyArray);
  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyArray, purchaseMigrator);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(PURCHASE_RETURNS_STORAGE_KEY, memoizedEmptyArray);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, memoizedEmptyArray);
  const [warehouses] = useLocalStorageState<MasterItem[]>(WAREHOUSES_STORAGE_KEY, memoizedEmptyArray);
  const [receipts, setReceipts] = useLocalStorageState<Receipt[]>(RECEIPTS_STORAGE_KEY, memoizedEmptyArray);

  React.useEffect(() => setIsSalesClientHydrated(true), []);

  const filteredSales = React.useMemo(() => {
    if (isAppHydrating || !isSalesClientHydrated) return [];
    
    const fySales = sales.filter(sale => sale && sale.date && isDateInFinancialYear(sale.date, financialYear));

    const enrichedSales = fySales.map(sale => {
        if (!sale || !sale.items) return null;

        const totalGoodsValue = sale.items.reduce((acc, item) => acc + (item.goodsValue || 0), 0);
        
        const billedAmount = (sale.isCB && sale.cbAmount) 
            ? totalGoodsValue - sale.cbAmount 
            : totalGoodsValue;

        const totalCostOfGoodsSold = sale.items.reduce((acc, item) => acc + (item.costOfGoodsSold || 0), 0);
        
        const grossProfit = totalGoodsValue - totalCostOfGoodsSold;
        
        const totalSaleSideExpenses = (sale.transportCost || 0) + 
                                      (sale.packingCost || 0) + 
                                      (sale.labourCost || 0) + 
                                      (sale.calculatedBrokerageCommission || 0) + 
                                      (sale.calculatedExtraBrokerage || 0);

        const totalCalculatedProfit = grossProfit - totalSaleSideExpenses;
        
        return {
            ...sale,
            totalGoodsValue,
            billedAmount,
            totalCostOfGoodsSold,
            totalCalculatedProfit,
        };
    }).filter(Boolean) as Sale[];

    return enrichedSales.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
}, [sales, financialYear, isAppHydrating, isSalesClientHydrated]);


  const filteredSaleReturns = React.useMemo(() => {
    if (isAppHydrating || !isSalesClientHydrated) return [];
    return saleReturns.filter(sr => sr && sr.date && isDateInFinancialYear(sr.date, financialYear));
  }, [saleReturns, financialYear, isAppHydrating, isSalesClientHydrated]);

  const aggregatedStockForSalesForm = React.useMemo((): AggregatedStockItemForForm[] => {
    if (isAppHydrating || !isSalesClientHydrated) return [];

    const stockMap = new Map<string, {
        currentBags: number,
        currentWeight: number,
        effectiveRate: number,
        purchaseRate: number,
        locationName?: string,
    }>();

    const fyPurchases = purchases.filter(p => isDateInFinancialYear(p.date, financialYear));
    
    fyPurchases.forEach(p => {
        if (!p || !p.items) return;
        p.items.forEach(item => {
            const entry = stockMap.get(item.lotNumber) || { currentBags: 0, currentWeight: 0, effectiveRate: p.effectiveRate, purchaseRate: item.rate, locationName: p.locationName };
            entry.currentBags += item.quantity;
            entry.currentWeight += item.netWeight;
            entry.effectiveRate = p.effectiveRate; // Last purchase of a lot overwrites rate info
            entry.purchaseRate = item.rate;
            entry.locationName = p.locationName;
            stockMap.set(item.lotNumber, entry);
        });
    });

    const fyPurchaseReturns = purchaseReturns.filter(pr => isDateInFinancialYear(pr.date, financialYear));
    fyPurchaseReturns.forEach(pr => {
        const entry = stockMap.get(pr.originalLotNumber);
        if (entry) {
            entry.currentBags -= pr.quantityReturned;
            entry.currentWeight -= pr.netWeightReturned;
        }
    });

    const fyLocationTransfers = locationTransfers.filter(lt => isDateInFinancialYear(lt.date, financialYear));
    fyLocationTransfers.forEach(transfer => {
        if (!transfer || !transfer.items) return;
        transfer.items.forEach(item => {
            const fromEntry = stockMap.get(item.originalLotNumber);
            if (fromEntry) {
                fromEntry.currentBags -= item.bagsToTransfer;
                fromEntry.currentWeight -= item.netWeightToTransfer;
            }

            const toEntry = stockMap.get(item.newLotNumber);
            const sourceEntry = fromEntry || stockMap.get(item.originalLotNumber); // Use source for rate info
            if (toEntry) {
                toEntry.currentBags += item.bagsToTransfer;
                toEntry.currentWeight += item.netWeightToTransfer;
            } else {
                stockMap.set(item.newLotNumber, {
                    currentBags: item.bagsToTransfer,
                    currentWeight: item.netWeightToTransfer,
                    effectiveRate: sourceEntry?.effectiveRate || 0,
                    purchaseRate: sourceEntry?.purchaseRate || 0,
                    locationName: warehouses.find(w => w.id === transfer.toWarehouseId)?.name
                });
            }
        });
    });

    const fySales = sales.filter(s => isDateInFinancialYear(s.date, financialYear) && s.id !== saleToEdit?.id);
    fySales.forEach(s => {
        if (!s || !s.items) return;
        s.items.forEach(item => {
            const entry = stockMap.get(item.lotNumber);
            if (entry) {
                entry.currentBags -= item.quantity;
                entry.currentWeight -= item.netWeight;
            }
        });
    });
    
    const fySaleReturns = saleReturns.filter(sr => isDateInFinancialYear(sr.date, financialYear));
    fySaleReturns.forEach(sr => {
      const entry = stockMap.get(sr.originalLotNumber);
      if (entry) {
        entry.currentBags += sr.quantityReturned;
        entry.currentWeight += sr.netWeightReturned;
      }
    });


    const result: AggregatedStockItemForForm[] = [];
    stockMap.forEach((value, key) => {
        if (value.currentBags > 0.001) {
            result.push({ 
                lotNumber: key, 
                currentBags: value.currentBags,
                effectiveRate: value.effectiveRate,
                purchaseRate: value.purchaseRate,
                averageWeightPerBag: value.currentBags > 0 ? value.currentWeight / value.currentBags : 50,
                locationName: value.locationName
            });
        }
    });
    return result;

  }, [purchases, purchaseReturns, sales, saleReturns, locationTransfers, warehouses, isAppHydrating, isSalesClientHydrated, financialYear, saleToEdit]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = React.useMemo(() => filteredSales.slice(startIndex, endIndex), [filteredSales, startIndex, endIndex]);
  const totalPages = React.useMemo(() => Math.ceil(filteredSales.length / itemsPerPage), [filteredSales, itemsPerPage]);

  const goToPage = React.useCallback((page: number) => setCurrentPage(page), []);
  const nextPage = React.useCallback(() => setCurrentPage(prev => Math.min(prev + 1, totalPages)), [totalPages]);
  const prevPage = React.useCallback(() => setCurrentPage(prev => Math.max(prev - 1, 1)), []);

  const handleAddOrUpdateSale = React.useCallback((sale: Sale) => {
    const isEditing = sales.some(s => s.id === sale.id);
    setSales(prevSales => {
      return isEditing
        ? prevSales.map(s => (s.id === sale.id ? sale : s))
        : [{ ...sale, id: sale.id || `sale-${Date.now()}` }, ...prevSales];
    });

    if (sale.isCB && sale.cbAmount && sale.cbAmount > 0) {
        const accountableParty = sale.brokerId ? brokers.find(b => b.id === sale.brokerId) : customers.find(c => c.id === sale.customerId);
        if(accountableParty) {
            const cbReceipt: Receipt = {
                id: `receipt-cb-${sale.id}`,
                date: sale.date,
                partyId: accountableParty.id,
                partyName: accountableParty.name,
                partyType: accountableParty.type as 'Broker' | 'Customer',
                amount: sale.cbAmount,
                paymentMethod: 'Cash',
                notes: `Auto-generated for CB on Sale Bill: ${sale.billNumber || sale.id}`,
            };
            setReceipts(prev => [cbReceipt, ...prev.filter(r => r.id !== cbReceipt.id)]);
            toast({ title: "CB Recorded", description: `A receipt of ₹${sale.cbAmount} has been auto-generated for the cut bill.` });
        }
    }


    toast({
      title: "Success!",
      description: isEditing ? "Sale updated." : "Sale added."
    });
    setIsAddSaleFormOpen(false);
    setSaleToEdit(null);
  }, [sales, setSales, brokers, customers, setReceipts, toast]);

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
      return isEditing ? prevReturns.map(sr => sr.id === srData.id ? srData : sr) : [{ ...srData, id: srData.id || `sr-${Date.now()}` }, ...prevReturns];
    });
    toast({ title: "Success!", description: saleReturns.some(sr => sr.id === srData.id) ? "Sale return updated." : "Sale return added." });
    setIsAddSaleReturnFormOpen(false); setSaleReturnToEdit(null);
  }, [setSaleReturns, toast, saleReturns]);

  const handleEditSaleReturn = React.useCallback((sr: SaleReturn) => { toast({title: "Info", description:"Editing sale returns is planned."})}, [toast]);
  const handleDeleteSaleReturnAttempt = React.useCallback((srId: string) => { setSaleReturnToDeleteId(srId); setShowDeleteReturnConfirm(true); }, []);
  const confirmDeleteSaleReturn = React.useCallback(() => {
    if (saleReturnToDeleteId) {
      setSaleReturns(prev => prev.filter(sr => sr.id !== saleReturnToDeleteId));
      toast({ title: "Deleted!", description: "Sale return record removed.", variant: "destructive" });
      setSaleReturnToDeleteId(null); setShowDeleteReturnConfirm(false);
    }
  }, [saleReturnToDeleteId, setSaleReturns, toast]);

  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    const setters: Record<string, React.Dispatch<React.SetStateAction<any[]>>> = { 
        Customer: setCustomers, 
        Transporter: setTransporters, 
        Broker: setBrokers 
    };
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

  if (isAppHydrating || !isSalesClientHydrated) return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p>Loading sales data...</p></div>;

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
        <h1 className="text-3xl font-bold text-foreground">Sales & Returns (FY {financialYear})</h1>
      </div>
      
      <Tabs defaultValue="sales" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full md:w-auto grid-cols-2 mb-4 no-print bg-transparent p-0 gap-2">
          <TabsTrigger value="sales" className="py-2.5 text-base text-white bg-green-600 hover:bg-green-700 data-[state=active]:bg-green-800 data-[state=active]:text-white rounded-md transition-all">
            <ListCollapse className="mr-2 h-5 w-5" />Sales
          </TabsTrigger>
          <TabsTrigger value="saleReturns" className="py-2.5 text-base text-white bg-red-600 hover:bg-red-700 data-[state=active]:bg-red-800 data-[state=active]:text-white rounded-md transition-all">
            <RotateCcw className="mr-2 h-5 w-5" />Sale Returns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <div className="flex justify-end gap-2 mb-4 no-print">
            <Button onClick={openAddSaleForm} size="lg" className={cn("text-base py-3 px-6 shadow-md", addButtonDynamicClass)}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add Sale
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.print()}><Printer className="h-5 w-5" /><span className="sr-only">Print</span></Button>
          </div>
          <SaleTable data={paginatedSales} currentPage={currentPage} itemsPerPage={itemsPerPage} totalPages={totalPages} goToPage={goToPage} nextPage={nextPage} prevPage={prevPage} onEdit={handleEditSale} onDelete={handleDeleteSaleAttempt} onDownloadPdf={triggerDownloadSalePdf} />
        </TabsContent>

        <TabsContent value="saleReturns">
           <div className="flex justify-end gap-2 mb-4 no-print">
            <Button onClick={openAddSaleReturnForm} size="lg" className={cn("text-base py-3 px-6 shadow-md", addButtonDynamicClass)}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add Sale Return
            </Button>
             <Button variant="outline" size="icon" onClick={() => window.print()}><Printer className="h-5 w-5" /><span className="sr-only">Print</span></Button>
          </div>
          <SaleReturnTable data={filteredSaleReturns} onEdit={handleEditSaleReturn} onDelete={handleDeleteSaleReturnAttempt} />
        </TabsContent>
      </Tabs>
      
      <div ref={chittiContainerRef} style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -10, backgroundColor: 'white' }}>{saleForPdf && <SaleChittiPrint sale={saleForPdf} />}</div>
      {isAddSaleFormOpen && <AddSaleForm key={saleToEdit ? `edit-${saleToEdit.id}` : 'add-new-sale'} isOpen={isAddSaleFormOpen} onClose={closeAddSaleForm} onSubmit={handleAddOrUpdateSale} customers={customers as Customer[]} transporters={transporters as Transporter[]} brokers={brokers} availableStock={aggregatedStockForSalesForm} existingSales={sales} onMasterDataUpdate={handleMasterDataUpdate} saleToEdit={saleToEdit} />}
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
