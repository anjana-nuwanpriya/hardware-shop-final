/**
 * API Route: /app/api/sales-retail/route.ts
 * Get list of retail sales and create new retail sales
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/sales-retail
 * List retail sales with optional filters
 * Query params: payment_status, store_id, date_from, date_to, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentStatus = searchParams.get('payment_status');
    const storeId = searchParams.get('store_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('sales_retail')
      .select(
        `
        id,
        invoice_number,
        invoice_date,
        sale_date,
        customer_id,
        customers(id, name, type),
        store_id,
        stores(id, code, name),
        employee_id,
        employees(id, name),
        payment_method,
        payment_status,
        subtotal,
        discount,
        tax,
        total_amount,
        description,
        is_active,
        created_at,
        updated_at
      `,
        { count: 'exact' }
      )
      .eq('is_active', true)
      .order('invoice_date', { ascending: false });

    // Apply filters
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    if (dateFrom) {
      query = query.gte('sale_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('sale_date', dateTo);
    }

    // Apply pagination
    const { data: sales, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching sales:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sales || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
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

/**
 * POST /api/sales-retail
 * Create new retail sale with items
 * Body:
 * {
 *   customer_id?: UUID,
 *   store_id: UUID,
 *   employee_id?: UUID,
 *   payment_method: 'cash' | 'card' | 'bank' | 'check',
 *   description?: string,
 *   items: [
 *     {
 *       item_id: UUID,
 *       quantity: number,
 *       unit_price: number,
 *       discount_percent?: number,
 *       discount_value?: number,
 *       batch_no?: string
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer_id,
      store_id,
      employee_id,
      payment_method,
      description,
      items,
    } = body;

    // Validation
    if (!store_id) {
      return NextResponse.json(
        { success: false, error: 'store_id is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of items) {
      if (!item.item_id || item.quantity <= 0 || item.unit_price <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'All items must have: item_id, quantity > 0, unit_price > 0',
          },
          { status: 400 }
        );
      }
    }

    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;

    const validatedItems = items.map((item: any) => {
      const discountPercent = item.discount_percent || 0;
      const lineTotal = item.unit_price * item.quantity;
      const discountValue = item.discount_value || (lineTotal * discountPercent) / 100;
      const netValue = lineTotal - discountValue;

      subtotal += lineTotal;
      totalDiscount += discountValue;

      return {
        item_id: item.item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: discountPercent,
        discount_value: discountValue,
        net_value: netValue,
        batch_no: item.batch_no || null,
      };
    });

    // Get store code for invoice number
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('code')
      .eq('id', store_id)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      );
    }

    // Generate invoice number (e.g., STR001-SINV-000123)
    const { data: lastInvoice } = await supabase
      .from('sales_retail')
      .select('invoice_number')
      .like('invoice_number', `${store.code}-SINV-%`)
      .order('created_at', { ascending: false })
      .limit(1);

    let invoiceNumber = `${store.code}-SINV-000001`;
    if (lastInvoice && lastInvoice.length > 0) {
      const lastNum = parseInt(lastInvoice[0].invoice_number.split('-').pop() || '0', 10);
      invoiceNumber = `${store.code}-SINV-${String(lastNum + 1).padStart(6, '0')}`;
    }

    const totalTax = 0; // Tax calculation can be enhanced later
    const totalAmount = subtotal - totalDiscount + totalTax;
    const saleId = uuidv4();

    // Create sales_retail record
    const { error: saleError } = await supabase.from('sales_retail').insert({
      id: saleId,
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString(),
      sale_date: new Date().toISOString().split('T')[0],
      customer_id: customer_id || null,
      store_id,
      employee_id: employee_id || null,
      payment_method: payment_method || 'cash',
      payment_status: 'unpaid',
      subtotal,
      discount: totalDiscount,
      tax: totalTax,
      total_amount: totalAmount,
      description: description || null,
      is_active: true,
    });

    if (saleError) {
      console.error('Error creating sale:', saleError);
      return NextResponse.json(
        { success: false, error: saleError.message },
        { status: 400 }
      );
    }

    // Create sales_retail_items
    const itemsToInsert = validatedItems.map((item: any) => ({
      id: uuidv4(),
      sales_retail_id: saleId,
      item_id: item.item_id,
      batch_no: item.batch_no,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent,
      discount_value: item.discount_value,
      tax_value: 0,
      net_value: item.net_value,
    }));

    const { error: itemsError } = await supabase
      .from('sales_retail_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error creating sale items:', itemsError);
      // Rollback sale if items fail
      await supabase.from('sales_retail').delete().eq('id', saleId);
      return NextResponse.json(
        { success: false, error: itemsError.message },
        { status: 400 }
      );
    }

    // ✅ CRITICAL: Deduct stock immediately & create inventory transactions
    for (const item of validatedItems) {
      // Get current stock
      const { data: stockRecord } = await supabase
        .from('item_store_stock')
        .select('*')
        .eq('item_id', item.item_id)
        .eq('store_id', store_id)
        .single();

      if (stockRecord) {
        const newQuantity = Math.max(0, stockRecord.quantity_on_hand - item.quantity);

        // Update stock
        await supabase
          .from('item_store_stock')
          .update({
            quantity_on_hand: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', stockRecord.id);

        // Create inventory transaction
        await supabase.from('inventory_transactions').insert({
          id: uuidv4(),
          item_id: item.item_id,
          store_id,
          transaction_type: 'sale',
          quantity: -item.quantity,
          batch_no: item.batch_no || null,
          reference_id: saleId,
          reference_type: 'sales_retail',
          notes: `Sale: ${invoiceNumber}`,
          created_by: employee_id || null,
        });

        console.log(
          `✅ Stock deducted: Item ${item.item_id}, Qty ${item.quantity}, New: ${newQuantity}`
        );
      }
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      id: uuidv4(),
      user_id: employee_id || null,
      action: 'CREATE',
      table_name: 'sales_retail',
      record_id: saleId,
      new_values: {
        invoice_number: invoiceNumber,
        store_id,
        total_amount: totalAmount,
        items_count: validatedItems.length,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: saleId,
          invoice_number: invoiceNumber,
          total_amount: totalAmount,
          items_count: validatedItems.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}