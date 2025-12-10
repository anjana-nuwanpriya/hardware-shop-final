import { supabase } from './supabase';

export interface SystemSetting {
  id?: string;
  setting_key: string;
  setting_value: string;
  setting_type: 'string' | 'boolean' | 'integer' | 'decimal';
  description?: string;
}

// Cache settings in memory
let settingsCache: Record<string, SystemSetting> = {};
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getSetting(key: string, defaultValue?: any) {
  try {
    // Check cache
    if (cacheTime > Date.now() && settingsCache[key]) {
      return parseSettingValue(settingsCache[key]);
    }

    // Fetch from DB
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', key)
      .single();

    if (error || !data) {
      return defaultValue;
    }

    settingsCache[key] = data;
    return parseSettingValue(data);
  } catch (err) {
    console.error('Error fetching setting:', err);
    return defaultValue;
  }
}

export async function getAllSettings() {
  try {
    // Check cache
    if (cacheTime > Date.now() && Object.keys(settingsCache).length > 0) {
      return settingsCache;
    }

    const { data, error } = await supabase
      .from('system_settings')
      .select('*');

    if (error) throw error;

    settingsCache = {};
    data?.forEach((setting) => {
      settingsCache[setting.setting_key] = setting;
    });

    cacheTime = Date.now() + CACHE_DURATION;
    return settingsCache;
  } catch (err) {
    console.error('Error fetching settings:', err);
    return settingsCache;
  }
}

export async function saveSetting(key: string, value: any, type: string, description?: string) {
  try {
    const { data: existing } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', key)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('system_settings')
        .update({
          setting_value: String(value),
          setting_type: type,
          description,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', key)
        .select()
        .single();
    } else {
      result = await supabase
        .from('system_settings')
        .insert({
          setting_key: key,
          setting_value: String(value),
          setting_type: type,
          description,
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    // Clear cache
    cacheTime = 0;

    return result.data;
  } catch (err) {
    console.error('Error saving setting:', err);
    throw err;
  }
}

function parseSettingValue(setting: SystemSetting) {
  switch (setting.setting_type) {
    case 'boolean':
      return setting.setting_value === 'true';
    case 'integer':
      return parseInt(setting.setting_value);
    case 'decimal':
      return parseFloat(setting.setting_value);
    default:
      return setting.setting_value;
  }
}
