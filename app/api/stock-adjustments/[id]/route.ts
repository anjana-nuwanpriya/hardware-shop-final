import { supabase } from '@/lib/supabase';
import { notFoundResponse, serverErrorResponse, successResponse } from '@/lib/api-response';

// GET /api/stock-adjustments/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }) {
  try {
    const { id } = await params;

    // Get adjustment header
    const { data: adjustment, error: adjustmentError } = await supabase
      .from('stock_adjustments')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (adjustmentError || !adjustment) {
      return notFoundResponse('Stock adjustment not found');
    }

    // Get line items
    const { data: items, error: itemsError } = await supabase
      .from('stock_adjustment_items')
      .select('*')
      .eq('stock_adjustment_id', id);

    if (itemsError) return serverErrorResponse(itemsError);

    return successResponse(
      { ...adjustment, items },
      'Stock adjustment retrieved successfully'
    );
  } catch (error) {
    return serverErrorResponse(error);
  }
}