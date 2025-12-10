import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse, createdResponse } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from('customer_payments')
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
    const { customer_id, payment_method, amount, reference_number, allocations } = body;

    if (!customer_id || !payment_method || !amount || !allocations) {
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
      .from('customer_payments')
      .insert({
        receipt_number: `RCPT-${Date.now()}`,
        customer_id,
        payment_method,
        reference_number,
        total_payment_amount: amount,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Create allocations and update invoice payment status
    for (const alloc of allocations) {
      // Create allocation record
      await supabase
        .from('customer_payment_allocations')
        .insert({
          customer_payment_id: paymentData.id,
          sales_retail_id: alloc.invoice_id,
          allocation_amount: alloc.allocation_amount,
        });

      // Get current invoice
      const { data: invoiceData } = await supabase
        .from('sales_retail')
        .select('*')
        .eq('id', alloc.invoice_id)
        .single();

      if (invoiceData) {
        // Calculate new paid amount
        const { data: allocations } = await supabase
          .from('customer_payment_allocations')
          .select('allocation_amount')
          .eq('sales_retail_id', alloc.invoice_id);

        const totalPaid = (allocations || []).reduce((sum, a) => sum + a.allocation_amount, 0);
        const outstanding = invoiceData.total_amount - totalPaid;

        // Auto-update payment status
        let paymentStatus = 'unpaid';
        if (totalPaid > 0 && totalPaid < invoiceData.total_amount) {
          paymentStatus = 'partially_paid';
        } else if (totalPaid >= invoiceData.total_amount) {
          paymentStatus = 'paid';
        }

        await supabase
          .from('sales_retail')
          .update({ payment_status: paymentStatus })
          .eq('id', alloc.invoice_id);
      }
    }

    return Response.json(
      createdResponse({ id: paymentData.id, receipt_number: paymentData.receipt_number }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating payment:', error);
    return Response.json(errorResponse('Failed to create payment'), { status: 500 });
  }
}
