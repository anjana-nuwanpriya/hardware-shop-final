import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
   const itemId = (await params).id;
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Mock data - Replace with actual database query
    const mockHistory = [
      {
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        transaction_type: 'opening_stock',
        quantity: 100,
        batch_no: 'BATCH-001',
        reference_type: 'opening_stock',
        created_by: 'Admin',
        running_balance: 100,
      },
      {
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        transaction_type: 'grn',
        quantity: 50,
        batch_no: 'BATCH-002',
        reference_type: 'grn',
        created_by: 'Warehouse',
        running_balance: 150,
      },
      {
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        transaction_type: 'sale',
        quantity: -20,
        batch_no: 'BATCH-001',
        reference_type: 'sales_retail',
        created_by: 'Cashier',
        running_balance: 130,
      },
      {
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        transaction_type: 'sale',
        quantity: -30,
        batch_no: 'BATCH-002',
        reference_type: 'sales_retail',
        created_by: 'Cashier',
        running_balance: 100,
      },
      {
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        transaction_type: 'adjustment_in',
        quantity: 25,
        batch_no: 'BATCH-001',
        reference_type: 'stock_adjustment',
        created_by: 'Manager',
        running_balance: 125,
      },
    ];

    return NextResponse.json({
      success: true,
      itemName: 'Hammer',
      data: mockHistory,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}