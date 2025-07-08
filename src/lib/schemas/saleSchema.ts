
import { z } from 'zod';
import type { MasterItem, Sale } from '@/lib/types';

interface AggregatedStockItemForSchema {
  lotNumber: string;
  currentBags: number;
}

const saleItemSchema = (availableStock: AggregatedStockItemForSchema[]) => z.object({
  lotNumber: z.string().min(1, "Vakkal/Lot is required.").refine(lotNum => availableStock.some(item => item.lotNumber === lotNum), { message: "Lot not in stock." }),
  quantity: z.coerce.number({required_error: "Bags are required."}).min(0.01, "Bags must be > 0."),
  netWeight: z.coerce.number({required_error: "Net Wt. is required."}).min(0.01, "Net weight must be > 0."),
  rate: z.coerce.number({required_error: "Rate is required."}).min(0.01, "Rate per KG must be > 0."),
});

export const saleSchema = (
    customers: MasterItem[],
    transporters: MasterItem[],
    brokers: MasterItem[],
    availableStock: AggregatedStockItemForSchema[],
    existingSales: Sale[],
    currentSaleIdToEdit?: string
) => z.object({
  date: z.date({ required_error: "Sale date is required." }),
  customerId: z.string().min(1, "Customer is required.").refine(id => customers.some(c => c.id === id), { message: "Invalid customer." }),
  brokerId: z.string().optional().refine(id => !id || brokers.some(b => b.id === id), { message: "Invalid broker." }),
  
  items: z.array(saleItemSchema(availableStock)).min(1, "At least one sale item is required."),

  isCB: z.boolean().optional().default(false),
  cbAmount: z.coerce.number().optional(),
  billNumber: z.string().optional(),

  transporterId: z.string().optional().refine(id => !id || transporters.some(t => t.id === id), { message: "Invalid transporter." }),
  transportCost: z.coerce.number().optional(),
  packingCost: z.coerce.number().optional(),
  labourCost: z.coerce.number().optional(),
  
  brokerageType: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.enum(['Fixed', 'Percentage']).optional()
  ),
  brokerageValue: z.coerce.number().optional(),
  extraBrokeragePerKg: z.coerce.number().optional(),
  
  notes: z.string().optional(),
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
    
    // If editing, add back the quantity of the lot from the original sale to allow for correct validation
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
        message: `Total bags (${totalQuantity}) for ${lotNumber} exceed available stock (${availableBagsInStock}).`,
        path: ["items", itemIndex, "quantity"],
      });
    }
  }

  // CB Amount validation
  if (data.isCB) {
    if (data.cbAmount === undefined || data.cbAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CB amount is required and must be positive if 'CB' is checked.",
        path: ["cbAmount"],
      });
    } else {
        const totalGoodsValue = data.items.reduce((sum, item) => sum + ((item.netWeight || 0) * (item.rate || 0)), 0);
        if (data.cbAmount > totalGoodsValue) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `CB amount cannot exceed total goods value of ₹${totalGoodsValue.toFixed(2)}.`,
                path: ["cbAmount"],
            });
        }
    }
  }

  // Brokerage validation, only if a broker is actually selected.
  if (data.brokerId) {
    if (data.brokerageValue && data.brokerageValue > 0 && !data.brokerageType) {
        ctx.addIssue({
            path: ["brokerageType"],
            message: "Type is required when a value is entered.",
        });
    }
    if (data.brokerageType && (data.brokerageValue === undefined || data.brokerageValue <= 0)) {
        ctx.addIssue({
            path: ["brokerageValue"],
            message: "A positive value is required for the selected type.",
        });
    }
  }
});

export type SaleFormValues = z.infer<ReturnType<typeof saleSchema>>;
