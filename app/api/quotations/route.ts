import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse, createdResponse } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .order('quotation_date', { ascending: false });

    if (error) throw error;

    return Response.json(successResponse(data || []));
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return Response.json(errorResponse('Failed to fetch quotations'), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, store_id, valid_until, items } = body;

    if (!customer_id || !store_id || !valid_until || !items || items.length === 0) {
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

    const { data: quotData, error: quotError } = await supabase
      .from('quotations')
      .insert({
        quotation_number: `QUOT-${Date.now()}`,
        customer_id,
        store_id,
        valid_until,
        status: 'active',
        subtotal,
        discount: totalDiscount,
        tax: totalTax,
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (quotError) throw quotError;

    return Response.json(
      createdResponse({ id: quotData.id, quotation_number: quotData.quotation_number }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating quotation:', error);
    return Response.json(errorResponse('Failed to create quotation'), { status: 500 });
  }
}
