import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/customer-opening-balance/[id] - Get single opening balance
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch opening balance with customer and employee data
    const { data: balance, error: balanceError } = await supabase
      .from('customer_opening_balances')
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

    // Fetch customer details separately
    let customerName = 'Unknown';
    if (balance.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id, name')
        .eq('id', balance.customer_id)
        .single();
      customerName = customer?.name || 'Unknown';
    }

    // Fetch employee details separately
    let employeeName: string | null = null;
    if (balance.employee_id) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id, name')
        .eq('id', balance.employee_id)
        .single();
      employeeName = employee?.name || null;
    }

    const formatted = {
      id: balance.id,
      entry_number: balance.entry_number,
      entry_date: balance.entry_date,
      amount: balance.amount,
      balance_type: balance.balance_type,
      notes: balance.notes,
      is_active: balance.is_active,
      created_at: balance.created_at,
      updated_at: balance.updated_at,
      customer_id: balance.customer_id,
      customer_name: customerName,
      employee_id: balance.employee_id,
      employee_name: employeeName,
    };

    return NextResponse.json(
      { success: true, data: formatted },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ GET /api/customer-opening-balance/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch opening balance' },
      { status: 500 }
    );
  }
}

// PATCH /api/customer-opening-balance/[id] - Update opening balance
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

    if (balance_type && !['receivable', 'advance'].includes(balance_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid balance type' },
        { status: 400 }
      );
    }

    // Check if opening balance exists
    const { data: existingBalance, error: checkError } = await supabase
      .from('customer_opening_balances')
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
      .from('customer_opening_balances')
      .update({
        entry_date: entry_date || existingBalance.entry_date,
        amount: amount !== undefined ? parseFloat(amount) : existingBalance.amount,
        balance_type: balance_type || existingBalance.balance_type,
        notes: notes !== undefined ? notes : existingBalance.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log('✅ Opening balance updated:', id);

    // Fetch customer details
    let customerName = 'Unknown';
    if (updated.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id, name')
        .eq('id', updated.customer_id)
        .single();
      customerName = customer?.name || 'Unknown';
    }

    // Fetch employee details
    let employeeName: string | null = null;
    if (updated.employee_id) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id, name')
        .eq('id', updated.employee_id)
        .single();
      employeeName = employee?.name || null;
    }

    const formatted = {
      id: updated.id,
      entry_number: updated.entry_number,
      entry_date: updated.entry_date,
      amount: updated.amount,
      balance_type: updated.balance_type,
      notes: updated.notes,
      is_active: updated.is_active,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      customer_id: updated.customer_id,
      customer_name: customerName,
      employee_id: updated.employee_id,
      employee_name: employeeName,
    };

    return NextResponse.json(
      { success: true, data: formatted, message: 'Opening balance updated successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ PATCH /api/customer-opening-balance/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update opening balance' },
      { status: 500 }
    );
  }
}

// DELETE /api/customer-opening-balance/[id] - Soft delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('🗑️ Deleting opening balance:', id);

    // Check if exists
    const { data: balance, error: checkError } = await supabase
      .from('customer_opening_balances')
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
      .from('customer_opening_balances')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) throw deleteError;

    console.log('✅ Opening balance deleted:', id);

    return NextResponse.json(
      { success: true, message: 'Opening balance deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ DELETE /api/customer-opening-balance/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete opening balance' },
      { status: 500 }
    );
  }
}