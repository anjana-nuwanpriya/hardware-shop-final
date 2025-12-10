import { supabase } from '@/lib/supabase';
import { notFoundResponse, serverErrorResponse, successResponse } from '@/lib/api-response';

// GET /api/opening-stock/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get opening stock header
    const { data: entry, error: entryError } = await supabase
      .from('opening_stock_entries')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (entryError || !entry) {
      return notFoundResponse('Opening stock entry not found');
    }

    // Get line items
    const { data: items, error: itemsError } = await supabase
      .from('opening_stock_items')
      .select('*')
      .eq('opening_stock_entry_id', id);

    if (itemsError) return serverErrorResponse(itemsError);

    return successResponse({ ...entry, items }, 'Opening stock entry retrieved successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}
