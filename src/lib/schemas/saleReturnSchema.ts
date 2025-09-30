
import { z } from 'zod';
import type { Sale, SaleReturn } from '@/lib/types';

const getAvailableForSaleReturn = (
  sale: Sale,
  lotNumber: string,
  existingReturns: SaleReturn[]
): { availableBags: number; availableWeight: number } => {
  const originalItem = sale.items.find(item => item.lotNumber === lotNumber);
  if (!originalItem) return { availableBags: 0, availableWeight: 0 };
  
  const returnedForThisLot = existingReturns
    .filter(sr => sr.originalSaleId === sale.id && sr.originalLotNumber === lotNumber)
    .reduce((acc, sr) => {
      acc.bags += sr.quantityReturned;
      acc.weight += sr.netWeightReturned;
      return acc;
    }, { bags: 0, weight: 0 });

  return {
    availableBags: originalItem.quantity - returnedForThisLot.bags,
    availableWeight: originalItem.netWeight - returnedForThisLot.weight,
  };
};


export const saleReturnSchema = (
  allSales: Sale[],
  existingSaleReturns: SaleReturn[]
) => z.object({
  date: z.date({ required_error: "Return date is required." }),
  originalSaleId: z.string().min(1, "Original sale selection is required.")
    .refine(id => allSales.some(s => s.id === id), { message: "Invalid original sale selected." }),
  originalLotNumber: z.string().min(1, "Vakkal/Lot to be returned is required."),
  quantityReturned: z.coerce.number().min(0.01, "Quantity returned must be > 0."),
  netWeightReturned: z.coerce.number().min(0.01, "Net weight returned must be > 0."),
  returnReason: z.string().optional(),
  notes: z.string().optional(),
  restockingFee: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().nonnegative("Restocking fee cannot be negative.").optional()),
}).superRefine((data, ctx) => {
  const originalSale = allSales.find(s => s.id === data.originalSaleId);
  if (!originalSale) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Original sale details not found.", path: ["originalSaleId"]});
    return z.NEVER;
  }

  const originalItem = originalSale.items.find(i => i.lotNumber === data.originalLotNumber);
  if (!originalItem) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selected Lot/Vakkal not found in the original sale.", path: ["originalLotNumber"] });
    return z.NEVER;
  }

  const { availableBags, availableWeight } = getAvailableForSaleReturn(originalSale, data.originalLotNumber, existingSaleReturns);

  if (data.quantityReturned > availableBags) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Return Qty (${data.quantityReturned}) exceeds available (${availableBags} bags).`,
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
});

export type SaleReturnFormValues = z.infer<ReturnType<typeof saleReturnSchema>>;
