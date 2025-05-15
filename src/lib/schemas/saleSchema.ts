
import { z } from 'zod';
import type { MasterItem, Purchase } from '@/lib/types';

export const saleSchema = (
    customers: MasterItem[], 
    transporters: MasterItem[], 
    brokers: MasterItem[], 
    inventory: Purchase[] // Inventory items are based on Purchase type
) => z.object({
  date: z.date({
    required_error: "Sale date is required.",
  }),
  billNumber: z.string().min(1, "Bill number is required."),
  billAmount: z.coerce.number().optional(), 
  customerId: z.string().min(1, "Customer is required.").refine((customerId) => customers.some((c) => c.id === customerId && c.type === 'Customer'), { // Ensure it's a customer
    message: "Customer does not exist or is not of type Customer.",
  }),
  lotNumber: z.string().min(1, "Vakkal / Lot number is required.").refine((lotNum) => inventory.some((item) => item.lotNumber === lotNum), {
    message: "Lot number does not exist in inventory.",
  }),
  quantity: z.coerce.number().min(0.01, "Number of bags must be greater than 0."),
  netWeight: z.coerce.number().min(0.01, "Net weight (kg) must be greater than 0."),
  rate: z.coerce.number().min(0.01, "Sale price (₹/kg) must be greater than 0."),
  transporterId: z.string().optional().refine((transporterId) => !transporterId || transporters.some((t) => t.id === transporterId && t.type === 'Transporter'), {
    message: "Transporter does not exist or is not of type Transporter.",
  }),
  transportCost: z.coerce.number().optional(),
  brokerId: z.string().optional().refine((brokerId) => !brokerId || brokers.some((b) => b.id === brokerId && b.type === 'Broker'), {
    message: "Broker does not exist or is not of type Broker.",
  }),
  brokerageType: z.enum(['Fixed', 'Percentage']).optional(),
  brokerageAmount: z.coerce.number().optional(), // This is the rate/value for brokerage
  notes: z.string().optional(),
}).refine(data => {
    // If a broker is selected, brokerage type and amount must be provided
    if (data.brokerId && (!data.brokerageType || data.brokerageAmount === undefined || data.brokerageAmount < 0 )) {
      return false;
    }
    return true;
  }, {
    message: "Brokerage type and a valid brokerage value (non-negative) are required if a broker is selected.",
    path: ["brokerageAmount"], // Or a more general path like "brokerId" or "brokerageType"
  }).refine(data => {
    if (data.brokerageType && (data.brokerageAmount === undefined || data.brokerageAmount < 0)) {
        return false;
    }
    return true;
  }, {
    message: "Brokerage value is required and must be non-negative if brokerage type is selected.",
    path: ["brokerageAmount"],
  }).refine(data => { // Validation for quantity and netWeight against selected lot
    if (data.lotNumber) {
        const selectedLot = inventory.find(lot => lot.lotNumber === data.lotNumber);
        if (selectedLot) {
            if (data.quantity > selectedLot.quantity) {
                return false; // Sale quantity exceeds available lot quantity
            }
            if (data.netWeight > selectedLot.netWeight) {
                return false; // Sale net weight exceeds available lot net weight
            }
        } else {
            return false; // Should be caught by earlier refine, but defensive
        }
    }
    return true;
  }, (data) => { // Custom error messages for lot quantity/weight
    const selectedLot = inventory.find(lot => lot.lotNumber === data.lotNumber);
    let message = "Invalid quantity or weight for the selected lot.";
    if (selectedLot) {
        if (data.quantity > selectedLot.quantity) {
            message = `Number of bags cannot exceed available stock for lot ${data.lotNumber} (Available: ${selectedLot.quantity}).`;
            return { message, path: ["quantity"] };
        }
        if (data.netWeight > selectedLot.netWeight) {
            message = `Net weight cannot exceed available stock for lot ${data.lotNumber} (Available: ${selectedLot.netWeight}kg).`;
            return { message, path: ["netWeight"] };
        }
    }
    return {message, path: ["lotNumber"]}; // Fallback path
});

export type SaleFormValues = z.infer<ReturnType<typeof saleSchema>>;
