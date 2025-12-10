import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse, createdResponse } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('sales_wholesale')
      .select('*')
      .order('invoice_date', { ascending: false });

    if (status) {
      query = query.eq('payment_status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return Response.json(successResponse(data || []));
  } catch (error) {
    console.error('Error fetching sales:', error);
    return Response.json(errorResponse('Failed to fetch sales'), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, store_id, payment_method, items } = body;

    if (!customer_id || !store_id || !items || items.length === 0) {
      return Response.json(errorResponse('Missing required fields'), { status: 422 });
    }

    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    for (const item of items) {
      const lineTotal = item.unit_price * item.quantity;
      const discount = item.discount_value || 0;
      subtotal += lineTotal;
      totalDiscount += discount;
    }

    const totalAmount = subtotal - totalDiscount + totalTax;

    const { data: saleData, error: saleError } = await supabase
      .from('sales_wholesale')
      .insert({
        invoice_number: `SINV-${Date.now()}`,
        customer_id,
        store_id,
        payment_method,
        payment_status: 'unpaid',
        subtotal,
        discount: totalDiscount,
        tax: totalTax,
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Deduct stock
    for (const item of items) {
      const { data: stockRecord } = await supabase
        .from('item_store_stock')
        .select('*')
        .eq('item_id', item.item_id)
        .eq('store_id', store_id)
        .single();

      if (stockRecord) {
        const newQty = stockRecord.quantity_on_hand - item.quantity;
        await supabase
          .from('item_store_stock')
          .update({ quantity_on_hand: newQty })
          .eq('id', stockRecord.id);

        await supabase
          .from('inventory_transactions')
          .insert({
            item_id: item.item_id,
            store_id,
            transaction_type: 'sale',
            quantity: -item.quantity,
            reference_id: saleData.id,
            reference_type: 'sales_wholesale',
          });
      }
    }

    return Response.json(
      createdResponse({ id: saleData.id, invoice_number: saleData.invoice_number }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating sale:', error);
    return Response.json(errorResponse('Failed to create sale'), { status: 500 });
  }
}
