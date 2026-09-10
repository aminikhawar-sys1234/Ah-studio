import { useEffect, useState } from 'react';
import { Save, Settings as SettingsIcon, Palette, HardDrive, Shield, Bell, Globe, Database } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type SettingSection = 'general' | 'branding' | 'storage' | 'security' | 'notifications' | 'rendering' | 'developer';

const sections: { id: SettingSection; label: string; icon: typeof SettingsIcon }[] = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'rendering', label: 'Rendering', icon: Database },
  { id: 'developer', label: 'Developer', icon: Globe },
];

export function SettingsPage() {
  const toast = useToast();
  const [active, setActive] = useState<SettingSection>('general');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('settings').select('key, value');
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        const val = (row as { key: string; value: unknown }).value;
        map[(row as { key: string }).key] = typeof val === 'string' ? val : JSON.stringify(val);
      }
      setValues(map);
    }
    load();
  }, []);

  const update = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    for (const [key, value] of Object.entries(values)) {
      await supabase.from('settings').upsert({
        key,
        value: { value },
        scope: 'user',
      }, { onConflict: 'key' });
    }
    setSaving(false);
    toast.success('Settings saved');
  };

  return (
    <div>
      <PageHeader title="Settings" description="Configure your platform"
        actions={<button className="btn-primary" onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}</button>} />

      <div className="flex gap-6">
        <div className="w-56 flex-shrink-0">
          <div className="card p-2">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <button key={s.id} onClick={() => setActive(s.id)}
                  className={cn('flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    active === s.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-secondary-600 hover:bg-secondary-50')}>
                  <Icon className="h-4 w-4" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1">
          <div className="card p-6">
            {active === 'general' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-secondary-900 mb-4">General Settings</h3>
                <SettingField label="App Name" value={values.app_name ?? 'AH Studio'} onChange={(v) => update('app_name', v)} />
                <SettingField label="Support Email" value={values.support_email ?? ''} onChange={(v) => update('support_email', v)} />
                <SettingField label="Website URL" value={values.website_url ?? ''} onChange={(v) => update('website_url', v)} />
                <SettingField label="Default Language" value={values.default_language ?? 'en'} onChange={(v) => update('default_language', v)} />
              </div>
            )}
            {active === 'branding' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-secondary-900 mb-4">Branding</h3>
                <SettingField label="Primary Color" value={values.primary_color ?? '#0d9488'} onChange={(v) => update('primary_color', v)} />
                <SettingField label="Accent Color" value={values.accent_color ?? '#f59e0b'} onChange={(v) => update('accent_color', v)} />
                <SettingField label="Logo URL" value={values.logo_url ?? ''} onChange={(v) => update('logo_url', v)} />
                <SettingField label="Favicon URL" value={values.favicon_url ?? ''} onChange={(v) => update('favicon_url', v)} />
              </div>
            )}
            {active === 'storage' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-secondary-900 mb-4">Storage Configuration</h3>
                <SettingField label="Storage Provider" value={values.storage_provider ?? 'local'} onChange={(v) => update('storage_provider', v)} />
                <SettingField label="Max Upload Size (MB)" value={values.max_upload_mb ?? '500'} onChange={(v) => update('max_upload_mb', v)} />
                <SettingField label="CDN URL" value={values.cdn_url ?? ''} onChange={(v) => update('cdn_url', v)} />
              </div>
            )}
            {active === 'security' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-secondary-900 mb-4">Security</h3>
                <SettingField label="Session Timeout (minutes)" value={values.session_timeout ?? '60'} onChange={(v) => update('session_timeout', v)} />
                <SettingField label="Max Login Attempts" value={values.max_login_attempts ?? '5'} onChange={(v) => update('max_login_attempts', v)} />
                <SettingField label="API Rate Limit (req/min)" value={values.api_rate_limit ?? '100'} onChange={(v) => update('api_rate_limit', v)} />
              </div>
            )}
            {active === 'notifications' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-secondary-900 mb-4">Notifications</h3>
                <SettingToggle label="Render completion notifications" value={values.notify_render === 'true'} onChange={(v) => update('notify_render', v ? 'true' : 'false')} />
                <SettingToggle label="Export completion notifications" value={values.notify_export === 'true'} onChange={(v) => update('notify_export', v ? 'true' : 'false')} />
                <SettingToggle label="Plugin update notifications" value={values.notify_plugin === 'true'} onChange={(v) => update('notify_plugin', v ? 'true' : 'false')} />
                <SettingToggle label="System messages" value={values.notify_system === 'true'} onChange={(v) => update('notify_system', v ? 'true' : 'false')} />
              </div>
            )}
            {active === 'rendering' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-secondary-900 mb-4">Rendering Defaults</h3>
                <SettingField label="Default Resolution" value={values.default_resolution ?? '1920x1080'} onChange={(v) => update('default_resolution', v)} />
                <SettingField label="Default FPS" value={values.default_fps ?? '30'} onChange={(v) => update('default_fps', v)} />
                <SettingField label="Default Codec" value={values.default_codec ?? 'h264'} onChange={(v) => update('default_codec', v)} />
                <SettingField label="Default Format" value={values.default_format ?? 'mp4'} onChange={(v) => update('default_format', v)} />
              </div>
            )}
            {active === 'developer' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-secondary-900 mb-4">Developer Settings</h3>
                <SettingToggle label="Developer mode" value={values.dev_mode === 'true'} onChange={(v) => update('dev_mode', v ? 'true' : 'false')} />
                <SettingToggle label="Debug logging" value={values.debug_logging === 'true'} onChange={(v) => update('debug_logging', v ? 'true' : 'false')} />
                <SettingField label="API Version" value={values.api_version ?? 'v1'} onChange={(v) => update('api_version', v)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-secondary-700 mb-1.5">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SettingToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-secondary-700">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={cn('relative h-6 w-11 rounded-full transition-colors', value ? 'bg-primary-600' : 'bg-secondary-300')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform', value ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}
