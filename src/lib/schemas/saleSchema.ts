import { z } from 'zod';

export const saleSchema = z.object({
  date: z.date({
    required_error: "Sale date is required.",
  }),
  billNumber: z.string().min(1, "Bill number is required."),
  customerId: z.string().min(1, "Customer is required."),
  itemName: z.string().min(1, "Item name is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0."),
  price: z.coerce.number().min(0.01, "Price must be greater than 0."),
});

export type SaleFormValues = z.infer<typeof saleSchema>;
