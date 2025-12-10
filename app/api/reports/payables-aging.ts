import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const { data: grns, error } = await supabase
      .from('purchase_grns')
      .select('*')
      .neq('payment_status', 'paid');

    if (error) throw error;

    const today = new Date();
    const items: Record<string, any> = {};

    (grns || []).forEach((grn) => {
      // @ts-ignore
      const supplier = grn.supplier_name || 'Unknown';
      if (!items[supplier]) {
        items[supplier] = {
          supplier_name: supplier,
          total_outstanding: 0,
          days_0_30: 0,
          days_30_60: 0,
          days_60_plus: 0,
        };
      }

      const grnDate = new Date(grn.grn_date);
      const daysPassed = Math.floor((today.getTime() - grnDate.getTime()) / (1000 * 60 * 60 * 24));
      const amount = grn.total_amount;

      items[supplier].total_outstanding += amount;

      if (daysPassed <= 30) {
        items[supplier].days_0_30 += amount;
      } else if (daysPassed <= 60) {
        items[supplier].days_30_60 += amount;
      } else {
        items[supplier].days_60_plus += amount;
      }
    });

    const itemArray = Object.values(items);
    const totalOutstanding = itemArray.reduce((sum, i) => sum + i.total_outstanding, 0);
    const total_0_30 = itemArray.reduce((sum, i) => sum + i.days_0_30, 0);
    const total_30_60 = itemArray.reduce((sum, i) => sum + i.days_30_60, 0);
    const total_60_plus = itemArray.reduce((sum, i) => sum + i.days_60_plus, 0);

    return Response.json(
      successResponse({
        totalOutstanding,
        total_0_30,
        total_30_60,
        total_60_plus,
        items: itemArray,
      })
    );
  } catch (error) {
    console.error('Error generating payables report:', error);
    return Response.json(errorResponse('Failed to generate report'), { status: 500 });
  }
}
