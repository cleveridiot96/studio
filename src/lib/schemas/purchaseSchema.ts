
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
  transportCharges: z.coerce.number().nonnegative("Charges must be non-negative").optional(),
  packingCharges: z.coerce.number().nonnegative("Charges must be non-negative").optional(),
  labourCharges: z.coerce.number().nonnegative("Charges must be non-negative").optional(),
  brokerageType: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.enum(['Fixed', 'Percentage']).optional()
  ),
  brokerageValue: z.coerce.number().optional(),
  miscExpenses: z.coerce.number().nonnegative("Expenses must be non-negative").optional(),
}).superRefine((data, ctx) => {
    // If an agent is selected, then brokerage fields can be validated if needed
    if (data.agentId) {
        const valueExists = data.brokerageValue !== undefined && data.brokerageValue > 0;
        const typeExists = !!data.brokerageType;

        if (valueExists && !typeExists) {
            ctx.addIssue({
                path: ["brokerageType"],
                message: "Type is required when value is entered.",
            });
        }
        if (typeExists && !valueExists) {
            ctx.addIssue({
                path: ["brokerageValue"],
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
          message: `Duplicate. Try adding '/A' or similar.`,
          path: ["items", index, "lotNumber"],
        });
      }
      if (upperCaseLotNumber) {
        lotNumbers.add(upperCaseLotNumber);
      }
    });
  });

export type PurchaseFormValues = z.infer<ReturnType<typeof purchaseSchema>>;
