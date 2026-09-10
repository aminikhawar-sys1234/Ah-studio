import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Copy, Film, Image, Music, Video } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { ProjectType, ProjectStatus } from '@/core/types';

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const typeIcons: Record<string, typeof Film> = {
  video: Video,
  image: Image,
  audio: Music,
  reel: Film,
  short: Film,
};

export function ProjectsPage() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectType>('video');
  const [status, setStatus] = useState<ProjectStatus>('draft');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('projects').select('*', { count: 'exact' });
    if (search) query = query.ilike('name', `%${search}%`);
    query = query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;
    if (error) {
      toast.error('Failed to load projects', error.message);
    } else {
      setProjects((data ?? []) as Project[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [search, page, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setType('video');
    setStatus('draft');
    setModalOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setName(p.name);
    setType(p.type as ProjectType);
    setStatus(p.status as ProjectStatus);
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from('projects')
        .update({ name, type, status })
        .eq('id', editing.id);
      if (error) toast.error('Failed to update project', error.message);
      else toast.success('Project updated');
    } else {
      const { error } = await supabase.from('projects').insert({ name, type, status });
      if (error) toast.error('Failed to create project', error.message);
      else toast.success('Project created');
    }
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const duplicate = async (p: Project) => {
    const { error } = await supabase.from('projects').insert({
      name: `${p.name} (copy)`,
      type: p.type,
      status: 'draft',
    });
    if (error) toast.error('Failed to duplicate', error.message);
    else toast.success('Project duplicated');
    load();
  };

  const remove = async (p: Project) => {
    const { error } = await supabase.from('projects').delete().eq('id', p.id);
    if (error) toast.error('Failed to delete project', error.message);
    else toast.success('Project deleted');
    load();
  };

  const columns: Column<Project>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (p) => {
        const Icon = typeIcons[p.type] ?? Film;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
              <Icon className="h-4 w-4 text-primary-600" />
            </div>
            <span className="font-medium text-secondary-900">{p.name}</span>
          </div>
        );
      },
    },
    { key: 'type', label: 'Type', render: (p) => <span className="capitalize">{p.type}</span> },
    { key: 'status', label: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'created_at', label: 'Created', render: (p) => formatDate(p.created_at) },
    { key: 'updated_at', label: 'Updated', render: (p) => formatDate(p.updated_at) },
    {
      key: 'actions',
      label: '',
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); duplicate(p); }} className="btn-ghost p-1.5" title="Duplicate">
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="btn-ghost p-1.5" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }} className="btn-ghost p-1.5 text-error-600 hover:text-error-700" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Manage your creative projects"
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Project
          </button>
        }
      />

      <Toolbar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search projects...">
        <select
          className="input w-auto"
          value={status}
          onChange={(e) => { setStatus(e.target.value as ProjectStatus); setPage(1); load(); }}
        >
          <option value="draft">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="editing">Editing</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </Toolbar>

      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={projects}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onRowClick={openEdit}
          emptyMessage="No projects found. Create one to get started."
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Project' : 'New Project'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Project'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Project Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Awesome Video" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
              <option value="video">Video</option>
              <option value="image">Image</option>
              <option value="audio">Audio</option>
              <option value="reel">Reel</option>
              <option value="short">Short</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              <option value="draft">Draft</option>
              <option value="editing">Editing</option>
              <option value="rendering">Rendering</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove(deleteTarget)}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
