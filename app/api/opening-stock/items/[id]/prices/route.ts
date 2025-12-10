/**
 * API Route: /app/api/items/[id]/prices/route.ts
 * Fixed to use your existing Supabase integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * PUT /api/items/[id]/prices
 * Update item prices and log to audit table
 * Body:
 * {
 *   cost_price?: number,
 *   retail_price?: number,
 *   wholesale_price?: number,
 *   employee_id?: UUID
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { cost_price, retail_price, wholesale_price, employee_id } = body;

    // Validation
    if (cost_price === undefined && retail_price === undefined && wholesale_price === undefined) {
      return NextResponse.json(
        { success: false, error: 'At least one price field must be provided' },
        { status: 400 }
      );
    }

    // Validate prices are positive if provided
    if (cost_price !== undefined && cost_price <= 0) {
      return NextResponse.json(
        { success: false, error: 'cost_price must be greater than 0' },
        { status: 400 }
      );
    }

    if (retail_price !== undefined && retail_price <= 0) {
      return NextResponse.json(
        { success: false, error: 'retail_price must be greater than 0' },
        { status: 400 }
      );
    }

    if (wholesale_price !== undefined && wholesale_price <= 0) {
      return NextResponse.json(
        { success: false, error: 'wholesale_price must be greater than 0' },
        { status: 400 }
      );
    }

    // Get current item data for audit
    const { data: oldItem, error: fetchError } = await supabase
      .from('items')
      .select('cost_price, retail_price, wholesale_price')
      .eq('id', id)
      .single();

    if (fetchError || !oldItem) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    // Prepare update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (cost_price !== undefined) {
      updateData.cost_price = cost_price;
    }
    if (retail_price !== undefined) {
      updateData.retail_price = retail_price;
    }
    if (wholesale_price !== undefined) {
      updateData.wholesale_price = wholesale_price;
    }

    // Update item
    const { error: updateError } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating item prices:', updateError);
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
      table_name: 'items',
      record_id: id,
      old_values: {
        cost_price: oldItem.cost_price,
        retail_price: oldItem.retail_price,
        wholesale_price: oldItem.wholesale_price,
      },
      new_values: {
        cost_price: updateData.cost_price || oldItem.cost_price,
        retail_price: updateData.retail_price || oldItem.retail_price,
        wholesale_price: updateData.wholesale_price || oldItem.wholesale_price,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Item prices updated successfully',
      data: {
        id,
        ...updateData,
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