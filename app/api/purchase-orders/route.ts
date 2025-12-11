import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(name),
        store:stores(name)
      `)
      .eq('is_active', true)
      .order('po_date', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    const formatted = data.map((po: any) => ({
      ...po,
      supplier_name: po.supplier?.name,
      store_name: po.store?.name,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch purchase orders' },
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
      expected_delivery_date,
      items = [],
      notes,
    } = body;

    if (!supplier_id || !store_id || !expected_delivery_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;

    items.forEach((item: any) => {
      const lineTotal = item.quantity * item.unit_cost;
      const discount = (lineTotal * (item.discount_percent || 0)) / 100;
      subtotal += lineTotal;
      totalDiscount += discount;
    });

    const total = subtotal - totalDiscount;

    // Generate PO number
    const { data: lastPO } = await supabase
      .from('purchase_orders')
      .select('po_number')
      .order('created_at', { ascending: false })
      .limit(1);

    const nextNumber = (lastPO && lastPO.length > 0)
      ? parseInt(lastPO[0].po_number.split('-').pop() || '0') + 1
      : 1;
    const po_number = `PO-${String(nextNumber).padStart(6, '0')}`;

    // Create PO
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert([
        {
          po_number,
          supplier_id,
          store_id,
          po_date: new Date().toISOString(),
          expected_delivery_date,
          status: 'pending',
          subtotal,
          discount: totalDiscount,
          tax: 0,
          total_amount: total,
          notes,
          is_active: true,
        },
      ])
      .select();

    if (poError) throw poError;

    // Add line items
    if (items.length > 0 && po && po.length > 0) {
      const lineItems = items.map((item: any) => ({
        purchase_order_id: po[0].id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        discount_percent: item.discount_percent || 0,
        discount_value: (item.quantity * item.unit_cost * (item.discount_percent || 0)) / 100,
        net_value: item.quantity * item.unit_cost - ((item.quantity * item.unit_cost * (item.discount_percent || 0)) / 100),
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(lineItems);

      if (itemsError) throw itemsError;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: po[0].id,
          po_number,
          status: 'pending',
          total_amount: total,
        },
        message: 'Purchase order created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
}