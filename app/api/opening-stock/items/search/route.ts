/**
 * API Route: /app/api/opening-stock/items/search/route.ts
 * Fixed to use your existing Supabase integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/opening-stock/items/search
 * Search active items by name, code, or barcode
 * Query params:
 *   - q: search query (name, code, barcode)
 *   - limit: results limit (default: 20)
 *   - category_id: filter by category (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const categoryId = searchParams.get('category_id');

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Query must be at least 2 characters',
      });
    }

    let dbQuery = supabase
      .from('items')
      .select(
        `
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
        tax_rate,
        is_active
      `
      )
      .eq('is_active', true);

    // Filter by category if provided
    if (categoryId) {
      dbQuery = dbQuery.eq('category_id', categoryId);
    }

    // Search by name, code, or barcode
    dbQuery = dbQuery.or(
      `name.ilike.%${query}%,code.ilike.%${query}%,barcode.ilike.%${query}%`
    );

    dbQuery = dbQuery.limit(limit);

    const { data: items, error } = await dbQuery;

    if (error) {
      console.error('Error searching items:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: items || [],
      count: (items || []).length,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}