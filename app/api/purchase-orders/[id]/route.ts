import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(name, contact_person, phone, email),
        store:stores(name, code),
        items:purchase_order_items(
          *,
          item:items(code, name, unit_of_measure)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'PO not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching PO:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PO' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, expected_delivery_date } = body;

    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status,
        expected_delivery_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'PO updated' });
  } catch (error) {
    console.error('Error updating PO:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update PO' },
      { status: 500 }
    );
  }
}