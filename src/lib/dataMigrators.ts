
import type { Purchase, Sale, LocationTransfer, ExpenseItem } from './types';

/**
 * Migrates purchase data from a potential single-item format (with top-level lotNumber, quantity etc.)
 * to the new multi-item format (with an 'items' array).
 * This also adds the 'landedCostPerKg' to each item if it's missing.
 * @param storedValue The raw value from localStorage.
 * @returns An array of Purchase objects in the new format.
 */
export const purchaseMigrator = (storedValue: any): Purchase[] => {
    if (Array.isArray(storedValue)) {
        return storedValue.map(p => {
            if (!p) return null; // Handle null/undefined items in array

            // First, handle migration from single-item to multi-item structure
            if (p.lotNumber && !p.items) {
                const goodsValue = (p.netWeight || 0) * (p.rate || 0);
                p = {
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
            
            // Ensure items array exists
            if (!p.items) {
                p.items = [];
            }

            // Now, calculate and add landedCostPerKg to each item if it's missing
            const totalNonBrokerageExpenses = (p.transportCharges || 0) + (p.packingCharges || 0) + (p.labourCharges || 0) + (p.miscExpenses || 0);
            const totalExpenses = totalNonBrokerageExpenses + (p.brokerageCharges || 0);
            const expensesPerKg = p.totalNetWeight > 0 ? totalExpenses / p.totalNetWeight : 0;

            p.items = p.items.map((item: any) => {
                // If landedCostPerKg is missing, calculate it
                if (item.landedCostPerKg === undefined) {
                    const itemRate = Number(item.rate) || 0;
                    const landedCostPerKg = itemRate + expensesPerKg;
                    return { ...item, landedCostPerKg: parseFloat(landedCostPerKg.toFixed(2)) };
                }
                return item;
            });

            return p;
        }).filter(Boolean) as Purchase[];
    }
    return [];
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

export const locationTransferMigrator = (storedValue: any): LocationTransfer[] => {
    if (Array.isArray(storedValue)) {
        return storedValue.map(lt => {
            if (!lt) return null;
            if (lt.expenses) return lt; // Already migrated

            const newExpenses: ExpenseItem[] = [];
            if (lt.transportCharges && lt.transportCharges > 0) {
                newExpenses.push({
                    account: 'Transport Charges',
                    amount: lt.transportCharges,
                    paymentMode: 'Pending', // Default assumption
                    party: lt.transporterName || 'Unknown Transporter'
                });
            }
            if (lt.packingCharges && lt.packingCharges > 0) {
                newExpenses.push({
                    account: 'Packing Charges',
                    amount: lt.packingCharges,
                    paymentMode: 'Cash'
                });
            }
            if (lt.labourCharges && lt.labourCharges > 0) {
                newExpenses.push({
                    account: 'Labour Charges',
                    amount: lt.labourCharges,
                    paymentMode: 'Cash'
                });
            }
            if (lt.miscExpenses && lt.miscExpenses > 0) {
                 newExpenses.push({
                    account: 'Misc Expenses',
                    amount: lt.miscExpenses,
                    paymentMode: 'Cash'
                });
            }
            
            const newLt = { ...lt, expenses: newExpenses };
            
            // Delete old keys
            delete newLt.transportCharges;
            delete newLt.packingCharges;
            delete newLt.labourCharges;
            delete newLt.miscExpenses;
            delete newLt.transportRate;

            return newLt;

        }).filter(Boolean) as LocationTransfer[];
    }
    return [];
};
