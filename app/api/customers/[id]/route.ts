import { supabase } from '@/lib/supabase';
import { CustomerSchema } from '@/lib/validation';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

// GET /api/customers/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return notFoundResponse('Customer not found');
    }

    return successResponse(data);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT /api/customers/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = CustomerSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { success: false, errors: validation.error.issues },
        { status: 422 }
      );
    }

    const validatedData = validation.data;

    // Check if customer exists
    const { data: existing, error: existingError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (existingError || !existing) {
      return notFoundResponse('Customer not found');
    }

    const { data, error } = await supabase
      .from('customers')
      .update({
        name: validatedData.name,
        type: validatedData.type || 'retail',
        contact_person: validatedData.contact_person || null,
        phone: validatedData.phone || null,
        email: validatedData.email || null,
        address: validatedData.address || null,
        tax_number: validatedData.tax_number || null,
        credit_limit: validatedData.credit_limit || 0,
        customer_since_date: validatedData.customer_since_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Customer updated successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PATCH /api/customers/[id] - Soft delete
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: existing, error: existingError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (existingError || !existing) {
      return notFoundResponse('Customer not found');
    }

    const { data, error } = await supabase
      .from('customers')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Customer deleted successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}
