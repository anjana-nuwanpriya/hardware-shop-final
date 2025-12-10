import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse, createdResponse } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from('sales_returns')
      .select('*')
      .order('return_date', { ascending: false });

    if (error) throw error;

    return Response.json(successResponse(data || []));
  } catch (error) {
    console.error('Error fetching returns:', error);
    return Response.json(errorResponse('Failed to fetch returns'), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, store_id, return_reason, items } = body;

    if (!customer_id || !store_id || !return_reason || !items || items.length === 0) {
      return Response.json(errorResponse('Missing required fields'), { status: 422 });
    }

    let totalRefund = 0;
    for (const item of items) {
      totalRefund += item.unit_price * item.return_qty;
    }

    const { data: returnData, error: returnError } = await supabase
      .from('sales_returns')
      .insert({
        return_number: `SRET-${Date.now()}`,
        customer_id,
        store_id,
        return_reason,
        refund_method: 'credit_note',
        total_refund_amount: totalRefund,
      })
      .select()
      .single();

    if (returnError) throw returnError;

    // ADD stock back (reverse the sale)
    for (const item of items) {
      const { data: stockRecord } = await supabase
        .from('item_store_stock')
        .select('*')
        .eq('item_id', item.item_id)
        .eq('store_id', store_id)
        .single();

      if (stockRecord) {
        const newQty = stockRecord.quantity_on_hand + item.return_qty;
        await supabase
          .from('item_store_stock')
          .update({ quantity_on_hand: newQty })
          .eq('id', stockRecord.id);

        await supabase
          .from('inventory_transactions')
          .insert({
            item_id: item.item_id,
            store_id,
            transaction_type: 'sales_return',
            quantity: item.return_qty,
            reference_id: returnData.id,
            reference_type: 'sales_return',
          });
      }
    }

    return Response.json(
      createdResponse({ id: returnData.id, return_number: returnData.return_number }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating return:', error);
    return Response.json(errorResponse('Failed to create return'), { status: 500 });
  }
}
