
import { z } from 'zod';
import type { Purchase, PurchaseReturn, PurchaseItem } from '@/lib/types';

// Helper to calculate available stock for return from a specific item within a purchase
const getAvailableForReturn = (
  purchase: Purchase,
  lotNumber: string,
  existingReturns: PurchaseReturn[]
): { availableBags: number; availableWeight: number } => {
  const originalItem = purchase.items.find(item => item.lotNumber === lotNumber);
  if (!originalItem) return { availableBags: 0, availableWeight: 0 };

  const returnedForThisLot = existingReturns
    .filter(pr => pr.originalPurchaseId === purchase.id && pr.originalLotNumber === lotNumber)
    .reduce((acc, pr) => {
      acc.bags += pr.quantityReturned;
      acc.weight += pr.netWeightReturned;
      return acc;
    }, { bags: 0, weight: 0 });

  return {
    availableBags: originalItem.quantity - returnedForThisLot.bags,
    availableWeight: originalItem.netWeight - returnedForThisLot.weight,
  };
};

export const purchaseReturnSchema = (
  allPurchases: Purchase[],
  existingPurchaseReturns: PurchaseReturn[]
) => z.object({
  date: z.date({ required_error: "Return date is required." }),
  originalPurchaseId: z.string().min(1, "Original purchase selection is required.")
    .refine(id => allPurchases.some(p => p.id === id), { message: "Invalid original purchase selected." }),
  originalLotNumber: z.string().min(1, "Vakkal/Lot to be returned is required."),
  quantityReturned: z.coerce.number().min(0.01, "Quantity returned must be greater than 0."),
  netWeightReturned: z.coerce.number().min(0.01, "Net weight returned must be greater than 0."),
  returnReason: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  const originalPurchase = allPurchases.find(p => p.id === data.originalPurchaseId);
  if (!originalPurchase) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Original purchase details not found.", path: ["originalPurchaseId"] });
    return z.NEVER;
  }
  
  const originalItem = originalPurchase.items.find(i => i.lotNumber === data.originalLotNumber);
  if (!originalItem) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selected Lot/Vakkal not found in the original purchase.", path: ["originalLotNumber"] });
    return z.NEVER;
  }

  const { availableBags, availableWeight } = getAvailableForReturn(originalPurchase, data.originalLotNumber, existingPurchaseReturns);

  if (data.quantityReturned > availableBags) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Return Qty (${data.quantityReturned}) exceeds available (${Math.round(availableBags)} bags).`,
      path: ["quantityReturned"],
    });
  }
  if (data.netWeightReturned > availableWeight) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Return Wt (${data.netWeightReturned}kg) exceeds available (${availableWeight.toFixed(2)}kg).`,
      path: ["netWeightReturned"],
    });
  }

  const avgWeightPerBag = originalItem.netWeight / originalItem.quantity;
  if (Math.abs((data.quantityReturned * avgWeightPerBag) - data.netWeightReturned) > (data.quantityReturned * avgWeightPerBag * 0.1) ) { 
    // This is a soft warning, so we don't add an issue. It's just for consideration.
  }
});

export type PurchaseReturnFormValues = z.infer<ReturnType<typeof purchaseReturnSchema>>;
