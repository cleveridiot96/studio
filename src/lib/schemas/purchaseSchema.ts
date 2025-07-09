
import { z } from 'zod';
import type { MasterItem } from '@/lib/types';
import { expenseItemSchema } from './expenseItemSchema';

const purchaseItemSchema = z.object({
    lotNumber: z.string().min(1, "Vakkal/Lot number is required."),
    quantity: z.coerce.number({required_error: "Bags are required."}).min(0.01, "Bags must be > 0."),
    netWeight: z.coerce.number({required_error: "Net Wt. is required."}).min(0.01, "Net weight must be > 0."),
    rate: z.coerce.number({required_error: "Rate is required."}).min(0.01, "Rate per KG must be > 0."),
});

export const purchaseSchema = (
    suppliers: MasterItem[], 
    agents: MasterItem[], 
    warehouses: MasterItem[], 
    transporters: MasterItem[],
    expenses: MasterItem[]
) => z.object({
  date: z.date({
    required_error: "Purchase date is required.",
  }),
  locationId: z.string().min(1, "Location (Warehouse) is required.").refine((locationId) => warehouses.some((w) => w.id === locationId), {
    message: "Location does not exist.",
  }),
  supplierId: z.string().min(1, "Supplier is required.").refine((supplierId) => suppliers.some((s) => s.id === supplierId), {
    message: "Supplier does not exist.",
  }),
  agentId: z.string().optional().refine((agentId) => !agentId || agents.some((a) => a.id === agentId), {
    message: "Agent does not exist.",
  }),
  transporterId: z.string().optional().refine((transporterId) => !transporterId || transporters.some((t) => t.id === transporterId), {
    message: "Transporter does not exist.",
  }),

  items: z.array(purchaseItemSchema).min(1, "At least one purchase item is required."),
  
  expenses: z.array(expenseItemSchema).optional(),

}).superRefine((data, ctx) => {
    const lotNumbers = new Set<string>();
    data.items.forEach((item, index) => {
      const upperCaseLotNumber = item.lotNumber.toUpperCase().trim();
      if (upperCaseLotNumber && lotNumbers.has(upperCaseLotNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate. Try adding a suffix like '/A' or '/B'.`,
          path: ["items", index, "lotNumber"],
        });
      }
      if (upperCaseLotNumber) {
        lotNumbers.add(upperCaseLotNumber);
      }
    });
  });

export type PurchaseFormValues = z.infer<ReturnType<typeof purchaseSchema>>;
