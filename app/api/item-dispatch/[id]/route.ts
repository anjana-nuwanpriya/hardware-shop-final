import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/item-dispatch/[id] - Get single dispatch with items
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch dispatch
    const { data: dispatch, error: dispatchError } = await supabase
      .from('item_dispatch_notes')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (dispatchError || !dispatch) {
      console.error('❌ Dispatch not found:', id);
      return NextResponse.json(
        { success: false, error: 'Dispatch not found' },
        { status: 404 }
      );
    }

    console.log('✅ Found dispatch:', id);

    // Fetch dispatch items
    const { data: items } = await supabase
      .from('item_dispatch_items')
      .select('*')
      .eq('dispatch_id', id);

    console.log('✅ Found items:', items?.length || 0);

    // Fetch store info
    const { data: stores } = await supabase
      .from('stores')
      .select('id, code, name')
      .in('id', [dispatch.from_store_id, dispatch.to_store_id]);

    const storeMap = new Map(stores?.map((s: any) => [s.id, s]) || []);

    // Fetch employee info if exists
    let employeeName: string | null = null;
    if (dispatch.employee_id) {
      const { data: employee } = await supabase
        .from('employees')
        .select('name')
        .eq('id', dispatch.employee_id)
        .single();
      employeeName = employee?.name || null;
    }

    // Fetch item details for each dispatch item
    const itemIds = items?.map((i: any) => i.item_id) || [];
    let itemMap = new Map();
    
    if (itemIds.length > 0) {
      const { data: itemDetails } = await supabase
        .from('items')
        .select('id, code, name')
        .in('id', itemIds);

      itemMap = new Map(itemDetails?.map((i: any) => [i.id, i]) || []);
    }

    // Format items with item details
    const itemsWithDetails = items?.map((di: any) => {
      const item = itemMap.get(di.item_id);
      return {
        ...di,
        item_code: item?.code || 'N/A',
        item_name: item?.name || 'Unknown Item',
      };
    }) || [];

    const formatted = {
      ...dispatch,
      from_store_name: storeMap.get(dispatch.from_store_id)?.name,
      from_store_code: storeMap.get(dispatch.from_store_id)?.code,
      to_store_name: storeMap.get(dispatch.to_store_id)?.name,
      to_store_code: storeMap.get(dispatch.to_store_id)?.code,
      employee_name: employeeName,
      items: itemsWithDetails,
    };

    console.log('✅ Dispatch detail ready');

    return NextResponse.json(
      { success: true, data: formatted },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ GET /api/item-dispatch/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch dispatch' },
      { status: 500 }
    );
  }
}

