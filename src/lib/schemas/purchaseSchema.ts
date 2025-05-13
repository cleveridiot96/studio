import { z } from 'zod';

export const purchaseSchema = z.object({
  date: z.date({
    required_error: "Purchase date is required.",
  }),
  lotNumber: z.string().min(1, "Lot number is required."),
  supplierId: z.string().min(1, "Supplier is required."),
  agentId: z.string().optional(),
  itemName: z.string().min(1, "Item name is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0."),
  netWeight: z.coerce.number().min(0.01, "Net weight must be greater than 0."),
  rate: z.coerce.number().min(0.01, "Rate must be greater than 0."),
  warehouseId: z.string().min(1, "Warehouse is required."),
  transporterId: z.string().optional(),
});

export type PurchaseFormValues = z.infer<typeof purchaseSchema>;
