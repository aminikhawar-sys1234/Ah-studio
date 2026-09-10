import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Type, Bold, Italic } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

interface FontAsset {
  id: string;
  name: string;
  url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function TextTypographyPage() {
  const toast = useToast();
  const [fonts, setFonts] = useState<FontAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [fontWeight, setFontWeight] = useState('400');
  const [fontStyle, setFontStyle] = useState('normal');
  const [url, setUrl] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<FontAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('assets').select('*', { count: 'exact' }).eq('type', 'font');
    if (search) query = query.ilike('name', `%${search}%`);
    query = query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await query;
    if (error) toast.error('Failed to load fonts', error.message);
    else {
      setFonts((data ?? []) as FontAsset[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [search, page, toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload = {
      name, type: 'font', url: url || null,
      metadata: { fontFamily: fontFamily || name, fontWeight, fontStyle },
      mime_type: 'font/woff2',
      size_bytes: 0,
    };
    const { error } = await supabase.from('assets').insert(payload);
    if (error) toast.error('Failed to add font', error.message);
    else toast.success('Font added');
    setSaving(false); setModalOpen(false); load();
  };

  const remove = async (f: FontAsset) => {
    const { error } = await supabase.from('assets').delete().eq('id', f.id);
    if (error) toast.error('Failed to delete', error.message);
    else toast.success('Font deleted');
    load();
  };

  const columns: Column<FontAsset>[] = [
    {
      key: 'name', label: 'Font Name',
      render: (f) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
            <Type className="h-4 w-4 text-primary-600" />
          </div>
          <span className="font-medium text-secondary-900">{f.name}</span>
        </div>
      ),
    },
    { key: 'family', label: 'Font Family', render: (f) => String((f.metadata as Record<string, unknown>).fontFamily ?? f.name) },
    { key: 'weight', label: 'Weight', render: (f) => String((f.metadata as Record<string, unknown>).fontWeight ?? '400') },
    { key: 'style', label: 'Style', render: (f) => String((f.metadata as Record<string, unknown>).fontStyle ?? 'normal') },
    { key: 'created_at', label: 'Added', render: (f) => formatDate(f.created_at) },
    {
      key: 'actions', label: '',
      render: (f) => (
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(f); }} className="btn-ghost p-1.5 text-error-600"><Trash2 className="h-4 w-4" /></button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Text & Typography" description="Manage fonts and text presets"
        actions={<button className="btn-primary" onClick={() => { setName(''); setFontFamily(''); setFontWeight('400'); setFontStyle('normal'); setUrl(''); setModalOpen(true); }}><Plus className="h-4 w-4" /> Add Font</button>} />
      <Toolbar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search fonts..." />
      <div className="card overflow-hidden">
        <DataTable columns={columns} data={fonts} loading={loading} page={page} pageSize={pageSize} total={total}
          onPageChange={setPage} emptyMessage="No fonts added yet." />
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Font"
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving || !name.trim()}>{saving ? 'Saving...' : 'Add Font'}</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Font Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Inter" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Font Family (CSS)</label>
            <input className="input" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} placeholder="'Inter', sans-serif" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">Weight</label>
              <select className="input" value={fontWeight} onChange={(e) => setFontWeight(e.target.value)}>
                <option value="300">Light (300)</option>
                <option value="400">Regular (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">SemiBold (600)</option>
                <option value="700">Bold (700)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">Style</label>
              <select className="input" value={fontStyle} onChange={(e) => setFontStyle(e.target.value)}>
                <option value="normal">Normal</option>
                <option value="italic">Italic</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Font URL</label>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://fonts.gstatic.com/..." />
          </div>
        </div>
      </Modal>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)}
        title="Delete Font" message={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" danger />
    </div>
  );
}
