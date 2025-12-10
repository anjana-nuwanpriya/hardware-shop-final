import { supabase } from '@/lib/supabase';
import { SupplierSchema } from '@/lib/validation';
import { successResponse, createdResponse, serverErrorResponse } from '@/lib/api-response';

// GET /api/suppliers
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Suppliers retrieved successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST /api/suppliers
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = SupplierSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { success: false, errors: validation.error.issues },
        { status: 422 }
      );
    }

    const validatedData = validation.data;

    // Start transaction
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .insert([{
        name: validatedData.name,
        contact_person: validatedData.contact_person || null,
        phone: validatedData.phone || null,
        email: validatedData.email || null,
        address: validatedData.address || null,
        tax_number: validatedData.tax_number || null,
        payment_terms: validatedData.payment_terms || null,
      }])
      .select()
      .single();

    if (supplierError) return serverErrorResponse(supplierError);

    // Create opening balance if provided
    if (validatedData.opening_balance && validatedData.opening_balance > 0) {
      const { data: countData } = await supabase
        .from('supplier_opening_balances')
        .select('id', { count: 'exact', head: true });

      const nextNumber = (countData?.length || 0) + 1;
      const entryNumber = `SOPB-${String(nextNumber).padStart(6, '0')}`;

      const { error: balanceError } = await supabase
        .from('supplier_opening_balances')
        .insert([{
          entry_number: entryNumber,
          entry_date: new Date().toISOString().split('T')[0],
          supplier_id: supplier.id,
          amount: validatedData.opening_balance,
          balance_type: 'payable',
        }]);

      if (balanceError) return serverErrorResponse(balanceError);
    }

    return createdResponse(supplier, 'Supplier created successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}
