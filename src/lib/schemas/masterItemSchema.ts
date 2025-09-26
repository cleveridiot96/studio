
import { z } from 'zod';

const TABS_CONFIG: { value: string; label: string; hasCommission: boolean; hasBalance: boolean; }[] = [
  { value: "Customer", label: "Customer", hasCommission: false, hasBalance: true },
  { value: "Supplier", label: "Supplier", hasCommission: false, hasBalance: true },
  { value: "Agent", label: "Agent", hasCommission: true, hasBalance: true },
  { value: "Transporter", label: "Transporter", hasCommission: false, hasBalance: true },
  { value: "Broker", label: "Broker", hasCommission: true, hasBalance: true },
  { value: "Warehouse", label: "Warehouse", hasCommission: false, hasBalance: false },
  { value: "Expense", label: "Expense", hasCommission: false, hasBalance: false },
];

export const masterItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  type: z.enum(["Customer", "Supplier", "Agent", "Transporter", "Broker", "Warehouse", "Expense"]),
  commission: z.coerce.number().optional(),
  commissionType: z.enum(['Percentage', 'Fixed']).optional(),
  openingBalance: z.coerce.number().optional(),
  openingBalanceType: z.enum(['Dr', 'Cr']).optional(),
}).refine(data => {
  const config = TABS_CONFIG.find(t => t.value === data.type);
  if (config?.hasCommission && (data.commission !== undefined && data.commission >= 0)) {
    // If commission has a value, its type must also be selected
    if (!data.commissionType) return false;
  }
  return true;
}, {
  message: "Commission type is required when a value is entered.",
  path: ["commissionType"],
}).refine(data => {
  // If opening balance has a value, its type must also be selected
  if (data.openingBalance !== undefined && data.openingBalance > 0 && !data.openingBalanceType) {
    return false;
  }
  return true;
}, {
  message: "Please select the balance type (To Receive or To Pay).",
  path: ["openingBalanceType"],
});


export type MasterItemFormValues = z.infer<typeof masterItemSchema>;
