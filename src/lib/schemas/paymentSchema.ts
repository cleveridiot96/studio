
import { z } from 'zod';
import type { MasterItem } from '@/lib/types';

export const paymentSchema = (parties: MasterItem[]) => z.object({
  date: z.date({
    required_error: "Payment date is required.",
  }),
  partyId: z.string().min(1, "Party is required.").refine(partyId =>
    parties.some(p => p.id === partyId), {
    message: "Selected party does not exist or is not valid for payments.",
  }),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0."),
  paymentMethod: z.enum(['Cash', 'Bank', 'UPI'], {
    required_error: "Payment method is required.",
  }),
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
}).superRefine((data, ctx) => {
    if (data.transactionType === 'Against Bill') {
        if (!data.againstBills || data.againstBills.length === 0) {
            ctx.addIssue({
                path: ['againstBills'],
                message: 'Please select at least one bill to allocate payment against.',
                code: z.ZodIssueCode.custom
            });
        } else {
            const totalAllocated = data.againstBills.reduce((sum, bill) => sum + bill.amount, 0);
            if (totalAllocated > data.amount) {
                ctx.addIssue({
                    path: ['againstBills'],
                    message: `Total allocated amount (₹${totalAllocated.toFixed(2)}) cannot exceed the payment amount (₹${data.amount.toFixed(2)}).`,
                    code: z.ZodIssueCode.custom
                });
            }
        }
    }
});

export type PaymentFormValues = z.infer<ReturnType<typeof paymentSchema>>;
