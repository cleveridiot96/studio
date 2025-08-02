
import { z } from 'zod';
import type { MasterItem, Sale } from '@/lib/types';
import type { AggregatedStockItemForForm } from '@/components/app/sales/SalesClient';
import { expenseItemSchema } from './expenseItemSchema';

const saleItemSchema = (availableStock: AggregatedStockItemForForm[]) => z.object({
  lotNumber: z.string().min(1, "Vakkal/Lot is required.").refine(lotNum => availableStock.some(item => item.lotNumber === lotNum), { message: "Lot not in stock." }),
  quantity: z.coerce.number({required_error: "Bags are required."}).min(0.01, "Bags must be > 0."),
  netWeight: z.coerce.number({required_error: "Net Wt. is required."}).min(0.01, "Net weight must be > 0."),
  rate: z.coerce.number({required_error: "Rate is required."}).min(0.01, "Rate per KG must be > 0."),
});

export const saleSchema = (
    customers: MasterItem[],
    transporters: MasterItem[],
    brokers: MasterItem[],
    availableStock: AggregatedStockItemForForm[],
    existingSales: Sale[],
    currentSaleIdToEdit?: string
) => z.object({
  date: z.date({ required_error: "Sale date is required." }),
  billNumber: z.string().optional(),
  customerId: z.string().min(1, "Customer is required.").refine(id => customers.some(c => c.id === id), { message: "Invalid customer." }),
  brokerId: z.string().optional().refine(id => !id || brokers.some(b => b.id === id), { message: "Invalid broker." }),
  transporterId: z.string().optional().refine(id => !id || transporters.some(t => t.id === t.id), { message: "Invalid transporter." }),
  
  items: z.array(saleItemSchema(availableStock)).min(1, "At least one sale item is required."),

  expenses: z.array(expenseItemSchema).optional(),
  
  notes: z.string().optional(),
  
  // New fields for billing that don't affect profit
  cbAmount: z.coerce.number().optional(),
  balanceAmount: z.coerce.number().optional(),

}).superRefine((data, ctx) => {
  // Validate total quantity for each lot doesn't exceed available stock
  const lotQuantities = new Map<string, number>();
  data.items.forEach(item => {
    if (item.quantity) {
      lotQuantities.set(item.lotNumber, (lotQuantities.get(item.lotNumber) || 0) + item.quantity);
    }
  });

  for (const [lotNumber, totalQuantity] of lotQuantities.entries()) {
    const stockInfo = availableStock.find(s => s.lotNumber === lotNumber);
    let availableBagsInStock = stockInfo?.currentBags || 0;
    
    if (currentSaleIdToEdit) {
        const originalSale = existingSales.find(s => s.id === currentSaleIdToEdit);
        if(originalSale) {
            const originalItemQuantity = originalSale.items.filter(i => i.lotNumber === lotNumber).reduce((sum, i) => sum + i.quantity, 0);
            availableBagsInStock += originalItemQuantity;
        }
    }

    if (totalQuantity > availableBagsInStock) {
      const itemIndex = data.items.findIndex(item => item.lotNumber === lotNumber);
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total bags (${totalQuantity}) for ${lotNumber} exceed available stock (${Math.round(availableBagsInStock)}).`,
        path: ["items", itemIndex, "quantity"],
      });
    }
  }
});

export type SaleFormValues = z.infer<ReturnType<typeof saleSchema>>;
