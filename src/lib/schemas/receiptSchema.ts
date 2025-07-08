
import { z } from 'zod';
import type { MasterItem, MasterItemType } from '@/lib/types';

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
    allocated: z.coerce.number()
  })).optional(),
});

export type ReceiptFormValues = z.infer<ReturnType<typeof receiptSchema>>;
