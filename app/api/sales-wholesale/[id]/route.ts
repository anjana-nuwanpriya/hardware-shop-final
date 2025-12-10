import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const { data, error } = await supabase
      .from('sales_wholesale')
      .select(
        `
        id,
        invoice_number,
        invoice_date,
        sale_date,
        customer_id,
        store_id,
        employee_id,
        payment_method,
        payment_status,
        subtotal,
        discount,
        tax,
        total_amount,
        description,
        is_active,
        created_at,
        updated_at,
        customers(id, name, type, phone, email),
        stores(id, code, name),
        employees(id, name),
        sales_wholesale_items(
          id,
          item_id,
          batch_no,
          quantity,
          unit_price,
          discount_percent,
          discount_value,
          tax_value,
          net_value,
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
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

    const { payment_status, payment_method, description } = body;

    const updateData: any = {};
    if (payment_status !== undefined) updateData.payment_status = payment_status;
    if (payment_method !== undefined) updateData.payment_method = payment_method;
    if (description !== undefined) updateData.description = description;

    const { data, error } = await supabase
      .from('sales_wholesale')
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
      table_name: 'sales_wholesale',
      record_id: id,
      new_values: updateData,
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Get the sale first
    const { data: sale, error: getError } = await supabase
      .from('sales_wholesale')
      .select('*')
      .eq('id', id)
      .single();

    if (getError || !sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Get all items in the sale
    const { data: items, error: itemsError } = await supabase
      .from('sales_wholesale_items')
      .select('*')
      .eq('sales_wholesale_id', id);

    if (itemsError) {
      console.error('Items fetch error:', itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Revert stock for each item
    if (items && items.length > 0) {
      for (const item of items) {
        // Get current stock
        const { data: stockData } = await supabase
          .from('item_store_stock')
          .select('quantity_on_hand')
          .eq('item_id', item.item_id)
          .eq('store_id', sale.store_id)
          .single();

        const currentStock = stockData?.quantity_on_hand || 0;
        const newStock = currentStock + item.quantity;

        // Update stock back
        await supabase
          .from('item_store_stock')
          .update({ quantity_on_hand: newStock })
          .eq('item_id', item.item_id)
          .eq('store_id', sale.store_id);

        // Create reversal inventory transaction
        await supabase.from('inventory_transactions').insert({
          item_id: item.item_id,
          store_id: sale.store_id,
          transaction_type: 'sale_return',
          quantity: item.quantity,
          batch_no: item.batch_no || null,
          reference_id: id,
          reference_type: 'sales_wholesale',
          notes: `Reversal of wholesale sale ${sale.invoice_number}`,
        });
      }
    }

    // Soft delete the sale
    const { error: deleteError } = await supabase
      .from('sales_wholesale')
      .update({ is_active: false })
      .eq('id', id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      action: 'DELETE',
      table_name: 'sales_wholesale',
      record_id: id,
      old_values: sale,
    });

    return NextResponse.json({ message: 'Sale deleted and stock reverted' });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}