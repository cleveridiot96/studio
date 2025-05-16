
import { z } from 'zod';
import type { MasterItem, Purchase } from '@/lib/types';

// Helper to calculate available stock for a lot (sum of purchases minus sum of sales for that lot)
// This is a simplified version. A more robust solution would query aggregated inventory.
const getLotAvailableStock = (lotNumber: string, allPurchases: Purchase[], allSales: Sale[]): { availableBags: number; availableWeight: number, purchaseRate: number } => {
  let purchasedBags = 0;
  let purchasedWeight = 0;
  let firstPurchaseRate = 0; // To store the rate of the first purchase of this lot for profit calc

  allPurchases.forEach(p => {
    if (p.lotNumber === lotNumber) {
      purchasedBags += p.quantity;
      purchasedWeight += p.netWeight;
      if (firstPurchaseRate === 0) firstPurchaseRate = p.rate; // Assuming simple FIFO for cost basis
    }
  });

  let soldBags = 0;
  let soldWeight = 0;
  allSales.forEach(s => {
    if (s.lotNumber === lotNumber) {
      soldBags += s.quantity;
      soldWeight += s.netWeight;
    }
  });
  return { 
    availableBags: purchasedBags - soldBags, 
    availableWeight: purchasedWeight - soldWeight,
    purchaseRate: firstPurchaseRate
  };
};


export const saleSchema = (
    customers: MasterItem[], 
    transporters: MasterItem[], 
    brokers: MasterItem[], 
    inventoryLots: Purchase[], // Source of lot numbers and their original details
    existingSales: Sale[] // Needed to calculate current available stock for a lot
) => z.object({
  date: z.date({
    required_error: "Sale date is required.",
  }),
  billNumber: z.string().optional(),
  billAmount: z.coerce.number().optional(), 
  cutBill: z.boolean().optional().default(false),
  customerId: z.string().min(1, "Customer is required.").refine((customerId) => customers.some((c) => c.id === customerId && c.type === 'Customer'), {
    message: "Customer does not exist or is not of type Customer.",
  }),
  lotNumber: z.string().min(1, "Vakkal / Lot number is required.").refine((lotNum) => inventoryLots.some((item) => item.lotNumber === lotNum), {
    message: "Lot number does not exist in purchases.",
  }),
  quantity: z.coerce.number().min(0.01, "Number of bags must be greater than 0."),
  netWeight: z.coerce.number().min(0.01, "Net weight (kg) must be greater than 0."),
  rate: z.coerce.number().min(0.01, "Sale price (₹/kg) must be greater than 0."),
  transporterId: z.string().optional().refine((transporterId) => !transporterId || transporters.some((t) => t.id === transporterId && t.type === 'Transporter'), {
    message: "Transporter does not exist or is not of type Transporter.",
  }),
  transportCost: z.coerce.number().optional().default(0),
  brokerId: z.string().optional().refine((brokerId) => !brokerId || brokers.some((b) => b.id === brokerId && b.type === 'Broker'), {
    message: "Broker does not exist or is not of type Broker.",
  }),
  brokerageType: z.enum(['Fixed', 'Percentage']).optional(),
  brokerageAmount: z.coerce.number().optional().default(0), // This is the value (e.g. 2 for 2% or 500 for fixed)
  notes: z.string().optional(),
}).refine(data => {
    if (data.brokerId && (!data.brokerageType || data.brokerageAmount === undefined || data.brokerageAmount < 0 )) {
      return false;
    }
    return true;
  }, {
    message: "Brokerage type and a valid brokerage value (non-negative) are required if a broker is selected.",
    path: ["brokerageAmount"],
  }).refine(data => {
    if (data.brokerageType && (data.brokerageAmount === undefined || data.brokerageAmount < 0)) {
        return false;
    }
    return true;
  }, {
    message: "Brokerage value is required and must be non-negative if brokerage type is selected.",
    path: ["brokerageAmount"],
  }).refine(data => {
    if (data.lotNumber) {
        const { availableBags, availableWeight } = getLotAvailableStock(data.lotNumber, inventoryLots, existingSales);
        if (data.quantity > availableBags) {
            return false; 
        }
        if (data.netWeight > availableWeight) {
            return false; 
        }
    }
    return true;
  }, (data) => { 
    let message = "Invalid quantity or weight for the selected lot.";
    let path: ("quantity" | "netWeight" | "lotNumber")[] = ["lotNumber"];

    if (data.lotNumber) {
        const { availableBags, availableWeight } = getLotAvailableStock(data.lotNumber, inventoryLots, existingSales);
        if (data.quantity > availableBags) {
            message = `Bags cannot exceed available stock for lot ${data.lotNumber} (Available: ${availableBags}).`;
            path = ["quantity"];
        } else if (data.netWeight > availableWeight) {
            message = `Net weight cannot exceed available stock for lot ${data.lotNumber} (Available: ${availableWeight}kg).`;
            path = ["netWeight"];
        }
    }
    return { message, path };
});

export type SaleFormValues = z.infer<ReturnType<typeof saleSchema>>;

// Re-export Sale type for convenience if needed elsewhere, though it's usually in types.ts
export type { Sale } from '@/lib/types';
