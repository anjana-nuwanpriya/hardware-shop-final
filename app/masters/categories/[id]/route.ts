import { supabase } from '@/lib/supabase';
import { CategorySchema } from '@/lib/validation';
import { successResponse, notFoundResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return notFoundResponse('Category not found');
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = CategorySchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { success: false, errors: validation.error.issues },
        { status: 422 }
      );
    }

    const validatedData = validation.data;

    const { data: existing, error: existingError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (existingError || !existing) {
      return notFoundResponse('Category not found');
    }

    const { data: duplicate } = await supabase
      .from('categories')
      .select('id')
      .eq('name', validatedData.name)
      .neq('id', id)
      .eq('is_active', true)
      .single();

    if (duplicate) {
      return Response.json(
        { 
          success: false, 
          errors: [
            {
              path: ['name'],
              message: 'Category name already exists',
            },
          ]
        },
        { status: 422 }
      );
    }

    const { data, error } = await supabase
      .from('categories')
      .update({
        name: validatedData.name,
        description: validatedData.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return serverErrorResponse(error);
    }

    return successResponse(data, 'Category updated successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const { data: existing, error: existingError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (existingError || !existing) {
      return notFoundResponse('Category not found');
    }

    const { data, error } = await supabase
      .from('categories')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return serverErrorResponse(error);
    }

    return successResponse(data, 'Category deleted successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}