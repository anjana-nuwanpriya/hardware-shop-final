
cat > "$PROJECT_ROOT/app/api/purchase-grns/route.ts" << 'APIEOF'
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(request.url);
    const supplier_id = searchParams.get('supplier_id');
    const store_id = searchParams.get('store_id');
    const status = searchParams.get('status');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sort = searchParams.get('sort') || 'grn_date';
    const order = searchParams.get('order') || 'desc';

    let query = supabase
      .from('purchase_grns')
      .select(`
        *,
        suppliers(name, contact_person, phone),
        stores(name, code),
        employees(name)
      `)
      .eq('is_active', true);

    if (supplier_id) query = query.eq('supplier_id', supplier_id);
    if (store_id) query = query.eq('store_id', store_id);
    if (status) query = query.eq('payment_status', status);
    if (date_from) query = query.gte('grn_date', date_from);
    if (date_to) query = query.lte('grn_date', date_to);

    const offset = (page - 1) * limit;
    query = query.order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplier_id, store_id, po_reference_id, invoice_number, invoice_date, description, items } = body;

    // Validate required fields
    if (!supplier_id || !store_id || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: supplier_id, store_id, items' },
        { status: 400 }
      );
    }

    // Get next GRN number
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'grn_next_number')
      .single();

    const nextNumber = parseInt(settings?.setting_value || '1');
    const { data: store } = await supabase
      .from('stores')
      .select('code')
      .eq('id', store_id)
      .single();

    const grn_number = `${store?.code}-GRN-${String(nextNumber).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let total_discount = 0;
    items.forEach((item: any) => {
      const line_total = item.received_qty * item.cost_price;
      const discount = line_total * (item.discount_percent / 100);
      subtotal += line_total;
      total_discount += discount;
    });

    const total_amount = subtotal - total_discount;

    // Create GRN
    const { data: grn, error: grnError } = await supabase
      .from('purchase_grns')
      .insert({
        grn_number,
        grn_date: new Date(),
        supplier_id,
        store_id,
        po_reference_id,
        invoice_number,
        invoice_date,
        total_amount,
        payment_status: 'unpaid',
        description,
        is_active: true
      })
      .select()
      .single();

    if (grnError) throw grnError;

    // Create line items and update stock
    for (const item of items) {
      const net_value = (item.received_qty * item.cost_price) - (item.received_qty * item.cost_price * item.discount_percent / 100);

      // Insert line item
      const { error: itemError } = await supabase
        .from('purchase_grn_items')
        .insert({
          purchase_grn_id: grn.id,
          item_id: item.item_id,
          batch_no: item.batch_no,
          batch_expiry: item.batch_expiry,
          received_qty: item.received_qty,
          cost_price: item.cost_price,
          discount_percent: item.discount_percent,
          discount_value: item.received_qty * item.cost_price * item.discount_percent / 100,
          net_value
        });

      if (itemError) throw itemError;

      // Create inventory transaction
      await supabase
        .from('inventory_transactions')
        .insert({
          item_id: item.item_id,
          store_id,
          transaction_type: 'grn',
          quantity: item.received_qty,
          batch_no: item.batch_no,
          batch_expiry: item.batch_expiry,
          reference_id: grn.id,
          reference_type: 'purchase_grn',
          created_by: body.user_id
        });

      // Update stock
      const { data: currentStock } = await supabase
        .from('item_store_stock')
        .select('quantity_on_hand')
        .eq('item_id', item.item_id)
        .eq('store_id', store_id)
        .single();

      if (currentStock) {
        await supabase
          .from('item_store_stock')
          .update({
            quantity_on_hand: (currentStock.quantity_on_hand || 0) + item.received_qty,
            last_restock_date: new Date()
          })
          .eq('item_id', item.item_id)
          .eq('store_id', store_id);
      } else {
        await supabase
          .from('item_store_stock')
          .insert({
            item_id: item.item_id,
            store_id,
            quantity_on_hand: item.received_qty,
            last_restock_date: new Date()
          });
      }
    }

    // Update next number in settings
    await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'grn_next_number',
        setting_value: String(nextNumber + 1),
        setting_type: 'integer'
      });

    // Log in audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: body.user_id,
        action: 'CREATE',
        table_name: 'purchase_grns',
        record_id: grn.id,
        new_values: grn
      });

    return NextResponse.json({
      success: true,
      data: grn,
      message: `GRN ${grn_number} created successfully`
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
APIEOF

# Create GRN Detail API
cat > "$PROJECT_ROOT/app/api/purchase-grns/[id]/route.ts" << 'APIEOF'
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: grn, error: grnError } = await supabase
      .from('purchase_grns')
      .select(`
        *,
        suppliers(id, name, contact_person, phone, email),
        stores(id, name, code),
        employees(id, name),
        purchase_orders(po_number)
      `)
      .eq('id', params.id)
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
      .select(`
        *,
        items(id, code, name, unit_of_measure)
      `)
      .eq('purchase_grn_id', params.id);

    const { data: allocations } = await supabase
      .from('supplier_payment_allocations')
      .select('*')
      .eq('purchase_grn_id', params.id);

    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('record_id', params.id)
      .eq('table_name', 'purchase_grns')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        ...grn,
        items,
        allocations,
        auditLogs
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const { invoice_number, invoice_date, description } = body;

    const { data: grn, error: updateError } = await supabase
      .from('purchase_grns')
      .update({
        invoice_number,
        invoice_date,
        description,
        updated_at: new Date()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: body.user_id,
        action: 'UPDATE',
        table_name: 'purchase_grns',
        record_id: params.id,
        old_values: { invoice_number, invoice_date, description },
        new_values: grn
      });

    return NextResponse.json({
      success: true,
      data: grn,
      message: 'GRN updated successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get GRN details
    const { data: grn } = await supabase
      .from('purchase_grns')
      .select('*')
      .eq('id', params.id)
      .single();

    // Get items
    const { data: items } = await supabase
      .from('purchase_grn_items')
      .select('*')
      .eq('purchase_grn_id', params.id);

    // Reverse inventory transactions and stock
    if (items) {
      for (const item of items) {
        // Create reverse inventory transaction
        await supabase
          .from('inventory_transactions')
          .insert({
            item_id: item.item_id,
            store_id: grn.store_id,
            transaction_type: 'grn_reversal',
            quantity: -item.received_qty,
            batch_no: item.batch_no,
            reference_id: params.id,
            reference_type: 'purchase_grn'
          });

        // Update stock
        await supabase
          .from('item_store_stock')
          .update({
            quantity_on_hand: supabase.raw('quantity_on_hand - ' + item.received_qty)
          })
          .eq('item_id', item.item_id)
          .eq('store_id', grn.store_id);
      }
    }

    // Soft delete GRN
    const { error: deleteError } = await supabase
      .from('purchase_grns')
      .update({
        is_active: false,
        updated_at: new Date()
      })
      .eq('id', params.id);

    if (deleteError) throw deleteError;

    // Log audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: request.headers.get('user-id'),
        action: 'DELETE',
        table_name: 'purchase_grns',
        record_id: params.id,
        old_values: grn
      });

    return NextResponse.json({
      success: true,
      message: 'GRN deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
APIEOF

# Create GRN Outstanding API
cat > "$PROJECT_ROOT/app/api/purchase-grns/[id]/outstanding/route.ts" << 'APIEOF'
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: grn } = await supabase
      .from('purchase_grns')
      .select('total_amount')
      .eq('id', params.id)
      .single();

    const { data: allocations } = await supabase
      .from('supplier_payment_allocations')
      .select('allocation_amount')
      .eq('purchase_grn_id', params.id);

    const paid_amount = allocations?.reduce((sum, a) => sum + (a.allocation_amount || 0), 0) || 0;
    const outstanding = (grn?.total_amount || 0) - paid_amount;

    return NextResponse.json({
      success: true,
      data: {
        grn_id: params.id,
        total_amount: grn?.total_amount,
        paid_amount,
        outstanding,
        percentage_paid: grn?.total_amount ? (paid_amount / grn.total_amount * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
APIEOF

# Create Supplier Outstanding GRNs API
cat > "$PROJECT_ROOT/app/api/suppliers/[id]/outstanding-grns/route.ts" << 'APIEOF'
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: grns } = await supabase
      .from('purchase_grns')
      .select(`
        id,
        grn_number,
        grn_date,
        total_amount,
        payment_status,
        stores(name)
      `)
      .eq('supplier_id', params.id)
      .eq('is_active', true)
      .in('payment_status', ['unpaid', 'partially_paid']);

    let totalAmount = 0;
    let totalPaid = 0;

    for (const grn of grns || []) {
      const { data: allocations } = await supabase
        .from('supplier_payment_allocations')
        .select('allocation_amount')
        .eq('purchase_grn_id', grn.id);

      const paid = allocations?.reduce((sum, a) => sum + (a.allocation_amount || 0), 0) || 0;
      grn.paid_amount = paid;
      grn.outstanding = grn.total_amount - paid;
      totalAmount += grn.total_amount;
      totalPaid += paid;
    }

    return NextResponse.json({
      success: true,
      data: {
        supplier_id: params.id,
        grns: grns || [],
        summary: {
          total_amount: totalAmount,
          total_paid: totalPaid,
          total_outstanding: totalAmount - totalPaid,
          grn_count: grns?.length || 0
        }
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
APIEOF

# ============================================================================
# 2. UI PAGES
# ============================================================================

# Create GRN List Page
cat > "$PROJECT_ROOT/app/purchase/grn/page.tsx" << 'UIEOF'
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface GRN {
  id: string;
  grn_number: string;
  grn_date: string;
  total_amount: number;
  payment_status: string;
  suppliers: { name: string };
  stores: { name: string };
}

export default function GRNListPage() {
  const router = useRouter();
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    supplier_id: '',
    store_id: '',
    status: '',
    date_from: '',
    date_to: ''
  });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  useEffect(() => {
    fetchSuppliers();
    fetchStores();
    fetchGRNs();
  }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('is_active', true);
    setSuppliers(data || []);
  };

  const fetchStores = async () => {
    const { data } = await supabase
      .from('stores')
      .select('id, name, code')
      .eq('is_active', true);
    setStores(data || []);
  };

  const fetchGRNs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.supplier_id && { supplier_id: filters.supplier_id }),
        ...(filters.store_id && { store_id: filters.store_id }),
        ...(filters.status && { status: filters.status }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to })
      });

      const res = await fetch(`/api/purchase-grns?${params}`);
      const result = await res.json();
      
      if (result.success) {
        setGrns(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Error fetching GRNs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this GRN?')) return;
    
    try {
      const res = await fetch(`/api/purchase-grns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchGRNs();
      }
    } catch (error) {
      console.error('Error deleting GRN:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  useEffect(() => {
    fetchGRNs();
  }, [filters, pagination.page]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Purchase GRNs</h1>
        <Link href="/purchase/grn/new" className="bg-blue-600 text-white px-4 py-2 rounded">
          + New GRN
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded mb-6 grid grid-cols-5 gap-4">
        <select 
          value={filters.supplier_id}
          onChange={(e) => handleFilterChange('supplier_id', e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Suppliers</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select 
          value={filters.store_id}
          onChange={(e) => handleFilterChange('store_id', e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Stores</option>
          {stores.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select 
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
        </select>

        <input 
          type="date"
          value={filters.date_from}
          onChange={(e) => handleFilterChange('date_from', e.target.value)}
          className="border p-2 rounded"
          placeholder="From Date"
        />

        <input 
          type="date"
          value={filters.date_to}
          onChange={(e) => handleFilterChange('date_to', e.target.value)}
          className="border p-2 rounded"
          placeholder="To Date"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">GRN #</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Supplier</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Store</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Amount</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-4 text-center">Loading...</td></tr>
            ) : grns.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">No GRNs found</td></tr>
            ) : (
              grns.map(grn => (
                <tr key={grn.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-blue-600">
                    <Link href={`/purchase/grn/${grn.id}`}>{grn.grn_number}</Link>
                  </td>
                  <td className="px-6 py-4">{new Date(grn.grn_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{grn.suppliers?.name}</td>
                  <td className="px-6 py-4">{grn.stores?.name}</td>
                  <td className="px-6 py-4 text-right">Rs. {grn.total_amount?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(grn.payment_status)}`}>
                      {grn.payment_status === 'partially_paid' ? 'Partial' : grn.payment_status === 'unpaid' ? 'Unpaid' : 'Paid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    <Link href={`/purchase/grn/${grn.id}`} className="text-blue-600 hover:underline text-sm">View</Link>
                    <button 
                      onClick={() => handleDelete(grn.id)}
                      className="text-red-600 hover:underline text-sm"
                    >Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >Previous</button>
          <span className="px-4 py-2">{pagination.page} / {pagination.pages}</span>
          <button 
            onClick={() => setPagination(p => ({ ...p, page: Math.min(pagination.pages, p.page + 1) }))}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >Next</button>
        </div>
      </div>
    </div>
  );
}
UIEOF

# Create GRN Create Page
cat > "$PROJECT_ROOT/app/purchase/grn/new/page.tsx" << 'UIEOF'
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface GRNItem {
  item_id: string;
  batch_no: string;
  batch_expiry: string;
  received_qty: number;
  cost_price: number;
  discount_percent: number;
}

export default function GRNCreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    supplier_id: '',
    store_id: '',
    po_reference_id: '',
    invoice_number: '',
    invoice_date: '',
    description: ''
  });

  const [lineItems, setLineItems] = useState<GRNItem[]>([
    { item_id: '', batch_no: '', batch_expiry: '', received_qty: 0, cost_price: 0, discount_percent: 0 }
  ]);

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    if (formData.supplier_id) fetchPurchaseOrders();
  }, [formData.supplier_id]);

  const fetchMasters = async () => {
    const [suppliersRes, storesRes, itemsRes] = await Promise.all([
      supabase.from('suppliers').select('id, name').eq('is_active', true),
      supabase.from('stores').select('id, name, code').eq('is_active', true),
      supabase.from('items').select('id, code, name, unit_of_measure').eq('is_active', true)
    ]);

    setSuppliers(suppliersRes.data || []);
    setStores(storesRes.data || []);
    setItems(itemsRes.data || []);
  };

  const fetchPurchaseOrders = async () => {
    const { data } = await supabase
      .from('purchase_orders')
      .select('id, po_number, purchase_order_items(item_id, quantity)')
      .eq('supplier_id', formData.supplier_id)
      .eq('status', 'pending')
      .eq('is_active', true);
    setPurchaseOrders(data || []);
  };

  const handleAddItem = () => {
    setLineItems([...lineItems, { item_id: '', batch_no: '', batch_expiry: '', received_qty: 0, cost_price: 0, discount_percent: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
  };

  const calculateNetValue = (item: GRNItem) => {
    const lineTotal = item.received_qty * item.cost_price;
    const discount = lineTotal * (item.discount_percent / 100);
    return lineTotal - discount;
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.received_qty * item.cost_price), 0);
    const totalDiscount = lineItems.reduce((sum, item) => {
      const lineTotal = item.received_qty * item.cost_price;
      return sum + (lineTotal * item.discount_percent / 100);
    }, 0);
    return {
      subtotal,
      totalDiscount,
      totalAmount: subtotal - totalDiscount
    };
  };

  const handleSubmit = async (e: React.FormEvent, draft = false) => {
    e.preventDefault();

    if (!formData.supplier_id || !formData.store_id || lineItems.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    if (lineItems.some(item => !item.item_id || item.received_qty === 0)) {
      alert('Please fill all item details');
      return;
    }

    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();

      const res = await fetch('/api/purchase-grns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: lineItems,
          user_id: session?.session?.user?.id
        })
      });

      const result = await res.json();

      if (result.success) {
        alert(result.message);
        router.push(`/purchase/grn/${result.data.id}`);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Error creating GRN: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New GRN</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded p-6 space-y-6">
        {/* Header Section */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Supplier *</label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              required
              className="w-full border p-2 rounded"
            >
              <option value="">Select Supplier</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Store *</label>
            <select
              value={formData.store_id}
              onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
              required
              className="w-full border p-2 rounded"
            >
              <option value="">Select Store</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">PO Reference</label>
            <select
              value={formData.po_reference_id}
              onChange={(e) => setFormData({ ...formData, po_reference_id: e.target.value })}
              className="w-full border p-2 rounded"
            >
              <option value="">No PO</option>
              {purchaseOrders.map(po => (
                <option key={po.id} value={po.id}>{po.po_number}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Invoice #</label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              className="w-full border p-2 rounded"
              placeholder="Supplier's invoice number"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Invoice Date</label>
            <input
              type="date"
              value={formData.invoice_date}
              onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border p-2 rounded"
              placeholder="Optional notes"
            />
          </div>
        </div>

        {/* Items Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Line Items</h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm"
            >
              + Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-left">Batch No</th>
                  <th className="px-4 py-2 text-left">Expiry</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Cost Price</th>
                  <th className="px-4 py-2 text-right">Discount %</th>
                  <th className="px-4 py-2 text-right">Net Value</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">
                      <select
                        value={item.item_id}
                        onChange={(e) => handleItemChange(idx, 'item_id', e.target.value)}
                        required
                        className="w-full border p-1 rounded text-xs"
                      >
                        <option value="">Select Item</option>
                        {items.map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.batch_no}
                        onChange={(e) => handleItemChange(idx, 'batch_no', e.target.value)}
                        className="w-full border p-1 rounded text-xs"
                        placeholder="Batch"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={item.batch_expiry}
                        onChange={(e) => handleItemChange(idx, 'batch_expiry', e.target.value)}
                        className="w-full border p-1 rounded text-xs"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.received_qty}
                        onChange={(e) => handleItemChange(idx, 'received_qty', parseFloat(e.target.value) || 0)}
                        className="w-full border p-1 rounded text-xs text-right"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.cost_price}
                        onChange={(e) => handleItemChange(idx, 'cost_price', parseFloat(e.target.value) || 0)}
                        className="w-full border p-1 rounded text-xs text-right"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.discount_percent}
                        onChange={(e) => handleItemChange(idx, 'discount_percent', parseFloat(e.target.value) || 0)}
                        className="w-full border p-1 rounded text-xs text-right"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">
                      Rs. {calculateNetValue(item).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-600 hover:underline text-xs"
                      >Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-gray-50 p-4 rounded flex justify-end">
          <div className="w-80">
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>Rs. {totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2 text-yellow-600">
              <span>Total Discount:</span>
              <span>- Rs. {totals.totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total Amount:</span>
              <span>Rs. {totals.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create GRN'}
          </button>
        </div>
      </form>
    </div>
  );
}
UIEOF

# Create GRN Detail Page
cat > "$PROJECT_ROOT/app/purchase/grn/\[id\]/page.tsx" << 'UIEOF'
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface GRNDetail {
  id: string;
  grn_number: string;
  grn_date: string;
  total_amount: number;
  payment_status: string;
  suppliers: any;
  stores: any;
  items: any[];
  allocations: any[];
  auditLogs: any[];
}

export default function GRNDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [grn, setGrn] = useState<GRNDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [outstanding, setOutstanding] = useState(0);

  useEffect(() => {
    fetchGRN();
  }, [params.id]);

  const fetchGRN = async () => {
    try {
      const res = await fetch(`/api/purchase-grns/${params.id}`);
      const result = await res.json();
      if (result.success) {
        setGrn(result.data);
        
        // Fetch outstanding
        const outRes = await fetch(`/api/purchase-grns/${params.id}/outstanding`);
        const outResult = await outRes.json();
        if (outResult.success) {
          setOutstanding(outResult.data.outstanding);
        }
      }
    } catch (error) {
      console.error('Error fetching GRN:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure?')) return;
    try {
      const res = await fetch(`/api/purchase-grns/${params.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/purchase/grn');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!grn) return <div className="p-6">GRN not found</div>;

  const paidAmount = (grn.allocations || []).reduce((sum, a) => sum + (a.allocation_amount || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{grn.grn_number}</h1>
          <p className="text-gray-600">Created: {new Date(grn.grn_date).toLocaleDateString()}</p>
        </div>
        <span className={`px-4 py-2 rounded font-semibold ${getStatusColor(grn.payment_status)}`}>
          {grn.payment_status === 'partially_paid' ? 'Partially Paid' : grn.payment_status === 'unpaid' ? 'Unpaid' : 'Paid'}
        </span>
      </div>

      {/* Header Card */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded">
          <h3 className="font-semibold mb-4">Supplier Details</h3>
          <p><strong>{grn.suppliers?.name}</strong></p>
          <p className="text-sm text-gray-600">{grn.suppliers?.contact_person}</p>
          <p className="text-sm text-gray-600">{grn.suppliers?.phone}</p>
          <p className="text-sm text-gray-600">{grn.suppliers?.email}</p>
        </div>

        <div className="bg-white p-6 rounded">
          <h3 className="font-semibold mb-4">Store</h3>
          <p><strong>{grn.stores?.name}</strong></p>
          <p className="text-sm text-gray-600">{grn.stores?.code}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded mb-6 overflow-hidden">
        <div className="bg-gray-100 p-4">
          <h3 className="font-semibold">Line Items</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Item</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Batch</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Expiry</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Qty</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Cost Price</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Discount</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Net Value</th>
            </tr>
          </thead>
          <tbody>
            {grn.items?.map((item, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-4 py-3">{item.items?.name}</td>
                <td className="px-4 py-3">{item.batch_no}</td>
                <td className="px-4 py-3">{item.batch_expiry ? new Date(item.batch_expiry).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3 text-right">{item.received_qty}</td>
                <td className="px-4 py-3 text-right">Rs. {item.cost_price?.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{item.discount_percent}% (Rs. {item.discount_value?.toFixed(2)})</td>
                <td className="px-4 py-3 text-right font-semibold">Rs. {item.net_value?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Section */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded">
          <h3 className="font-semibold mb-4">Payment Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-semibold">Rs. {grn.total_amount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid Amount:</span>
              <span className="font-semibold">Rs. {paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-red-600">
              <span>Outstanding:</span>
              <span className="font-semibold">Rs. {outstanding.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded">
          <h3 className="font-semibold mb-4">Allocations</h3>
          {grn.allocations && grn.allocations.length > 0 ? (
            <div className="space-y-2 text-sm">
              {grn.allocations.map((alloc, idx) => (
                <div key={idx} className="flex justify-between pb-2 border-b">
                  <span>{new Date(alloc.created_at).toLocaleDateString()}</span>
                  <span>Rs. {alloc.allocation_amount?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No allocations yet</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Link href="/purchase/grn" className="px-6 py-2 border rounded">Back</Link>
        {grn.payment_status !== 'paid' && (
          <Link href={`/purchase/grn/${params.id}/edit`} className="px-6 py-2 bg-blue-600 text-white rounded">Edit</Link>
        )}
        <button
          onClick={handleDelete}
          className="px-6 py-2 bg-red-600 text-white rounded"
        >Delete</button>
      </div>
    </div>
  );
}
UIEOF

# Create GRN Edit Page
cat > "$PROJECT_ROOT/app/purchase/grn/\[id\]/edit/page.tsx" << 'UIEOF'
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function GRNEditPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [grn, setGrn] = useState<any>(null);
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: '',
    description: ''
  });

  useEffect(() => {
    fetchGRN();
  }, [params.id]);

  const fetchGRN = async () => {
    try {
      const res = await fetch(`/api/purchase-grns/${params.id}`);
      const result = await res.json();
      if (result.success) {
        setGrn(result.data);
        setFormData({
          invoice_number: result.data.invoice_number || '',
          invoice_date: result.data.invoice_date || '',
          description: result.data.description || ''
        });
      }
    } catch (error) {
      console.error('Error fetching GRN:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`/api/purchase-grns/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert('GRN updated successfully');
        router.push(`/purchase/grn/${params.id}`);
      }
    } catch (error) {
      alert('Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit GRN: {grn?.grn_number}</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Invoice Number</label>
          <input
            type="text"
            value={formData.invoice_number}
            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Invoice Date</label>
          <input
            type="date"
            value={formData.invoice_date}
            onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full border p-2 rounded"
          />
        </div>

        <div className="flex gap-4 justify-end pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded"
          >Cancel</button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
UIEOF

echo "✅ GRN System - All files created successfully!"
echo ""
echo "📁 Created Files:"
echo "  APIs:"
echo "    - /app/api/purchase-grns/route.ts (List & Create)"
echo "    - /app/api/purchase-grns/[id]/route.ts (Get, Update, Delete)"
echo "    - /app/api/purchase-grns/[id]/outstanding/route.ts (Outstanding amount)"
echo "    - /app/api/suppliers/[id]/outstanding-grns/route.ts (Supplier's unpaid GRNs)"
echo ""
echo "  UI Pages:"
echo "    - /app/purchase/grn/page.tsx (List page)"
echo "    - /app/purchase/grn/new/page.tsx (Create page)"
echo "    - /app/purchase/grn/[id]/page.tsx (Detail page)"
echo "    - /app/purchase/grn/[id]/edit/page.tsx (Edit page)"
echo ""
echo "🚀 Next Steps:"
echo "  1. cd to project root"
echo "  2. npm run dev"
echo "  3. Visit http://localhost:3000/purchase/grn"

EOF
chmod +x /home/claude/create-grn-system.sh
cat /home/claude/create-grn-system.sh
Output

#!/bin/bash

# GRN System - Complete APIs and UIs
# Creates all necessary files for GRN management

PROJECT_ROOT="."

# ============================================================================
# 1. API ROUTES
# ============================================================================

# Create GRN LIST API
cat > "$PROJECT_ROOT/app/api/purchase-grns/route.ts" << 'APIEOF'
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(request.url);
    const supplier_id = searchParams.get('supplier_id');
    const store_id = searchParams.get('store_id');
    const status = searchParams.get('status');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sort = searchParams.get('sort') || 'grn_date';
    const order = searchParams.get('order') || 'desc';

    let query = supabase
      .from('purchase_grns')
      .select(`
        *,
        suppliers(name, contact_person, phone),
        stores(name, code),
        employees(name)
      `)
      .eq('is_active', true);

    if (supplier_id) query = query.eq('supplier_id', supplier_id);
    if (store_id) query = query.eq('store_id', store_id);
    if (status) query = query.eq('payment_status', status);
    if (date_from) query = query.gte('grn_date', date_from);
    if (date_to) query = query.lte('grn_date', date_to);

    const offset = (page - 1) * limit;
    query = query.order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplier_id, store_id, po_reference_id, invoice_number, invoice_date, description, items } = body;

    // Validate required fields
    if (!supplier_id || !store_id || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: supplier_id, store_id, items' },
        { status: 400 }
      );
    }

    // Get next GRN number
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'grn_next_number')
      .single();

    const nextNumber = parseInt(settings?.setting_value || '1');
    const { data: store } = await supabase
      .from('stores')
      .select('code')
      .eq('id', store_id)
      .single();

    const grn_number = `${store?.code}-GRN-${String(nextNumber).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let total_discount = 0;
    items.forEach((item: any) => {
      const line_total = item.received_qty * item.cost_price;
      const discount = line_total * (item.discount_percent / 100);
      subtotal += line_total;
      total_discount += discount;
    });

    const total_amount = subtotal - total_discount;

    // Create GRN
    const { data: grn, error: grnError } = await supabase
      .from('purchase_grns')
      .insert({
        grn_number,
        grn_date: new Date(),
        supplier_id,
        store_id,
        po_reference_id,
        invoice_number,
        invoice_date,
        total_amount,
        payment_status: 'unpaid',
        description,
        is_active: true
      })
      .select()
      .single();

    if (grnError) throw grnError;

    // Create line items and update stock
    for (const item of items) {
      const net_value = (item.received_qty * item.cost_price) - (item.received_qty * item.cost_price * item.discount_percent / 100);

      // Insert line item
      const { error: itemError } = await supabase
        .from('purchase_grn_items')
        .insert({
          purchase_grn_id: grn.id,
          item_id: item.item_id,
          batch_no: item.batch_no,
          batch_expiry: item.batch_expiry,
          received_qty: item.received_qty,
          cost_price: item.cost_price,
          discount_percent: item.discount_percent,
          discount_value: item.received_qty * item.cost_price * item.discount_percent / 100,
          net_value
        });

      if (itemError) throw itemError;

      // Create inventory transaction
      await supabase
        .from('inventory_transactions')
        .insert({
          item_id: item.item_id,
          store_id,
          transaction_type: 'grn',
          quantity: item.received_qty,
          batch_no: item.batch_no,
          batch_expiry: item.batch_expiry,
          reference_id: grn.id,
          reference_type: 'purchase_grn',
          created_by: body.user_id
        });

      // Update stock
      const { data: currentStock } = await supabase
        .from('item_store_stock')
        .select('quantity_on_hand')
        .eq('item_id', item.item_id)
        .eq('store_id', store_id)
        .single();

      if (currentStock) {
        await supabase
          .from('item_store_stock')
          .update({
            quantity_on_hand: (currentStock.quantity_on_hand || 0) + item.received_qty,
            last_restock_date: new Date()
          })
          .eq('item_id', item.item_id)
          .eq('store_id', store_id);
      } else {
        await supabase
          .from('item_store_stock')
          .insert({
            item_id: item.item_id,
            store_id,
            quantity_on_hand: item.received_qty,
            last_restock_date: new Date()
          });
      }
    }

    // Update next number in settings
    await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'grn_next_number',
        setting_value: String(nextNumber + 1),
        setting_type: 'integer'
      });

    // Log in audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: body.user_id,
        action: 'CREATE',
        table_name: 'purchase_grns',
        record_id: grn.id,
        new_values: grn
      });

    return NextResponse.json({
      success: true,
      data: grn,
      message: `GRN ${grn_number} created successfully`
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
APIEOF

# Create GRN Detail API
cat > "$PROJECT_ROOT/app/api/purchase-grns/[id]/route.ts" << 'APIEOF'
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: grn, error: grnError } = await supabase
      .from('purchase_grns')
      .select(`
        *,
        suppliers(id, name, contact_person, phone, email),
        stores(id, name, code),
        employees(id, name),
        purchase_orders(po_number)
      `)
      .eq('id', params.id)
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
      .select(`
        *,
        items(id, code, name, unit_of_measure)
      `)
      .eq('purchase_grn_id', params.id);

    const { data: allocations } = await supabase
      .from('supplier_payment_allocations')
      .select('*')
      .eq('purchase_grn_id', params.id);

    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('record_id', params.id)
      .eq('table_name', 'purchase_grns')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        ...grn,
        items,
        allocations,
        auditLogs
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const { invoice_number, invoice_date, description } = body;

    const { data: grn, error: updateError } = await supabase
      .from('purchase_grns')
      .update({
        invoice_number,
        invoice_date,
        description,
        updated_at: new Date()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: body.user_id,
        action: 'UPDATE',
        table_name: 'purchase_grns',
        record_id: params.id,
        old_values: { invoice_number, invoice_date, description },
        new_values: grn
      });

    return NextResponse.json({
      success: true,
      data: grn,
      message: 'GRN updated successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get GRN details
    const { data: grn } = await supabase
      .from('purchase_grns')
      .select('*')
      .eq('id', params.id)
      .single();

    // Get items
    const { data: items } = await supabase
      .from('purchase_grn_items')
      .select('*')
      .eq('purchase_grn_id', params.id);

    // Reverse inventory transactions and stock
    if (items) {
      for (const item of items) {
        // Create reverse inventory transaction
        await supabase
          .from('inventory_transactions')
          .insert({
            item_id: item.item_id,
            store_id: grn.store_id,
            transaction_type: 'grn_reversal',
            quantity: -item.received_qty,
            batch_no: item.batch_no,
            reference_id: params.id,
            reference_type: 'purchase_grn'
          });

        // Update stock
        await supabase
          .from('item_store_stock')
          .update({
            quantity_on_hand: supabase.raw('quantity_on_hand - ' + item.received_qty)
          })
          .eq('item_id', item.item_id)
          .eq('store_id', grn.store_id);
      }
    }

    // Soft delete GRN
    const { error: deleteError } = await supabase
      .from('purchase_grns')
      .update({
        is_active: false,
        updated_at: new Date()
      })
      .eq('id', params.id);

    if (deleteError) throw deleteError;

    // Log audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: request.headers.get('user-id'),
        action: 'DELETE',
        table_name: 'purchase_grns',
        record_id: params.id,
        old_values: grn
      });

    return NextResponse.json({
      success: true,
      message: 'GRN deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
APIEOF

# Create GRN Outstanding API
cat > "$PROJECT_ROOT/app/api/purchase-grns/[id]/outstanding/route.ts" << 'APIEOF'
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: grn } = await supabase
      .from('purchase_grns')
      .select('total_amount')
      .eq('id', params.id)
      .single();

    const { data: allocations } = await supabase
      .from('supplier_payment_allocations')
      .select('allocation_amount')
      .eq('purchase_grn_id', params.id);

    const paid_amount = allocations?.reduce((sum, a) => sum + (a.allocation_amount || 0), 0) || 0;
    const outstanding = (grn?.total_amount || 0) - paid_amount;

    return NextResponse.json({
      success: true,
      data: {
        grn_id: params.id,
        total_amount: grn?.total_amount,
        paid_amount,
        outstanding,
        percentage_paid: grn?.total_amount ? (paid_amount / grn.total_amount * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
APIEOF

# Create Supplier Outstanding GRNs API
cat > "$PROJECT_ROOT/app/api/suppliers/[id]/outstanding-grns/route.ts" << 'APIEOF'
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: grns } = await supabase
      .from('purchase_grns')
      .select(`
        id,
        grn_number,
        grn_date,
        total_amount,
        payment_status,
        stores(name)
      `)
      .eq('supplier_id', params.id)
      .eq('is_active', true)
      .in('payment_status', ['unpaid', 'partially_paid']);

    let totalAmount = 0;
    let totalPaid = 0;

    for (const grn of grns || []) {
      const { data: allocations } = await supabase
        .from('supplier_payment_allocations')
        .select('allocation_amount')
        .eq('purchase_grn_id', grn.id);

      const paid = allocations?.reduce((sum, a) => sum + (a.allocation_amount || 0), 0) || 0;
      grn.paid_amount = paid;
      grn.outstanding = grn.total_amount - paid;
      totalAmount += grn.total_amount;
      totalPaid += paid;
    }

    return NextResponse.json({
      success: true,
      data: {
        supplier_id: params.id,
        grns: grns || [],
        summary: {
          total_amount: totalAmount,
          total_paid: totalPaid,
          total_outstanding: totalAmount - totalPaid,
          grn_count: grns?.length || 0
        }
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
APIEOF

# ============================================================================
# 2. UI PAGES
# ============================================================================

# Create GRN List Page
cat > "$PROJECT_ROOT/app/purchase/grn/page.tsx" << 'UIEOF'
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface GRN {
  id: string;
  grn_number: string;
  grn_date: string;
  total_amount: number;
  payment_status: string;
  suppliers: { name: string };
  stores: { name: string };
}

export default function GRNListPage() {
  const router = useRouter();
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    supplier_id: '',
    store_id: '',
    status: '',
    date_from: '',
    date_to: ''
  });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  useEffect(() => {
    fetchSuppliers();
    fetchStores();
    fetchGRNs();
  }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('is_active', true);
    setSuppliers(data || []);
  };

  const fetchStores = async () => {
    const { data } = await supabase
      .from('stores')
      .select('id, name, code')
      .eq('is_active', true);
    setStores(data || []);
  };

  const fetchGRNs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.supplier_id && { supplier_id: filters.supplier_id }),
        ...(filters.store_id && { store_id: filters.store_id }),
        ...(filters.status && { status: filters.status }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to })
      });

      const res = await fetch(`/api/purchase-grns?${params}`);
      const result = await res.json();
      
      if (result.success) {
        setGrns(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Error fetching GRNs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this GRN?')) return;
    
    try {
      const res = await fetch(`/api/purchase-grns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchGRNs();
      }
    } catch (error) {
      console.error('Error deleting GRN:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  useEffect(() => {
    fetchGRNs();
  }, [filters, pagination.page]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Purchase GRNs</h1>
        <Link href="/purchase/grn/new" className="bg-blue-600 text-white px-4 py-2 rounded">
          + New GRN
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded mb-6 grid grid-cols-5 gap-4">
        <select 
          value={filters.supplier_id}
          onChange={(e) => handleFilterChange('supplier_id', e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Suppliers</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select 
          value={filters.store_id}
          onChange={(e) => handleFilterChange('store_id', e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Stores</option>
          {stores.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select 
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
        </select>

        <input 
          type="date"
          value={filters.date_from}
          onChange={(e) => handleFilterChange('date_from', e.target.value)}
          className="border p-2 rounded"
          placeholder="From Date"
        />

        <input 
          type="date"
          value={filters.date_to}
          onChange={(e) => handleFilterChange('date_to', e.target.value)}
          className="border p-2 rounded"
          placeholder="To Date"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">GRN #</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Supplier</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Store</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Amount</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-4 text-center">Loading...</td></tr>
            ) : grns.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">No GRNs found</td></tr>
            ) : (
              grns.map(grn => (
                <tr key={grn.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-blue-600">
                    <Link href={`/purchase/grn/${grn.id}`}>{grn.grn_number}</Link>
                  </td>
                  <td className="px-6 py-4">{new Date(grn.grn_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{grn.suppliers?.name}</td>
                  <td className="px-6 py-4">{grn.stores?.name}</td>
                  <td className="px-6 py-4 text-right">Rs. {grn.total_amount?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(grn.payment_status)}`}>
                      {grn.payment_status === 'partially_paid' ? 'Partial' : grn.payment_status === 'unpaid' ? 'Unpaid' : 'Paid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    <Link href={`/purchase/grn/${grn.id}`} className="text-blue-600 hover:underline text-sm">View</Link>
                    <button 
                      onClick={() => handleDelete(grn.id)}
                      className="text-red-600 hover:underline text-sm"
                    >Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >Previous</button>
          <span className="px-4 py-2">{pagination.page} / {pagination.pages}</span>
          <button 
            onClick={() => setPagination(p => ({ ...p, page: Math.min(pagination.pages, p.page + 1) }))}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >Next</button>
        </div>
      </div>
    </div>
  );
}
UIEOF

# Create GRN Create Page
cat > "$PROJECT_ROOT/app/purchase/grn/new/page.tsx" << 'UIEOF'
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface GRNItem {
  item_id: string;
  batch_no: string;
  batch_expiry: string;
  received_qty: number;
  cost_price: number;
  discount_percent: number;
}

export default function GRNCreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    supplier_id: '',
    store_id: '',
    po_reference_id: '',
    invoice_number: '',
    invoice_date: '',
    description: ''
  });

  const [lineItems, setLineItems] = useState<GRNItem[]>([
    { item_id: '', batch_no: '', batch_expiry: '', received_qty: 0, cost_price: 0, discount_percent: 0 }
  ]);

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    if (formData.supplier_id) fetchPurchaseOrders();
  }, [formData.supplier_id]);

  const fetchMasters = async () => {
    const [suppliersRes, storesRes, itemsRes] = await Promise.all([
      supabase.from('suppliers').select('id, name').eq('is_active', true),
      supabase.from('stores').select('id, name, code').eq('is_active', true),
      supabase.from('items').select('id, code, name, unit_of_measure').eq('is_active', true)
    ]);

    setSuppliers(suppliersRes.data || []);
    setStores(storesRes.data || []);
    setItems(itemsRes.data || []);
  };

  const fetchPurchaseOrders = async () => {
    const { data } = await supabase
      .from('purchase_orders')
      .select('id, po_number, purchase_order_items(item_id, quantity)')
      .eq('supplier_id', formData.supplier_id)
      .eq('status', 'pending')
      .eq('is_active', true);
    setPurchaseOrders(data || []);
  };

  const handleAddItem = () => {
    setLineItems([...lineItems, { item_id: '', batch_no: '', batch_expiry: '', received_qty: 0, cost_price: 0, discount_percent: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
  };

  const calculateNetValue = (item: GRNItem) => {
    const lineTotal = item.received_qty * item.cost_price;
    const discount = lineTotal * (item.discount_percent / 100);
    return lineTotal - discount;
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.received_qty * item.cost_price), 0);
    const totalDiscount = lineItems.reduce((sum, item) => {
      const lineTotal = item.received_qty * item.cost_price;
      return sum + (lineTotal * item.discount_percent / 100);
    }, 0);
    return {
      subtotal,
      totalDiscount,
      totalAmount: subtotal - totalDiscount
    };
  };

  const handleSubmit = async (e: React.FormEvent, draft = false) => {
    e.preventDefault();

    if (!formData.supplier_id || !formData.store_id || lineItems.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    if (lineItems.some(item => !item.item_id || item.received_qty === 0)) {
      alert('Please fill all item details');
      return;
    }

    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();

      const res = await fetch('/api/purchase-grns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: lineItems,
          user_id: session?.session?.user?.id
        })
      });

      const result = await res.json();

      if (result.success) {
        alert(result.message);
        router.push(`/purchase/grn/${result.data.id}`);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Error creating GRN: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New GRN</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded p-6 space-y-6">
        {/* Header Section */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Supplier *</label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              required
              className="w-full border p-2 rounded"
            >
              <option value="">Select Supplier</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Store *</label>
            <select
              value={formData.store_id}
              onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
              required
              className="w-full border p-2 rounded"
            >
              <option value="">Select Store</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">PO Reference</label>
            <select
              value={formData.po_reference_id}
              onChange={(e) => setFormData({ ...formData, po_reference_id: e.target.value })}
              className="w-full border p-2 rounded"
            >
              <option value="">No PO</option>
              {purchaseOrders.map(po => (
                <option key={po.id} value={po.id}>{po.po_number}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Invoice #</label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              className="w-full border p-2 rounded"
              placeholder="Supplier's invoice number"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Invoice Date</label>
            <input
              type="date"
              value={formData.invoice_date}
              onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border p-2 rounded"
              placeholder="Optional notes"
            />
          </div>
        </div>

        {/* Items Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Line Items</h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm"
            >
              + Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-left">Batch No</th>
                  <th className="px-4 py-2 text-left">Expiry</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Cost Price</th>
                  <th className="px-4 py-2 text-right">Discount %</th>
                  <th className="px-4 py-2 text-right">Net Value</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">
                      <select
                        value={item.item_id}
                        onChange={(e) => handleItemChange(idx, 'item_id', e.target.value)}
                        required
                        className="w-full border p-1 rounded text-xs"
                      >
                        <option value="">Select Item</option>
                        {items.map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.batch_no}
                        onChange={(e) => handleItemChange(idx, 'batch_no', e.target.value)}
                        className="w-full border p-1 rounded text-xs"
                        placeholder="Batch"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={item.batch_expiry}
                        onChange={(e) => handleItemChange(idx, 'batch_expiry', e.target.value)}
                        className="w-full border p-1 rounded text-xs"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.received_qty}
                        onChange={(e) => handleItemChange(idx, 'received_qty', parseFloat(e.target.value) || 0)}
                        className="w-full border p-1 rounded text-xs text-right"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.cost_price}
                        onChange={(e) => handleItemChange(idx, 'cost_price', parseFloat(e.target.value) || 0)}
                        className="w-full border p-1 rounded text-xs text-right"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.discount_percent}
                        onChange={(e) => handleItemChange(idx, 'discount_percent', parseFloat(e.target.value) || 0)}
                        className="w-full border p-1 rounded text-xs text-right"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">
                      Rs. {calculateNetValue(item).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-600 hover:underline text-xs"
                      >Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-gray-50 p-4 rounded flex justify-end">
          <div className="w-80">
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>Rs. {totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2 text-yellow-600">
              <span>Total Discount:</span>
              <span>- Rs. {totals.totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total Amount:</span>
              <span>Rs. {totals.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create GRN'}
          </button>
        </div>
      </form>
    </div>
  );
}
UIEOF

# Create GRN Detail Page
cat > "$PROJECT_ROOT/app/purchase/grn/\[id\]/page.tsx" << 'UIEOF'
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface GRNDetail {
  id: string;
  grn_number: string;
  grn_date: string;
  total_amount: number;
  payment_status: string;
  suppliers: any;
  stores: any;
  items: any[];
  allocations: any[];
  auditLogs: any[];
}

export default function GRNDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [grn, setGrn] = useState<GRNDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [outstanding, setOutstanding] = useState(0);

  useEffect(() => {
    fetchGRN();
  }, [params.id]);

  const fetchGRN = async () => {
    try {
      const res = await fetch(`/api/purchase-grns/${params.id}`);
      const result = await res.json();
      if (result.success) {
        setGrn(result.data);
        
        // Fetch outstanding
        const outRes = await fetch(`/api/purchase-grns/${params.id}/outstanding`);
        const outResult = await outRes.json();
        if (outResult.success) {
          setOutstanding(outResult.data.outstanding);
        }
      }
    } catch (error) {
      console.error('Error fetching GRN:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure?')) return;
    try {
      const res = await fetch(`/api/purchase-grns/${params.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/purchase/grn');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!grn) return <div className="p-6">GRN not found</div>;

  const paidAmount = (grn.allocations || []).reduce((sum, a) => sum + (a.allocation_amount || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{grn.grn_number}</h1>
          <p className="text-gray-600">Created: {new Date(grn.grn_date).toLocaleDateString()}</p>
        </div>
        <span className={`px-4 py-2 rounded font-semibold ${getStatusColor(grn.payment_status)}`}>
          {grn.payment_status === 'partially_paid' ? 'Partially Paid' : grn.payment_status === 'unpaid' ? 'Unpaid' : 'Paid'}
        </span>
      </div>

      {/* Header Card */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded">
          <h3 className="font-semibold mb-4">Supplier Details</h3>
          <p><strong>{grn.suppliers?.name}</strong></p>
          <p className="text-sm text-gray-600">{grn.suppliers?.contact_person}</p>
          <p className="text-sm text-gray-600">{grn.suppliers?.phone}</p>
          <p className="text-sm text-gray-600">{grn.suppliers?.email}</p>
        </div>

        <div className="bg-white p-6 rounded">
          <h3 className="font-semibold mb-4">Store</h3>
          <p><strong>{grn.stores?.name}</strong></p>
          <p className="text-sm text-gray-600">{grn.stores?.code}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded mb-6 overflow-hidden">
        <div className="bg-gray-100 p-4">
          <h3 className="font-semibold">Line Items</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Item</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Batch</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Expiry</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Qty</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Cost Price</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Discount</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Net Value</th>
            </tr>
          </thead>
          <tbody>
            {grn.items?.map((item, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-4 py-3">{item.items?.name}</td>
                <td className="px-4 py-3">{item.batch_no}</td>
                <td className="px-4 py-3">{item.batch_expiry ? new Date(item.batch_expiry).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3 text-right">{item.received_qty}</td>
                <td className="px-4 py-3 text-right">Rs. {item.cost_price?.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{item.discount_percent}% (Rs. {item.discount_value?.toFixed(2)})</td>
                <td className="px-4 py-3 text-right font-semibold">Rs. {item.net_value?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Section */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded">
          <h3 className="font-semibold mb-4">Payment Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-semibold">Rs. {grn.total_amount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid Amount:</span>
              <span className="font-semibold">Rs. {paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-red-600">
              <span>Outstanding:</span>
              <span className="font-semibold">Rs. {outstanding.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded">
          <h3 className="font-semibold mb-4">Allocations</h3>
          {grn.allocations && grn.allocations.length > 0 ? (
            <div className="space-y-2 text-sm">
              {grn.allocations.map((alloc, idx) => (
                <div key={idx} className="flex justify-between pb-2 border-b">
                  <span>{new Date(alloc.created_at).toLocaleDateString()}</span>
                  <span>Rs. {alloc.allocation_amount?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No allocations yet</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Link href="/purchase/grn" className="px-6 py-2 border rounded">Back</Link>
        {grn.payment_status !== 'paid' && (
          <Link href={`/purchase/grn/${params.id}/edit`} className="px-6 py-2 bg-blue-600 text-white rounded">Edit</Link>
        )}
        <button
          onClick={handleDelete}
          className="px-6 py-2 bg-red-600 text-white rounded"
        >Delete</button>
      </div>
    </div>
  );
}
UIEOF

# Create GRN Edit Page
cat > "$PROJECT_ROOT/app/purchase/grn/\[id\]/edit/page.tsx" << 'UIEOF'
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function GRNEditPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [grn, setGrn] = useState<any>(null);
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: '',
    description: ''
  });

  useEffect(() => {
    fetchGRN();
  }, [params.id]);

  const fetchGRN = async () => {
    try {
      const res = await fetch(`/api/purchase-grns/${params.id}`);
      const result = await res.json();
      if (result.success) {
        setGrn(result.data);
        setFormData({
          invoice_number: result.data.invoice_number || '',
          invoice_date: result.data.invoice_date || '',
          description: result.data.description || ''
        });
      }
    } catch (error) {
      console.error('Error fetching GRN:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`/api/purchase-grns/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert('GRN updated successfully');
        router.push(`/purchase/grn/${params.id}`);
      }
    } catch (error) {
      alert('Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit GRN: {grn?.grn_number}</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Invoice Number</label>
          <input
            type="text"
            value={formData.invoice_number}
            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Invoice Date</label>
          <input
            type="date"
            value={formData.invoice_date}
            onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full border p-2 rounded"
          />
        </div>

        <div className="flex gap-4 justify-end pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded"
          >Cancel</button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
UIEOF

echo "✅ GRN System - All files created successfully!"
echo ""
echo "📁 Created Files:"
echo "  APIs:"
echo "    - /app/api/purchase-grns/route.ts (List & Create)"
echo "    - /app/api/purchase-grns/[id]/route.ts (Get, Update, Delete)"
echo "    - /app/api/purchase-grns/[id]/outstanding/route.ts (Outstanding amount)"
echo "    - /app/api/suppliers/[id]/outstanding-grns/route.ts (Supplier's unpaid GRNs)"
echo ""
echo "  UI Pages:"
echo "    - /app/purchase/grn/page.tsx (List page)"
echo "    - /app/purchase/grn/new/page.tsx (Create page)"
echo "    - /app/purchase/grn/[id]/page.tsx (Detail page)"
echo "    - /app/purchase/grn/[id]/edit/page.tsx (Edit page)"
echo ""
echo "🚀 Next Steps:"
echo "  1. cd to project root"
echo "  2. npm run dev"
echo "  3. Visit http://localhost:3000/purchase/grn"
