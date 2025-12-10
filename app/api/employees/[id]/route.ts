import { supabase } from '@/lib/supabase';
import { EmployeeSchema } from '@/lib/validation';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

// GET /api/employees/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return notFoundResponse('Employee not found');
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT /api/employees/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = EmployeeSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { success: false, errors: validation.error.issues },
        { status: 422 }
      );
    }

    const validatedData = validation.data;

    // Check if employee exists
    const { data: existing, error: existingError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (existingError || !existing) {
      return notFoundResponse('Employee not found');
    }

    // Check for duplicate code (excluding current)
    const { data: duplicate } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_code', validatedData.employee_code)
      .neq('id', id)
      .eq('is_active', true)
      .single();

    if (duplicate) {
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
      .update({
        name: validatedData.name,
        employee_code: validatedData.employee_code,
        phone: validatedData.phone || null,
        email: validatedData.email || null,
        address: validatedData.address || null,
        role: validatedData.role || 'staff',
        store_id: validatedData.store_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Employee updated successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PATCH /api/employees/[id] - Soft delete
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: existing, error: existingError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (existingError || !existing) {
      return notFoundResponse('Employee not found');
    }

    const { data, error } = await supabase
      .from('employees')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return serverErrorResponse(error);
    return successResponse(data, 'Employee deleted successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}