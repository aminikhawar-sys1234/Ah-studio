import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Key, Copy, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatDateTime } from '@/lib/utils';

interface ApiKey {
  id: string;
  key_name: string;
  key_prefix: string;
  permissions: string[];
  last_used: string | null;
  created_at: string;
  expires_at: string | null;
}

function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = 'ahs_';
  for (let i = 0; i < 40; i++) key += chars[Math.floor(Math.random() * chars.length)];
  return key;
}

export function ApiKeysPage() {
  const toast = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('settings').select('*', { count: 'exact' }).eq('key', 'like', 'api_key_%');
    query = query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await query;
    if (error) toast.error('Failed to load API keys', error.message);
    else {
      const mapped: ApiKey[] = (data ?? []).map((row: Record<string, unknown>) => {
        const val = row.value as Record<string, unknown>;
        return {
          id: row.id as string,
          key_name: val.key_name as string,
          key_prefix: val.key_prefix as string,
          permissions: val.permissions as string[] ?? [],
          last_used: (val.last_used as string) ?? null,
          created_at: row.created_at as string,
          expires_at: (val.expires_at as string) ?? null,
        };
      });
      setKeys(mapped);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [search, page, toast]);

  useEffect(() => { load(); }, [load]);

  const createKey = async () => {
    if (!keyName.trim()) return;
    setSaving(true);
    const fullKey = generateApiKey();
    const prefix = fullKey.slice(0, 12) + '...';
    const { error } = await supabase.from('settings').insert({
      key: `api_key_${Date.now()}`,
      value: { key_name: keyName, key_prefix: prefix, full_key: fullKey, permissions, last_used: null, created_at: new Date().toISOString() },
      scope: 'user',
    });
    if (error) toast.error('Failed to create API key', error.message);
    else {
      toast.success('API key created');
      setNewKeyValue(fullKey);
      setKeyName('');
      setPermissions([]);
      load();
    }
    setSaving(false);
  };

  const remove = async (k: ApiKey) => {
    const { error } = await supabase.from('settings').delete().eq('id', k.id);
    if (error) toast.error('Failed to delete', error.message);
    else toast.success('API key deleted');
    load();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Copied to clipboard');
  };

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allPerms = ['READ_PROJECT', 'WRITE_PROJECT', 'READ_ASSETS', 'WRITE_ASSETS', 'EXPORT_ACCESS', 'AI_ACCESS', 'STORAGE_ACCESS'];

  const columns: Column<ApiKey>[] = [
    {
      key: 'key_name', label: 'Name',
      render: (k) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-100">
            <Key className="h-4 w-4 text-secondary-600" />
          </div>
          <span className="font-medium text-secondary-900">{k.key_name}</span>
        </div>
      ),
    },
    { key: 'key_prefix', label: 'Key', render: (k) => <span className="font-mono text-xs text-secondary-500">{k.key_prefix}</span> },
    { key: 'permissions', label: 'Permissions', render: (k) => (
      <div className="flex flex-wrap gap-1">
        {k.permissions.slice(0, 3).map((p) => <span key={p} className="badge-secondary text-xs">{p}</span>)}
        {k.permissions.length > 3 && <span className="badge-secondary text-xs">+{k.permissions.length - 3}</span>}
      </div>
    )},
    { key: 'last_used', label: 'Last Used', render: (k) => k.last_used ? formatDateTime(k.last_used) : 'Never' },
    { key: 'created_at', label: 'Created', render: (k) => formatDate(k.created_at) },
    {
      key: 'actions', label: '',
      render: (k) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(k); }} className="btn-ghost p-1.5 text-error-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="API Keys" description="Manage your API keys for external access"
        actions={<button className="btn-primary" onClick={() => { setModalOpen(true); setNewKeyValue(null); }}><Plus className="h-4 w-4" /> New Key</button>} />
      <Toolbar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search API keys..." />
      <div className="card overflow-hidden">
        <DataTable columns={columns} data={keys} loading={loading} page={page} pageSize={pageSize} total={total}
          onPageChange={setPage} emptyMessage="No API keys yet. Create one to get started." />
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setNewKeyValue(null); }} title={newKeyValue ? 'API Key Created' : 'New API Key'}
        footer={newKeyValue ? <button className="btn-primary" onClick={() => { setModalOpen(false); setNewKeyValue(null); }}>Done</button> : <>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={createKey} disabled={saving || !keyName.trim()}>{saving ? 'Creating...' : 'Create Key'}</button>
        </>}>
        {newKeyValue ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-warning-50 border border-warning-200 p-3 text-sm text-warning-700">
              Copy your API key now. You won't be able to see it again.
            </div>
            <div className="flex items-center gap-2">
              <input className="input font-mono text-xs" readOnly value={newKeyValue} />
              <button className="btn-secondary" onClick={() => copyKey(newKeyValue)}><Copy className="h-4 w-4" /></button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">Key Name</label>
              <input className="input" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Production API Key" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Permissions</label>
              <div className="flex flex-wrap gap-2">
                {allPerms.map((p) => (
                  <button key={p}
                    onClick={() => setPermissions((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])}
                    className={`badge text-xs cursor-pointer ${permissions.includes(p) ? 'badge-primary' : 'badge-secondary'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)}
        title="Delete API Key" message={`Delete "${deleteTarget?.key_name}"? This cannot be undone.`} confirmLabel="Delete" danger />
    </div>
  );
}
