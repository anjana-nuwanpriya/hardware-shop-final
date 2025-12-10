import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse, createdResponse } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from('supplier_payments')
      .select('*')
      .order('payment_date', { ascending: false });

    if (error) throw error;

    return Response.json(successResponse(data || []));
  } catch (error) {
    console.error('Error fetching payments:', error);
    return Response.json(errorResponse('Failed to fetch payments'), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supplier_id, payment_method, amount, reference_number, allocations } = body;

    if (!supplier_id || !payment_method || !amount || !allocations) {
      return Response.json(errorResponse('Missing required fields'), { status: 422 });
    }

    // Calculate total allocation
    const totalAllocated = allocations.reduce((sum: number, a: any) => sum + a.allocation_amount, 0);
    if (totalAllocated !== amount) {
      return Response.json(
        errorResponse('Allocation amounts must equal payment amount'),
        { status: 422 }
      );
    }

    // Create payment record
    const { data: paymentData, error: paymentError } = await supabase
      .from('supplier_payments')
      .insert({
        payment_number: `SPAY-${Date.now()}`,
        supplier_id,
        payment_method,
        reference_number,
        total_payment_amount: amount,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Create allocations and update GRN payment status
    for (const alloc of allocations) {
      // Create allocation record
      await supabase
        .from('supplier_payment_allocations')
        .insert({
          supplier_payment_id: paymentData.id,
          purchase_grn_id: alloc.grn_id,
          allocation_amount: alloc.allocation_amount,
        });

      // Get current GRN
      const { data: grnData } = await supabase
        .from('purchase_grns')
        .select('*')
        .eq('id', alloc.grn_id)
        .single();

      if (grnData) {
        // Calculate new paid amount
        const { data: allocations } = await supabase
          .from('supplier_payment_allocations')
          .select('allocation_amount')
          .eq('purchase_grn_id', alloc.grn_id);

        const totalPaid = (allocations || []).reduce((sum, a) => sum + a.allocation_amount, 0);
        const outstanding = grnData.total_amount - totalPaid;

        // Auto-update payment status
        let paymentStatus = 'unpaid';
        if (totalPaid > 0 && totalPaid < grnData.total_amount) {
          paymentStatus = 'partially_paid';
        } else if (totalPaid >= grnData.total_amount) {
          paymentStatus = 'paid';
        }

        await supabase
          .from('purchase_grns')
          .update({ payment_status: paymentStatus })
          .eq('id', alloc.grn_id);
      }
    }

    return Response.json(
      createdResponse({ id: paymentData.id, payment_number: paymentData.payment_number }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating payment:', error);
    return Response.json(errorResponse('Failed to create payment'), { status: 500 });
  }
}
