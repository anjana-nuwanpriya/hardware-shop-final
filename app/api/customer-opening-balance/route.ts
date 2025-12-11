import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/customer-opening-balance - List all opening balances
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const customer_id = searchParams.get('customer_id');
    const balance_type = searchParams.get('balance_type');
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('customer_opening_balances')
      .select(
        `id, entry_number, entry_date, amount, balance_type, notes, is_active, created_at, updated_at,
         customer:customer_id(id, name),
         employee:employee_id(id, name)`,
        { count: 'exact' }
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    if (balance_type && balance_type !== 'all') {
      query = query.eq('balance_type', balance_type);
    }

    // SEARCH FILTER - FIXED
    if (search && search.trim()) {
      query = query.or(
        `entry_number.ilike.%${search}%,notes.ilike.%${search}%`
      );
    }

    // PAGINATION
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Format response with nested data
    const formatted = (data || []).map((d: any) => ({
      id: d.id,
      entry_number: d.entry_number,
      entry_date: d.entry_date,
      amount: d.amount,
      balance_type: d.balance_type,
      notes: d.notes,
      is_active: d.is_active,
      created_at: d.created_at,
      updated_at: d.updated_at,
      customer_id: d.customer?.id,
      customer_name: d.customer?.name || 'Unknown',
      employee_id: d.employee?.id,
      employee_name: d.employee?.name || null,
    }));

    return NextResponse.json(
      {
        success: true,
        data: formatted,
        pagination: { total: count || 0, limit, offset },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ GET /api/customer-opening-balance error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch opening balances' },
      { status: 500 }
    );
  }
}

// POST /api/customer-opening-balance - Create new opening balance
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_id, entry_date, amount, balance_type, notes } = body;

    console.log('📝 Creating customer opening balance:', { customer_id, amount, balance_type });

    // Validation
    if (!customer_id) {
      return NextResponse.json(
        { success: false, error: 'Customer is required' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (!balance_type || !['receivable', 'advance'].includes(balance_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid balance type' },
        { status: 400 }
      );
    }

    if (!entry_date) {
      return NextResponse.json(
        { success: false, error: 'Entry date is required' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 400 }
      );
    }

    // Generate entry number
    const { data: lastEntry } = await supabase
      .from('customer_opening_balances')
      .select('entry_number')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (lastEntry && lastEntry.length > 0) {
      const lastNum = parseInt(lastEntry[0].entry_number.split('-').pop() || '0');
      nextNumber = lastNum + 1;
    }

    const entryNumber = `COPB-${String(nextNumber).padStart(6, '0')}`;

    // Create opening balance
    const { data: createdBalance, error: createError } = await supabase
      .from('customer_opening_balances')
      .insert({
        entry_number: entryNumber,
        entry_date,
        customer_id,
        amount: parseFloat(amount),
        balance_type,
        notes: notes || null,
        employee_id: null, // Can be updated to auth user later
        is_active: true,
      })
      .select()
      .single();

    if (createError) throw createError;

    console.log('✅ Opening balance created:', entryNumber);

    const formatted = {
      ...createdBalance,
      customer_name: customer.name,
    };

    return NextResponse.json(
      { success: true, data: formatted, message: 'Opening balance created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ POST /api/customer-opening-balance error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create opening balance' },
      { status: 500 }
    );
  }
}