import { z } from 'zod';

export const CreateQuotationSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  store_id: z.string().uuid('Invalid store ID'),
  valid_until: z.string().min(1, 'Valid until date is required'),
  discount: z.number().min(0, 'Discount cannot be negative').default(0),
  tax: z.number().min(0, 'Tax cannot be negative').default(0),
  terms_conditions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        item_id: z.string().uuid('Invalid item ID'),
        quantity: z.number().positive('Quantity must be greater than 0'),
        unit_price: z.number().positive('Unit price must be greater than 0'),
        discount_percent: z.number().min(0, 'Discount percent cannot be negative').max(100, 'Discount percent cannot exceed 100').default(0),
      })
    )
    .min(1, 'At least one item is required'),
});

export const UpdateQuotationSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID').optional(),
  valid_until: z.string().min(1, 'Valid until date is required').optional(),
  discount: z.number().min(0, 'Discount cannot be negative').optional(),
  tax: z.number().min(0, 'Tax cannot be negative').optional(),
  terms_conditions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'expired', 'converted', 'cancelled']).optional(),
  items: z
    .array(
      z.object({
        item_id: z.string().uuid('Invalid item ID'),
        quantity: z.number().positive('Quantity must be greater than 0'),
        unit_price: z.number().positive('Unit price must be greater than 0'),
        discount_percent: z.number().min(0).max(100).default(0),
      })
    )
    .optional(),
});

export const ConvertQuotationSchema = z.object({
  sale_type: z.enum(['retail', 'wholesale']),
  items: z
    .array(
      z.object({
        item_id: z.string().uuid('Invalid item ID'),
        quantity: z.number().positive('Quantity must be greater than 0'),
        unit_price: z.number().positive('Unit price must be greater than 0'),
        discount_percent: z.number().min(0, 'Discount percent cannot be negative').max(100, 'Discount percent cannot exceed 100').default(0),
      })
    )
    .min(1, 'At least one item is required'),
  payment_method: z.string().optional().nullable(),
});

export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof UpdateQuotationSchema>;
export type ConvertQuotationInput = z.infer<typeof ConvertQuotationSchema>;