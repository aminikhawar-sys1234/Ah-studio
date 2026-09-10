import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Palette } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate, slugify } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  slug: string;
  type: string;
  created_at: string;
}

export function CategoriesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('template');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('categories').select('*', { count: 'exact' });
    if (search) query = query.ilike('name', `%${search}%`);
    if (typeFilter) query = query.eq('type', typeFilter);
    query = query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await query;
    if (error) toast.error('Failed to load', error.message);
    else { setRows((data ?? []) as Category[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [search, typeFilter, page, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null); setName(''); setSlug(''); setType('template');
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c); setName(c.name); setSlug(c.slug); setType(c.type);
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const finalSlug = slug || slugify(name);
    const payload = { name, slug: finalSlug, type };
    if (editing) {
      const { error } = await supabase.from('categories').update(payload).eq('id', editing.id);
      if (error) toast.error('Failed to update', error.message);
      else toast.success('Category updated');
    } else {
      const { error } = await supabase.from('categories').insert(payload);
      if (error) toast.error('Failed to create', error.message);
      else toast.success('Category created');
    }
    setSaving(false); setModalOpen(false); load();
  };

  const remove = async (c: Category) => {
    const { error } = await supabase.from('categories').delete().eq('id', c.id);
    if (error) toast.error('Failed to delete', error.message);
    else toast.success('Category deleted');
    load();
  };

  const columns: Column<Category>[] = [
    {
      key: 'name', label: 'Name',
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
            <Palette className="h-4 w-4 text-primary-600" />
          </div>
          <span className="font-medium text-secondary-900">{c.name}</span>
        </div>
      ),
    },
    { key: 'slug', label: 'Slug', render: (c) => <span className="font-mono text-xs text-secondary-500">{c.slug}</span> },
    { key: 'type', label: 'Type', render: (c) => <span className="capitalize">{c.type}</span> },
    { key: 'created_at', label: 'Created', render: (c) => formatDate(c.created_at) },
    {
      key: 'actions', label: '',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="btn-ghost p-1.5"><Pencil className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }} className="btn-ghost p-1.5 text-error-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Categories" description="Organize your content with taxonomy"
        actions={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> New Category</button>} />
      <Toolbar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search categories...">
        <select className="input w-auto" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="template">Template</option>
          <option value="asset">Asset</option>
          <option value="audio">Audio</option>
          <option value="effect">Effect</option>
          <option value="plugin">Plugin</option>
        </select>
      </Toolbar>
      <div className="card overflow-hidden">
        <DataTable columns={columns} data={rows} loading={loading} page={page} pageSize={pageSize} total={total}
          onPageChange={setPage} onRowClick={openEdit} emptyMessage="No categories yet." />
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'New Category'}
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving || !name.trim()}>{saving ? 'Saving...' : 'Save'}</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Name</label>
            <input className="input" value={name} onChange={(e) => { setName(e.target.value); if (!editing) setSlug(slugify(e.target.value)); }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Slug</label>
            <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="template">Template</option>
              <option value="asset">Asset</option>
              <option value="audio">Audio</option>
              <option value="effect">Effect</option>
              <option value="plugin">Plugin</option>
            </select>
          </div>
        </div>
      </Modal>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)}
        title="Delete Category" message={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" danger />
    </div>
  );
}
