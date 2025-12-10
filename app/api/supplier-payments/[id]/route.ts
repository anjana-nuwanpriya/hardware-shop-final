import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('supplier_payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return Response.json(errorResponse('Payment not found'), { status: 404 });
    }

    // Get allocations
    const { data: allocations } = await supabase
      .from('supplier_payment_allocations')
      .select('*')
      .eq('supplier_payment_id', id);

    return Response.json(successResponse({ ...data, allocations }));
  } catch (error) {
    console.error('Error fetching payment:', error);
    return Response.json(errorResponse('Failed to fetch payment'), { status: 500 });
  }
}