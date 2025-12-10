import { supabase } from '@/lib/supabase';
import { ItemSchema } from '@/lib/validation';
import { successResponse, createdResponse, serverErrorResponse } from '@/lib/api-response';

// GET /api/items
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('category_id') || '';
    const isActive = searchParams.get('is_active') !== 'false';

    let query = supabase
      .from('items')
      .select('id, code, name, description, category_id, cost_price, retail_price, wholesale_price, barcode, hsn_code, unit_of_measure, reorder_level, tax_method, tax_rate, is_active, created_at')
      .eq('is_active', isActive)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,barcode.ilike.%${search}%`);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Items retrieved successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST /api/items
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = ItemSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { success: false, errors: validation.error.issues },
        { status: 422 }
      );
    }

    const validatedData = validation.data;

    // Check for duplicate code
    const { data: existingCode } = await supabase
      .from('items')
      .select('id')
      .eq('code', validatedData.code)
      .eq('is_active', true)
      .single();

    if (existingCode) {
      return Response.json(
        { 
          success: false, 
          errors: [{ path: ['code'], message: 'Item code already exists' }]
        },
        { status: 422 }
      );
    }

    // Check for duplicate barcode if provided
    if (validatedData.barcode) {
      const { data: existingBarcode } = await supabase
        .from('items')
        .select('id')
        .eq('barcode', validatedData.barcode)
        .eq('is_active', true)
        .single();

      if (existingBarcode) {
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
      .insert([validatedData])
      .select()
      .single();

    if (error) return serverErrorResponse(error);
    return createdResponse(data, 'Item created successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}
