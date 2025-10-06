
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
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format as formatDateFn, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { salesMigrator, purchaseMigrator } from '@/lib/dataMigrators';
import { FIXED_WAREHOUSES, FIXED_EXPENSES } from '@/lib/constants';
import { useMasterData } from "@/contexts/MasterDataContext";

// TRIAL PACKAGE 1 DATA
const initialSalesData: Sale[] = [
    { id: "sale-tp1-1", date: "2024-07-20", billNumber: "B-101", customerId: "cust-lalit", customerName: "LALIT TRADERS", brokerId: "broker-arun", brokerName: "ARUN KUMAR", items: [{ lotNumber: "VAKKAL-A1-T50", quantity: 50, netWeight: 2500, rate: 35, goodsValue: 87500, purchaseRate: 25, costOfGoodsSold: 64250, itemGrossProfit: 25000, itemNetProfit: 24650, costBreakdown: { baseRate: 25, purchaseExpenses: 0.5, transferExpenses: 0.2 } }], expenses: [{ account: "Broker Commission", amount: 350, paymentMode: "Pending", partyId: "broker-arun", partyName: "ARUN KUMAR" }], totalGoodsValue: 87500, billedAmount: 87500, totalQuantity: 50, totalNetWeight: 2500, totalCostOfGoodsSold: 64250, totalGrossProfit: 25000, totalCalculatedProfit: 23250 },
    { id: "sale-tp1-2", date: "2024-07-22", billNumber: "B-102", customerId: "cust-mahesh", customerName: "MAHESH & CO", items: [{ lotNumber: "VAKKAL-B2", quantity: 20, netWeight: 1000, rate: 40, goodsValue: 40000, purchaseRate: 28, costOfGoodsSold: 28000, itemGrossProfit: 12000, itemNetProfit: 12000, costBreakdown: { baseRate: 28, purchaseExpenses: 0, transferExpenses: 0 } }], expenses: [], totalGoodsValue: 40000, billedAmount: 35000, cbAmount: 5000, totalQuantity: 20, totalNetWeight: 1000, totalCostOfGoodsSold: 28000, totalGrossProfit: 12000, totalCalculatedProfit: 12000 },
];
const initialSaleReturnsData: SaleReturn[] = [
    { id: "sret-tp1-1", date: "2024-07-25", originalSaleId: "sale-tp1-1", originalBillNumber: "B-101", originalCustomerId: "cust-lalit", originalCustomerName: "LALIT TRADERS", originalLotNumber: "VAKKAL-A1/50", originalSaleRate: 35, quantityReturned: 5, netWeightReturned: 250, returnAmount: 8750, restockingFee: 0, returnReason: "Surplus stock" }
];


const SALES_STORAGE_KEY = 'salesData';
const SALE_RETURNS_STORAGE_KEY = 'saleReturnsData';
const PURCHASES_STORAGE_KEY = 'purchasesData';
const PURCHASE_RETURNS_STORAGE_KEY = 'purchaseReturnsData';
const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData';
const RECEIPTS_STORAGE_KEY = 'receiptsData';
const LEDGER_STORAGE_KEY = 'ledgerData';
const KEY_SEPARATOR = '_$_';

export interface AggregatedStockItemForForm {
  lotNumber: string;
  currentBags: number;
  effectiveRate: number; 
  purchaseRate: number;
  averageWeightPerBag: number;
  locationId: string;
  locationName?: string;
  costBreakdown: CostBreakdown;
}

