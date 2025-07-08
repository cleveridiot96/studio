
import { z } from 'zod';
import type { Warehouse, Transporter, LocationTransfer } from '@/lib/types';

interface AggregatedStockItemForSchema {
  lotNumber: string;
  locationId: string;
  currentBags: number;
  averageWeightPerBag: number; // Used for default weight calculation if not manually overridden
}

export const locationTransferSchema = (
    warehouses: Warehouse[],
    transporters: Transporter[],
    availableStock: AggregatedStockItemForSchema[],
    transferToEdit?: LocationTransfer | null
) => z.object({
  date: z.date({ required_error: "Transfer date is required." }),
  fromWarehouseId: z.string().min(1, "Source warehouse is required.")
    .refine(id => warehouses.some(w => w.id === id), { message: "Invalid source warehouse." }),
  toWarehouseId: z.string().min(1, "Destination warehouse is required.")
    .refine(id => warehouses.some(w => w.id === id), { message: "Invalid destination warehouse." }),
  transporterId: z.string().optional(),
  transportCharges: z.preprocess((val) => val === "" || val === null ? undefined : val, z.coerce.number().optional()),
  packingCharges: z.preprocess((val) => val === "" || val === null ? undefined : val, z.coerce.number().optional()),
  labourCharges: z.preprocess((val) => val === "" || val === null ? undefined : val, z.coerce.number().optional()),
  miscExpenses: z.preprocess((val) => val === "" || val === null ? undefined : val, z.coerce.number().optional()),
  notes: z.string().optional(),
  items: z.array(
    z.object({
        originalLotNumber: z.string().min(1, "Vakkal/Lot number is required."),
        bagsToTransfer: z.coerce.number({required_error: "Bags are required."}).min(0.01, "Bags must be > 0."),
        netWeightToTransfer: z.coerce.number({required_error: "Net Wt. is required."}).min(0.01, "Net weight must be > 0."),
        grossWeightToTransfer: z.coerce.number({required_error: "Gross Wt. is required."}).min(0.01, "Gross weight must be > 0."),
    })
  ).min(1, "At least one item must be added to the transfer."),
}).superRefine((data, ctx) => {
  // Prevent transfer to the same warehouse
  if (data.fromWarehouseId && data.toWarehouseId && data.fromWarehouseId === data.toWarehouseId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Source and destination cannot be the same.",
      path: ["toWarehouseId"],
    });
  }

  // Validate items
  const lotNumbers = new Set<string>();
  data.items.forEach((item, index) => {
    // Check for duplicate lots within the same form
    if (item.originalLotNumber) {
        if (lotNumbers.has(item.originalLotNumber)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Duplicate vakkal. Consolidate into one line.`,
                path: ["items", index, "originalLotNumber"],
            });
        }
        lotNumbers.add(item.originalLotNumber);
    }

    const stockInfo = availableStock.find(
      s => s.lotNumber === item.originalLotNumber && s.locationId === data.fromWarehouseId
    );
    
    let availableBagsInStock = stockInfo?.currentBags || 0;

    // If editing this transfer, temporarily add back the transferred bags to the available stock for validation
    if (transferToEdit && transferToEdit.fromWarehouseId === data.fromWarehouseId && item.originalLotNumber) {
        const originalItemInTransfer = transferToEdit.items.find(i => i.originalLotNumber === item.originalLotNumber);
        if (originalItemInTransfer) {
            availableBagsInStock += originalItemInTransfer.bagsToTransfer;
        }
    }

    if (!stockInfo && availableBagsInStock <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Lot "${item.originalLotNumber}" not found or has no stock in the source warehouse.`,
            path: ["items", index, "originalLotNumber"],
        });
    } else {
      if (item.bagsToTransfer > availableBagsInStock) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Bags (${item.bagsToTransfer}) exceed available stock (${availableBagsInStock}).`,
          path: ["items", index, "bagsToTransfer"],
        });
      }
    }
  });
});

export type LocationTransferFormValues = z.infer<ReturnType<typeof locationTransferSchema>>;

  