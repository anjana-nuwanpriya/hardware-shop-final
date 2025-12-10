'use client';

import { useState, useEffect } from 'react';

interface Setting {
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/system-settings');
      const data = await res.json();

      // Convert to array
      const settingsArray = Object.entries(data.data).map(([key, value]: [string, any]) => ({
        setting_key: key,
        setting_value: String(value),
        setting_type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'integer' : 'string',
      }));

      setSettings(settingsArray);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string, value: string, type: string) => {
    try {
      const res = await fetch('/api/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: key,
          setting_value: value,
          setting_type: type,
        }),
      });

      if (res.ok) {
        setEditing(null);
        fetchSettings();
      }
    } catch (err) {
      console.error('Error saving setting:', err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading settings...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">⚙️ System Settings</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Setting Key</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Value</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {settings.map((setting) => (
              <tr key={setting.setting_key} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm">{setting.setting_key}</td>
                <td className="px-6 py-4">
                  {editing === setting.setting_key ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border px-2 py-1 rounded w-full"
                    />
                  ) : (
                    setting.setting_value
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{setting.setting_type}</td>
                <td className="px-6 py-4 text-sm space-x-2">
                  {editing === setting.setting_key ? (
                    <>
                      <button
                        onClick={() => handleSave(setting.setting_key, editValue, setting.setting_type)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditing(setting.setting_key);
                        setEditValue(setting.setting_value);
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
