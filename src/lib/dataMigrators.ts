
import type { Purchase, Sale } from './types';

/**
 * Migrates purchase data from a potential single-item format (with top-level lotNumber, quantity etc.)
 * to the new multi-item format (with an 'items' array).
 * This ensures backwards compatibility with data stored in localStorage.
 * @param storedValue The raw value from localStorage.
 * @returns An array of Purchase objects in the new format.
 */
export const purchaseMigrator = (storedValue: any): Purchase[] => {
    if (Array.isArray(storedValue)) {
        return storedValue.map(p => {
            if (!p) return null; // Handle null/undefined items in array

            // If it's an old single-item record (has lotNumber but no items array)
            if (p.lotNumber && !p.items) {
                const goodsValue = (p.netWeight || 0) * (p.rate || 0);
                return {
                    ...p,
                    items: [{
                        lotNumber: p.lotNumber,
                        quantity: p.quantity,
                        netWeight: p.netWeight,
                        rate: p.rate,
                        goodsValue: goodsValue,
                    }],
                    totalGoodsValue: goodsValue,
                    totalQuantity: p.quantity,
                    totalNetWeight: p.netWeight,
                };
            }
            // If the record is just missing an items array, initialize it
             if (!p.items) {
                p.items = [];
            }
            return p;
        }).filter(Boolean) as Purchase[]; // Filter out any null items that were in the array
    }
    return []; // Return empty array if stored value is not an array
};

/**
 * Migrates sales data from a potential single-item format to the new multi-item format.
 * @param storedValue The raw value from localStorage.
 * @returns An array of Sale objects in the new format.
 */
export const salesMigrator = (storedValue: any): Sale[] => {
    if (Array.isArray(storedValue)) {
        return storedValue.map(sale => {
            if (!sale) return null;

            // If it's an old single-item record
            if (sale.lotNumber && !sale.items) {
                const goodsValue = (sale.netWeight || 0) * (sale.rate || 0);
                const cogs = sale.costOfGoodsSold || 0; 
                
                return {
                    ...sale,
                    items: [{
                        lotNumber: sale.lotNumber,
                        quantity: sale.quantity,
                        netWeight: sale.netWeight,
                        rate: sale.rate,
                        goodsValue: goodsValue,
                        costOfGoodsSold: cogs
                    }],
                    totalGoodsValue: goodsValue,
                    totalQuantity: sale.quantity,
                    totalNetWeight: sale.netWeight,
                    totalCostOfGoodsSold: cogs,
                };
            }
            // If the record is just missing an items array, initialize it
            if (!sale.items) {
                sale.items = [];
            }
            return sale;
        }).filter(Boolean) as Sale[];
    }
    return []; 
};
