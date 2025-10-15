
"use client";

import React, { useMemo } from 'react';
import type { CostBreakdown, LocationTransferItem, PurchaseItem, SaleItem, StockAdjustment } from '@/lib/types';
import { isDateInFinancialYear } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { useTransactions } from './useTransactions';

const KEY_SEPARATOR = '_$_';

export interface AggregatedInventoryItem {
  key: string;
  lotNumber: string;
  currentBags: number;
  currentWeight: number;
  averageWeightPerBag: number;
  effectiveRate: number; // Final landed cost per kg
  purchaseRate: number; // Base rate
  locationId: string;
  locationName: string;
  costBreakdown: CostBreakdown;
  supplierName: string;
  purchaseDate: string;
  daysInStock: number;
  isDeadStock: boolean;
  turnoverRate?: number; 
}


/**
 * A custom hook to calculate real-time inventory and available stock for sales forms.
 * It encapsulates the complex logic of inventory aggregation from various transactions.
 */
export const useInventory = (saleToEditId?: string | null) => {
    const { financialYear, isAppHydrating } = useSettings();
    const transactions = useTransactions();
    const [hydrated, setHydrated] = React.useState(false);

    React.useEffect(() => { setHydrated(true); }, []);

    const allAggregatedInventory = useMemo((): AggregatedInventoryItem[] => {
      if (isAppHydrating || !hydrated) return [];
      
      const { purchases, purchaseReturns, sales, saleReturns, locationTransfers, adjustments } = transactions;

      const stockMap = new Map<string, {
          purchaseDate: string;
          supplierName: string;
          bags: number;
          weight: number;
          totalCost: number;
          purchaseRate: number;
          locationName: string;
          costBreakdown: CostBreakdown;
          lastActivityDate: string;
          initialQuantity: number;
          soldQuantity: number;
      }>();
  
      const allTransactionsSorted = [
          ...purchases.map(p => ({ ...p, txType: 'purchase' as const })),
          ...purchaseReturns.map(pr => ({ ...pr, txType: 'purchaseReturn' as const })),
          ...locationTransfers.map(lt => ({ ...lt, txType: 'locationTransfer' as const })),
          ...sales.map(s => ({ ...s, txType: 'sale'as const })),
          ...saleReturns.map(sr => ({ ...sr, txType: 'saleReturn' as const })),
          ...(adjustments || []).map(adj => ({ ...adj, txType: 'adjustment' as const }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
      for (const tx of allTransactionsSorted) {
          if (!isDateInFinancialYear(tx.date, financialYear)) continue;
  
          if (tx.txType === 'purchase') {
              (tx.items || []).forEach((item: PurchaseItem) => {
                  const key = `${item.lotNumber}${KEY_SEPARATOR}${tx.locationId}`;
                  const landedCost = item.landedCostPerKg || 0;
                  const purchaseExpensesPerKg = landedCost - item.rate;
                  
                  stockMap.set(key, {
                      purchaseDate: tx.date,
                      supplierName: tx.supplierName || 'Unknown',
                      bags: item.quantity,
                      weight: item.netWeight,
                      totalCost: item.netWeight * landedCost,
                      purchaseRate: item.rate,
                      locationName: tx.locationName || tx.locationId,
                      costBreakdown: {
                          baseRate: item.rate,
                          purchaseExpenses: purchaseExpensesPerKg,
                          transferExpenses: 0
                      },
                      lastActivityDate: tx.date,
                      initialQuantity: item.quantity,
                      soldQuantity: 0,
                  });
              });
          } else if (tx.txType === 'locationTransfer') {
              (tx.items || []).forEach((item: LocationTransferItem) => {
                  const fromKey = `${item.originalLotNumber}${KEY_SEPARATOR}${tx.fromWarehouseId}`;
                  const fromEntry = stockMap.get(fromKey);
  
                  if (fromEntry) {
                      const costOfGoodsToTransfer = fromEntry.weight > 0 ? (fromEntry.totalCost / fromEntry.weight) * item.netWeightToTransfer : 0;
                      
                      fromEntry.bags -= item.bagsToTransfer;
                      fromEntry.weight -= item.netWeightToTransfer;
                      fromEntry.totalCost -= costOfGoodsToTransfer;
                      fromEntry.lastActivityDate = tx.date;
  
                      const toKey = `${item.newLotNumber}${KEY_SEPARATOR}${tx.toWarehouseId}`;
                      let toEntry = stockMap.get(toKey);
  
                      if (!toEntry) {
                          toEntry = { ...fromEntry, bags: 0, weight: 0, totalCost: 0, locationName: tx.toWarehouseName || tx.toWarehouseId, costBreakdown: { ...fromEntry.costBreakdown }, initialQuantity: 0, soldQuantity: 0 };
                      }
                      
                      const perKgExpense = (tx.perKgExpense || 0);
                      const newTotalCostForThisChunk = costOfGoodsToTransfer + (perKgExpense * item.netWeightToTransfer);
  
                      toEntry.bags += item.bagsToTransfer;
                      toEntry.weight += item.netWeightToTransfer;
                      toEntry.totalCost += newTotalCostForThisChunk;
                      toEntry.costBreakdown.transferExpenses += perKgExpense;
                      toEntry.lastActivityDate = tx.date;
                      toEntry.initialQuantity += item.bagsToTransfer;

                      stockMap.set(toKey, toEntry);
                  }
              });
          } else if (tx.txType === 'sale' && tx.id !== saleToEditId) { 
               (tx.items || []).forEach((item: SaleItem) => {
                  const saleLotKey = Array.from(stockMap.keys()).find(k => k.startsWith(item.lotNumber + KEY_SEPARATOR));
                  if (saleLotKey) {
                      const entry = stockMap.get(saleLotKey);
                      if (entry && entry.weight > 0) {
                          const costOfGoodsSold = (entry.totalCost / entry.weight) * item.netWeight;
                          entry.bags -= item.quantity;
                          entry.weight -= item.netWeight;
                          entry.totalCost -= costOfGoodsSold;
                          entry.lastActivityDate = tx.date;
                          entry.soldQuantity += item.quantity;
                      }
                  }
              });
          } else if (tx.txType === 'adjustment') {
              const key = `${tx.lotNumber}${KEY_SEPARATOR}${tx.locationId}`;
              const entry = stockMap.get(key);
              if (entry) {
                  entry.bags += tx.bags;
                  entry.weight += tx.weight;
                  entry.lastActivityDate = tx.date;
              }
          }
      }
      
      const result: AggregatedInventoryItem[] = [];
      const today = new Date();

      stockMap.forEach((value, key) => {
        const separatorIndex = key.indexOf(KEY_SEPARATOR);
        if (separatorIndex === -1) return;
        const lotNumber = key.substring(0, separatorIndex);
        const locationId = key.substring(separatorIndex + KEY_SEPARATOR.length);
        
        const daysInStock = (today.getTime() - new Date(value.purchaseDate).getTime()) / (1000 * 3600 * 24);
        const daysSinceLastActivity = (today.getTime() - new Date(value.lastActivityDate).getTime()) / (1000 * 3600 * 24);
        
        result.push({
            key,
            lotNumber,
            locationId,
            currentBags: value.bags,
            currentWeight: value.weight,
            averageWeightPerBag: value.bags > 0 ? value.weight / value.bags : 50,
            effectiveRate: value.weight > 0 ? value.totalCost / value.weight : 0,
            cogs: value.totalCost,
            purchaseRate: value.purchaseRate,
            locationName: value.locationName,
            costBreakdown: value.costBreakdown,
            supplierName: value.supplierName,
            purchaseDate: value.purchaseDate,
            daysInStock: Math.round(daysInStock),
            isDeadStock: daysSinceLastActivity > 180 && value.bags > 0,
            turnoverRate: value.initialQuantity > 0 ? (value.soldQuantity / value.initialQuantity) * 100 : 0
        });
      });
      
      return result;
    }, [transactions, financialYear, isAppHydrating, hydrated, saleToEditId]);

    const availableStock = useMemo(() => 
      allAggregatedInventory.filter(item => item.currentBags > 0.001)
    , [allAggregatedInventory]);

    return { allAggregatedInventory, availableStock, isLoading: !hydrated };
};

export type { AggregatedInventoryItem };
