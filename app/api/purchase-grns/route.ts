import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentStatus = searchParams.get('payment_status');

    let query = supabase
      .from('purchase_grns')
      .select(`
        *,
        supplier:suppliers(name),
        store:stores(name)
      `)
      .eq('is_active', true)
      .order('grn_date', { ascending: false });

    if (paymentStatus && paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus);
    }

    const { data, error } = await query;

    if (error) throw error;

    const formatted = data.map((grn: any) => ({
      ...grn,
      supplier_name: grn.supplier?.name,
      store_name: grn.store?.name,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch GRNs' },
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
      invoice_amount,
      items = [],
    } = body;

    if (!supplier_id || !store_id || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate total
    let totalAmount = 0;
    items.forEach((item: any) => {
      const lineTotal = item.received_qty * item.cost_price;
      const discount = (lineTotal * (item.discount_percent || 0)) / 100;
      totalAmount += lineTotal - discount;
    });

    // Generate GRN number
    const { data: lastGRN } = await supabase
      .from('purchase_grns')
      .select('grn_number')
      .order('created_at', { ascending: false })
      .limit(1);

    const nextNumber = (lastGRN && lastGRN.length > 0)
      ? parseInt(lastGRN[0].grn_number.split('-').pop() || '0') + 1
      : 1;
    const grn_number = `GRN-${String(nextNumber).padStart(6, '0')}`;

    // Create GRN
    const { data: grn, error: grnError } = await supabase
      .from('purchase_grns')
      .insert([
        {
          grn_number,
          grn_date: new Date().toISOString().split('T')[0],
          supplier_id,
          store_id,
          po_reference_id,
          invoice_number,
          invoice_date,
          invoice_amount,
          total_amount: totalAmount,
          payment_status: 'unpaid',
          is_active: true,
        },
      ])
      .select();

    if (grnError) throw grnError;

    if (!grn || grn.length === 0) {
      throw new Error('Failed to create GRN');
    }

    const grnId = grn[0].id;

    // Add items and update stock
    if (items.length > 0) {
      const lineItems = items.map((item: any) => ({
        purchase_grn_id: grnId,
        item_id: item.item_id,
        ordered_qty: item.ordered_qty,
        received_qty: item.received_qty,
        batch_no: item.batch_no,
        batch_expiry: item.batch_expiry,
        cost_price: item.cost_price,
        discount_percent: item.discount_percent || 0,
        discount_value: (item.received_qty * item.cost_price * (item.discount_percent || 0)) / 100,
        net_value: item.received_qty * item.cost_price - ((item.received_qty * item.cost_price * (item.discount_percent || 0)) / 100),
      }));

      const { error: itemsError } = await supabase
        .from('purchase_grn_items')
        .insert(lineItems);

      if (itemsError) throw itemsError;

      // Update stock for each item
      for (const item of items) {
        await supabase.from('inventory_transactions').insert([
          {
            item_id: item.item_id,
            store_id,
            transaction_type: 'grn',
            quantity: item.received_qty,
            batch_no: item.batch_no,
            batch_expiry: item.batch_expiry,
            reference_id: grnId,
            reference_type: 'purchase_grn',
          },
        ]);

        const { data: stock } = await supabase
          .from('item_store_stock')
          .select('id, quantity_on_hand')
          .eq('item_id', item.item_id)
          .eq('store_id', store_id)
          .single();

        if (stock) {
          await supabase
            .from('item_store_stock')
            .update({
              quantity_on_hand: stock.quantity_on_hand + item.received_qty,
            })
            .eq('id', stock.id);
        } else {
          await supabase.from('item_store_stock').insert([
            {
              item_id: item.item_id,
              store_id,
              quantity_on_hand: item.received_qty,
            },
          ]);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: grnId,
          grn_number,
          payment_status: 'unpaid',
          total_amount: totalAmount,
        },
        message: 'GRN created successfully. Stock updated and payable created.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating GRN:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create GRN' },
      { status: 500 }
    );
  }
}