import { useEffect, useState, useCallback } from 'react';
import { Trash2, Download, Film, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/utils';

interface Job {
  id: string;
  project_id: string | null;
  status: string;
  config: Record<string, unknown>;
  output_url: string | null;
  progress: number;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

interface Project {
  id: string;
  name: string;
}

export function ExportJobsPage() {
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [format, setFormat] = useState('mp4');
  const [resolution, setResolution] = useState('1920x1080');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('render_jobs').select('*', { count: 'exact' }).eq('config->>job_type', 'export');
    if (search) query = query.ilike('status', `%${search}%`);
    query = query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await query;
    if (error) {
      // Fallback: just load all render jobs
      const { data: all, error: e2, count: c2 } = await supabase.from('render_jobs')
        .select('*', { count: 'exact' }).order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (e2) toast.error('Failed to load', e2.message);
      else { setJobs((all ?? []) as Job[]); setTotal(c2 ?? 0); }
    } else {
      setJobs((data ?? []) as Job[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [search, page, toast]);

  useEffect(() => {
    load();
    supabase.from('projects').select('id, name').then(({ data }) => setProjects((data ?? []) as Project[]));
  }, [load]);

  const createExport = async () => {
    if (!selectedProject) { toast.error('Select a project'); return; }
    setSaving(true);
    const { error } = await supabase.from('render_jobs').insert({
      project_id: selectedProject,
      status: 'queued',
      config: { job_type: 'export', format, resolution },
      progress: 0,
    });
    if (error) toast.error('Failed to create export job', error.message);
    else toast.success('Export job queued');
    setSaving(false); setCreateOpen(false); load();
  };

  const remove = async (j: Job) => {
    const { error } = await supabase.from('render_jobs').delete().eq('id', j.id);
    if (error) toast.error('Failed to delete', error.message);
    else toast.success('Job deleted');
    load();
  };

  const columns: Column<Job>[] = [
    { key: 'id', label: 'Job ID', render: (j) => <span className="font-mono text-xs">{j.id.slice(0, 8)}</span> },
    { key: 'status', label: 'Status', render: (j) => <StatusBadge status={j.status} /> },
    {
      key: 'progress', label: 'Progress',
      render: (j) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 bg-secondary-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${j.progress}%` }} />
          </div>
          <span className="text-xs text-secondary-500">{j.progress}%</span>
        </div>
      ),
    },
    {
      key: 'config', label: 'Format',
      render: (j) => {
        const cfg = j.config as Record<string, unknown>;
        return <span className="text-xs uppercase">{String(cfg.format ?? 'mp4')}</span>;
      },
    },
    { key: 'output_url', label: 'Output', render: (j) => j.output_url ? <a href={j.output_url} className="text-primary-600 hover:underline text-xs">Download</a> : '—' },
    { key: 'created_at', label: 'Created', render: (j) => formatDateTime(j.created_at) },
    {
      key: 'actions', label: '',
      render: (j) => (
        <div className="flex items-center justify-end gap-1">
          {j.output_url && <a href={j.output_url} download className="btn-ghost p-1.5"><Download className="h-4 w-4" /></a>}
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(j); }} className="btn-ghost p-1.5 text-error-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Export Jobs" description="Export queue and output downloads"
        actions={<button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Export</button>} />
      <Toolbar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search export jobs..." />
      <div className="card overflow-hidden">
        <DataTable columns={columns} data={jobs} loading={loading} page={page} pageSize={pageSize} total={total}
          onPageChange={setPage} emptyMessage="No export jobs yet." />
      </div>
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Export Job"
        footer={<>
          <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={createExport} disabled={saving || !selectedProject}>{saving ? 'Creating...' : 'Queue Export'}</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Project</label>
            <select className="input" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
              <option value="">Select a project...</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Format</label>
            <select className="input" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
              <option value="png">PNG (image)</option>
              <option value="jpg">JPG (image)</option>
              <option value="wav">WAV (audio)</option>
              <option value="mp3">MP3 (audio)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Resolution</label>
            <select className="input" value={resolution} onChange={(e) => setResolution(e.target.value)}>
              <option value="1920x1080">1920x1080 (Full HD)</option>
              <option value="3840x2160">3840x2160 (4K)</option>
              <option value="1280x720">1280x720 (HD)</option>
              <option value="1080x1920">1080x1920 (Portrait)</option>
              <option value="1080x1080">1080x1080 (Square)</option>
            </select>
          </div>
        </div>
      </Modal>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)}
        title="Delete Job" message="Delete this export job?" confirmLabel="Delete" danger />
    </div>
  );
}
