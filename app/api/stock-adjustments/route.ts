import { supabase } from '@/lib/supabase';
import { successResponse, createdResponse, serverErrorResponse } from '@/lib/api-response';

// GET /api/stock-adjustments
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const storeId = searchParams.get('store_id') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';

    let query = supabase
      .from('stock_adjustments')
      .select('*')
      .eq('is_active', true)
      .order('adjustment_date', { ascending: false });

    if (search) {
      query = query.ilike('adjustment_number', `%${search}%`);
    }

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    if (dateFrom) {
      query = query.gte('adjustment_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('adjustment_date', dateTo);
    }

    const { data, error } = await query;
    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Stock adjustments retrieved successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST /api/stock-adjustments
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adjustment_date, store_id, reason, items } = body;

    // Validation
    if (!adjustment_date || !store_id || !reason || !items || items.length === 0) {
      return Response.json(
        { success: false, errors: [{ message: 'Missing required fields' }] },
        { status: 422 }
      );
    }

    // Check store exists
    const { data: storeExists } = await supabase
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .single();

    if (!storeExists) {
      return Response.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      );
    }

    // Generate adjustment_number
    const { data: countData } = await supabase
      .from('stock_adjustments')
      .select('id', { count: 'exact', head: true });

    const nextNumber = (countData?.length || 0) + 1;
    const adjustmentNumber = `STADJ-${String(nextNumber).padStart(6, '0')}`;

    // Create adjustment header
    const { data: adjustment, error: adjustmentError } = await supabase
      .from('stock_adjustments')
      .insert([{
        adjustment_number: adjustmentNumber,
        adjustment_date,
        store_id,
        reason,
        description: reason,
      }])
      .select()
      .single();

    if (adjustmentError) return serverErrorResponse(adjustmentError);

    // Process each item
    for (const item of items) {
      // Create adjustment item record
      const { error: itemError } = await supabase
        .from('stock_adjustment_items')
        .insert([{
          stock_adjustment_id: adjustment.id,
          item_id: item.item_id,
          batch_no: item.batch_no || null,
          current_stock: item.current_stock,
          adjustment_qty: item.adjustment_qty,
          adjustment_reason: item.adjustment_reason,
          remarks: item.remarks || null,
        }]);

      if (itemError) return serverErrorResponse(itemError);

      // Create inventory transaction
      const txType = item.adjustment_qty > 0 ? 'adjustment_in' : 'adjustment_out';
      const { error: txError } = await supabase
        .from('inventory_transactions')
        .insert([{
          item_id: item.item_id,
          store_id,
          transaction_type: txType,
          quantity: item.adjustment_qty,
          batch_no: item.batch_no || null,
          reference_id: adjustment.id,
          reference_type: 'stock_adjustment',
          notes: item.adjustment_reason,
        }]);

      if (txError) return serverErrorResponse(txError);

      // Update item_store_stock
      const { data: stock } = await supabase
        .from('item_store_stock')
        .select('*')
        .eq('item_id', item.item_id)
        .eq('store_id', store_id)
        .single();

      if (stock) {
        const newQuantity = stock.quantity_on_hand + item.adjustment_qty;
        
        // Check for negative stock unless configured
        if (newQuantity < 0) {
          return Response.json(
            { 
              success: false, 
              error: 'Adjustment would result in negative stock. Configure allow_negative_stock in settings.' 
            },
            { status: 422 }
          );
        }

        await supabase
          .from('item_store_stock')
          .update({
            quantity_on_hand: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', stock.id);
      }
    }

    return createdResponse(
      { ...adjustment, items: items.length },
      'Stock adjustment created successfully'
    );
  } catch (error) {
    return serverErrorResponse(error);
  }
}
