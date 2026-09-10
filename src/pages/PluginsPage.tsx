import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Puzzle, Power, PowerOff, Settings as SettingsIcon, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { pluginSDK } from '@/core/pluginSDK';
import { eventBus } from '@/core/eventBus';
import { PageHeader } from '@/components/layout/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { PluginManifest } from '@/core/types';

interface Plugin {
  id: string;
  slug: string;
  name: string;
  version: string;
  manifest: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
}

// Built-in plugins available for installation
const availablePlugins: PluginManifest[] = [
  {
    name: 'Background Removal',
    slug: 'bg-removal',
    version: '1.0.0',
    author: 'AH Studio',
    description: 'AI-powered background removal for images and video frames.',
    minimum_core_version: '1.0.0',
    permissions: ['READ_ASSETS', 'WRITE_ASSETS', 'AI_ACCESS'],
    dependencies: [],
    entry_point: 'bg-removal/index.js',
    configuration: {},
    api_hooks: ['onAssetImport', 'afterProjectLoad'],
  },
  {
    name: 'Auto Captions',
    slug: 'auto-captions',
    version: '1.2.0',
    author: 'AH Studio',
    description: 'Automatically generate captions from audio using speech-to-text.',
    minimum_core_version: '1.0.0',
    permissions: ['READ_PROJECT', 'AI_ACCESS', 'EDITOR_ACCESS'],
    dependencies: [],
    entry_point: 'auto-captions/index.js',
    configuration: {},
    api_hooks: ['afterProjectLoad', 'onTimelineChange'],
  },
  {
    name: 'Color Grading Pro',
    slug: 'color-grading-pro',
    version: '2.0.1',
    author: 'AH Studio',
    description: 'Professional color grading with LUT support and waveform monitors.',
    minimum_core_version: '1.0.0',
    permissions: ['READ_PROJECT', 'WRITE_PROJECT', 'EDITOR_ACCESS'],
    dependencies: [],
    entry_point: 'color-grading/index.js',
    configuration: {},
    api_hooks: ['afterProjectLoad', 'onTimelineChange'],
  },
  {
    name: 'Motion Tracker',
    slug: 'motion-tracker',
    version: '1.0.0',
    author: 'AH Studio',
    description: 'Track objects in video and apply motion-based effects.',
    minimum_core_version: '1.0.0',
    permissions: ['READ_PROJECT', 'WRITE_PROJECT', 'EDITOR_ACCESS'],
    dependencies: [],
    entry_point: 'motion-tracker/index.js',
    configuration: {},
    api_hooks: ['afterProjectLoad', 'onTimelineChange'],
  },
  {
    name: 'Export to GIF',
    slug: 'export-gif',
    version: '1.0.0',
    author: 'AH Studio',
    description: 'Export video clips as animated GIFs with quality controls.',
    minimum_core_version: '1.0.0',
    permissions: ['READ_PROJECT', 'EXPORT_ACCESS'],
    dependencies: [],
    entry_point: 'export-gif/index.js',
    configuration: {},
    api_hooks: ['beforeExport', 'afterExport'],
  },
  {
    name: 'Audio Enhancer',
    slug: 'audio-enhancer',
    version: '1.1.0',
    author: 'AH Studio',
    description: 'Noise reduction, voice enhancement, and audio normalization.',
    minimum_core_version: '1.0.0',
    permissions: ['READ_PROJECT', 'WRITE_PROJECT', 'EDITOR_ACCESS'],
    dependencies: [],
    entry_point: 'audio-enhancer/index.js',
    configuration: {},
    api_hooks: ['afterProjectLoad', 'onTimelineChange'],
  },
];

