
import { z } from 'zod';

export const expenseItemSchema = z.object({
  account: z.string().min(1, "Expense account is required."),
  amount: z.coerce.number().min(0.01, "Amount must be positive."),
  paymentMode: z.enum(['Cash', 'Bank', 'Pending', 'Auto-adjusted']),
  partyId: z.string().optional(),
  partyName: z.string().optional(),
});
