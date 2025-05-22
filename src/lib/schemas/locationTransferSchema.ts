
import { z } from 'zod';
import type { Warehouse } from '@/lib/types';

// availableStock prop for schema generation
interface AggregatedStockItemForSchema {
  lotNumber: string;
  locationId: string;
  currentBags: number;
  averageWeightPerBag: number;
}

export const locationTransferItemSchema = (
    fromWarehouseId: string | undefined,
    availableStock: AggregatedStockItemForSchema[]
) => z.object({
    lotNumber: z.string().min(1, "Vakkal/Lot number is required."),
    bagsToTransfer: z.coerce.number().min(0.01, "Bags to transfer must be greater than 0."),
  }).refine(data => {
    if (fromWarehouseId && data.lotNumber) {
      const stockInfo = availableStock.find(
        s => s.lotNumber === data.lotNumber && s.locationId === fromWarehouseId
      );
      if (stockInfo && data.bagsToTransfer > stockInfo.currentBags) {
        return false; // Validation fails if trying to transfer more than available
      }
    }
    return true;
  }, {
    message: "Bags to transfer exceed available stock in the selected warehouse for this lot.",
    path: ["bagsToTransfer"],
  });


export const locationTransferSchema = (
    warehouses: Warehouse[],
    availableStock: AggregatedStockItemForSchema[] // Pass available stock for validation
) => z.object({
  date: z.date({ required_error: "Transfer date is required." }),
  fromWarehouseId: z.string().min(1, "Source warehouse is required.")
    .refine(id => warehouses.some(w => w.id === id), { message: "Invalid source warehouse." }),
  toWarehouseId: z.string().min(1, "Destination warehouse is required.")
    .refine(id => warehouses.some(w => w.id === id), { message: "Invalid destination warehouse." }),
  transporterId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    // Use a function to generate the item schema dynamically based on the fromWarehouseId
    // This is a conceptual approach; direct dynamic schema generation inside z.array is tricky.
    // The actual validation for stock quantity per item will be done via superRefine.
    z.object({
        lotNumber: z.string().min(1, "Vakkal/Lot number is required."),
        bagsToTransfer: z.coerce.number().min(0.01, "Bags to transfer must be greater than 0."),
    })
  ).min(1, "At least one item must be added to the transfer."),
}).refine(data => data.fromWarehouseId !== data.toWarehouseId, {
  message: "Source and destination warehouses cannot be the same.",
  path: ["toWarehouseId"],
}).superRefine((data, ctx) => { // SuperRefine for cross-field validation on items
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
    } else if (item.bagsToTransfer > stockInfo.currentBags) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Bags for lot ${item.lotNumber} (${item.bagsToTransfer}) exceed available stock (${stockInfo.currentBags}).`,
        path: ["items", index, "bagsToTransfer"],
      });
    }
  });
});


export type LocationTransferFormValues = z.infer<ReturnType<typeof locationTransferSchema>>;
// The item schema is now implicitly part of LocationTransferFormValues.items
// export type LocationTransferItemFormValues = z.infer<ReturnType<typeof locationTransferItemSchema>>;


    