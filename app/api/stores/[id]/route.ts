import { supabase } from '@/lib/supabase';
import { StoreSchema } from '@/lib/validation';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

// GET /api/stores/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return notFoundResponse('Store not found');
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT /api/stores/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = StoreSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { success: false, errors: validation.error.issues },
        { status: 422 }
      );
    }

    const validatedData = validation.data;

    // Check if store exists
    const { data: existing, error: existingError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (existingError || !existing) {
      return notFoundResponse('Store not found');
    }

    // Check for duplicate code (excluding current)
    const { data: duplicate } = await supabase
      .from('stores')
      .select('id')
      .eq('code', validatedData.code)
      .neq('id', id)
      .eq('is_active', true)
      .single();

    if (duplicate) {
      return Response.json(
        { 
          success: false, 
          errors: [{ path: ['code'], message: 'Store code already exists' }]
        },
        { status: 422 }
      );
    }

    const { data, error } = await supabase
      .from('stores')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Store updated successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PATCH /api/stores/[id] - Soft delete
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }) {
  try {
    const { id } = await params;

    const { data: existing, error: existingError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (existingError || !existing) {
      return notFoundResponse('Store not found');
    }

    const { data, error } = await supabase
      .from('stores')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Store deleted successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}