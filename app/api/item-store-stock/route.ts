import { supabase } from '@/lib/supabase';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'store_id is required' },
        { status: 400 }
      );
    }

    // Fetch items with stock for this store with full item details
    const { data, error } = await supabase
      .from('item_store_stock')
      .select(`
        id, 
        item_id, 
        store_id, 
        quantity_on_hand,
        items (
          id, 
          code, 
          name, 
          retail_price,
          unit_of_measure,
          barcode,
          cost_price,
          wholesale_price
        )
      `)
      .eq('store_id', storeId)
      .gt('quantity_on_hand', 0);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [] 
    });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}