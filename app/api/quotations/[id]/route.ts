import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api-response';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return Response.json(errorResponse('Quotation not found'), { status: 404 });
    }

    return Response.json(successResponse(data));
  } catch (error) {
    console.error('Error fetching quotation:', error);
    return Response.json(errorResponse('Failed to fetch quotation'), { status: 500 });
  }
}