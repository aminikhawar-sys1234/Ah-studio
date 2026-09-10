import { useEffect, useState, useCallback } from 'react';
import { Trash2, Activity, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/utils';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export function AuditLogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [deleteTarget, setDeleteTarget] = useState<AuditLog | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('audit_logs').select('*', { count: 'exact' });
    if (search) query = query.ilike('action', `%${search}%`);
    if (actionFilter) query = query.eq('action', actionFilter);
    query = query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await query;
    if (error) toast.error('Failed to load audit logs', error.message);
    else { setLogs((data ?? []) as AuditLog[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [search, actionFilter, page, toast]);

  useEffect(() => { load(); }, [load]);

  const remove = async (l: AuditLog) => {
    const { error } = await supabase.from('audit_logs').delete().eq('id', l.id);
    if (error) toast.error('Failed to delete', error.message);
    else toast.success('Log entry deleted');
    load();
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'action', label: 'Action',
      render: (l) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary-100">
            <Activity className="h-3.5 w-3.5 text-secondary-600" />
          </div>
          <span className="font-medium text-secondary-900 text-sm">{l.action}</span>
        </div>
      ),
    },
    { key: 'entity_type', label: 'Entity', render: (l) => l.entity_type ?? '—' },
    { key: 'entity_id', label: 'Entity ID', render: (l) => l.entity_id ? <span className="font-mono text-xs text-secondary-500">{l.entity_id.slice(0, 8)}</span> : '—' },
    { key: 'details', label: 'Details', render: (l) => {
      const d = l.details as Record<string, unknown>;
      const keys = Object.keys(d);
      if (keys.length === 0) return '—';
      return <span className="text-xs text-secondary-500">{keys.map((k) => `${k}: ${String(d[k])}`).join(', ')}</span>;
    }},
    { key: 'created_at', label: 'Timestamp', render: (l) => formatDateTime(l.created_at) },
    {
      key: 'actions', label: '',
      render: (l) => (
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(l); }} className="btn-ghost p-1.5 text-error-600"><Trash2 className="h-4 w-4" /></button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" description="Track all actions taken in the system" />
      <Toolbar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search by action...">
        <select className="input w-auto" value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="export">Export</option>
          <option value="render">Render</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
        </select>
      </Toolbar>
      <div className="card overflow-hidden">
        <DataTable columns={columns} data={logs} loading={loading} page={page} pageSize={pageSize} total={total}
          onPageChange={setPage} emptyMessage="No audit log entries yet." />
      </div>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)}
        title="Delete Log Entry" message="Delete this audit log entry?" confirmLabel="Delete" danger />
    </div>
  );
}
