"use client";

import React, { useMemo } from 'react';
import type { CostBreakdown, LocationTransferItem, PurchaseItem, SaleItem, StockAdjustment } from '@/lib/types';
import { isDateInFinancialYear } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { useTransactions } from './useTransactions';

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

/**
 * A custom hook to calculate real-time inventory and available stock for sales forms.
 * It encapsulates the complex logic of inventory aggregation from various transactions.
 */
export const useInventory = (saleToEditId?: string | null) => {
    const { financialYear, isAppHydrating } = useSettings();
    const { purchases, purchaseReturns, sales, saleReturns, locationTransfers, adjustments } = useTransactions();
    const [hydrated, setHydrated] = React.useState(false);

    React.useEffect(() => { setHydrated(true); }, []);

    const availableStock = useMemo((): AggregatedStockItemForForm[] => {
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
          ...saleReturns.map(sr => ({ ...sr, txType: 'saleReturn' as const })),
          ...(adjustments || []).map(adj => ({ ...adj, txType: 'adjustment' as const }))
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
          } else if (tx.txType === 'sale' && tx.id !== saleToEditId) { 
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
          } else if (tx.txType === 'adjustment') {
              const key = `${tx.lotNumber}${KEY_SEPARATOR}${tx.locationId}`;
              const entry = stockMap.get(key);
              if (entry) {
                  entry.currentBags += tx.bags;
                  entry.currentWeight += tx.weight;
                  // Note: Adjusting cost might be needed depending on the adjustment type, but for now we only adjust quantity.
              }
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
    }, [purchases, purchaseReturns, sales, saleReturns, locationTransfers, adjustments, isAppHydrating, hydrated, financialYear, saleToEditId]);

    return { availableStock, isLoading: !hydrated };
};
