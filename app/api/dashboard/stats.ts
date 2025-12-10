import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Today's sales
    const { data: salesToday } = await supabase
      .from('sales_retail')
      .select('total_amount')
      .eq('sale_date', today);

    const todaysSales = (salesToday || []).reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const todaysInvoices = salesToday?.length || 0;

    // Outstanding receivables
    const { data: receivables } = await supabase
      .from('sales_retail')
      .select('total_amount, payment_status')
      .neq('payment_status', 'paid');

    const totalReceivables = (receivables || []).reduce(
      (sum, r) => sum + (r.payment_status === 'partially_paid' ? r.total_amount * 0.5 : r.total_amount),
      0
    );

    // Outstanding payables
    const { data: payables } = await supabase
      .from('purchase_grns')
      .select('total_amount, payment_status')
      .neq('payment_status', 'paid');

    const totalPayables = (payables || []).reduce(
      (sum, p) => sum + (p.payment_status === 'partially_paid' ? p.total_amount * 0.5 : p.total_amount),
      0
    );

    // Low stock items
    const { data: lowStock } = await supabase
      .from('item_store_stock')
      .select('items(name, reorder_level)')
      .lt('quantity_on_hand', 'items.reorder_level');

    // Top 5 items today
    const { data: topItems } = await supabase
      .from('sales_retail_items')
      .select('items(name), quantity')
      .limit(5);

    return Response.json(
      successResponse({
        todaysSales,
        todaysInvoices,
        totalReceivables,
        totalPayables,
        lowStockCount: lowStock?.length || 0,
        topSellingItems: topItems || [],
      })
    );
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return Response.json(errorResponse('Failed to fetch stats'), { status: 500 });
  }
}
