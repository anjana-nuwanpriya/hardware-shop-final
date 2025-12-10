import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse, createdResponse } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('setting_key', { ascending: true });

    if (error) throw error;

    // Convert to key-value format
    const settings: Record<string, any> = {};
    data?.forEach((setting) => {
      settings[setting.setting_key] = setting.setting_value;
    });

    return Response.json(successResponse(settings));
  } catch (error) {
    console.error('Error fetching settings:', error);
    return Response.json(errorResponse('Failed to fetch settings'), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { setting_key, setting_value, setting_type, description } = body;

    if (!setting_key || !setting_value || !setting_type) {
      return Response.json(errorResponse('Missing required fields'), { status: 422 });
    }

    // Check if exists
    const { data: existing } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', setting_key)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('system_settings')
        .update({
          setting_value,
          setting_type,
          description,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', setting_key)
        .select()
        .single();
    } else {
      result = await supabase
        .from('system_settings')
        .insert({
          setting_key,
          setting_value,
          setting_type,
          description,
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return Response.json(createdResponse(result.data), { status: 201 });
  } catch (error) {
    console.error('Error saving setting:', error);
    return Response.json(errorResponse('Failed to save setting'), { status: 500 });
  }
}
