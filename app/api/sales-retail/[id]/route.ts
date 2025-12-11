/**
 * API Route: /app/api/sales-retail/[id]/route.ts
 * Get, update, and delete retail sales
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/sales-retail/[id]
 * Get detailed sale information with items and relationships
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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
      .eq('id', id)
      .eq('is_active', true)
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
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sales-retail/[id]
 * Update sale payment status or other details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get current sale
    const { data: sale, error: saleError } = await supabase
      .from('sales_retail')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (saleError || !sale) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Update sale
    const { data, error } = await supabase
      .from('sales_retail')
      .update({
        payment_status: body.payment_status || sale.payment_status,
        payment_method: body.payment_method || sale.payment_method,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating sale:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Sale updated successfully',
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
  { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Get sale with items for stock reversal
    const { data: sale, error: saleError } = await supabase
      .from('sales_retail')
      .select(
        `
        *,
        sales_retail_items(
          *,
          items(*)
        )
      `
      )
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (saleError || !sale) {
      console.error('Error fetching sale:', saleError);
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Soft delete the sale
    const { error: deleteError } = await supabase
      .from('sales_retail')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

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
            reference_id: id,
            reference_type: 'sales_retail_reversal',
            notes: `Sale reversal: ${sale.invoice_number}`,
          });

          console.log(
            `✅ Stock reverted: Item ${item.item_id}, Added back ${item.quantity}, New qty: ${newQuantity}`
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sale deleted and stock reverted successfully',
      data: {
        id: sale.id,
        invoice_number: sale.invoice_number,
        itemsReverted: sale.sales_retail_items?.length || 0,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}