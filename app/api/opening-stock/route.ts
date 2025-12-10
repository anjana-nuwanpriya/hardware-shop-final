import { supabase } from '@/lib/supabase';
import { successResponse, createdResponse, serverErrorResponse } from '@/lib/api-response';

// GET /api/opening-stock
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const storeId = searchParams.get('store_id') || '';

    let query = supabase
      .from('opening_stock_entries')
      .select('*')
      .eq('is_active', true)
      .order('entry_date', { ascending: false });

    if (search) {
      query = query.ilike('ref_number', `%${search}%`);
    }

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;
    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Opening stock entries retrieved successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST /api/opening-stock
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entry_date, store_id, supplier_id, description, items } = body;

    // Validation
    if (!entry_date || !store_id || !items || items.length === 0) {
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

    // Generate ref_number
    const { data: countData } = await supabase
      .from('opening_stock_entries')
      .select('id', { count: 'exact', head: true });

    const nextNumber = (countData?.length || 0) + 1;
    const refNumber = `OPSTK-${String(nextNumber).padStart(6, '0')}`;

    // Calculate totals
    let totalValue = 0;
    let totalDiscount = 0;

    for (const item of items) {
      const lineTotal = item.cost_price * item.quantity;
      const discountValue = item.discount_percent ? (lineTotal * item.discount_percent) / 100 : item.discount_value || 0;
      totalValue += lineTotal;
      totalDiscount += discountValue;
    }

    const netTotal = totalValue - totalDiscount;

    // Create opening stock entry
    const { data: entry, error: entryError } = await supabase
      .from('opening_stock_entries')
      .insert([{
        ref_number: refNumber,
        entry_date,
        store_id,
        supplier_id: supplier_id || null,
        description: description || null,
        total_value: totalValue,
        total_discount: totalDiscount,
        net_total: netTotal,
      }])
      .select()
      .single();

    if (entryError) return serverErrorResponse(entryError);

    // Create line items and inventory transactions
    for (const item of items) {
      const lineTotal = item.cost_price * item.quantity;
      const discountValue = item.discount_percent ? (lineTotal * item.discount_percent) / 100 : item.discount_value || 0;
      const netValue = lineTotal - discountValue;

      // Insert line item
      const { error: lineError } = await supabase
        .from('opening_stock_items')
        .insert([{
          opening_stock_entry_id: entry.id,
          item_id: item.item_id,
          batch_no: item.batch_no || null,
          batch_expiry: item.batch_expiry || null,
          quantity: item.quantity,
          cost_price: item.cost_price,
          discount_percent: item.discount_percent || 0,
          discount_value: discountValue,
          net_value: netValue,
        }]);

      if (lineError) return serverErrorResponse(lineError);

      // Create inventory transaction
      const { error: txError } = await supabase
        .from('inventory_transactions')
        .insert([{
          item_id: item.item_id,
          store_id,
          transaction_type: 'opening_stock',
          quantity: item.quantity,
          batch_no: item.batch_no || null,
          batch_expiry: item.batch_expiry || null,
          reference_id: entry.id,
          reference_type: 'opening_stock',
        }]);

      if (txError) return serverErrorResponse(txError);

      // Update item_store_stock
      const { data: existingStock } = await supabase
        .from('item_store_stock')
        .select('*')
        .eq('item_id', item.item_id)
        .eq('store_id', store_id)
        .single();

      if (existingStock) {
        await supabase
          .from('item_store_stock')
          .update({
            quantity_on_hand: existingStock.quantity_on_hand + item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingStock.id);
      } else {
        await supabase
          .from('item_store_stock')
          .insert([{
            item_id: item.item_id,
            store_id,
            quantity_on_hand: item.quantity,
            reserved_quantity: 0,
          }]);
      }
    }

    return createdResponse({ ...entry, items: items.length }, 'Opening stock entry created successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}