// PATCH /api/item-dispatch/[id] - Update dispatch status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    console.log('🔄 Updating dispatch status:', { id, status });

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'dispatched', 'received', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Get current dispatch
    const { data: dispatch, error: fetchError } = await supabase
      .from('item_dispatch_notes')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (fetchError || !dispatch) {
      return NextResponse.json(
        { success: false, error: 'Dispatch not found' },
        { status: 404 }
      );
    }

    // Validate state transition
    const validTransitions: Record<string, string[]> = {
      pending: ['dispatched', 'cancelled'],
      dispatched: ['received', 'cancelled'],
      received: [],
      cancelled: [],
    };

    if (!validTransitions[dispatch.status]?.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot transition from ${dispatch.status} to ${status}`,
        },
        { status: 400 }
      );
    }

    // 🎯 IF TRANSITIONING TO "received" - MOVE STOCK NOW
    if (status === 'received') {
      console.log('📦 Processing stock transfer on receive...');

      // Fetch dispatch items
      const { data: dispatchItems } = await supabase
        .from('item_dispatch_items')
        .select('*')
        .eq('dispatch_id', id);

      if (dispatchItems && dispatchItems.length > 0) {
        for (const item of dispatchItems) {
          // Deduct from source store
          const { data: sourceStock } = await supabase
            .from('item_store_stock')
            .select('quantity_on_hand')
            .eq('item_id', item.item_id)
            .eq('store_id', dispatch.from_store_id)
            .single();

          const newSourceQty = (sourceStock?.quantity_on_hand || 0) - item.quantity;
          
          await supabase
            .from('item_store_stock')
            .update({ quantity_on_hand: newSourceQty })
            .eq('item_id', item.item_id)
            .eq('store_id', dispatch.from_store_id);

          // Add to destination store
          const { data: destStock } = await supabase
            .from('item_store_stock')
            .select('quantity_on_hand')
            .eq('item_id', item.item_id)
            .eq('store_id', dispatch.to_store_id)
            .single();

          if (destStock) {
            const destNewQty = (destStock.quantity_on_hand || 0) + item.quantity;
            await supabase
              .from('item_store_stock')
              .update({ quantity_on_hand: destNewQty })
              .eq('item_id', item.item_id)
              .eq('store_id', dispatch.to_store_id);
          } else {
            await supabase
              .from('item_store_stock')
              .insert({
                item_id: item.item_id,
                store_id: dispatch.to_store_id,
                quantity_on_hand: item.quantity,
                reserved_quantity: 0,
              });
          }

          // Log transactions
          await supabase.from('inventory_transactions').insert({
            item_id: item.item_id,
            store_id: dispatch.from_store_id,
            transaction_type: 'dispatch_out',
            quantity: -item.quantity,
            batch_no: item.batch_no || null,
            batch_expiry: item.batch_expiry || null,
            reference_id: id,
            reference_type: 'dispatch',
            notes: 'Dispatched and received',
            created_by: null,
          });

          await supabase.from('inventory_transactions').insert({
            item_id: item.item_id,
            store_id: dispatch.to_store_id,
            transaction_type: 'dispatch_in',
            quantity: item.quantity,
            batch_no: item.batch_no || null,
            batch_expiry: item.batch_expiry || null,
            reference_id: id,
            reference_type: 'dispatch',
            notes: 'Received from dispatch',
            created_by: null,
          });
        }

        console.log('✅ Stock transferred on receive');
      }
    }

    // Update dispatch status
    const { data: updated, error: updateError } = await supabase
      .from('item_dispatch_notes')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log('✅ Status updated to:', status);

    // Fetch dispatch items
    const { data: items } = await supabase
      .from('item_dispatch_items')
      .select('*')
      .eq('dispatch_id', id);

    // Fetch store info
    const { data: stores } = await supabase
      .from('stores')
      .select('id, code, name')
      .in('id', [updated.from_store_id, updated.to_store_id]);

    const storeMap = new Map(stores?.map((s: any) => [s.id, s]) || []);

    // Fetch employee info if exists
    let employeeName: string | null = null;
    if (updated.employee_id) {
      const { data: employee } = await supabase
        .from('employees')
        .select('name')
        .eq('id', updated.employee_id)
        .single();
      employeeName = employee?.name || null;
    }

    // Fetch item details
    const itemIds = items?.map((i: any) => i.item_id) || [];
    let itemMap = new Map();
    
    if (itemIds.length > 0) {
      const { data: itemDetails } = await supabase
        .from('items')
        .select('id, code, name')
        .in('id', itemIds);

      itemMap = new Map(itemDetails?.map((i: any) => [i.id, i]) || []);
    }

    const itemsWithDetails = items?.map((di: any) => {
      const item = itemMap.get(di.item_id);
      return {
        ...di,
        item_code: item?.code || 'N/A',
        item_name: item?.name || 'Unknown Item',
      };
    }) || [];

    const formatted = {
      ...updated,
      from_store_name: storeMap.get(updated.from_store_id)?.name,
      from_store_code: storeMap.get(updated.from_store_id)?.code,
      to_store_name: storeMap.get(updated.to_store_id)?.name,
      to_store_code: storeMap.get(updated.to_store_id)?.code,
      employee_name: employeeName,
      items: itemsWithDetails,
    };

    return NextResponse.json(
      {
        success: true,
        data: formatted,
        message: `Dispatch status updated to ${status}`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ PATCH /api/item-dispatch/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update dispatch' },
      { status: 500 }
    );
  }
}

// DELETE /api/item-dispatch/[id] - Soft delete (mark inactive)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get dispatch to check status
    const { data: dispatch, error: fetchError } = await supabase
      .from('item_dispatch_notes')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (fetchError || !dispatch) {
      return NextResponse.json(
        { success: false, error: 'Dispatch not found' },
        { status: 404 }
      );
    }

    // Can only delete pending or cancelled dispatches
    if (!['pending', 'cancelled'].includes(dispatch.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete dispatch with status: ${dispatch.status}`,
        },
        { status: 400 }
      );
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('item_dispatch_notes')
      .update({ is_active: false })
      .eq('id', id);

    if (deleteError) throw deleteError;

    console.log('✅ Dispatch deleted:', id);

    return NextResponse.json(
      { success: true, message: 'Dispatch deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ DELETE /api/item-dispatch/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete dispatch' },
      { status: 500 }
    );
  }
}