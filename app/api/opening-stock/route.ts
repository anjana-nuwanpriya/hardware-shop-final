/**
 * API Route: /app/api/opening-stock/route.ts
 * Fixed to use your existing Supabase integration from @/lib/supabase
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper: Generate ref_number (e.g., STR001-OPSTK-001)
 */
async function generateRefNumber(storeId: string): Promise<string> {
  try {
    // Get store code
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('code')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      throw new Error('Store not found');
    }

    // Get latest ref_number for this store
    const { data: lastEntry } = await supabase
      .from('opening_stock_entries')
      .select('ref_number')
      .like('ref_number', `${store.code}-OPSTK-%`)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (lastEntry && lastEntry.length > 0) {
      const lastRef = lastEntry[0].ref_number;
      const lastNum = parseInt(lastRef.split('-').pop() || '0', 10);
      nextNumber = lastNum + 1;
    }

    const paddedNumber = String(nextNumber).padStart(3, '0');
    return `${store.code}-OPSTK-${paddedNumber}`;
  } catch (error) {
    console.error('Error generating ref_number:', error);
    throw error;
  }
}

/**
 * GET /api/opening-stock
 * List opening stock entries with filters
 * Query params: store_id, start_date, end_date, supplier_id, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const supplierId = searchParams.get('supplier_id');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('opening_stock_entries')
      .select(
        `
        id,
        ref_number,
        entry_date,
        store_id,
        stores(code, name),
        supplier_id,
        suppliers(name),
        description,
        total_value,
        total_discount,
        net_total,
        employee_id,
        employees(name),
        is_active,
        created_at,
        updated_at
      `,
        { count: 'exact' }
      )
      .eq('is_active', true);

    // Apply filters
    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    if (startDate) {
      query = query.gte('entry_date', startDate);
    }

    if (endDate) {
      query = query.lte('entry_date', endDate);
    }

    // Apply pagination
    const { data: entries, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching opening stock:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: entries,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/opening-stock
 * Create opening stock entry with items
 * Body:
 * {
 *   store_id: UUID,
 *   supplier_id?: UUID,
 *   description?: string,
 *   items: [
 *     {
 *       item_id: UUID,
 *       batch_no?: string,
 *       batch_expiry?: date,
 *       quantity: number,
 *       cost_price: number,
 *       discount_percent?: number,
 *       discount_value?: number
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, supplier_id, description, items, employee_id } = body;

    // Validation
    if (!store_id) {
      return NextResponse.json(
        { success: false, error: 'store_id is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Check for duplicate items in the same entry
    const itemIds = items.map((item: any) => item.item_id);
    const uniqueItemIds = new Set(itemIds);
    if (itemIds.length !== uniqueItemIds.size) {
      return NextResponse.json(
        { success: false, error: 'Duplicate items in the same entry are not allowed' },
        { status: 400 }
      );
    }

    // Validate item details and calculate totals
    let totalValue = 0;
    let totalDiscount = 0;

    const validatedItems = items.map((item: any) => {
      if (!item.item_id || item.quantity <= 0 || item.cost_price <= 0) {
        throw new Error('Invalid item details: item_id, quantity, and cost_price are required and must be > 0');
      }

      const discountPercent = item.discount_percent || 0;
      const lineTotal = item.cost_price * item.quantity;
      const discountValue = item.discount_value || (lineTotal * discountPercent / 100);
      const netValue = lineTotal - discountValue;

      totalValue += lineTotal;
      totalDiscount += discountValue;

      return {
        ...item,
        discount_percent: discountPercent,
        discount_value: discountValue,
        net_value: netValue,
      };
    });

    const netTotal = totalValue - totalDiscount;

    // Generate ref_number
    const refNumber = await generateRefNumber(store_id);

    // Start transaction
    const entryId = uuidv4();

    // Create opening stock entry
    const { error: entryError } = await supabase
      .from('opening_stock_entries')
      .insert({
        id: entryId,
        ref_number: refNumber,
        entry_date: new Date().toISOString().split('T')[0],
        store_id,
        supplier_id: supplier_id || null,
        description: description || null,
        total_value: totalValue,
        total_discount: totalDiscount,
        net_total: netTotal,
        employee_id: employee_id || null,
        is_active: true,
      });

    if (entryError) {
      console.error('Error creating opening stock entry:', entryError);
      return NextResponse.json(
        { success: false, error: entryError.message },
        { status: 400 }
      );
    }

    // Create opening stock items
    const itemsToInsert = validatedItems.map((item: any) => ({
      id: uuidv4(),
      opening_stock_entry_id: entryId,
      item_id: item.item_id,
      batch_no: item.batch_no || null,
      batch_expiry: item.batch_expiry || null,
      quantity: item.quantity,
      cost_price: item.cost_price,
      discount_percent: item.discount_percent,
      discount_value: item.discount_value,
      net_value: item.net_value,
    }));

    const { error: itemsError } = await supabase
      .from('opening_stock_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error creating opening stock items:', itemsError);
      // Delete the entry if items creation fails (transaction rollback)
      await supabase
        .from('opening_stock_entries')
        .delete()
        .eq('id', entryId);

      return NextResponse.json(
        { success: false, error: itemsError.message },
        { status: 400 }
      );
    }

    // Create inventory transactions for each item
    const inventoryTransactions = validatedItems.map((item: any) => ({
      id: uuidv4(),
      item_id: item.item_id,
      store_id,
      transaction_type: 'opening_stock',
      quantity: item.quantity,
      batch_no: item.batch_no || null,
      batch_expiry: item.batch_expiry || null,
      reference_id: entryId,
      reference_type: 'opening_stock_entry',
      notes: `Opening stock: ${refNumber}`,
      created_by: employee_id || null,
    }));

    const { error: inventoryError } = await supabase
      .from('inventory_transactions')
      .insert(inventoryTransactions);

    if (inventoryError) {
      console.error('Error creating inventory transactions:', inventoryError);
      // Delete entry and items if transaction creation fails
      await supabase
        .from('opening_stock_entries')
        .delete()
        .eq('id', entryId);
      await supabase
        .from('opening_stock_items')
        .delete()
        .eq('opening_stock_entry_id', entryId);

      return NextResponse.json(
        { success: false, error: inventoryError.message },
        { status: 400 }
      );
    }

    // Update item_store_stock for each item
    for (const item of validatedItems) {
      // First, check if record exists
      const { data: existingStock } = await supabase
        .from('item_store_stock')
        .select('id, quantity_on_hand')
        .eq('item_id', item.item_id)
        .eq('store_id', store_id)
        .single();

      if (existingStock) {
        // Update existing record
        const newQuantity = (existingStock.quantity_on_hand || 0) + item.quantity;
        await supabase
          .from('item_store_stock')
          .update({
            quantity_on_hand: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq('item_id', item.item_id)
          .eq('store_id', store_id);
      } else {
        // Create new record
        await supabase
          .from('item_store_stock')
          .insert({
            id: uuidv4(),
            item_id: item.item_id,
            store_id,
            quantity_on_hand: item.quantity,
            reserved_quantity: 0,
            last_restock_date: new Date().toISOString().split('T')[0],
          });
      }
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      id: uuidv4(),
      user_id: employee_id || null,
      action: 'CREATE',
      table_name: 'opening_stock_entries',
      record_id: entryId,
      new_values: {
        ref_number: refNumber,
        store_id,
        items_count: validatedItems.length,
        total_value: totalValue,
        net_total: netTotal,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: entryId,
          ref_number: refNumber,
          total_value: totalValue,
          total_discount: totalDiscount,
          net_total: netTotal,
          items_count: validatedItems.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}