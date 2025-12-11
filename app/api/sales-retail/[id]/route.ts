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

    // Fetch sale data
    const { data: sale, error } = await supabase
      .from('sales_retail')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !sale) {
      console.error('Error fetching sale:', error);
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Fetch store
    let store = null;
    if (sale.store_id) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, code, name, address')
        .eq('id', sale.store_id)
        .single();
      store = storeData;
    }

    // Fetch customer
    let customer = null;
    if (sale.customer_id) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('id, name, type, phone, email')
        .eq('id', sale.customer_id)
        .single();
      customer = customerData;
    }

    // Fetch employee
    let employee = null;
    if (sale.employee_id) {
      const { data: employeeData } = await supabase
        .from('employees')
        .select('id, name, email')
        .eq('id', sale.employee_id)
        .single();
      employee = employeeData;
    }

    // Fetch items with item details
    const { data: items } = await supabase
      .from('sales_retail_items')
      .select('*')
      .eq('sales_retail_id', id);

    let itemsWithDetails: any[] = [];
    if (items && items.length > 0) {
      for (const item of items) {
        const { data: itemData } = await supabase
          .from('items')
          .select('id, code, name, unit_of_measure')
          .eq('id', item.item_id)
          .single();

        itemsWithDetails.push({
          ...item,
          items: itemData,
        });
      }
    }

    const formatted = {
      id: sale.id,
      invoice_number: sale.invoice_number,
      invoice_date: sale.invoice_date,
      sale_date: sale.sale_date,
      customer_id: sale.customer_id,
      store_id: sale.store_id,
      employee_id: sale.employee_id,
      payment_method: sale.payment_method,
      payment_status: sale.payment_status,
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      total_amount: sale.total_amount,
      description: sale.description,
      is_active: sale.is_active,
      created_at: sale.created_at,
      updated_at: sale.updated_at,
      stores: store,
      customers: customer,
      employees: employee,
      sales_retail_items: itemsWithDetails,
    };

    return NextResponse.json({
      success: true,
      data: formatted,
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
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Validate payment status
    if (body.payment_status && !['unpaid', 'partially_paid', 'paid'].includes(body.payment_status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment status' },
        { status: 400 }
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get sale with items for stock reversal
    const { data: sale, error: saleError } = await supabase
      .from('sales_retail')
      .select('*')
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

    // Fetch items
    const { data: items } = await supabase
      .from('sales_retail_items')
      .select('*')
      .eq('sales_retail_id', id);

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
    if (items && items.length > 0) {
      for (const item of items) {
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
        itemsReverted: items?.length || 0,
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