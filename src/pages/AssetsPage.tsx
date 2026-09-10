import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Image, Video, Music, Type, Sticker, FileImage } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatBytes } from '@/lib/utils';
import type { AssetType } from '@/core/types';

interface Asset {
  id: string;
  name: string;
  type: string;
  url: string | null;
  category: string | null;
  size_bytes: number;
  mime_type: string | null;
  created_at: string;
}

const typeIcons: Record<string, typeof Image> = {
  image: Image, video: Video, audio: Music, music: Music,
  font: Type, sticker: Sticker, gif: FileImage, lut: FileImage,
  effect: FileImage, transition: FileImage, template: FileImage,
};

export function AssetsPage() {
  const toast = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('image');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('assets').select('*', { count: 'exact' });
    if (search) query = query.ilike('name', `%${search}%`);
    if (typeFilter) query = query.eq('type', typeFilter);
    query = query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await query;
    if (error) toast.error('Failed to load assets', error.message);
    else { setAssets((data ?? []) as Asset[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [search, typeFilter, page, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null); setName(''); setType('image'); setUrl(''); setCategory(''); setTags('');
    setModalOpen(true);
  };

  const openEdit = (a: Asset) => {
    setEditing(a); setName(a.name); setType(a.type as AssetType); setUrl(a.url ?? '');
    setCategory(a.category ?? '');
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const payload = {
      name, type, url: url || null, category: category || null,
      tags: tagArray, mime_type: editing?.mime_type ?? null,
      size_bytes: editing?.size_bytes ?? 0,
    };
    if (editing) {
      const { error } = await supabase.from('assets').update(payload).eq('id', editing.id);
      if (error) toast.error('Failed to update', error.message);
      else toast.success('Asset updated');
    } else {
      const { error } = await supabase.from('assets').insert(payload);
      if (error) toast.error('Failed to create', error.message);
      else toast.success('Asset added');
    }
    setSaving(false); setModalOpen(false); load();
  };

  const remove = async (a: Asset) => {
    const { error } = await supabase.from('assets').delete().eq('id', a.id);
    if (error) toast.error('Failed to delete', error.message);
    else toast.success('Asset deleted');
    load();
  };

  const columns: Column<Asset>[] = [
    {
      key: 'name', label: 'Name',
      render: (a) => {
        const Icon = typeIcons[a.type] ?? Image;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-50">
              <Icon className="h-4 w-4 text-success-600" />
            </div>
            <span className="font-medium text-secondary-900">{a.name}</span>
          </div>
        );
      },
    },
    { key: 'type', label: 'Type', render: (a) => <span className="capitalize">{a.type}</span> },
    { key: 'category', label: 'Category', render: (a) => a.category ?? '—' },
    { key: 'size_bytes', label: 'Size', render: (a) => formatBytes(a.size_bytes) },
    { key: 'mime_type', label: 'MIME', render: (a) => a.mime_type ?? '—' },
    { key: 'created_at', label: 'Added', render: (a) => formatDate(a.created_at) },
    {
      key: 'actions', label: '',
      render: (a) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(a); }} className="btn-ghost p-1.5" title="Edit"><Pencil className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(a); }} className="btn-ghost p-1.5 text-error-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Assets" description="Your media library"
        actions={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Add Asset</button>} />

      <Toolbar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search assets...">
        <select className="input w-auto" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="image">Image</option><option value="video">Video</option>
          <option value="audio">Audio</option><option value="music">Music</option>
          <option value="font">Font</option><option value="sticker">Sticker</option>
          <option value="gif">GIF</option><option value="lut">LUT</option>
        </select>
      </Toolbar>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={assets} loading={loading} page={page} pageSize={pageSize} total={total}
          onPageChange={setPage} onRowClick={openEdit} emptyMessage="No assets found. Add one to get started." />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Asset' : 'Add Asset'}
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving || !name.trim()}>{saving ? 'Saving...' : editing ? 'Save' : 'Add'}</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Asset Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Background Music" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as AssetType)}>
              <option value="image">Image</option><option value="video">Video</option>
              <option value="audio">Audio</option><option value="music">Music</option>
              <option value="font">Font</option><option value="sticker">Sticker</option>
              <option value="gif">GIF</option><option value="lut">LUT</option>
              <option value="effect">Effect</option><option value="transition">Transition</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">URL</label>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Category</label>
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Nature" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Tags (comma-separated)</label>
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="outdoor, summer" />
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)}
        title="Delete Asset" message={`Delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" danger />
    </div>
  );
}
