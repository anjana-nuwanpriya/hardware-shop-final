import { z } from 'zod';

// Login Schema
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// Category Schema
export const CategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export type Category = z.infer<typeof CategorySchema>;
export type CategoryInput = z.infer<typeof CategorySchema>;

// Store Schema
export const StoreSchema = z.object({
  code: z.string().min(1, 'Store code is required'),
  name: z.string().min(1, 'Store name is required'),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  is_active: z.boolean().optional(),
});

export type Store = z.infer<typeof StoreSchema>;
export type StoreInput = z.infer<typeof StoreSchema>;

// Item Schema
export const ItemSchema = z.object({
  code: z.string().min(1, 'Item code is required'),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  cost_price: z.number().min(0, 'Cost price must be positive').optional(),
  retail_price: z.number().min(0, 'Retail price must be positive').optional(),
  wholesale_price: z.number().min(0, 'Wholesale price must be positive').optional(),
  unit_of_measure: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  hsn_code: z.string().nullable().optional(),
  reorder_level: z.number().int().nullable().optional(),
  tax_method: z.enum(['exclusive', 'inclusive', 'none']).nullable().optional(),
  tax_rate: z.number().min(0).max(100).nullable().optional(),
  is_active: z.boolean().optional(),
});

export type Item = z.infer<typeof ItemSchema>;
export type ItemInput = z.infer<typeof ItemSchema>;

// Supplier Schema
export const SupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contact_person: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  tax_number: z.string().nullable().optional(),
  payment_terms: z.string().nullable().optional(),
  opening_balance: z.number().nullable().optional(),
  is_active: z.boolean().optional(),
});

export type Supplier = z.infer<typeof SupplierSchema>;
export type SupplierInput = z.infer<typeof SupplierSchema>;

// Customer Schema
export const CustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  type: z.enum(['retail', 'wholesale']).nullable().optional(),
  contact_person: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  tax_number: z.string().nullable().optional(),
  credit_limit: z.number().min(0).nullable().optional(),
  customer_since_date: z.string().nullable().optional(),
  opening_balance: z.number().nullable().optional(),
  is_active: z.boolean().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;
export type CustomerInput = z.infer<typeof CustomerSchema>;

// Employee Schema
export const EmployeeSchema = z.object({
  name: z.string().min(1, 'Employee name is required'),
  employee_code: z.string().min(1, 'Employee code is required'),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  role: z.enum(['admin', 'manager', 'cashier', 'staff']).nullable().optional(),
  permissions: z.array(z.string()).nullable().optional(),
  store_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

export type Employee = z.infer<typeof EmployeeSchema>;
export type EmployeeInput = z.infer<typeof EmployeeSchema>;

// Purchase Order Schema
export const PurchaseOrderSchema = z.object({
  po_number: z.string().min(1, 'PO number is required'),
  supplier_id: z.string().uuid('Supplier is required'),
  store_id: z.string().uuid('Store is required'),
  expected_delivery_date: z.string().nullable().optional(),
  status: z.enum(['pending', 'sent', 'partial', 'received', 'cancelled']).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;
export type PurchaseOrderInput = z.infer<typeof PurchaseOrderSchema>;

// Sales Retail Schema
export const SalesRetailSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  customer_id: z.string().uuid().nullable().optional(),
  store_id: z.string().uuid('Store is required'),
  payment_method: z.string().nullable().optional(),
  payment_status: z.enum(['paid', 'unpaid', 'partially_paid']).nullable().optional(),
  description: z.string().nullable().optional(),
});

export type SalesRetail = z.infer<typeof SalesRetailSchema>;
export type SalesRetailInput = z.infer<typeof SalesRetailSchema>;

// Sales Wholesale Schema
export const SalesWholesaleSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  customer_id: z.string().uuid().nullable().optional(),
  store_id: z.string().uuid('Store is required'),
  payment_method: z.string().nullable().optional(),
  payment_status: z.enum(['paid', 'unpaid', 'partially_paid']).nullable().optional(),
  description: z.string().nullable().optional(),
});

export type SalesWholesale = z.infer<typeof SalesWholesaleSchema>;
export type SalesWholesaleInput = z.infer<typeof SalesWholesaleSchema>;

// Stock Adjustment Schema
export const StockAdjustmentSchema = z.object({
  adjustment_number: z.string().min(1, 'Adjustment number is required'),
  store_id: z.string().uuid('Store is required'),
  description: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
});

export type StockAdjustment = z.infer<typeof StockAdjustmentSchema>;
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;

