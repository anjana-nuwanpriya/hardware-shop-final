import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table_name');
    const userId = searchParams.get('user_id');
    const action = searchParams.get('action');
    const days = searchParams.get('days');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabase.from('audit_logs').select('*');

    if (tableName) {
      query = query.eq('table_name', tableName);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (days) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(days));
      query = query.gte('created_at', date.toISOString());
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return Response.json(successResponse(data || []));
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return Response.json(errorResponse('Failed to fetch audit logs'), { status: 500 });
  }
}
