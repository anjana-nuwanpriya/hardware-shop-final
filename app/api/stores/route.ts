import { supabase } from '@/lib/supabase';
import { StoreSchema } from '@/lib/validation';
import { storesResponse, createdResponse, serverErrorResponse } from '@/lib/api-response';

// GET /api/stores
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) return serverErrorResponse(error);
    return storesResponse(data, 'Stores retrieved successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST /api/stores
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = StoreSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { success: false, errors: validation.error.issues },
        { status: 422 }
      );
    }

    const validatedData = validation.data;

    // Check for duplicate code
    const { data: existing } = await supabase
      .from('stores')
      .select('id')
      .eq('code', validatedData.code)
      .eq('is_active', true)
      .single();

    if (existing) {
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
      .insert([validatedData])
      .select()
      .single();

    if (error) return serverErrorResponse(error);
    return createdResponse(data, 'Store created successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}