export function PluginsPage() {
  const toast = useToast();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [installOpen, setInstallOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState<Plugin | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plugin | null>(null);
  const [activeSlugs, setActiveSlugs] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('plugins').select('*', { count: 'exact' });
    if (search) query = query.ilike('name', `%${search}%`);
    query = query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await query;
    if (error) toast.error('Failed to load plugins', error.message);
    else {
      setPlugins((data ?? []) as Plugin[]);
      setTotal(count ?? 0);
      // Sync SDK active state from DB
      const activeSet = new Set<string>();
      for (const p of (data ?? []) as Plugin[]) {
        if (p.status === 'active') {
          pluginSDK.install(p.manifest as unknown as PluginManifest);
          pluginSDK.activate(p.slug);
          activeSet.add(p.slug);
        } else {
          pluginSDK.deactivate(p.slug);
        }
      }
      setActiveSlugs(activeSet);
    }
    setLoading(false);
  }, [search, page, toast]);

  useEffect(() => {
    const unsub1 = eventBus.on('onPluginActivate', ({ slug }) => toast.success('Plugin activated', slug));
    const unsub2 = eventBus.on('onPluginDeactivate', ({ slug }) => toast.info('Plugin deactivated', slug));
    return () => { unsub1(); unsub2(); };
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const installPlugin = async (manifest: PluginManifest) => {
    pluginSDK.install(manifest);
    const { error } = await supabase.from('plugins').insert({
      slug: manifest.slug,
      name: manifest.name,
      version: manifest.version,
      manifest: manifest as unknown as Record<string, unknown>,
      status: 'inactive',
    });
    if (error) {
      toast.error('Failed to install plugin', error.message);
    } else {
      toast.success('Plugin installed', manifest.name);
      setInstallOpen(false);
      load();
    }
  };

  const togglePlugin = async (p: Plugin) => {
    const newStatus = p.status === 'active' ? 'inactive' : 'active';
    if (newStatus === 'active') {
      pluginSDK.activate(p.slug);
    } else {
      pluginSDK.deactivate(p.slug);
    }
    const { error } = await supabase.from('plugins').update({ status: newStatus }).eq('id', p.id);
    if (error) {
      // Rollback SDK state
      if (newStatus === 'active') pluginSDK.deactivate(p.slug);
      else pluginSDK.activate(p.slug);
      toast.error('Failed to update plugin status', error.message);
    } else {
      toast.success(newStatus === 'active' ? 'Plugin activated' : 'Plugin deactivated');
      load();
    }
  };

  const removePlugin = async (p: Plugin) => {
    pluginSDK.uninstall(p.slug);
    const { error } = await supabase.from('plugins').delete().eq('id', p.id);
    if (error) toast.error('Failed to delete plugin', error.message);
    else toast.success('Plugin removed');
    load();
  };

  const installedSlugs = new Set(plugins.map((p) => p.slug));
  const notInstalled = availablePlugins.filter((p) => !installedSlugs.has(p.slug));

  const columns: Column<Plugin>[] = [
    {
      key: 'name', label: 'Plugin',
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
            <Puzzle className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-secondary-900">{p.name}</p>
            <p className="text-xs text-secondary-400">{p.slug}</p>
          </div>
        </div>
      ),
    },
    { key: 'version', label: 'Version', render: (p) => <span className="font-mono text-xs">v{p.version}</span> },
    { key: 'status', label: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'description', label: 'Description',
      render: (p) => <span className="text-sm text-secondary-500 line-clamp-1">{String((p.manifest as Record<string, unknown>).description ?? '')}</span>,
    },
    { key: 'created_at', label: 'Installed', render: (p) => formatDate(p.created_at) },
    {
      key: 'actions', label: '',
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); togglePlugin(p); }}
            className={`btn-ghost p-1.5 ${p.status === 'active' ? 'text-success-600' : 'text-secondary-400'}`}
            title={p.status === 'active' ? 'Deactivate' : 'Activate'}>
            {p.status === 'active' ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setConfigOpen(p); }} className="btn-ghost p-1.5" title="Configure">
            <SettingsIcon className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }} className="btn-ghost p-1.5 text-error-600" title="Remove">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Plugins" description="Manage installed plugins and extensions"
        actions={<button className="btn-primary" onClick={() => setInstallOpen(true)}><Plus className="h-4 w-4" /> Install Plugin</button>} />

      <Toolbar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search plugins..." />

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={plugins} loading={loading} page={page} pageSize={pageSize} total={total}
          onPageChange={setPage} emptyMessage="No plugins installed. Click Install Plugin to browse." />
      </div>

      {/* Install Modal */}
      <Modal open={installOpen} onClose={() => setInstallOpen(false)} title="Plugin Marketplace" size="lg"
        footer={<button className="btn-secondary" onClick={() => setInstallOpen(false)}>Close</button>}>
        {notInstalled.length === 0 ? (
          <p className="text-sm text-secondary-400 text-center py-8">All available plugins are already installed.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notInstalled.map((p) => (
              <div key={p.slug} className="border border-secondary-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                      <Puzzle className="h-4 w-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-secondary-900 text-sm">{p.name}</p>
                      <p className="text-xs text-secondary-400">v{p.version} by {p.author}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-secondary-500 mb-3">{p.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.permissions.map((perm) => (
                    <span key={perm} className="badge-secondary text-xs">{perm}</span>
                  ))}
                </div>
                <button className="btn-primary w-full" onClick={() => installPlugin(p)}>
                  <Check className="h-4 w-4" /> Install
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Config Modal */}
      <Modal open={!!configOpen} onClose={() => setConfigOpen(null)} title={`Configure: ${configOpen?.name ?? ''}`}
        footer={<button className="btn-primary" onClick={() => { toast.success('Configuration saved'); setConfigOpen(null); }}>Save</button>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Plugin Status</label>
            <div className="flex items-center gap-2">
              <StatusBadge status={configOpen?.status ?? 'inactive'} />
              <button className="btn-secondary text-xs" onClick={() => configOpen && togglePlugin(configOpen)}>
                {configOpen?.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Version</label>
            <p className="text-sm text-secondary-600 font-mono">v{configOpen?.version}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Permissions</label>
            <div className="flex flex-wrap gap-1">
              {configOpen && ((configOpen.manifest as Record<string, unknown>).permissions as string[] ?? []).map((perm) => (
                <span key={perm} className="badge-primary">{perm}</span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">API Hooks</label>
            <div className="flex flex-wrap gap-1">
              {configOpen && ((configOpen.manifest as Record<string, unknown>).api_hooks as string[] ?? []).map((hook) => (
                <span key={hook} className="badge-secondary font-mono text-xs">{hook}</span>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && removePlugin(deleteTarget)}
        title="Remove Plugin" message={`Remove "${deleteTarget?.name}"? This will deactivate and delete the plugin.`} confirmLabel="Remove" danger />
    </div>
  );
}
