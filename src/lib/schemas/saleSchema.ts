
import { z } from 'zod';
import type { MasterItem, Purchase, Sale } from '@/lib/types';

// Helper to calculate available stock for a lot
const getLotAvailableStock = (
  lotNumber: string,
  allPurchases: Purchase[],
  allSales: Sale[],
  currentSaleId?: string // To exclude the current sale being edited from stock calculation
): { availableBags: number; availableWeight: number, purchaseRate: number } => {
  let purchasedBags = 0;
  let purchasedWeight = 0;
  let firstPurchaseRate = 0;

  allPurchases.forEach(p => {
    if (p.lotNumber === lotNumber) {
      purchasedBags += p.quantity;
      purchasedWeight += p.netWeight;
      if (firstPurchaseRate === 0) firstPurchaseRate = p.rate;
    }
  });

  let soldBags = 0;
  let soldWeight = 0;
  allSales.forEach(s => {
    if (s.id !== currentSaleId && s.lotNumber === lotNumber) { // Exclude current sale if editing
      soldBags += s.quantity;
      soldWeight += s.netWeight;
    }
  });
  return {
    availableBags: purchasedBags - soldBags,
    availableWeight: purchasedWeight - soldBags * (purchasedWeight > 0 && purchasedBags > 0 ? purchasedWeight/purchasedBags : 50), // Estimate if direct weight not available
    purchaseRate: firstPurchaseRate
  };
};


export const saleSchema = (
    customers: MasterItem[],
    transporters: MasterItem[],
    brokers: MasterItem[],
    inventoryLots: Purchase[],
    existingSales: Sale[],
    currentSaleIdToEdit?: string
) => z.object({
  date: z.date({
    required_error: "Sale date is required.",
  }),
  billNumber: z.string().optional(),
  cutAmount: z.coerce.number().optional(), // Renamed from manualBillAmount
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
  brokerageValue: z.coerce.number().optional(),
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
    if (data.cutBill && data.cutAmount !== undefined && data.cutAmount < 0) {
        return false; // Cut amount cannot be negative
    }
    if (data.cutBill && data.cutAmount !== undefined && data.cutAmount > goodsValue) {
        return false; // Cut amount cannot be greater than goods value
    }
    return true;
  }, {
    message: "Cut Amount must be a positive value and cannot exceed the Actual Goods Value.",
    path: ["cutAmount"],
  }).refine(data => {
    if (data.lotNumber) {
        const { availableBags, availableWeight } = getLotAvailableStock(data.lotNumber, inventoryLots, existingSales, currentSaleIdToEdit);
        if (data.quantity > availableBags) {
            return false;
        }
        // Note: Available weight calculation in getLotAvailableStock is an estimate,
        // so a strict check here might be too restrictive if net weights vary significantly.
        // For now, primary validation on bags.
        // if (data.netWeight > availableWeight) {
        //     return false;
        // }
    }
    return true;
  }, (data) => {
    let message = "Invalid quantity or weight for the selected lot.";
    let path: ("quantity" | "netWeight" | "lotNumber")[] = ["lotNumber"];

    if (data.lotNumber) {
        const { availableBags } = getLotAvailableStock(data.lotNumber, inventoryLots, existingSales, currentSaleIdToEdit);
        if (data.quantity > availableBags) {
            message = `Bags (${data.quantity}) exceed available stock for lot ${data.lotNumber} (Available: ${availableBags}).`;
            path = ["quantity"];
        }
        // Removed strict availableWeight check due to potential variance
    }
    return { message, path };
});

export type SaleFormValues = z.infer<ReturnType<typeof saleSchema>>;
