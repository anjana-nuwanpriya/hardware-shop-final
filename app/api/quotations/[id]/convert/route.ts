import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log('Convert request body:', body);

    const { sale_type = 'retail', payment_method, payment_status = 'unpaid', item_ids } = body;

    // Get quotation with items
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select(
        `
        id,
        customer_id,
        store_id,
        subtotal,
        discount,
        tax,
        total_amount,
        quotation_items(
          id,
          item_id,
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

    if (quotationError || !quotation) {
      return notFoundResponse('Quotation not found');
    }

    // Filter items if specific item_ids provided
    let itemsToConvert = quotation.quotation_items || [];
    if (item_ids && Array.isArray(item_ids) && item_ids.length > 0) {
      itemsToConvert = itemsToConvert.filter((item: any) => item_ids.includes(item.id));
    }

    if (itemsToConvert.length === 0) {
      return errorResponse('No items selected for conversion', 400);
    }

    // Determine table based on sale type
    const saleTable = sale_type === 'retail' ? 'sales_retail' : 'sales_wholesale';
    const itemsTable = sale_type === 'retail' ? 'sales_retail_items' : 'sales_wholesale_items';
    const fkColumn = sale_type === 'retail' ? 'sales_retail_id' : 'sales_wholesale_id';

    // Get store code
    const { data: storeData } = await supabase
      .from('stores')
      .select('code')
      .eq('id', quotation.store_id);

    if (!storeData || storeData.length === 0) {
      return errorResponse('Store not found', 404);
    }

    const storeCode = storeData[0].code;

    // Get next invoice number
    const { data: lastSale } = await supabase
      .from(saleTable)
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1001;
    if (lastSale?.invoice_number) {
      const parts = lastSale.invoice_number.split('-');
      const lastNum = parseInt(parts[parts.length - 1]) || 1000;
      nextNumber = lastNum + 1;
    }

    const invoicePrefix = sale_type === 'retail' ? 'SINV' : 'WINV';
    const invoice_number = `${storeCode}-${invoicePrefix}-${String(nextNumber).padStart(6, '0')}`;

    // Calculate totals for selected items
    let subtotal = 0;
    const lineItems: any[] = [];

    itemsToConvert.forEach((item: any) => {
      subtotal += item.net_value;
      lineItems.push({
        item_id: item.item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
        discount_value: item.discount_value || 0,
        tax_value: item.tax_value || 0,
        net_value: item.net_value,
      });
    });

    // Prorate discount and tax if partial items selected
    const itemRatio = itemsToConvert.length / (quotation.quotation_items?.length || 1);
    const discountAmount = (quotation.discount || 0) * itemRatio;
    const taxAmount = (quotation.tax || 0) * itemRatio;
    const totalAmount = subtotal - discountAmount + taxAmount;

    // Create sale
    const { data: saleData, error: saleError } = await supabase
      .from(saleTable)
      .insert([
        {
          invoice_number,
          invoice_date: new Date().toISOString(),
          sale_date: new Date().toISOString().split('T')[0],
          customer_id: quotation.customer_id,
          store_id: quotation.store_id,
          payment_method: payment_method || 'cash',
          payment_status: payment_status || 'unpaid',
          subtotal,
          discount: discountAmount,
          tax: taxAmount,
          total_amount: totalAmount > 0 ? totalAmount : 0,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (saleError) {
      console.error('Sale creation error:', saleError);
      return errorResponse(saleError.message, 400);
    }

    // Create line items
    const itemsToInsert = lineItems.map((item: any) => ({
      [fkColumn]: saleData.id,
      ...item,
    }));

    const { error: itemsError } = await supabase
      .from(itemsTable)
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Items creation error:', itemsError);
      return errorResponse(itemsError.message, 400);
    }

    // Create inventory transactions for stock deduction
    const inventoryTransactions = lineItems.map((item: any) => ({
      item_id: item.item_id,
      store_id: quotation.store_id,
      transaction_type: 'sale',
      quantity: -item.quantity,
      reference_id: saleData.id,
      reference_type: sale_type === 'retail' ? 'sales_retail' : 'sales_wholesale',
    }));

    await supabase
      .from('inventory_transactions')
      .insert(inventoryTransactions);

    // Update item_store_stock
    for (const item of lineItems) {
      const { data: stock } = await supabase
        .from('item_store_stock')
        .select('quantity_on_hand')
        .eq('item_id', item.item_id)
        .eq('store_id', quotation.store_id)
        .single();

      if (stock) {
        await supabase
          .from('item_store_stock')
          .update({
            quantity_on_hand: Math.max(0, stock.quantity_on_hand - item.quantity),
          })
          .eq('item_id', item.item_id)
          .eq('store_id', quotation.store_id);
      }
    }

    // Update quotation status
    await supabase
      .from('quotations')
      .update({ status: 'converted', updated_at: new Date().toISOString() })
      .eq('id', id);

    // Log audit
    await logAudit(
      {
        action: 'CONVERSION',
        table_name: 'quotations',
        record_id: id,
        new_values: {
          invoice_id: saleData.id,
          invoice_number: saleData.invoice_number,
          sale_type,
          items_count: lineItems.length,
        },
      },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || ''
    );

    return createdResponse('Quotation converted to sale successfully', {
      id: saleData.id,
      invoice_number: saleData.invoice_number,
      sale_type,
      items_count: lineItems.length,
    });
  } catch (error) {
    console.error('Convert error:', error);
    return serverErrorResponse('Failed to convert quotation', error);
  }
}