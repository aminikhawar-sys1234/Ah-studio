import { useEffect, useState } from 'react';
import { Database, Activity, Cpu, HardDrive, Zap, Terminal, Bug, Gauge } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { featureRegistry } from '@/core/featureRegistry';
import { commandEngine } from '@/core/commandEngine';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn, formatDateTime } from '@/lib/utils';

export function DeveloperPage() {
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const tables = ['projects', 'project_versions', 'templates', 'assets', 'plugins', 'render_jobs', 'notifications', 'settings', 'categories', 'audit_logs'];
      const counts: Record<string, number> = {};
      for (const t of tables) {
        const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
        counts[t] = count ?? 0;
      }
      setTableCounts(counts);
      setLoading(false);
    }
    load();
  }, []);

  const features = featureRegistry.getAll();
  const history = commandEngine.getHistory();

  const stats = [
    { label: 'Registered Features', value: features.length, icon: Zap, color: 'bg-primary-50 text-primary-600' },
    { label: 'Active Features', value: features.filter((f) => f.status === 'active').length, icon: Activity, color: 'bg-success-50 text-success-600' },
    { label: 'Command History', value: history.length, icon: Terminal, color: 'bg-accent-50 text-accent-600' },
    { label: 'Database Tables', value: Object.keys(tableCounts).length, icon: Database, color: 'bg-secondary-100 text-secondary-600' },
  ];

  return (
    <div>
      <PageHeader title="Developer Tools" description="System diagnostics and developer console" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', s.color)}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-secondary-900">{loading && s.label.includes('Database') ? '—' : s.value}</p>
              <p className="text-sm text-secondary-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Registry */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-secondary-400" />
            <h3 className="text-sm font-semibold text-secondary-900">Feature Registry</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {features.length === 0 ? (
              <p className="text-sm text-secondary-400 py-4 text-center">No features registered. Install and activate plugins to populate the registry.</p>
            ) : (
              features.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary-50">
                  <div>
                    <p className="text-sm font-medium text-secondary-900">{f.name}</p>
                    <p className="text-xs text-secondary-400">{f.id} · v{f.version}</p>
                  </div>
                  <span className={cn('badge text-xs', f.status === 'active' ? 'badge-success' : 'badge-secondary')}>
                    {f.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Database Diagnostics */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-4 w-4 text-secondary-400" />
            <h3 className="text-sm font-semibold text-secondary-900">Database Diagnostics</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(tableCounts).map(([table, count]) => (
              <div key={table} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary-50">
                <span className="text-sm text-secondary-700 font-mono">{table}</span>
                <span className="text-sm font-medium text-secondary-900">{count}</span>
              </div>
            ))}
            {loading && <div className="h-4 bg-secondary-100 rounded animate-pulse" />}
          </div>
        </div>

        {/* Command History */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="h-4 w-4 text-secondary-400" />
            <h3 className="text-sm font-semibold text-secondary-900">Command History</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-secondary-400 py-4 text-center">No commands executed yet.</p>
            ) : (
              history.slice().reverse().map((cmd) => (
                <div key={cmd.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-secondary-50">
                  <div>
                    <p className="text-sm font-medium text-secondary-900">{cmd.type}</p>
                    <p className="text-xs text-secondary-400">{cmd.description}</p>
                  </div>
                  <span className="font-mono text-xs text-secondary-400">{cmd.id.slice(0, 8)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Info */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="h-4 w-4 text-secondary-400" />
            <h3 className="text-sm font-semibold text-secondary-900">System Information</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-secondary-500">Core Version</span><span className="font-mono text-secondary-900">1.0.0</span></div>
            <div className="flex justify-between"><span className="text-secondary-500">API Version</span><span className="font-mono text-secondary-900">v1</span></div>
            <div className="flex justify-between"><span className="text-secondary-500">Runtime</span><span className="font-mono text-secondary-900">browser</span></div>
            <div className="flex justify-between"><span className="text-secondary-500">Database</span><span className="font-mono text-secondary-900">supabase</span></div>
            <div className="flex justify-between"><span className="text-secondary-500">Storage</span><span className="font-mono text-secondary-900">supabase</span></div>
            <div className="flex justify-between"><span className="text-secondary-500">Auth</span><span className="font-mono text-secondary-900">supabase</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
