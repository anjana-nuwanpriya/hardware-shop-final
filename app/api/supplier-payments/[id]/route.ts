import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('supplier_payments')
      .select(
        `
        *,
        suppliers (id, name),
        supplier_payment_allocations (
          id,
          purchase_grn_id,
          invoice_number,
          invoice_date,
          invoice_amount,
          paid_amount,
          outstanding,
          allocation_amount
        )
      `
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      return notFoundResponse('Supplier payment not found');
    }

    return successResponse('Supplier payment retrieved successfully', data);
  } catch (error) {
    return serverErrorResponse('Failed to fetch supplier payment', error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if payment exists
    const { data: existing } = await supabase
      .from('supplier_payments')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return notFoundResponse('Supplier payment not found');
    }

    const { cheque_status, notes } = body;

    const updateData: any = {};
    if (cheque_status) updateData.cheque_status = cheque_status;
    if (notes !== undefined) updateData.notes = notes;

    const { error } = await supabase
      .from('supplier_payments')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return errorResponse(error.message, 400);
    }

    return successResponse('Supplier payment updated successfully');
  } catch (error) {
    return serverErrorResponse('Failed to update supplier payment', error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check if payment exists
    const { data: existing } = await supabase
      .from('supplier_payments')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return notFoundResponse('Supplier payment not found');
    }

    // Check if payment has allocations
    const { data: allocations } = await supabase
      .from('supplier_payment_allocations')
      .select('id')
      .eq('supplier_payment_id', id);

    if (allocations && allocations.length > 0) {
      return errorResponse('Cannot delete payment with allocations', 400);
    }

    const { error } = await supabase
      .from('supplier_payments')
      .delete()
      .eq('id', id);

    if (error) {
      return errorResponse(error.message, 400);
    }

    return successResponse('Supplier payment deleted successfully');
  } catch (error) {
    return serverErrorResponse('Failed to delete supplier payment', error);
  }
}