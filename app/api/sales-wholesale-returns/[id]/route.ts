import { supabase } from '@/lib/supabase';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('sales_wholesale_returns')
      .select(
        `
        id,
        return_number,
        return_date,
        customer_id,
        store_id,
        sales_wholesale_id,
        return_reason,
        refund_method,
        total_refund_amount,
        description,
        employee_id,
        is_active,
        created_at,
        updated_at,
        customers(id, name, phone, email),
        stores(id, code, name),
        employees(id, name),
        sales_wholesale_return_items(
          id,
          item_id,
          batch_no,
          original_qty,
          return_qty,
          unit_price,
          discount_percent,
          discount_value,
          refund_value,
          items(id, code, name)
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { refund_method, description } = body;

    const updateData: any = {};
    if (refund_method !== undefined) updateData.refund_method = refund_method;
    if (description !== undefined) updateData.description = description;

    const { data, error } = await supabase
      .from('sales_wholesale_returns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      action: 'UPDATE',
      table_name: 'sales_wholesale_returns',
      record_id: id,
      new_values: updateData,
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Get the return first
    const { data: returnData, error: getError } = await supabase
      .from('sales_wholesale_returns')
      .select('*')
      .eq('id', id)
      .single();

    if (getError || !returnData) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    }

    // Get all items in the return
    const { data: items, error: itemsError } = await supabase
      .from('sales_wholesale_return_items')
      .select('*')
      .eq('sales_wholesale_return_id', id);

    if (itemsError) {
      console.error('Items fetch error:', itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Revert stock for each item (remove from stock again)
    if (items && items.length > 0) {
      for (const item of items) {
        // Get current stock
        const { data: stockData } = await supabase
          .from('item_store_stock')
          .select('quantity_on_hand')
          .eq('item_id', item.item_id)
          .eq('store_id', returnData.store_id)
          .single();

        const currentStock = stockData?.quantity_on_hand || 0;
        const newStock = currentStock - item.return_qty;

        // Update stock back (remove the return)
        await supabase
          .from('item_store_stock')
          .update({ quantity_on_hand: newStock })
          .eq('item_id', item.item_id)
          .eq('store_id', returnData.store_id);

        // Create reversal inventory transaction
        await supabase.from('inventory_transactions').insert({
          item_id: item.item_id,
          store_id: returnData.store_id,
          transaction_type: 'sale',
          quantity: -item.return_qty,
          batch_no: item.batch_no || null,
          reference_id: id,
          reference_type: 'sales_wholesale_returns',
          notes: `Reversal of return ${returnData.return_number}`,
        });
      }
    }

    // Soft delete the return
    const { error: deleteError } = await supabase
      .from('sales_wholesale_returns')
      .update({ is_active: false })
      .eq('id', id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      action: 'DELETE',
      table_name: 'sales_wholesale_returns',
      record_id: id,
      old_values: returnData,
    });

    return NextResponse.json({ message: 'Return deleted and stock reverted' });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}