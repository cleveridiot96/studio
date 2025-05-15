import { z } from 'zod';
import type { MasterItem } from '@/lib/types';

export const saleSchema = (customers: MasterItem[], transporters: MasterItem[], brokers: MasterItem[], inventory: { id: string; vakkalNumber: string }[]) => z.object({
  date: z.date({
    required_error: "Sale date is required.",
  }),
  billNumber: z.string().min(1, "Bill number is required."),
  billAmount: z.coerce.number().optional(), // Optional, auto-calculated
  customerId: z.string().min(1, "Customer is required.").refine((customerId) => customers.some((c) => c.id === customerId), {
    message: "Customer does not exist.",
  }),
  lotNumber: z.string().min(1, "Vakkal / Lot number is required.").refine((lotNumber) => inventory.some((item) => item.vakkalNumber === lotNumber), {
    message: "Lot number does not exist in inventory.",
  }), // From existing inventory
  quantity: z.coerce.number().min(0.01, "Number of bags must be greater than 0."), // Bags
  netWeight: z.coerce.number().min(0.01, "Net weight (kg) must be greater than 0."),
  rate: z.coerce.number().min(0.01, "Sale price (₹/kg) must be greater than 0."),
  transporterId: z.string().optional().refine((transporterId) => !transporterId || transporters.some((t) => t.id === transporterId), {
    message: "Transporter does not exist.",
  }),
  transportCost: z.coerce.number().optional(),
  brokerId: z.string().optional().refine((brokerId) => !brokerId || brokers.some((b) => b.id === brokerId), {
    message: "Broker does not exist.",
  }),
  brokerageType: z.enum(['Fixed', 'Percentage']).optional(),
  brokerageAmount: z.coerce.number().optional(),
  notes: z.string().optional(),
}).refine(data => {
  if (data.brokerId && (!data.brokerageType || data.brokerageAmount === undefined )) {
    return false;
  }
  return true;
}, {
  message: "Brokerage type and value are required if a broker is selected.",
  path: ["brokerageAmount"],
}).refine(data => {
    if (data.brokerageType && (data.brokerageAmount === undefined )) {
        return false;
    }
    return true;
}, {
    message: "Brokerage value is required if brokerage type is selected.",
    path: ["brokerageAmount"],
});

export type SaleFormValues = z.infer<ReturnType<typeof saleSchema>>;
