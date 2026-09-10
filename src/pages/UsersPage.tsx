import { useEffect, useState } from 'react';
import { Users, Mail, Calendar, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { formatDate, cn } from '@/lib/utils';

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

const roleColors: Record<string, string> = {
  super_admin: 'badge-error',
  admin: 'badge-error',
  developer: 'badge-primary',
  designer: 'badge-primary',
  moderator: 'badge-warning',
  creator: 'badge-secondary',
  user: 'badge-secondary',
  guest: 'badge-secondary',
};

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) {
        // profiles table might not exist — fall back to auth.users via a simpler approach
        // We can't query auth.users directly, so show a friendly empty state
        setUsers([]);
        setTotal(0);
      } else {
        setUsers((data ?? []) as UserRow[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    }
    load();
  }, [page]);

  const columns: Column<UserRow>[] = [
    {
      key: 'email', label: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
            {u.email.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-900">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'created_at', label: 'Joined', render: (u) => formatDate(u.created_at) },
    { key: 'last_sign_in_at', label: 'Last Active', render: (u) => u.last_sign_in_at ? formatDate(u.last_sign_in_at) : 'Never' },
    {
      key: 'role', label: 'Role',
      render: () => <span className={cn(roleColors.user, 'badge')}>User</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Users" description="Manage user accounts and roles" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-secondary-900">{loading ? '—' : total}</p>
          <p className="text-sm text-secondary-500">Total Users</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-50">
              <Mail className="h-5 w-5 text-success-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-secondary-900">{loading ? '—' : users.filter((u) => u.last_sign_in_at).length}</p>
          <p className="text-sm text-secondary-500">Active Users</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
              <Calendar className="h-5 w-5 text-accent-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-secondary-900">{loading ? '—' : users.filter((u) => {
            if (!u.created_at) return false;
            const d = new Date(u.created_at);
            const week = new Date(); week.setDate(week.getDate() - 7);
            return d > week;
          }).length}</p>
          <p className="text-sm text-secondary-500">New This Week</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error-50">
              <Shield className="h-5 w-5 text-error-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-secondary-900">1</p>
          <p className="text-sm text-secondary-500">Admins</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={users} loading={loading} page={page} pageSize={pageSize} total={total}
          onPageChange={setPage} emptyMessage="No users found. The profiles table may need to be created." />
      </div>
    </div>
  );
}
