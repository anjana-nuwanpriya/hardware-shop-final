import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplier_id = searchParams.get('supplier_id');
    const store_id = searchParams.get('store_id');
    const status = searchParams.get('status');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sort = searchParams.get('sort') || 'grn_date';
    const order = searchParams.get('order') || 'desc';

    let query = supabase
      .from('purchase_grns')
      .select(
        `*,
        suppliers(name, contact_person, phone),
        stores(name, code),
        employees(name)`,
        { count: 'exact' }
      )
      .eq('is_active', true);

    if (supplier_id) query = query.eq('supplier_id', supplier_id);
    if (store_id) query = query.eq('store_id', store_id);
    if (status) query = query.eq('payment_status', status);
    if (date_from) query = query.gte('grn_date', date_from);
    if (date_to) query = query.lte('grn_date', date_to);

    const offset = (page - 1) * limit;
    query = query.order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('GRN GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch GRNs'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      supplier_id,
      store_id,
      po_reference_id,
      invoice_number,
      invoice_date,
      description,
      items
    } = body;

    // Validate required fields
    if (!supplier_id || !store_id || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Supplier, store, and items are required' },
        { status: 400 }
      );
    }

    // Get next GRN number
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'grn_next_number')
      .single();

    const nextNumber = (parseInt(settings?.setting_value || '1')).toString().padStart(6, '0');
    
    // Get store code
    const { data: store } = await supabase
      .from('stores')
      .select('code')
      .eq('id', store_id)
      .single();

    const grn_number = `${store?.code}-GRN-${nextNumber}`;

    // Calculate totals
    let subtotal = 0;
    let total_discount = 0;

    for (const item of items) {
      const line_total = (item.received_qty || 0) * (item.cost_price || 0);
      const discount_value = line_total * ((item.discount_percent || 0) / 100);
      subtotal += line_total;
      total_discount += discount_value;
    }

    const total_amount = subtotal - total_discount;

    // Create GRN header
    const { data: grnData, error: grnError } = await supabase
      .from('purchase_grns')
      .insert({
        grn_number,
        grn_date: new Date().toISOString(),
        supplier_id,
        store_id,
        po_reference_id: po_reference_id || null,
        invoice_number: invoice_number || null,
        invoice_date: invoice_date || null,
        total_amount,
        payment_status: 'unpaid',
        description: description || null,
        is_active: true
      })
      .select()
      .single();

    if (grnError) throw grnError;

    // Create line items and update stock
    for (const item of items) {
      const line_total = (item.received_qty || 0) * (item.cost_price || 0);
      const discount_value = line_total * ((item.discount_percent || 0) / 100);
      const net_value = line_total - discount_value;

      // Insert line item
      const { error: itemError } = await supabase
        .from('purchase_grn_items')
        .insert({
          purchase_grn_id: grnData.id,
          item_id: item.item_id,
          ordered_qty: item.ordered_qty || null,
          batch_no: item.batch_no || null,
          batch_expiry: item.batch_expiry || null,
          received_qty: item.received_qty,
          cost_price: item.cost_price,
          discount_percent: item.discount_percent || 0,
          discount_value: discount_value,
          net_value: net_value
        });

      if (itemError) throw itemError;

      // Create inventory transaction
      const { error: transError } = await supabase
        .from('inventory_transactions')
        .insert({
          item_id: item.item_id,
          store_id,
          transaction_type: 'grn',
          quantity: item.received_qty,
          batch_no: item.batch_no || null,
          batch_expiry: item.batch_expiry || null,
          reference_id: grnData.id,
          reference_type: 'purchase_grn'
        });

      if (transError) throw transError;

      // Update or insert stock
      const { data: existingStock } = await supabase
        .from('item_store_stock')
        .select('quantity_on_hand')
        .eq('item_id', item.item_id)
        .eq('store_id', store_id)
        .single();

      if (existingStock) {
        const { error: updateError } = await supabase
          .from('item_store_stock')
          .update({
            quantity_on_hand: (existingStock.quantity_on_hand || 0) + item.received_qty,
            updated_at: new Date().toISOString()
          })
          .eq('item_id', item.item_id)
          .eq('store_id', store_id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('item_store_stock')
          .insert({
            item_id: item.item_id,
            store_id,
            quantity_on_hand: item.received_qty
          });

        if (insertError) throw insertError;
      }
    }

    // Update system settings (next GRN number)
    const { error: settingsError } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'grn_next_number',
        setting_value: (parseInt(nextNumber) + 1).toString(),
        setting_type: 'integer'
      })
      .eq('setting_key', 'grn_next_number');

    if (settingsError) throw settingsError;

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: body.user_id || null,
        action: 'CREATE',
        table_name: 'purchase_grns',
        record_id: grnData.id,
        new_values: grnData
      });

    return NextResponse.json({
      success: true,
      data: grnData,
      message: `GRN ${grn_number} created successfully`
    });
  } catch (error) {
    console.error('GRN POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create GRN'
      },
      { status: 500 }
    );
  }
}