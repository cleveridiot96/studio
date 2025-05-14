import { z } from 'zod';
import type { MasterItem, Broker } from '@/lib/types';

export const saleSchema = (customers: MasterItem[], transporters: MasterItem[], brokers: Broker[]) => z.object({
  date: z.date({
    required_error: "Sale date is required.",
  }),
  billNumber: z.string().min(1, "Bill number is required."),
  billAmount: z.coerce.number().optional(), // Optional, auto-calculated
  customerId: z.string().min(1, "Customer is required.").refine((customerId) => customers.some((c) => c.id === customerId), {
    message: "Customer does not exist.",
  }),
  lotNumber: z.string().min(1, "Vakkal / Lot number is required."), // From existing inventory
  // itemName: z.string().min(1, "Item name is required."), // Commodity Name - REMOVED
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
  brokerageAmount: z.coerce.number().optional(), // Manual or auto-calculated from broker's master data
  notes: z.string().optional(),
});

export type SaleFormValues = z.infer<ReturnType<typeof saleSchema>>;
