import { useEffect, useState } from 'react';
import { ScrollText, Trash2, Download, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime, cn } from '@/lib/utils';

interface LogEntry {
  id: string;
  action: string;
  entity_type: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

type LogLevel = 'info' | 'warning' | 'error';
type LogSource = 'system' | 'api' | 'plugin' | 'render';

export function LogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<LogLevel | 'all'>('all');
  const [source, setSource] = useState<LogSource | 'all'>('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) toast.error('Failed to load logs', error.message);
      else setLogs((data ?? []) as LogEntry[]);
      setLoading(false);
    }
    load();
  }, [toast]);

  const filtered = logs.filter((l) => {
    if (search && !l.action.toLowerCase().includes(search.toLowerCase())) return false;
    if (level !== 'all') {
      const action = l.action.toLowerCase();
      if (level === 'error' && !action.includes('error') && !action.includes('fail')) return false;
      if (level === 'warning' && !action.includes('warn')) return false;
      if (level === 'info' && (action.includes('error') || action.includes('fail') || action.includes('warn'))) return false;
    }
    if (source !== 'all') {
      const type = l.entity_type ?? '';
      if (source === 'api' && !type.includes('api')) return false;
      if (source === 'plugin' && !type.includes('plugin')) return false;
      if (source === 'render' && !type.includes('render') && !type.includes('export')) return false;
      if (source === 'system' && (type.includes('api') || type.includes('plugin') || type.includes('render'))) return false;
    }
    return true;
  });

  const exportLogs = () => {
    const text = filtered.map((l) => `[${l.created_at}] ${l.action} ${l.entity_type ?? ''} ${JSON.stringify(l.details)}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ah-studio-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exported');
  };

  const clearLogs = async () => {
    const { error } = await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) toast.error('Failed to clear logs', error.message);
    else { toast.success('Logs cleared'); setLogs([]); }
  };

  const getLevel = (action: string): LogLevel => {
    const a = action.toLowerCase();
    if (a.includes('error') || a.includes('fail')) return 'error';
    if (a.includes('warn')) return 'warning';
    return 'info';
  };

  const levelColors: Record<LogLevel, string> = {
    info: 'text-primary-600 bg-primary-50',
    warning: 'text-warning-600 bg-warning-50',
    error: 'text-error-600 bg-error-50',
  };

  return (
    <div>
      <PageHeader title="Logs" description="System and application logs"
        actions={
          <>
            <button className="btn-secondary" onClick={exportLogs}><Download className="h-4 w-4" /> Export</button>
            <button className="btn-danger" onClick={clearLogs}><Trash2 className="h-4 w-4" /> Clear</button>
          </>
        } />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input className="input pl-10" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={level} onChange={(e) => setLevel(e.target.value as LogLevel | 'all')}>
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
        <select className="input w-auto" value={source} onChange={(e) => setSource(e.target.value as LogSource | 'all')}>
          <option value="all">All Sources</option>
          <option value="system">System</option>
          <option value="api">API</option>
          <option value="plugin">Plugin</option>
          <option value="render">Render</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="max-h-[70vh] overflow-y-auto divide-y divide-secondary-100">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="p-4"><div className="h-5 bg-secondary-100 rounded animate-pulse" /></div>)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <ScrollText className="h-12 w-12 text-secondary-300 mb-3" />
              <p className="text-sm text-secondary-400">No log entries</p>
            </div>
          ) : (
            filtered.map((log) => {
              const lv = getLevel(log.action);
              return (
                <div key={log.id} className="flex items-start gap-3 p-3 hover:bg-secondary-50 transition-colors">
                  <span className={cn('badge text-xs flex-shrink-0 mt-0.5', levelColors[lv])}>{lv.toUpperCase()}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900">{log.action}</p>
                    {log.entity_type && <p className="text-xs text-secondary-500">{log.entity_type}</p>}
                    {Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-secondary-400 mt-0.5 font-mono">{JSON.stringify(log.details)}</p>
                    )}
                  </div>
                  <span className="text-xs text-secondary-400 flex-shrink-0">{formatDateTime(log.created_at)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
