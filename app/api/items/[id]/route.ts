import { supabase } from '@/lib/supabase';
import { ItemSchema } from '@/lib/validation';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

// GET /api/items/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return notFoundResponse('Item not found');
    }

    return successResponse(data);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT /api/items/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = ItemSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { success: false, errors: validation.error.issues },
        { status: 422 }
      );
    }

    const validatedData = validation.data;

    // Check if item exists
    const { data: existing, error: existingError } = await supabase
      .from('items')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (existingError || !existing) {
      return notFoundResponse('Item not found');
    }

    // Check for duplicate code (excluding current)
    const { data: duplicateCode } = await supabase
      .from('items')
      .select('id')
      .eq('code', validatedData.code)
      .neq('id', id)
      .eq('is_active', true)
      .single();

    if (duplicateCode) {
      return Response.json(
        { 
          success: false, 
          errors: [{ path: ['code'], message: 'Item code already exists' }]
        },
        { status: 422 }
      );
    }

    // Check for duplicate barcode if provided (excluding current)
    if (validatedData.barcode) {
      const { data: duplicateBarcode } = await supabase
        .from('items')
        .select('id')
        .eq('barcode', validatedData.barcode)
        .neq('id', id)
        .eq('is_active', true)
        .single();

      if (duplicateBarcode) {
        return Response.json(
          { 
            success: false, 
            errors: [{ path: ['barcode'], message: 'Barcode already exists' }]
          },
          { status: 422 }
        );
      }
    }

    const { data, error } = await supabase
      .from('items')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Item updated successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PATCH /api/items/[id] - Soft delete
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: existing, error: existingError } = await supabase
      .from('items')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (existingError || !existing) {
      return notFoundResponse('Item not found');
    }

    const { data, error } = await supabase
      .from('items')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Item deleted successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}