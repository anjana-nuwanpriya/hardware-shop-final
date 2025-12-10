import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentStatus = searchParams.get('payment_status');
    const storeId = searchParams.get('store_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let query = supabase
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
        customers(id, name, type),
        stores(id, code, name),
        employees(id, name)
      `
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    if (dateFrom) {
      query = query.gte('sale_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('sale_date', dateTo);
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
    const { customer_id, store_id, employee_id, payment_method, description, items } = body;

    // Validate required fields
    if (!store_id) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Get next invoice number
    const { data: lastInvoice } = await supabase
      .from('sales_wholesale')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (lastInvoice && lastInvoice.length > 0) {
      const lastNum = parseInt(lastInvoice[0].invoice_number.split('-').pop() || '0');
      nextNumber = lastNum + 1;
    }

    const invoiceNumber = `WINV-${String(nextNumber).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    // Validate and calculate
    for (const item of items) {
      if (!item.item_id || item.quantity <= 0 || item.unit_price <= 0) {
        return NextResponse.json({ error: 'Invalid item data' }, { status: 400 });
      }

      const lineSubtotal = item.unit_price * item.quantity;
      const lineDiscount = item.discount_value || 0;
      const lineTotal = lineSubtotal - lineDiscount;

      subtotal += lineSubtotal;
      totalDiscount += lineDiscount;
      totalTax += item.tax_value || 0;
    }

    const totalAmount = subtotal - totalDiscount + totalTax;

    // Start transaction
    const invoiceId = uuidv4();

    // Create sales_wholesale record
    const { error: invoiceError } = await supabase.from('sales_wholesale').insert({
      id: invoiceId,
      invoice_number: invoiceNumber,
      customer_id: customer_id || null,
      store_id,
      employee_id: employee_id || null,
      payment_method: payment_method || 'cash',
      payment_status: 'unpaid',
      subtotal,
      discount: totalDiscount,
      tax: totalTax,
      total_amount: totalAmount,
      description: description || null,
      is_active: true,
    });

    if (invoiceError) {
      console.error('Invoice creation error:', invoiceError);
      return NextResponse.json({ error: invoiceError.message }, { status: 500 });
    }

    // Create line items
    const lineItemsToInsert = items.map((item: any) => ({
      sales_wholesale_id: invoiceId,
      item_id: item.item_id,
      batch_no: item.batch_no || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent || 0,
      discount_value: item.discount_value || 0,
      tax_value: item.tax_value || 0,
      net_value: item.unit_price * item.quantity - (item.discount_value || 0),
    }));

    const { error: itemsError } = await supabase
      .from('sales_wholesale_items')
      .insert(lineItemsToInsert);

    if (itemsError) {
      console.error('Line items error:', itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Deduct stock and create inventory transactions
    for (const item of items) {
      // Get current stock
      const { data: stockData } = await supabase
        .from('item_store_stock')
        .select('quantity_on_hand')
        .eq('item_id', item.item_id)
        .eq('store_id', store_id)
        .single();

      const currentStock = stockData?.quantity_on_hand || 0;
      const newStock = currentStock - item.quantity;

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
          transaction_type: 'sale',
          quantity: -item.quantity,
          batch_no: item.batch_no || null,
          reference_id: invoiceId,
          reference_type: 'sales_wholesale',
          notes: `Wholesale sale invoice ${invoiceNumber}`,
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
      table_name: 'sales_wholesale',
      record_id: invoiceId,
      new_values: {
        invoice_number: invoiceNumber,
        total_amount: totalAmount,
        items_count: items.length,
      },
    });

    return NextResponse.json(
      {
        data: {
          id: invoiceId,
          invoice_number: invoiceNumber,
          total_amount: totalAmount,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}