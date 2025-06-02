
import { z } from 'zod';
import type { Sale, SaleReturn } from '@/lib/types';

// Helper to calculate available stock for return from a specific sale
const getAvailableForSaleReturn = (
  sale: Sale,
  existingReturns: SaleReturn[]
): { availableBags: number; availableWeight: number } => {
  const returnedForThisSale = existingReturns
    .filter(sr => sr.originalSaleId === sale.id)
    .reduce((acc, sr) => {
      acc.bags += sr.quantityReturned;
      acc.weight += sr.netWeightReturned;
      return acc;
    }, { bags: 0, weight: 0 });

  return {
    availableBags: sale.quantity - returnedForThisSale.bags,
    availableWeight: sale.netWeight - returnedForThisSale.weight,
  };
};


export const saleReturnSchema = (
  allSales: Sale[],
  existingSaleReturns: SaleReturn[]
) => z.object({
  date: z.date({ required_error: "Return date is required." }),
  originalSaleId: z.string().min(1, "Original sale selection is required.")
    .refine(id => allSales.some(s => s.id === id), { message: "Invalid original sale selected." }),
  quantityReturned: z.coerce.number().min(0.01, "Quantity returned must be > 0."),
  netWeightReturned: z.coerce.number().min(0.01, "Net weight returned must be > 0."),
  returnReason: z.string().optional(),
  notes: z.string().optional(),
  restockingFee: z.coerce.number().nonnegative("Restocking fee cannot be negative.").optional(),
}).superRefine((data, ctx) => {
  const originalSale = allSales.find(s => s.id === data.originalSaleId);
  if (!originalSale) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Original sale details not found.", path: ["originalSaleId"]});
    return z.NEVER;
  }
  const { availableBags, availableWeight } = getAvailableForSaleReturn(originalSale, existingSaleReturns);

  if (data.quantityReturned > availableBags) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Quantity to return (${data.quantityReturned}) exceeds available quantity (${availableBags} bags) for this sale.`,
      path: ["quantityReturned"],
    });
  }
  if (data.netWeightReturned > availableWeight) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Net weight to return (${data.netWeightReturned}kg) exceeds available weight (${availableWeight.toFixed(2)}kg) for this sale.`,
      path: ["netWeightReturned"],
    });
  }
});

export type SaleReturnFormValues = z.infer<ReturnType<typeof saleReturnSchema>>;
