import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, type Lucide as LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatBytes } from '@/lib/utils';

interface AssetRow {
  id: string;
  name: string;
  type: string;
  url: string | null;
  category: string | null;
  size_bytes: number;
  mime_type: string | null;
  created_at: string;
}

interface AssetTypePageProps {
  title: string;
  description: string;
  assetType: string;
  icon: LucideIcon;
  iconColor: string;
  extraFields?: { key: string; label: string }[];
}

export function AssetTypePage({ title, description, assetType, icon: Icon, iconColor, extraFields }: AssetTypePageProps) {
  const toast = useToast();
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AssetRow | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<AssetRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('assets').select('*', { count: 'exact' }).eq('type', assetType);
    if (search) query = query.ilike('name', `%${search}%`);
    query = query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await query;
    if (error) toast.error('Failed to load', error.message);
    else { setRows((data ?? []) as AssetRow[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [assetType, search, page, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null); setName(''); setUrl(''); setCategory(''); setTags(''); setExtra({});
    setModalOpen(true);
  };

  const openEdit = (r: AssetRow) => {
    setEditing(r); setName(r.name); setUrl(r.url ?? ''); setCategory(r.category ?? '');
    setTags('');
    const meta = (r as unknown as { metadata?: Record<string, unknown> }).metadata;
    if (meta && extraFields) {
      const ex: Record<string, string> = {};
      for (const f of extraFields) ex[f.key] = String(meta[f.key] ?? '');
      setExtra(ex);
    }
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const metadata: Record<string, unknown> = {};
    if (extraFields) {
      for (const f of extraFields) {
        if (extra[f.key]) metadata[f.key] = extra[f.key];
      }
    }
    const payload = {
      name, type: assetType, url: url || null, category: category || null,
      tags: tagArray, metadata,
      mime_type: editing?.mime_type ?? null,
      size_bytes: editing?.size_bytes ?? 0,
    };
    if (editing) {
      const { error } = await supabase.from('assets').update(payload).eq('id', editing.id);
      if (error) toast.error('Failed to update', error.message);
      else toast.success('Updated successfully');
    } else {
      const { error } = await supabase.from('assets').insert(payload);
      if (error) toast.error('Failed to create', error.message);
      else toast.success('Added successfully');
    }
    setSaving(false); setModalOpen(false); load();
  };

  const remove = async (r: AssetRow) => {
    const { error } = await supabase.from('assets').delete().eq('id', r.id);
    if (error) toast.error('Failed to delete', error.message);
    else toast.success('Deleted');
    load();
  };

  const columns: Column<AssetRow>[] = [
    {
      key: 'name', label: 'Name',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconColor}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-medium text-secondary-900">{r.name}</span>
        </div>
      ),
    },
    { key: 'category', label: 'Category', render: (r) => r.category ?? '—' },
    { key: 'size_bytes', label: 'Size', render: (r) => formatBytes(r.size_bytes) },
    { key: 'mime_type', label: 'Format', render: (r) => r.mime_type ?? '—' },
    { key: 'created_at', label: 'Added', render: (r) => formatDate(r.created_at) },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="btn-ghost p-1.5" title="Edit"><Pencil className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} className="btn-ghost p-1.5 text-error-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={title} description={description}
        actions={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Add</button>} />
      <Toolbar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder={`Search ${title.toLowerCase()}...`} />
      <div className="card overflow-hidden">
        <DataTable columns={columns} data={rows} loading={loading} page={page} pageSize={pageSize} total={total}
          onPageChange={setPage} onRowClick={openEdit} emptyMessage={`No ${title.toLowerCase()} found. Add one to get started.`} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${title}` : `Add ${title}`}
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving || !name.trim()}>{saving ? 'Saving...' : 'Save'}</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">URL</label>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Category</label>
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Tags (comma-separated)</label>
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          {extraFields?.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">{f.label}</label>
              <input className="input" value={extra[f.key] ?? ''} onChange={(e) => setExtra((p) => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)}
        title="Delete" message={`Delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" danger />
    </div>
  );
}
