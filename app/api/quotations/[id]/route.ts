import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return Response.json(errorResponse('Quotation not found'), { status: 404 });
    }

    return Response.json(successResponse(data));
  } catch (error) {
    console.error('Error fetching quotation:', error);
    return Response.json(errorResponse('Failed to fetch quotation'), { status: 500 });
  }
}