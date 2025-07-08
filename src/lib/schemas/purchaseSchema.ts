
import { z } from 'zod';
import type { MasterItem } from '@/lib/types';

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
    brokers: MasterItem[]
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
  
  // Expense Fields
  transportCharges: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().nonnegative("Charges must be non-negative").optional()),
  packingCharges: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().nonnegative("Charges must be non-negative").optional()),
  labourCharges: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().nonnegative("Charges must be non-negative").optional()),
  commissionType: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.enum(['Fixed', 'Percentage']).optional()
  ),
  commission: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().optional()),
  miscExpenses: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().nonnegative("Expenses must be non-negative").optional()),
}).superRefine((data, ctx) => {
    if (data.agentId) {
        if (data.commission !== undefined && data.commissionType === undefined) {
            ctx.addIssue({
                path: ["commissionType"],
                message: "Type is required when value is entered.",
            });
        }
        if (data.commissionType !== undefined && data.commission === undefined) {
            ctx.addIssue({
                path: ["commission"],
                message: "Value is required when type is selected.",
            });
        }
    }

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
