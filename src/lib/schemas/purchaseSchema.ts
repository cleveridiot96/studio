import { z } from 'zod';

export const purchaseSchema = z.object({
  date: z.date({
    required_error: "Purchase date is required.",
  }),
  lotNumber: z.string().min(1, "Lot number is required."),
  locationId: z.string().min(1, "Location (Warehouse) is required."),
  supplierId: z.string().min(1, "Supplier is required."),
  agentId: z.string().optional(),
  itemName: z.string().min(1, "Item name is required."), // Commodity Name
  quantity: z.coerce.number().min(0.01, "Number of bags must be greater than 0."), // Number of Bags
  netWeight: z.coerce.number().min(0.01, "Net weight must be greater than 0."), // KG
  rate: z.coerce.number().min(0.01, "Rate per KG must be greater than 0."), // ₹/kg
  expenses: z.coerce.number().optional(), // Packaging, labour etc.
  transportRate: z.coerce.number().optional(), // Cost per kg or fixed
  transporterId: z.string().optional(),
  brokerId: z.string().optional(),
  brokerageType: z.enum(['Fixed', 'Percentage']).optional(),
  brokerageValue: z.coerce.number().optional(),
}).refine(data => {
  if (data.brokerId && (!data.brokerageType || data.brokerageValue === undefined || data.brokerageValue <=0)) {
    return false;
  }
  return true;
}, {
  message: "Brokerage type and value are required if a broker is selected.",
  path: ["brokerageValue"], // You can point to a general path or specific fields
}).refine(data => {
    if (data.brokerageType && (data.brokerageValue === undefined || data.brokerageValue <=0)) {
        return false;
    }
    return true;
}, {
    message: "Brokerage value is required if brokerage type is selected.",
    path: ["brokerageValue"],
});


export type PurchaseFormValues = z.infer<typeof purchaseSchema>;