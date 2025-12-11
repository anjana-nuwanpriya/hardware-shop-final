import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/supplier-opening-balance/[id] - Get single opening balance
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: balance, error: balanceError } = await supabase
      .from('supplier_opening_balances')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (balanceError || !balance) {
      return NextResponse.json(
        { success: false, error: 'Opening balance not found' },
        { status: 404 }
      );
    }

    // Fetch supplier name
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('name')
      .eq('id', balance.supplier_id)
      .single();

    // Fetch employee name
    let employeeName: string | null = null;
    if (balance.employee_id) {
      const { data: employee } = await supabase
        .from('employees')
        .select('name')
        .eq('id', balance.employee_id)
        .single();
      employeeName = employee?.name || null;
    }

    const formatted = {
      ...balance,
      supplier_name: supplier?.name || 'Unknown',
      employee_name: employeeName,
    };

    return NextResponse.json(
      { success: true, data: formatted },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ GET /api/supplier-opening-balance/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch opening balance' },
      { status: 500 }
    );
  }
}

// PATCH /api/supplier-opening-balance/[id] - Update opening balance
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { entry_date, amount, balance_type, notes } = body;

    console.log('🔄 Updating opening balance:', id);

    // Validation
    if (amount !== undefined && amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (balance_type && !['payable', 'advance'].includes(balance_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid balance type' },
        { status: 400 }
      );
    }

    // Check if opening balance exists
    const { data: existingBalance, error: checkError } = await supabase
      .from('supplier_opening_balances')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (checkError || !existingBalance) {
      return NextResponse.json(
        { success: false, error: 'Opening balance not found' },
        { status: 404 }
      );
    }

    // Update opening balance
    const { data: updated, error: updateError } = await supabase
      .from('supplier_opening_balances')
      .update({
        entry_date: entry_date || existingBalance.entry_date,
        amount: amount !== undefined ? amount : existingBalance.amount,
        balance_type: balance_type || existingBalance.balance_type,
        notes: notes !== undefined ? notes : existingBalance.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log('✅ Opening balance updated:', id);

    // Fetch supplier name
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('name')
      .eq('id', updated.supplier_id)
      .single();

    const formatted = {
      ...updated,
      supplier_name: supplier?.name || 'Unknown',
    };

    return NextResponse.json(
      { success: true, data: formatted, message: 'Opening balance updated successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ PATCH /api/supplier-opening-balance/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update opening balance' },
      { status: 500 }
    );
  }
}

// DELETE /api/supplier-opening-balance/[id] - Soft delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('🗑️ Deleting opening balance:', id);

    // Check if exists
    const { data: balance, error: checkError } = await supabase
      .from('supplier_opening_balances')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (checkError || !balance) {
      return NextResponse.json(
        { success: false, error: 'Opening balance not found' },
        { status: 404 }
      );
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('supplier_opening_balances')
      .update({ is_active: false })
      .eq('id', id);

    if (deleteError) throw deleteError;

    console.log('✅ Opening balance deleted:', id);

    return NextResponse.json(
      { success: true, message: 'Opening balance deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ DELETE /api/supplier-opening-balance/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete opening balance' },
      { status: 500 }
    );
  }
}