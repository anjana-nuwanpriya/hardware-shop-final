import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason');

    let query = supabase
      .from('purchase_returns')
      .select(`
        *,
        supplier:suppliers(name),
        store:stores(name)
      `)
      .eq('is_active', true)
      .order('return_date', { ascending: false });

    if (reason && reason !== 'all') {
      query = query.eq('return_reason', reason);
    }

    const { data, error } = await query;

    if (error) throw error;

    const formatted = data.map((ret: any) => ({
      ...ret,
      supplier_name: ret.supplier?.name,
      store_name: ret.store?.name,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching purchase returns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch purchase returns' },
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
      grn_reference_id,
      return_reason,
      items = [],
      description,
    } = body;

    if (!supplier_id || !store_id || !return_reason || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate total
    let totalAmount = 0;
    items.forEach((item: any) => {
      const lineTotal = item.return_qty * item.cost_price;
      const discount = (lineTotal * (item.discount_percent || 0)) / 100;
      totalAmount += lineTotal - discount;
    });

    // Generate return number
    const { data: lastReturn } = await supabase
      .from('purchase_returns')
      .select('return_number')
      .order('created_at', { ascending: false })
      .limit(1);

    const nextNumber = (lastReturn && lastReturn.length > 0)
      ? parseInt(lastReturn[0].return_number.split('-').pop() || '0') + 1
      : 1;
    const return_number = `PRET-${String(nextNumber).padStart(6, '0')}`;

    // Create return
    const { data: ret, error: retError } = await supabase
      .from('purchase_returns')
      .insert([
        {
          return_number,
          return_date: new Date().toISOString().split('T')[0],
          supplier_id,
          store_id,
          grn_reference_id,
          return_reason,
          total_amount: totalAmount,
          description,
          is_active: true,
        },
      ])
      .select();

    if (retError) throw retError;

    if (!ret || ret.length === 0) {
      throw new Error('Failed to create return');
    }

    const returnId = ret[0].id;

    // Add items and reduce stock
    if (items.length > 0) {
      const lineItems = items.map((item: any) => ({
        purchase_return_id: returnId,
        item_id: item.item_id,
        batch_no: item.batch_no,
        available_qty: item.available_qty,
        return_qty: item.return_qty,
        cost_price: item.cost_price,
        discount_percent: item.discount_percent || 0,
        discount_value: (item.return_qty * item.cost_price * (item.discount_percent || 0)) / 100,
        net_value: item.return_qty * item.cost_price - ((item.return_qty * item.cost_price * (item.discount_percent || 0)) / 100),
      }));

      const { error: itemsError } = await supabase
        .from('purchase_return_items')
        .insert(lineItems);

      if (itemsError) throw itemsError;

      // Reduce stock for each item
      for (const item of items) {
        await supabase.from('inventory_transactions').insert([
          {
            item_id: item.item_id,
            store_id,
            transaction_type: 'purchase_return',
            quantity: -item.return_qty,
            batch_no: item.batch_no,
            reference_id: returnId,
            reference_type: 'purchase_return',
          },
        ]);

        const { data: stock } = await supabase
          .from('item_store_stock')
          .select('id, quantity_on_hand')
          .eq('item_id', item.item_id)
          .eq('store_id', store_id)
          .single();

        if (stock) {
          const newQty = Math.max(0, stock.quantity_on_hand - item.return_qty);
          await supabase
            .from('item_store_stock')
            .update({ quantity_on_hand: newQty })
            .eq('id', stock.id);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: returnId,
          return_number,
          total_amount: totalAmount,
        },
        message: 'Purchase return created. Stock updated and supplier credit created.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating purchase return:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create purchase return' },
      { status: 500 }
    );
  }
}