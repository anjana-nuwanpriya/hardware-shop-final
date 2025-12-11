import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    console.log('🔵 GET /api/stores called');
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Stores query error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Stores found:', data?.length || 0);
    
    // Return both formats for compatibility
    return NextResponse.json({
      success: true,
      data: data || [],
      stores: data || [], // For backward compatibility with dispatch page
      message: 'Stores retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Stores API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}