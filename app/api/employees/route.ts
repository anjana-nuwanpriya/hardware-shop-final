import { supabase } from '@/lib/supabase';
import { EmployeeSchema } from '@/lib/validation';
import { successResponse, createdResponse, serverErrorResponse } from '@/lib/api-response';

// GET /api/employees
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    let query = supabase
      .from('employees')
      .select('id, name, employee_code, phone, email, role, store_id, is_active, created_at')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,employee_code.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;
    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Employees retrieved successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST /api/employees
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = EmployeeSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { success: false, errors: validation.error.issues },
        { status: 422 }
      );
    }

    const validatedData = validation.data;

    // Check for duplicate code
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_code', validatedData.employee_code)
      .eq('is_active', true)
      .single();

    if (existing) {
      return Response.json(
        { 
          success: false, 
          errors: [{ path: ['employee_code'], message: 'Employee code already exists' }]
        },
        { status: 422 }
      );
    }

    const { data, error } = await supabase
      .from('employees')
      .insert([{
        name: validatedData.name,
        employee_code: validatedData.employee_code,
        phone: validatedData.phone || null,
        email: validatedData.email || null,
        address: validatedData.address || null,
        role: validatedData.role || 'staff',
        store_id: validatedData.store_id || null,
        permissions: [],
      }])
      .select()
      .single();

    if (error) return serverErrorResponse(error);
    return createdResponse(data, 'Employee created successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}
