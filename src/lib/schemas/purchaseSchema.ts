
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
  expenses: z.coerce.number().optional(),
  transportRatePerKg: z.coerce.number().optional(), // Changed from transportRate
  transporterId: z.string().optional().refine((transporterId) => !transporterId || transporters.some((t) => t.id === transporterId), {
    message: "Transporter does not exist.",
  }),
  brokerId: z.string().optional().refine((brokerId) => !brokerId || brokers.some((b) => b.id === brokerId), {
    message: "Broker does not exist.",
  }),
  brokerageType: z.enum(['Fixed', 'Percentage']).optional(),
  brokerageValue: z.coerce.number().optional(),
}).refine(data => {
    if (data.brokerId && (!data.brokerageType || data.brokerageValue === undefined || data.brokerageValue < 0)) {
      return false;
    }
    return true;
  }, {
    message: "If a Broker is selected, Brokerage Type and a valid Brokerage Value (non-negative) are required.",
    path: ["brokerageValue"], 
  }).refine(data => {
    if (data.brokerageType && (data.brokerageValue === undefined || data.brokerageValue < 0)) {
        return false;
    }
    return true;
  }, {
    message: "Brokerage Value is required and must be non-negative if Brokerage Type is selected.",
    path: ["brokerageValue"],
  });

export type PurchaseFormValues = z.infer<ReturnType<typeof purchaseSchema>>;
