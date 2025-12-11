import { supabase } from '@/lib/supabase';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');

    if (!storeId) {
      return NextResponse.json(
        { error: 'store_id is required' },
        { status: 400 }
      );
    }

    // Fetch items with stock for this store
    const { data, error } = await supabase
      .from('item_store_stock')
      .select('id, item_id, store_id, quantity_on_hand, items(id, code, name, retail_price)')
      .eq('store_id', storeId)
      .gt('quantity_on_hand', 0)
      .order('items(name)', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}