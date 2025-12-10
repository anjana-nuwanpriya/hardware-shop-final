/**
 * API Route: app/api/opening-stock/[id]/route.ts
 * 
 * FIXED: Next.js 15+ params + TypeScript errors
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/opening-stock/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }) {
  try {
    const { id } = await params;

    // Step 1: Fetch opening stock entry
    const { data: entry, error: entryError } = await supabase
      .from('opening_stock_entries')
      .select(
        `
        id,
        ref_number,
        entry_date,
        store_id,
        stores(id, code, name, address, phone, email),
        supplier_id,
        suppliers(id, name, contact_person, phone, email, address),
        description,
        total_value,
        total_discount,
        net_total,
        employee_id,
        employees(id, name, employee_code, role),
        is_active,
        created_at,
        updated_at
        `
      )
      .eq('id', id)
      .single();

    if (entryError || !entry) {
      return NextResponse.json(
        { success: false, error: 'Opening stock entry not found' },
        { status: 404 }
      );
    }

    // Step 2: Fetch all items
    const { data: items, error: itemsError } = await supabase
      .from('opening_stock_items')
      .select(
        `
        id,
        item_id,
        items(
          id,
          code,
          name,
          description,
          category_id,
          categories(id, name),
          cost_price,
          retail_price,
          wholesale_price,
          unit_of_measure,
          barcode,
          hsn_code,
          tax_method,
          tax_rate
        ),
        batch_no,
        batch_expiry,
        quantity,
        cost_price,
        discount_percent,
        discount_value,
        net_value,
        created_at
        `
      )
      .eq('opening_stock_entry_id', id)
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch items' },
        { status: 500 }
      );
    }

    // Step 3: Transform items
    const transformedItems = (items || []).map((item: any) => {
      const itemData = item.items || {};
      const categoryData = itemData.categories || {};
      
      return {
        id: item.id,
        item_id: item.item_id,
        item_code: itemData.code || 'N/A',
        item_name: itemData.name || 'N/A',
        category_name: categoryData.name || 'Uncategorized',
        description: itemData.description,
        batch_no: item.batch_no,
        batch_expiry: item.batch_expiry,
        quantity: Number(item.quantity) || 0,
        cost_price: Number(item.cost_price) || 0,
        retail_price: Number(itemData.retail_price) || 0,
        wholesale_price: Number(itemData.wholesale_price) || 0,
        unit_of_measure: itemData.unit_of_measure || 'piece',
        discount_percent: Number(item.discount_percent) || 0,
        discount_value: Number(item.discount_value) || 0,
        net_value: Number(item.net_value) || 0,
        cost_valuation: (Number(item.quantity) || 0) * (Number(item.cost_price) || 0),
        tax_method: itemData.tax_method || 'exclusive',
        tax_rate: Number(itemData.tax_rate) || 0,
      };
    });

    // Step 4: Calculate summary
    const itemSummary = {
      total_items: transformedItems.length,
      total_quantity: transformedItems.reduce((sum: number, i: any) => sum + i.quantity, 0),
      total_cost_valuation: transformedItems.reduce((sum: number, i: any) => sum + i.cost_valuation, 0),
    };

    // Step 5: Build response
    const storeData = entry.stores as any || {};
    const supplierData = entry.suppliers as any || {};
    const employeeData = entry.employees as any || {};

    const response = {
      success: true,
      data: {
        entry: {
          id: entry.id,
          ref_number: entry.ref_number,
          entry_date: entry.entry_date,
          store_id: entry.store_id,
          store_name: storeData.name || 'N/A',
          store_code: storeData.code || 'N/A',
          store_address: storeData.address || null,
          supplier_id: entry.supplier_id,
          supplier_name: supplierData.name || 'Direct Entry',
          supplier_contact: supplierData.contact_person || null,
          supplier_phone: supplierData.phone || null,
          description: entry.description,
          total_value: Number(entry.total_value) || 0,
          total_discount: Number(entry.total_discount) || 0,
          net_total: Number(entry.net_total) || 0,
          employee_id: entry.employee_id,
          employee_name: employeeData.name || 'N/A',
          is_active: entry.is_active,
          status: entry.is_active ? 'active' : 'finalized',
          created_at: entry.created_at,
          updated_at: entry.updated_at,
        },
        items: transformedItems,
        itemSummary,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching opening stock details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch opening stock details' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/opening-stock/[id]
 * Finalize entry
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { employee_id } = body as { employee_id?: string };

    // Get current entry
    const { data: entry, error: fetchError } = await supabase
      .from('opening_stock_entries')
      .select('id, is_active')
      .eq('id', id)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json(
        { success: false, error: 'Opening stock entry not found' },
        { status: 404 }
      );
    }

    if (!entry.is_active) {
      return NextResponse.json(
        { success: false, error: 'Entry is already finalized' },
        { status: 400 }
      );
    }

    // Finalize
    const { error: updateError } = await supabase
      .from('opening_stock_entries')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error finalizing entry:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 400 }
      );
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      id: uuidv4(),
      user_id: employee_id || null,
      action: 'UPDATE',
      table_name: 'opening_stock_entries',
      record_id: id,
      old_values: { is_active: true },
      new_values: { is_active: false, status: 'finalized' },
    });

    return NextResponse.json({
      success: true,
      message: 'Opening stock entry finalized and locked',
      data: { id, is_active: false, status: 'finalized' },
    });
  } catch (error) {
    console.error('Error finalizing entry:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/opening-stock/[id]
 * Delete entry (soft delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employee_id');

    // Get current entry
    const { data: entry, error: fetchError } = await supabase
      .from('opening_stock_entries')
      .select('id, is_active')
      .eq('id', id)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json(
        { success: false, error: 'Opening stock entry not found' },
        { status: 404 }
      );
    }

    if (!entry.is_active) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete finalized entries' },
        { status: 400 }
      );
    }

    // Check if transactions exist
    const { data: transactions } = await supabase
      .from('inventory_transactions')
      .select('id')
      .eq('reference_id', id)
      .limit(1);

    if (transactions && transactions.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete entry that has created inventory transactions.',
        },
        { status: 400 }
      );
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('opening_stock_entries')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting entry:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 400 }
      );
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      id: uuidv4(),
      user_id: employeeId || null,
      action: 'DELETE',
      table_name: 'opening_stock_entries',
      record_id: id,
      new_values: { is_active: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Opening stock entry deleted',
    });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}