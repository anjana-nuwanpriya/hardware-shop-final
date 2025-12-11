import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  successResponse,
  createdResponse,
  errorResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { CreateQuotationSchema } from '@/lib/validation-quotations';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get total count
    const { count } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true });

    // Get paginated data with joins
    const { data, error } = await supabase
      .from('quotations')
      .select(
        `
        id,
        quotation_number,
        quotation_date,
        customer_id,
        customers (id, name),
        store_id,
        stores (id, code, name),
        valid_until,
        subtotal,
        discount,
        tax,
        total_amount,
        status,
        employee_id,
        is_active,
        created_at,
        updated_at
      `
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return errorResponse(error.message, 400);
    }

    // Transform data - Handle array joins
    const quotations = data?.map((q: any) => ({
      id: q.id,
      quotation_number: q.quotation_number,
      quotation_date: q.quotation_date,
      customer_id: q.customer_id,
      customer_name: Array.isArray(q.customers) ? q.customers[0]?.name : q.customers?.name,
      store_id: q.store_id,
      store_name: Array.isArray(q.stores) ? q.stores[0]?.name : q.stores?.name,
      valid_until: q.valid_until,
      subtotal: q.subtotal || 0,
      discount: q.discount || 0,
      tax: q.tax || 0,
      total_amount: q.total_amount || 0,
      status: q.status,
      employee_id: q.employee_id,
      is_active: q.is_active,
      created_at: q.created_at,
      updated_at: q.updated_at,
    })) || [];

    return successResponse('Quotations retrieved successfully', {
      quotations,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return serverErrorResponse('Failed to fetch quotations', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input - FIX: Use .issues instead of .errors
    const validation = CreateQuotationSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message);
    }

    const { customer_id, store_id, valid_until, discount, tax, terms_conditions, notes, items } = validation.data;

    // Get next quotation number - Check existing quotations
    const { data: lastQuotation } = await supabase
      .from('quotations')
      .select('quotation_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1001;
    if (lastQuotation?.quotation_number) {
      const lastNumber = parseInt(lastQuotation.quotation_number.split('-QUOT-')[1] || '1000');
      nextNumber = lastNumber + 1;
    }

    // Get store code
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('code')
      .eq('id', store_id);

    if (storeError || !storeData || storeData.length === 0) {
      return errorResponse('Store not found', 404);
    }

    const storeCode = storeData[0].code;
    const quotation_number = `${storeCode}-QUOT-${String(nextNumber).padStart(6, '0')}`;

    // Create quotation
    const { data: quotationData, error: quotationError } = await supabase
      .from('quotations')
      .insert([
        {
          quotation_number,
          quotation_date: new Date().toISOString().split('T')[0],
          customer_id,
          store_id,
          valid_until,
          discount: discount || 0,
          tax: tax || 0,
          subtotal: 0,
          total_amount: 0,
          terms_conditions,
          notes,
          status: 'active',
          is_active: true,
        },
      ])
      .select()
      .single();

    if (quotationError) {
      return errorResponse(quotationError.message, 400);
    }

    // Create line items and calculate total
    let totalAmount = 0;
    const lineItems = items.map((item: any) => {
      const lineTotal = item.quantity * item.unit_price;
      const discountAmount = lineTotal * (item.discount_percent / 100);
      const netValue = lineTotal - discountAmount;
      totalAmount += netValue;

      return {
        quotation_id: quotationData.id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
        discount_value: discountAmount,
        net_value: netValue,
      };
    });

    const { error: itemsError } = await supabase
      .from('quotation_items')
      .insert(lineItems);

    if (itemsError) {
      return errorResponse(itemsError.message, 400);
    }

    // Update quotation with calculated total
    const finalTotal = totalAmount + (tax || 0) - (discount || 0);
    await supabase
      .from('quotations')
      .update({
        subtotal: totalAmount,
        total_amount: finalTotal > 0 ? finalTotal : 0,
      })
      .eq('id', quotationData.id);

    // Log audit
    await logAudit(
      {
        action: 'CREATE',
        table_name: 'quotations',
        record_id: quotationData.id,
        new_values: { quotation_number, customer_id, store_id },
      },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || ''
    );

    return createdResponse('Quotation created successfully', {
      id: quotationData.id,
      quotation_number,
    });
  } catch (error) {
    return serverErrorResponse('Failed to create quotation', error);
  }
}