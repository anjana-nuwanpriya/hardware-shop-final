import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('sales_returns')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return Response.json(errorResponse('Return not found'), { status: 404 });
    }

    return Response.json(successResponse(data));
  } catch (error) {
    console.error('Error fetching return:', error);
    return Response.json(errorResponse('Failed to fetch return'), { status: 500 });
  }
}
