import { supabase } from './supabase';

export interface AuditLogEntry {
  user_id?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'REVERSAL' | 'LOGIN' | 'LOGOUT' | 'APPROVE' | 'REJECT';
  table_name: string;
  record_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  reason?: string;
}

export async function logAudit(entry: AuditLogEntry) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: entry.user_id,
        action: entry.action,
        table_name: entry.table_name,
        record_id: entry.record_id,
        old_values: entry.old_values || null,
        new_values: entry.new_values || null,
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent || null,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Audit log error:', error);
    }
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
}

export async function getAuditLogs(filters?: {
  table_name?: string;
  user_id?: string;
  action?: string;
  days?: number;
}) {
  try {
    let query = supabase.from('audit_logs').select('*');

    if (filters?.table_name) {
      query = query.eq('table_name', filters.table_name);
    }

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }

    if (filters?.days) {
      const date = new Date();
      date.setDate(date.getDate() - filters.days);
      query = query.gte('created_at', date.toISOString());
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return data;
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return [];
  }
}
