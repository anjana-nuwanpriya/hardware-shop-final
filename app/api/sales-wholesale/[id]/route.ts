import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('sales_wholesale')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return Response.json(errorResponse('Sale not found'), { status: 404 });
    }

    return Response.json(successResponse(data));
  } catch (error) {
    console.error('Error fetching sale:', error);
    return Response.json(errorResponse('Failed to fetch sale'), { status: 500 });
  }
}
