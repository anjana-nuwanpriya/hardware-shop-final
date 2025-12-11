import { supabase } from './supabase';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'REVERSAL' | 'LOGIN' | 'LOGOUT' | 'APPROVE' | 'REJECT' | 'CONVERSION';

export interface AuditLogEntry {
  user_id?: string;
  action: AuditAction;
  table_name: string;
  record_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export async function logAudit(
  entry: AuditLogEntry,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const { error } = await supabase.from('audit_logs').insert([
      {
        user_id: entry.user_id,
        action: entry.action,
        table_name: entry.table_name,
        record_id: entry.record_id,
        old_values: entry.old_values || null,
        new_values: entry.new_values || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error('Audit log error:', error);
    }
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

export async function getAuditLogs(filters?: {
  user_id?: string;
  table_name?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters?.table_name) {
      query = query.eq('table_name', filters.table_name);
    }

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    const limit = filters?.limit || 100;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
}