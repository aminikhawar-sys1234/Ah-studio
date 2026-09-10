import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Film, Download } from 'lucide-react';
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

export function RenderJobsPage() {
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('render_jobs').select('*', { count: 'exact' });
    if (search) query = query.ilike('status', `%${search}%`);
    query = query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await query;
    if (error) toast.error('Failed to load render jobs', error.message);
    else { setJobs((data ?? []) as Job[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [search, page, toast]);

  useEffect(() => { load(); }, [load]);

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
    { key: 'output_url', label: 'Output', render: (j) => j.output_url ? <a href={j.output_url} className="text-primary-600 hover:underline text-xs">Download</a> : '—' },
    { key: 'created_at', label: 'Created', render: (j) => formatDateTime(j.created_at) },
    { key: 'completed_at', label: 'Completed', render: (j) => formatDateTime(j.completed_at) },
    {
      key: 'actions', label: '',
      render: (j) => (
        <div className="flex items-center justify-end gap-1">
          {j.output_url && (
            <a href={j.output_url} download className="btn-ghost p-1.5" title="Download"><Download className="h-4 w-4" /></a>
          )}
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(j); }} className="btn-ghost p-1.5 text-error-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Render Jobs" description="Background render and export jobs" />
      <Toolbar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search jobs..." />
      <div className="card overflow-hidden">
        <DataTable columns={columns} data={jobs} loading={loading} page={page} pageSize={pageSize} total={total}
          onPageChange={setPage} emptyMessage="No render jobs yet." />
      </div>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)}
        title="Delete Job" message="Delete this render job record?" confirmLabel="Delete" danger />
    </div>
  );
}
