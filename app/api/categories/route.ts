import { supabase } from '@/lib/supabase';
import { CategorySchema } from '@/lib/validation';
import { successResponse, createdResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response';
import { z } from 'zod';

// GET /api/categories
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return serverErrorResponse(error);
    }

    return successResponse(data, 'Categories retrieved successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST /api/categories
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validation = CategorySchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }

    const validatedData = validation.data;

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('name', validatedData.name)
      .eq('is_active', true)
      .single();

    if (existing) {
      return validationErrorResponse([
        {
          path: ['name'],
          message: 'Category name already exists',
        },
      ]);
    }

    // Create category
    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          name: validatedData.name,
          description: validatedData.description || null,
        },
      ])
      .select()
      .single();

    if (error) {
      return serverErrorResponse(error);
    }

    return createdResponse(data, 'Category created successfully');
  } catch (error) {
    return serverErrorResponse(error);
  }
}
