
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { useMasterData } from '@/contexts/MasterDataContext';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { PlusCircle, SlidersHorizontal, Trash2, Undo2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AddAdjustmentForm } from './AddAdjustmentForm';
import { isDateInFinancialYear } from '@/lib/utils';

import type { StockAdjustment, Purchase, Sale, LocationTransfer, SaleReturn, PurchaseReturn } from '@/lib/types';

// Storage keys
const ADJUSTMENTS_KEY = 'stockAdjustmentsData';
const PURCHASES_KEY = 'purchasesData';
const SALES_KEY = 'salesData';
const TRANSFERS_KEY = 'locationTransfersData';
const PURCHASE_RETURNS_KEY = 'purchaseReturnsData';
const SALE_RETURNS_KEY = 'saleReturnsData';

export function StockAdjustmentsClient() {
  const { toast } = useToast();
  const { financialYear } = useSettings();
  const [hydrated, setHydrated] = useState(false);

  const [adjustments, setAdjustments] = useLocalStorageState<StockAdjustment[]>(ADJUSTMENTS_KEY, []);
  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_KEY, []);
  const [sales] = useLocalStorageState<Sale[]>(SALES_KEY, []);
  const [transfers] = useLocalStorageState<LocationTransfer[]>(TRANSFERS_KEY, []);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(PURCHASE_RETURNS_KEY, []);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(SALE_RETURNS_KEY, []);

  const { data: masterData } = useMasterData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToReverse, setItemToReverse] = useState<StockAdjustment | null>(null);

  React.useEffect(() => { setHydrated(true); }, []);

  const allLotsInSystem = useMemo(() => {
    const lots = new Set<string>();
    purchases.forEach(p => p.items.forEach(i => lots.add(i.lotNumber)));
    transfers.forEach(t => t.items.forEach(i => {
        lots.add(i.originalLotNumber);
        lots.add(i.newLotNumber);
    }));
    return Array.from(lots).sort();
  }, [purchases, transfers]);

  const filteredAdjustments = useMemo(() => {
    if (!hydrated) return [];
    return adjustments
      .filter(adj => isDateInFinancialYear(adj.date, financialYear))
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [adjustments, financialYear, hydrated]);

  const handleAddAdjustment = useCallback((newAdjustment: Omit<StockAdjustment, 'id'>) => {
    setAdjustments(prev => [{ ...newAdjustment, id: `adj-${Date.now()}` }, ...prev]);
    toast({ title: 'Adjustment Recorded', description: 'The stock adjustment has been successfully saved.' });
  }, [setAdjustments, toast]);

  const handleReverseAttempt = (adjustment: StockAdjustment) => {
    if (adjustment.type === 'Reversal') {
      toast({ title: 'Cannot Reverse', description: 'This is already a reversal transaction.', variant: 'destructive' });
      return;
    }
    setItemToReverse(adjustment);
  };

  const confirmReversal = () => {
    if (itemToReverse) {
      const reversal: Omit<StockAdjustment, 'id'> = {
        date: format(new Date(), 'yyyy-MM-dd'),
        lotNumber: itemToReverse.lotNumber,
        locationId: itemToReverse.locationId,
        locationName: itemToReverse.locationName,
        bags: -itemToReverse.bags,
        weight: -itemToReverse.weight,
        type: 'Reversal',
        reason: `Reversal of adjustment ID: ${itemToReverse.id}`,
      };
      handleAddAdjustment(reversal);
      setItemToReverse(null);
    }
  };

  const getBadgeVariant = (type: StockAdjustment['type']) => {
    switch (type) {
      case 'Wastage':
      case 'Theft':
        return 'destructive';
      case 'Correction':
        return 'secondary';
      case 'Reversal':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <SlidersHorizontal /> Stock Adjustments
            </CardTitle>
            <CardDescription>Manually adjust stock levels for wastage, theft, or corrections.</CardDescription>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Adjustment
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-[60vh] overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Lot Number</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Bags</TableHead>
                  <TableHead className="text-right">Weight (kg)</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdjustments.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center h-24">No adjustments recorded for this financial year.</TableCell></TableRow>
                ) : (
                  filteredAdjustments.map(adj => (
                    <TableRow key={adj.id}>
                      <TableCell>{format(parseISO(adj.date), 'dd/MM/yy')}</TableCell>
                      <TableCell>{adj.lotNumber}</TableCell>
                      <TableCell>{adj.locationName}</TableCell>
                      <TableCell><Badge variant={getBadgeVariant(adj.type)}>{adj.type}</Badge></TableCell>
                      <TableCell className={`text-right font-medium ${adj.bags < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {adj.bags.toLocaleString('en-IN', { signDisplay: 'always' })}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${adj.weight < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {adj.weight.toLocaleString('en-IN', { signDisplay: 'always', minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{adj.reason}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleReverseAttempt(adj)} title="Reverse Transaction" disabled={adj.type === 'Reversal'}>
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddAdjustmentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddAdjustment}
        warehouses={masterData.Warehouse}
        availableLots={allLotsInSystem}
      />
      
      {itemToReverse && (
        <AlertDialog open={!!itemToReverse} onOpenChange={(open) => !open && setItemToReverse(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reverse this Stock Adjustment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a new, opposite adjustment transaction to cancel out the selected one. The original record will remain for audit purposes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmReversal}>Confirm Reversal</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
