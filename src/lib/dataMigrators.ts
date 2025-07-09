
import type { Purchase, Sale, LocationTransfer, ExpenseItem, SaleItem } from './types';

/**
 * Migrates purchase data to the new multi-item format with an 'expenses' array.
 * @param storedValue The raw value from localStorage.
 * @returns An array of Purchase objects in the new format.
 */
export const purchaseMigrator = (storedValue: any): Purchase[] => {
    if (Array.isArray(storedValue)) {
        return storedValue.map(p => {
            if (!p) return null; // Handle null/undefined items in array

            // If already has an expenses array, assume it's the new format
            if (p.expenses) return p;

            const migratedExpenses: ExpenseItem[] = [];
            if (p.transportCharges) migratedExpenses.push({ account: 'Transport Charges', amount: p.transportCharges, paymentMode: 'Pending', party: p.transporterName || 'Self' });
            if (p.packingCharges) migratedExpenses.push({ account: 'Packing Charges', amount: p.packingCharges, paymentMode: 'Cash', party: 'Self' });
            if (p.labourCharges) migratedExpenses.push({ account: 'Labour Charges', amount: p.labourCharges, paymentMode: 'Cash', party: 'Self' });
            if (p.miscExpenses) migratedExpenses.push({ account: 'Misc Expenses', amount: p.miscExpenses, paymentMode: 'Cash', party: 'Self' });
            if (p.brokerageCharges) migratedExpenses.push({ account: 'Broker Commission', amount: p.brokerageCharges, paymentMode: 'Pending', party: p.agentName || 'Self' });
            
            p.expenses = migratedExpenses;

            // Delete old top-level keys
            delete p.transportCharges;
            delete p.packingCharges;
            delete p.labourCharges;
            delete p.miscExpenses;
            delete p.commission;
            delete p.commissionType;
            delete p.brokerageCharges;

            // First, handle migration from single-item to multi-item structure
            if (p.lotNumber && !p.items) {
                const goodsValue = (p.netWeight || 0) * (p.rate || 0);
                p.items = [{
                    lotNumber: p.lotNumber,
                    quantity: p.quantity,
                    netWeight: p.netWeight,
                    rate: p.rate,
                    goodsValue: goodsValue,
                }];
                p.totalGoodsValue = goodsValue;
                p.totalQuantity = p.quantity;
                p.totalNetWeight = p.netWeight;
            }
            
            if (!p.items) p.items = [];

            const totalExpenses = p.expenses.reduce((sum, exp) => sum + exp.amount, 0);
            const expensesPerKg = p.totalNetWeight > 0 ? totalExpenses / p.totalNetWeight : 0;

            p.items = p.items.map((item: any) => {
                if (item.landedCostPerKg === undefined) {
                    const landedCostPerKg = (item.rate || 0) + expensesPerKg;
                    return { ...item, landedCostPerKg: parseFloat(landedCostPerKg.toFixed(2)) };
                }
                return item;
            });
            
            p.totalAmount = p.totalGoodsValue + totalExpenses;
            p.effectiveRate = p.totalNetWeight > 0 ? p.totalAmount / p.totalNetWeight : 0;

            return p;
        }).filter(Boolean) as Purchase[];
    }
    return [];
};


/**
 * Migrates sales data to the new multi-item format with an 'expenses' array.
 * @param storedValue The raw value from localStorage.
 * @returns An array of Sale objects in the new format.
 */
export const salesMigrator = (storedValue: any): Sale[] => {
    if (Array.isArray(storedValue)) {
        return storedValue.map(sale => {
            if (!sale) return null;

            if (sale.expenses) return sale; // Already migrated

            const migratedExpenses: ExpenseItem[] = [];
            if(sale.isCB && sale.cbAmount) migratedExpenses.push({ account: 'Cash Discount', amount: sale.cbAmount, paymentMode: 'Auto-adjusted', party: sale.customerName || 'Self' });
            if(sale.transportCost) migratedExpenses.push({ account: 'Transport Charges', amount: sale.transportCost, paymentMode: 'Pending', party: sale.transporterName || 'Self' });
            if(sale.packingCost) migratedExpenses.push({ account: 'Packing Charges', amount: sale.packingCost, paymentMode: 'Cash', party: 'Self' });
            if(sale.labourCost) migratedExpenses.push({ account: 'Labour Charges', amount: sale.labourCost, paymentMode: 'Cash', party: 'Self' });
            if(sale.miscExpenses) migratedExpenses.push({ account: 'Misc Expenses', amount: sale.miscExpenses, paymentMode: 'Cash', party: 'Self' });
            if(sale.calculatedBrokerageCommission) migratedExpenses.push({ account: 'Broker Commission', amount: sale.calculatedBrokerageCommission, paymentMode: 'Pending', party: sale.brokerName || 'Self' });
            if(sale.calculatedExtraBrokerage) migratedExpenses.push({ account: 'Extra Brokerage', amount: sale.calculatedExtraBrokerage, paymentMode: 'Pending', party: sale.brokerName || 'Self' });

            sale.expenses = migratedExpenses;
            
            delete sale.isCB;
            delete sale.cbAmount;
            delete sale.transportCost;
            delete sale.packingCost;
            delete sale.labourCost;
            delete sale.miscExpenses;
            delete sale.commission;
            delete sale.commissionType;
            delete sale.extraBrokeragePerKg;
            delete sale.calculatedBrokerageCommission;
            delete sale.calculatedExtraBrokerage;

            if (sale.lotNumber && !sale.items) {
                sale.items = [{
                    lotNumber: sale.lotNumber,
                    quantity: sale.quantity,
                    netWeight: sale.netWeight,
                    rate: sale.rate,
                    goodsValue: (sale.netWeight || 0) * (sale.rate || 0),
                    costOfGoodsSold: sale.costOfGoodsSold
                }];
                sale.totalGoodsValue = (sale.netWeight || 0) * (sale.rate || 0);
                sale.totalQuantity = sale.quantity;
                sale.totalNetWeight = sale.netWeight;
            }

            if (!sale.items) sale.items = [];

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
                    paymentMode: 'Pending',
                    party: lt.transporterName || 'Unknown Transporter'
                });
            }
            
            const newLt = { ...lt, expenses: newExpenses };
            
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
