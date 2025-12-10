import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data: grn, error: grnError } = await supabase
      .from('purchase_grns')
      .select(
        `*,
        suppliers(id,name,contact_person,phone,email,address),
        stores(id,name,code,address,phone,email),
        employees(id,name,email),
        purchase_orders(po_number)`
      )
      .eq('id', id)
      .single();

    if (grnError) throw grnError;
    if (!grn) {
      return NextResponse.json(
        { success: false, error: 'GRN not found' },
        { status: 404 }
      );
    }

    const { data: items } = await supabase
      .from('purchase_grn_items')
      .select('*,items(id,code,name,unit_of_measure)')
      .eq('purchase_grn_id', id);

    const { data: allocations } = await supabase
      .from('supplier_payment_allocations')
      .select('*,supplier_payments(payment_date,payment_method)')
      .eq('purchase_grn_id', id)
      .order('created_at', { ascending: false });

    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*,employees(name)')
      .eq('record_id', id)
      .eq('table_name', 'purchase_grns')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        ...grn,
        items: items || [],
        allocations: allocations || [],
        auditLogs: auditLogs || []
      }
    });
  } catch (error) {
    console.error('GRN GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch GRN' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { invoice_number, invoice_date, description } = body;

    // Get old values
    const { data: oldGrn } = await supabase
      .from('purchase_grns')
      .select('invoice_number,invoice_date,description')
      .eq('id', id)
      .single();

    const { data: grn, error: updateError } = await supabase
      .from('purchase_grns')
      .update({
        invoice_number: invoice_number !== undefined ? invoice_number : oldGrn?.invoice_number,
        invoice_date: invoice_date !== undefined ? invoice_date : oldGrn?.invoice_date,
        description: description !== undefined ? description : oldGrn?.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: body.user_id || null,
        action: 'UPDATE',
        table_name: 'purchase_grns',
        record_id: id,
        old_values: oldGrn,
        new_values: { invoice_number, invoice_date, description }
      });

    return NextResponse.json({
      success: true,
      data: grn,
      message: 'GRN updated successfully'
    });
  } catch (error) {
    console.error('GRN PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update GRN' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get GRN details
    const { data: grn } = await supabase
      .from('purchase_grns')
      .select('*')
      .eq('id', id)
      .single();

    if (!grn) {
      return NextResponse.json(
        { success: false, error: 'GRN not found' },
        { status: 404 }
      );
    }

    // Get all line items
    const { data: items } = await supabase
      .from('purchase_grn_items')
      .select('*')
      .eq('purchase_grn_id', id);

    // Reverse stock and create reversal transactions
    if (items && items.length > 0) {
      for (const item of items) {
        // Create inventory reversal transaction
        const { error: transError } = await supabase
          .from('inventory_transactions')
          .insert({
            item_id: item.item_id,
            store_id: grn.store_id,
            transaction_type: 'grn_reversal',
            quantity: -item.received_qty,
            batch_no: item.batch_no,
            reference_id: id,
            reference_type: 'purchase_grn',
            notes: `Reversal of GRN ${grn.grn_number}`
          });

        if (transError) throw transError;

        // Update stock
        const { data: stock } = await supabase
          .from('item_store_stock')
          .select('quantity_on_hand')
          .eq('item_id', item.item_id)
          .eq('store_id', grn.store_id)
          .single();

        if (stock) {
          const { error: updateError } = await supabase
            .from('item_store_stock')
            .update({
              quantity_on_hand: Math.max(0, (stock.quantity_on_hand || 0) - item.received_qty),
              updated_at: new Date().toISOString()
            })
            .eq('item_id', item.item_id)
            .eq('store_id', grn.store_id);

          if (updateError) throw updateError;
        }
      }
    }

    // Soft delete GRN
    const { error: deleteError } = await supabase
      .from('purchase_grns')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: null,
        action: 'DELETE',
        table_name: 'purchase_grns',
        record_id: id,
        old_values: grn
      });

    return NextResponse.json({
      success: true,
      message: `GRN ${grn.grn_number} deleted successfully`
    });
  } catch (error) {
    console.error('GRN DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete GRN' },
      { status: 500 }
    );
  }
}