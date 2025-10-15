
import { z } from 'zod';
import type { MasterItem } from '@/lib/types';
import type { AggregatedStockItemForForm } from '@/hooks/useInventory';

const stockPaymentItemSchema = z.object({
  lotNumber: z.string().min(1, "Lot number is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be positive."),
  netWeight: z.coerce.number().min(0.01, "Net weight must be positive."),
  rate: z.coerce.number().min(0.01, "Rate must be positive."),
  value: z.coerce.number(), // Calculated field
});

export const paymentSchema = (
    parties: MasterItem[], 
    availableStock: AggregatedStockItemForForm[], 
    paymentToEditId?: string
) => z.object({
  date: z.date({
    required_error: "Payment date is required.",
  }),
  partyId: z.string().min(1, "Party is required.").refine(partyId =>
    parties.some(p => p.id === partyId), {
    message: "Selected party does not exist or is not valid for payments.",
  }),
  paymentType: z.enum(['Cash', 'Stock']).default('Cash'),
  amount: z.coerce.number().optional(), // Now optional
  paymentMethod: z.enum(['Cash', 'Bank', 'UPI']).optional(),
  transactionType: z.enum(['Against Bill', 'On Account']).default('On Account'),
  source: z.string().optional(),
  notes: z.string().optional(),
  againstBills: z.array(z.object({
    billId: z.string(),
    amount: z.coerce.number().min(0.01, "Allocation must be positive"),
    billDate: z.string().optional(),
    billTotal: z.coerce.number().optional(),
    billVakkal: z.string().optional(),
  })).optional(),
  stockItems: z.array(stockPaymentItemSchema).optional(),
}).superRefine((data, ctx) => {
    if (data.paymentType === 'Cash') {
        if (!data.amount || data.amount <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['amount'],
                message: "Amount is required for cash payments."
            });
        }
        if (!data.paymentMethod) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['paymentMethod'],
                message: "Payment method is required for cash payments."
            });
        }
    }

    if (data.paymentType === 'Stock') {
        if (!data.stockItems || data.stockItems.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['stockItems'],
                message: "At least one stock item is required for 'Payment with Stock'."
            });
        }
    }
    
    // Check stock availability for stock payments
    if (data.paymentType === 'Stock' && data.stockItems) {
      data.stockItems.forEach((item, index) => {
          const stockInfo = availableStock.find(s => s.lotNumber === item.lotNumber);
          if (!stockInfo || item.quantity > stockInfo.currentBags) {
              ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: ['stockItems', index, 'quantity'],
                  message: `Quantity exceeds available stock (${stockInfo?.currentBags || 0} bags).`
              });
          }
      });
    }
});

export type PaymentFormValues = z.infer<ReturnType<typeof paymentSchema>>;