export function SalesClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();
  const [hydrated, setHydrated] = React.useState(false);
  const { setMasterData } = useMasterData();

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
  
  const [sales, setSales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, [], salesMigrator);
  const [saleReturns, setSaleReturns] = useLocalStorageState<SaleReturn[]>(SALE_RETURNS_STORAGE_KEY, []);
  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, [], purchaseMigrator);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(PURCHASE_RETURNS_STORAGE_KEY, []);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, []);
  const [receipts] = useLocalStorageState<Receipt[]>(RECEIPTS_STORAGE_KEY, []);
  const [ledgerData, setLedgerData] = useLocalStorageState<LedgerEntry[]>(LEDGER_STORAGE_KEY, []);


  React.useEffect(() => {
    setHydrated(true);
    if (localStorage.getItem(SALES_STORAGE_KEY) === null) {
      setSales(initialSalesData);
    }
    if (localStorage.getItem(SALE_RETURNS_STORAGE_KEY) === null) {
      setSaleReturns(initialSaleReturnsData);
    }
  }, [setSales, setSaleReturns]);

  const aggregatedStockForSalesForm = React.useMemo((): AggregatedStockItemForForm[] => {
    if (isAppHydrating || !hydrated) return [];

    const stockMap = new Map<string, {
        currentBags: number;
        currentWeight: number;
        totalCost: number;
        purchaseRate: number;
        locationName?: string;
        costBreakdown: CostBreakdown;
    }>();

    const transactions = [
        ...purchases.map(p => ({ ...p, txType: 'purchase' as const })),
        ...purchaseReturns.map(pr => ({ ...pr, txType: 'purchaseReturn' as const })),
        ...locationTransfers.map(lt => ({ ...lt, txType: 'locationTransfer' as const })),
        ...sales.map(s => ({ ...s, txType: 'sale' as const })),
        ...saleReturns.map(sr => ({ ...sr, txType: 'saleReturn' as const }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const tx of transactions) {
        if (!isDateInFinancialYear(tx.date, financialYear)) continue;

        if (tx.txType === 'purchase') {
            (tx.items || []).forEach((item: PurchaseItem) => {
                const key = `${item.lotNumber}${KEY_SEPARATOR}${tx.locationId}`;
                const landedCost = item.landedCostPerKg || 0;
                const purchaseExpensesPerKg = landedCost - item.rate;
                
                stockMap.set(key, {
                    currentBags: item.quantity,
                    currentWeight: item.netWeight,
                    totalCost: item.netWeight * landedCost,
                    purchaseRate: item.rate,
                    locationName: tx.locationName,
                    costBreakdown: {
                        baseRate: item.rate,
                        purchaseExpenses: purchaseExpensesPerKg,
                        transferExpenses: 0
                    }
                });
            });
        } else if (tx.txType === 'locationTransfer') {
            (tx.items || []).forEach((item: LocationTransferItem) => {
                const fromKey = `${item.originalLotNumber}${KEY_SEPARATOR}${tx.fromWarehouseId}`;
                const fromEntry = stockMap.get(fromKey);

                if (fromEntry) {
                    const costOfGoodsToTransfer = fromEntry.currentWeight > 0 ? (fromEntry.totalCost / fromEntry.currentWeight) * item.netWeightToTransfer : 0;
                    
                    fromEntry.currentBags -= item.bagsToTransfer;
                    fromEntry.currentWeight -= item.netWeightToTransfer;
                    fromEntry.totalCost -= costOfGoodsToTransfer;

                    const toKey = `${item.newLotNumber}${KEY_SEPARATOR}${tx.toWarehouseId}`;
                    let toEntry = stockMap.get(toKey);

                    if (!toEntry) {
                        toEntry = {
                            currentBags: 0,
                            currentWeight: 0,
                            totalCost: 0,
                            purchaseRate: fromEntry.purchaseRate,
                            locationName: tx.toWarehouseName,
                            costBreakdown: { ...fromEntry.costBreakdown }
                        };
                    }
                    
                    const perKgExpense = (tx.perKgExpense || 0);
                    const newTotalCostForThisChunk = costOfGoodsToTransfer + (perKgExpense * item.netWeightToTransfer);

                    toEntry.currentBags += item.bagsToTransfer;
                    toEntry.currentWeight += item.netWeightToTransfer;
                    toEntry.totalCost += newTotalCostForThisChunk;
                    toEntry.costBreakdown.transferExpenses += perKgExpense;

                    stockMap.set(toKey, toEntry);
                }
            });
        } else if (tx.txType === 'sale' && tx.id !== saleToEdit?.id) { 
             (tx.items || []).forEach((item: SaleItem) => {
                const saleLotKey = Array.from(stockMap.keys()).find(k => k.startsWith(item.lotNumber + KEY_SEPARATOR));
                if (saleLotKey) {
                    const entry = stockMap.get(saleLotKey);
                    if (entry && entry.currentWeight > 0) {
                        const costOfGoodsSold = (entry.totalCost / entry.currentWeight) * item.netWeight;
                        entry.currentBags -= item.quantity;
                        entry.currentWeight -= item.netWeight;
                        entry.totalCost -= costOfGoodsSold;
                    }
                }
            });
        }
    }

    const result: AggregatedStockItemForForm[] = [];
    stockMap.forEach((value, key) => {
        const separatorIndex = key.indexOf(KEY_SEPARATOR);
        if (separatorIndex === -1) return;
        const lotNumber = key.substring(0, separatorIndex);
        const locationId = key.substring(separatorIndex + KEY_SEPARATOR.length);

        if (value.currentBags > 0.001) {
            const effectiveRate = value.currentWeight > 0 ? value.totalCost / value.currentWeight : 0;
            result.push({
                lotNumber,
                locationId,
                currentBags: value.currentBags,
                averageWeightPerBag: value.currentBags > 0 ? value.currentWeight / value.currentBags : 50,
                effectiveRate,
                purchaseRate: value.purchaseRate,
                locationName: value.locationName,
                costBreakdown: value.costBreakdown,
            });
        }
    });
    
    return result;
  }, [purchases, purchaseReturns, sales, saleReturns, locationTransfers, isAppHydrating, hydrated, financialYear, saleToEdit]);


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
            setLedgerData(prevLedger => [...prevLedger.filter(l => l.relatedVoucher !== sale.id), ...newLedgerEntries]);
            toast({ title: "Sale Expenses Logged", description: `${newLedgerEntries.length} expense(s) have been recorded in the ledger.` });
        }
    }

    toast({
      title: "Success!",
      description: isEditing ? "Sale updated." : "Sale added."
    });
    setIsAddSaleFormOpen(false);
    setSaleToEdit(null);
  }, [sales, setSales, setLedgerData, toast]);

  const handleEditSale = React.useCallback((sale: Sale) => { setSaleToEdit(sale); setIsAddSaleFormOpen(true); }, []);
  const handleDeleteSaleAttempt = React.useCallback((saleId: string) => { setSaleToDeleteId(saleId); setShowDeleteConfirm(true); }, []);
  const confirmDeleteSale = React.useCallback(() => {
    if (saleToDeleteId) {
      setSales(prev => prev.filter(s => s.id !== saleToDeleteId));
      setLedgerData(prev => prev.filter(l => l.relatedVoucher !== saleToDeleteId));
      toast({ title: "Deleted!", description: "Sale record removed.", variant: "destructive" });
      setSaleToDeleteId(null); setShowDeleteConfirm(false);
    }
  }, [saleToDeleteId, setSales, setLedgerData, toast]);

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
          <SaleReturnTable data={filteredSaleReturns} onEdit={handleEditSaleReturn} onDelete={handleDeleteSaleReturnAttempt} />
        </TabsContent>
      </Tabs>
      
      <div ref={chittiContainerRef} style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -10, backgroundColor: 'white' }}>{saleForPdf && <SaleChittiPrint sale={saleForPdf} />}</div>
      {isAddSaleFormOpen && <AddSaleForm key={saleToEdit ? `edit-${saleToEdit.id}` : 'add-new-sale'} isOpen={isAddSaleFormOpen} onClose={closeAddSaleForm} onSubmit={handleAddOrUpdateSale} availableStock={aggregatedStockForSalesForm} existingSales={sales} onMasterDataUpdate={handleMasterDataUpdate} saleToEdit={saleToEdit} />}
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
