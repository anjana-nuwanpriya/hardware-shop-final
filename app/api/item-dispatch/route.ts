import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/item-dispatch - List all dispatches with filters
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const from_store = searchParams.get('from_store');
    const to_store = searchParams.get('to_store');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('item_dispatch_notes')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('dispatch_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (from_store) {
      query = query.eq('from_store_id', from_store);
    }

    if (to_store) {
      query = query.eq('to_store_id', to_store);
    }

    if (search) {
      query = query.or(
        `dispatch_number.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Fetch store names
    const storeIds = new Set<string>();
    data?.forEach((d: any) => {
      if (d.from_store_id) storeIds.add(d.from_store_id);
      if (d.to_store_id) storeIds.add(d.to_store_id);
    });

    let storeMap = new Map();
    if (storeIds.size > 0) {
      const { data: stores } = await supabase
        .from('stores')
        .select('id, code, name')
        .in('id', Array.from(storeIds));

      storeMap = new Map(stores?.map((s: any) => [s.id, s]) || []);
    }

    const formatted = (data || []).map((d: any) => ({
      ...d,
      from_store_name: storeMap.get(d.from_store_id)?.name,
      from_store_code: storeMap.get(d.from_store_id)?.code,
      to_store_name: storeMap.get(d.to_store_id)?.name,
      to_store_code: storeMap.get(d.to_store_id)?.code,
    }));

    return NextResponse.json(
      {
        success: true,
        data: formatted,
        message: 'Dispatches retrieved successfully',
        pagination: { total: count || 0, limit, offset },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ GET /api/item-dispatch error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch dispatches' },
      { status: 500 }
    );
  }
}

// POST /api/item-dispatch - Create new dispatch (NO STOCK CHANGE YET)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { from_store_id, to_store_id, description, items } = body;

    console.log('📝 Creating dispatch:', {
      from_store_id,
      to_store_id,
      itemCount: items?.length,
    });

    // Validation
    if (!from_store_id || !to_store_id) {
      return NextResponse.json(
        { success: false, error: 'from_store_id and to_store_id are required' },
        { status: 400 }
      );
    }

    if (from_store_id === to_store_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Source and destination stores must be different',
        },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // ✅ CHECK: Validate stock availability at source store
    const { data: stockData, error: stockError } = await supabase
      .from('item_store_stock')
      .select('item_id, quantity_on_hand')
      .eq('store_id', from_store_id)
      .in('item_id', items.map((i: any) => i.item_id));

    if (stockError) throw stockError;

    const stockMap = new Map(
      (stockData || []).map((s: any) => [s.item_id, s.quantity_on_hand])
    );

    for (const item of items) {
      const available = stockMap.get(item.item_id) || 0;
      if (item.quantity > available) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock. Available: ${available}, Required: ${item.quantity}`,
          },
          { status: 400 }
        );
      }
    }

    // Generate dispatch number
    const { data: lastDispatch } = await supabase
      .from('item_dispatch_notes')
      .select('dispatch_number')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (lastDispatch && lastDispatch.length > 0) {
      const lastNum = parseInt(
        lastDispatch[0].dispatch_number.split('-').pop() || '0'
      );
      nextNumber = lastNum + 1;
    }

    const dispatchNumber = `DISP-${String(nextNumber).padStart(6, '0')}`;

    // Calculate totals
    const totalQuantity = items.reduce((sum: number, i: any) => sum + i.quantity, 0);
    const totalValue = items.reduce(
      (sum: number, i: any) => sum + i.quantity * i.cost_price,
      0
    );

    // Create dispatch note (status=pending, NO STOCK CHANGE YET)
    const { data: dispatchData, error: dispatchError } = await supabase
      .from('item_dispatch_notes')
      .insert({
        dispatch_number: dispatchNumber,
        dispatch_date: new Date().toISOString().split('T')[0],
        from_store_id,
        to_store_id,
        status: 'pending', // ⭐ Just created, not shipped yet
        total_items: items.length,
        total_quantity: totalQuantity,
        description: description || null,
        employee_id: null,
        is_active: true,
      })
      .select()
      .single();

    if (dispatchError) throw dispatchError;

    console.log('✅ Dispatch created:', dispatchData.id);

    // Insert dispatch items
    const dispatchItems = items.map((item: any) => ({
      dispatch_id: dispatchData.id,
      item_id: item.item_id,
      quantity: item.quantity,
      batch_no: item.batch_no || null,
      batch_expiry: item.batch_expiry || null,
      cost_price: item.cost_price,
      retail_price: item.retail_price,
      wholesale_price: item.wholesale_price,
      unit_of_measure: item.unit_of_measure,
      dispatch_value: item.quantity * item.cost_price,
    }));

    const { error: itemsError } = await supabase
      .from('item_dispatch_items')
      .insert(dispatchItems);

    if (itemsError) throw itemsError;

    console.log('✅ Dispatch items created (stock NOT changed yet)');

    // Fetch full dispatch for response
    const { data: fullDispatch } = await supabase
      .from('item_dispatch_notes')
      .select('*')
      .eq('id', dispatchData.id)
      .single();

    const { data: stores } = await supabase
      .from('stores')
      .select('id, code, name')
      .in('id', [from_store_id, to_store_id]);

    const storeMap = new Map(stores?.map((s: any) => [s.id, s]) || []);

    const { data: dispatchItemsData } = await supabase
      .from('item_dispatch_items')
      .select('*')
      .eq('dispatch_id', dispatchData.id);

    const formatted = {
      ...fullDispatch,
      from_store_name: storeMap.get(from_store_id)?.name,
      from_store_code: storeMap.get(from_store_id)?.code,
      to_store_name: storeMap.get(to_store_id)?.name,
      to_store_code: storeMap.get(to_store_id)?.code,
      items: dispatchItemsData || [],
    };

    console.log('✅ Dispatch created (awaiting dispatch/receive)');

    return NextResponse.json(
      { success: true, data: formatted, message: 'Dispatch created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ POST /api/item-dispatch error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create dispatch' },
      { status: 500 }
    );
  }
}