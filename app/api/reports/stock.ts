import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const statusFilter = searchParams.get('status');

    let query = supabase.from('item_store_stock').select('*');

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const items = (data || []).map((item) => {
      let status = 'OK';
      // @ts-ignore
      if (item.quantity_on_hand === 0) {
        status = 'OUT_OF_STOCK';
        // @ts-ignore
      } else if (item.quantity_on_hand < item.reorder_level * 0.5) {
        status = 'CRITICAL';
        // @ts-ignore
      } else if (item.quantity_on_hand < item.reorder_level) {
        status = 'LOW';
      }

      return {
        ...item,
        status,
        // @ts-ignore
        valuation: item.quantity_on_hand * (item.cost_price || 0),
      };
    });

    const filteredItems = statusFilter ? items.filter((i) => i.status === statusFilter) : items;

    const totalItems = filteredItems.length;
    const totalQuantity = filteredItems.reduce((sum, i) => sum + i.quantity_on_hand, 0);
    const totalValuation = filteredItems.reduce((sum, i) => sum + i.valuation, 0);

    return Response.json(
      successResponse({
        store_name: 'All Stores',
        totalItems,
        totalQuantity,
        totalValuation,
        items: filteredItems,
      })
    );
  } catch (error) {
    console.error('Error generating stock report:', error);
    return Response.json(errorResponse('Failed to generate report'), { status: 500 });
  }
}
