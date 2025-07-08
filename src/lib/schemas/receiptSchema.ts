
import { z } from 'zod';
import type { MasterItem } from '@/lib/types';

export const receiptSchema = (parties: MasterItem[]) => z.object({
  date: z.date({
    required_error: "Receipt date is required.",
  }),
  partyId: z.string().min(1, "Party is required.").refine(partyId =>
    parties.some(p => p.id === partyId && (p.type === 'Customer' || p.type === 'Broker')), {
    message: "Selected party must be a Customer or Broker.",
  }),
  amount: z.coerce.number().min(0.01, "Amount received must be greater than 0."),
  paymentMethod: z.enum(['Cash', 'Bank', 'UPI'], {
    required_error: "Payment method is required.",
  }),
  transactionType: z.enum(['Against Bill', 'On Account']).default('On Account'),
  source: z.string().optional(),
  notes: z.string().optional(),
  cashDiscount: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().nonnegative("Cash discount cannot be negative.").optional().default(0)
  ),
  againstBills: z.array(z.object({
    billId: z.string(),
    amount: z.coerce.number().min(0.01, "Allocation must be positive"),
    billDate: z.string().optional(),
    billTotal: z.coerce.number().optional(),
    billVakkal: z.string().optional(),
  })).optional(),
}).superRefine((data, ctx) => {
    if (data.transactionType === 'Against Bill') {
        const totalReceiptAmount = (data.amount || 0) + (data.cashDiscount || 0);
        if (!data.againstBills || data.againstBills.length === 0) {
            ctx.addIssue({
                path: ['againstBills'],
                message: 'Please select at least one bill to allocate receipt against.',
                code: z.ZodIssueCode.custom
            });
        } else {
            const totalAllocated = data.againstBills.reduce((sum, bill) => sum + bill.amount, 0);
            if (totalAllocated > totalReceiptAmount) {
                ctx.addIssue({
                    path: ['againstBills'],
                    message: `Total allocated amount (₹${totalAllocated.toFixed(2)}) cannot exceed the receipt amount + discount (₹${totalReceiptAmount.toFixed(2)}).`,
                    code: z.ZodIssueCode.custom
                });
            }
        }
    }
});

export type ReceiptFormValues = z.infer<ReturnType<typeof receiptSchema>>;
