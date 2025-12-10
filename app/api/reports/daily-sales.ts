import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const storeId = searchParams.get('storeId');

    let query = supabase.from('sales_retail').select('*');

    if (fromDate) {
      query = query.gte('sale_date', fromDate);
    }

    if (toDate) {
      query = query.lte('sale_date', toDate);
    }

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query.order('sale_date', { ascending: false });

    if (error) throw error;

    const totalAmount = (data || []).reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const invoiceCount = data?.length || 0;

    const byStatus = {
      paid: (data || []).filter((s) => s.payment_status === 'paid').length,
      partially_paid: (data || []).filter((s) => s.payment_status === 'partially_paid').length,
      unpaid: (data || []).filter((s) => s.payment_status === 'unpaid').length,
    };

    return Response.json(
      successResponse({
        date: new Date().toISOString(),
        invoices: data || [],
        totalAmount,
        invoiceCount,
        byStatus,
      })
    );
  } catch (error) {
    console.error('Error generating daily sales report:', error);
    return Response.json(errorResponse('Failed to generate report'), { status: 500 });
  }
}
