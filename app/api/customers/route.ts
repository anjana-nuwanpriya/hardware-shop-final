import { supabase } from '@/lib/supabase';
import { CustomerSchema } from '@/lib/validation';
import { successResponse, createdResponse, serverErrorResponse } from '@/lib/api-response';

// GET /api/customers
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';

    let query = supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Customers retrieved successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST /api/customers
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = CustomerSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { success: false, errors: validation.error.issues },
        { status: 422 }
      );
    }

    const validatedData = validation.data;

    // Create customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert([{
        name: validatedData.name,
        type: validatedData.type || 'retail',
        contact_person: validatedData.contact_person || null,
        phone: validatedData.phone || null,
        email: validatedData.email || null,
        address: validatedData.address || null,
        tax_number: validatedData.tax_number || null,
        credit_limit: validatedData.credit_limit || 0,
        customer_since_date: validatedData.customer_since_date || new Date().toISOString().split('T')[0],
      }])
      .select()
      .single();

    if (customerError) return serverErrorResponse(customerError);

    // Create opening balance if provided
    if (validatedData.opening_balance && validatedData.opening_balance > 0) {
      const { data: countData } = await supabase
        .from('customer_opening_balances')
        .select('id', { count: 'exact', head: true });

      const nextNumber = (countData?.length || 0) + 1;
      const entryNumber = `COPB-${String(nextNumber).padStart(6, '0')}`;

      const { error: balanceError } = await supabase
        .from('customer_opening_balances')
        .insert([{
          entry_number: entryNumber,
          entry_date: new Date().toISOString().split('T')[0],
          customer_id: customer.id,
          amount: validatedData.opening_balance,
          balance_type: 'receivable',
        }]);

      if (balanceError) return serverErrorResponse(balanceError);
    }

    return createdResponse(customer, 'Customer created successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}
