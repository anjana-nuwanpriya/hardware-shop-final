import { supabase } from '@/lib/supabase';
import { SupplierSchema } from '@/lib/validation';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

// GET /api/suppliers/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return notFoundResponse('Supplier not found');
    }

    return successResponse(data);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT /api/suppliers/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = SupplierSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { success: false, errors: validation.error.issues },
        { status: 422 }
      );
    }

    const validatedData = validation.data;

    // Check if supplier exists
    const { data: existing, error: existingError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (existingError || !existing) {
      return notFoundResponse('Supplier not found');
    }

    const { data, error } = await supabase
      .from('suppliers')
      .update({
        name: validatedData.name,
        contact_person: validatedData.contact_person || null,
        phone: validatedData.phone || null,
        email: validatedData.email || null,
        address: validatedData.address || null,
        tax_number: validatedData.tax_number || null,
        payment_terms: validatedData.payment_terms || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Supplier updated successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PATCH /api/suppliers/[id] - Soft delete
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: existing, error: existingError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (existingError || !existing) {
      return notFoundResponse('Supplier not found');
    }

    const { data, error } = await supabase
      .from('suppliers')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Supplier deleted successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}