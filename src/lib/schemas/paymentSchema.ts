
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
  source: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentFormValues = z.infer<ReturnType<typeof paymentSchema>>;