// Purchase GRN Schema
export const PurchaseGRNSchema = z.object({
  grn_number: z.string().min(1, 'GRN number is required'),
  supplier_id: z.string().uuid('Supplier is required'),
  store_id: z.string().uuid('Store is required'),
  invoice_number: z.string().nullable().optional(),
  invoice_date: z.string().nullable().optional(),
  invoice_amount: z.number().nullable().optional(),
  payment_status: z.enum(['paid', 'unpaid', 'partially_paid']).nullable().optional(),
  description: z.string().nullable().optional(),
});

export type PurchaseGRN = z.infer<typeof PurchaseGRNSchema>;
export type PurchaseGRNInput = z.infer<typeof PurchaseGRNSchema>;

// Sales Return Schema
export const SalesReturnSchema = z.object({
  return_number: z.string().min(1, 'Return number is required'),
  customer_id: z.string().uuid('Customer is required'),
  store_id: z.string().uuid('Store is required'),
  return_reason: z.string().min(1, 'Return reason is required'),
  refund_method: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export type SalesReturn = z.infer<typeof SalesReturnSchema>;
export type SalesReturnInput = z.infer<typeof SalesReturnSchema>;

// Purchase Return Schema
export const PurchaseReturnSchema = z.object({
  return_number: z.string().min(1, 'Return number is required'),
  supplier_id: z.string().uuid('Supplier is required'),
  store_id: z.string().uuid('Store is required'),
  return_reason: z.string().min(1, 'Return reason is required'),
  description: z.string().nullable().optional(),
});

export type PurchaseReturn = z.infer<typeof PurchaseReturnSchema>;
export type PurchaseReturnInput = z.infer<typeof PurchaseReturnSchema>;

// Opening Stock Schema
export const OpeningStockSchema = z.object({
  ref_number: z.string().min(1, 'Reference number is required'),
  store_id: z.string().uuid('Store is required'),
  supplier_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
});

export type OpeningStock = z.infer<typeof OpeningStockSchema>;
export type OpeningStockInput = z.infer<typeof OpeningStockSchema>;

// Supplier Payment Schema
export const SupplierPaymentSchema = z.object({
  payment_number: z.string().min(1, 'Payment number is required'),
  supplier_id: z.string().uuid('Supplier is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
  reference_number: z.string().nullable().optional(),
  cheque_number: z.string().nullable().optional(),
  cheque_status: z.enum(['received', 'deposited', 'cleared', 'bounced']).nullable().optional(),
  total_payment_amount: z.number().min(0, 'Payment amount must be positive'),
  notes: z.string().nullable().optional(),
});

export type SupplierPayment = z.infer<typeof SupplierPaymentSchema>;
export type SupplierPaymentInput = z.infer<typeof SupplierPaymentSchema>;

// Customer Payment Schema
export const CustomerPaymentSchema = z.object({
  receipt_number: z.string().min(1, 'Receipt number is required'),
  customer_id: z.string().uuid('Customer is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
  reference_number: z.string().nullable().optional(),
  cheque_number: z.string().nullable().optional(),
  cheque_status: z.enum(['received', 'deposited', 'cleared', 'bounced']).nullable().optional(),
  total_payment_amount: z.number().min(0, 'Payment amount must be positive'),
  notes: z.string().nullable().optional(),
});

export type CustomerPayment = z.infer<typeof CustomerPaymentSchema>;
export type CustomerPaymentInput = z.infer<typeof CustomerPaymentSchema>;

// Audit Log Schema
export const AuditLogSchema = z.object({
  user_id: z.string().uuid().nullable().optional(),
  action: z.string().min(1, 'Action is required'),
  table_name: z.string().nullable().optional(),
  record_id: z.string().uuid().nullable().optional(),
  old_values: z.record(z.string(), z.any()).nullable().optional(),
  new_values: z.record(z.string(), z.any()).nullable().optional(),
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;
export type AuditLogInput = z.infer<typeof AuditLogSchema>;

// Wholesale Return Schema
export const SalesWholesaleReturnSchema = z.object({
  return_number: z.string().min(1, 'Return number is required'),
  customer_id: z.string().uuid('Customer is required'),
  store_id: z.string().uuid('Store is required'),
  return_reason: z.string().min(1, 'Return reason is required'),
  refund_method: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export type SalesWholesaleReturn = z.infer<typeof SalesWholesaleReturnSchema>;
export type SalesWholesaleReturnInput = z.infer<typeof SalesWholesaleReturnSchema>;

// ============================================================================
// QUOTATION SCHEMAS
// ============================================================================

// Quotation Item Schema
export const QuotationItemSchema = z.object({
  id: z.string().uuid().optional(),
  quotation_id: z.string().uuid().optional(),
  item_id: z.string().uuid({ message: 'Item is required' }),
  batch_no: z.string().optional().nullable(),
  quantity: z.number().positive({ message: 'Quantity must be greater than 0' }),
  unit_price: z.number().nonnegative({ message: 'Price cannot be negative' }),
  discount_percent: z.number().min(0).max(100).default(0),
  discount_value: z.number().nonnegative().default(0),
  tax_value: z.number().nonnegative().default(0),
  net_value: z.number().nonnegative(),
});

export type QuotationItem = z.infer<typeof QuotationItemSchema>;

// Create Quotation Schema
export const CreateQuotationSchema = z.object({
  customer_id: z.string().uuid({ message: 'Customer is required' }),
  store_id: z.string().uuid({ message: 'Store is required' }),
  quotation_date: z.string().optional(),
  valid_until: z.string({ message: 'Valid until date is required' }),
  terms_conditions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(QuotationItemSchema).min(1, 'At least one item is required'),
});

export type CreateQuotation = z.infer<typeof CreateQuotationSchema>;

// Update Quotation Schema
export const UpdateQuotationSchema = z.object({
  valid_until: z.string().optional(),
  terms_conditions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'expired', 'converted', 'cancelled']).optional(),
  items: z.array(QuotationItemSchema).optional(),
});

export type UpdateQuotation = z.infer<typeof UpdateQuotationSchema>;

// Convert Quotation Schema
export const ConvertQuotationSchema = z.object({
  sale_type: z.enum(['retail', 'wholesale'], { message: 'Sale type must be retail or wholesale' }),
  item_ids: z.array(z.string().uuid()).optional(), // If not provided, convert all items
  discount: z.number().nonnegative().default(0),
  payment_method: z.string().optional(),
  payment_status: z.enum(['unpaid', 'paid']).default('unpaid'),
});

export type ConvertQuotation = z.infer<typeof ConvertQuotationSchema>;

// Quotation Response Schema
export const QuotationResponseSchema = z.object({
  id: z.string().uuid(),
  quotation_number: z.string(),
  quotation_date: z.string(),
  customer_id: z.string().uuid(),
  customer_name: z.string().optional(),
  store_id: z.string().uuid(),
  store_name: z.string().optional(),
  valid_until: z.string(),
  subtotal: z.number(),
  discount: z.number(),
  tax: z.number(),
  total_amount: z.number(),
  status: z.enum(['active', 'expired', 'converted', 'cancelled']),
  terms_conditions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type QuotationResponse = z.infer<typeof QuotationResponseSchema>;

// Quotation List Item Schema (for list views)
export const QuotationListItemSchema = z.object({
  id: z.string().uuid(),
  quotation_number: z.string(),
  quotation_date: z.string(),
  customer_id: z.string().uuid(),
  customer_name: z.string(),
  store_id: z.string().uuid(),
  store_name: z.string(),
  valid_until: z.string(),
  subtotal: z.number(),
  discount: z.number(),
  tax: z.number(),
  total_amount: z.number(),
  status: z.enum(['active', 'expired', 'converted', 'cancelled']),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type QuotationListItem = z.infer<typeof QuotationListItemSchema>;

// Quotation Detail Schema (with items)
export const QuotationDetailSchema = z.object({
  id: z.string().uuid(),
  quotation_number: z.string(),
  quotation_date: z.string(),
  customer_id: z.string().uuid(),
  customer: z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  store_id: z.string().uuid(),
  store: z.object({
    id: z.string().uuid(),
    code: z.string(),
    name: z.string(),
  }).optional(),
  valid_until: z.string(),
  subtotal: z.number(),
  discount: z.number(),
  tax: z.number(),
  total_amount: z.number(),
  status: z.enum(['active', 'expired', 'converted', 'cancelled']),
  terms_conditions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean(),
  items: z.array(z.object({
    id: z.string().uuid(),
    item_id: z.string().uuid(),
    item: z.object({
      id: z.string().uuid(),
      code: z.string(),
      name: z.string(),
      unit_of_measure: z.string().optional(),
    }).optional(),
    batch_no: z.string().optional().nullable(),
    quantity: z.number(),
    unit_price: z.number(),
    discount_percent: z.number(),
    discount_value: z.number(),
    tax_value: z.number(),
    net_value: z.number(),
  })).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type QuotationDetail = z.infer<typeof QuotationDetailSchema>;