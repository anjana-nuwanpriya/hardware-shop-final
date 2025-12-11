import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeName = searchParams.get('store') || 'Main Store';
    const search = searchParams.get('search')?.toLowerCase();
    const status = searchParams.get('status');

    // Step 1: Get store ID by name
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('name', storeName)
      .eq('is_active', true)
      .single();

    if (storeError || !storeData) {
      return NextResponse.json(
        { success: false, error: `Store "${storeName}" not found` },
        { status: 404 }
      );
    }

    const storeId = storeData.id;

    // Step 2: Get all stock with item details
    const { data: stockData, error: stockError } = await supabase
      .from('item_store_stock')
      .select(
        `
        id,
        item_id,
        quantity_on_hand,
        reserved_quantity,
        last_restock_date,
        items(
          id,
          code,
          name,
          category_id,
          cost_price,
          retail_price,
          wholesale_price,
          reorder_level,
          unit_of_measure,
          categories(name)
        )
        `
      )
      .eq('store_id', storeId)
      .order('items(code)');

    if (stockError) {
      console.error('Stock fetch error:', stockError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch stock' },
        { status: 500 }
      );
    }

    // Step 3: Transform data and determine status
    const items = (stockData || [])
      .map((stock: any) => {
        const item = stock.items;
        const qtyOnHand = Number(stock.quantity_on_hand) || 0;
        const reserved = Number(stock.reserved_quantity) || 0;
        const available = qtyOnHand - reserved;
        const reorderLevel = item?.reorder_level || 10;

        // Determine status
        let itemStatus: 'OK' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK' = 'OK';
        if (qtyOnHand === 0) {
          itemStatus = 'OUT_OF_STOCK';
        } else if (qtyOnHand <= reorderLevel / 2) {
          itemStatus = 'CRITICAL';
        } else if (qtyOnHand <= reorderLevel) {
          itemStatus = 'LOW';
        }

        return {
          id: stock.id,
          item_id: item?.id,
          item_code: item?.code || 'N/A',
          item_name: item?.name || 'N/A',
          category_name: item?.categories?.name || 'Uncategorized',
          quantity_on_hand: qtyOnHand,
          reserved_quantity: reserved,
          available_quantity: available,
          reorder_level: reorderLevel,
          cost_price: Number(item?.cost_price) || 0,
          retail_price: Number(item?.retail_price) || 0,
          wholesale_price: Number(item?.wholesale_price) || 0,
          unit_of_measure: item?.unit_of_measure || 'piece',
          cost_valuation: qtyOnHand * (Number(item?.cost_price) || 0),
          retail_valuation: qtyOnHand * (Number(item?.retail_price) || 0),
          status: itemStatus,
          last_restock_date: stock.last_restock_date,
          profit_margin_per_unit: (Number(item?.retail_price) || 0) - (Number(item?.cost_price) || 0),
          profit_margin_total: available * ((Number(item?.retail_price) || 0) - (Number(item?.cost_price) || 0)),
        };
      })
      .filter((item: any) => {
        // Search filter
        if (search) {
          const matchesSearch =
            item.item_code.toLowerCase().includes(search) ||
            item.item_name.toLowerCase().includes(search) ||
            item.category_name.toLowerCase().includes(search);
          if (!matchesSearch) return false;
        }

        // Status filter
        if (status && status !== 'all' && item.status !== status) {
          return false;
        }

        return true;
      });

    // Step 4: Calculate summary
    const summary = {
      total_items: items.length,
      total_quantity_on_hand: items.reduce((sum: number, item: any) => sum + item.quantity_on_hand, 0),
      total_reserved_quantity: items.reduce((sum: number, item: any) => sum + item.reserved_quantity, 0),
      total_available_quantity: items.reduce((sum: number, item: any) => sum + item.available_quantity, 0),
      total_cost_valuation: items.reduce((sum: number, item: any) => sum + item.cost_valuation, 0),
      total_retail_valuation: items.reduce((sum: number, item: any) => sum + item.retail_valuation, 0),
      total_profit_margin: items.reduce((sum: number, item: any) => sum + item.profit_margin_total, 0),
      by_status: {
        ok_count: items.filter((i: any) => i.status === 'OK').length,
        low_count: items.filter((i: any) => i.status === 'LOW').length,
        critical_count: items.filter((i: any) => i.status === 'CRITICAL').length,
        out_of_stock_count: items.filter((i: any) => i.status === 'OUT_OF_STOCK').length,
      },
    };

    return NextResponse.json({
      success: true,
      data: items,
      summary,
    });
  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock' },
      { status: 500 }
    );
  }
}