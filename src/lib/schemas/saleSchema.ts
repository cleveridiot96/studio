import { z } from 'zod';

export const saleSchema = z.object({
  date: z.date({
    required_error: "Sale date is required.",
  }),
  billNumber: z.string().min(1, "Bill number is required."),
  billAmount: z.coerce.number().optional(), // Optional, auto-calculated
  customerId: z.string().min(1, "Customer is required."),
  lotNumber: z.string().min(1, "Lot number is required."), // From existing inventory
  itemName: z.string().min(1, "Item name is required."), // Commodity Name
  quantity: z.coerce.number().min(0.01, "Number of bags must be greater than 0."), // Bags
  netWeight: z.coerce.number().min(0.01, "Net weight (kg) must be greater than 0."),
  rate: z.coerce.number().min(0.01, "Sale price (₹/kg) must be greater than 0."),
  transporterId: z.string().optional(),
  transportCost: z.coerce.number().optional(),
  brokerId: z.string().optional(),
  brokerageAmount: z.coerce.number().optional(), // Manual or auto-calculated from broker's master data
  notes: z.string().optional(),
});

export type SaleFormValues = z.infer<typeof saleSchema>;