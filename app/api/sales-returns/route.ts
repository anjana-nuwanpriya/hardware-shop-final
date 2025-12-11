import { supabase } from '@/lib/supabase';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');
    const customerId = searchParams.get('customer_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let query = supabase
      .from('sales_returns')
      .select(
        `
        id,
        return_number,
        return_date,
        customer_id,
        store_id,
        sales_retail_id,
        return_reason,
        refund_method,
        total_refund_amount,
        description,
        employee_id,
        is_active,
        created_at,
        customers(id, name, phone, email),
        stores(id, code, name),
        employees(id, name)
      `
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (dateFrom) {
      query = query.gte('return_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('return_date', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer_id,
      store_id,
      sales_retail_id,
      employee_id,
      return_reason,
      refund_method,
      description,
      items,
    } = body;

    // Validate required fields
    if (!customer_id) {
      return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
    }

    if (!store_id) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    if (!return_reason) {
      return NextResponse.json({ error: 'return_reason is required' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Get next return number
    const { data: lastReturn } = await supabase
      .from('sales_returns')
      .select('return_number')
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (lastReturn && lastReturn.length > 0) {
      const lastNum = parseInt(lastReturn[0].return_number.split('-').pop() || '0');
      nextNumber = lastNum + 1;
    }

    const returnNumber = `SRET-${String(nextNumber).padStart(6, '0')}`;

    // Calculate total refund
    let totalRefund = 0;
    for (const item of items) {
      if (!item.item_id || item.return_qty <= 0 || item.unit_price <= 0) {
        return NextResponse.json({ error: 'Invalid item data' }, { status: 400 });
      }
      const itemTotal = item.unit_price * item.return_qty - (item.discount_value || 0);
      totalRefund += itemTotal;
    }

    // Start transaction
    const returnId = uuidv4();

    // Create sales_returns record
    const { error: returnError } = await supabase.from('sales_returns').insert({
      id: returnId,
      return_number: returnNumber,
      customer_id,
      store_id,
      sales_retail_id: sales_retail_id || null,
      employee_id: employee_id || null,
      return_reason,
      refund_method: refund_method || 'cash',
      total_refund_amount: totalRefund,
      description: description || null,
      is_active: true,
    });

    if (returnError) {
      console.error('Return creation error:', returnError);
      return NextResponse.json({ error: returnError.message }, { status: 500 });
    }

    // Create line items
    const lineItemsToInsert = items.map((item: any) => ({
      sales_return_id: returnId,
      item_id: item.item_id,
      batch_no: item.batch_no || null,
      original_qty: item.original_qty || item.return_qty,
      return_qty: item.return_qty,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent || 0,
      discount_value: item.discount_value || 0,
      refund_value:
        item.unit_price * item.return_qty - (item.discount_value || 0),
    }));

    const { error: itemsError } = await supabase
      .from('sales_return_items')
      .insert(lineItemsToInsert);

    if (itemsError) {
      console.error('Line items error:', itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Add stock back and create inventory transactions
    for (const item of items) {
      // Get current stock
      const { data: stockData } = await supabase
        .from('item_store_stock')
        .select('quantity_on_hand')
        .eq('item_id', item.item_id)
        .eq('store_id', store_id)
        .single();

      const currentStock = stockData?.quantity_on_hand || 0;
      const newStock = currentStock + item.return_qty;

      // Update stock
      const { error: stockError } = await supabase
        .from('item_store_stock')
        .update({ quantity_on_hand: newStock })
        .eq('item_id', item.item_id)
        .eq('store_id', store_id);

      if (stockError) {
        console.error('Stock update error:', stockError);
      }

      // Create inventory transaction
      const { error: txError } = await supabase
        .from('inventory_transactions')
        .insert({
          item_id: item.item_id,
          store_id,
          transaction_type: 'sales_return',
          quantity: item.return_qty,
          batch_no: item.batch_no || null,
          reference_id: returnId,
          reference_type: 'sales_returns',
          notes: `Retail return ${returnNumber}`,
          created_by: employee_id || null,
        });

      if (txError) {
        console.error('Transaction creation error:', txError);
      }
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      user_id: employee_id || null,
      action: 'CREATE',
      table_name: 'sales_returns',
      record_id: returnId,
      new_values: {
        return_number: returnNumber,
        total_refund_amount: totalRefund,
        items_count: items.length,
      },
    });

    return NextResponse.json(
      {
        data: {
          id: returnId,
          return_number: returnNumber,
          total_refund_amount: totalRefund,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}