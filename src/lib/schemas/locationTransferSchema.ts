
import { z } from 'zod';
import type { Purchase, Warehouse } from '@/lib/types';

// Helper function to calculate available stock for a lot in a specific warehouse
const getLotStockInWarehouse = (
  lotNumber: string,
  warehouseId: string,
  allPurchases: Purchase[],
  // In a more complete system, sales and other transfers would also be considered here
  // For now, focusing on purchase quantity as the basis for transferrable stock
): { availableBags: number; averageWeightPerBag: number } => {
  let totalBagsInLotAtWarehouse = 0;
  let totalWeightInLotAtWarehouse = 0;

  allPurchases.forEach(p => {
    if (p.lotNumber === lotNumber && p.locationId === warehouseId) {
      totalBagsInLotAtWarehouse += p.quantity;
      totalWeightInLotAtWarehouse += p.netWeight;
    }
  });
  // Simplified: sales and other outgoing transfers from this warehouse would need to be subtracted
  // For this schema, we primarily validate against initial purchased quantity in that warehouse.
  // More complex stock tracking would happen in InventoryClient.

  const averageWeightPerBag = totalBagsInLotAtWarehouse > 0 ? totalWeightInLotAtWarehouse / totalBagsInLotAtWarehouse : 50; // Default to 50kg if no purchases

  return { availableBags: totalBagsInLotAtWarehouse, averageWeightPerBag };
};


export const locationTransferItemSchema = (
    fromWarehouseId: string | undefined,
    allPurchases: Purchase[]
) => z.object({
    lotNumber: z.string().min(1, "Vakkal/Lot number is required."),
    bagsToTransfer: z.coerce.number().min(0.01, "Bags to transfer must be greater than 0."),
  }).refine(data => {
    if (fromWarehouseId && data.lotNumber) {
      const { availableBags } = getLotStockInWarehouse(data.lotNumber, fromWarehouseId, allPurchases);
      if (data.bagsToTransfer > availableBags) {
        // This message might be generic as it's hard to display dynamic availableBags here.
        // Form-level validation will provide a more specific message.
        return false;
      }
    }
    return true;
  }, {
    message: "Bags to transfer exceed available stock in the selected warehouse for this lot.",
    path: ["bagsToTransfer"],
  });


export const locationTransferSchema = (
    warehouses: Warehouse[],
    allPurchases: Purchase[] // To validate stock for each item
) => z.object({
  date: z.date({ required_error: "Transfer date is required." }),
  fromWarehouseId: z.string().min(1, "Source warehouse is required.")
    .refine(id => warehouses.some(w => w.id === id), { message: "Invalid source warehouse." }),
  toWarehouseId: z.string().min(1, "Destination warehouse is required.")
    .refine(id => warehouses.some(w => w.id === id), { message: "Invalid destination warehouse." }),
  transporterId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    // The fromWarehouseId is passed dynamically when creating the item schema
    // This is a bit tricky with Zod's standard structure, so item-level validation
    // against stock might be better handled in the form logic itself or with a superRefine.
    // For now, the item schema takes fromWarehouseId as an argument.
    // This means the schema for `items` needs to be constructed dynamically in the form.
    // A simpler approach for schema: define item shape, do complex validation in superRefine or form.
    z.object({
        lotNumber: z.string().min(1, "Vakkal/Lot number is required."),
        bagsToTransfer: z.coerce.number().min(0.01, "Bags to transfer must be greater than 0."),
    })
  ).min(1, "At least one item must be added to the transfer."),
}).refine(data => data.fromWarehouseId !== data.toWarehouseId, {
  message: "Source and destination warehouses cannot be the same.",
  path: ["toWarehouseId"],
});
// Super refine at the bottom for item stock validation might be more robust if schema generation is complex
// .superRefine((data, ctx) => {
//   data.items.forEach((item, index) => {
//     const { availableBags } = getLotStockInWarehouse(item.lotNumber, data.fromWarehouseId, allPurchases);
//     if (item.bagsToTransfer > availableBags) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         message: `Item ${index + 1}: Bags for lot ${item.lotNumber} exceed available stock (${availableBags}).`,
//         path: ["items", index, "bagsToTransfer"],
//       });
//     }
//   });
// });


export type LocationTransferFormValues = z.infer<ReturnType<typeof locationTransferSchema>>;
export type LocationTransferItemFormValues = z.infer<ReturnType<typeof locationTransferItemSchema>>;
