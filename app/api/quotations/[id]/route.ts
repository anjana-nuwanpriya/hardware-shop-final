import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { logAudit } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get quotation with all details
    const { data, error } = await supabase
      .from('quotations')
      .select(
        `
        id,
        quotation_number,
        quotation_date,
        customer_id,
        store_id,
        valid_until,
        subtotal,
        discount,
        tax,
        total_amount,
        status,
        terms_conditions,
        notes,
        employee_id,
        is_active,
        created_at,
        updated_at
      `
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      return errorResponse('Quotation not found', 404);
    }

    // Get quotation items with item details
    const { data: items, error: itemsError } = await supabase
      .from('quotation_items')
      .select(
        `
        id,
        item_id,
        quantity,
        unit_price,
        discount_percent,
        discount_value,
        tax_value,
        net_value,
        items(id, name, code)
      `
      )
      .eq('quotation_id', id);

    if (itemsError) {
      console.error('Items error:', itemsError);
    }

    // Transform items - flatten the items join
    const transformedItems = (items || []).map((item: any) => ({
      id: item.id,
      item_id: item.item_id,
      item_name: Array.isArray(item.items) ? item.items[0]?.name : item.items?.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent,
      discount_value: item.discount_value,
      tax_value: item.tax_value,
      net_value: item.net_value,
    }));

    // Get customer and store details
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, type, phone, email')
      .eq('id', data.customer_id)
      .single();

    const { data: store } = await supabase
      .from('stores')
      .select('id, code, name')
      .eq('id', data.store_id)
      .single();

    // Build response
    const quotation = {
      ...data,
      customer_name: customer?.name,
      customer: customer,
      store_name: store?.name,
      store: store,
      quotation_items: transformedItems,
    };

    return successResponse('Quotation retrieved successfully', quotation);
  } catch (error) {
    return serverErrorResponse('Failed to fetch quotation', error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get current quotation
    const { data: currentQuotation, error: fetchError } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentQuotation) {
      return errorResponse('Quotation not found', 404);
    }

    // Prepare update data - only allow certain fields
    const updateData: Record<string, any> = {};
    const allowedFields = [
      'valid_until',
      'discount',
      'tax',
      'terms_conditions',
      'notes',
      'status',
    ];

    allowedFields.forEach((field) => {
      if (field in body) {
        updateData[field] = body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return errorResponse('No valid fields to update', 400);
    }

    // Update quotation
    const { data: updatedQuotation, error: updateError } = await supabase
      .from('quotations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return errorResponse(updateError.message, 400);
    }

    // Audit log
    await logAudit(
      {
        action: 'UPDATE',
        table_name: 'quotations',
        record_id: id,
        old_values: currentQuotation,
        new_values: updatedQuotation,
      },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || ''
    );

    return successResponse('Quotation updated successfully', updatedQuotation);
  } catch (error) {
    return serverErrorResponse('Failed to update quotation', error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get quotation first
    const { data: quotation, error: fetchError } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !quotation) {
      return errorResponse('Quotation not found', 404);
    }

    // Cannot delete converted quotations
    if (quotation.status === 'converted') {
      return errorResponse('Cannot delete converted quotations', 400);
    }

    // Soft delete - set is_active to false
    const { error: deleteError } = await supabase
      .from('quotations')
      .update({ is_active: false })
      .eq('id', id);

    if (deleteError) {
      return errorResponse(deleteError.message, 400);
    }

    // Audit log
    await logAudit(
      {
        action: 'DELETE',
        table_name: 'quotations',
        record_id: id,
        old_values: quotation,
      },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || ''
    );

    return successResponse('Quotation deleted successfully');
  } catch (error) {
    return serverErrorResponse('Failed to delete quotation', error);
  }
}