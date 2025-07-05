
import { z } from 'zod';
import type { MasterItem, Purchase, Sale } from '@/lib/types';

// This is a type for the aggregated stock data passed to the schema
interface AggregatedStockItemForSchema {
  lotNumber: string;
  currentBags: number;
}

export const saleSchema = (
    customers: MasterItem[],
    transporters: MasterItem[],
    brokers: MasterItem[],
    availableStock: AggregatedStockItemForSchema[], // Changed from inventoryLots: Purchase[]
    existingSales: Sale[],
    currentSaleIdToEdit?: string
) => z.object({
  date: z.date({
    required_error: "Sale date is required.",
  }),
  billNumber: z.string().optional(),
  cutBill: z.boolean().optional().default(false),
  cutAmount: z.coerce.number().optional(),
  customerId: z.string().min(1, "Customer is required.").refine((customerId) => customers.some((c) => c.id === customerId && c.type === 'Customer'), {
    message: "Customer does not exist or is not of type Customer.",
  }),
  lotNumber: z.string().min(1, "Vakkal / Lot number is required.").refine((lotNum) => availableStock.some((item) => item.lotNumber === lotNum), {
    message: "Lot number does not exist in available stock.",
  }),
  quantity: z.coerce.number().min(0.01, "Number of bags must be greater than 0."),
  netWeight: z.coerce.number().min(0.01, "Net weight (kg) must be greater than 0."),
  rate: z.coerce.number().min(0.01, "Sale price (₹/kg) must be greater than 0."),
  transporterId: z.string().optional().refine((transporterId) => !transporterId || transporters.some((t) => t.id === transporterId && t.type === 'Transporter'), {
    message: "Transporter does not exist or is not of type Transporter.",
  }),
  transportCost: z.coerce.number().optional().default(0),
  packingCost: z.coerce.number().optional(),
  labourCost: z.coerce.number().optional(),
  brokerId: z.string().optional().refine((brokerId) => !brokerId || brokers.some((b) => b.id === brokerId && b.type === 'Broker'), {
    message: "Broker does not exist or is not of type Broker.",
  }),
  brokerageType: z.enum(['Fixed', 'Percentage']).optional(),
  brokerageValue: z.coerce.number().optional(),
  extraBrokeragePerKg: z.coerce.number().optional(),
  notes: z.string().optional(),
  calculatedBrokerageCommission: z.coerce.number().optional(),
}).refine(data => {
    if (data.brokerId && (!data.brokerageType || data.brokerageValue === undefined || data.brokerageValue < 0 )) {
      return false;
    }
    return true;
  }, {
    message: "Brokerage type and a valid brokerage value (non-negative) are required if a broker is selected.",
    path: ["brokerageValue"],
  }).refine(data => {
    if (data.brokerageType && (data.brokerageValue === undefined || data.brokerageValue < 0)) {
        return false;
    }
    return true;
  }, {
    message: "Brokerage value is required and must be non-negative if brokerage type is selected.",
    path: ["brokerageValue"],
  }).refine(data => {
    const goodsValue = data.netWeight * data.rate;
    if (data.cutBill && data.cutAmount === undefined) {
      return false;
    }
    if (data.cutBill && data.cutAmount !== undefined && data.cutAmount < 0) {
        return false;
    }
    if (data.cutBill && data.cutAmount !== undefined && data.cutAmount > goodsValue) {
        return false;
    }
    return true;
  }, {
    message: "If 'Cut Bill' is checked, a valid cut amount (positive, not exceeding goods value) is required.",
    path: ["cutAmount"],
  }).superRefine((data, ctx) => {
    if (data.lotNumber) {
        const stockInfo = availableStock.find(s => s.lotNumber === data.lotNumber);
        const availableBagsInStock = stockInfo?.currentBags || 0;
        
        let quantityFromThisSaleInDb = 0;
        if (currentSaleIdToEdit) {
            const originalSale = existingSales.find(s => s.id === currentSaleIdToEdit);
            if (originalSale && originalSale.lotNumber === data.lotNumber) {
                quantityFromThisSaleInDb = originalSale.quantity;
            }
        }
        
        const maxAllowedQuantity = availableBagsInStock + quantityFromThisSaleInDb;

        if (data.quantity > maxAllowedQuantity) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Bags (${data.quantity}) exceed available stock for lot ${data.lotNumber} (Available: ${availableBagsInStock}).`,
                path: ["quantity"],
            });
        }
    }
});


export type SaleFormValues = z.infer<ReturnType<typeof saleSchema>>;
