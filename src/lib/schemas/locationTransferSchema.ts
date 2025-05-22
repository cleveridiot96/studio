
import { z } from 'zod';
import type { Warehouse } from '@/lib/types';

interface AggregatedStockItemForSchema {
  lotNumber: string;
  locationId: string;
  currentBags: number;
  averageWeightPerBag: number; // Used for default weight calculation if not manually overridden
}

export const locationTransferItemSchema = (
    fromWarehouseId: string | undefined,
    availableStock: AggregatedStockItemForSchema[]
) => z.object({
    lotNumber: z.string().min(1, "Vakkal/Lot number is required."),
    bagsToTransfer: z.coerce.number().min(0.01, "Bags to transfer must be greater than 0."),
    netWeightToTransfer: z.coerce.number().min(0.01, "Net weight to transfer must be greater than 0."),
  }).refine(data => {
    if (fromWarehouseId && data.lotNumber) {
      const stockInfo = availableStock.find(
        s => s.lotNumber === data.lotNumber && s.locationId === fromWarehouseId
      );
      if (stockInfo && data.bagsToTransfer > stockInfo.currentBags) {
        return false;
      }
      // Optional: Validate netWeightToTransfer against available weight if strict check is needed
      // if (stockInfo && data.netWeightToTransfer > stockInfo.currentWeight) return false;
    }
    return true;
  }, {
    message: "Quantity or weight exceeds available stock for this lot in the source warehouse.",
    path: ["bagsToTransfer"], // Or ["netWeightToTransfer"]
  });


export const locationTransferSchema = (
    warehouses: Warehouse[],
    availableStock: AggregatedStockItemForSchema[]
) => z.object({
  date: z.date({ required_error: "Transfer date is required." }),
  fromWarehouseId: z.string().min(1, "Source warehouse is required.")
    .refine(id => warehouses.some(w => w.id === id), { message: "Invalid source warehouse." }),
  toWarehouseId: z.string().min(1, "Destination warehouse is required.")
    .refine(id => warehouses.some(w => w.id === id), { message: "Invalid destination warehouse." }),
  transporterId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
        lotNumber: z.string().min(1, "Vakkal/Lot number is required."),
        bagsToTransfer: z.coerce.number().min(0.01, "Bags must be > 0."),
        netWeightToTransfer: z.coerce.number().min(0.01, "Net weight must be > 0."),
    })
  ).min(1, "At least one item must be added to the transfer."),
}).refine(data => data.fromWarehouseId !== data.toWarehouseId, {
  message: "Source and destination warehouses cannot be the same.",
  path: ["toWarehouseId"],
}).superRefine((data, ctx) => {
  data.items.forEach((item, index) => {
    const stockInfo = availableStock.find(
      s => s.lotNumber === item.lotNumber && s.locationId === data.fromWarehouseId
    );
    if (!stockInfo) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Lot "${item.lotNumber}" not found or has no stock in the source warehouse.`,
            path: ["items", index, "lotNumber"],
        });
    } else {
      if (item.bagsToTransfer > stockInfo.currentBags) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Bags for lot ${item.lotNumber} (${item.bagsToTransfer}) exceed available stock (${stockInfo.currentBags}).`,
          path: ["items", index, "bagsToTransfer"],
        });
      }
      // Example: If we assume an average weight for validation against total available weight
      // const maxPossibleWeightForBags = item.bagsToTransfer * stockInfo.averageWeightPerBag;
      // if (item.netWeightToTransfer > maxPossibleWeightForBags * 1.1) { // Allow some variance
      //    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Net weight for lot ${item.lotNumber} seems too high for ${item.bagsToTransfer} bags.`, path: ["items", index, "netWeightToTransfer"]});
      // }
    }
  });
});

export type LocationTransferFormValues = z.infer<ReturnType<typeof locationTransferSchema>>;
