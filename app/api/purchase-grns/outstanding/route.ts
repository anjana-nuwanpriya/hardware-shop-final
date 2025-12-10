import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }) {
  try {
    // Get GRN total amount
    const { data: grn } = await supabase
      .from('purchase_grns')
      .select('total_amount')
      .eq('id', params.id)
      .single();

    if (!grn) {
      return NextResponse.json(
        { success: false, error: 'GRN not found' },
        { status: 404 }
      );
    }

    // Get all allocations for this GRN
    const { data: allocations } = await supabase
      .from('supplier_payment_allocations')
      .select('allocation_amount')
      .eq('purchase_grn_id', params.id);

    // Calculate paid amount
    const paid_amount = allocations?.reduce((sum, a) => sum + (a.allocation_amount || 0), 0) || 0;
    const outstanding = (grn.total_amount || 0) - paid_amount;
    const percentage_paid = grn.total_amount ? parseFloat(((paid_amount / grn.total_amount) * 100).toFixed(2)) : 0;

    return NextResponse.json({
      success: true,
      data: {
        grn_id: params.id,
        total_amount: grn.total_amount,
        paid_amount: parseFloat(paid_amount.toFixed(2)),
        outstanding: parseFloat(outstanding.toFixed(2)),
        percentage_paid,
        allocation_count: allocations?.length || 0
      }
    });
  } catch (error) {
    console.error('GRN outstanding GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch outstanding' },
      { status: 500 }
    );
  }
}