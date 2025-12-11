import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/supplier-opening-balance - List all opening balances
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const supplier_id = searchParams.get('supplier_id');
    const balance_type = searchParams.get('balance_type');
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('supplier_opening_balances')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('entry_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id);
    }

    if (balance_type && balance_type !== 'all') {
      query = query.eq('balance_type', balance_type);
    }

    if (search) {
      query = query.ilike('entry_number', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Fetch supplier details
    const supplierIds = new Set(data?.map((d: any) => d.supplier_id) || []);
    let supplierMap = new Map();

    if (supplierIds.size > 0) {
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name')
        .in('id', Array.from(supplierIds));

      supplierMap = new Map(suppliers?.map((s: any) => [s.id, s]) || []);
    }

    // Fetch employee details
    const employeeIds = new Set(data?.map((d: any) => d.employee_id).filter(Boolean) || []);
    let employeeMap = new Map();

    if (employeeIds.size > 0) {
      const { data: employees } = await supabase
        .from('employees')
        .select('id, name')
        .in('id', Array.from(employeeIds));

      employeeMap = new Map(employees?.map((e: any) => [e.id, e]) || []);
    }

    // Format response
    const formatted = (data || []).map((d: any) => ({
      ...d,
      supplier_name: supplierMap.get(d.supplier_id)?.name || 'Unknown',
      employee_name: employeeMap.get(d.employee_id)?.name || null,
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
    console.error('❌ GET /api/supplier-opening-balance error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch opening balances' },
      { status: 500 }
    );
  }
}

// POST /api/supplier-opening-balance - Create new opening balance
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { supplier_id, entry_date, amount, balance_type, notes } = body;

    console.log('📝 Creating supplier opening balance:', { supplier_id, amount, balance_type });

    // Validation
    if (!supplier_id) {
      return NextResponse.json(
        { success: false, error: 'Supplier is required' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (!balance_type || !['payable', 'advance'].includes(balance_type)) {
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

    // Check if supplier exists
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', supplier_id)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 400 }
      );
    }

    // Generate entry number
    const { data: lastEntry } = await supabase
      .from('supplier_opening_balances')
      .select('entry_number')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (lastEntry && lastEntry.length > 0) {
      const lastNum = parseInt(lastEntry[0].entry_number.split('-').pop() || '0');
      nextNumber = lastNum + 1;
    }

    const entryNumber = `SOPB-${String(nextNumber).padStart(6, '0')}`;

    // Create opening balance
    const { data: createdBalance, error: createError } = await supabase
      .from('supplier_opening_balances')
      .insert({
        entry_number: entryNumber,
        entry_date,
        supplier_id,
        amount,
        balance_type,
        notes: notes || null,
        employee_id: null, // Can be updated to auth user later
        is_active: true,
      })
      .select()
      .single();

    if (createError) throw createError;

    console.log('✅ Opening balance created:', entryNumber);

    // Fetch supplier name
    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('name')
      .eq('id', supplier_id)
      .single();

    const formatted = {
      ...createdBalance,
      supplier_name: supplierData?.name || 'Unknown',
    };

    return NextResponse.json(
      { success: true, data: formatted, message: 'Opening balance created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ POST /api/supplier-opening-balance error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create opening balance' },
      { status: 500 }
    );
  }
}