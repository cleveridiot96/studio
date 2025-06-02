
import { z } from 'zod';
import type { Purchase, PurchaseReturn } from '@/lib/types';

// Helper to calculate available stock for return from a specific purchase
const getAvailableForReturn = (
  purchase: Purchase,
  existingReturns: PurchaseReturn[]
): { availableBags: number; availableWeight: number } => {
  const returnedForThisPurchase = existingReturns
    .filter(pr => pr.originalPurchaseId === purchase.id)
    .reduce((acc, pr) => {
      acc.bags += pr.quantityReturned;
      acc.weight += pr.netWeightReturned;
      return acc;
    }, { bags: 0, weight: 0 });

  return {
    availableBags: purchase.quantity - returnedForThisPurchase.bags,
    availableWeight: purchase.netWeight - returnedForThisPurchase.weight,
  };
};

export const purchaseReturnSchema = (
  allPurchases: Purchase[],
  existingPurchaseReturns: PurchaseReturn[]
) => z.object({
  date: z.date({ required_error: "Return date is required." }),
  originalPurchaseId: z.string().min(1, "Original purchase selection is required.")
    .refine(id => allPurchases.some(p => p.id === id), { message: "Invalid original purchase selected." }),
  quantityReturned: z.coerce.number().min(0.01, "Quantity returned must be greater than 0."),
  netWeightReturned: z.coerce.number().min(0.01, "Net weight returned must be greater than 0."),
  returnReason: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  const originalPurchase = allPurchases.find(p => p.id === data.originalPurchaseId);
  if (!originalPurchase) {
    // This should ideally be caught by the refine on originalPurchaseId, but defensive check.
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Original purchase details not found.",
      path: ["originalPurchaseId"],
    });
    return z.NEVER;
  }

  const { availableBags, availableWeight } = getAvailableForReturn(originalPurchase, existingPurchaseReturns);

  if (data.quantityReturned > availableBags) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Quantity to return (${data.quantityReturned}) exceeds available quantity (${availableBags} bags) for this purchase.`,
      path: ["quantityReturned"],
    });
  }
  if (data.netWeightReturned > availableWeight) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Net weight to return (${data.netWeightReturned}kg) exceeds available weight (${availableWeight.toFixed(2)}kg) for this purchase.`,
      path: ["netWeightReturned"],
    });
  }
  // Optional: Check if netWeightReturned makes sense for quantityReturned
  const avgWeightPerBag = originalPurchase.netWeight / originalPurchase.quantity;
  if (Math.abs((data.quantityReturned * avgWeightPerBag) - data.netWeightReturned) > (data.quantityReturned * avgWeightPerBag * 0.1) ) { // Allow 10% variance
    // This is a soft warning, maybe not a hard error unless business logic dictates
    // console.warn("Net weight returned seems inconsistent with quantity and original average weight per bag.");
  }
});

export type PurchaseReturnFormValues = z.infer<ReturnType<typeof purchaseReturnSchema>>;
