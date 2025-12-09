import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
});

export const CategorySchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
});

export const SupplierSchema = z.object({
  name: z.string().min(1, 'Name required'),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  payment_terms: z.string().optional(),
  opening_balance: z.coerce.number().min(0).default(0),
});

export const CustomerSchema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.enum(['retail', 'wholesale']),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  credit_limit: z.coerce.number().min(0).default(0),
  opening_balance: z.coerce.number().min(0).default(0),
});

export const ItemSchema = z.object({
  code: z.string().min(1, 'Code required'),
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  category_id: z.string().min(1, 'Category required'),
  cost_price: z.coerce.number().min(0),
  retail_price: z.coerce.number().min(0),
  wholesale_price: z.coerce.number().min(0),
  barcode: z.string().optional(),
  unit_of_measure: z.string().default('piece'),
  reorder_level: z.coerce.number().min(0).default(10),
  tax_method: z.enum(['exclusive', 'inclusive', 'none']).default('exclusive'),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
});

export const StoreSchema = z.object({
  code: z.string().min(1, 'Code required'),
  name: z.string().min(1, 'Name required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

export const EmployeeSchema = z.object({
  name: z.string().min(1, 'Name required'),
  employee_code: z.string().min(1, 'Code required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  role: z.enum(['admin', 'manager', 'salesperson', 'cashier']),
  store_id: z.string().optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type CategoryInput = z.infer<typeof CategorySchema>;
export type SupplierInput = z.infer<typeof SupplierSchema>;
export type CustomerInput = z.infer<typeof CustomerSchema>;
export type ItemInput = z.infer<typeof ItemSchema>;
export type StoreInput = z.infer<typeof StoreSchema>;
export type EmployeeInput = z.infer<typeof EmployeeSchema>;
