import { useEffect, useState, useCallback } from 'react';
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime, cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
}

const typeColors: Record<string, string> = {
  render: 'bg-primary-50 text-primary-600',
  export: 'bg-accent-50 text-accent-600',
  ai: 'bg-success-50 text-success-600',
  plugin: 'bg-secondary-100 text-secondary-600',
  system: 'bg-error-50 text-error-600',
};

export function NotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (filter === 'unread') query = query.eq('read', false);
    const { data, error } = await query.limit(50);
    if (error) toast.error('Failed to load notifications', error.message);
    else setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (n: Notification) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    if (error) toast.error('Failed to update', error.message);
    load();
  };

  const markAllRead = async () => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
    if (error) toast.error('Failed to update', error.message);
    else toast.success('All notifications marked as read');
    load();
  };

  const remove = async (n: Notification) => {
    const { error } = await supabase.from('notifications').delete().eq('id', n.id);
    if (error) toast.error('Failed to delete', error.message);
    load();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader title="Notifications" description={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
        actions={
          <>
            <button className="btn-secondary" onClick={markAllRead} disabled={unreadCount === 0}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          </>
        } />

      <div className="flex gap-2 mb-4">
        <button className={cn('btn', filter === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-secondary-600 border border-secondary-200')}
          onClick={() => setFilter('all')}>All</button>
        <button className={cn('btn', filter === 'unread' ? 'bg-primary-600 text-white' : 'bg-white text-secondary-600 border border-secondary-200')}
          onClick={() => setFilter('unread')}>Unread ({unreadCount})</button>
      </div>

      <div className="card overflow-hidden divide-y divide-secondary-100">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 rounded-lg bg-secondary-100 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-secondary-100 rounded animate-pulse w-1/3" />
                <div className="h-3 bg-secondary-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Bell className="h-12 w-12 text-secondary-300 mb-3" />
            <p className="text-sm text-secondary-400">No notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={cn('flex items-start gap-3 p-4 transition-colors', !n.read && 'bg-primary-50/30')}>
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0', typeColors[n.type] ?? 'bg-secondary-100 text-secondary-600')}>
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn('text-sm font-medium', n.read ? 'text-secondary-700' : 'text-secondary-900')}>{n.title}</p>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary-500 flex-shrink-0" />}
                </div>
                {n.message && <p className="text-sm text-secondary-500 mt-0.5">{n.message}</p>}
                <p className="text-xs text-secondary-400 mt-1">{formatDateTime(n.created_at)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!n.read && (
                  <button onClick={() => markRead(n)} className="btn-ghost p-1.5 text-secondary-400 hover:text-primary-600" title="Mark read">
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => remove(n)} className="btn-ghost p-1.5 text-secondary-400 hover:text-error-600" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
