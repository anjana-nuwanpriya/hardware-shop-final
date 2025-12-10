import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const store = searchParams.get('store') || 'Main Store';
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase();

    // Mock data - Replace with actual database query
    const allItems = [
      {
        id: '1',
        item_code: 'ITM001',
        item_name: 'Hammer',
        category_name: 'Hand Tools',
        quantity_on_hand: 50,
        reorder_level: 20,
        cost_price: 150,
        status: 'OK' as const,
        valuation: 7500,
        last_restock_date: '2025-12-01',
      },
      {
        id: '2',
        item_code: 'ITM002',
        item_name: 'Screwdriver Set',
        category_name: 'Hand Tools',
        quantity_on_hand: 15,
        reorder_level: 20,
        cost_price: 200,
        status: 'LOW' as const,
        valuation: 3000,
        last_restock_date: '2025-11-20',
      },
      {
        id: '3',
        item_code: 'ITM003',
        item_name: 'Drill Machine',
        category_name: 'Power Tools',
        quantity_on_hand: 5,
        reorder_level: 10,
        cost_price: 5000,
        status: 'CRITICAL' as const,
        valuation: 25000,
        last_restock_date: '2025-10-15',
      },
      {
        id: '4',
        item_code: 'ITM004',
        item_name: 'Nails Pack',
        category_name: 'Hardware',
        quantity_on_hand: 0,
        reorder_level: 50,
        cost_price: 10,
        status: 'OUT_OF_STOCK' as const,
        valuation: 0,
        last_restock_date: '2025-09-01',
      },
    ];

    // Filter items
    let filtered = allItems;

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.item_code.toLowerCase().includes(search) ||
          item.item_name.toLowerCase().includes(search)
      );
    }

    if (category) {
      filtered = filtered.filter((item) => item.category_name === category);
    }

    if (status && status !== 'all') {
      filtered = filtered.filter((item) => item.status === status);
    }

    // Calculate summary
    const summary = {
      total_items: filtered.length,
      total_qty: filtered.reduce((sum, item) => sum + item.quantity_on_hand, 0),
      total_valuation: filtered.reduce((sum, item) => sum + item.valuation, 0),
      by_status: {
        ok_count: filtered.filter((i) => i.status === 'OK').length,
        low_count: filtered.filter((i) => i.status === 'LOW').length,
        critical_count: filtered.filter((i) => i.status === 'CRITICAL').length,
        out_of_stock_count: filtered.filter((i) => i.status === 'OUT_OF_STOCK').length,
      },
    };

    return NextResponse.json({
      success: true,
      data: filtered,
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