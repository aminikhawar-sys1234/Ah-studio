import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, LayoutTemplate, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { TemplateType, TemplateStatus } from '@/core/types';

interface Template {
  id: string;
  name: string;
  type: string;
  category: string | null;
  status: string;
  resolution: string | null;
  duration: number | null;
  created_at: string;
  updated_at: string;
}

export function TemplatesPage() {
  const toast = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<TemplateType>('video');
  const [category, setCategory] = useState('');
  const [resolution, setResolution] = useState('1920x1080');
  const [duration, setDuration] = useState<number | ''>('');
  const [status, setStatus] = useState<TemplateStatus>('draft');
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('templates').select('*', { count: 'exact' });
    if (search) query = query.ilike('name', `%${search}%`);
    query = query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await query;
    if (error) toast.error('Failed to load templates', error.message);
    else { setTemplates((data ?? []) as Template[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [search, page, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null); setName(''); setType('video'); setCategory('');
    setResolution('1920x1080'); setDuration(''); setStatus('draft');
    setModalOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t); setName(t.name); setType(t.type as TemplateType);
    setCategory(t.category ?? ''); setResolution(t.resolution ?? '1920x1080');
    setDuration(t.duration ?? ''); setStatus(t.status as TemplateStatus);
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload = {
      name, type, category: category || null,
      resolution, duration: duration === '' ? null : Number(duration),
      status,
    };
    if (editing) {
      const { error } = await supabase.from('templates').update(payload).eq('id', editing.id);
      if (error) toast.error('Failed to update', error.message);
      else toast.success('Template updated');
    } else {
      const { error } = await supabase.from('templates').insert(payload);
      if (error) toast.error('Failed to create', error.message);
      else toast.success('Template created');
    }
    setSaving(false); setModalOpen(false); load();
  };

  const togglePublish = async (t: Template) => {
    const newStatus = t.status === 'published' ? 'unpublished' : 'published';
    const { error } = await supabase.from('templates').update({ status: newStatus }).eq('id', t.id);
    if (error) toast.error('Failed to update status', error.message);
    else toast.success(`Template ${newStatus}`);
    load();
  };

  const remove = async (t: Template) => {
    const { error } = await supabase.from('templates').delete().eq('id', t.id);
    if (error) toast.error('Failed to delete', error.message);
    else toast.success('Template deleted');
    load();
  };

  const columns: Column<Template>[] = [
    {
      key: 'name', label: 'Name',
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50">
            <LayoutTemplate className="h-4 w-4 text-accent-600" />
          </div>
          <span className="font-medium text-secondary-900">{t.name}</span>
        </div>
      ),
    },
    { key: 'type', label: 'Type', render: (t) => <span className="capitalize">{t.type}</span> },
    { key: 'category', label: 'Category', render: (t) => t.category ?? '—' },
    { key: 'resolution', label: 'Resolution', render: (t) => t.resolution ?? '—' },
    { key: 'status', label: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'created_at', label: 'Created', render: (t) => formatDate(t.created_at) },
    {
      key: 'actions', label: '',
      render: (t) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); togglePublish(t); }} className="btn-ghost p-1.5" title={t.status === 'published' ? 'Unpublish' : 'Publish'}>
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openEdit(t); }} className="btn-ghost p-1.5" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); }} className="btn-ghost p-1.5 text-error-600" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Templates" description="Reusable project templates"
        actions={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> New Template</button>} />

      <Toolbar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search templates..." />

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={templates} loading={loading} page={page} pageSize={pageSize} total={total}
          onPageChange={setPage} onRowClick={openEdit} emptyMessage="No templates found. Create one to get started." />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Template' : 'New Template'}
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving || !name.trim()}>{saving ? 'Saving...' : editing ? 'Save' : 'Create'}</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Template Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="YouTube Intro" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as TemplateType)}>
              <option value="video">Video</option><option value="image">Image</option>
              <option value="reel">Reel</option><option value="short">Short</option>
              <option value="youtube">YouTube</option><option value="youtube_thumbnail">YouTube Thumbnail</option>
              <option value="instagram">Instagram</option><option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option><option value="story">Story</option>
              <option value="invitation">Invitation</option><option value="poster">Poster</option>
              <option value="banner">Banner</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">Category</label>
              <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Social Media" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">Resolution</label>
              <input className="input" value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="1920x1080" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">Duration (seconds)</label>
              <input type="number" className="input" value={duration} onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))} placeholder="30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">Status</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TemplateStatus)}>
                <option value="draft">Draft</option><option value="published">Published</option><option value="unpublished">Unpublished</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)}
        title="Delete Template" message={`Delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" danger />
    </div>
  );
}
