
import { z } from 'zod';
import type { MasterItem } from '@/lib/types';

export const purchaseSchema = (
    suppliers: MasterItem[], 
    agents: MasterItem[], 
    warehouses: MasterItem[], 
    transporters: MasterItem[],
    brokers: MasterItem[]
) => z.object({
  date: z.date({
    required_error: "Purchase date is required.",
  }),
  lotNumber: z.string().min(1, "Vakkal / Lot number is required."),
  locationId: z.string().min(1, "Location (Warehouse) is required.").refine((locationId) => warehouses.some((w) => w.id === locationId), {
    message: "Location does not exist.",
  }),
  supplierId: z.string().min(1, "Supplier is required.").refine((supplierId) => suppliers.some((s) => s.id === supplierId), {
    message: "Supplier does not exist.",
  }),
  agentId: z.string().optional().refine((agentId) => !agentId || agents.some((a) => a.id === agentId), {
    message: "Agent does not exist.",
  }),
  quantity: z.coerce.number().min(0.01, "Number of bags must be greater than 0."),
  netWeight: z.coerce.number().min(0.01, "Net weight must be greater than 0."),
  rate: z.coerce.number().min(0.01, "Rate per KG must be greater than 0."),
  // Expense and transport fields are removed from here.
});

export type PurchaseFormValues = z.infer<ReturnType<typeof purchaseSchema>>;
