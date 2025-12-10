import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('purchase_returns')
      .select(`
        *,
        supplier:suppliers(name, contact_person, phone),
        store:stores(name, code),
        items:purchase_return_items(
          *,
          item:items(code, name, unit_of_measure)
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Return not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching return:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch return' },
      { status: 500 }
    );
  }
}