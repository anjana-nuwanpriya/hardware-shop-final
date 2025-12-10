/**
 * API Route: /app/api/sales-retail/[id]/route.ts
 * Get, update, and delete retail sales
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/sales-retail/[id]
 * Get detailed sale information with items and relationships
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: sale, error } = await supabase
      .from('sales_retail')
      .select(
        `
        id,
        invoice_number,
        invoice_date,
        sale_date,
        customer_id,
        customers(id, name, type, phone, email),
        store_id,
        stores(id, code, name, address),
        employee_id,
        employees(id, name, email),
        payment_method,
        payment_status,
        subtotal,
        discount,
        tax,
        total_amount,
        description,
        is_active,
        created_at,
        updated_at,
        sales_retail_items(
          id,
          item_id,
          items(id, code, name, unit_of_measure),
          batch_no,
          quantity,
          unit_price,
          discount_percent,
          discount_value,
          tax_value,
          net_value
        )
      `
      )
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching sale:', error);
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sales-retail/[id]
 * Update sale information (payment_status, payment_method, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { payment_status, payment_method, description, employee_id } = body;

    // Validate payment_status if provided
    const validStatuses = ['unpaid', 'partially_paid', 'paid'];
    if (payment_status && !validStatuses.includes(payment_status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid payment_status. Must be one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Get current sale for audit
    const { data: oldSale } = await supabase
      .from('sales_retail')
      .select('payment_status, payment_method, description')
      .eq('id', params.id)
      .single();

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (payment_status !== undefined) updateData.payment_status = payment_status;
    if (payment_method !== undefined) updateData.payment_method = payment_method;
    if (description !== undefined) updateData.description = description;

    // Update sale
    const { data: updatedSale, error } = await supabase
      .from('sales_retail')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating sale:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      id: uuidv4(),
      user_id: employee_id || null,
      action: 'UPDATE',
      table_name: 'sales_retail',
      record_id: params.id,
      old_values: oldSale,
      new_values: updateData,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: updatedSale,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sales-retail/[id]
 * Soft delete sale (sets is_active to false) and revert stock
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get sale with items for stock reversal
    const { data: sale, error: saleError } = await supabase
      .from('sales_retail')
      .select(
        `
        id,
        invoice_number,
        store_id,
        sales_retail_items(
          item_id,
          quantity
        )
      `
      )
      .eq('id', params.id)
      .single();

    if (saleError || !sale) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Soft delete: set is_active = false
    const { error: deleteError } = await supabase
      .from('sales_retail')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting sale:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 400 }
      );
    }

    // ✅ Revert stock: Add back quantities
    if (sale.sales_retail_items && sale.sales_retail_items.length > 0) {
      for (const item of sale.sales_retail_items) {
        const { data: stockRecord } = await supabase
          .from('item_store_stock')
          .select('*')
          .eq('item_id', item.item_id)
          .eq('store_id', sale.store_id)
          .single();

        if (stockRecord) {
          const newQuantity = stockRecord.quantity_on_hand + item.quantity;

          // Update stock
          await supabase
            .from('item_store_stock')
            .update({
              quantity_on_hand: newQuantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', stockRecord.id);

          // Create reversal inventory transaction
          await supabase.from('inventory_transactions').insert({
            id: uuidv4(),
            item_id: item.item_id,
            store_id: sale.store_id,
            transaction_type: 'sale_return',
            quantity: item.quantity, // Positive to add back
            reference_id: params.id,
            reference_type: 'sales_retail_reversal',
            notes: `Sale reversal: ${sale.invoice_number}`,
          });

          console.log(
            `✅ Stock reverted: Item ${item.item_id}, Added back ${item.quantity}, New qty: ${newQuantity}`
          );
        }
      }
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      id: uuidv4(),
      action: 'DELETE',
      table_name: 'sales_retail',
      record_id: params.id,
      old_values: {
        invoice_number: sale.invoice_number,
        is_active: true,
      },
      new_values: {
        is_active: false,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Sale deleted and stock reverted',
      data: {
        id: params.id,
        invoice_number: sale.invoice_number,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}